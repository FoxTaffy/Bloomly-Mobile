import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { colors } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

const BOX: Record<Variant, string> = {
  primary: 'bg-brand-accent',
  secondary: 'border border-brand-border bg-brand-card',
  ghost: 'bg-transparent',
};
const TEXT: Record<Variant, string> = {
  primary: 'text-brand-offwhite',
  secondary: 'text-brand-offwhite',
  ghost: 'text-brand-accent-minus',
};

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading = false, disabled, className, ...rest }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: loading }}
      disabled={off}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3 active:opacity-80 ${BOX[variant]} ${off ? 'opacity-50' : ''} ${className ?? ''}`}
      {...rest}
    >
      {loading ? <ActivityIndicator size="small" color={colors.offwhite} /> : null}
      <Text className={`font-nunito-bold text-sm ${TEXT[variant]}`}>{title}</Text>
    </Pressable>
  );
}
