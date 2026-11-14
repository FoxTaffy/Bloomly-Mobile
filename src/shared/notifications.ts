// Модель экрана «Уведомления». Порт frontend/src/lib/notifications.ts: склейка однотипных событий, вкладки, разделы по
// давности, тексты и цели переходов. Без React и сети. Dealers' Den и магазин (стикеры, рамки) в мобильной версии v1 не открываем:
// такие уведомления показываются обычным текстом, без перехода.
import type { MessageKey, Params } from './i18n';

export type T = (key: MessageKey, params?: Params) => string;

export interface NotifPerson { id?: string; username?: string; display_name?: string | null; avatar_url?: string | null }
export interface NotifGroup { id?: string; slug?: string; name?: string; avatar_url?: string | null }

export interface Notif {
  id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  sender_id?: string | null;
  sender_group_id?: string | null;
  sender?: NotifPerson | null;
  senderGroup?: NotifGroup | null;
  post_id?: string | null;
  ref_id?: string | null;
  meta?: Record<string, unknown> | null;
}

/** Строка списка: одно уведомление или пачка однотипных (лайки одного человека, комментарии под одним постом). */
export interface NotifItem {
  /** id самого свежего уведомления пачки — стабильный ключ строки */
  id: string;
  notif: Notif;
  members: Notif[];
  unread: boolean;
  senders: number;
  posts: number;
}

const SYSTEM_TYPES = new Set([
  'automod_warn', 'automod_freeze', 'automod_unfreeze', 'automod_ban', 'automod_clear_warns', 'automod_appeal_accepted',
  'automod_appeal_rejected', 'admin_broadcast', 'avatar_frame_approved', 'avatar_frame_rejected', 'sticker_pack_approved',
  'sticker_pack_rejected', 'bug_report_confirmed', 'bug_hunter_level', 'achievement_level', 'event_in_city',
]);
export const isSystemType = (type: string) => SYSTEM_TYPES.has(type);
const isDen = (type: string) => type.startsWith('den_');

/** Сервер отдаёт `read`, старые строки — иначе; тип приводим к одному регистру (как на вебе). */
export function normalizeNotif(n: Record<string, unknown> & { type?: unknown }): Notif {
  const type = String(n.type ?? '');
  return {
    ...(n as object),
    type: isDen(type) || isSystemType(type) ? type : type.toUpperCase(),
    is_read: (n.is_read ?? n.read ?? false) as boolean,
  } as Notif;
}

const senderKey = (n: Notif) => n.sender_group_id ?? n.sender_id ?? null;

function groupKey(n: Notif): string | null {
  if (n.type === 'LIKE') return senderKey(n) ? `LIKE:${senderKey(n)}` : null;
  if ((n.type === 'COMMENT' || n.type === 'REPAW') && n.post_id) return `${n.type}:${n.post_id}`;
  return null;
}

/** list — от новых к старым; пачка встаёт на место самого свежего своего уведомления. */
export function groupNotifications(list: Notif[]): NotifItem[] {
  const out: NotifItem[] = [];
  const byKey = new Map<string, NotifItem>();
  for (const n of list) {
    const key = groupKey(n);
    const existing = key ? byKey.get(key) : undefined;
    if (existing) { existing.members.push(n); continue; }
    const item: NotifItem = { id: n.id, notif: n, members: [n], unread: false, senders: 1, posts: 1 };
    out.push(item);
    if (key) byKey.set(key, item);
  }
  for (const item of out) {
    item.unread = item.members.some((m) => !m.is_read);
    item.senders = new Set(item.members.map(senderKey)).size;
    item.posts = new Set(item.members.map((m) => m.post_id)).size;
  }
  return out;
}

export const identityAvatar = (n: Notif) => n.senderGroup?.avatar_url ?? n.sender?.avatar_url ?? null;
export const identityName = (n: Notif) => n.senderGroup?.name || n.sender?.display_name || n.sender?.username || '';

// ── Тексты ──
const TYPE_KEYS: Record<string, MessageKey> = {
  LIKE: 'notifActLike', COMMENT: 'notifActComment', REPAW: 'notifActRepaw', FOLLOW: 'notifActFollow',
  MENTION: 'notifActMention', FOLLOW_POST: 'notifActFollowPost', GROUP_POST: 'notifActGroupPost',
  COAUTHOR_INVITE: 'notifActCoauthorInvite', COAUTHOR_ACCEPT: 'notifActCoauthorAccept',
  RELATIONSHIP_REQUEST: 'notifActRelReq', RELATIONSHIP_ACCEPTED: 'notifActRelAccepted',
};
const PLURAL_KEYS: Record<string, MessageKey> = { COMMENT: 'notifActCommentMany', REPAW: 'notifActRepawMany' };

/** Склонение для «{posts}» в notifActLikePosts (русский; в английском плейсхолдера нет). */
const pluralPosts = (c: number) => {
  const mod10 = c % 10, mod100 = c % 100;
  return mod10 === 1 && mod100 !== 11 ? 'вашу публикацию'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'ваших публикации' : 'ваших публикаций';
};

/** Системное уведомление целиком (у него нет отправителя): текст из meta. */
export function systemMessage(n: Notif, t: T): string {
  const meta = (n.meta ?? {}) as Record<string, unknown>;
  const why = meta.reason ? ` — ${String(meta.reason)}` : '';
  const s = (v: unknown, fallback = '') => String(v ?? fallback);
  switch (n.type) {
    case 'automod_warn': return t('notifSysWarn', { count: s(meta.count, '?'), limit: s(meta.limit, '5'), why });
    case 'automod_freeze': return t('notifSysFreeze', { why });
    case 'automod_unfreeze': return t('notifSysUnfreeze');
    case 'automod_ban': return t('notifSysBan', { why });
    case 'automod_clear_warns': return t('notifSysClearWarns');
    case 'automod_appeal_accepted': return t('notifSysAppealOk');
    case 'automod_appeal_rejected': return t('notifSysAppealNo');
    case 'admin_broadcast': return `📣 ${s(meta.title)}${meta.body ? ' — ' + s(meta.body) : ''}`;
    case 'avatar_frame_approved': return t('notifSysFrameOk', { name: s(meta.name) });
    case 'avatar_frame_rejected': return t('notifSysFrameNo', { name: s(meta.name), why });
    case 'sticker_pack_approved': return t('notifSysPackOk', { name: s(meta.name) });
    case 'sticker_pack_rejected': return t('notifSysPackNo', { name: s(meta.name), why });
    case 'bug_report_confirmed': return t('notifSysBugConfirmed');
    case 'event_in_city': return t('notifSysEventCity', { city: s(meta.city), title: s(meta.title) });
    case 'bug_hunter_level': return t('notifSysBugLevel', { level: s(meta.level) });
    case 'achievement_level': return t('notifSysAchievementLevel', { title: s(meta.title), level: s(meta.levelName) });
    default: return '';
  }
}

/** Действие после имени: «… лайкнул(а) вашу публикацию». */
export function actionText(item: NotifItem, t: T): string {
  const { type } = item.notif;
  if (type === 'FRIEND_REQUEST') return t('notifFriendRequest');
  if (type === 'FRIEND_ACCEPT') return t('notifFriendAccept');
  if (type === 'LIKE' && item.posts > 1) return t('notifActLikePosts', { n: item.posts, posts: pluralPosts(item.posts) });
  if (item.senders > 1 && PLURAL_KEYS[type]) return t(PLURAL_KEYS[type]);
  return TYPE_KEYS[type] ? t(TYPE_KEYS[type]) : t('notifGeneric');
}

/** «Аня» или «Аня и ещё 3». */
export function senderText(item: NotifItem, t: T): string {
  const name = identityName(item.notif);
  return item.senders > 1 && PLURAL_KEYS[item.notif.type] ? t('notifAndMore', { name, n: item.senders - 1 }) : name;
}

// ── Куда ведёт строка (маршруты мобильного приложения) ──
/** Кнопки «Принять / Отклонить» есть только у заявки в отношения; ответ идёт через /relationships (как на вебе). */
export const hasRequestActions = (type: string) => type === 'RELATIONSHIP_REQUEST';

export function notifTarget(item: NotifItem): string | null {
  const n = item.notif;
  const meta = (n.meta ?? {}) as Record<string, unknown>;
  if (n.type === 'event_in_city' && meta.eventId) return `/events/${String(meta.eventId)}`;
  if (isSystemType(n.type) || hasRequestActions(n.type) || isDen(n.type) || n.type.startsWith('STICKER_ACCESS')) return null;
  if (n.senderGroup?.slug) return `/groups/${n.senderGroup.slug}`;
  if (['FOLLOW', 'RELATIONSHIP_ACCEPTED'].includes(n.type) && n.sender?.username) return `/profile/${n.sender.username}`;
  if (n.post_id) return `/post/${n.post_id}`;
  return n.sender?.username ? `/profile/${n.sender.username}` : null;
}

// ── Вкладки ──
export interface NotifTab { id: string; labelKey: MessageKey; emptyKey: MessageKey; match: ((n: Notif) => boolean) | null }
const typeIn = (...types: string[]) => (n: Notif) => types.includes(n.type);

export const NOTIF_TABS: NotifTab[] = [
  { id: 'all', labelKey: 'tabAll', match: null, emptyKey: 'notifEmptyAll' },
  { id: 'likes', labelKey: 'notifTabLikes', match: typeIn('LIKE', 'REPAW'), emptyKey: 'notifEmptyLikes' },
  { id: 'comments', labelKey: 'notifTabComments', match: typeIn('COMMENT', 'MENTION'), emptyKey: 'notifEmptyComments' },
  {
    id: 'follows', labelKey: 'notifTabFollows', emptyKey: 'notifEmptyFollows',
    match: typeIn('FOLLOW', 'FOLLOW_POST', 'GROUP_POST', 'COAUTHOR_INVITE', 'COAUTHOR_ACCEPT', 'RELATIONSHIP_REQUEST', 'RELATIONSHIP_ACCEPTED', 'FRIEND_REQUEST', 'FRIEND_ACCEPT', 'event_in_city'),
  },
  { id: 'system', labelKey: 'notifTabSystem', emptyKey: 'notifEmptySystem', match: (n) => (isSystemType(n.type) && n.type !== 'event_in_city') || isDen(n.type) || n.type.startsWith('STICKER_ACCESS') },
];

export const inTab = (tab: NotifTab, item: NotifItem) => !tab.match || item.members.some((m) => tab.match!(m));

// ── Разделы по давности ──
const BUCKETS: readonly (readonly [string, MessageKey])[] = [
  ['today', 'notifBucketToday'], ['yesterday', 'notifBucketYesterday'], ['week', 'notifBucketWeek'], ['older', 'notifBucketOlder'],
];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
function dayBucket(iso: string, now: Date): string {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  return diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : diff < 7 ? 'week' : 'older';
}

export interface NotifSection { key: string; titleKey: MessageKey; items: NotifItem[] }

/** «Новые» сверху, прочитанные — по давности. Пустые разделы отбрасываются. */
export function buildSections(items: NotifItem[], now = new Date()): NotifSection[] {
  const read = items.filter((i) => !i.unread);
  return [
    { key: 'new', titleKey: 'notifBucketNew' as MessageKey, items: items.filter((i) => i.unread) },
    ...BUCKETS.map(([key, titleKey]) => ({ key, titleKey, items: read.filter((i) => dayBucket(i.notif.created_at, now) === key) })),
  ].filter((s) => s.items.length);
}
