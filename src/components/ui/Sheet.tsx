import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme/tokens';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Нижний лист: оболочка модалки как CreateGroupModal на вебе (затемнение, карточка brand-card, закрытие, крупный заголовок). */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    // onRequestClose: системный жест «назад» на Android закрывает лист
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel={t('mClose')} />
        <View className="rounded-t-3xl border border-brand-border bg-brand-card px-4 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-nunito-extrabold text-xl text-brand-offwhite">{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('mClose')} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-xl bg-brand-bg">
              <X size={16} color={colors.mutedIcon} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
