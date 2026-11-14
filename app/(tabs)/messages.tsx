import { View, Text, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { useConversations } from '@/hooks/useConversations';
import { ConversationRow } from '@/components/ConversationRow';
import { colors } from '@/theme/tokens';

export default function MessagesScreen() {
  const router = useRouter();
  const conversationsQuery = useConversations();

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-2xl font-extrabold text-brand-offwhite">Сообщения</Text>
      </View>

      <View className="mx-4 mb-2 mt-2 flex-row items-center gap-2 rounded-2xl border border-brand-border bg-brand-card px-4 py-3">
        <Search size={16} color={colors.mutedIcon} />
        <TextInput placeholder="Поиск диалогов..." placeholderTextColor={colors.mutedIcon} className="flex-1 text-brand-offwhite" />
      </View>

      <FlatList
        data={conversationsQuery.data ?? []}
        keyExtractor={(c) => c.id}
        refreshing={conversationsQuery.isRefetching}
        onRefresh={() => conversationsQuery.refetch()}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={() => router.push(`/messages/${item.id}`)} />
        )}
        ListEmptyComponent={
          conversationsQuery.isLoading ? null : (
            <Text className="mt-10 text-center text-brand-muted">Пока нет диалогов</Text>
          )
        }
      />
    </Screen>
  );
}
