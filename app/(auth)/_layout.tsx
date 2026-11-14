import { ErrorScreen } from '@/components/ErrorScreen';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/** Ошибка внутри этой группы экранов: экран с повтором, остальное приложение продолжает работать. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} retry={retry} />;
}

export default function AuthLayout() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const onboardingDone = useSession((s) => s.user?.onboarding_done !== false);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.authBg } }}>
      {/* Без сессии: вход и возрастная проверка. С сессией, но без онбординга (как guard на вебе): только онбординг. */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
        <Stack.Screen name="age" />
        <Stack.Screen name="two-factor" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !onboardingDone}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
