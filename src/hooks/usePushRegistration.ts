import { useEffect } from 'react';
import { registerForPush } from '@/lib/push';
import { useSession } from '@/stores/session';

/** Регистрирует push-токен после входа. Подключается один раз в корневом layout. */
export function usePushRegistration(): void {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) void registerForPush();
  }, [isAuthenticated]);
}
