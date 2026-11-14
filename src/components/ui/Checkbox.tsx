import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Подпись; ссылки внутри — вложенные <Text onPress>. */
  children: ReactNode;
  label: string;
}

/** Флажок с подписью. Состояние читается скринридером через accessibilityState.checked. */
export function Checkbox({ checked, onChange, children, label }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      className="min-h-11 flex-row items-start gap-3 py-1.5"
    >
      <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${checked ? 'border-brand-accent bg-brand-accent' : 'border-brand-border bg-brand-card'}`}>
        {checked ? <Check size={14} color={colors.offwhite} /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
