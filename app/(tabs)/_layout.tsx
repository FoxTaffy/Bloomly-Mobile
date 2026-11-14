import { Tabs, useRouter } from 'expo-router';
import { House, Compass, MessageCircle, Grid3x3, Plus } from 'lucide-react-native';
import { useSession } from '@/stores/session';
import { useUnreadMessages } from '@/hooks/useMessages';
import { View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

export default function TabsLayout() {
  const { t } = useT();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const unread = useUnreadMessages();

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
        options={{ title: t('home'), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: t('mSearchTitle'), tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('composerCreateBtn'),
          tabBarIcon: ({ size }) => (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-accent">
              <Plus color={colors.offwhite} size={size} />
            </View>
          ),
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: t('composerCreateBtn'),
        }}
        listeners={{
          // Не вкладка, а действие: открываем экран создания поста поверх вкладок
          tabPress: (e) => {
            e.preventDefault();
            router.push('/create-post');
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('messages'), tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined, tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.offwhite, fontFamily: 'Nunito_700Bold' }, tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: t('groups'), tabBarIcon: ({ color, size }) => <Grid3x3 color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ focused }) => (
            <Avatar uri={user?.avatar_url} name={user?.display_name ?? user?.username} size={28} ring={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
