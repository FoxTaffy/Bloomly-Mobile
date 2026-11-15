// Каталог мероприятий: типы, даты и параметры запроса. Перенос frontend/src/lib/eventCatalog.ts (карта, расстояние и подача событий — только веб).

export const EVENT_TYPES = ['convention', 'meetup', 'fursuit_walk', 'party', 'festival', 'market', 'workshop', 'charity', 'online', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type CatalogScope = 'upcoming' | 'past' | 'cancelled';
export const CATALOG_SCOPES: readonly CatalogScope[] = ['upcoming', 'past', 'cancelled'];
export type DatePreset = 'any' | 'today' | 'week' | 'month';
export const DATE_PRESETS: readonly DatePreset[] = ['any', 'today', 'week', 'month'];
export type PriceCurrency = 'RUB' | 'USD' | 'EUR';

export interface CatalogEvent {
  id: string;
  slug?: string | null;
  title: string;
  short_description: string | null;
  event_type: EventType | null;
  attendance_mode: 'offline' | 'online' | 'hybrid' | null;
  publication_status: 'draft' | 'pending' | 'published' | 'cancelled' | 'finished' | 'archived';
  status_reason: string | null;
  starts_at: string;
  ends_at: string;
  starts_on: string;
  ends_on: string;
  /** date — известны только даты: час показывать нельзя. */
  time_precision: 'datetime' | 'date';
  timezone: string | null;
  timezone_needs_review: boolean;
  city: string | null;
  country_code: string | null;
  location_name: string | null;
  banner_url: string | null;
  organizer_verified: boolean;
  min_age: number | null;
  attendee_count: number;
  /** Самый дешёвый уровень билета; amount 0 — бесплатно. Только справка: покупки в приложении нет. */
  price_from: { amount: number; currency: PriceCurrency } | null;
  tickets_sold_out?: boolean;
}

export interface CatalogEventDetail extends CatalogEvent {
  description: string | null;
  address: string | null;
  online_url: string | null;
  website_url: string | null;
  age_rules: string | null;
  schedule: { time: string; label: string }[] | null;
  what_to_bring: string[] | null;
  rules_text: string | null;
  prices: { name: string; price: number; currency: PriceCurrency }[];
  prices_note: string | null;
  organizer: { id: string; name: string; slug: string } | null;
}

export interface EventListPage {
  events: CatalogEvent[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface EventFacets {
  countries: { code: string; count: number }[];
  cities: { city: string; country_code: string | null; count: number }[];
}

export interface CitySubscription {
  id: string;
  country_code: string;
  city: string;
}

export interface EventFilters {
  scope: CatalogScope;
  q: string;
  type: EventType | '';
  city: string;
  country: string;
  datePreset: DatePreset;
  verified: boolean;
}

export const defaultFilters = (): EventFilters => ({ scope: 'upcoming', q: '', type: '', city: '', country: '', datePreset: 'any', verified: false });
export const EVENTS_PAGE_SIZE = 20;

// ── календарные даты (строки YYYY-MM-DD, без часовых поясов) ────────────────────────────────

export function localToday(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const diffDays = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
export const dayOf = (iso: string) => iso.slice(0, 10);

/** «Сегодня», «эта неделя» (до воскресенья), «этот месяц» (до конца месяца). */
export function presetRange(preset: DatePreset, now = new Date()): { from: string; to: string } | null {
  const today = localToday(now);
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 — воскресенье
    return { from: today, to: addDaysIso(today, (7 - dow) % 7) };
  }
  if (preset === 'month') {
    const [y, m] = today.split('-').map(Number);
    return { from: today, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
  }
  return null;
}

/** Параметры GET /events (web: buildListQuery без геопоиска). */
export function buildListQuery(f: EventFilters, page: number, now = new Date()): Record<string, string | number> {
  const params: Record<string, string | number> = { scope: f.scope, page, limit: EVENTS_PAGE_SIZE };
  if (f.q.trim()) params.q = f.q.trim();
  if (f.type) params.type = f.type;
  if (f.country) params.country = f.country;
  if (f.city) params.city = f.city;
  if (f.verified) params.verified = '1';
  const range = presetRange(f.datePreset, now);
  if (range) {
    params.from = range.from;
    params.to = range.to;
  }
  return params;
}

/** Сколько фильтров включено (поиск и вкладка не в счёт). */
export const activeFilterCount = (f: EventFilters): number => [f.type, f.country, f.city, f.datePreset !== 'any', f.verified].filter(Boolean).length;

export interface EventWhen {
  dates: string;
  time: string | null;
  zone: string | null;
  /** Почему времени нет: true — оно уточняется, false — просто не указано; null — время есть. */
  unknown: 'review' | 'none' | null;
}

/** «5–8 ноября 2026» и время места проведения, если оно известно (web: formatEventWhen). */
export function formatEventWhen(ev: Pick<CatalogEvent, 'starts_on' | 'ends_on' | 'starts_at' | 'ends_at' | 'time_precision' | 'timezone' | 'timezone_needs_review'>, locale: string): EventWhen {
  const start = new Date(ev.starts_on);
  const end = new Date(ev.ends_on);
  const sameDay = dayOf(ev.starts_on) === dayOf(ev.ends_on);
  const fmtDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const ranged = fmtDate as Intl.DateTimeFormat & { formatRange?: (a: Date, b: Date) => string };
  const dates = sameDay ? fmtDate.format(start) : ranged.formatRange ? ranged.formatRange(start, end) : `${fmtDate.format(start)} — ${fmtDate.format(end)}`;
  if (ev.time_precision === 'date' || !ev.timezone) return { dates, time: null, zone: null, unknown: ev.timezone_needs_review ? 'review' : 'none' };
  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: ev.timezone });
  const a = clock.format(new Date(ev.starts_at));
  const b = clock.format(new Date(ev.ends_at));
  return { dates, time: sameDay ? `${a} – ${b}` : `${a} → ${b}`, zone: ev.timezone, unknown: null };
}

export type Timing = { key: 'cancelled' | 'finished' | 'tomorrow' | 'today' | 'ongoing' } | { key: 'inDays'; n: number };

/** «Сегодня», «Завтра», «Через 5 дн.», «Идёт сейчас» — по календарным датам места, а не по часам (web: eventTiming). */
export function eventTiming(ev: Pick<CatalogEvent, 'starts_on' | 'ends_on' | 'publication_status'>, now = new Date()): Timing {
  if (ev.publication_status === 'cancelled') return { key: 'cancelled' };
  if (ev.publication_status === 'finished') return { key: 'finished' };
  const today = localToday(now);
  const toStart = diffDays(dayOf(ev.starts_on), today);
  if (toStart > 1) return { key: 'inDays', n: toStart };
  if (toStart === 1) return { key: 'tomorrow' };
  if (toStart === 0) return { key: 'today' };
  return diffDays(dayOf(ev.ends_on), today) >= 0 ? { key: 'ongoing' } : { key: 'finished' };
}

/** Запись «Иду / Возможно» открыта только у опубликованных ещё не прошедших мероприятий (web: canRsvp). */
export const canRsvp = (ev: Pick<CatalogEvent, 'publication_status' | 'ends_on'>, now = new Date()): boolean =>
  ev.publication_status === 'published' && diffDays(dayOf(ev.ends_on), localToday(now)) >= 0;

export function formatPrice(amount: number, currency: PriceCurrency, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** «Берлин, Германия»; онлайн — «Онлайн» (подписи передаёт вызывающий код). */
export function placeLine(ev: Pick<CatalogEvent, 'city' | 'country_code' | 'attendance_mode'>, locale: string, labels: { online: string; andOnline: string; onlineHybrid: string }): string {
  let country = '';
  if (ev.country_code) {
    try {
      country = new Intl.DisplayNames([locale], { type: 'region' }).of(ev.country_code) ?? ev.country_code;
    } catch {
      country = ev.country_code;
    }
  }
  const place = [ev.city, country].filter(Boolean).join(', ');
  if (ev.attendance_mode === 'online') return place ? `${labels.online} · ${place}` : labels.online;
  if (ev.attendance_mode === 'hybrid') return place ? `${place} · ${labels.andOnline}` : labels.onlineHybrid;
  return place;
}
