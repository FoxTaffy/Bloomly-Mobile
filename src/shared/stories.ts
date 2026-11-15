// Чистая логика историй: группировка по автору, «просмотрено», ответ на историю в чате.
// Перенос frontend/src/components/StoriesBar.vue (userStories, seen), StoryViewer.vue и lib/chatMessage.ts (parseStoryReply).

import type { Story } from './api-types';

/** Длительность показа фото (web: STORY_DURATION). У видео — длина самого ролика. */
export const STORY_DURATION_MS = 7000;
/** Сколько нажатие считается «касанием», а не удержанием (web: onTapEnd, 350 мс). */
export const STORY_TAP_MAX_MS = 350;
/** Доли ширины: левые 35% — назад, правые 35% — вперёд (web: tap zones). */
export const STORY_TAP_ZONE = 0.35;
/** Ключ списка просмотренных историй: тот же, что на вебе. */
export const SEEN_STORIES_KEY = 'bloomly_seen_stories';
/** Историй живёт 24 часа, не больше 20 активных у автора (backend/modules/stories/service.ts). */
export const MAX_ACTIVE_STORIES = 20;

/** Истории по авторам, внутри группы — от старых к новым; порядок групп — по первому появлению автора (как на вебе). */
export function groupStories(stories: Story[]): Story[][] {
  const map = new Map<string, Story[]>();
  for (const s of stories) {
    const list = map.get(s.user.id);
    if (list) list.push(s);
    else map.set(s.user.id, [s]);
  }
  const groups = [...map.values()];
  for (const g of groups) g.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return groups;
}

export const isGroupSeen = (group: Story[], seen: ReadonlySet<string>): boolean => group.every((s) => seen.has(s.id));

/** Оставшееся время жизни: «5ч 12м» / «12м» (web: timeLeft). Пустая строка, если истекла. */
export function timeLeft(expiresAt: string, now = Date.now()): { h: number; m: number } | null {
  const diff = Math.max(0, new Date(expiresAt).getTime() - now);
  if (diff === 0) return null;
  return { h: Math.floor(diff / 3_600_000), m: Math.floor((diff % 3_600_000) / 60_000) };
}

/** Следующая позиция просмотра: внутри группы, затем следующая группа; null — конец. */
export function nextPos(groups: Story[][], gi: number, si: number): { gi: number; si: number } | null {
  if (si < (groups[gi]?.length ?? 0) - 1) return { gi, si: si + 1 };
  if (gi < groups.length - 1) return { gi: gi + 1, si: 0 };
  return null;
}

/** Предыдущая позиция; на самой первой — null (web: перезапуск таймера). */
export function prevPos(groups: Story[][], gi: number, si: number): { gi: number; si: number } | null {
  if (si > 0) return { gi, si: si - 1 };
  if (gi > 0) return { gi: gi - 1, si: groups[gi - 1].length - 1 };
  return null;
}

// ── Ответ на историю в чате ────────────────────────────────────────────────────────────────
// Формат v2 (JSON): [story_reply:{"img":...,"exp":...,"name":...,"ava":...}]\nтекст; v1 (старый, через |): [story_reply:IMG|EXP|NAME|AVA]\nтекст.
export const STORY_REPLY_RE = /^\[story_reply:(\{[\s\S]*?\}|[^\]]*)\]\n?([\s\S]*)$/u;

export interface StoryReplyMeta {
  imageUrl: string;
  expiresAt: string;
  authorName: string;
  authorAvatar: string;
  replyText: string;
  expired: boolean;
}

/** Текст сообщения → карточка ответа на историю; null, если это обычное сообщение. */
export function parseStoryReply(text: string | null | undefined, now = Date.now()): StoryReplyMeta | null {
  const m = (text ?? '').match(STORY_REPLY_RE);
  if (!m) return null;
  const raw = m[1];
  let imageUrl = '';
  let expiresAt = '';
  let authorName = '';
  let authorAvatar = '';
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { img?: string; exp?: string; name?: string; ava?: string };
      imageUrl = j.img ?? '';
      expiresAt = j.exp ?? '';
      authorName = j.name ?? '';
      authorAvatar = j.ava ?? '';
    } catch {
      // Битый JSON: показываем карточку «история истекла» (как на вебе)
      return { imageUrl: '', expiresAt: '', authorName: '', authorAvatar: '', replyText: '', expired: true };
    }
  } else {
    const parts = raw.split('|');
    imageUrl = parts[0] ?? '';
    expiresAt = parts[1] ?? '';
    authorName = parts[2] ?? '';
    authorAvatar = parts[3] ?? '';
  }
  const expired = expiresAt ? now > new Date(expiresAt).getTime() : false;
  return { imageUrl, expiresAt, authorName, authorAvatar, replyText: m[2].trim(), expired };
}

/** Текст ответа на историю для отправки (web: sendReply). `img` — картинка истории; у видео-истории пусто. */
export function buildStoryReply(story: Story, text: string): string {
  const meta = JSON.stringify({
    img: story.image_url ?? '',
    exp: story.expires_at,
    name: story.user.display_name || story.user.username || '',
    ava: story.user.avatar_url ?? '',
  });
  return `[story_reply:${meta}]\n${text}`;
}
