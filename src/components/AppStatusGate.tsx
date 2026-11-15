import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Snowflake, Wrench } from 'lucide-react-native';
import { requestUnfreeze, verifyUnfreeze } from '@/api/account';
import { Button, EmptyState, Field, Screen } from '@/components/ui';
import { apiErrorMessage } from '@/shared/apiError';
import { useAppStatus } from '@/stores/appStatus';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

/** Поверх всего приложения: режим обслуживания (503 MAINTENANCE) и замороженный аккаунт (403 ACCOUNT_FROZEN). */
export function AppStatusGate() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const maintenance = useAppStatus((s) => s.maintenance);
  const frozenMessage = useAppStatus((s) => s.frozenMessage);
  const setMaintenance = useAppStatus((s) => s.setMaintenance);
  const setFrozen = useAppStatus((s) => s.setFrozen);
  const logout = useSession((s) => s.logout);
  const email = useSession((s) => s.user?.email);
  const loginWithToken = useSession((s) => s.loginWithToken);
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Разморозка: код на почту аккаунта → подтверждение возвращает вход (веб: LoginView, requestUnfreeze / confirmUnfreeze)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(apiErrorMessage(e) ?? t('mActionFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (frozenMessage === null && !maintenance) return null;

  return (
    <View style={StyleSheet.absoluteFill} className="bg-brand-bg">
      <Screen edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          {frozenMessage !== null ? (
            <EmptyState
              icon={<Snowflake size={36} color={colors.accentMinus} />}
              title={t('profileFrozenAccountBadgeTitle')}
              hint={frozenMessage || t('mContactSupport')}
              action={
                <View className="w-full gap-2 px-6">
                  {email ? (
                    step === 'idle' ? (
                      <Button title={t('mUnfreezeBtn')} loading={busy} onPress={() => run(async () => { await requestUnfreeze(email); setStep('code'); })} />
                    ) : (
                      <>
                        <Field value={code} onChangeText={setCode} placeholder={t('mSecurityCode')} keyboardType="number-pad" maxLength={8} />
                        <Button
                          title={t('mSecurityConfirm')}
                          loading={busy}
                          disabled={code.trim().length < 4}
                          onPress={() =>
                            run(async () => {
                              const r = await verifyUnfreeze(email, code.trim());
                              await loginWithToken(r.token, r.refreshToken);
                              setFrozen(null);
                              setStep('idle');
                              setCode('');
                              queryClient.invalidateQueries();
                            })
                          }
                        />
                      </>
                    )
                  ) : null}
                  {error ? <Text className="text-center font-nunito text-xs text-brand-error">{error}</Text> : null}
                  <Button
                    title={t('mLogout')}
                    variant="secondary"
                    onPress={async () => {
                      await logout();
                      setFrozen(null);
                    }}
                  />
                </View>
              }
            />
          ) : (
            <EmptyState
              icon={<Wrench size={36} color={colors.accentMinus} />}
              title={t('mMaintenanceTitle')}
              hint={t('mMaintenanceHint')}
              action={
                <Button
                  title={t('retryBtn')}
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
