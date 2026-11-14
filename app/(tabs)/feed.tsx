import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, RefreshControl } from 'react-native';
import { Link } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Flower2, Search, Bell, Hash } from 'lucide-react-native';
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useCreatePost, useInfinitePosts, useRepawPost, useVotePost } from '@/hooks/usePosts';
import { useStories } from '@/hooks/useStories';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { PostCard } from '@/components/PostCard';
import { StoryRing, AddStoryButton } from '@/components/StoryRing';
import { Avatar } from '@/components/Avatar';
import { useSession } from '@/stores/session';
import type { Post } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

const LIST_PADDING = { paddingHorizontal: 16, paddingBottom: 24 };

export default function FeedScreen() {
  const { t } = useT();
  const user = useSession((s) => s.user);
  const [draft, setDraft] = useState('');

  const storiesQuery = useStories();
  const feedQuery = useInfinitePosts('for-you');
  const voteMutation = useVotePost();
  const repawMutation = useRepawPost();
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
          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-brand-card">
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
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onVote={(value) => voteMutation.mutate({ id: item.id, value })}
            onRepaw={() => repawMutation.mutate(item.id)}
          />
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
            <EmptyState title={t('mEmpty')} hint={t('mFeedEmptyHint')} />
          )
        }
        ListFooterComponent={feedQuery.isFetchingNextPage ? <Skeleton height={80} className="mt-2" /> : null}
      />
      </PostVisibilityProvider>
    </Screen>
  );
}
