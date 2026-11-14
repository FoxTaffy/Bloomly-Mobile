import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, TriangleAlert } from 'lucide-react-native';
import { Button, Card, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { useT } from '@/hooks/useT';
import { apiErrorCode, apiErrorMessage } from '@/shared/apiError';
import { colors } from '@/theme/tokens';

/** Удаление аккаунта. Веб-аналог: SettingsDangerSection.vue. Пароль и/или код — как требует сервер; OAuth-аккаунт без пароля подтверждает кодом из письма. */
export default function DeleteAccountScreen() {
  const { t } = useT();
  const router = useRouter();
  const { requirements, sendCode, remove } = useDeleteAccount();
  const need = requirements.data;

  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const ready =
    confirmText.trim() === t('deleteWord') && !!need && (!need.password || !!password) && (!need.code || !!code.trim());

  const onSendCode = () =>
    sendCode.mutate(undefined, {
      onSuccess: () => setMessage({ text: t('delAccountCodeSent'), error: false }),
      onError: (e) => setMessage({ text: apiErrorMessage(e) ?? t('settingsProfileDeleteError'), error: true }),
    });

  const onDelete = () => {
    if (!ready || remove.isPending) return;
    setMessage(null);
    remove.mutate(
      { password: password || undefined, code: code.trim() || undefined },
      {
        // OPEN_DEALS: есть заказы с удержанной оплатой; текст объясняет, что сделать (приходит с сервера)
        onError: (e) => setMessage({ text: apiErrorMessage(e) ?? (apiErrorCode(e) === 'OPEN_DEALS' ? t('mDeleteOpenDeals') : t('settingsProfileDeleteError')), error: true }),
      },
    );
  };

  return (
    <Screen keyboard>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('deleteAccountModalTitle')}</Text>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <Card className="gap-2 border-brand-error">
          <View className="flex-row items-center gap-2">
            <TriangleAlert size={18} color={colors.error} />
            <Text className="font-nunito-extrabold text-base text-brand-error">{t('deleteAccountTitle')}</Text>
          </View>
          <Text className="font-nunito text-sm leading-5 text-brand-offwhite">
            {t('deleteModalDescPre')} <Text className="font-nunito-extrabold text-brand-error">{t('deleteModalDescHighlight')}</Text>
            {t('deleteModalDescPost')}
          </Text>
          <Text className="font-nunito text-sm leading-5 text-brand-muted">{t('mDeleteConsequences')}</Text>
        </Card>

        {requirements.isLoading ? (
          <Skeleton height={120} />
        ) : requirements.isError || !need ? (
          <ErrorState title={t('settingsProfileDeleteError')} onRetry={() => requirements.refetch()} />
        ) : (
          <View className="gap-4">
            {need.password ? <Field label={t('passwordLabel')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" maxLength={128} autoCapitalize="none" /> : null}
            {need.code ? (
              <View className="gap-2">
                <Field
                  label={need.code === 'totp' ? t('delAccountCodeTotp') : t('delAccountCodeEmail')}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={16}
                />
                {need.code === 'email' ? <Button title={t('delAccountSendCode')} variant="secondary" loading={sendCode.isPending} onPress={onSendCode} /> : null}
              </View>
            ) : null}
            <Field
              label={`${t('deleteConfirmLabel')} ${t('deleteWord')}`}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={t('deleteWord')}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={onDelete}
            />
            {message ? <Text className={`font-nunito-bold text-sm ${message.error ? 'text-brand-error' : 'text-brand-success'}`}>{message.text}</Text> : null}
            <View className="flex-row gap-3">
              <Button title={t('cancel')} variant="secondary" className="flex-1" onPress={() => router.back()} />
              <Pressable
                onPress={onDelete}
                disabled={!ready || remove.isPending}
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready || remove.isPending, busy: remove.isPending }}
                className={`min-h-11 flex-1 items-center justify-center rounded-2xl bg-brand-error px-4 py-3 ${!ready || remove.isPending ? 'opacity-50' : ''}`}
              >
                <Text className="font-nunito-bold text-sm text-brand-offwhite">{remove.isPending ? t('deletingLabel') : t('deleteForever')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
