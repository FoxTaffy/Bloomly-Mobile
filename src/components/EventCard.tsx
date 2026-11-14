import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Calendar } from 'lucide-react-native';
import { Avatar } from './Avatar';
import type { EventAttendee, GroupEvent } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export function EventCard({
  event,
  attendees,
  going,
  onRsvp,
  onPress,
}: {
  event: GroupEvent;
  attendees: EventAttendee[];
  going: boolean;
  onRsvp: () => void;
  onPress?: () => void;
}) {
  const { t } = useT();
  const date = new Date(event.starts_at);
  const dateLabel = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeLabel = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable onPress={onPress} className="mb-6 overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
      <View className="relative">
        <LinearGradient colors={[colors.accent, colors.purple]} style={{ height: 140, width: '100%' }}>
          {event.banner_url ? (
            <Image source={{ uri: event.banner_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : null}
        </LinearGradient>
        <View className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1">
          <Text className="text-xs font-bold text-white">{t('mEventCaps')}</Text>
        </View>
        <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-black/50 px-2 py-1">
          <Star size={12} color={colors.yellow} fill={colors.yellow} />
          <Text className="text-xs font-bold text-white">4.9</Text>
        </View>
      </View>
      <View className="p-4">
        <Text className="mb-1 text-lg font-extrabold text-brand-offwhite">{event.title}</Text>
        <View className="mb-3 flex-row items-center gap-1.5">
          <Calendar size={14} color={colors.mutedIcon} />
          <Text className="text-sm text-brand-muted">
            {dateLabel} · {timeLabel}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {attendees.slice(0, 4).map((a, idx) => (
              <View key={a.user_id} style={{ marginLeft: idx === 0 ? 0 : -10 }}>
                <Avatar uri={a.user.avatar_url} name={a.user.display_name ?? a.user.username} size={28} />
              </View>
            ))}
            {event.attendee_count > 0 ? (
              <Text className="ml-2 text-xs text-brand-muted">{t('mAttendeesGoing', { n: event.attendee_count })}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={onRsvp}
            className={`rounded-full px-4 py-2 ${going ? 'bg-brand-accent-plus-plus' : 'bg-brand-accent'}`}
          >
            <Text className="font-bold text-brand-offwhite">{going ? t('mGoingDone') : t('groupDetailGoBtn')}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
