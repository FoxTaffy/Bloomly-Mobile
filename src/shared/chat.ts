// Чистая логика чата. Перенос frontend/src/lib/chatMessage.ts, convDisplay.ts и stores/messages.ts (сортировка беседы, режим «без звука»).
import type { ChatUser, Conversation, Message } from './api-types';

/** Собеседник личного диалога; у групп — null. Источник — `other_participants` (как на вебе). */
export function otherUser(c: Pick<Conversation, 'is_group' | 'other_participants' | 'participants'>, myId?: string | null): ChatUser | null {
  if (c.is_group) return null;
  const fromOthers = c.other_participants?.[0]?.user;
  if (fromOthers) return fromOthers;
  // запасной путь: строки всех участников, без себя
  return c.participants?.find((p) => p.user_id !== myId)?.user ?? null;
}

export function conversationTitle(c: Conversation, myId: string | null | undefined, groupFallback: string): string {
  if (c.is_group) return c.name ?? groupFallback;
  const u = otherUser(c, myId);
  return u?.display_name ?? u?.username ?? '—';
}

export const isArchived = (c: Conversation): boolean => !!c.my_participant?.archived;
export const isPinned = (c: Conversation): boolean => !!c.my_participant?.pinned_at;
export function isMuted(c: Conversation, now = Date.now()): boolean {
  const until = c.my_participant?.muted_until;
  return !!until && new Date(until).getTime() > now;
}

/** Закреплённые — вверху (в порядке закрепления), остальные — по свежести (web: compareConversations). */
export function compareConversations(a: Conversation, b: Conversation): number {
  const pa = a.my_participant?.pinned_at;
  const pb = b.my_participant?.pinned_at;
  if (pa && pb) return new Date(pa).getTime() - new Date(pb).getTime();
  if (pa) return -1;
  if (pb) return 1;
  return new Date(b.updated_at ?? b.last_message?.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.last_message?.created_at ?? 0).getTime();
}

/** Варианты «без звука» (web: ConvMenu) в миллисекундах. */
export const MUTE_OPTIONS = [
  { key: 'mMuteHour', ms: 3_600_000 },
  { key: 'mMute8Hours', ms: 8 * 3_600_000 },
  { key: 'mMuteDay', ms: 24 * 3_600_000 },
  { key: 'mMuteWeek', ms: 7 * 24 * 3_600_000 },
] as const;

// ── Сообщения ──────────────────────────────────────────────────────────────────────────────
export const FWD_RE = /^↩️ Переслано от (.+?)\n/;
/** Правка своего текста — 24 часа (backend: EDIT_WINDOW_MS). */
export const EDIT_WINDOW_MS = 24 * 3_600_000;
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🙏'] as const;
/** Эти типы не пересылаем (web: NOT_FORWARDABLE) — деньги и служебные карточки. */
export const MONEY_TYPES = ['payment_request', 'payment_confirmation', 'tip', 'order_card', 'order_update', 'order_files'] as const;
const NOT_FORWARDABLE = new Set<string>([...MONEY_TYPES, 'system']);

export const isMoneyType = (type: string): boolean => (MONEY_TYPES as readonly string[]).includes(type);
export const canForward = (m: Message): boolean => !NOT_FORWARDABLE.has(m.type);
export const canEdit = (m: Message, myId: string | null | undefined, now = Date.now()): boolean =>
  m.sender_id === myId && m.type === 'text' && now - new Date(m.created_at).getTime() <= EDIT_WINDOW_MS;

/** Автор пересланного: имя, «скрытый пользователь» или из старого текстового префикса. */
export function forwardedAuthor(m: Message, hiddenLabel: string): string | null {
  if (m.forwarded_from_sender_id) return m.forwarded_from_sender ? (m.forwarded_from_sender.display_name || m.forwarded_from_sender.username) : hiddenLabel;
  const mm = (m.text ?? '').match(FWD_RE);
  return mm ? mm[1] : null;
}

/** Текст без служебного префикса пересылки (ответ на историю разбирает shared/stories.ts). */
export function bodyText(m: Message): string {
  const text = m.text ?? '';
  return m.forwarded_from_sender ? text : text.replace(FWD_RE, '');
}

const EMOJI_ONLY_RE = /^[\p{Extended_Pictographic}‍️\u{1F1E6}-\u{1F1FF}\s]+$/u;
/** 1–3 эмодзи без текста — рисуются крупно, без пузыря. */
export function isEmojiOnlyText(text: string | null | undefined): boolean {
  const trimmed = (text ?? '').trim();
  if (!trimmed || !EMOJI_ONLY_RE.test(trimmed)) return false;
  const count = [...trimmed.replace(/\s/g, '')].filter((ch) => /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/u.test(ch)).length;
  return count >= 1 && count <= 3;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|heic)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;
export function fileKind(m: Pick<Message, 'type' | 'file_url'>): 'image' | 'video' | 'audio' | 'other' | null {
  const url = m.file_url;
  if (!url) return null;
  if (m.type === 'voice' || m.type === 'audio') return 'audio';
  if (m.type === 'video' || VIDEO_EXT.test(url)) return 'video';
  if (m.type === 'image' || m.type === 'gif' || IMAGE_EXT.test(url)) return 'image';
  return 'other';
}

/** Альбом: список файлов из metadata.files или одиночный файл (web: getAlbumFiles). */
export function albumFiles(m: Message): { url: string; type: 'image' | 'video' | 'other' }[] {
  const files = (m.metadata as { files?: { url?: string; type?: string }[] } | null | undefined)?.files;
  if (!Array.isArray(files)) return [];
  return files.flatMap((f) => (typeof f.url === 'string' ? [{ url: f.url, type: f.type === 'video' || VIDEO_EXT.test(f.url) ? ('video' as const) : IMAGE_EXT.test(f.url) || f.type === 'image' ? ('image' as const) : ('other' as const) }] : []));
}

/** Тип вложения для отправки (media_type у сервера: image / video / voice …). */
export const mediaTypeOf = (mime: string): 'image' | 'video' => (mime.startsWith('video/') ? 'video' : 'image');

/** Реакции как список для показа: эмодзи, сколько, моя ли. */
export function reactionChips(m: Message, myId: string | null | undefined): { emoji: string; count: number; mine: boolean }[] {
  return Object.entries(m.reactions ?? {})
    .filter(([, users]) => users.length > 0)
    .map(([emoji, users]) => ({ emoji, count: users.length, mine: !!myId && users.includes(myId) }));
}
