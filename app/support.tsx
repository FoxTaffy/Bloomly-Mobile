import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronUp, Mail, Search } from 'lucide-react-native';
import { Button, Card, EmptyState, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { useTickets } from '@/hooks/useSupport';
import { useT } from '@/hooks/useT';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { COMPANY_CONTACTS } from '@/shared/legal';
import { FAQ_IDS, searchFaq } from '@/shared/faq';
import { STATUS_KEY } from '@/shared/support';
import type { MessageKey } from '@/shared/i18n';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/** Помощь и поддержка. Веб-аналог: views/HelpView.vue — частые вопросы, мои обращения, контакты (форма обращения — `support/new`). */
export default function SupportScreen() {
  const { t } = useT();
  const router = useRouter();
  const signedIn = useSession((s) => s.isAuthenticated);
  const tickets = useTickets();
  const timeAgo = useTimeAgo();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const items = useMemo(
    () => searchFaq(FAQ_IDS.map((id) => ({ id, q: t(`helpFaqQ${id}` as MessageKey), a: t(`helpFaqA${id}` as MessageKey) })), query),
    [query, t],
  );

  const contacts = [
    { label: t('mSupportContact'), email: COMPANY_CONTACTS.supportEmail },
    { label: t('mSupportPrivacy'), email: COMPANY_CONTACTS.privacyEmail },
    { label: t('mSupportDmca'), email: COMPANY_CONTACTS.dmcaEmail },
  ];

  const header = (
    <View className="gap-3 pb-3">
      <Text className="font-nunito text-sm leading-5 text-brand-muted">{t('mSupportHint')}</Text>
      {signedIn ? <Button title={t('helpFaqAskSupport')} onPress={() => router.push('/support/new' as Href)} /> : null}
      <Field value={query} onChangeText={setQuery} placeholder={t('helpFaqSearchPlaceholder')} icon={<Search size={16} color={colors.mutedIcon} />} autoCapitalize="none" autoCorrect={false} maxLength={100} />
    </View>
  );

  const footer = (
    <View className="mt-4 gap-3">
      {signedIn ? (
        <View className="gap-2">
          <Text className="font-nunito-extrabold text-base text-brand-offwhite">{t('mSupportMyTickets')}</Text>
          {tickets.isLoading ? (
            <Skeleton height={56} />
          ) : tickets.isError ? (
            <ErrorState onRetry={() => tickets.refetch()} />
          ) : (tickets.data ?? []).length === 0 ? (
            <Text className="font-nunito text-sm text-brand-muted">{t('mSupportNoTickets')}</Text>
          ) : (
            (tickets.data ?? []).map((tk) => (
              <Card key={tk.id} padding="sm" className="gap-0.5" onPress={() => router.push(`/support/${tk.id}` as Href)} accessibilityLabel={tk.subject}>
                <Text numberOfLines={1} className="font-nunito-bold text-brand-offwhite">{tk.subject}</Text>
                <Text className="font-nunito text-xs text-brand-muted">{t(STATUS_KEY[tk.status] ?? 'helpStatusOpen')} · {timeAgo(tk.created_at)}</Text>
              </Card>
            ))
          )}
        </View>
      ) : null}
      <Text className="font-nunito-extrabold text-base text-brand-offwhite">{t('mSupportContacts')}</Text>
      {contacts.map((r) => (
        <Card key={r.email} onPress={() => void Linking.openURL(`mailto:${r.email}`)} className="flex-row items-center gap-3" accessibilityLabel={r.email}>
          <Mail size={18} color={colors.accentMinus} />
          <View className="flex-1">
            <Text className="font-nunito-bold text-brand-offwhite">{r.label}</Text>
            <Text className="font-nunito text-xs text-brand-muted">{r.email}</Text>
          </View>
        </Card>
      ))}
      <Text onPress={() => router.push('/legal/terms' as Href)} accessibilityRole="link" className="py-3 text-center font-nunito-bold text-sm text-brand-accent-minus">{t('termsTitle')}</Text>
    </View>
  );

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mSupportTitle')}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerClassName="px-4 pb-8"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => {
          const expanded = open === item.id;
          return (
            <Card padding="sm" className="mb-2" onPress={() => setOpen(expanded ? null : item.id)} accessibilityRole="button" accessibilityState={{ expanded }}>
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 font-nunito-bold text-brand-offwhite">{item.q}</Text>
                {expanded ? <ChevronUp size={16} color={colors.mutedIcon} /> : <ChevronDown size={16} color={colors.mutedIcon} />}
              </View>
              {expanded ? <Text className="mt-2 font-nunito leading-5 text-brand-muted">{item.a}</Text> : null}
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState title={t('helpFaqNothing')} hint={t('helpFaqNothingHint')} />}
      />
    </Screen>
  );
}
