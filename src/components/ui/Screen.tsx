import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { children: ReactNode; edges?: ('top' | 'bottom')[]; className?: string };

// Корневая обёртка каждого экрана. Android 15+ (Pixel) рисует приложение edge-to-edge,
// поэтому отступы под статус-бар, вырез и жестовую панель берём из insets, а не константами.
export function Screen({ children, edges = ['top', 'bottom'], className = '' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-brand-bg ${className}`}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}
