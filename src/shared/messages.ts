import type { Message } from './api-types';

/** Склейка страниц чата: без повторов (по id), по возрастанию времени. */
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Есть ли в `incoming` хоть одно сообщение из `existing`: если нет, между ними мог остаться разрыв. */
export function overlaps(existing: Message[], incoming: Message[]): boolean {
  const known = new Set(existing.map((m) => m.id));
  return incoming.some((m) => known.has(m.id));
}
