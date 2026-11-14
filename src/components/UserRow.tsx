import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { Card } from '@/components/ui';
import type { UserSummary } from '@/shared/api-types';

export function UserRow({ user }: { user: UserSummary }) {
  const router = useRouter();
  return (
    <Card padding="sm" className="mb-3 flex-row items-center gap-3" onPress={() => router.push(`/profile/${user.username}`)}>
      <Avatar uri={user.avatar_url} name={user.display_name ?? user.username} size={44} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Text className="flex-shrink font-nunito-bold text-brand-offwhite" numberOfLines={1}>
            {user.display_name ?? user.username}
          </Text>
          {user.is_verified ? <VerifiedBadge size={14} /> : null}
        </View>
        <Text className="font-nunito text-xs text-brand-muted">@{user.username}</Text>
      </View>
    </Card>
  );
}
