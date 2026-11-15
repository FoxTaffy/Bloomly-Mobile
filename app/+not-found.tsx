import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Redirect, useRouter, usePathname, type Href } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { Button, Screen } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { entryRoute, isProtectedTarget } from '@/shared/route';
import { usePendingRoute } from '@/stores/pendingRoute';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/**
 * Брендированный экран вместо стандартного «Unmatched Route» для любого неизвестного адреса (bloomly://что-то, https://bloomly.fun/unknown).
 * Защищённый адрес (пост, профиль…) без сессии: запоминаем его, ведём на вход, после входа открываем (см. app/_layout.tsx).
 */
export default function NotFoundScreen() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSession((s) => s.isHydrated);
  const authenticated = useSession((s) => s.isAuthenticated);
  const needsOnboarding = useSession((s) => s.isAuthenticated && s.user?.onboarding_done === false);
  const setPending = usePendingRoute((s) => s.set);

  const target = entryRoute({ hydrated, authenticated, needsOnboarding });
  const deferToLogin = hydrated && !authenticated && isProtectedTarget(pathname);

  useEffect(() => {
    if (deferToLogin) setPending(pathname);
  }, [deferToLogin, pathname, setPending]);

  if (!target) return null;
  if (deferToLogin) return <Redirect href={target as Href} />;

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <SearchX size={44} color={colors.mutedIcon} />
        <Text className="text-center font-nunito-extrabold text-xl text-brand-offwhite">{t('mNotFoundTitle')}</Text>
        <Text className="text-center font-nunito text-sm leading-5 text-brand-muted">{t('mNotFoundHint')}</Text>
        <Button title={t('goHome')} onPress={() => router.replace(target as Href)} className="mt-2" />
      </View>
    </Screen>
  );
}
