import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Card } from '@/components/ui';
import type { Group } from '@/shared/api-types';

export function GroupRow({
  group,
  actionLabel,
  onAction,
  onPress,
}: {
  group: Group;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
}) {
  return (
    <Card padding="sm" onPress={onPress} className="mb-3 flex-row items-center gap-3">
      <Avatar uri={group.avatar_url} name={group.name} size={48} />
      <View className="flex-1">
        <Text className="font-bold text-brand-offwhite" numberOfLines={1}>
          {group.name}
        </Text>
        <Text className="text-xs text-brand-muted">{group.member_count.toLocaleString('ru-RU')} участников</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} className="rounded-full bg-brand-accent-plus-plus px-4 py-2">
          <Text className="text-sm font-bold text-brand-accent-minus">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
