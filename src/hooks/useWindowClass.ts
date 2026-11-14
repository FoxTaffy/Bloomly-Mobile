import { useWindowDimensions } from 'react-native';

export type WindowClass = 'compact' | 'medium' | 'expanded';

export const MEDIUM_MIN = 600;
export const EXPANDED_MIN = 840;

export function windowClassOf(width: number): WindowClass {
  if (width >= EXPANDED_MIN) return 'expanded';
  if (width >= MEDIUM_MIN) return 'medium';
  return 'compact';
}

/** Класс ширины окна: compact < 600 ≤ medium < 840 ≤ expanded. Раскладка зависит от него, а не от Platform.OS. */
export function useWindowClass(): WindowClass {
  const { width } = useWindowDimensions();
  return windowClassOf(width);
}
