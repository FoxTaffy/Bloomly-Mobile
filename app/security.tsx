import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, Monitor, ShieldCheck } from 'lucide-react-native';
import { Button, Card, ErrorState, Field, Screen, Sheet, Skeleton } from '@/components/ui';
import {
  changePassword,
  confirmEmailChange,
  disableTwoFactor,
  email2faConfirm,
  email2faEnable,
  requestEmailChange,
  totpConfirm,
  totpSetup,
} from '@/api/account';
import { useSessionActions, useSessions } from '@/hooks/useSecurity';
import { useT } from '@/hooks/useT';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { apiErrorMessage } from '@/shared/apiError';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

type Panel = null | 'password' | 'email' | 'twofa';

/** Безопасность аккаунта: пароль, почта, двухфакторная защита, устройства. Веб-аналог: SettingsSecuritySection.vue (привязка соцсетей — в вебе). */
export default function SecurityScreen() {
  const { t } = useT();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const [panel, setPanel] = useState<Panel>(null);
  const sessions = useSessions();
  const { revoke, revokeOthers } = useSessionActions();
  const timeAgo = useTimeAgo();
  const hasPassword = user?.has_password !== false;
  const method = user?.two_factor_method ?? null;
  const others = (sessions.data ?? []).filter((s) => !s.current);

  const confirmRevoke = (id: string) =>
    Alert.alert(t('revokeConfirm'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('revokeBtn'), style: 'destructive', onPress: () => revoke.mutate(id) },
    ]);
  const confirmRevokeOthers = () =>
    Alert.alert(t('revokeAllOthersConfirm'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('revokeAllOthersBtn'), style: 'destructive', onPress: () => revokeOthers.mutate() },
    ]);

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('mSecurityTitle')}</Text>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-2">
        <Card className="gap-3">
          <Text className="font-nunito-extrabold text-brand-offwhite">{t('mSecurityLogin')}</Text>
          <Button title={hasPassword ? t('mSecurityChangePassword') : t('mSecuritySetPassword')} variant="secondary" onPress={() => setPanel('password')} />
          <Text className="font-nunito text-xs text-brand-muted">{user?.email}</Text>
          <Button title={t('mSecurityChangeEmail')} variant="secondary" onPress={() => setPanel('email')} />
        </Card>

        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={16} color={method ? colors.success : colors.mutedIcon} />
            <Text className="font-nunito-extrabold text-brand-offwhite">{t('mSecurityTwoFactor')}</Text>
          </View>
          <Text className="font-nunito text-sm text-brand-muted">{method === 'totp' ? t('mSecurity2faTotp') : method === 'email' ? t('mSecurity2faEmail') : t('mSecurity2faOff')}</Text>
          <Button title={method ? t('mSecurity2faDisable') : t('mSecurity2faEnable')} variant="secondary" onPress={() => setPanel('twofa')} />
        </Card>

        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-nunito-extrabold text-brand-offwhite">{t('mSecurityDevices')}</Text>
            {others.length > 0 ? (
              <Pressable onPress={confirmRevokeOthers} disabled={revokeOthers.isPending} accessibilityRole="button" hitSlop={8}>
                <Text className="font-nunito-bold text-xs text-brand-error">{t('revokeAllOthersBtn')}</Text>
              </Pressable>
            ) : null}
          </View>
          {sessions.isLoading ? (
            <Skeleton height={48} />
          ) : sessions.isError ? (
            <ErrorState onRetry={() => sessions.refetch()} />
          ) : (
            (sessions.data ?? []).map((s) => (
              <View key={s.id} className="flex-row items-center gap-3">
                <Monitor size={18} color={s.current ? colors.success : colors.mutedIcon} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-nunito-bold text-sm text-brand-offwhite">{s.device_name ?? t('unknownDeviceLabel')}{s.current ? ` · ${t('mSecurityThisDevice')}` : ''}</Text>
                  <Text numberOfLines={1} className="font-nunito text-xs text-brand-muted">{s.ip_address ?? '—'} · {t('lastActiveLabel')} {timeAgo(s.last_used_at)}</Text>
                </View>
                {s.current ? null : (
                  <Pressable onPress={() => confirmRevoke(s.id)} disabled={revoke.isPending} accessibilityRole="button" hitSlop={8}>
                    <Text className="font-nunito-bold text-xs text-brand-error">{t('revokeBtn')}</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
          {revoke.isError || revokeOthers.isError ? <Text className="font-nunito text-xs text-brand-error">{t('mActionFailed')}</Text> : null}
        </Card>
      </ScrollView>

      <PasswordSheet visible={panel === 'password'} hasPassword={hasPassword} onClose={() => setPanel(null)} />
      <EmailSheet visible={panel === 'email'} onClose={() => setPanel(null)} />
      <TwoFactorSheet visible={panel === 'twofa'} method={method} hasPassword={hasPassword} onClose={() => setPanel(null)} />
    </Screen>
  );
}

/** Запрос с сообщением об ошибке и успехе: общий для форм этого экрана. */
function useAction() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(apiErrorMessage(e) ?? t('settingsProfileGenericError'));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, reset: () => setError(null) };
}

function PasswordSheet({ visible, hasPassword, onClose }: { visible: boolean; hasPassword: boolean; onClose: () => void }) {
  const { t } = useT();
  const patchUser = useSession((s) => s.patchUser);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAction();
  const local = next.length > 0 && next.length < 8 ? t('passwordTooShort') : confirm && confirm !== next ? t('passwordsDontMatch') : null;
  const ok = next.length >= 8 && next === confirm && (!hasPassword || current.length > 0);

  const close = () => {
    setCurrent(''); setNext(''); setConfirm(''); setDone(false);
    onClose();
  };
  return (
    <Sheet visible={visible} title={hasPassword ? t('mSecurityChangePassword') : t('mSecuritySetPassword')} onClose={close}>
      <View className="gap-3 pb-2">
        {done ? (
          <>
            <Text className="font-nunito-bold text-sm text-brand-success">{t('passwordChangedMsg')}</Text>
            <Button title={t('mClose')} variant="secondary" onPress={close} />
          </>
        ) : (
          <>
            {hasPassword ? <Field value={current} onChangeText={setCurrent} placeholder={t('mSecurityCurrentPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" /> : null}
            <Field value={next} onChangeText={setNext} placeholder={t('mSecurityNewPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
            <Field value={confirm} onChangeText={setConfirm} placeholder={t('mSecurityRepeatPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
            {local || error ? <Text className="font-nunito text-xs text-brand-error">{local ?? error}</Text> : null}
            <Button title={t('mSave')} loading={busy} disabled={!ok} onPress={async () => { if (await run(() => changePassword(next, hasPassword ? current : undefined))) { patchUser({ has_password: true }); setDone(true); } }} />
          </>
        )}
      </View>
    </Sheet>
  );
}

function EmailSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const patchUser = useSession((s) => s.patchUser);
  const [step, setStep] = useState<'ask' | 'confirm' | 'done'>('ask');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const { busy, error, run } = useAction();
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());
  const close = () => { setStep('ask'); setCode(''); setEmail(''); onClose(); };
  return (
    <Sheet visible={visible} title={t('mSecurityChangeEmail')} onClose={close}>
      <View className="gap-3 pb-2">
        {step === 'ask' ? (
          <>
            <Text className="font-nunito text-sm text-brand-muted">{t('mSecurityEmailStep1')}</Text>
            {error ? <Text className="font-nunito text-xs text-brand-error">{error}</Text> : null}
            <Button title={t('mSecuritySendCode')} loading={busy} onPress={async () => { if (await run(() => requestEmailChange())) setStep('confirm'); }} />
          </>
        ) : step === 'confirm' ? (
          <>
            <Field value={code} onChangeText={setCode} placeholder={t('mSecurityCode')} keyboardType="number-pad" maxLength={8} />
            <Field value={email} onChangeText={setEmail} placeholder={t('mSecurityNewEmail')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
            {email && !valid ? <Text className="font-nunito text-xs text-brand-error">{t('invalidEmailMsg')}</Text> : error ? <Text className="font-nunito text-xs text-brand-error">{error}</Text> : null}
            <Button title={t('mSave')} loading={busy} disabled={!valid || code.trim().length < 4} onPress={async () => { let saved = ''; if (await run(async () => { saved = await confirmEmailChange(code.trim(), email.trim()); })) { patchUser({ email: saved }); setStep('done'); } }} />
          </>
        ) : (
          <>
            <Text className="font-nunito-bold text-sm text-brand-success">{t('emailChangedMsg')}</Text>
            <Button title={t('mClose')} variant="secondary" onPress={close} />
          </>
        )}
      </View>
    </Sheet>
  );
}

/** Включить (почтой или приложением) или отключить двухфакторную защиту. TOTP: QR и секрет для ручного ввода. */
function TwoFactorSheet({ visible, method, hasPassword, onClose }: { visible: boolean; method: 'totp' | 'email' | null; hasPassword: boolean; onClose: () => void }) {
  const { t } = useT();
  const patchUser = useSession((s) => s.patchUser);
  const [mode, setMode] = useState<'menu' | 'email' | 'totp'>('menu');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [sent, setSent] = useState(false);
  const { busy, error, run, reset } = useAction();
  const close = () => { setMode('menu'); setCode(''); setPassword(''); setTotp(null); setSent(false); reset(); onClose(); };

  return (
    <Sheet visible={visible} title={t('mSecurityTwoFactor')} onClose={close}>
      <View className="gap-3 pb-2">
        {method ? (
          <>
            <Text className="font-nunito text-sm text-brand-muted">{t('mSecurity2faDisableHint')}</Text>
            {hasPassword ? <Field value={password} onChangeText={setPassword} placeholder={t('mSecurityCurrentPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} /> : null}
            {error ? <Text className="font-nunito text-xs text-brand-error">{error}</Text> : null}
            <Button title={t('mSecurity2faDisable')} loading={busy} disabled={hasPassword && !password} onPress={async () => { if (await run(() => disableTwoFactor(hasPassword ? password : undefined))) { patchUser({ two_factor_method: null }); close(); } }} />
          </>
        ) : mode === 'menu' ? (
          <>
            <Button title={t('mSecurity2faViaEmail')} variant="secondary" onPress={() => setMode('email')} />
            <Button title={t('mSecurity2faViaApp')} variant="secondary" onPress={async () => { setMode('totp'); await run(async () => setTotp(await totpSetup())); }} />
          </>
        ) : mode === 'email' ? (
          <>
            {!sent ? (
              <>
                <Text className="font-nunito text-sm text-brand-muted">{t('mSecurity2faEmailHint')}</Text>
                {error ? <Text className="font-nunito text-xs text-brand-error">{error}</Text> : null}
                <Button title={t('mSecuritySendCode')} loading={busy} onPress={async () => { if (await run(() => email2faEnable())) setSent(true); }} />
              </>
            ) : (
              <>
                <Field value={code} onChangeText={setCode} placeholder={t('mSecurityCode')} keyboardType="number-pad" maxLength={8} />
                {error ? <Text className="font-nunito text-xs text-brand-error">{error}</Text> : null}
                <Button title={t('mSecurityConfirm')} loading={busy} disabled={code.trim().length < 4} onPress={async () => { if (await run(() => email2faConfirm(code.trim()))) { patchUser({ two_factor_method: 'email' }); close(); } }} />
              </>
            )}
          </>
        ) : (
          <>
            {totp ? (
              <>
                <Text className="font-nunito text-sm text-brand-muted">{t('mSecurityTotpHint')}</Text>
                <View className="items-center">
                  <Image source={{ uri: totp.qrDataUrl }} style={{ width: 180, height: 180, backgroundColor: colors.offwhite, borderRadius: 12 }} contentFit="contain" />
                </View>
                <Text selectable className="text-center font-nunito-bold text-sm tracking-widest text-brand-offwhite">{totp.secret}</Text>
                <Field value={code} onChangeText={setCode} placeholder={t('mSecurityCode')} keyboardType="number-pad" maxLength={8} />
              </>
            ) : busy ? <Skeleton height={120} /> : null}
            {error ? <Text className="font-nunito text-xs text-brand-error">{error}</Text> : null}
            <Button title={t('mSecurityConfirm')} loading={busy} disabled={!totp || code.trim().length < 4} onPress={async () => { if (await run(() => totpConfirm(code.trim()))) { patchUser({ two_factor_method: 'totp' }); close(); } }} />
          </>
        )}
      </View>
    </Sheet>
  );
}
