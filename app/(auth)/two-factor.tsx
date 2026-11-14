import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, KeyRound, ShieldCheck } from 'lucide-react-native';
import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, Field, Screen } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { apiErrorMessage } from '@/shared/apiError';
import { usePendingMfa } from '@/stores/pendingMfa';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

const SUPPORTED = ['totp', 'email'];

/** Второй шаг входа с 2FA (веб: LoginView, режим twofactor). Способы: приложение-аутентификатор (totp) и код на почту (email). */
export default function TwoFactorScreen() {
  const { t } = useT();
  const router = useRouter();
  const pending = usePendingMfa((s) => s.pending);
  const verifyTwoFactor = useSession((s) => s.verifyTwoFactor);
  const resendTwoFactor = useSession((s) => s.resendTwoFactor);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(pending?.method === 'email' ? 60 : 0);

  // Без токена второго шага (перезапуск приложения) продолжать нечем
  useEffect(() => {
    if (!pending?.mfaToken) router.replace('/(auth)/login');
  }, [pending, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  if (!pending?.mfaToken) return null;
  const supported = !!pending.method && SUPPORTED.includes(pending.method);
  const isEmail = pending.method === 'email';

  const back = () => {
    usePendingMfa.getState().set(null);
    router.replace('/(auth)/login');
  };

  const submit = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTwoFactor(pending.mfaToken, code, pending.remember);
      usePendingMfa.getState().set(null); // дальше корневой layout сам откроет приложение
    } catch (e) {
      setError(apiErrorMessage(e) ?? t('mSomethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    try {
      await resendTwoFactor(pending.mfaToken);
      setCountdown(60);
    } catch (e) {
      setError(apiErrorMessage(e) ?? t('mSomethingWrong'));
    }
  };

  return (
    <View className="flex-1">
      <AuroraBackground />
      <Screen transparent keyboard edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8" keyboardShouldPersistTaps="handled">
          <AuthCard>
            <Pressable onPress={back} accessibilityRole="button" className="mb-4 flex-row items-center gap-1.5 self-start py-1">
              <ChevronLeft size={14} color={colors.white35} />
              <Text className="font-nunito-semibold text-xs text-white/35">{t('loginBackToLoginBtn')}</Text>
            </Pressable>

            <Text className="font-nunito-extrabold text-2xl text-white">{t('loginTwoFactorHeading')}</Text>

            {supported ? (
              <View className="mt-4 gap-3.5">
                <Text className="font-nunito text-sm text-white/60">{pending.method === 'totp' ? t('loginTwoFactorTotpHint') : t('loginTwoFactorEmailHint')}</Text>
                <View className="flex-row items-center gap-2.5 rounded-2xl border border-brand-success/30 bg-brand-success/10 p-3.5">
                  <ShieldCheck size={16} color={colors.success} />
                  <Text className="flex-1 font-nunito-bold text-xs text-brand-success">
                    {pending.method === 'totp' ? t('loginTwoFactorTotpCodeLabel') : `${t('loginCodeSentToLabel')} ${pending.email || t('loginYourEmailFallback')}`}
                  </Text>
                </View>
                <Field
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D+/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  icon={<KeyRound size={17} color={colors.white35} />}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                  onSubmitEditing={submit}
                />
                {isEmail ? (
                  <Pressable onPress={resend} disabled={countdown > 0} accessibilityRole="button" className="self-end py-1">
                    <Text className={`font-nunito-bold text-xs ${countdown > 0 ? 'text-white/20' : 'text-brand-success'}`}>
                      {countdown > 0 ? t('mResendIn', { n: countdown }) : t('loginResendCode')}
                    </Text>
                  </Pressable>
                ) : null}
                {error ? <Text className="font-nunito-bold text-sm text-brand-error">{error}</Text> : null}
                <Button title={t('loginConfirmLoginBtn')} loading={busy} disabled={code.length < 6} onPress={submit} />
              </View>
            ) : (
              // Способ второго фактора, которого приложение не знает: честно говорим об этом и не пытаемся угадывать
              <View className="mt-4 gap-4">
                <Text className="font-nunito text-sm leading-5 text-brand-error">{t('mTwoFactorUnsupported')}</Text>
                <Button title={t('loginBackToLoginBtn')} variant="secondary" onPress={back} />
              </View>
            )}
          </AuthCard>
        </ScrollView>
      </Screen>
    </View>
  );
}
