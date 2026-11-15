import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, CornerUpLeft, Ellipsis, ImagePlus, Mic, Pencil, RotateCcw, Send, Square, Video, Wifi, X } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { ConversationMenu } from '@/components/chat/ConversationMenu';
import { ForwardSheet } from '@/components/chat/ForwardSheet';
import { MessageActionsSheet } from '@/components/chat/MessageActionsSheet';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PermissionDeniedSheet } from '@/components/PermissionDeniedSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { Button, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useConversationActions, useMessageActions } from '@/hooks/useChatActions';
import { useAppendMessage, useCachedConversation, useMarkConversationRead, useMessages, useOlderMessages, useSendMessage } from '@/hooks/useMessages';
import { usePostMedia } from '@/hooks/usePostMedia';
import { useT } from '@/hooks/useT';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { apiErrorMessage } from '@/shared/apiError';
import type { Message } from '@/shared/api-types';
import { bodyText, conversationTitle, mediaTypeOf, otherUser } from '@/shared/chat';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/** Беседа. Веб-аналог: components/ChatWindow.vue + chat/*. Долгое нажатие на сообщение — меню: реакции, ответ, правка, пересылка, удаление. */
export default function ChatThreadScreen() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const myId = useSession((s) => s.user?.id);
  const listRef = useRef<FlashListRef<Message>>(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [actionsFor, setActionsFor] = useState<Message | null>(null);
  const [forwardFor, setForwardFor] = useState<Message | null>(null);
  const [reportFor, setReportFor] = useState<Message | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const conversation = useCachedConversation(id);
  const other = conversation ? otherUser(conversation, myId) : null;
  const title = conversation ? conversationTitle(conversation, myId, t('chatGroupFallbackName')) : '...';
  const isGroup = !!conversation?.is_group;
  const readOnly = !!conversation?.read_only_at;

  const messagesQuery = useMessages(id);
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const markRead = useMarkConversationRead();
  const { loadOlder } = useOlderMessages(id);
  const actions = useMessageActions(id);
  const convActions = useConversationActions();

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

  // Вложение: фото из галереи или камеры, загрузка в папку messages (лимиты тарифа — как у постов)
  const media = usePostMedia({ max: 1, folder: 'messages' });
  const attach = media.items[0];
  const attachUrl = media.mediaUrls[0];

  const requestPending = conversation?.request_status === 'pending';
  const requestIncoming = requestPending && conversation?.request_from_id !== myId;
  const requestOutgoing = requestPending && conversation?.request_from_id === myId;

  const canSend =
    !readOnly &&
    !requestIncoming &&
    !sendMutation.isPending &&
    !media.uploading &&
    !media.failed &&
    (editing ? !!draft.trim() : !!draft.trim() || !!attachUrl);

  const onSend = () => {
    const text = draft.trim();
    if (!canSend) return;
    setSendError(null);
    if (editing) {
      actions.edit.mutate(
        { id: editing.id, text },
        { onSuccess: () => { setEditing(null); setDraft(''); }, onError: (e) => setSendError(apiErrorMessage(e) ?? t('mActionFailed')) },
      );
      return;
    }
    setDraft('');
    const reply = replyTo;
    setReplyTo(null);
    sendMutation.mutate(
      {
        content: text,
        ...(reply ? { reply_to_id: reply.id } : {}),
        ...(attachUrl && attach ? { file_url: attachUrl, media_type: mediaTypeOf(attach.mime) } : {}),
      },
      {
        onSuccess: () => media.clear(),
        onError: (e) => {
          // Текст не теряем: возвращаем в поле, чтобы можно было отправить ещё раз
          setDraft(text);
          setReplyTo(reply);
          setSendError(apiErrorMessage(e) ?? t('mMessageSendFailed'));
        },
      },
    );
  };

  const voice = useVoiceRecorder();
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const onToggleRecord = async () => {
    setVoiceError(null);
    if (voice.isRecording) {
      const uri = await voice.finish();
      if (!uri) return setVoiceError(t('mVoiceRecordFailed'));
      if (!(await sendVoice(uri))) setVoiceError(t('mVoiceSendFailed'));
      return;
    }
    if ((await voice.start()) === 'failed') setVoiceError(t('mVoiceRecordFailed'));
  };

  const scrollToMessage = (mid: string) => {
    const index = messages.findIndex((m) => m.id === mid);
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true });
  };

  const startEdit = (m: Message) => {
    setReplyTo(null);
    setEditing(m);
    setDraft(bodyText(m));
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const showAttach = !editing && !requestIncoming && !readOnly;

  return (
    <Screen edges={['top', 'bottom']} onBackPress={() => (editing ? (cancelEdit(), true) : false)}>
      <View className="flex-row items-center gap-3 border-b border-brand-border px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Pressable
          onPress={() => other && router.push(`/profile/${other.username}`)}
          disabled={!other}
          accessibilityRole="button"
          className="flex-1 flex-row items-center gap-3 active:opacity-70"
        >
          <Avatar uri={isGroup ? conversation?.avatar_url : other?.avatar_url} name={title} size={36} />
          <View className="flex-1">
            <Text numberOfLines={1} className="font-bold text-brand-offwhite">{title}</Text>
            <View className="flex-row items-center gap-1">
              <Wifi size={10} color={connected ? colors.success : colors.mutedIcon} />
              <Text className="text-xs text-brand-muted">{connected ? t('mConnected') : t('mConnecting')}</Text>
            </View>
          </View>
        </Pressable>
        {conversation ? (
          <Pressable onPress={() => setMenuOpen(true)} accessibilityRole="button" accessibilityLabel={t('mMore')} hitSlop={8} className="h-9 w-9 items-center justify-center">
            <Ellipsis size={18} color={colors.mutedIcon} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" keyboardVerticalOffset={90}>
        <FlashList<Message>
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
          onStartReached={() => {
            if (messages.length >= 20) void loadOlder();
          }}
          onStartReachedThreshold={0.3}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.sender_id === myId}
              myId={myId}
              showSender={isGroup}
              onLongPress={setActionsFor}
              onReact={(m, emoji) => actions.react.mutate({ id: m.id, emoji })}
              onOpenReply={scrollToMessage}
            />
          )}
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

        {/* Запрос переписки от не-друга: ответить можно только после «Принять» */}
        {requestIncoming ? (
          <View className="gap-2 border-t border-brand-border px-4 py-3">
            <Text className="font-nunito text-sm text-brand-offwhite">{t('mDmRequestIncoming', { name: title })}</Text>
            <View className="flex-row gap-2">
              <Button title={t('mFriendAccept')} className="flex-1" loading={convActions.answerRequest.isPending} onPress={() => convActions.answerRequest.mutate({ id, accept: true })} />
              <Button
                title={t('mFriendReject')}
                variant="secondary"
                className="flex-1"
                loading={convActions.answerRequest.isPending}
                onPress={() => convActions.answerRequest.mutate({ id, accept: false }, { onSuccess: () => router.back() })}
              />
            </View>
          </View>
        ) : readOnly ? (
          <Text className="border-t border-brand-border px-4 py-3 text-center font-nunito text-xs text-brand-muted">{t('mChatReadOnly')}</Text>
        ) : (
          <>
            {requestOutgoing ? <Text className="px-4 pt-2 font-nunito text-xs text-brand-muted">{t('mDmRequestOutgoing')}</Text> : null}
            {replyTo ? (
              <View className="flex-row items-center gap-2 border-t border-brand-border px-4 py-2">
                <CornerUpLeft size={14} color={colors.accentMinus} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-nunito-bold text-xs text-brand-accent-minus">{replyTo.sender?.display_name ?? replyTo.sender?.username ?? t('mSomeone')}</Text>
                  <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{bodyText(replyTo) || t('mAttachment')}</Text>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('mCancelReply')}><X size={16} color={colors.mutedIcon} /></Pressable>
              </View>
            ) : null}
            {editing ? (
              <View className="flex-row items-center gap-2 border-t border-brand-border px-4 py-2">
                <Pencil size={14} color={colors.accentMinus} />
                <Text className="flex-1 font-nunito-bold text-xs text-brand-accent-minus">{t('mEditingMessage')}</Text>
                <Pressable onPress={cancelEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('cancel')}><X size={16} color={colors.mutedIcon} /></Pressable>
              </View>
            ) : null}
            {attach ? (
              <View className="flex-row items-center gap-3 border-t border-brand-border px-4 py-2">
                <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-brand-border bg-brand-card">
                  {attach.isVideo ? <Video size={22} color={colors.mutedIcon} /> : <Image source={{ uri: attach.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
                  {attach.status === 'uploading' ? <View className="absolute inset-x-0 bottom-0 h-1 bg-black/50"><View className="h-full bg-brand-accent" style={{ width: `${Math.round(attach.progress * 100)}%` }} /></View> : null}
                </View>
                <Text numberOfLines={2} className={`flex-1 font-nunito text-xs ${attach.status === 'error' ? 'text-brand-error' : 'text-brand-muted'}`}>{attach.status === 'error' ? attach.error : attach.status === 'uploading' ? t('mUploading') : t('mAttachmentReady')}</Text>
                {attach.status === 'error' ? <Pressable onPress={() => media.retry(attach.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('mRetry')}><RotateCcw size={18} color={colors.offwhite} /></Pressable> : null}
                <Pressable onPress={() => media.remove(attach.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('mRemove')}><X size={18} color={colors.mutedIcon} /></Pressable>
              </View>
            ) : null}
            {media.notice ? <Text className="px-4 pt-1 font-nunito-bold text-xs text-brand-error">{media.notice}</Text> : null}
            {voice.isRecording ? <Text className="px-4 pt-2 font-nunito-bold text-xs text-brand-error">{t('mVoiceRecording')}</Text> : null}
            {voiceError ? <Text className="px-4 pt-2 font-nunito-bold text-xs text-brand-error">{voiceError}</Text> : null}
            {sendError ? <Text className="px-4 pt-2 font-nunito-bold text-xs text-brand-error">{sendError}</Text> : null}
            <View className="flex-row items-center gap-2 border-t border-brand-border px-3 py-2">
              {showAttach && !attach ? (
                <>
                  <Pressable onPress={() => void media.pickFromLibrary()} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('mAddFromLibrary')} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
                    <ImagePlus size={18} color={colors.offwhite} />
                  </Pressable>
                  <Pressable onPress={() => void media.takeWithCamera()} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('mAddFromCamera')} className="h-10 w-10 items-center justify-center rounded-full bg-brand-card active:opacity-70">
                    <Camera size={18} color={colors.offwhite} />
                  </Pressable>
                </>
              ) : null}
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('mMessagePlaceholder')}
                placeholderTextColor={colors.mutedIcon}
                className="flex-1 rounded-2xl border border-brand-border bg-brand-card px-4 py-2.5 text-brand-offwhite"
                multiline
              />
              {draft.trim().length > 0 || attachUrl ? (
                <Pressable onPress={onSend} disabled={!canSend} accessibilityRole="button" accessibilityLabel={t('send')} className={`h-11 w-11 items-center justify-center rounded-full bg-brand-accent ${canSend ? '' : 'opacity-50'}`}>
                  <Send size={18} color={colors.offwhite} />
                </Pressable>
              ) : (
                <Pressable onPress={onToggleRecord} accessibilityRole="button" accessibilityLabel={t('chatVoiceMessageTitle')} className={`h-11 w-11 items-center justify-center rounded-full ${voice.isRecording ? 'bg-brand-error' : 'bg-brand-accent'}`}>
                  {voice.isRecording ? <Square size={16} color={colors.offwhite} /> : <Mic size={18} color={colors.offwhite} />}
                </Pressable>
              )}
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <MessageActionsSheet
        message={actionsFor}
        myId={myId}
        onClose={() => setActionsFor(null)}
        onReact={(m, emoji) => actions.react.mutate({ id: m.id, emoji })}
        onReply={(m) => { setEditing(null); setReplyTo(m); }}
        onEdit={startEdit}
        onForward={setForwardFor}
        onDelete={(m) => actions.remove.mutate(m.id)}
        onReport={setReportFor}
      />
      <ForwardSheet message={forwardFor} conversationId={id} onClose={() => setForwardFor(null)} />
      {reportFor ? <ReportSheet visible onClose={() => setReportFor(null)} targetType="message" targetId={reportFor.id} evidence={reportFor.text ?? undefined} /> : null}
      <ConversationMenu conversation={menuOpen ? (conversation ?? null) : null} title={title} onClose={() => setMenuOpen(false)} onDeleted={() => router.back()} />
      <PermissionDeniedSheet gate={voice.gate} />
      <PermissionDeniedSheet gate={media.gate} />
    </Screen>
  );
}
