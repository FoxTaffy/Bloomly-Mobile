import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AgeConsentFields } from '@/components/auth/AgeConsentFields';
import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, Screen } from '@/components/ui';
import { useAgeConsent } from '@/hooks/useAgeConsent';
import { useT } from '@/hooks/useT';
import { apiErrorCode, apiErrorMessage } from '@/shared/apiError';
import { usePendingSignup } from '@/stores/pendingSignup';
import { useSession } from '@/stores/session';

/** Возрастная проверка после OAuth или входа без даты рождения (веб: views/OAuthAgeVerificationView.vue). */
export default function AgeVerificationScreen() {
  const { t } = useT();
  const router = useRouter();
  const completeSignup = useSession((s) => s.completeSignup);
  const form = useAgeConsent();
  const [signupToken] = useState(() => usePendingSignup.getState().take());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentalPending, setParentalPending] = useState(false);

  // Токен только в памяти: без него (перезапуск, чужая ссылка) аккаунт не создать — возвращаем ко входу
  useEffect(() => {
    if (!signupToken) router.replace('/(auth)/login');
  }, [signupToken, router]);

  const submit = async () => {
    if (!signupToken) return;
    if (form.validationError) {
      setError(form.validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await completeSignup(signupToken, form.payload());
      if (result === 'parental-pending') setParentalPending(true);
      // 'ok': сессия создана, корневой layout сам откроет онбординг или ленту
    } catch (e) {
      // Включена двухфакторная проверка: в мобильном приложении её экрана пока нет
      setError(apiErrorCode(e) === 'TWO_FACTOR_REQUIRED' ? t('mTwoFactorUnsupported') : apiErrorMessage(e) ?? t('ageVerifFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1">
      <AuroraBackground />
      <Screen transparent keyboard edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8" keyboardShouldPersistTaps="handled">
          <AuthCard>
            {parentalPending ? (
              <View className="gap-4">
                <Text className="font-nunito-extrabold text-xl text-white">{t('ageVerifParentalTitle')}</Text>
                <Text className="font-nunito text-sm leading-5 text-white/75">{t('ageVerifParentalText')}</Text>
                <Button title={t('ageVerifBackToLogin')} variant="secondary" onPress={() => router.replace('/(auth)/login')} />
              </View>
            ) : (
              <View className="gap-5">
                <View>
                  <Text className="font-nunito-extrabold text-xl text-white">{t('ageVerifTitle')}</Text>
                  <Text className="mt-1 font-nunito text-sm text-white/55">{t('ageVerifSubtitle')}</Text>
                </View>
                <AgeConsentFields form={form} />
                {error ? <Text className="font-nunito-bold text-sm text-brand-error">{error}</Text> : null}
                <Button title={t('ageVerifContinue')} loading={busy} onPress={submit} />
              </View>
            )}
          </AuthCard>
        </ScrollView>
      </Screen>
    </View>
  );
}
