import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { webPathToRoute } from '@/shared/links';
import { useSession } from '@/stores/session';

/** Нажатие на push открывает нужный экран: `data.url` бэкенда (/messages?c=…, /notifications) → маршрут приложения. */
export function usePushNavigation(): void {
  const router = useRouter();
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!isAuthenticated || !last) return;
    if (last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = (last.notification.request.content.data as { url?: string } | undefined)?.url;
    const route = webPathToRoute(url);
    if (route) router.push(route as Href);
  }, [last, isAuthenticated, router]);
}
