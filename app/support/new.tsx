import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button, Chip, Field, Screen } from '@/components/ui';
import { useCreateTicket } from '@/hooks/useSupport';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';
import { canSubmitTicket, SUBJECT_MAX, TICKET_TYPES, TYPE_KEY } from '@/shared/support';
import type { TicketType } from '@/api/support';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/** Новое обращение в поддержку. Веб-аналог: components/support/SupportTicketForm.vue (без вложений). */
export default function NewTicketScreen() {
  const { t } = useT();
  const router = useRouter();
  const email = useSession((s) => s.user?.email);
  const create = useCreateTicket();
  const [type, setType] = useState<TicketType>('question');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const ok = canSubmitTicket(subject, message);

  const submit = () =>
    ok &&
    create.mutate(
      { type, subject: subject.trim(), message: message.trim(), contact_email: email, ...(type === 'bug' ? { device: 'mobile' as const } : {}) },
      { onSuccess: () => router.back() },
    );

  return (
    <Screen keyboard>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('helpFaqAskSupport')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-2" keyboardShouldPersistTaps="handled">
        <View className="flex-row flex-wrap gap-2">
          {TICKET_TYPES.map((x) => <Chip key={x} label={t(TYPE_KEY[x])} selected={type === x} onPress={() => setType(x)} />)}
        </View>
        <Field value={subject} onChangeText={setSubject} placeholder={t('mSupportSubject')} maxLength={SUBJECT_MAX} />
        <Field value={message} onChangeText={setMessage} placeholder={t('mSupportMessage')} multiline maxLength={5000} />
        {create.isError ? <Text className="font-nunito-bold text-sm text-brand-error">{apiErrorMessage(create.error) ?? t('mSupportSendFailed')}</Text> : null}
        <Button title={t('send')} loading={create.isPending} disabled={!ok} onPress={submit} />
        <Text className="font-nunito text-xs text-brand-muted">{t('mSupportReplyHint')}</Text>
      </ScrollView>
    </Screen>
  );
}
