import { View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <View>
      <BadgeCheck size={size} color={colors.accent} fill={colors.accentMinus} />
    </View>
  );
}
