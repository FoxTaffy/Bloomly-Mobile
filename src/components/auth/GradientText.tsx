import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextStyle, StyleProp } from 'react-native';
import { colors as palette } from '../../theme/tokens';

interface GradientTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  colors?: [string, string, ...string[]];
}

export function GradientText({ children, style, colors = [palette.periwinkle, palette.purple, palette.pink] }: GradientTextProps) {
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
