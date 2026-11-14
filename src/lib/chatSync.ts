import type { QueryClient } from '@tanstack/react-query';
import { fetchMessagesPage } from '@/api/messages';
import type { Message } from '@/shared/api-types';
import { mergeMessages, overlaps } from '@/shared/messages';

const MAX_CATCH_UP_PAGES = 5;

/**
 * Догоняет сообщения, пришедшие, пока приложение было свёрнуто (WebSocket в фоне не живёт).
 * Бэкенд отдаёт страницы только «старше курсора» (`before`), поэтому берём самую новую страницу и,
 * если она не пересекается с кэшем, листаем назад по `before`, пока не сойдётся (не больше MAX_CATCH_UP_PAGES).
 */
export async function catchUpMessages(qc: QueryClient, conversationId: string): Promise<void> {
  const key = ['messages', conversationId];
  const cached = qc.getQueryData<Message[]>(key);
  if (!cached) return; // диалог не открывали: загрузится целиком при открытии
  let fetched: Message[] = [];
  let before: string | undefined;
  for (let page = 0; page < MAX_CATCH_UP_PAGES; page++) {
    const { messages, hasMore } = await fetchMessagesPage(conversationId, before);
    if (!messages.length) break;
    fetched = fetched.concat(messages);
    if (overlaps(cached, messages) || !hasMore) break;
    before = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at))[0].created_at;
  }
  qc.setQueryData<Message[]>(key, (prev) => mergeMessages(prev ?? [], fetched));
}

/** Всё, что нужно обновить при возврате в приложение. */
export async function syncOnResume(qc: QueryClient): Promise<void> {
  void qc.invalidateQueries({ queryKey: ['conversations'] });
  void qc.invalidateQueries({ queryKey: ['unread-messages'] });
  void qc.invalidateQueries({ queryKey: ['notifications'] });
  const open = qc.getQueryCache().findAll({ queryKey: ['messages'] });
  await Promise.all(
    open.map((q) => catchUpMessages(qc, String(q.queryKey[1])).catch(() => {})),
  );
}
