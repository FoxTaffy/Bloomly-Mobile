import { Redirect, type Href } from 'expo-router';
import { entryRoute } from '@/shared/route';
import { useSession } from '@/stores/session';

/** Корень `/` (например, bloomly:///): без него Expo показывает «Unmatched Route». Ведём туда, где пользователь должен быть. */
export default function Index() {
  const hydrated = useSession((s) => s.isHydrated);
  const authenticated = useSession((s) => s.isAuthenticated);
  const needsOnboarding = useSession((s) => s.isAuthenticated && s.user?.onboarding_done === false);
  const target = entryRoute({ hydrated, authenticated, needsOnboarding });
  // Пока сессия не восстановлена, корневой layout держит сплэш и сюда не пускает; проверка — на всякий случай
  if (!target) return null;
  return <Redirect href={target as Href} />;
}
