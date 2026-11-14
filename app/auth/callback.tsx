import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePendingSignup } from '@/stores/pendingSignup';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export default function OAuthCallbackScreen() {
  const { t } = useT();
  const { token, refreshToken, signup } = useLocalSearchParams<{ token?: string; refreshToken?: string; signup?: string }>();
  const router = useRouter();
  const loginWithToken = useSession((s) => s.loginWithToken);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    // Ссылка bloomly://auth/callback?signup=… (вход начат в этом приложении): продолжаем регистрацию
    if (signup && !token) {
      usePendingSignup.getState().set(signup);
      router.replace('/(auth)/age');
      return;
    }
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loginWithToken(token, refreshToken)
      .then(() => router.replace('/(tabs)/feed'))
      .catch(() => router.replace('/(auth)/login'));
  }, [token, refreshToken, signup, loginWithToken, router]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-brand-bg">
      <Image source={require('../../assets/bloomly-logo.png')} style={{ width: 48, height: 48, opacity: 0.7 }} />
      <ActivityIndicator color={colors.accent} />
      <Text className="text-sm font-medium text-brand-muted">{t('mOauthSigningIn')}</Text>
    </View>
  );
}
