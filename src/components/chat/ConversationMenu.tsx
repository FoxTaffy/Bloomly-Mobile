import { Alert, Text, View } from 'react-native';
import { Button, Sheet } from '@/components/ui';
import { useConversationActions } from '@/hooks/useChatActions';
import { useT } from '@/hooks/useT';
import type { Conversation } from '@/shared/api-types';
import { isArchived, isMuted, isPinned, MUTE_OPTIONS } from '@/shared/chat';

/** Действия с беседой (веб: ConvMenu): закрепить, без звука на срок, архив, удалить у себя. */
export function ConversationMenu({ conversation: c, title, onClose, onDeleted }: { conversation: Conversation | null; title: string; onClose: () => void; onDeleted?: () => void }) {
  const { t } = useT();
  const act = useConversationActions();
  const failed = act.pin.isError || act.mute.isError || act.archive.isError || act.remove.isError;

  const done = { onSuccess: onClose };
  const confirmDelete = () =>
    c &&
    Alert.alert(t('mDeleteChatTitle'), t('mDeleteChatHint'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('mDelete'), style: 'destructive', onPress: () => act.remove.mutate(c.id, { onSuccess: () => { onClose(); onDeleted?.(); } }) },
    ]);

  return (
    <Sheet visible={!!c} title={title} onClose={onClose}>
      {c ? (
        <View className="gap-2 pb-2">
          <Button title={isPinned(c) ? t('mChatUnpin') : t('mChatPin')} variant="secondary" loading={act.pin.isPending} onPress={() => act.pin.mutate({ id: c.id, pinned: !isPinned(c) }, done)} />
          {isMuted(c) ? (
            <Button title={t('mChatUnmute')} variant="secondary" loading={act.mute.isPending} onPress={() => act.mute.mutate({ id: c.id, until: null }, done)} />
          ) : (
            <>
              <Text className="mt-1 font-nunito-bold text-xs text-brand-muted">{t('mChatMute')}</Text>
              {MUTE_OPTIONS.map((o) => (
                <Button key={o.key} title={t(o.key)} variant="secondary" loading={act.mute.isPending} onPress={() => act.mute.mutate({ id: c.id, until: new Date(Date.now() + o.ms).toISOString() }, done)} />
              ))}
            </>
          )}
          <Button title={isArchived(c) ? t('mChatUnarchive') : t('mChatArchive')} variant="secondary" loading={act.archive.isPending} onPress={() => act.archive.mutate({ id: c.id, archived: !isArchived(c) }, done)} />
          <Button title={t('mDelete')} variant="secondary" onPress={confirmDelete} />
          {failed ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
        </View>
      ) : null}
    </Sheet>
  );
}
