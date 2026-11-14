import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Вызывает onActive при возврате на передний план, onBackground — при сворачивании. */
export function useAppState(handlers: { onActive?: () => void; onBackground?: () => void }): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    let prev: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev !== 'active' && next === 'active') ref.current.onActive?.();
      if (prev === 'active' && next !== 'active') ref.current.onBackground?.();
      prev = next;
    });
    return () => sub.remove();
  }, []);
}
