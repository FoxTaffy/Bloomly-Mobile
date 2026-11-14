import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadMedia } from '@/api/media';
import { fetchMessages, markConversationRead, sendMessage } from '@/api/messages';
import type { Conversation, Message } from '@/shared/api-types';

/** Сообщения диалога по возрастанию времени. */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    select: (list) => [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  });
}

/** Диалог из кэша списка (без отдельного запроса). */
export function useCachedConversation(conversationId: string): Conversation | undefined {
  const qc = useQueryClient();
  return qc.getQueryData<Conversation[]>(['conversations'])?.find((c) => c.id === conversationId);
}

/** Добавляет сообщение в кэш диалога (свои отправленные и пришедшие по WebSocket) без дублей. */
export function useAppendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useCallback(
    (msg: Message) => {
      qc.setQueryData<Message[]>(['messages', conversationId], (prev) => {
        if (!prev) return [msg];
        return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
      });
    },
    [qc, conversationId],
  );
}

export function useSendMessage(conversationId: string, onSent: (msg: Message) => void) {
  const send = useMutation({
    mutationFn: (body: { content: string; file_url?: string; media_type?: string }) => sendMessage(conversationId, body),
    onSuccess: onSent,
  });
  /** Голосовое: загрузка файла, затем сообщение. Возвращает false, если загрузка не удалась. */
  const sendVoice = async (uri: string): Promise<boolean> => {
    try {
      const { url } = await uploadMedia(uri, 'messages', 'audio/m4a');
      await send.mutateAsync({ content: '', file_url: url, media_type: 'voice' });
      return true;
    } catch {
      return false;
    }
  };
  return { send, sendVoice };
}

export function useMarkConversationRead() {
  return useMutation({ mutationFn: (conversationId: string) => markConversationRead(conversationId) });
}
