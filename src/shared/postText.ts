// Разбор текста поста на обычный текст, @упоминания и ссылки. Перенос frontend/src/lib/postText.ts без изменений логики.

export type PostSeg =
  | { type: 'text'; key: number; text: string }
  | { type: 'mention'; key: number; text: string; username: string }
  | { type: 'url'; key: number; text: string; href: string };

const TOKEN_RE = /(https?:\/\/[^\s<]+|@\w+(?:-\w+)*)/g;
const TRAILING_PUNCT_RE = /[.,!?;:)\]}»"'…]+$/;

export function parsePostSegments(text: string): PostSeg[] {
  const segs: PostSeg[] = [];
  let key = 0;
  for (const part of text.split(TOKEN_RE)) {
    if (!part) continue;
    if (/^https?:\/\//.test(part)) {
      // Знаки препинания в конце («...help.») не входят в ссылку
      const trail = part.match(TRAILING_PUNCT_RE)?.[0] ?? '';
      const url = trail ? part.slice(0, -trail.length) : part;
      segs.push({ type: 'url', key: key++, text: url, href: url });
      if (trail) segs.push({ type: 'text', key: key++, text: trail });
    } else if (/^@\w+(?:-\w+)*$/.test(part)) {
      segs.push({ type: 'mention', key: key++, text: part, username: part.slice(1) });
    } else {
      segs.push({ type: 'text', key: key++, text: part });
    }
  }
  return segs;
}

/** Правка поста доступна автору 7 дней (web: POST_EDIT_WINDOW_MS в PostCard.vue). */
export const POST_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const isPostEditable = (createdAt: string, now = Date.now()): boolean => now - new Date(createdAt).getTime() < POST_EDIT_WINDOW_MS;
