import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Wifi, Send, Mic, Square } from 'lucide-react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { useAppendMessage, useCachedConversation, useMarkConversationRead, useMessages, useOlderMessages, useSendMessage } from '@/hooks/useMessages';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useSession } from '@/stores/session';
import { Avatar } from '@/components/Avatar';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message } from '@/shared/api-types';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export default function ChatThreadScreen() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const myId = useSession((s) => s.user?.id);
  const listRef = useRef<FlashListRef<Message>>(null);
  const [draft, setDraft] = useState('');

  const conversation = useCachedConversation(id);
  const other = conversation && !conversation.is_group ? conversation.participants.find((p) => p.id !== myId) : null;
  const title = conversation?.is_group ? conversation.name ?? t('chatGroupFallbackName') : other?.display_name ?? other?.username ?? '...';

  const messagesQuery = useMessages(id);
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const markRead = useMarkConversationRead();
  const { loadOlder } = useOlderMessages(id);

  // Диалог открыт: пришедшее чужое сообщение сразу отмечаем прочитанным (и при открытии)
  const lastId = messages[messages.length - 1]?.id;
  const lastIsOthers = !!lastId && messages[messages.length - 1].sender_id !== myId;
  useEffect(() => {
    if (id && (lastIsOthers || !lastId)) markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lastId]);

  const append = useAppendMessage(id);
  const appendMessage = useCallback(
    (msg: Message) => {
      append(msg);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    [append],
  );

  const { connected } = useChatSocket(id, appendMessage);

  const { send: sendMutation, sendVoice } = useSendMessage(id, appendMessage);

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendMutation.mutate({ content: text });
  };

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const onToggleRecord = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        // не удалось загрузить — запись просто отбрасываем
        await sendVoice(uri);
      }
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-brand-border px-4 py-2">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Avatar uri={conversation?.is_group ? conversation.avatar_url : other?.avatar_url} name={title} size={36} />
        <View className="flex-1">
          <Text className="font-bold text-brand-offwhite">{title}</Text>
          <View className="flex-row items-center gap-1">
            <Wifi size={10} color={connected ? colors.success : colors.mutedIcon} />
            <Text className="text-xs text-brand-muted">{connected ? t('mConnected') : t('mConnecting')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" keyboardVerticalOffset={90}>
        <FlashList<Message>
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          // Список растёт вверх: начинаем снизу и остаёмся у последних сообщений, пока читатель не прокрутил вверх
          maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
          // У верхнего края подгружаем более старые сообщения (курсор before)
          onStartReached={() => {
            if (messages.length >= 20) void loadOlder();
          }}
          onStartReachedThreshold={0.3}
          renderItem={({ item }) => <MessageBubble message={item} isMine={item.sender_id === myId} />}
          ListEmptyComponent={
            messagesQuery.isLoading ? (
              <View className="gap-3">
                <Skeleton height={40} width="60%" />
                <Skeleton height={40} width="45%" className="self-end" />
                <Skeleton height={40} width="55%" />
              </View>
            ) : messagesQuery.isError ? (
              <ErrorState onRetry={() => messagesQuery.refetch()} />
            ) : (
              <EmptyState title={t('noMessages')} />
            )
          }
        />

        <View className="flex-row items-center gap-2 border-t border-brand-border px-3 py-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('mMessagePlaceholder')}
            placeholderTextColor={colors.mutedIcon}
            className="flex-1 rounded-2xl border border-brand-border bg-brand-card px-4 py-2.5 text-brand-offwhite"
            multiline
          />
          {draft.trim().length > 0 ? (
            <Pressable onPress={onSend} className="h-11 w-11 items-center justify-center rounded-full bg-brand-accent">
              <Send size={18} color={colors.offwhite} />
            </Pressable>
          ) : (
            <Pressable
              onPress={onToggleRecord}
              className={`h-11 w-11 items-center justify-center rounded-full ${recorderState.isRecording ? 'bg-brand-error' : 'bg-brand-accent'}`}
            >
              {recorderState.isRecording ? <Square size={16} color={colors.offwhite} /> : <Mic size={18} color={colors.offwhite} />}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
