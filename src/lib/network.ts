import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/** Связывает TanStack Query с состоянием сети: без соединения запросы не ставятся в очередь молча. */
export function setupNetwork(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)),
  );
}
