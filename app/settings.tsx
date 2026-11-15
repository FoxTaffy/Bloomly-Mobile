import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Button, Card, Chip, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { usePushPermission } from '@/hooks/usePushPermission';
import { usePushPrefs } from '@/hooks/usePushPrefs';
import { useT } from '@/hooks/useT';
import { LANGS, type MessageKey } from '@/shared/i18n';
import type { NsfwMode } from '@/shared/api-types';
import { useLang } from '@/stores/lang';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

const NSFW_OPTIONS: { mode: NsfwMode; label: MessageKey }[] = [
  { mode: 'hide', label: 'nsfwHidden' },
  { mode: 'blur', label: 'nsfwBlurred' },
  { mode: 'show', label: 'nsfwShown' },
];
const LANG_NAME: Record<(typeof LANGS)[number], MessageKey> = { ru: 'languageRU', en: 'languageEN' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="mb-2 px-1 font-nunito-bold text-xs text-brand-muted">{title.toUpperCase()}</Text>
      <Card>{children}</Card>
    </View>
  );
}

function SwitchRow({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View className="min-h-11 flex-row items-center justify-between">
      <Text className="flex-1 font-nunito text-brand-offwhite">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.white12 }}
        thumbColor={colors.offwhite}
      />
    </View>
  );
}

/** Настройки: язык, NSFW, push-категории (messages / events — их поддерживает бэкенд), выход. */
export default function SettingsScreen() {
  const { t } = useT();
  const router = useRouter();
  const { lang, manual, setLang, useDeviceLang } = useLang();
  const { preferredMode, canUseNsfw, setNsfwMode } = useNsfwMode();
  const logout = useSession((s) => s.logout);
  const { query: prefs, update } = usePushPrefs();
  const permission = usePushPermission();

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('backBtn')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <ChevronLeft size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-2xl text-brand-offwhite">{t('settings')}</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8 pt-2">
        <Section title={t('interfaceLanguage')}>
          <View className="flex-row flex-wrap gap-2">
            <Chip label={t('mLanguageDevice')} selected={!manual} onPress={() => void useDeviceLang()} />
            {LANGS.map((l) => (
              <Chip key={l} label={t(LANG_NAME[l])} selected={manual && lang === l} onPress={() => void setLang(l)} />
            ))}
          </View>
        </Section>

        <Section title={t('mSettingsNsfw')}>
          <View className="flex-row flex-wrap gap-2">
            {NSFW_OPTIONS.map((o) => (
              <Chip key={o.mode} label={t(o.label)} selected={(canUseNsfw ? preferredMode : 'hide') === o.mode} onPress={() => (canUseNsfw || o.mode === 'hide') && setNsfwMode(o.mode)} />
            ))}
          </View>
          {canUseNsfw ? null : <Text className="mt-3 font-nunito text-xs text-brand-muted">{t('nsfwUnder18Hint')}</Text>}
        </Section>

        <Section title={t('mSettingsPush')}>
          {permission.granted === false ? (
            <View className="mb-3 gap-2">
              <Text className="font-nunito text-sm text-brand-muted">{t('mPushPermissionOff')}</Text>
              <Button title={permission.canAsk ? t('mPushAllow') : t('mPushOpenSettings')} variant="secondary" onPress={() => void permission.request()} />
            </View>
          ) : null}
          {prefs.isLoading ? (
            <Skeleton height={44} />
          ) : prefs.isError || !prefs.data ? (
            <ErrorState title={t('mPrefsLoadFailed')} onRetry={() => prefs.refetch()} />
          ) : (
            <>
              <SwitchRow label={t('mPushMessages')} value={prefs.data.messages} onChange={(v) => update.mutate({ messages: v })} />
              <SwitchRow label={t('mPushEvents')} value={prefs.data.events} onChange={(v) => update.mutate({ events: v })} />
              {update.isError ? <Text className="mt-1 font-nunito text-xs text-brand-error">{t('mPrefsSaveFailed')}</Text> : null}
              <Text className="mt-2 font-nunito text-xs text-brand-muted">{t('mPushCritical')}</Text>
            </>
          )}
        </Section>

        <Section title={t('mSecurityTitle')}>
          <Button title={t('mSecurityTitle')} variant="secondary" onPress={() => router.push('/security')} />
        </Section>

        <Section title={t('mSchedTitle')}>
          <Button title={t('mSchedOpenList')} variant="secondary" onPress={() => router.push('/scheduled')} />
        </Section>

        <Section title={t('mSettingsLegal')}>
          <View className="gap-2">
            <Button title={t('termsTitle')} variant="secondary" onPress={() => router.push('/legal/terms')} />
            <Button title={t('privacyTitle')} variant="secondary" onPress={() => router.push('/legal/privacy')} />
            <Button title={t('mDmcaTitle')} variant="secondary" onPress={() => router.push('/legal/dmca')} />
            <Button title={t('mSupportTitle')} variant="secondary" onPress={() => router.push('/support')} />
          </View>
        </Section>

        <Section title={t('mSettingsAccount')}>
          <Button
            title={t('mLogout')}
            variant="secondary"
            onPress={async () => {
              await logout();
            }}
          />
        </Section>

        <Section title={t('mSettingsDanger')}>
          <Text className="mb-3 font-nunito text-sm text-brand-muted">{t('deleteAccountTitle')}</Text>
          <Button title={t('deleteMyAccountBtn')} variant="secondary" onPress={() => router.push('/delete-account')} />
        </Section>

        <Text className="text-center font-nunito text-xs text-brand-muted">{t('mSettingsVersion', { v: Constants.expoConfig?.version ?? '' })}</Text>
      </ScrollView>
    </Screen>
  );
}
