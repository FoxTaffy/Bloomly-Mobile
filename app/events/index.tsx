import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Bell, BellOff, ChevronLeft, MapPin, Search } from 'lucide-react-native';
import { CatalogEventCard, EVENT_TYPE_KEY } from '@/components/CatalogEventCard';
import { Button, Chip, EmptyState, ErrorState, Field, Screen, Sheet, Skeleton } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCitySubscribe, useCitySubscriptions, useEventCatalog, useEventFacets } from '@/hooks/useEvents';
import { useT } from '@/hooks/useT';
import { activeFilterCount, CATALOG_SCOPES, DATE_PRESETS, defaultFilters, EVENT_TYPES, type CatalogEvent, type EventFilters } from '@/shared/events';
import type { MessageKey } from '@/shared/i18n';
import { colors } from '@/theme/tokens';

const SCOPE_KEY: Record<(typeof CATALOG_SCOPES)[number], MessageKey> = { upcoming: 'mEvScopeUpcoming', past: 'mEvScopePast', cancelled: 'mEvScopeCancelled' };
const PRESET_KEY: Record<(typeof DATE_PRESETS)[number], MessageKey> = { any: 'mEvDateAny', today: 'mEvToday', week: 'mEvDateWeek', month: 'mEvDateMonth' };

/** Каталог мероприятий (веб: views/EventsCatalogView.vue): список с фильтрами и подпиской на город. Карта и подача событий — только веб. */
export default function EventsCatalogScreen() {
  const { t } = useT();
  const router = useRouter();
  const [filters, setFilters] = useState<EventFilters>(defaultFilters());
  const [text, setText] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const q = useDebouncedValue(text.trim(), 350);
  const applied = useMemo(() => ({ ...filters, q }), [filters, q]);
  const catalog = useEventCatalog(applied);
  const facets = useEventFacets();
  const subs = useCitySubscriptions();
  const { add, remove } = useCitySubscribe();

  const set = <K extends keyof EventFilters>(k: K, v: EventFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const filtered = activeFilterCount(filters) > 0 || !!q;
  const mySub = filters.city ? (subs.data ?? []).find((s) => s.city === filters.city && (!filters.country || s.country_code === filters.country)) : undefined;
  const cityCountry = filters.country || facets.data?.cities.find((c) => c.city === filters.city)?.country_code || '';

  const header = (
    <View className="gap-3 pb-3">
      <Field value={text} onChangeText={setText} placeholder={t('mEvSearch')} icon={<Search size={16} color={colors.mutedIcon} />} maxLength={100} autoCapitalize="none" autoCorrect={false} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={CATALOG_SCOPES} keyExtractor={(x) => x} contentContainerClassName="gap-2" renderItem={({ item }) => <Chip label={t(SCOPE_KEY[item])} selected={filters.scope === item} onPress={() => set('scope', item)} />} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={['', ...EVENT_TYPES] as const}
        keyExtractor={(x) => x || 'all'}
        contentContainerClassName="gap-2"
        renderItem={({ item }) => <Chip label={item ? t(EVENT_TYPE_KEY[item]) : t('mEvAllTypes')} selected={filters.type === item} onPress={() => set('type', item)} />}
      />
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={DATE_PRESETS} keyExtractor={(x) => x} contentContainerClassName="gap-2" renderItem={({ item }) => <Chip label={t(PRESET_KEY[item])} selected={filters.datePreset === item} onPress={() => set('datePreset', item)} />} />
      <View className="flex-row flex-wrap items-center gap-2">
        <Chip label={filters.city ? filters.city : t('mEvAllCities')} selected={!!filters.city} onPress={() => setCityOpen(true)} />
        <Chip label={t('mEvVerifiedOrg')} selected={filters.verified} onPress={() => set('verified', !filters.verified)} />
        {filters.city && cityCountry ? (
          <Pressable
            onPress={() => (mySub ? remove.mutate(mySub.id) : add.mutate({ country: cityCountry, city: filters.city }))}
            disabled={add.isPending || remove.isPending}
            accessibilityRole="button"
            accessibilityState={{ selected: !!mySub }}
            className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-brand-border bg-brand-card px-3 active:opacity-80"
          >
            {mySub ? <Bell size={14} color={colors.accent} fill={colors.accent} /> : <BellOff size={14} color={colors.offwhite} />}
            <Text className="font-nunito-bold text-xs text-brand-offwhite">{mySub ? t('mEvCityUnsubscribe') : t('mEvCitySubscribe')}</Text>
          </Pressable>
        ) : null}
        {filtered ? <Chip label={t('mEvReset')} onPress={() => { setFilters(defaultFilters()); setText(''); }} /> : null}
      </View>
      {catalog.total > 0 ? <Text className="font-nunito text-xs text-brand-muted">{t('mEvFound', { n: catalog.total })}</Text> : null}
      {add.isError || remove.isError ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
    </View>
  );

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mEvTitle')}</Text>
      </View>

      <FlashList<CatalogEvent>
        data={catalog.events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={header}
        onEndReachedThreshold={0.6}
        onEndReached={() => catalog.hasNextPage && !catalog.isFetchingNextPage && catalog.fetchNextPage()}
        renderItem={({ item }) => <CatalogEventCard event={item} onPress={() => router.push(`/events/${item.slug || item.id}`)} />}
        ListEmptyComponent={
          catalog.isLoading ? (
            <View className="gap-3"><Skeleton height={200} /><Skeleton height={200} /></View>
          ) : catalog.isError ? (
            <ErrorState title={t('mEvLoadError')} onRetry={() => catalog.refetch()} />
          ) : (
            <EmptyState title={filtered ? t('mEvEmptyFiltered') : filters.scope === 'past' ? t('mEvEmptyPast') : filters.scope === 'cancelled' ? t('mEvEmptyCancelled') : t('mEvEmptyUpcoming')} />
          )
        }
        ListFooterComponent={catalog.isFetchingNextPage ? <Skeleton height={120} className="mt-2" /> : null}
      />

      <Sheet visible={cityOpen} title={t('mEvCity')} onClose={() => setCityOpen(false)}>
        <View className="max-h-96 pb-2">
          {filters.city ? <Button title={t('mEvAllCities')} variant="secondary" className="mb-2" onPress={() => { setFilters((f) => ({ ...f, city: '', country: '' })); setCityOpen(false); }} /> : null}
          <FlatList
            data={(facets.data?.cities ?? []).slice(0, 80)}
            keyExtractor={(c) => `${c.country_code}:${c.city}`}
            ListEmptyComponent={<Text className="py-4 text-center font-nunito text-sm text-brand-muted">{t('mEvNoCities')}</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => { setFilters((f) => ({ ...f, city: item.city, country: item.country_code ?? '' })); setCityOpen(false); }} accessibilityRole="button" className="flex-row items-center gap-3 py-2.5 active:opacity-70">
                <MapPin size={16} color={colors.mutedIcon} />
                <Text className="flex-1 font-nunito-bold text-brand-offwhite">{item.city}</Text>
                <Text className="font-nunito text-xs text-brand-muted">{item.count}</Text>
              </Pressable>
            )}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
