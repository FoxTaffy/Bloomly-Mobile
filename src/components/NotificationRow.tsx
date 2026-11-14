import { Pressable, Text, View } from 'react-native';
import { Heart, MessageCircle, UserPlus, AtSign, Repeat2, Bell } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { AppNotification } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/shared/i18n';

const TYPE_TEXT: Record<string, MessageKey> = {
  LIKE: 'notifActLike',
  REPAW: 'notifActRepaw',
  COMMENT: 'notifActComment',
  MENTION: 'notifActMention',
  FOLLOW: 'notifActFollow',
  FRIEND_REQUEST: 'notifFriendRequest',
  FRIEND_ACCEPT: 'notifFriendAccept',
  RELATIONSHIP_REQUEST: 'notifActRelReq',
  RELATIONSHIP_ACCEPTED: 'notifActRelAccepted',
};

const TYPE_ICON: Record<string, any> = {
  LIKE: Heart,
  REPAW: Repeat2,
  COMMENT: MessageCircle,
  MENTION: AtSign,
  FOLLOW: UserPlus,
  FRIEND_REQUEST: UserPlus,
  RELATIONSHIP_REQUEST: Heart,
};

export function NotificationRow({
  notification,
  onAccept,
  onDecline,
}: {
  notification: AppNotification;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const { t } = useT();
  const timeAgo = useTimeAgo();
  const name = notification.sender?.display_name ?? notification.sender?.username ?? t('mSomeone');
  const textKey = TYPE_TEXT[notification.type];
  const suffix = textKey ? t(textKey) : notification.type;
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const isRelationshipRequest = notification.type === 'RELATIONSHIP_REQUEST';

  return (
    <View className={`flex-row items-start gap-3 border-b border-brand-border px-4 py-3 ${!notification.read ? 'bg-brand-accent-plus-plus/30' : ''}`}>
      <View>
        <Avatar uri={notification.sender?.avatar_url} name={name} size={40} />
        <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-brand-card">
          <Icon size={12} color={colors.accent} />
        </View>
      </View>
      <View className="flex-1">
        <Text className="text-brand-offwhite">
          <Text className="font-bold">{name}</Text> {suffix}
        </Text>
        <Text className="mt-0.5 text-xs text-brand-muted">{timeAgo(notification.created_at)}</Text>
        {isRelationshipRequest ? (
          <View className="mt-2 flex-row gap-2">
            <Pressable onPress={onAccept} className="rounded-full bg-brand-accent px-3 py-1.5">
              <Text className="text-xs font-bold text-brand-offwhite">{t('notifAccept')}</Text>
            </Pressable>
            <Pressable onPress={onDecline} className="rounded-full bg-brand-card px-3 py-1.5">
              <Text className="text-xs font-bold text-brand-muted">{t('verLater')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
