import { useMemo, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { EmptyState, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
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

  // Поиск по названию диалога и имени собеседника (на клиенте, как список диалогов на вебе)
  const conversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = conversationsQuery.data ?? [];
    if (!q) return all;
    return all.filter((c) => {
      const other = c.is_group ? null : c.participants.find((p) => p.id !== myId) ?? c.participants[0];
      const title = c.is_group ? c.name ?? '' : `${other?.display_name ?? ''} ${other?.username ?? ''}`;
      return title.toLowerCase().includes(q);
    });
  }, [conversationsQuery.data, search, myId]);

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-2xl font-extrabold text-brand-offwhite">{t('messages')}</Text>
      </View>

      <View className="mx-4 mb-2 mt-2">
        <Field value={search} onChangeText={setSearch} placeholder={t('mSearchDialogs')} icon={<Search size={16} color={colors.mutedIcon} />} autoCapitalize="none" autoCorrect={false} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        refreshing={conversationsQuery.isRefetching}
        onRefresh={() => conversationsQuery.refetch()}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={() => router.push(`/messages/${item.id}`)} />
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
    </Screen>
  );
}
