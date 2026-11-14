import { Tabs } from 'expo-router';
import { House, Compass, MessageCircle, Grid3x3 } from 'lucide-react-native';
import { useSession } from '../../src/stores/session';
import { Avatar } from '../../src/components/Avatar';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  const user = useSession((s) => s.user);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentMinus,
        tabBarInactiveTintColor: colors.mutedIcon,
        tabBarLabelStyle: { fontFamily: 'Nunito_700Bold', fontSize: 11, marginBottom: 4 },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{ title: 'Главная', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Поиск', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Сообщения', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: 'Группы', tabBarIcon: ({ color, size }) => <Grid3x3 color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => (
            <Avatar uri={user?.avatar_url} name={user?.display_name ?? user?.username} size={28} ring={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
