import { View, Pressable, Text } from 'react-native';
import { Screen } from '@/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSession } from '@/stores/session';
import { ProfileContent } from '@/components/ProfileContent';
import { colors } from '@/theme/tokens';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const currentUser = useSession((s) => s.user);
  const isOwn = currentUser?.username === username;

  return (
    <Screen>
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="ml-3 text-base font-bold text-brand-offwhite">@{username}</Text>
      </View>
      <ProfileContent username={username} isOwn={isOwn} />
    </Screen>
  );
}
