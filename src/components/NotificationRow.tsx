import { Pressable, Text, View } from 'react-native';
import { AtSign, Bell, Calendar, FileText, Heart, MessageCircle, Repeat2, ShieldAlert, UserCheck, UserPlus, Users } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Avatar } from './Avatar';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useT } from '@/hooks/useT';
import { actionText, hasRequestActions, identityAvatar, isSystemType, senderText, systemMessage, type NotifItem } from '@/shared/notifications';
import { colors } from '@/theme/tokens';

type IconType = ComponentType<{ size?: number; color?: string }>;

// Значки поверх аватара (веб: lib/notifVisuals.ts)
const TYPE_ICON: Record<string, IconType> = {
  LIKE: Heart, COMMENT: MessageCircle, REPAW: Repeat2, FOLLOW: UserPlus, MENTION: AtSign,
  RELATIONSHIP_REQUEST: Heart, RELATIONSHIP_ACCEPTED: Heart, FOLLOW_POST: FileText, GROUP_POST: FileText,
  COAUTHOR_INVITE: Users, COAUTHOR_ACCEPT: UserCheck, FRIEND_REQUEST: UserPlus, FRIEND_ACCEPT: UserCheck,
  automod_warn: ShieldAlert, event_in_city: Calendar,
};

export type Decision = 'accepted' | 'declined' | undefined;

interface Props {
  item: NotifItem;
  decision?: Decision;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function NotificationRow({ item, decision, onPress, onAccept, onDecline }: Props) {
  const { t } = useT();
  const timeAgo = useTimeAgo();
  const n = item.notif;
  const system = isSystemType(n.type);
  const Icon = TYPE_ICON[n.type] ?? Bell;
  const request = hasRequestActions(n.type);
  const sysText = system ? systemMessage(n, t) : '';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`flex-row items-start gap-3 border-b border-brand-border px-4 py-3 active:opacity-80 ${item.unread ? 'bg-brand-accent-plus-plus/30' : ''}`}
    >
      <View>
        {system ? (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-card">
            <Icon size={18} color={colors.accentMinus} />
          </View>
        ) : (
          <>
            <Avatar uri={identityAvatar(n)} name={senderText(item, t) || '?'} size={40} />
            <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-brand-card">
              <Icon size={12} color={colors.accent} />
            </View>
          </>
        )}
      </View>
      <View className="flex-1">
        {system && sysText ? (
          <Text className="font-nunito text-brand-offwhite">{sysText}</Text>
        ) : (
          <Text className="font-nunito text-brand-offwhite">
            <Text className="font-nunito-bold">{senderText(item, t) || t('mSomeone')}</Text> {actionText(item, t)}
          </Text>
        )}
        <Text className="mt-0.5 font-nunito text-xs text-brand-muted">{timeAgo(n.created_at)}</Text>
        {request ? (
          decision ? (
            <Text className="mt-2 font-nunito-bold text-xs text-brand-muted">{decision === 'accepted' ? t('notifAcceptedDone') : t('notifDeclinedDone')}</Text>
          ) : (
            <View className="mt-2 flex-row gap-2">
              <Pressable onPress={onAccept} accessibilityRole="button" className="rounded-full bg-brand-accent px-3 py-1.5">
                <Text className="font-nunito-bold text-xs text-brand-offwhite">{t('notifAccept')}</Text>
              </Pressable>
              <Pressable onPress={onDecline} accessibilityRole="button" className="rounded-full bg-brand-card px-3 py-1.5">
                <Text className="font-nunito-bold text-xs text-brand-muted">{t('notifDecline')}</Text>
              </Pressable>
            </View>
          )
        ) : null}
      </View>
      {item.unread ? <View className="mt-2 h-2 w-2 rounded-full bg-brand-accent" /> : null}
    </Pressable>
  );
}
