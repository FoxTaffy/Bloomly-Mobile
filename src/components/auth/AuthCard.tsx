import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { colors } from '../../theme/tokens';

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.white08,
        shadowColor: colors.black,
        shadowOpacity: 0.5,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 16 },
        elevation: 12,
      }}
    >
      <BlurView intensity={40} tint="dark">
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.authBgGlass }}
        />
        <View style={{ padding: 28 }}>{children}</View>
      </BlurView>
    </View>
  );
}
