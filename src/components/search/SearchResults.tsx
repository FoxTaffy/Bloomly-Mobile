import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Hash } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GroupRow } from '@/components/GroupRow';
import { PostCard } from '@/components/PostCard';
import { UserRow } from '@/components/UserRow';
import { Card, Chip, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useRepawPost, useVotePost } from '@/hooks/usePosts';
import { useSearchGroups, useSearchPosts, useSearchTags, useSearchUsers } from '@/hooks/useSearch';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/shared/i18n';

type Tab = 'posts' | 'people' | 'groups' | 'tags';
const TABS: { id: Tab; label: MessageKey }[] = [
  { id: 'posts', label: 'postsTab' },
  { id: 'people', label: 'headerSearchPeople' },
  { id: 'groups', label: 'groups' },
  { id: 'tags', label: 'headerSearchTags' },
];

interface Props {
  query: string;
  /** Выбор тега переводит на обзор с фильтром (web: клик по тегу в SearchView). */
  onPickTag: (tag: string) => void;
}

function Placeholder({ loading, error, onRetry, emptyHint }: { loading: boolean; error: boolean; onRetry: () => void; emptyHint: string }) {
  const { t } = useT();
  if (loading) return <View className="gap-3"><Skeleton height={64} /><Skeleton height={64} /><Skeleton height={64} /></View>;
  if (error) return <ErrorState onRetry={onRetry} />;
  return <EmptyState title={t('convNothingFound')} hint={emptyHint} />;
}

export function SearchResults({ query, onPickTag }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('posts');
  const posts = useSearchPosts(query);
  const users = useSearchUsers(query);
  const groups = useSearchGroups(query);
  const tags = useSearchTags(query);
  const vote = useVotePost();
  const repaw = useRepawPost();

  const header = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 pb-3" keyboardShouldPersistTaps="handled">
      {TABS.map((x) => (
        <Chip key={x.id} label={t(x.label)} selected={tab === x.id} onPress={() => setTab(x.id)} />
      ))}
    </ScrollView>
  );

  const common = { contentContainerStyle: { paddingHorizontal: 16, paddingBottom: 24 }, keyboardShouldPersistTaps: 'handled' as const, onEndReachedThreshold: 0.6 };
  const more = (q: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }) => () => {
    if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
  };

  return (
    <View className="flex-1">
      {header}
      {tab === 'posts' ? (
        <FlashList
          {...common}
          data={posts.items}
          keyExtractor={(p) => p.id}
          onEndReached={more(posts)}
          renderItem={({ item }) => <PostCard post={item} onVote={(value) => vote.mutate({ id: item.id, value })} onRepaw={() => repaw.mutate(item.id)} />}
          ListEmptyComponent={<Placeholder loading={posts.isLoading} error={posts.isError} onRetry={() => posts.refetch()} emptyHint={t('mTryOtherQuery')} />}
        />
      ) : tab === 'people' ? (
        <FlashList
          {...common}
          data={users.items}
          keyExtractor={(u) => u.id}
          onEndReached={more(users)}
          renderItem={({ item }) => <UserRow user={item} />}
          ListEmptyComponent={<Placeholder loading={users.isLoading} error={users.isError} onRetry={() => users.refetch()} emptyHint={t('mNoPeopleFound')} />}
        />
      ) : tab === 'groups' ? (
        <FlashList
          {...common}
          data={groups.items}
          keyExtractor={(g) => g.id}
          onEndReached={more(groups)}
          renderItem={({ item }) => <GroupRow group={item} onPress={() => router.push(`/groups/${item.id}`)} />}
          ListEmptyComponent={<Placeholder loading={groups.isLoading} error={groups.isError} onRetry={() => groups.refetch()} emptyHint={t('mNoGroupsFound')} />}
        />
      ) : (
        <FlashList
          {...common}
          data={tags.data ?? []}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Card padding="sm" className="mb-2 flex-row items-center justify-between" onPress={() => onPickTag(item.name)}>
              <View className="flex-row items-center gap-2">
                <Hash size={16} color={colors.accent} />
                <Text className="font-nunito-bold text-brand-offwhite">{item.name}</Text>
              </View>
              <Text className="font-nunito text-xs text-brand-muted">{item.count} {t('mPostsLabel')}</Text>
            </Card>
          )}
          ListEmptyComponent={<Placeholder loading={tags.isLoading} error={tags.isError} onRetry={() => tags.refetch()} emptyHint={t('mNoTagsFound')} />}
        />
      )}
    </View>
  );
}
