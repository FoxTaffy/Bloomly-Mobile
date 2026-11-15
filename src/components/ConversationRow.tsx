import { Pressable, Text, View } from 'react-native';
import { BellOff, Mic, Pin } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { Conversation } from '@/shared/api-types';
import { conversationTitle, fileKind, isMuted, isPinned, otherUser } from '@/shared/chat';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export function ConversationRow({ conversation, onPress, onLongPress }: { conversation: Conversation; onPress: () => void; onLongPress?: () => void }) {
  const timeAgo = useTimeAgo();
  const { t } = useT();
  const myId = useSession((s) => s.user?.id);
  const title = conversationTitle(conversation, myId, t('chatGroupFallbackName'));
  const avatarUri = conversation.is_group ? conversation.avatar_url : otherUser(conversation, myId)?.avatar_url;
  const last = conversation.last_message;
  const pinned = isPinned(conversation);
  const muted = isMuted(conversation);
  const incomingRequest = conversation.request_status === 'pending' && conversation.request_from_id !== myId;

  const preview =
    conversation.request_status === 'pending' && conversation.request_from_id !== myId
      ? t('mDmRequestPreview')
      : last?.type === 'voice' || last?.type === 'audio'
        ? t('voiceMessagePreview')
        : last?.encrypted_text && !last.text
          ? t('encryptedMessagePreview')
          : last?.file_url && !last.text
            ? t('mediaFilePreview')
            : (last?.text ?? t('noMessages'));

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350} accessibilityRole="button" className="flex-row items-center gap-3 border-b border-brand-border px-4 py-3 active:opacity-80">
      <Avatar uri={avatarUri} name={title} size={48} />
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <View className="mr-2 flex-1 flex-row items-center gap-1">
            <Text className="shrink font-bold text-brand-offwhite" numberOfLines={1}>{title}</Text>
            {pinned ? <Pin size={12} color={colors.mutedIcon} /> : null}
            {muted ? <BellOff size={12} color={colors.mutedIcon} /> : null}
          </View>
          {last ? <Text className="text-xs text-brand-muted">{timeAgo(last.created_at)}</Text> : null}
        </View>
        <View className="mt-0.5 flex-row items-center justify-between">
          <View className="mr-2 flex-1 flex-row items-center gap-1">
            {last?.type === 'voice' || last?.type === 'audio' || (last && fileKind(last) === 'audio') ? <Mic size={12} color={colors.mutedIcon} /> : null}
            <Text className={`flex-1 text-sm ${incomingRequest ? 'font-nunito-bold text-brand-accent-minus' : 'text-brand-muted'}`} numberOfLines={1}>
              {preview}
            </Text>
          </View>
          {conversation.unread_count > 0 ? (
            <View className={`min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 ${muted ? 'bg-brand-muted' : 'bg-brand-accent'}`}>
              <Text className="text-[11px] font-bold text-brand-offwhite">{conversation.unread_count}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
