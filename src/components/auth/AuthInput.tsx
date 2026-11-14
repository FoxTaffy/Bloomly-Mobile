import { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '@/theme/tokens';

interface AuthInputProps extends TextInputProps {
  icon: ReactNode;
  rightElement?: ReactNode;
}

export function AuthInput({ icon, rightElement, style, ...rest }: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className="flex-row items-center rounded-2xl border px-4"
      style={{
        borderColor: focused ? colors.accentFocusBorder : colors.white08,
        backgroundColor: focused ? colors.accentFocusBg : colors.white04,
      }}
    >
      {icon}
      <TextInput
        placeholderTextColor={colors.white20}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        className="ml-3 flex-1 font-nunito-semibold text-[14px] text-white"
        style={[{ paddingVertical: 14 }, style]}
        {...rest}
      />
      {rightElement}
    </View>
  );
}
