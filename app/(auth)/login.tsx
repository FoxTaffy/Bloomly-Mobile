import { Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';

// Заглушка под вёрстку: веб-аналог — frontend/src/views/LoginView.vue
export default function Login() {
  return (
    <Screen className="items-center justify-center">
      <Text className="font-nunito-bold text-xl text-brand-offwhite">Вход</Text>
    </Screen>
  );
}
