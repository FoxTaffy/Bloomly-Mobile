import { Stack } from 'expo-router';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

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
