import { Text, View } from 'react-native';
import { Button, Sheet } from '@/components/ui';
import type { PermissionGate } from '@/hooks/usePermissionGate';
import { useT } from '@/hooks/useT';

/** Объяснение после отказа в разрешении: зачем оно нужно и как выдать его в настройках системы. */
export function PermissionDeniedSheet({ gate }: { gate: PermissionGate }) {
  const { t } = useT();
  const kind = gate.deniedKind;
  return (
    <Sheet visible={kind !== null} title={kind === 'camera' ? t('mPermCameraTitle') : t('mPermMicTitle')} onClose={gate.dismiss}>
      <View className="gap-3 pb-2">
        <Text className="font-nunito text-sm leading-5 text-brand-muted">{kind === 'camera' ? t('mPermCameraHint') : t('mPermMicHint')}</Text>
        <Button title={t('mPermOpenSettings')} onPress={() => void gate.openSettings()} />
        <Button title={t('mClose')} variant="secondary" onPress={gate.dismiss} />
      </View>
    </Sheet>
  );
}
