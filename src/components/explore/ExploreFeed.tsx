import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Hash } from 'lucide-react-native';
import { PostCard } from '@/components/PostCard';
import { Chip, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useExplorePosts, useTrendingTags, useVotePost, useRepawPost } from '@/hooks/usePosts';
import { EXPLORE_PERIODS, type ExplorePeriod, type ExploreSort } from '@/shared/feed';
import { colors } from '@/theme/tokens';

const SORT_LABEL: Record<ExploreSort, string> = { hot: 'Актуальное', new: 'Новое' };
const PERIOD_LABEL: Record<ExplorePeriod, string> = { day: 'Сутки', week: 'Неделя', month: 'Месяц', all: 'Всё время' };

/** Обзор (web: views/ExploreView.vue + composables/useExploreFeed.ts): тренды, сортировка, период, тег. */
export function ExploreFeed({ tag, onTagChange }: { tag: string; onTagChange: (tag: string) => void }) {
  const [sort, setSort] = useState<ExploreSort>('hot');
  const [period, setPeriod] = useState<ExplorePeriod>('all');

  const explore = useExplorePosts({ sort, period, tag: tag || undefined });
  const tags = useTrendingTags();
  const vote = useVotePost();
  const repaw = useRepawPost();

  return (
    <FlatList
      data={explore.posts}
      keyExtractor={(p) => p.id}
      contentContainerClassName="px-4 pb-6"
      keyboardShouldPersistTaps="handled"
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (explore.hasNextPage && !explore.isFetchingNextPage) explore.fetchNextPage();
      }}
      refreshControl={<RefreshControl refreshing={explore.isRefetching && !explore.isFetchingNextPage} onRefresh={() => explore.refetch()} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View className="gap-3 pb-3">
          {(tags.data ?? []).length > 0 ? (
            <View>
              <Text className="mb-2 font-nunito-bold text-xs text-brand-muted">В ТРЕНДЕ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" keyboardShouldPersistTaps="handled">
                {(tags.data ?? []).map((t) => (
                  <Chip key={t.id} label={`#${t.name}`} selected={tag === t.name} onPress={() => onTagChange(tag === t.name ? '' : t.name)} />
                ))}
              </ScrollView>
            </View>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-2">
            {(Object.keys(SORT_LABEL) as ExploreSort[]).map((s) => (
              <Chip key={s} label={SORT_LABEL[s]} selected={sort === s} onPress={() => setSort(s)} />
            ))}
          </View>
          {sort === 'hot' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {EXPLORE_PERIODS.map((p) => (
                <Chip key={p} label={PERIOD_LABEL[p]} selected={period === p} onPress={() => setPeriod(p)} />
              ))}
            </ScrollView>
          ) : null}
          {tag ? (
            <View className="flex-row items-center gap-1">
              <Hash size={14} color={colors.accent} />
              <Text className="font-nunito-bold text-sm text-brand-offwhite">{tag}</Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <PostCard post={item} onVote={(value) => vote.mutate({ id: item.id, value })} onRepaw={() => repaw.mutate(item.id)} />
      )}
      ListEmptyComponent={
        explore.isLoading ? (
          <View className="gap-3">
            <Skeleton height={160} />
            <Skeleton height={160} />
          </View>
        ) : explore.isError ? (
          <ErrorState onRetry={() => explore.refetch()} />
        ) : (
          <EmptyState title="Ничего не найдено" hint={tag ? 'По этому тегу пока нет постов.' : 'Постов с медиа пока нет.'} />
        )
      }
      ListFooterComponent={explore.isFetchingNextPage ? <Skeleton height={80} className="mt-2" /> : null}
    />
  );
}
