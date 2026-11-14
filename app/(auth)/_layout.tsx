import { Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.authBg } }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
