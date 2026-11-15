import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import { ReportSheet } from '@/components/ReportSheet';
import { Button, Sheet } from '@/components/ui';
import { useAuthorNotify, usePostActions } from '@/hooks/usePostActions';
import { useBlockStatus, useToggleBlock, useTogglePin } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import { WEB_URL } from '@/lib/config';
import type { Post } from '@/shared/api-types';
import { isPostEditable } from '@/shared/postText';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/**
 * Меню «⋯» поста. Перенос меню из web components/PostCard.vue: свой пост — правка (7 дней), архив, комментарии, удаление;
 * чужой — «не интересно», уведомления об авторе, жалоба, блокировка. Закрепление и статистика — отдельные батчи.
 */
export function PostMenu({ post, onRemoved, pin }: { post: Post; onRemoved?: () => void; pin?: { pinned: boolean } }) {
  const { t } = useT();
  const router = useRouter();
  const myId = useSession((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const actions = usePostActions(post);
  const togglePin = useTogglePin();

  const author = post.author;
  const isOwn = !!myId && (myId === post.author_id || myId === author?.id);
  const authorId = !isOwn ? author?.id : undefined;
  const notify = useAuthorNotify(authorId, open);
  const blockStatus = useBlockStatus(authorId, open);
  const toggleBlock = useToggleBlock(authorId ?? '');
  const blocked = !!blockStatus.data;

  const close = () => {
    setOpen(false);
    setFailed(false);
  };

  /** Действие с сервером: при ошибке меню остаётся открытым с сообщением. */
  const run = async (action: () => Promise<boolean>, removed = false) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await action();
    setBusy(false);
    if (!ok) return setFailed(true);
    close();
    if (removed) onRemoved?.();
  };

  const confirmDelete = () =>
    Alert.alert(t('mDeletePostTitle'), t('mDeleteHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('mDelete'), style: 'destructive', onPress: () => void run(actions.remove, true) },
    ]);

  const share = () => {
    close();
    // Системный лист «Поделиться»: в нём же «Скопировать» (отдельного буфера обмена в приложении нет)
    const url = `${WEB_URL}/post/${post.id}`;
    Share.share({ message: url, url }).catch(() => {
      // пользователь закрыл лист
    });
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('mMore')} hitSlop={10} className="h-9 w-9 items-center justify-center active:opacity-60">
        <Ellipsis size={18} color={colors.mutedIcon} />
      </Pressable>
      <Sheet visible={open} title={t('groupDetailPostLabel')} onClose={close}>
        <View className="gap-2 pb-2">
          {isOwn && isPostEditable(post.created_at) ? (
            <Button
              title={t('mEdit')}
              variant="secondary"
              onPress={() => {
                close();
                router.push(`/create-post?edit=${post.id}` as Href);
              }}
            />
          ) : null}
          {isOwn && pin ? (
            <Button
              title={pin.pinned ? t('mUnpinPost') : t('mPinPost')}
              variant="secondary"
              loading={togglePin.isPending}
              onPress={() => togglePin.mutate({ postId: post.id, pinned: pin.pinned }, { onSuccess: close, onError: () => setFailed(true) })}
            />
          ) : null}
          {isOwn ? (
            <>
              <Button title={post.is_archived ? t('mUnarchive') : t('mArchive')} variant="secondary" disabled={busy} onPress={() => void run(actions.toggleArchive, true)} />
              <Button title={post.comments_disabled ? t('mCommentsOn') : t('mCommentsOff')} variant="secondary" disabled={busy} onPress={() => void run(actions.toggleComments)} />
              <Button title={t('mDelete')} variant="secondary" disabled={busy} onPress={confirmDelete} />
            </>
          ) : null}
          <Button title={t('share')} variant="secondary" onPress={share} />
          {!isOwn ? (
            <>
              <Button
                title={t('mNotInterested')}
                variant="secondary"
                onPress={() => {
                  close();
                  actions.markNotInterested(true);
                }}
              />
              {authorId ? (
                <Button title={notify.on ? t('mNotifyOff') : t('mNotifyOn')} variant="secondary" loading={notify.toggle.isPending} onPress={() => notify.toggle.mutate(undefined, { onSuccess: close, onError: () => setFailed(true) })} />
              ) : null}
              <Button
                title={t('report')}
                variant="secondary"
                onPress={() => {
                  close();
                  setReportOpen(true);
                }}
              />
              {authorId && author ? (
                <Button
                  title={blocked ? `${t('mUnblockUser')} @${author.username}` : `${t('blockUserBtn')} @${author.username}`}
                  variant="secondary"
                  loading={toggleBlock.isPending}
                  onPress={() => toggleBlock.mutate(blocked, { onSuccess: close, onError: () => setFailed(true) })}
                />
              ) : null}
            </>
          ) : null}
          {failed ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
        </View>
      </Sheet>
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />
    </>
  );
}
