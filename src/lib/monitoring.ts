import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { scrubBreadcrumb, scrubEvent } from '@/shared/scrub';

// Мониторинг ошибок. Полностью выключен, пока не задана переменная EXPO_PUBLIC_SENTRY_DSN: SDK не инициализируется,
// ничего не отправляется. Включён — шлёт только обезличенные ошибки и сбои (см. docs/store/DATA_SAFETY.md).
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = !!DSN;

export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    release: Constants.expoConfig?.version,
    // Никаких персональных данных по умолчанию (IP, cookie, заголовки) и никакого пользователя: Sentry.setUser не вызываем
    sendDefaultPii: false,
    // Ни трассировок производительности, ни сессий релиза, ни скриншотов и иерархии экранов
    tracesSampleRate: 0,
    enableAutoSessionTracking: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    maxBreadcrumbs: 30,
    // Последняя линия защиты: токены, почта, id и тексты не должны попасть в событие
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb as never) as typeof crumb | null,
  });
}

/** Оборачивает корневой компонент для перехвата ошибок отрисовки; без DSN возвращает его как есть. */
export function withMonitoring<T extends React.ComponentType<never>>(component: T): T {
  return (monitoringEnabled ? Sentry.wrap(component as never) : component) as T;
}
