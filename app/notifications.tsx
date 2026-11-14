import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { useNotificationActions, useNotifications } from '@/hooks/useNotifications';
import { NotificationRow } from '@/components/NotificationRow';
import { colors } from '@/theme/tokens';

const LAST_SEEN_KEY = 'bloomly_notifications_last_seen';

export default function NotificationsScreen() {
  const router = useRouter();
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const notificationsQuery = useNotifications();
  const { markRead: markReadMutation, accept: acceptMutation, decline: declineMutation } = useNotificationActions();

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then(setLastSeen);
    return () => {
      AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    };
  }, []);

  const sections = useMemo(() => {
    const items = notificationsQuery.data ?? [];
    const cutoff = lastSeen ? new Date(lastSeen).getTime() : Date.now();
    const fresh = items.filter((n) => new Date(n.created_at).getTime() > cutoff);
    const seen = items.filter((n) => new Date(n.created_at).getTime() <= cutoff);
    return [
      ...(fresh.length ? [{ title: 'НОВЫЕ', data: fresh }] : []),
      ...(seen.length ? [{ title: 'ПРОСМОТРЕННЫЕ', data: seen }] : []),
    ];
  }, [notificationsQuery.data, lastSeen]);

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
            <ChevronLeft size={18} color={colors.offwhite} />
          </Pressable>
          <Text className="text-2xl font-extrabold text-brand-offwhite">Уведомления</Text>
        </View>
        <Pressable onPress={() => markReadMutation.mutate()}>
          <Text className="font-semibold text-brand-accent">Прочитать всё</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text className="bg-brand-bg px-4 pb-2 pt-4 text-xs font-semibold text-brand-muted">{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onAccept={() => item.ref_id && acceptMutation.mutate(item.ref_id)}
            onDecline={() => item.ref_id && declineMutation.mutate(item.ref_id)}
          />
        )}
        ListEmptyComponent={
          notificationsQuery.isLoading ? null : <Text className="mt-10 text-center text-brand-muted">Пока пусто</Text>
        }
      />
    </Screen>
  );
}
