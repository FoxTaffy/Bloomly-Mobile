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
