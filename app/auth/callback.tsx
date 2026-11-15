import { useCallback, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { usePendingMfa } from '@/stores/pendingMfa';
import { usePendingSignup } from '@/stores/pendingSignup';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export default function OAuthCallbackScreen() {
  const { t } = useT();
  const { token, refreshToken, signup, mfaToken, method } = useLocalSearchParams<{ token?: string; refreshToken?: string; signup?: string; mfaToken?: string; method?: string }>();
  const router = useRouter();
  const loginWithToken = useSession((s) => s.loginWithToken);
  const handled = useRef(false);
  const isAuthenticated = useSession((s) => s.isAuthenticated);

  // Экран остаётся в стеке под экраном 2FA: когда сессия появилась (вход завершён где угодно), уходим с него,
  // иначе после успешного кода пользователь застревает на «Входим через OAuth…».
  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  // Страховка: если экран в фокусе 10 секунд и никуда не ушли (навигация потерялась), возвращаем на вход, а не оставляем спиннер.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (!useSession.getState().isAuthenticated) router.replace('/(auth)/login');
      }, 10_000);
      return () => clearTimeout(timer);
    }, [router]),
  );

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    // Ссылка bloomly://auth/callback?signup=… (вход начат в этом приложении): продолжаем регистрацию
    if (signup && !token) {
      usePendingSignup.getState().set(signup);
      router.replace('/(auth)/age');
      return;
    }
    // 2FA после OAuth: продолжаем на экране второго фактора
    if (mfaToken && !token) {
      usePendingMfa.getState().set({ mfaToken, method: method ?? null, email: '', remember: true });
      router.replace('/(auth)/two-factor');
      return;
    }
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loginWithToken(token, refreshToken)
      .then(() => router.replace('/(tabs)/feed'))
      .catch(() => router.replace('/(auth)/login'));
  }, [token, refreshToken, signup, mfaToken, method, loginWithToken, router]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-brand-bg">
      <Image source={require('../../assets/bloomly-logo.png')} style={{ width: 48, height: 48, opacity: 0.7 }} />
      <ActivityIndicator color={colors.accent} />
      <Text className="text-sm font-medium text-brand-muted">{t('mOauthSigningIn')}</Text>
    </View>
  );
}
