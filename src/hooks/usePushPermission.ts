import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPush } from '@/lib/push';
import { useAppState } from '@/hooks/useAppState';

/** Системное разрешение на уведомления. После «отказано навсегда» открываем настройки системы. */
export function usePushPermission() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [canAsk, setCanAsk] = useState(true);

  const refresh = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync();
    setGranted(p.status === 'granted');
    setCanAsk(p.canAskAgain);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  // Вернулись из системных настроек
  useAppState({ onActive: () => void refresh() });

  const request = useCallback(async () => {
    if (!canAsk) {
      await Linking.openSettings();
      return;
    }
    await registerForPush();
    await refresh();
  }, [canAsk, refresh]);

  return { granted, canAsk, request };
}
