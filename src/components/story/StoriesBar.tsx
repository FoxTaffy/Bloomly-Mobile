import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/ui';
import { useStoryGroups } from '@/hooks/useStories';
import { useT } from '@/hooks/useT';
import type { Story } from '@/shared/api-types';
import { isGroupSeen } from '@/shared/stories';
import { useSeenStories } from '@/stores/seenStories';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

const ITEM_WIDTH = 68;

/** Ряд историй в шапке ленты (веб: components/StoriesBar.vue): «Добавить» и кольца авторов; просмотренные приглушены. */
export function StoriesBar() {
  const { t } = useT();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const { groups, isLoading } = useStoryGroups();
  const seen = useSeenStories((s) => s.seen);

  return (
    <FlatList<Story[]>
      horizontal
      showsHorizontalScrollIndicator={false}
      data={groups}
      keyExtractor={(g) => g[0].user.id}
      contentContainerClassName="gap-3 pb-4"
      ListHeaderComponent={
        <Pressable onPress={() => router.push('/create-story')} accessibilityRole="button" accessibilityLabel={t('mStoryAdd')} className="items-center gap-1.5 active:opacity-70" style={{ width: ITEM_WIDTH }}>
          <View>
            <View className="h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-dashed border-brand-muted">
              <Avatar uri={user?.avatar_url} name={user?.display_name ?? user?.username} size={50} />
            </View>
            <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full border-2 border-brand-bg bg-brand-accent">
              <Plus size={12} color={colors.offwhite} />
            </View>
          </View>
          <Text className="text-xs text-brand-muted">{t('story')}</Text>
        </Pressable>
      }
      ListEmptyComponent={isLoading ? <Skeleton height={60} width={60} /> : null}
      renderItem={({ item }) => {
        const author = item[0].user;
        const name = author.display_name ?? author.username;
        return (
          <Pressable onPress={() => router.push(`/stories/${author.id}`)} accessibilityRole="button" accessibilityLabel={t('mStoryOpen', { name })} className="items-center gap-1.5 active:opacity-70" style={{ width: ITEM_WIDTH }}>
            <Avatar uri={author.avatar_url} name={name} size={60} ring ringSeen={isGroupSeen(item, seen)} />
            <Text numberOfLines={1} className="w-full text-center text-xs text-brand-offwhite">{name}</Text>
          </Pressable>
        );
      }}
    />
  );
}
