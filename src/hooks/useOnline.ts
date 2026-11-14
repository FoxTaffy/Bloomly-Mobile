import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

/** Есть ли сеть (по NetInfo через onlineManager). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
