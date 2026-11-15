import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, MapPin } from 'lucide-react-native';
import { useT } from '@/hooks/useT';
import type { MessageKey } from '@/shared/i18n';
import { eventTiming, formatEventWhen, formatPrice, placeLine, type CatalogEvent, type Timing } from '@/shared/events';
import { colors } from '@/theme/tokens';

/** Текст «Сегодня / Завтра / Через N дн. / Идёт сейчас / Завершено / Отменено» (web: eventTiming). */
export function useTimingLabel() {
  const { t } = useT();
  return (timing: Timing): string => (timing.key === 'inDays' ? t('mEvInDays', { n: timing.n }) : t(({ today: 'mEvToday', tomorrow: 'mEvTomorrow', ongoing: 'mEvOngoing', finished: 'mEvFinished', cancelled: 'mEvCancelled' } as const)[timing.key]));
}

export const EVENT_TYPE_KEY: Record<string, MessageKey> = {
  convention: 'mEvTypeConvention', meetup: 'mEvTypeMeetup', fursuit_walk: 'mEvTypeFursuitWalk', party: 'mEvTypeParty', festival: 'mEvTypeFestival',
  market: 'mEvTypeMarket', workshop: 'mEvTypeWorkshop', charity: 'mEvTypeCharity', online: 'mEvTypeOnline', other: 'mEvTypeOther',
};

/** Карточка мероприятия каталога (веб: components/events/EventCatalogCard.vue). */
export function CatalogEventCard({ event, onPress }: { event: CatalogEvent; onPress: () => void }) {
  const { t, locale } = useT();
  const timingLabel = useTimingLabel();
  const when = formatEventWhen(event, locale);
  const place = placeLine(event, locale, { online: t('mEvOnline'), andOnline: t('mEvAndOnline'), onlineHybrid: t('mEvOnlineHybrid') });
  const timing = eventTiming(event);
  const muted = event.publication_status === 'cancelled' || event.publication_status === 'finished';
  const price = event.price_from ? (event.price_from.amount === 0 ? t('mEvFree') : t('mEvPriceFrom', { price: formatPrice(event.price_from.amount, event.price_from.currency, locale) })) : null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="mb-4 overflow-hidden rounded-2xl border border-brand-border bg-brand-card active:opacity-90">
      <View className="h-32">
        {event.banner_url ? (
          <Image source={{ uri: event.banner_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={[colors.accent, colors.purple]} style={{ width: '100%', height: '100%' }} />
        )}
        <View className="absolute left-3 top-3 flex-row gap-1.5">
          <Text className={`rounded-full px-2.5 py-1 font-nunito-bold text-xs ${muted ? 'bg-black/60 text-brand-offwhite' : 'bg-brand-accent text-brand-offwhite'}`}>{timingLabel(timing)}</Text>
          {event.min_age ? <Text className="rounded-full bg-black/60 px-2.5 py-1 font-nunito-bold text-xs text-brand-offwhite">{event.min_age}+</Text> : null}
        </View>
      </View>
      <View className="gap-1.5 p-4">
        {event.event_type ? <Text className="font-nunito-bold text-xs text-brand-accent-minus">{t(EVENT_TYPE_KEY[event.event_type] ?? 'mEvTypeOther')}</Text> : null}
        <Text numberOfLines={2} className="font-nunito-extrabold text-lg text-brand-offwhite">{event.title}</Text>
        <View className="flex-row items-center gap-2">
          <CalendarDays size={14} color={colors.mutedIcon} />
          <Text className="flex-1 font-nunito text-sm text-brand-muted">{when.dates}{when.time ? ` · ${when.time}` : ''}</Text>
        </View>
        {place ? (
          <View className="flex-row items-center gap-2">
            <MapPin size={14} color={colors.mutedIcon} />
            <Text numberOfLines={1} className="flex-1 font-nunito text-sm text-brand-muted">{place}</Text>
          </View>
        ) : null}
        {price || event.tickets_sold_out ? (
          <Text className="font-nunito-bold text-sm text-brand-offwhite">{event.tickets_sold_out ? t('mEvSoldOut') : price}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
