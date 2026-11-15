import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronLeft, Clock, Globe, MapPin, ShieldAlert, Ticket } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { EVENT_TYPE_KEY, useTimingLabel } from '@/components/CatalogEventCard';
import { DetailScreenState } from '@/components/DetailScreenState';
import { Button, Card, Screen } from '@/components/ui';
import { useEventAttendees, useMyRsvp, useToggleRsvp, type RsvpStatus } from '@/hooks/useEvent';
import { useEventDetail } from '@/hooks/useEvents';
import { useT } from '@/hooks/useT';
import type { GroupEvent } from '@/shared/api-types';
import { canRsvp, eventTiming, formatEventWhen, formatPrice, placeLine, type CatalogEventDetail } from '@/shared/events';
import { colors } from '@/theme/tokens';

/** Мероприятие. Веб-аналог: views/EventDetailView.vue — сначала каталог (/events/:id), иначе событие афиши группы. */
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEventDetail(id);
  const data = query.data;
  if (!data) return <DetailScreenState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;
  return data.kind === 'catalog' ? <CatalogEventView event={data.event} /> : <GroupEventView event={data.event} />;
}

function Banner({ url }: { url: string | null }) {
  const router = useRouter();
  return (
    <View className="relative">
      <LinearGradient colors={[colors.accent, colors.purple]} style={{ height: 180, width: '100%' }}>
        {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
      </LinearGradient>
      <Pressable onPress={() => router.back()} accessibilityRole="button" className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/40">
        <ChevronLeft size={18} color={colors.offwhite} />
      </Pressable>
    </View>
  );
}

/** «Иду / Возможно» (веб: setRsvp): повторное нажатие снимает отметку; ниже — кто идёт. */
function RsvpBlock({ id, attendeeCount, open }: { id: string; attendeeCount: number; open: boolean }) {
  const { t } = useT();
  const mine = useMyRsvp(id, open);
  const toggle = useToggleRsvp(id);
  const attendees = useEventAttendees(id);
  const current: RsvpStatus | null = mine.data?.status ?? null;
  const pick = (next: RsvpStatus) => toggle.mutate({ next, current });

  return (
    <View className="gap-3">
      {open ? (
        <View className="flex-row gap-2">
          <Button title={t('groupDetailGoBtn')} variant={current === 'going' ? 'primary' : 'secondary'} className="flex-1" loading={toggle.isPending} onPress={() => pick('going')} />
          <Button title={t('mMaybe')} variant={current === 'maybe' ? 'primary' : 'secondary'} className="flex-1" loading={toggle.isPending} onPress={() => pick('maybe')} />
        </View>
      ) : (
        <Text className="font-nunito text-xs text-brand-muted">{t('mEvRsvpClosed')}</Text>
      )}
      {toggle.isError ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
      <Text className="font-nunito-bold text-sm text-brand-muted">{t('mAttendeesCaps', { n: attendeeCount })}</Text>
      <View className="flex-row flex-wrap gap-3">
        {(attendees.data ?? []).map((a) => (
          <View key={a.user_id} className="items-center" style={{ width: 56 }}>
            <Avatar uri={a.user.avatar_url} name={a.user.display_name ?? a.user.username} size={44} />
            <Text numberOfLines={1} className="mt-1 w-full text-center text-[11px] text-brand-muted">{a.user.display_name ?? a.user.username}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CatalogEventView({ event }: { event: CatalogEventDetail }) {
  const { t, locale } = useT();
  const timingLabel = useTimingLabel();
  const when = formatEventWhen(event, locale);
  const place = placeLine(event, locale, { online: t('mEvOnline'), andOnline: t('mEvAndOnline'), onlineHybrid: t('mEvOnlineHybrid') });
  const timing = eventTiming(event);
  const site = event.website_url && /^https:\/\//i.test(event.website_url) ? event.website_url : null;
  const ageText = event.min_age === null ? t('mEvAgeUnknown') : event.min_age === 0 ? t('mEvAgeNone') : `${event.min_age}+`;

  return (
    <Screen>
      <ScrollView>
        <Banner url={event.banner_url} />
        <View className="gap-4 p-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="rounded-full bg-brand-accent px-3 py-1 font-nunito-bold text-xs text-brand-offwhite">{timingLabel(timing)}</Text>
            {event.event_type ? <Text className="rounded-full border border-brand-border px-3 py-1 font-nunito-bold text-xs text-brand-accent-minus">{t(EVENT_TYPE_KEY[event.event_type] ?? 'mEvTypeOther')}</Text> : null}
            {event.organizer_verified ? <Text className="rounded-full border border-brand-border px-3 py-1 font-nunito-bold text-xs text-brand-success">{t('mEvVerifiedOrg')}</Text> : null}
          </View>
          <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{event.title}</Text>
          {event.publication_status === 'cancelled' ? (
            <View className="flex-row items-start gap-2 rounded-2xl border border-brand-error/40 bg-brand-card p-3">
              <ShieldAlert size={16} color={colors.error} />
              <Text className="flex-1 font-nunito text-sm text-brand-offwhite">{event.status_reason ? `${t('mEvCancelled')}: ${event.status_reason}` : t('mEvCancelled')}</Text>
            </View>
          ) : null}

          <View className="gap-2">
            <View className="flex-row items-start gap-2">
              <Calendar size={16} color={colors.mutedIcon} />
              <View className="flex-1">
                <Text className="font-nunito-bold text-brand-offwhite">{when.dates}</Text>
                {when.time ? <Text className="font-nunito text-sm text-brand-muted">{when.time}{when.zone ? ` · ${when.zone}` : ''}</Text> : <Text className="font-nunito text-sm text-brand-muted">{when.unknown === 'review' ? t('mEvTimeReview') : t('mEvTimeNone')}</Text>}
              </View>
            </View>
            {place || event.location_name || event.address ? (
              <View className="flex-row items-start gap-2">
                <MapPin size={16} color={colors.mutedIcon} />
                <View className="flex-1">
                  {event.location_name ? <Text className="font-nunito-bold text-brand-offwhite">{event.location_name}</Text> : null}
                  {event.address ? <Text className="font-nunito text-sm text-brand-muted">{event.address}</Text> : null}
                  {place ? <Text className="font-nunito text-sm text-brand-muted">{place}</Text> : null}
                </View>
              </View>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Clock size={16} color={colors.mutedIcon} />
              <Text className="font-nunito text-sm text-brand-muted">{t('mEvAge')}: {event.age_rules ?? ageText}</Text>
            </View>
          </View>

          {event.description || event.short_description ? <Text className="font-nunito leading-5 text-brand-offwhite">{event.description ?? event.short_description}</Text> : null}

          {event.schedule?.length ? (
            <Card className="gap-2">
              <Text className="font-nunito-extrabold text-brand-offwhite">{t('mEvSchedule')}</Text>
              {event.schedule.map((s, i) => (
                <View key={`${s.time}${i}`} className="flex-row gap-3">
                  <Text className="w-14 font-nunito-bold text-sm text-brand-accent-minus">{s.time}</Text>
                  <Text className="flex-1 font-nunito text-sm text-brand-offwhite">{s.label}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {event.what_to_bring?.length ? (
            <Card className="gap-1">
              <Text className="font-nunito-extrabold text-brand-offwhite">{t('mEvWhatToBring')}</Text>
              {event.what_to_bring.map((x, i) => <Text key={`${x}${i}`} className="font-nunito text-sm text-brand-offwhite">• {x}</Text>)}
            </Card>
          ) : null}

          {/* Цены — только справка со слов организатора: покупки и ссылок на оплату в приложении нет */}
          <Card className="gap-2">
            <View className="flex-row items-center gap-2">
              <Ticket size={16} color={colors.accentMinus} />
              <Text className="font-nunito-extrabold text-brand-offwhite">{t('mEvPrices')}</Text>
            </View>
            {event.tickets_sold_out ? <Text className="font-nunito-bold text-sm text-brand-error">{t('mEvSoldOut')}</Text> : null}
            {event.prices.length === 0 ? (
              <Text className="font-nunito text-sm text-brand-muted">{t('mEvPriceNone')}</Text>
            ) : (
              event.prices.map((p, i) => (
                <View key={`${p.name}${i}`} className="flex-row justify-between gap-3">
                  <Text className="flex-1 font-nunito text-sm text-brand-offwhite">{p.name}</Text>
                  <Text className="font-nunito-bold text-sm text-brand-offwhite">{p.price === 0 ? t('mEvFree') : formatPrice(p.price, p.currency, locale)}</Text>
                </View>
              ))
            )}
            {event.prices_note ? <Text className="font-nunito text-xs text-brand-muted">{event.prices_note}</Text> : null}
            <Text className="font-nunito text-xs text-brand-muted">{t('mEvPriceHint')}</Text>
          </Card>

          {event.organizer ? <Text className="font-nunito text-sm text-brand-muted">{t('mEvOrganizer')}: {event.organizer.name}</Text> : null}
          {site ? (
            <Button title={t('mEvWebsite')} variant="secondary" onPress={() => void Linking.openURL(site).catch(() => {})} />
          ) : null}
          {site ? (
            <View className="-mt-2 flex-row items-center gap-1.5">
              <Globe size={12} color={colors.mutedIcon} />
              <Text numberOfLines={1} className="flex-1 font-nunito text-xs text-brand-muted">{site}</Text>
            </View>
          ) : null}

          <RsvpBlock id={event.id} attendeeCount={event.attendee_count} open={canRsvp(event)} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function GroupEventView({ event }: { event: GroupEvent }) {
  const { t } = useT();
  const starts = new Date(event.starts_at);
  const open = event.status !== 'cancelled' && (!event.ends_at ? starts.getTime() > Date.now() : new Date(event.ends_at).getTime() > Date.now());
  return (
    <Screen>
      <ScrollView>
        <Banner url={event.banner_url} />
        <View className="gap-4 p-4">
          <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{event.title}</Text>
          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Calendar size={16} color={colors.mutedIcon} />
              <Text className="text-brand-muted">
                {starts.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })} · {starts.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {event.location_name ? (
              <View className="flex-row items-center gap-2">
                <MapPin size={16} color={colors.mutedIcon} />
                <Text className="text-brand-muted">{event.location_name}</Text>
              </View>
            ) : null}
          </View>
          {event.description ? <Text className="leading-5 text-brand-offwhite">{event.description}</Text> : null}
          <RsvpBlock id={event.id} attendeeCount={event.attendee_count} open={open} />
          <Text className="font-nunito text-xs text-brand-muted">{t('mEvGroupEventNote')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
