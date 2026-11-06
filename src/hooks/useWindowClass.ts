import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@/theme/tokens';

export type WindowClass = 'compact' | 'medium' | 'expanded';

// Телефоны (iPhone, Pixel) — compact; Pixel Fold внутри, iPad в портрете — medium; iPad/альбом — expanded.
export function useWindowClass(): WindowClass {
  const { width } = useWindowDimensions();
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}
