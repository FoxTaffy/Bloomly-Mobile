import { api } from './client';
import type { Conversation, Message } from '@/shared/api-types';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await api.get('/messages/conversations');
  return res.data.data.conversations as Conversation[];
}

/** Страница сообщений: без `before` — самые новые, с `before` (ISO-время) — старше него. Порядок на сервере не гарантируем. */
export async function fetchMessagesPage(conversationId: string, before?: string): Promise<{ messages: Message[]; hasMore: boolean }> {
  const res = await api.get(`/messages/conversations/${conversationId}/messages`, {
    params: before ? { before } : undefined,
  });
  return { messages: (res.data.data.messages ?? []) as Message[], hasMore: !!res.data.data.has_more };
}

export async function fetchMessages(conversationId: string, before?: string): Promise<Message[]> {
  return (await fetchMessagesPage(conversationId, before)).messages;
}

/** Непрочитанные: личные и групповые (веб: stores/messages.ts fetchUnreadCount). */
export async function fetchUnreadCount(): Promise<{ personal: number; group: number }> {
  const res = await api.get('/messages/conversations/unread');
  return { personal: res.data.data.personal ?? 0, group: res.data.data.group ?? 0 };
}

export async function sendMessage(
  conversationId: string,
  body: { content: string; file_url?: string; media_type?: string; reply_to_id?: string },
): Promise<Message> {
  const res = await api.post(`/messages/conversations/${conversationId}/messages`, body);
  return res.data.data.message as Message;
}

export async function markConversationRead(conversationId: string) {
  await api.post(`/messages/conversations/${conversationId}/read`);
}

export async function getOrCreateConversation(userId: string): Promise<Conversation> {
  const res = await api.post('/messages/conversations', { userId });
  return res.data.data.conversation as Conversation;
}

// ── Действия с сообщениями и беседами (веб: stores/messages.ts, ChatWindow.vue) ───────────────────────

/** Правка своего текста (24 часа). */
export async function editMessage(id: string, text: string): Promise<Message> {
  const res = await api.patch(`/messages/messages/${id}`, { text });
  return res.data.data.message as Message;
}

export async function deleteMessage(id: string) {
  await api.delete(`/messages/messages/${id}`);
}

/** Реакция-переключатель: тот же эмодзи ещё раз снимает её. Сервер отдаёт сообщение целиком. */
export async function toggleReaction(id: string, emoji: string): Promise<Message> {
  const res = await api.post(`/messages/messages/${id}/reactions`, { emoji });
  return res.data.data.message as Message;
}

export async function forwardMessage(id: string, targetConversationId: string): Promise<Message> {
  const res = await api.post(`/messages/messages/${id}/forward`, { targetConversationId });
  return res.data.data.message as Message;
}

export async function setArchived(conversationId: string, archived: boolean) {
  await api.patch(`/messages/conversations/${conversationId}/archive`, { archived });
}

/** `mutedUntil` — ISO-время; null — включить уведомления. */
export async function setMute(conversationId: string, mutedUntil: string | null) {
  await api.patch(`/messages/conversations/${conversationId}/mute`, { muted_until: mutedUntil, sound_muted: false });
}

export async function setChatPinned(conversationId: string, pinned: boolean) {
  await api.patch(`/messages/conversations/${conversationId}/pin-chat`, { pinned });
}

/** Удалить беседу у себя (`me`) или у всех (`all`; для личных диалогов — по правилам сервера). */
export async function deleteConversation(conversationId: string, scope: 'me' | 'all' = 'me') {
  await api.delete(`/messages/conversations/${conversationId}`, { params: { scope } });
}

/** Ответ на запрос переписки от не-друга. */
export async function answerDmRequest(conversationId: string, accept: boolean) {
  await api.post(`/messages/conversations/${conversationId}/request`, { accept });
}

export async function createGroupChat(name: string, userIds: string[]): Promise<Conversation> {
  const res = await api.post('/messages/groups', { name, userIds });
  return res.data.data.conversation as Conversation;
}
