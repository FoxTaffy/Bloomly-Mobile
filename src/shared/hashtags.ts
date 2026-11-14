// Теги постов. Порт frontend/src/lib/tagRules.ts и hashtags.ts (бэкенд: backend/src/lib/tagRules.ts, держать синхронно).
const TAG_CLASS = '\\p{L}\\p{M}\\p{N}_-';
const NON_TAG_CHAR_RE = new RegExp(`[^${TAG_CLASS}]`, 'gu');
const HASHTAG_RE = new RegExp(`#([${TAG_CLASS}]+)`, 'gu');

/** Очистка ввода: нижний регистр, пробелы → «_», прочие недопустимые символы удаляются. */
export function sanitizeTagInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_').replace(NON_TAG_CHAR_RE, '');
}

/** Хештеги, написанные в тексте поста («...#furry #art»): нижний регистр, без повторов. */
export function extractHashtags(content: string): string[] {
  const found = content.match(HASHTAG_RE);
  if (!found) return [];
  return Array.from(new Set(found.map((h) => h.slice(1).toLowerCase())));
}
