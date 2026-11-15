import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { EmptyState, Sheet, Skeleton } from '@/components/ui';
import { useMessageActions } from '@/hooks/useChatActions';
import { useConversations } from '@/hooks/useConversations';
import { useT } from '@/hooks/useT';
import type { Conversation, Message } from '@/shared/api-types';
import { conversationTitle, otherUser } from '@/shared/chat';
import { useSession } from '@/stores/session';

/** Переслать сообщение в другую беседу (веб: ChatForwardModal). Рабочие чаты заказов не показываем. */
export function ForwardSheet({ message, conversationId, onClose }: { message: Message | null; conversationId: string; onClose: () => void }) {
  const { t } = useT();
  const myId = useSession((s) => s.user?.id);
  const list = useConversations();
  const { forward } = useMessageActions(conversationId);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const targets = (list.data ?? []).filter((c) => c.type !== 'order' && !c.read_only_at);

  const send = (c: Conversation) => {
    if (!message || forward.isPending) return;
    setFailed(false);
    forward.mutate({ id: message.id, to: c.id }, { onSuccess: () => setDone(c.id), onError: () => setFailed(true) });
  };
  const close = () => {
    setDone(null);
    setFailed(false);
    onClose();
  };

  return (
    <Sheet visible={!!message} title={t('mForward')} onClose={close}>
      <View className="max-h-96 pb-2">
        {list.isLoading ? (
          <Skeleton height={48} />
        ) : targets.length === 0 ? (
          <EmptyState title={t('mNoDialogs')} />
        ) : (
          <FlatList
            data={targets}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => {
              const title = conversationTitle(item, myId, t('chatGroupFallbackName'));
              const avatar = item.is_group ? item.avatar_url : otherUser(item, myId)?.avatar_url;
              return (
                <Pressable onPress={() => send(item)} disabled={forward.isPending || done === item.id} accessibilityRole="button" className="flex-row items-center gap-3 py-2 active:opacity-70">
                  <Avatar uri={avatar} name={title} size={40} />
                  <Text numberOfLines={1} className="flex-1 font-nunito-bold text-brand-offwhite">{title}</Text>
                  {done === item.id ? <Text className="font-nunito-bold text-xs text-brand-success">{t('mForwarded')}</Text> : null}
                </Pressable>
              );
            }}
          />
        )}
        {failed ? <Text className="mt-2 font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
      </View>
    </Sheet>
  );
}
