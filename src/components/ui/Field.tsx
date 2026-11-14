import { Text, TextInput, View, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '@/theme/tokens';

interface FieldProps extends TextInputProps {
  label?: string;
  icon?: ReactNode;
  error?: string | null;
}

/** Поле ввода: рамка brand-border, фон brand-card; ошибка — рамка brand-error. */
export function Field({ label, icon, error, className, ...rest }: FieldProps) {
  return (
    <View className={className}>
      {label ? <Text className="mb-1.5 font-nunito-bold text-xs text-brand-muted">{label}</Text> : null}
      <View
        className={`flex-row items-center gap-2 rounded-2xl border bg-brand-card px-4 ${error ? 'border-brand-error' : 'border-brand-border'}`}
      >
        {icon}
        <TextInput
          placeholderTextColor={colors.mutedIcon}
          className="min-h-11 flex-1 font-nunito text-brand-offwhite"
          accessibilityLabel={label ?? rest.placeholder}
          {...rest}
        />
      </View>
      {error ? <Text className="mt-1 font-nunito text-xs text-brand-error">{error}</Text> : null}
    </View>
  );
}
