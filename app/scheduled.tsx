import { Alert, Pressable, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, CalendarClock, ChevronLeft, FileText } from 'lucide-react-native';
import { Button, Card, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useScheduled, useScheduledActions } from '@/hooks/useScheduled';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';
import type { SavedPost } from '@/api/scheduled';
import type { MessageKey } from '@/shared/i18n';
import { colors } from '@/theme/tokens';

const ORDER: SavedPost['status'][] = ['failed', 'scheduled', 'draft'];
const TITLE: Record<SavedPost['status'], MessageKey> = { failed: 'mSchedFailed', scheduled: 'mSchedScheduled', draft: 'mSchedDraft' };
const REPEAT: Record<string, MessageKey> = { daily: 'mSchedDaily', weekly: 'mSchedWeekly', monthly: 'mSchedMonthly' };

/** Черновики и отложенные посты (веб: ScheduledPostsList.vue). Правка отложенного — в вебе; здесь: опубликовать сейчас и удалить. */
export default function ScheduledScreen() {
  const { t } = useT();
  const router = useRouter();
  const query = useScheduled();
  const { remove, publishNow } = useScheduledActions();
  const sections = ORDER.map((status) => ({ status, data: (query.data ?? []).filter((p) => p.status === status) })).filter((s) => s.data.length > 0);
  const error = remove.isError ? apiErrorMessage(remove.error) ?? t('mSchedDeleteFailed') : publishNow.isError ? apiErrorMessage(publishNow.error) ?? t('mSchedPublishFailed') : null;

  const confirmDelete = (p: SavedPost) =>
    Alert.alert(t('mSchedDeleteTitle'), t('mDeleteHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('mDelete'), style: 'destructive', onPress: () => remove.mutate(p.id) },
    ]);

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mSchedTitle')}</Text>
      </View>
      {error ? <Text className="px-4 pb-2 font-nunito-bold text-xs text-brand-error">{error}</Text> : null}
      <SectionList<SavedPost>
        sections={sections}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-4 pb-8"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          const Icon = section.status === 'failed' ? AlertTriangle : section.status === 'scheduled' ? CalendarClock : FileText;
          return (
            <View className="mb-2 mt-4 flex-row items-center gap-2">
              <Icon size={14} color={section.status === 'failed' ? colors.error : colors.mutedIcon} />
              <Text className="font-nunito-bold text-xs text-brand-muted">{t(TITLE[section.status as SavedPost['status']]).toUpperCase()} · {section.data.length}</Text>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <Card className="mb-3 gap-2">
            {item.group ? <Text className="font-nunito-bold text-xs text-brand-accent-minus">{item.group.name}</Text> : null}
            <Text numberOfLines={3} className="font-nunito leading-5 text-brand-offwhite">{item.content || (item.media_urls.length ? t('mAttachment') : '')}</Text>
            {item.status === 'scheduled' && item.scheduled_at ? (
              <Text className="font-nunito-bold text-xs text-brand-muted">
                {new Date(item.scheduled_at).toLocaleString([], { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                {item.repeat_interval ? ` · ${t(REPEAT[item.repeat_interval])}` : ''}
              </Text>
            ) : null}
            {item.status === 'failed' && item.last_error ? <Text className="font-nunito text-xs text-brand-error">{item.last_error}</Text> : null}
            <View className="flex-row gap-2">
              <Button title={t('mSchedPublishNow')} variant="secondary" className="flex-1" loading={publishNow.isPending && publishNow.variables === item.id} onPress={() => publishNow.mutate(item.id)} />
              <Button title={t('mDelete')} variant="secondary" loading={remove.isPending && remove.variables === item.id} onPress={() => confirmDelete(item)} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="gap-3 pt-3"><Skeleton height={96} /><Skeleton height={96} /></View>
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : (
            <EmptyState title={t('mSchedEmpty')} hint={t('mSchedEmptyHint')} />
          )
        }
      />
    </Screen>
  );
}
