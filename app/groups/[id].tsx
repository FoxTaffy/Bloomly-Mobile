import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, ChevronLeft, Lock, ShieldAlert, Star } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { ContentMenu } from '@/components/ContentMenu';
import { DetailScreenState } from '@/components/DetailScreenState';
import { PostCard } from '@/components/PostCard';
import { Button, Card, Chip, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useGroup, useGroupActions, useGroupEvents, useGroupMembers, useGroupPosts, useGroupReviews, useMemberships, useMyJoinRequest } from '@/hooks/useGroups';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { useT } from '@/hooks/useT';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import type { GroupMember, GroupReview } from '@/api/groups';
import type { GroupEvent, Post } from '@/shared/api-types';
import { apiErrorStatus } from '@/shared/apiError';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

type Tab = 'posts' | 'about' | 'events' | 'members' | 'reviews';
const TABS: { key: Tab; label: 'mGroupPosts' | 'groupDetailAboutGeneric' | 'mGroupEvents' | 'mGroupMembers' | 'groupDetailReviewsNav' }[] = [
  { key: 'posts', label: 'mGroupPosts' },
  { key: 'about', label: 'groupDetailAboutGeneric' },
  { key: 'events', label: 'mGroupEvents' },
  { key: 'members', label: 'mGroupMembers' },
  { key: 'reviews', label: 'groupDetailReviewsNav' },
];

/**
 * Группа. Веб-аналог: views/GroupDetailView.vue, только уровень участника: посты, о группе, события, участники, отзывы (чтение),
 * вступить / подать заявку / выйти. Заказы, прайс, Dealers' Den, настройки и публикация от имени группы — веб.
 */
export default function GroupDetailScreen() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const myId = useSession((s) => s.user?.id);
  const { nsfwMode, canUseNsfw, setNsfwMode } = useNsfwMode();
  const groupQuery = useGroup(id);
  const group = groupQuery.data;
  const memberships = useMemberships();
  const [tab, setTab] = useState<Tab>('posts');

  const isOwner = !!group && group.owner_id === myId;
  const isMember = !!group && (memberships.data ?? []).some((m) => m.group_id === group.id);
  const closed = !!group && group.is_public === false;
  const request = useMyJoinRequest(group?.id ?? '', !!group && !isMember && !isOwner && closed);
  const act = useGroupActions(group?.id ?? '');
  const viewable = useViewableIds();

  // Закрытая группа для не-участника: содержимое сервер не отдаёт (403) — показываем замок, а не ошибку
  const posts = useGroupPosts(group?.id ?? '', !!group && tab === 'posts');
  const members = useGroupMembers(group?.id ?? '', !!group && tab === 'members');
  const events = useGroupEvents(group?.id ?? '', !!group && tab === 'events');
  const reviews = useGroupReviews(group?.id ?? '', !!group && tab === 'reviews');
  const forbidden = [posts.error, members.error, events.error, reviews.error].some((e) => apiErrorStatus(e) === 403);

  if (!group) return <DetailScreenState loading={groupQuery.isLoading} error={groupQuery.error} onRetry={() => groupQuery.refetch()} />;

  // 18+: как у постов — при режиме «скрыто» группа закрыта, открыть может только взрослый
  if (group.is_nsfw && nsfwMode === 'hide') {
    return (
      <Screen>
        <View className="px-4 py-2">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
            <ChevronLeft size={18} color={colors.offwhite} />
          </Pressable>
        </View>
        <EmptyState
          icon={<ShieldAlert size={44} color={colors.warning} />}
          title={t('mGroupNsfwTitle')}
          hint={canUseNsfw ? t('mGroupNsfwAsk') : t('mNsfwPostAdultsOnly')}
          action={canUseNsfw ? <Button title={t('mShow')} onPress={() => setNsfwMode('show')} /> : undefined}
        />
      </Screen>
    );
  }

  const confirmLeave = () =>
    Alert.alert(t('mGroupLeaveTitle'), t('mGroupLeaveHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('leaveBtn'), style: 'destructive', onPress: () => act.leave.mutate() },
    ]);

  const pending = !!request.data;
  const actionBusy = act.join.isPending || act.leave.isPending || act.cancelRequest.isPending;
  const actionFailed = act.join.isError || act.leave.isError || act.cancelRequest.isError;
  const showJoin = group.type !== 'event' && !isOwner;

  const header = (
    <View>
      <View className="relative">
        <LinearGradient colors={[group.accent_color ?? colors.accent, colors.purple]} style={{ height: 150, width: '100%' }}>
          {group.banner_url ? <Image source={{ uri: group.banner_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        </LinearGradient>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/40">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <View className="absolute right-4 top-4 rounded-full bg-black/40">
          <ContentMenu report={{ type: 'group', id: group.id }} />
        </View>
      </View>

      <View className="gap-3 p-4">
        <View className="-mt-12 flex-row items-end gap-3">
          <View style={{ borderRadius: 40, borderWidth: 4, borderColor: colors.bg }}>
            <Avatar uri={group.avatar_url} name={group.name} size={72} />
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="shrink font-nunito-extrabold text-2xl text-brand-offwhite">{group.name}</Text>
          {group.is_verified ? <BadgeCheck size={18} color={colors.accent} /> : null}
          {group.is_nsfw ? <Text className="rounded-md bg-brand-error/15 px-1.5 py-0.5 font-nunito-extrabold text-xs text-brand-error">18+</Text> : null}
          {closed ? <Lock size={14} color={colors.mutedIcon} /> : null}
        </View>
        <View className="flex-row flex-wrap items-center gap-3">
          <Text className="font-nunito text-sm text-brand-muted">{group.members_count.toLocaleString()} {t('membersCount')}</Text>
          {group.reviews_count ? (
            <View className="flex-row items-center gap-1">
              <Star size={13} color={colors.yellow} fill={colors.yellow} />
              <Text className="font-nunito-bold text-sm text-brand-offwhite">{(group.reviews_avg ?? 0).toFixed(1)}</Text>
              <Text className="font-nunito text-xs text-brand-muted">({group.reviews_count})</Text>
            </View>
          ) : null}
        </View>
        {group.description ? <Text className="font-nunito leading-5 text-brand-offwhite">{group.description}</Text> : null}

        {isOwner ? (
          <Text className="font-nunito text-xs text-brand-muted">{t('mGroupYouOwn')}</Text>
        ) : showJoin ? (
          isMember ? (
            <Button title={t('leaveBtn')} variant="secondary" loading={actionBusy} onPress={confirmLeave} />
          ) : pending ? (
            <Button title={t('mGroupRequestCancel')} variant="secondary" loading={actionBusy} onPress={() => act.cancelRequest.mutate()} />
          ) : (
            <Button title={closed ? t('mGroupRequestJoin') : t('mJoinGroup')} loading={actionBusy} onPress={() => act.join.mutate()} />
          )
        ) : null}
        {actionFailed ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}

        <FlatList horizontal showsHorizontalScrollIndicator={false} data={TABS} keyExtractor={(x) => x.key} contentContainerClassName="gap-2" accessibilityRole="tablist" renderItem={({ item }) => <Chip label={t(item.label)} selected={tab === item.key} onPress={() => setTab(item.key)} />} />
      </View>
    </View>
  );

  const loadingRows = <View className="gap-3 px-4"><Skeleton height={80} /><Skeleton height={80} /></View>;
  const locked = (
    <EmptyState icon={<Lock size={40} color={colors.mutedIcon} />} title={t('mGroupClosedTitle')} hint={t('mGroupClosedHint')} />
  );

  if (tab === 'posts') {
    return (
      <Screen>
        <PostVisibilityProvider value={viewable.ids}>
          <FlatList<Post>
            {...viewable.props}
            data={forbidden ? [] : posts.posts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={header}
            onEndReachedThreshold={0.6}
            onEndReached={() => posts.hasNextPage && !posts.isFetchingNextPage && posts.fetchNextPage()}
            renderItem={({ item }) => <View className="px-4"><PostCard post={item} /></View>}
            ListEmptyComponent={forbidden ? locked : posts.isLoading ? loadingRows : posts.isError ? <ErrorState onRetry={() => posts.refetch()} /> : <EmptyState title={t('mGroupNoPosts')} />}
            ListFooterComponent={posts.isFetchingNextPage ? <Skeleton height={80} className="mx-4 mt-2" /> : null}
          />
        </PostVisibilityProvider>
      </Screen>
    );
  }

  return (
    <Screen>
      {tab === 'members' ? (
        <FlatList<GroupMember>
          data={forbidden ? [] : members.members}
          keyExtractor={(m) => m.user_id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={header}
          onEndReached={() => members.hasNextPage && !members.isFetchingNextPage && members.fetchNextPage()}
          renderItem={({ item }) => <MemberRow member={item} />}
          ListEmptyComponent={forbidden ? locked : members.isLoading ? loadingRows : members.isError ? <ErrorState onRetry={() => members.refetch()} /> : <EmptyState title={t('mGroupNoMembers')} />}
        />
      ) : tab === 'events' ? (
        <FlatList<GroupEvent>
          data={forbidden ? [] : (events.data ?? [])}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={header}
          renderItem={({ item }) => <GroupEventRow event={item} />}
          ListEmptyComponent={forbidden ? locked : events.isLoading ? loadingRows : events.isError ? <ErrorState onRetry={() => events.refetch()} /> : <EmptyState title={t('mGroupNoEvents')} />}
        />
      ) : tab === 'reviews' ? (
        <FlatList<GroupReview>
          data={forbidden ? [] : (reviews.data?.reviews ?? [])}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={header}
          renderItem={({ item }) => <ReviewRow review={item} />}
          ListEmptyComponent={forbidden ? locked : reviews.isLoading ? loadingRows : reviews.isError ? <ErrorState onRetry={() => reviews.refetch()} /> : <EmptyState title={t('mGroupNoReviews')} />}
        />
      ) : (
        <FlatList data={[group]} keyExtractor={(g) => g.id} contentContainerStyle={{ paddingBottom: 24 }} ListHeaderComponent={header} renderItem={() => <AboutSection group={group} />} />
      )}
    </Screen>
  );
}

function MemberRow({ member }: { member: GroupMember }) {
  const { t } = useT();
  const router = useRouter();
  const u = member.user;
  const role = member.customRole?.name ?? (member.role === 'owner' ? t('mRoleOwner') : member.role === 'admin' ? t('mRoleAdmin') : member.role === 'moderator' ? t('mRoleModerator') : null);
  return (
    <Pressable onPress={() => router.push(`/profile/${u.username}`)} accessibilityRole="button" className="flex-row items-center gap-3 px-4 py-2 active:opacity-70">
      <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={44} />
      <View className="flex-1">
        <Text numberOfLines={1} className="font-nunito-bold text-brand-offwhite">{u.display_name ?? u.username}</Text>
        <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">@{u.username}</Text>
      </View>
      {role ? <Text className="rounded-full border border-brand-border px-2.5 py-0.5 font-nunito-bold text-xs text-brand-accent-minus">{role}</Text> : null}
    </Pressable>
  );
}

function GroupEventRow({ event }: { event: GroupEvent }) {
  const router = useRouter();
  const { t } = useT();
  const d = new Date(event.starts_at);
  return (
    <View className="px-4">
      <Card padding="sm" className="mb-3 gap-1" onPress={() => router.push(`/events/${event.id}`)} accessibilityLabel={event.title}>
        <Text numberOfLines={2} className="font-nunito-bold text-brand-offwhite">{event.title}</Text>
        <Text className="font-nunito text-xs text-brand-muted">{d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}{event.location_name ? ` · ${event.location_name}` : ''}</Text>
        <Text className="font-nunito text-xs text-brand-muted">{t('mAttendeesCaps', { n: event.attendee_count })}</Text>
      </Card>
    </View>
  );
}

function ReviewRow({ review }: { review: GroupReview }) {
  const timeAgo = useTimeAgo();
  return (
    <View className="mx-4 border-b border-brand-border py-3">
      <View className="flex-row items-center gap-3">
        <Avatar uri={review.author.avatar_url} name={review.author.display_name ?? review.author.username} size={34} />
        <View className="flex-1">
          <Text numberOfLines={1} className="font-nunito-bold text-sm text-brand-offwhite">{review.author.display_name ?? review.author.username}</Text>
          <Text className="font-nunito text-xs text-brand-muted">{timeAgo(review.created_at)}</Text>
        </View>
        <View className="flex-row gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} color={colors.yellow} fill={n <= review.rating ? colors.yellow : 'transparent'} />)}
        </View>
      </View>
      {review.text ? <Text className="mt-2 font-nunito leading-5 text-brand-offwhite">{review.text}</Text> : null}
    </View>
  );
}

function AboutSection({ group }: { group: NonNullable<ReturnType<typeof useGroup>['data']> }) {
  const { t } = useT();
  const blocks = [
    { title: t('groupDetailAboutGeneric'), text: group.about_text ?? group.description },
    { title: t('groupDetailRulesNav'), text: group.rules_text },
  ].filter((b) => !!b.text);
  const faq = group.faq ?? [];
  if (blocks.length === 0 && faq.length === 0) return <EmptyState title={t('mGroupNoAbout')} />;
  return (
    <View className="gap-3 px-4">
      {blocks.map((b) => (
        <Card key={b.title} className="gap-1">
          <Text className="font-nunito-extrabold text-brand-offwhite">{b.title}</Text>
          <Text className="font-nunito leading-5 text-brand-offwhite">{b.text}</Text>
        </Card>
      ))}
      {faq.length > 0 ? (
        <Card className="gap-3">
          <Text className="font-nunito-extrabold text-brand-offwhite">FAQ</Text>
          {faq.map((f, i) => (
            <View key={`${f.q}${i}`} className="gap-0.5">
              <Text className="font-nunito-bold text-sm text-brand-offwhite">{f.q}</Text>
              <Text className="font-nunito text-sm text-brand-muted">{f.a}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
