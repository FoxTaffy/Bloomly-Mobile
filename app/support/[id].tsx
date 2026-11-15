import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, SendHorizontal } from 'lucide-react-native';
import { EmptyState, Field, Screen, Skeleton } from '@/components/ui';
import { useReplyTicket, useTickets } from '@/hooks/useSupport';
import { useT } from '@/hooks/useT';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { apiErrorMessage } from '@/shared/apiError';
import { STATUS_KEY } from '@/shared/support';
import { colors } from '@/theme/tokens';

/** Обращение и переписка с поддержкой (веб: SupportTicketCard.vue). Администратор отвечает на сайте; ответ приходит сюда. */
export default function TicketScreen() {
  const { t } = useT();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tickets = useTickets();
  const ticket = (tickets.data ?? []).find((x) => x.id === id);
  const reply = useReplyTicket(id);
  const [draft, setDraft] = useState('');

  const send = () => {
    const text = draft.trim();
    if (!text || reply.isPending) return;
    reply.mutate(text, { onSuccess: () => setDraft('') });
  };

  return (
    <Screen keyboard>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <View className="flex-1">
          <Text numberOfLines={1} className="font-nunito-extrabold text-lg text-brand-offwhite">{ticket?.subject ?? ''}</Text>
          {ticket ? <Text className="font-nunito text-xs text-brand-muted">{t(STATUS_KEY[ticket.status] ?? 'helpStatusOpen')}</Text> : null}
        </View>
      </View>
      {tickets.isLoading ? (
        <View className="px-4 pt-2"><Skeleton height={80} /></View>
      ) : !ticket ? (
        <EmptyState title={t('mNotFoundTitle')} />
      ) : (
        <>
          <FlatList
            data={ticket.messages}
            keyExtractor={(m) => m.id}
            contentContainerClassName="gap-2 px-4 py-3"
            renderItem={({ item }) => {
              const mine = item.sender_type === 'user';
              return (
                <View className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${mine ? 'self-end bg-brand-accent' : 'self-start border border-brand-border bg-brand-card'}`}>
                  {mine ? null : <Text className="mb-0.5 font-nunito-bold text-xs text-brand-accent-minus">{t('mSupportTeam')}</Text>}
                  <Text className="text-brand-offwhite">{item.body}</Text>
                  {item.created_at ? <Text className="mt-1 font-nunito text-xs text-brand-offwhite/60">{timeAgo(item.created_at)}</Text> : null}
                </View>
              );
            }}
          />
          {reply.isError ? <Text className="px-4 pb-1 font-nunito-bold text-xs text-brand-error">{apiErrorMessage(reply.error) ?? t('mSupportSendFailed')}</Text> : null}
          <View className="flex-row items-end gap-2 border-t border-brand-border px-3 py-2">
            <Field value={draft} onChangeText={setDraft} placeholder={t('mSupportReplyPlaceholder')} multiline maxLength={5000} className="flex-1" />
            <Pressable onPress={send} disabled={!draft.trim() || reply.isPending} accessibilityRole="button" accessibilityLabel={t('send')} className={`h-11 w-11 items-center justify-center rounded-full bg-brand-accent ${!draft.trim() || reply.isPending ? 'opacity-50' : ''}`}>
              <SendHorizontal size={18} color={colors.offwhite} />
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}
