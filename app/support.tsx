import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { Card, Screen } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { COMPANY_CONTACTS } from '@/shared/legal';
import { colors } from '@/theme/tokens';

/**
 * Поддержка. Обращения на вебе (/support) требуют входа и ведутся в личном кабинете, поэтому в приложении — контакты
 * по почте (адреса из frontend/src/lib/legal.ts). API тикетов (/support/tickets) в приложении пока не подключён.
 */
export default function SupportScreen() {
  const { t } = useT();
  const router = useRouter();
  const rows = [
    { label: t('mSupportContact'), email: COMPANY_CONTACTS.supportEmail },
    { label: t('mSupportPrivacy'), email: COMPANY_CONTACTS.privacyEmail },
    { label: t('mSupportDmca'), email: COMPANY_CONTACTS.dmcaEmail },
  ];
  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mSupportTitle')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-3 px-4 pb-8 pt-2">
        <Text className="font-nunito text-sm leading-5 text-brand-muted">{t('mSupportHint')}</Text>
        {rows.map((r) => (
          <Card key={r.email} onPress={() => void Linking.openURL(`mailto:${r.email}`)} className="flex-row items-center gap-3" accessibilityRole="link">
            <Mail size={18} color={colors.accentMinus} />
            <View className="flex-1">
              <Text className="font-nunito-bold text-brand-offwhite">{r.label}</Text>
              <Text className="font-nunito text-xs text-brand-muted">{r.email}</Text>
            </View>
          </Card>
        ))}
        <Text onPress={() => router.push('/legal/terms' as Href)} accessibilityRole="link" className="py-3 text-center font-nunito-bold text-sm text-brand-accent-minus">{t('termsTitle')}</Text>
      </ScrollView>
    </Screen>
  );
}
