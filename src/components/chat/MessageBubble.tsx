import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Clock, CornerUpLeft, FileText, Lock, Mic, Share2, Sparkles, Users } from 'lucide-react-native';
import { VoiceMessage } from '@/components/chat/VoiceMessage';
import { PostText } from '@/components/post/PostText';
import { PostVideo } from '@/components/post/PostVideo';
import { useT } from '@/hooks/useT';
import { mediaSource } from '@/lib/mediaAuth';
import type { Message } from '@/shared/api-types';
import { albumFiles, bodyText, fileKind, forwardedAuthor, isEmojiOnlyText, isMoneyType, reactionChips } from '@/shared/chat';
import { parseStoryReply } from '@/shared/stories';
import type { T } from '@/shared/notifications';
import { colors } from '@/theme/tokens';

const MEDIA = 220;

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  myId?: string | null;
  /** В группе над чужим сообщением показываем имя автора. */
  showSender?: boolean;
  onLongPress: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  /** Нажатие на цитату: прокрутить к исходному сообщению. */
  onOpenReply?: (id: string) => void;
}

/**
 * Одно сообщение чата. Веб-аналог: components/chat/ChatMessage.vue. Платёжные и заказные карточки (счёт, чаевые, заказ)
 * рисуются безопасной плашкой: денег в приложении нет, кнопок оплаты и ссылок на оплату тоже.
 */
export const MessageBubble = memo(function MessageBubble({ message, isMine, myId, showSender, onLongPress, onReact, onOpenReply }: MessageBubbleProps) {
  const { t } = useT();
  const router = useRouter();
  const m = message;

  if (m.type === 'system') {
    return (
      <View className="my-2 items-center">
        <Text className="rounded-full bg-brand-card px-3 py-1 font-nunito text-xs text-brand-muted">{m.text}</Text>
      </View>
    );
  }

  const story = useMemoStory(m);
  const kind = fileKind(m);
  const album = albumFiles(m);
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  const author = forwardedAuthor(m, t('chatHiddenUserFallback'));
  const text = bodyText(m).replace(/^\[story_reply:[\s\S]*?\]\n?/u, '');
  const emojiOnly = !kind && !story && m.type === 'text' && isEmojiOnlyText(m.text);
  const encrypted = !!m.encrypted_text && !m.text;
  const chips = reactionChips(m, myId);
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const card = cardKind(m, meta);

  const bubbleCls = isMine ? 'bg-brand-accent rounded-br-sm' : 'bg-brand-card rounded-bl-sm border border-brand-border';
  const hasBubbleText = !!text.trim() && !card && !story && !emojiOnly && kind !== 'audio';

  return (
    <View className={`mb-2 max-w-[88%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
      {showSender && !isMine && m.sender ? (
        <Text numberOfLines={1} className="mb-0.5 ml-1 font-nunito-bold text-xs text-brand-accent-minus">{m.sender.display_name ?? m.sender.username}</Text>
      ) : null}

      <Pressable onLongPress={() => onLongPress(m)} delayLongPress={300} accessibilityRole="button" accessibilityHint={t('mMessageActionsHint')} className="active:opacity-90">
        {/* Ответ: цитата */}
        {m.reply_to ? (
          <Pressable onPress={() => onOpenReply?.(m.reply_to!.id)} className="mb-0.5 max-w-full flex-row items-center gap-1.5 rounded-xl border-l-2 border-brand-accent bg-brand-card/60 px-2 py-1">
            <CornerUpLeft size={12} color={colors.mutedIcon} />
            <View className="shrink">
              <Text numberOfLines={1} className="font-nunito-bold text-xs text-brand-accent-minus">{m.reply_to.sender?.display_name ?? m.reply_to.sender?.username ?? t('mSomeone')}</Text>
              <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{replyPreview(m.reply_to, t)}</Text>
            </View>
          </Pressable>
        ) : null}

        {author ? <Text className="mb-0.5 ml-1 font-nunito text-xs text-brand-muted">↩️ {t('mForwardedFrom', { name: author })}</Text> : null}

        {/* Вложения */}
        {m.type === 'album' && album.length > 0 ? (
          <View className="mb-0.5 flex-row flex-wrap gap-0.5 overflow-hidden rounded-2xl" style={{ width: MEDIA }}>
            {album.slice(0, 4).map((f, i) => (
              <View key={f.url + i} style={{ width: (MEDIA - 2) / 2, height: (MEDIA - 2) / 2 }} className="overflow-hidden bg-brand-card">
                {f.type === 'image' ? <Image source={mediaSource(f.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <FilePlate />}
              </View>
            ))}
          </View>
        ) : kind === 'image' ? (
          <Image source={mediaSource(m.file_url!)} style={{ width: MEDIA, height: MEDIA, borderRadius: 16, marginBottom: 2 }} contentFit="cover" accessibilityLabel={t('mPhoto')} />
        ) : kind === 'video' ? (
          <View className="mb-0.5 overflow-hidden rounded-2xl">
            <PostVideo url={m.file_url!} width={MEDIA} height={MEDIA * 0.75} pageActive postVisible concealed={false} />
          </View>
        ) : kind === 'audio' ? (
          <View className={`rounded-2xl px-4 py-2.5 ${bubbleCls}`}>
            <VoiceMessage id={m.id} url={m.file_url!} isMine={isMine} />
          </View>
        ) : kind === 'other' ? (
          <View className="mb-0.5"><FilePlate /></View>
        ) : null}

        {/* Карточки */}
        {card === 'post' ? (
          <SharedCard icon={<Share2 size={16} color={colors.accentMinus} />} title={t('mSharedPost')} hint={t('mOpenPost')} onPress={() => router.push(`/post/${String(meta.postId)}` as Href)} isMine={isMine} />
        ) : card === 'group' ? (
          <SharedCard icon={<Users size={16} color={colors.accentMinus} />} title={t('mSharedGroup')} hint={t('mOpenGroup')} onPress={() => router.push(`/groups/${String(meta.groupId)}` as Href)} isMine={isMine} />
        ) : card === 'sticker' ? (
          <View className="items-center rounded-2xl bg-brand-card px-4 py-3"><Sparkles size={22} color={colors.accentMinus} /><Text className="mt-1 font-nunito text-xs text-brand-muted">{t('mSticker')}</Text></View>
        ) : card === 'money' ? (
          <View className="flex-row items-center gap-2 rounded-2xl border border-brand-border bg-brand-card px-3 py-2.5">
            <Lock size={14} color={colors.mutedIcon} />
            <Text className="shrink font-nunito text-xs text-brand-muted">{t('mChatWebOnlyCard')}</Text>
          </View>
        ) : null}

        {story ? (
          <View className={`w-48 gap-2 rounded-2xl px-3 py-2.5 ${bubbleCls}`}>
            <View className="aspect-[9/16] max-h-56 items-center justify-center overflow-hidden rounded-xl bg-brand-bg">
              {story.imageUrl && !story.expired ? (
                <Image source={mediaSource(story.imageUrl)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="items-center gap-1"><Clock size={28} color={colors.mutedIcon} /><Text className="font-nunito-bold text-xs text-brand-muted">{t('chatStoryExpiredLabel')}</Text></View>
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <Sparkles size={12} color={colors.accentMinus} />
              <Text numberOfLines={1} className="flex-1 font-nunito text-xs text-brand-offwhite/80">{story.authorName ? `${t('story')} · ${story.authorName}` : t('story')}</Text>
            </View>
            {story.replyText ? <PostText text={story.replyText} className="text-brand-offwhite" /> : null}
          </View>
        ) : emojiOnly ? (
          <Text className="px-1 text-5xl leading-[60px]">{m.text}</Text>
        ) : encrypted ? (
          <View className={`flex-row items-center gap-2 rounded-2xl px-4 py-2.5 ${bubbleCls}`}>
            <Lock size={14} color={colors.accentMinus} />
            <Text className="font-nunito italic text-brand-offwhite">{t('mEncryptedMessage')}</Text>
          </View>
        ) : hasBubbleText ? (
          <View className={`rounded-2xl px-4 py-2.5 ${bubbleCls}`}>
            <PostText text={text} className="text-brand-offwhite" />
          </View>
        ) : kind === 'audio' && !m.file_url ? (
          <View className="flex-row items-center gap-2"><Mic size={16} color={colors.accentMinus} /><Text className="text-brand-offwhite">{t('chatVoiceMessageTitle')}</Text></View>
        ) : null}
      </Pressable>

      {chips.length > 0 ? (
        <View className={`mt-1 flex-row flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {chips.map((c) => (
            <Pressable key={c.emoji} onPress={() => onReact(m, c.emoji)} accessibilityRole="button" accessibilityState={{ selected: c.mine }} className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${c.mine ? 'border-brand-accent bg-brand-accent-plus-plus' : 'border-brand-border bg-brand-card'}`}>
              <Text className="text-sm">{c.emoji}</Text>
              <Text className={`font-nunito-bold text-xs ${c.mine ? 'text-brand-accent-minus' : 'text-brand-muted'}`}>{c.count}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="mt-0.5 flex-row items-center gap-1 px-1">
        <Text className="font-nunito text-xs text-brand-muted">{time}</Text>
        {m.edited_at ? <Text className="font-nunito text-xs italic text-brand-muted">{t('chatEditedAbbr')}</Text> : null}
      </View>
    </View>
  );
});

function useMemoStory(m: Message) {
  return useMemo(() => parseStoryReply(m.text), [m.text]);
}

function cardKind(m: Message, meta: Record<string, unknown>): 'post' | 'group' | 'sticker' | 'money' | null {
  if (m.type === 'post_share' && meta.postId) return 'post';
  if (m.type === 'group_share' && meta.groupId) return 'group';
  if (m.type === 'sticker') return 'sticker';
  if (isMoneyType(m.type)) return 'money';
  return null;
}

function replyPreview(r: NonNullable<Message['reply_to']>, t: T): string {
  if (r.file_url && !r.text) return t('mediaFilePreview');
  if (r.text && /^\[story_reply:/u.test(r.text)) return t('chatStoryReplyPreview');
  return r.text ?? '';
}

function SharedCard({ icon, title, hint, onPress, isMine }: { icon: React.ReactNode; title: string; hint: string; onPress: () => void; isMine: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={`w-56 flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-80 ${isMine ? 'bg-brand-accent' : 'border border-brand-border bg-brand-card'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-bg/40">{icon}</View>
      <View className="flex-1">
        <Text className="font-nunito-bold text-sm text-brand-offwhite">{title}</Text>
        <Text className="font-nunito text-xs text-brand-offwhite/70">{hint}</Text>
      </View>
    </Pressable>
  );
}

function FilePlate() {
  const { t } = useT();
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-brand-border bg-brand-card px-3 py-2.5">
      <FileText size={16} color={colors.mutedIcon} />
      <Text className="font-nunito text-xs text-brand-muted">{t('mAttachment')}</Text>
    </View>
  );
}
