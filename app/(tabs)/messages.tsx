import { useMemo, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { ConversationMenu } from '@/components/chat/ConversationMenu';
import { Chip, EmptyState, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import type { Conversation } from '@/shared/api-types';
import { compareConversations, conversationTitle, isArchived, otherUser } from '@/shared/chat';
import { useConversations } from '@/hooks/useConversations';
import { ConversationRow } from '@/components/ConversationRow';
import { colors } from '@/theme/tokens';
import { useSession } from '@/stores/session';
import { useT } from '@/hooks/useT';

export default function MessagesScreen() {
  const { t } = useT();
  const router = useRouter();
  const conversationsQuery = useConversations();
  const myId = useSession((s) => s.user?.id);
  const [search, setSearch] = useState('');

  const [archive, setArchive] = useState(false);
  const [menuFor, setMenuFor] = useState<Conversation | null>(null);

  // Поиск по названию диалога и имени собеседника (на клиенте); закреплённые вверху; архив — отдельным режимом (веб: ConversationList)
  const conversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = (conversationsQuery.data ?? []).filter((c) => isArchived(c) === archive).sort(compareConversations);
    if (!q) return all;
    return all.filter((c) => {
      const u = otherUser(c, myId);
      const title = c.is_group ? (c.name ?? '') : `${u?.display_name ?? ''} ${u?.username ?? ''}`;
      return title.toLowerCase().includes(q);
    });
  }, [conversationsQuery.data, search, myId, archive]);
  const archivedCount = (conversationsQuery.data ?? []).filter(isArchived).length;

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-2xl font-extrabold text-brand-offwhite">{t('messages')}</Text>
        <View className="flex-row items-center gap-2">
          {archivedCount > 0 || archive ? <Chip label={`${t('mChatArchive')}${archivedCount ? ` · ${archivedCount}` : ''}`} selected={archive} onPress={() => setArchive((v) => !v)} /> : null}
          <Pressable onPress={() => router.push('/messages/new')} accessibilityRole="button" accessibilityLabel={t('mNewChat')} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-brand-accent active:opacity-80">
            <Plus size={20} color={colors.offwhite} />
          </Pressable>
        </View>
      </View>

      <View className="mx-4 mb-2 mt-2">
        <Field value={search} onChangeText={setSearch} placeholder={t('mSearchDialogs')} icon={<Search size={16} color={colors.mutedIcon} />} autoCapitalize="none" autoCorrect={false} />
      </View>

      <FlashList
        data={conversations}
        keyExtractor={(c) => c.id}
        refreshing={conversationsQuery.isRefetching}
        onRefresh={() => conversationsQuery.refetch()}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={() => router.push(`/messages/${item.id}`)} onLongPress={() => setMenuFor(item)} />
        )}
        ListEmptyComponent={
          conversationsQuery.isLoading ? (
            <View className="gap-3 px-4">
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </View>
          ) : conversationsQuery.isError ? (
            <ErrorState onRetry={() => conversationsQuery.refetch()} />
          ) : (
            <EmptyState title={search.trim() ? t('convNothingFound') : t('mNoDialogs')} />
          )
        }
      />
      <ConversationMenu conversation={menuFor} title={menuFor ? conversationTitle(menuFor, myId, t('chatGroupFallbackName')) : ''} onClose={() => setMenuFor(null)} />
    </Screen>
  );
}
