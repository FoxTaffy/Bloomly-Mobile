import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { NotificationRow, type Decision } from '@/components/NotificationRow';
import { Chip, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { NOTIF_REFRESH_MS, useNotificationActions, useNotifications } from '@/hooks/useNotifications';
import { useT } from '@/hooks/useT';
import { buildSections, inTab, NOTIF_TABS, notifTarget, type NotifItem } from '@/shared/notifications';
import { colors } from '@/theme/tokens';

type Row = { kind: 'header'; key: string; title: string } | { kind: 'item'; key: string; item: NotifItem };

/** Уведомления. Веб-аналог: views/NotificationsView.vue + lib/notifications.ts. */
export default function NotificationsScreen() {
  const { t } = useT();
  const router = useRouter();
  const query = useNotifications();
  const { markRead, accept, decline, remove, restore } = useNotificationActions();
  // «Отменить» после удаления: ровно то, что удалил сервер (web: undoToast)
  const [undo, setUndo] = useState<{ ids: string[]; text: string } | null>(null);
  const [tabId, setTabId] = useState('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const tab = NOTIF_TABS.find((x) => x.id === tabId) ?? NOTIF_TABS[0];
  const unreadByTab = useMemo(
    () => Object.fromEntries(NOTIF_TABS.map((x) => [x.id, query.items.filter((i) => i.unread && inTab(x, i)).length])),
    [query.items],
  );
  const sections = useMemo(
    () => buildSections(query.items.filter((i) => inTab(tab, i) && (!onlyUnread || i.unread))).map((s) => ({ ...s, title: t(s.titleKey), data: s.items })),
    [query.items, tab, onlyUnread, t],
  );

  // FlashList без секций: заголовки — отдельные строки списка, липкие через stickyHeaderIndices
  const rows = useMemo<Row[]>(() => sections.flatMap((s) => [{ kind: 'header' as const, key: `h:${s.key}`, title: s.title }, ...s.data.map((item) => ({ kind: 'item' as const, key: item.id, item }))]), [sections]);
  const stickyIndices = useMemo(() => rows.flatMap((r, i) => (r.kind === 'header' ? [i] : [])), [rows]);

  // Лента обновляется сама: раз в полминуты, пока экран открыт и приложение на переднем плане (web: REFRESH_MS)
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') void query.refetch();
      }, NOTIF_REFRESH_MS);
      return () => clearInterval(timer);
      // refetch стабилен по смыслу: интервал не должен пересоздаваться на каждый ответ
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  const removeItems = (ids: string[] | undefined, text: string) =>
    remove.mutate(ids, { onSuccess: (deleted) => deleted.length && setUndo({ ids: deleted, text }) });
  const clearAll = () =>
    Alert.alert(t('notifDeleteAllAria'), t('mDeleteHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('notifDeleteAll'), style: 'destructive', onPress: () => removeItems(undefined, t('mNotifAllDeleted')) },
    ]);

  const open = (item: NotifItem) => {
    if (item.unread) markRead.mutate(item.members.filter((m) => !m.is_read).map((m) => m.id));
    const target = notifTarget(item);
    if (target) router.push(target as Href);
  };

  const decide = (item: NotifItem, yes: boolean) => {
    const refId = item.notif.ref_id;
    if (!refId) return;
    (yes ? accept : decline).mutate(refId, { onSuccess: () => setDecisions((d) => ({ ...d, [item.id]: yes ? 'accepted' : 'declined' })) });
    if (item.unread) markRead.mutate(item.members.map((m) => m.id));
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
            <ChevronLeft size={18} color={colors.offwhite} />
          </Pressable>
          <View>
            <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('notificationsMenuItem')}</Text>
            <Text className="font-nunito text-xs text-brand-muted">{query.unreadTotal > 0 ? t('notifUnreadCount', { n: query.unreadTotal }) : t('notifAllRead')}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-4">
        <Pressable onPress={clearAll} disabled={query.items.length === 0} accessibilityRole="button" accessibilityLabel={t('notifDeleteAllAria')} hitSlop={8} className={query.items.length === 0 ? 'opacity-40' : ''}>
          <Trash2 size={18} color={colors.mutedIcon} />
        </Pressable>
        <Pressable onPress={() => markRead.mutate(undefined)} disabled={query.unreadTotal === 0} accessibilityRole="button" hitSlop={8} className={query.unreadTotal === 0 ? 'opacity-40' : ''}>
          <Text className="font-nunito-bold text-brand-accent">{t('notifHeaderMarkAll')}</Text>
        </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 grow-0" contentContainerClassName="gap-2 px-4 pb-2" accessibilityRole="tablist">
        {NOTIF_TABS.map((x) => (
          <Chip key={x.id} label={unreadByTab[x.id] ? `${t(x.labelKey)} · ${unreadByTab[x.id]}` : t(x.labelKey)} selected={tabId === x.id} onPress={() => setTabId(x.id)} />
        ))}
        <Chip label={t('mOnlyUnread')} selected={onlyUnread} onPress={() => setOnlyUnread((v) => !v)} />
      </ScrollView>

      <FlashList<Row>
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.kind}
        stickyHeaderIndices={stickyIndices}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.accent} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        renderItem={({ item: row }) =>
          row.kind === 'header' ? (
            <Text className="bg-brand-bg px-4 pb-2 pt-4 font-nunito-bold text-xs text-brand-muted">{row.title}</Text>
          ) : (
            <NotificationRow item={row.item} decision={decisions[row.item.id]} onPress={() => open(row.item)} onAccept={() => decide(row.item, true)} onDelete={() => removeItems(row.item.members.map((m) => m.id), row.item.members.length > 1 ? t('mNotifsDeleted') : t('mNotifDeleted'))} onDecline={() => decide(row.item, false)} />
          )
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View className="gap-3 px-4 pt-3">
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </View>
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : (
            <EmptyState title={t(onlyUnread ? 'notifEmptyUnread' : tab.emptyKey)} />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <Skeleton height={56} className="mx-4 mt-2" /> : null}
      />
      {undo ? (
        <View className="absolute inset-x-4 bottom-6 flex-row items-center justify-between rounded-2xl border border-brand-border bg-brand-card px-4 py-3">
          <Text className="flex-1 font-nunito text-sm text-brand-offwhite">{undo.text}</Text>
          <Pressable
            onPress={() => {
              restore.mutate(undo.ids);
              setUndo(null);
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text className="font-nunito-bold text-sm text-brand-accent-minus">{t('bookmarksUndo')}</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
