import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useEventAttendees, useRsvp, useUpcomingEvents } from '@/hooks/useEvent';
import { Screen } from '@/components/ui';
import { useInvites, useJoinGroup, useMyGroups, useRecommendedGroups, useRespondInvite } from '@/hooks/useGroups';
import { EventCard } from '@/components/EventCard';
import { GroupRow } from '@/components/GroupRow';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export default function GroupsScreen() {
  const { t } = useT();
  const router = useRouter();

  const eventsQuery = useUpcomingEvents();
  const myGroupsQuery = useMyGroups();
  const recommendedQuery = useRecommendedGroups();

  const featured = eventsQuery.data?.[0];

  const attendeesQuery = useEventAttendees(featured?.id);
  const rsvpMutation = useRsvp(featured?.id);
  const joinMutation = useJoinGroup();
  const invites = useInvites();
  const respond = useRespondInvite();

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-2xl font-extrabold text-brand-offwhite">{t('catCommunity')}</Text>
        {/* Каталог мероприятий (создание групп и событий — только веб) */}
        <Pressable onPress={() => router.push('/events')} accessibilityRole="button" accessibilityLabel={t('mEvTitle')} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
          <CalendarDays size={18} color={colors.offwhite} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {featured ? (
          <EventCard
            event={featured}
            attendees={attendeesQuery.data ?? []}
            going={false}
            onRsvp={() => rsvpMutation.mutate('going')}
            onPress={() => router.push(`/events/${featured.id}`)}
          />
        ) : null}

        {(invites.data ?? []).length > 0 ? (
          <View className="mb-4">
            <Text className="mb-3 text-sm font-semibold text-brand-muted">{t('mGroupInvitesCaps')}</Text>
            {(invites.data ?? []).map((inv) => (
              <View key={inv.id} className="mb-3 rounded-2xl border border-brand-border bg-brand-card p-3">
                <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{t('mGroupInvitedBy', { name: inv.inviter.display_name ?? inv.inviter.username })}</Text>
                <GroupRow group={inv.group} onPress={() => router.push(`/groups/${inv.group.id}`)} />
                <View className="flex-row gap-2">
                  <Pressable onPress={() => respond.mutate({ id: inv.id, accept: true })} disabled={respond.isPending} accessibilityRole="button" className="flex-1 items-center rounded-full bg-brand-accent py-2 active:opacity-80">
                    <Text className="font-nunito-bold text-sm text-brand-offwhite">{t('mFriendAccept')}</Text>
                  </Pressable>
                  <Pressable onPress={() => respond.mutate({ id: inv.id, accept: false })} disabled={respond.isPending} accessibilityRole="button" className="flex-1 items-center rounded-full bg-brand-bg py-2 active:opacity-80">
                    <Text className="font-nunito-bold text-sm text-brand-muted">{t('mFriendReject')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text className="mb-3 text-sm font-semibold text-brand-muted">{t('mMyGroupsCaps')}</Text>
        {(myGroupsQuery.data ?? []).map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            actionLabel={t('openBtn')}
            onAction={() => router.push(`/groups/${group.id}`)}
            onPress={() => router.push(`/groups/${group.id}`)}
          />
        ))}

        <Text className="mb-3 mt-4 text-sm font-semibold text-brand-muted">{t('mRecommendedCaps')}</Text>
        {(recommendedQuery.data ?? []).map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            actionLabel={t('mJoinGroup')}
            onAction={() => joinMutation.mutate(group.id)}
            onPress={() => router.push(`/groups/${group.id}`)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
