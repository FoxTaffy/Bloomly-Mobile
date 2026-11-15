import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/tokens';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
  /** Кольцо историй уже просмотрено: приглушённое, без градиента. */
  ringSeen?: boolean;
}

const RING_COLORS: [string, string] = [colors.accent, colors.purple];
const RING_SEEN_COLORS: [string, string] = [colors.border, colors.border];

export function Avatar({ uri, name, size = 44, ring = false, ringSeen = false }: AvatarProps) {
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();
  const inner = ring ? size - 6 : size;

  const content = uri ? (
    <Image
      source={{ uri }}
      style={{ width: inner, height: inner, borderRadius: inner / 2 }}
      contentFit="cover"
      transition={150}
    />
  ) : (
    <View
      style={{ width: inner, height: inner, borderRadius: inner / 2 }}
      className="items-center justify-center bg-brand-accent"
    >
      <Text style={{ fontSize: inner * 0.42, fontWeight: '700', color: colors.offwhite }}>{initial}</Text>
    </View>
  );

  if (!ring) return content;

  return (
    <LinearGradient
      colors={ringSeen ? RING_SEEN_COLORS : RING_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: 3 }}
    >
      <View
        style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden' }}
        className="items-center justify-center bg-brand-bg"
      >
        {content}
      </View>
    </LinearGradient>
  );
}
