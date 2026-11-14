import { Pressable, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnline } from '@/hooks/useOnline';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme/tokens';

/** Плашка «нет соединения» поверх приложения с кнопкой повтора: перепроверяет сеть и перезапрашивает активные данные. */
export function OfflineBanner() {
  const { t } = useT();
  const online = useOnline();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      className="absolute inset-x-0 flex-row items-center gap-3 bg-brand-warning px-4 pb-2"
      style={{ top: 0, paddingTop: insets.top + 8 }}
    >
      <WifiOff size={16} color={colors.offwhite} />
      <Text className="flex-1 font-nunito-bold text-xs text-brand-offwhite">{t('mOffline')}</Text>
      <Pressable
        onPress={async () => {
          await NetInfo.refresh();
          void qc.refetchQueries({ type: 'active' });
        }}
        accessibilityRole="button"
        hitSlop={8}
        className="rounded-full bg-black/25 px-3 py-1.5"
      >
        <Text className="font-nunito-bold text-xs text-brand-offwhite">{t('retryBtn')}</Text>
      </Pressable>
    </View>
  );
}
