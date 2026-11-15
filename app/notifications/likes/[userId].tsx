import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { PostCard } from '@/components/PostCard';
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { fetchLikedBy } from '@/api/posts';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { useT } from '@/hooks/useT';
import type { Post } from '@/shared/api-types';
import { colors } from '@/theme/tokens';

/** Кто и что лайкнул: посты, которые лайкнул один человек (веб: views/NotificationLikesView.vue). */
export default function NotificationLikesScreen() {
  const { t } = useT();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const query = useQuery({ queryKey: ['post', 'liked-by', userId], queryFn: () => fetchLikedBy(userId), enabled: !!userId });
  const viewable = useViewableIds();
  const liker = query.data?.liker;
  const posts = query.data?.posts ?? [];

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-nunito-extrabold text-xl text-brand-offwhite">{t('notifTabLikes')}</Text>
          {liker ? <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{t('mLikesFrom', { name: liker.display_name ?? liker.username, n: posts.length })}</Text> : null}
        </View>
      </View>
      <PostVisibilityProvider value={viewable.ids}>
        <FlashList<Post>
          {...viewable.props}
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            query.isLoading ? (
              <View className="gap-3"><Skeleton height={120} /><Skeleton height={120} /></View>
            ) : query.isError ? (
              <ErrorState onRetry={() => query.refetch()} />
            ) : (
              <EmptyState icon={<Heart size={36} color={colors.mutedIcon} />} title={t('mLikesGone')} />
            )
          }
        />
      </PostVisibilityProvider>
    </Screen>
  );
}
