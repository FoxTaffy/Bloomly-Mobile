import { Text, View } from 'react-native';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, hint, icon, action }: EmptyStateProps) {
  return (
    <View className="items-center px-8 py-12">
      {icon ? <View className="mb-3">{icon}</View> : null}
      <Text className="text-center font-nunito-bold text-base text-brand-offwhite">{title}</Text>
      {hint ? <Text className="mt-1 text-center font-nunito text-sm text-brand-muted">{hint}</Text> : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
