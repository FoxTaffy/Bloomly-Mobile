import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Snowflake, Wrench } from 'lucide-react-native';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useAppStatus } from '@/stores/appStatus';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

/** Поверх всего приложения: режим обслуживания (503 MAINTENANCE) и замороженный аккаунт (403 ACCOUNT_FROZEN). */
export function AppStatusGate() {
  const queryClient = useQueryClient();
  const maintenance = useAppStatus((s) => s.maintenance);
  const frozenMessage = useAppStatus((s) => s.frozenMessage);
  const setMaintenance = useAppStatus((s) => s.setMaintenance);
  const setFrozen = useAppStatus((s) => s.setFrozen);
  const logout = useSession((s) => s.logout);

  if (frozenMessage === null && !maintenance) return null;

  return (
    <View style={StyleSheet.absoluteFill} className="bg-brand-bg">
      <Screen edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          {frozenMessage !== null ? (
            <EmptyState
              icon={<Snowflake size={36} color={colors.accentMinus} />}
              title="Аккаунт заморожен"
              hint={frozenMessage || 'Обратитесь в поддержку на сайте.'}
              action={
                <Button
                  title="Выйти"
                  variant="secondary"
                  onPress={async () => {
                    await logout();
                    setFrozen(null);
                  }}
                />
              }
            />
          ) : (
            <EmptyState
              icon={<Wrench size={36} color={colors.accentMinus} />}
              title="Платформа на обслуживании"
              hint="Скоро всё заработает. Попробуйте чуть позже."
              action={
                <Button
                  title="Повторить"
                  onPress={() => {
                    setMaintenance(false);
                    queryClient.invalidateQueries();
                  }}
                />
              }
            />
          )}
        </View>
      </Screen>
    </View>
  );
}
