import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEventAttendees, useRsvp, useUpcomingEvents } from '@/hooks/useEvent';
import { Screen } from '@/components/ui';
import { useJoinGroup, useMyGroups, useRecommendedGroups } from '@/hooks/useGroups';
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

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-2xl font-extrabold text-brand-offwhite">{t('catCommunity')}</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-brand-card">
          <Plus size={18} color={colors.offwhite} />
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
