import { Pressable, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';

const PADDING = { none: '', sm: 'p-3', md: 'p-4' } as const;

interface CardProps extends ViewProps {
  children: ReactNode;
  padding?: keyof typeof PADDING;
  onPress?: () => void;
}

/** Карточка бренда: bg-brand-card, рамка brand-border, радиус 2xl. */
export function Card({ children, padding = 'md', onPress, className, ...rest }: CardProps) {
  const cls = `rounded-2xl border border-brand-border bg-brand-card ${PADDING[padding]} ${className ?? ''}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${cls} active:opacity-90`} {...(rest as object)}>
        {children}
      </Pressable>
    );
  }
  return (
    <View className={cls} {...rest}>
      {children}
    </View>
  );
}
