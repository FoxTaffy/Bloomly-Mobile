import { Tabs } from 'expo-router';
import { colors } from '@/theme/tokens';

// Нижняя навигация: на iOS и Android одинаковая, высоту и отступ жестовой панели считает библиотека.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accentMinus,
        tabBarInactiveTintColor: colors.offwhite,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Лента' }} />
      <Tabs.Screen name="explore" options={{ title: 'Обзор' }} />
      <Tabs.Screen name="messages" options={{ title: 'Чаты' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
