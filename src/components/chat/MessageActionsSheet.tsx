import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Sheet } from '@/components/ui';
import { useBlockStatus, useToggleBlock } from '@/hooks/useProfile';
import { useT } from '@/hooks/useT';
import type { Message } from '@/shared/api-types';
import { canEdit, canForward, QUICK_REACTIONS } from '@/shared/chat';

interface Props {
  message: Message | null;
  myId?: string | null;
  onClose: () => void;
  onReact: (m: Message, emoji: string) => void;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onForward: (m: Message) => void;
  onDelete: (m: Message) => void;
  onReport: (m: Message) => void;
}

/** Меню сообщения по долгому нажатию (веб: ChatMessageMenu + панель реакций). Своё: правка (24 ч), удаление; чужое: жалоба, блок. */
export function MessageActionsSheet({ message: m, myId, onClose, onReact, onReply, onEdit, onForward, onDelete, onReport }: Props) {
  const { t } = useT();
  const mine = !!m && m.sender_id === myId;
  const authorId = m && !mine && m.type !== 'system' ? m.sender_id : undefined;
  const block = useToggleBlock(authorId ?? '');
  const blockStatus = useBlockStatus(authorId, !!m);
  const [failed, setFailed] = useState(false);
  const blocked = !!blockStatus.data;

  const run = (fn: (m: Message) => void) => () => {
    if (!m) return;
    onClose();
    fn(m);
  };
  const confirmDelete = () =>
    m &&
    Alert.alert(t('mDeleteMessageTitle'), t('mDeleteHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('mDelete'), style: 'destructive', onPress: run(onDelete) },
    ]);

  return (
    <Sheet visible={!!m} title={t('mMessageActions')} onClose={() => { setFailed(false); onClose(); }}>
      {m ? (
        <View className="gap-2 pb-2">
          <View className="mb-1 flex-row flex-wrap justify-between gap-1">
            {QUICK_REACTIONS.map((e) => (
              <Pressable key={e} onPress={run((x) => onReact(x, e))} accessibilityRole="button" accessibilityLabel={e} className="h-11 w-11 items-center justify-center rounded-full bg-brand-bg active:opacity-70">
                <Text className="text-xl">{e}</Text>
              </Pressable>
            ))}
          </View>
          <Button title={t('reply')} variant="secondary" onPress={run(onReply)} />
          {canEdit(m, myId) ? <Button title={t('mEdit')} variant="secondary" onPress={run(onEdit)} /> : null}
          {canForward(m) ? <Button title={t('mForward')} variant="secondary" onPress={run(onForward)} /> : null}
          {mine ? (
            <Button title={t('mDelete')} variant="secondary" onPress={confirmDelete} />
          ) : (
            <>
              <Button title={t('report')} variant="secondary" onPress={run(onReport)} />
              {authorId ? (
                <Button
                  title={blocked ? t('mUnblockUser') : t('blockUserBtn')}
                  variant="secondary"
                  loading={block.isPending}
                  onPress={() => block.mutate(blocked, { onSuccess: onClose, onError: () => setFailed(true) })}
                />
              ) : null}
            </>
          )}
          {failed ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
        </View>
      ) : null}
    </Sheet>
  );
}
