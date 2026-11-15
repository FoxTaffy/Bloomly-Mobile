import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, PanResponder, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Clock, Ellipsis, Eye, SendHorizontal, ThumbsDown, ThumbsUp, Volume2, VolumeX, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { ReportSheet } from '@/components/ReportSheet';
import { StoryMedia } from '@/components/story/StoryMedia';
import { StoryProgress } from '@/components/story/StoryProgress';
import { Button, EmptyState, ErrorState, Sheet, Skeleton } from '@/components/ui';
import { useAppState } from '@/hooks/useAppState';
import { useBlockStatus, useToggleBlock } from '@/hooks/useProfile';
import { useDeleteStory, useSendStoryReply, useStoryGroups, useStoryViewers, useTrackView, useVoteStory } from '@/hooks/useStories';
import { useT } from '@/hooks/useT';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { Story } from '@/shared/api-types';
import { nextPos, prevPos, STORY_DURATION_MS, STORY_TAP_MAX_MS, STORY_TAP_ZONE, timeLeft } from '@/shared/stories';
import { useSeenStories } from '@/stores/seenStories';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/**
 * Просмотр историй (веб: components/StoryViewer.vue). Нажатие слева — назад, справа — вперёд, удержание — пауза,
 * свайп влево/вправо — соседняя история, вниз — закрыть. Чужая история: оценка и ответ в чат; своя: просмотры и удаление.
 * Двойное нажатие «сердечком» с веба не переносим: это только анимация без действия.
 */
export function StoryViewer({ userId }: { userId: string }) {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, isLoading, isError, refetch } = useStoryGroups();
  const seen = useSeenStories((s) => s.mark);
  const myId = useSession((s) => s.user?.id);

  // Позиция хранится идентификаторами, а не индексами: список обновляется, истории удаляются и добавляются
  const [pos, setPos] = useState<{ uid: string; sid: string | null }>({ uid: userId, sid: null });
  const gi = groups.findIndex((g) => g[0].user.id === pos.uid);
  const group = gi >= 0 ? groups[gi] : null;
  const foundIdx = group ? group.findIndex((s) => s.id === pos.sid) : -1;
  const si = group ? (foundIdx >= 0 ? foundIdx : 0) : 0;
  const story: Story | null = group?.[si] ?? null;
  const isOwn = !!story && story.user.id === myId;

  const [ready, setReady] = useState(false);
  const [videoFraction, setVideoFraction] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sheet, setSheet] = useState<null | 'viewers' | 'menu'>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [muted, setMuted] = useState(true);
  const [restart, setRestart] = useState(0);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const paused = holding || typing || sheet !== null || reportOpen || !appActive;
  useAppState({ onBackground: () => setAppActive(false), onActive: () => setAppActive(true) });

  const vote = useVoteStory();
  const track = useTrackView();
  const sendReply = useSendStoryReply();
  const del = useDeleteStory();
  const viewers = useStoryViewers(sheet === 'viewers' && story ? story.id : null);
  const tracked = useRef(new Set<string>());
  const timeAgo = useTimeAgo();

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Открытие группы отмечает её истории просмотренными (как на вебе: markSeen при открытии)
  const groupKey = group ? group[0].user.id : null;
  useEffect(() => {
    if (group) seen(group.map((s) => s.id));
    // зависимость только от автора: новые истории внутри открытой группы отметятся при открытии следующей
  }, [groupKey]);

  // Смена истории: сброс состояния показа и отметка просмотра (своё и повторы не отправляем)
  const storyId = story?.id ?? null;
  useEffect(() => {
    setReady(false);
    setVideoFraction(null);
    setReplyStatus('idle');
    setSheet(null);
    if (story && !isOwn && !tracked.current.has(story.id)) {
      tracked.current.add(story.id);
      track.mutate(story.id);
    }
    // зависимость только от самой истории
  }, [storyId]);

  const goTo = useCallback((p: { gi: number; si: number } | null) => {
    if (!p) return false;
    const target = groups[p.gi]?.[p.si];
    if (!target) return false;
    setPos({ uid: target.user.id, sid: target.id });
    return true;
  }, [groups]);
  const goNext = useCallback(() => {
    if (!goTo(nextPos(groups, gi, si))) close();
  }, [goTo, groups, gi, si, close]);
  const goPrev = useCallback(() => {
    // На первой истории «назад» перезапускает её: меняем позицию на себя и сбрасываем показ
    if (!goTo(prevPos(groups, gi, si))) {
      setReady(false);
      setVideoFraction(null);
      setPos({ uid: pos.uid, sid: story?.id ?? null });
      setRestart((n) => n + 1);
    }
  }, [goTo, groups, gi, si, pos.uid, story?.id]);

  // Истории автора кончились (удалены или истекли) — уходим
  useEffect(() => {
    if (!isLoading && !isError && !group) close();
  }, [isLoading, isError, group, close]);

  // Жесты на области истории: свайп в стороны листает, вниз — закрывает. Обработчики берём из ref, чтобы не пересоздавать PanResponder.
  const handlers = useRef({ goNext, goPrev, close });
  handlers.current = { goNext, goPrev, close };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 || g.dy > 14,
        onPanResponderGrant: () => setHolding(true),
        onPanResponderRelease: (_, g) => {
          setHolding(false);
          if (Math.abs(g.dx) > 50 && Math.abs(g.dx) > Math.abs(g.dy)) (g.dx < 0 ? handlers.current.goNext : handlers.current.goPrev)();
          else if (g.dy > 100) handlers.current.close();
        },
        onPanResponderTerminate: () => setHolding(false),
      }),
    [],
  );
  const pressStart = useRef(0);
  const zoneProps = (onTap?: () => void) => ({
    onPressIn: () => {
      pressStart.current = Date.now();
      setHolding(true);
    },
    onPressOut: () => setHolding(false),
    // Длинное нажатие — пауза, а не переход (web: dur > 350 мс)
    onPress: () => {
      if (onTap && Date.now() - pressStart.current <= STORY_TAP_MAX_MS) onTap();
    },
  });

  const onReady = useCallback(() => setReady(true), []);

  if (!story || !group) {
    return (
      <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="items-end px-4 py-2">
          <CloseButton onPress={close} />
        </View>
        {isError ? (
          <ErrorState title={t('mStoryLoadFailed')} onRetry={() => refetch()} />
        ) : isLoading ? (
          <View className="gap-3 px-4 pt-4">
            <Skeleton height={320} />
          </View>
        ) : (
          <EmptyState title={t('mStoryGone')} action={<Button title={t('mClose')} onPress={close} />} />
        )}
      </View>
    );
  }

  const left = timeLeft(story.expires_at);
  const name = story.user.display_name ?? story.user.username;
  const isVideo = !!story.video_url;

  const submitReply = () => {
    const text = reply.trim();
    if (!text || sendReply.isPending) return;
    setReply('');
    sendReply.mutate(
      { story, text },
      {
        onSuccess: () => setReplyStatus('sent'),
        onError: () => {
          setReply(text);
          setReplyStatus('error');
        },
      },
    );
  };

  const confirmDelete = () =>
    Alert.alert(t('mStoryDeleteTitle'), t('mDeleteHint'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('mDelete'),
        style: 'destructive',
        onPress: () => {
          setSheet(null);
          // Следующая позиция определяется до удаления: история ещё в списке
          const next = nextPos(groups, gi, si) ?? prevPos(groups, gi, si);
          if (!goTo(next)) close();
          del.mutate(story.id);
        },
      },
    ]);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 overflow-hidden rounded-2xl" {...pan.panHandlers}>
          <StoryMedia
            key={`${story.id}:${restart}`}
            story={story}
            paused={paused}
            muted={muted}
            onReady={onReady}
            onFraction={setVideoFraction}
            onEnd={goNext}
          />

          {/* Зоны нажатия поверх медиа: 35% назад, центр — только пауза, 35% вперёд */}
          <View className="absolute inset-0 flex-row">
            <Pressable style={{ width: `${STORY_TAP_ZONE * 100}%` }} accessibilityRole="button" accessibilityLabel={t('mStoryPrev')} {...zoneProps(goPrev)} />
            <Pressable className="flex-1" accessibilityLabel={t('mStoryPause')} {...zoneProps()} />
            <Pressable style={{ width: `${STORY_TAP_ZONE * 100}%` }} accessibilityRole="button" accessibilityLabel={t('mStoryNext')} {...zoneProps(goNext)} />
          </View>

          <View className="absolute inset-x-0 top-0 bg-black/30 px-3 pb-2 pt-2" pointerEvents="box-none">
            <StoryProgress
              count={group.length}
              index={si}
              resetKey={`${story.id}:${restart}`}
              running={ready && !paused}
              durationMs={STORY_DURATION_MS}
              fraction={isVideo ? videoFraction ?? 0 : null}
              onDone={goNext}
            />
            <View className="mt-2 flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  close();
                  router.push(`/profile/${story.user.username}` as Href);
                }}
                accessibilityRole="button"
                accessibilityLabel={name}
                className="flex-1 flex-row items-center gap-2 active:opacity-70"
              >
                <Avatar uri={story.user.avatar_url} name={name} size={32} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-nunito-bold text-sm text-brand-offwhite">{name}</Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-nunito text-xs text-brand-offwhite/70">{timeAgo(story.created_at)}</Text>
                    {left ? (
                      <View className="flex-row items-center gap-0.5">
                        <Clock size={10} color={colors.mutedIcon} />
                        <Text className="font-nunito text-xs text-brand-offwhite/70">
                          {left.h > 0 ? `${left.h}${t('relHourShort')} ` : ''}{left.m}{t('relMinShort')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
              {isVideo ? (
                <Pressable onPress={() => setMuted((m) => !m)} hitSlop={8} accessibilityRole="button" accessibilityLabel={muted ? t('mVideoUnmute') : t('mVideoMute')} className="h-9 w-9 items-center justify-center rounded-full bg-black/40">
                  {muted ? <VolumeX size={18} color={colors.offwhite} /> : <Volume2 size={18} color={colors.offwhite} />}
                </Pressable>
              ) : null}
              <Pressable onPress={() => setSheet('menu')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('mMore')} className="h-9 w-9 items-center justify-center rounded-full bg-black/40">
                <Ellipsis size={18} color={colors.offwhite} />
              </Pressable>
              <CloseButton onPress={close} />
            </View>
          </View>
        </View>

        <View className="px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {replyStatus !== 'idle' ? (
            <Text className={`mb-1 font-nunito text-xs ${replyStatus === 'sent' ? 'text-brand-success' : 'text-brand-error'}`}>
              {replyStatus === 'sent' ? t('mStoryReplySent') : t('mStoryReplyFailed')}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            {isOwn ? (
              <Pressable onPress={() => setSheet('viewers')} accessibilityRole="button" className="min-h-11 flex-1 flex-row items-center gap-2 active:opacity-70">
                <Eye size={18} color={colors.offwhite} />
                <Text className="font-nunito-bold text-sm text-brand-offwhite">{t('mStoryViews', { n: story.view_count ?? 0 })}</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  placeholder={t('mStoryReplyPlaceholder')}
                  placeholderTextColor={colors.mutedIcon}
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={submitReply}
                  className="min-h-11 flex-1 rounded-full border border-brand-border bg-brand-card px-4 font-nunito text-brand-offwhite"
                />
                <Pressable onPress={submitReply} disabled={!reply.trim() || sendReply.isPending} accessibilityRole="button" accessibilityLabel={t('send')} className={`h-11 w-11 items-center justify-center rounded-full bg-brand-accent ${!reply.trim() || sendReply.isPending ? 'opacity-50' : ''}`}>
                  <SendHorizontal size={18} color={colors.offwhite} />
                </Pressable>
              </>
            )}
            <View className="flex-row items-center gap-1">
              <Pressable onPress={() => vote.mutate({ story, value: 1 })} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: story.my_vote === 1 }} accessibilityLabel={t('mUpvote')} className="p-2 active:opacity-60">
                <ThumbsUp size={20} color={story.my_vote === 1 ? colors.success : colors.mutedIcon} fill={story.my_vote === 1 ? colors.success : 'transparent'} />
              </Pressable>
              <Text className={`min-w-5 text-center font-nunito-bold text-sm ${story.my_vote === 1 ? 'text-brand-success' : story.my_vote === -1 ? 'text-brand-error' : 'text-brand-muted'}`}>{story.score}</Text>
              <Pressable onPress={() => vote.mutate({ story, value: -1 })} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: story.my_vote === -1 }} accessibilityLabel={t('mDownvote')} className="p-2 active:opacity-60">
                <ThumbsDown size={20} color={story.my_vote === -1 ? colors.error : colors.mutedIcon} fill={story.my_vote === -1 ? colors.error : 'transparent'} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={sheet === 'viewers'} title={t('mStoryViewers')} onClose={() => setSheet(null)}>
        <View className="min-h-24 gap-3 pb-2">
          {viewers.isLoading ? (
            <Skeleton height={44} />
          ) : viewers.isError ? (
            <ErrorState onRetry={() => viewers.refetch()} />
          ) : (viewers.data ?? []).length === 0 ? (
            <Text className="py-6 text-center font-nunito text-sm text-brand-muted">{t('mStoryNoViewers')}</Text>
          ) : (
            (viewers.data ?? []).map((v) => (
              <View key={v.id} className="flex-row items-center gap-3">
                <Avatar uri={v.user.avatar_url} name={v.user.display_name ?? v.user.username} size={36} />
                <Text numberOfLines={1} className="flex-1 font-nunito-bold text-brand-offwhite">{v.user.display_name ?? v.user.username}</Text>
                <Text className="font-nunito text-xs text-brand-muted">{timeAgo(v.created_at)}</Text>
              </View>
            ))
          )}
        </View>
      </Sheet>

      <StoryMenu
        visible={sheet === 'menu'}
        story={story}
        isOwn={isOwn}
        onClose={() => setSheet(null)}
        onDelete={confirmDelete}
        onReport={() => {
          setSheet(null);
          setReportOpen(true);
        }}
      />
      {/* На бэкенде нет цели «story»: жалоба идёт на автора с указанием истории (см. docs/mobile/BACKEND_GAPS.md) */}
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={story.user.id} evidence={`story:${story.id} ${story.video_url ?? story.image_url ?? ''}`} />
    </View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('mClose')} className="h-9 w-9 items-center justify-center rounded-full bg-black/40">
      <X size={18} color={colors.offwhite} />
    </Pressable>
  );
}

/** Меню истории: свою можно удалить, чужую — пожаловаться на автора или заблокировать его. */
function StoryMenu({ visible, story, isOwn, onClose, onDelete, onReport }: { visible: boolean; story: Story; isOwn: boolean; onClose: () => void; onDelete: () => void; onReport: () => void }) {
  const { t } = useT();
  const authorId = !isOwn ? story.user.id : undefined;
  const blockStatus = useBlockStatus(authorId, visible);
  const toggleBlock = useToggleBlock(authorId ?? '');
  const blocked = !!blockStatus.data;
  return (
    <Sheet visible={visible} title={t('story')} onClose={onClose}>
      <View className="gap-2 pb-2">
        {isOwn ? (
          <Button title={t('mDelete')} variant="secondary" onPress={onDelete} />
        ) : (
          <>
            <Button title={t('report')} variant="secondary" onPress={onReport} />
            <Button
              title={blocked ? `${t('mUnblockUser')} @${story.user.username}` : `${t('blockUserBtn')} @${story.user.username}`}
              variant="secondary"
              loading={toggleBlock.isPending}
              onPress={() => toggleBlock.mutate(blocked, { onSuccess: onClose })}
            />
          </>
        )}
      </View>
    </Sheet>
  );
}
