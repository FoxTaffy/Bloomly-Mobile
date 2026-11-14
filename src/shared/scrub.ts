// Очистка данных перед отправкой в мониторинг ошибок: ни токенов, ни персональных данных, ни текстов сообщений.
// Чистые функции без React и Sentry, чтобы правила можно было проверить отдельно.

const JWT_RE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EXPO_PUSH_RE = /Expo(?:nent)?PushToken\[[^\]]+\]/g;

/** Строка без токенов, почты, push-токенов и uuid (id объектов и устройства). */
export function scrubString(s: string): string {
  return s
    .replace(BEARER_RE, 'Bearer [token]')
    .replace(JWT_RE, '[token]')
    .replace(EXPO_PUSH_RE, '[push-token]')
    .replace(EMAIL_RE, '[email]')
    .replace(UUID_RE, '[id]');
}

/** Адрес запроса: только путь, без параметров запроса и фрагмента; id внутри пути маскируются. */
export function scrubUrl(url: string): string {
  const noQuery = url.split(/[?#]/)[0];
  return scrubString(noQuery);
}

interface SentryLikeEvent {
  user?: unknown;
  request?: unknown;
  server_name?: string;
  extra?: unknown;
  message?: string;
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: { category?: string; message?: string; data?: Record<string, unknown> }[];
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
}

/** Событие перед отправкой: убираем пользователя, запрос (заголовки, тело, cookie), extra и чистим тексты. */
export function scrubEvent<T extends SentryLikeEvent>(event: T): T {
  delete event.user;
  delete event.request;
  delete event.server_name;
  delete event.extra;
  if (event.message) event.message = scrubString(event.message);
  event.exception?.values?.forEach((v) => {
    if (v.value) v.value = scrubString(v.value);
  });
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter((b): b is NonNullable<typeof b> => b !== null);
  return event;
}

type Crumb = NonNullable<SentryLikeEvent['breadcrumbs']>[number];

/** Хлебная крошка: консоль и ввод пользователя выбрасываем, сетевые оставляем без тел, заголовков и параметров. */
export function scrubBreadcrumb(b: Crumb): Crumb | null {
  if (b.category === 'console' || b.category?.startsWith('ui.input')) return null;
  const out: Crumb = { ...b };
  if (out.message) out.message = scrubString(out.message);
  if (out.data) {
    const d = out.data;
    const safe: Record<string, unknown> = {};
    if (typeof d.method === 'string') safe.method = d.method;
    if (typeof d.status_code === 'number') safe.status_code = d.status_code;
    if (typeof d.url === 'string') safe.url = scrubUrl(d.url);
    if (typeof d.from === 'string') safe.from = scrubUrl(d.from); // навигация: путь без параметров
    if (typeof d.to === 'string') safe.to = scrubUrl(d.to);
    out.data = safe;
  }
  return out;
}
