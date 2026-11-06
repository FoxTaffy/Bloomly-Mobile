import { Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';

// Заглушка под вёрстку: веб-аналог — frontend/src/views/ExploreView.vue
export default function ExploreScreen() {
  return (
    <Screen edges={['top']} className="items-center justify-center">
      <Text className="font-nunito-bold text-xl text-brand-offwhite">Обзор</Text>
    </Screen>
  );
}
