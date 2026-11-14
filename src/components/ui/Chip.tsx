import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** Переключатель-«пилюля» (сортировка, период, вкладки). Состояние — через accessibilityState.selected. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-9 justify-center rounded-full border px-4 active:opacity-80 ${selected ? 'border-brand-accent bg-brand-accent-plus-plus' : 'border-brand-border bg-brand-card'}`}
    >
      <Text className={`font-nunito-bold text-sm ${selected ? 'text-brand-accent-minus' : 'text-brand-muted'}`}>{label}</Text>
    </Pressable>
  );
}
