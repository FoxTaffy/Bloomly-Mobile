import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Hash } from 'lucide-react-native';
import { PostCard } from '@/components/PostCard';
import { Chip, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { useExplorePosts, useTrendingTags } from '@/hooks/usePosts';
import { EXPLORE_PERIODS, type ExplorePeriod, type ExploreSort } from '@/shared/feed';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/shared/i18n';

const SORT_KEY: Record<ExploreSort, MessageKey> = { hot: 'trending', new: 'exploreSortNew' };
const PERIOD_KEY: Record<ExplorePeriod, MessageKey> = { day: 'mPeriodDay', week: 'mPeriodWeek', month: 'mPeriodMonth', all: 'explorePeriodAll' };

const LIST_PADDING = { paddingHorizontal: 16, paddingBottom: 24 };

/** Обзор (web: views/ExploreView.vue + composables/useExploreFeed.ts): тренды, сортировка, период, тег. */
export function ExploreFeed({ tag, onTagChange }: { tag: string; onTagChange: (tag: string) => void }) {
  const { t } = useT();
  const [sort, setSort] = useState<ExploreSort>('hot');
  const [period, setPeriod] = useState<ExplorePeriod>('all');

  const explore = useExplorePosts({ sort, period, tag: tag || undefined });
  const tags = useTrendingTags();
  const viewable = useViewableIds();

  return (
    <PostVisibilityProvider value={viewable.ids}>
    <FlashList
      {...viewable.props}
      data={explore.posts}
      keyExtractor={(p) => p.id}
      contentContainerStyle={LIST_PADDING}
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
              <Text className="mb-2 font-nunito-bold text-xs text-brand-muted">{t('mTrendingCaps')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" keyboardShouldPersistTaps="handled">
                {(tags.data ?? []).map((t) => (
                  <Chip key={t.id} label={`#${t.name}`} selected={tag === t.name} onPress={() => onTagChange(tag === t.name ? '' : t.name)} />
                ))}
              </ScrollView>
            </View>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-2">
            {(Object.keys(SORT_KEY) as ExploreSort[]).map((s) => (
              <Chip key={s} label={t(SORT_KEY[s])} selected={sort === s} onPress={() => setSort(s)} />
            ))}
          </View>
          {sort === 'hot' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {EXPLORE_PERIODS.map((p) => (
                <Chip key={p} label={t(PERIOD_KEY[p])} selected={period === p} onPress={() => setPeriod(p)} />
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
        <PostCard post={item} />
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
          <EmptyState title={t('convNothingFound')} hint={tag ? t('mNoPostsForTag') : t('mNoMediaPostsHint')} />
        )
      }
      ListFooterComponent={explore.isFetchingNextPage ? <Skeleton height={80} className="mt-2" /> : null}
    />
    </PostVisibilityProvider>
  );
}
