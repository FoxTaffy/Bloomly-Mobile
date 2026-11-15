import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, RefreshControl } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ArrowDownUp, Flower2, Search, Bell, Hash } from 'lucide-react-native';
import { Chip, EmptyState, ErrorState, Screen, Sheet, Skeleton } from '@/components/ui';
import { useCreatePost, useInfinitePosts } from '@/hooks/usePosts';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { useStories } from '@/hooks/useStories';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { PostCard } from '@/components/PostCard';
import { StoryRing, AddStoryButton } from '@/components/StoryRing';
import { Avatar } from '@/components/Avatar';
import { useSession } from '@/stores/session';
import type { Post } from '@/shared/api-types';
import { FEED_SORTS, FEED_TABS, isSortableMode, type FeedMode, type FeedSort } from '@/shared/feed';
import type { MessageKey } from '@/shared/i18n';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

const LIST_PADDING = { paddingHorizontal: 16, paddingBottom: 24 };

// Подписи вкладок и сортировки — как на вебе (lib/feed.ts: FEED_TABS, FEED_SORT_OPTIONS)
const TAB_LABEL: Record<FeedMode, MessageKey> = { 'for-you': 'forYou', subscriptions: 'feedFollowing', news: 'feedGeneral', photos: 'feedMedia', nsfw: 'mFeedNsfw' };
const SORT_LABEL: Record<FeedSort, MessageKey> = {
  smart: 'mFeedSortSmart',
  new: 'mFeedSortNew',
  old: 'mFeedSortOld',
  'hot-day': 'mFeedSortHotDay',
  'hot-week': 'mFeedSortHotWeek',
  'hot-month': 'mFeedSortHotMonth',
  'hot-all': 'mFeedSortHotAll',
};

export default function FeedScreen() {
  const { t } = useT();
  const user = useSession((s) => s.user);
  const [draft, setDraft] = useState('');

  const storiesQuery = useStories();
  const router = useRouter();
  const [mode, setMode] = useState<FeedMode>('for-you');
  const [sort, setSort] = useState<FeedSort>('smart');
  const [sortOpen, setSortOpen] = useState(false);
  // Вкладка NSFW — только взрослым с включённым показом 18+ (web: nsfwEnabled = режим 'show'); иначе её нет
  const { nsfwMode } = useNsfwMode();
  const nsfwEnabled = nsfwMode === 'show';
  const tabs = FEED_TABS.filter((x) => !x.nsfwOnly || nsfwEnabled);
  useEffect(() => {
    if (!nsfwEnabled && mode === 'nsfw') setMode('for-you');
  }, [nsfwEnabled, mode]);
  // Пока эффект не переключил вкладку, запрос NSFW не уходит
  const activeMode: FeedMode = mode === 'nsfw' && !nsfwEnabled ? 'for-you' : mode;
  const feedQuery = useInfinitePosts(activeMode, sort);
  const postMutation = useCreatePost();

  const posts = feedQuery.posts;
  const viewable = useViewableIds();

  return (
    <Screen>
      <View className="mb-2 flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center gap-2">
          <Flower2 size={22} color={colors.accent} />
          <Text className="text-lg font-extrabold text-brand-offwhite">Bloomly</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.push('/discover')} accessibilityRole="button" accessibilityLabel={t('mSearchTitle')} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-60">
            <Search size={18} color={colors.offwhite} />
          </Pressable>
          <Link href="/notifications" asChild>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-brand-card">
              <Bell size={18} color={colors.offwhite} />
            </Pressable>
          </Link>
        </View>
      </View>

      <PostVisibilityProvider value={viewable.ids}>
      <FlashList<Post>
        {...viewable.props}
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={LIST_PADDING}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) feedQuery.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={() => {
              feedQuery.refetch();
              storiesQuery.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={storiesQuery.data ?? []}
              keyExtractor={(s) => s.id}
              contentContainerClassName="gap-3 pb-4"
              ListHeaderComponent={<AddStoryButton />}
              renderItem={({ item }) => <StoryRing story={item} />}
            />

            <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-brand-border bg-brand-card px-3 py-2">
              <Avatar uri={user?.avatar_url} name={user?.display_name ?? user?.username} size={32} />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('whatsNew')}
                placeholderTextColor={colors.mutedIcon}
                className="flex-1 text-brand-offwhite"
                multiline
              />
              {draft.trim().length > 0 ? (
                <Pressable
                  onPress={() =>
                    postMutation.mutate(draft.trim(), { onSuccess: () => setDraft('') })
                  }
                  disabled={postMutation.isPending}
                  className="rounded-full bg-brand-accent px-3 py-1.5"
                >
                  <Text className="text-xs font-bold text-brand-offwhite">
                    {postMutation.isPending ? '...' : t('publish')}
                  </Text>
                </Pressable>
              ) : (
                <Hash size={18} color={colors.mutedIcon} />
              )}
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={tabs}
              keyExtractor={(x) => x.mode}
              contentContainerClassName="gap-2 pb-3"
              accessibilityRole="tablist"
              renderItem={({ item }) => <Chip label={t(TAB_LABEL[item.mode])} selected={activeMode === item.mode} onPress={() => setMode(item.mode)} />}
            />
            {isSortableMode(activeMode) ? (
              <Pressable onPress={() => setSortOpen(true)} accessibilityRole="button" accessibilityLabel={t('mFeedSortTitle')} hitSlop={6} className="mb-3 flex-row items-center gap-1.5 self-start active:opacity-60">
                <ArrowDownUp size={14} color={colors.mutedIcon} />
                <Text className="font-nunito-bold text-xs text-brand-muted">{t(SORT_LABEL[sort])}</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} />
        )}
        ListEmptyComponent={
          feedQuery.isLoading ? (
            <View className="gap-3">
              <Skeleton height={120} />
              <Skeleton height={120} />
            </View>
          ) : feedQuery.isError ? (
            <ErrorState onRetry={() => feedQuery.refetch()} />
          ) : (
            <EmptyState title={t('mEmpty')} hint={activeMode === 'for-you' ? t('mFeedEmptyHint') : undefined} />
          )
        }
        ListFooterComponent={feedQuery.isFetchingNextPage ? <Skeleton height={80} className="mt-2" /> : null}
      />
      </PostVisibilityProvider>
      <Sheet visible={sortOpen} title={t('mFeedSortTitle')} onClose={() => setSortOpen(false)}>
        <View className="flex-row flex-wrap gap-2 pb-2">
          {FEED_SORTS.map((x) => (
            <Chip
              key={x}
              label={t(SORT_LABEL[x])}
              selected={sort === x}
              onPress={() => {
                setSort(x);
                setSortOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
