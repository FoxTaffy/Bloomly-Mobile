// Частые вопросы (веб: composables/useFaq.ts + словарь helpFaqQ{n}/helpFaqA{n}). Вопросы про Dealers' Den (4) и магазин (5) в приложении не показываем: этих разделов в нём нет.
export const FAQ_IDS = ['1', '2', '3', '7', '8', '9', '10'] as const;

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

/** Грубая основа слова: «фотографию» и «фотография» находят друг друга без словаря (web: stem). */
const stem = (w: string): string => (w.length > 5 ? w.slice(0, -2) : w);

/** Все слова запроса должны встретиться в вопросе или ответе; пустой запрос — все вопросы. */
export function searchFaq(items: FaqItem[], query: string): FaqItem[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1).map(stem);
  if (!words.length) return items;
  return items.filter((i) => {
    const hay = `${i.q} ${i.a}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
