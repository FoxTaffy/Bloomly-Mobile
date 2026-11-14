import { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  className?: string;
}

/** Заглушка загрузки: пульсирует прозрачностью. */
export function Skeleton({ width = '100%', height = 16, className }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, opacity }} className={`rounded-xl bg-brand-border ${className ?? ''}`} />;
}
