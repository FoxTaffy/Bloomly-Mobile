import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { GroupRow } from '@/components/GroupRow';
import { PostCard } from '@/components/PostCard';
import { UserRow } from '@/components/UserRow';
import { Chip, EmptyState, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { useBookmarkedGroups, useBookmarkedPosts, useBookmarkedUsers, useRemoveBookmark } from '@/hooks/useBookmarks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PostVisibilityProvider, useViewableIds } from '@/hooks/usePostVisibility';
import { useT } from '@/hooks/useT';
import type { BookmarkSort } from '@/api/bookmarks';
import type { Post } from '@/shared/api-types';
import { colors } from '@/theme/tokens';

type Tab = 'all' | 'media' | 'accounts' | 'groups';
const TABS: { key: Tab; label: 'tabAll' | 'tabMedia' | 'tabAccounts' | 'groups' }[] = [
  { key: 'all', label: 'tabAll' },
  { key: 'media', label: 'tabMedia' },
  { key: 'accounts', label: 'tabAccounts' },
  { key: 'groups', label: 'groups' },
];
const SORTS: { key: BookmarkSort; label: 'bookmarksSortNewest' | 'bookmarksSortOldest' | 'bookmarksSortTop' }[] = [
  { key: 'newest', label: 'bookmarksSortNewest' },
  { key: 'oldest', label: 'bookmarksSortOldest' },
  { key: 'top', label: 'bookmarksSortTop' },
];

/** Закладки: посты (все / с медиа), аккаунты, группы. Веб-аналог: views/BookmarksView.vue. Метки и массовые действия — позже. */
export default function BookmarksScreen() {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<BookmarkSort>('newest');
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 300);
  const isPosts = tab === 'all' || tab === 'media';

  const posts = useBookmarkedPosts({ sort, mediaOnly: tab === 'media', q, enabled: isPosts });
  const users = useBookmarkedUsers(tab === 'accounts');
  const groups = useBookmarkedGroups(tab === 'groups');
  const removeUser = useRemoveBookmark('users');
  const removeGroup = useRemoveBookmark('groups');
  const viewable = useViewableIds();

  const needle = text.trim().toLowerCase();
  const userItems = (users.data ?? []).filter((u) => !needle || `${u.display_name ?? ''} ${u.username}`.toLowerCase().includes(needle));
  const groupItems = (groups.data ?? []).filter((g) => !needle || g.name.toLowerCase().includes(needle));

  const header = (
    <View className="gap-3 pb-3">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TABS}
        keyExtractor={(x) => x.key}
        contentContainerClassName="gap-2"
        accessibilityRole="tablist"
        renderItem={({ item }) => <Chip label={t(item.label)} selected={tab === item.key} onPress={() => setTab(item.key)} />}
      />
      <Field value={text} onChangeText={setText} placeholder={t('searchPlaceholder')} icon={<Search size={16} color={colors.mutedIcon} />} maxLength={100} autoCapitalize="none" autoCorrect={false} />
      {isPosts ? (
        <View className="flex-row flex-wrap gap-2">
          {SORTS.map((x) => (
            <Chip key={x.key} label={t(x.label)} selected={sort === x.key} onPress={() => setSort(x.key)} />
          ))}
        </View>
      ) : null}
    </View>
  );

  const state = (loading: boolean, error: boolean, retry: () => void, emptyKey: 'bookmarksNoMedia' | 'bookmarksNothingFound' | 'mBookmarksEmpty') =>
    loading ? (
      <View className="gap-3"><Skeleton height={120} /><Skeleton height={120} /></View>
    ) : error ? (
      <ErrorState title={t('bookmarksLoadFailed')} onRetry={retry} />
    ) : (
      <EmptyState title={t(emptyKey)} />
    );

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('bookmarksPageTitle')}</Text>
      </View>

      {isPosts ? (
        <PostVisibilityProvider value={viewable.ids}>
          <FlashList<Post>
            {...viewable.props}
            data={posts.posts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ListHeaderComponent={header}
            onEndReachedThreshold={0.6}
            onEndReached={() => {
              if (posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage();
            }}
            renderItem={({ item }) => <PostCard post={item} />}
            ListEmptyComponent={state(posts.isLoading, posts.isError, () => posts.refetch(), q ? 'bookmarksNothingFound' : tab === 'media' ? 'bookmarksNoMedia' : 'mBookmarksEmpty')}
            ListFooterComponent={posts.isFetchingNextPage ? <Skeleton height={80} className="mt-2" /> : null}
          />
        </PostVisibilityProvider>
      ) : tab === 'accounts' ? (
        <FlatList
          data={userItems}
          keyExtractor={(u) => u.id}
          contentContainerClassName="px-4 pb-8"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-2">
              <View className="flex-1"><UserRow user={item} /></View>
              <RemoveButton onPress={() => removeUser.mutate(item.id)} />
            </View>
          )}
          ListEmptyComponent={state(users.isLoading, users.isError, () => users.refetch(), needle ? 'bookmarksNothingFound' : 'mBookmarksEmpty')}
        />
      ) : (
        <FlatList
          data={groupItems}
          keyExtractor={(g) => g.id}
          contentContainerClassName="px-4 pb-8"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-2">
              <View className="flex-1"><GroupRow group={item} onPress={() => router.push(`/groups/${item.id}`)} /></View>
              <RemoveButton onPress={() => removeGroup.mutate(item.id)} />
            </View>
          )}
          ListEmptyComponent={state(groups.isLoading, groups.isError, () => groups.refetch(), needle ? 'bookmarksNothingFound' : 'mBookmarksEmpty')}
        />
      )}
    </Screen>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('bookmarksLabelRemove')} className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-brand-card active:opacity-60">
      <X size={16} color={colors.mutedIcon} />
    </Pressable>
  );
}
