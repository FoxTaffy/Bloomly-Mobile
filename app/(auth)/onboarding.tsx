import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Flower2 } from 'lucide-react-native';
import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { AuthCard } from '@/components/auth/AuthCard';
import { TagInput } from '@/components/TagInput';
import { Button, DateField, Field, Screen } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { ADULT_AGE, ageOf } from '@/shared/age';
import { apiErrorMessage } from '@/shared/apiError';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

const TOTAL_STEPS = 3;
const splitList = (raw: string) => raw.split(',').map((x) => x.trim()).filter(Boolean);

/** Онбординг после первого входа: имя и дата, симпатии, готово. Веб-аналог: views/OnboardingView.vue. */
export default function OnboardingScreen() {
  const { t, lang } = useT();
  const user = useSession((s) => s.user);
  const finishOnboarding = useSession((s) => s.finishOnboarding);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [birthInvalid, setBirthInvalid] = useState(false);
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [validation, setValidation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const likeSuggestions = useMemo(() => splitList(t('likeSuggestions')), [t]);
  const dislikeSuggestions = useMemo(() => splitList(t('dislikeSuggestions')), [t]);
  const age = ageOf(birthDate);

  const ageLabel = (n: number) => {
    if (lang === 'ru') {
      const word = n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет';
      return `${n} ${word}`;
    }
    return `${n} ${t('yearsOldSuffix')}`;
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setStep(TOTAL_STEPS);
    try {
      await finishOnboarding({
        ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
        ...(birthDate ? { birth_date: birthDate } : {}),
        ...(likes.length ? { likes } : {}),
        ...(dislikes.length ? { dislikes } : {}),
      });
      // дальше корневой layout сам откроет ленту: онбординг пройден
    } catch (e) {
      setSaveError(apiErrorMessage(e) ?? t('onboardingSaveErrorGeneric'));
      setSaving(false);
    }
  };

  const next = () => {
    setValidation(null);
    if (step === 1) {
      if (!displayName.trim()) return setValidation(t('onboardingNameRequiredError'));
      if (birthInvalid) return setValidation(t('onboardingBirthDateError'));
    }
    if (step < 2) setStep(step + 1);
    else void save();
  };

  const skipAll = async () => {
    try {
      await finishOnboarding({});
    } catch {
      // как на вебе: пропуск не должен блокировать вход
    }
  };

  return (
    <View className="flex-1">
      <AuroraBackground />
      <Screen transparent keyboard edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8" keyboardShouldPersistTaps="handled">
          <AuthCard>
            {step === 1 ? (
              <View className="gap-4">
                <View>
                  <Text className="font-nunito-extrabold text-xl text-white">{t('onboardingStep1Title')}</Text>
                  <Text className="mt-1 font-nunito text-sm text-white/55">{t('onboardingStep1Desc')}</Text>
                </View>
                <View>
                  <Field label={`${t('displayNameLabel')} *`} value={displayName} onChangeText={setDisplayName} placeholder={t('onboardingNamePlaceholder')} maxLength={50} autoFocus />
                  <Text className="mt-1 text-right font-nunito text-[11px] text-white/35">{displayName.length}/50</Text>
                </View>
                <View>
                  <DateField label={t('birthdayLabel')} value={birthDate} onChange={setBirthDate} onInvalid={setBirthInvalid} />
                  <Text className={`mt-1.5 font-nunito text-xs ${age !== null && age < ADULT_AGE ? 'text-brand-error' : 'text-white/45'}`}>
                    {age !== null ? `${ageLabel(age)}${age < ADULT_AGE ? ` · ${t('nsfwUnder18Hint')}` : ''}` : t('nsfwBirthdayHint')}
                  </Text>
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View className="gap-4">
                <View>
                  <Text className="font-nunito-extrabold text-xl text-white">{t('onboardingLikesTitle')}</Text>
                  <Text className="mt-1 font-nunito text-sm text-white/55">{t('onboardingLikesDesc')}</Text>
                </View>
                <TagInput label={t('fursonaLikesLabel')} placeholder={t('fursonaLikesPlaceholder')} tags={likes} onChange={setLikes} suggestions={likeSuggestions} tone="success" />
                <TagInput label={t('fursonaDislikesLabel')} placeholder={t('fursonaDislikesPlaceholder')} tags={dislikes} onChange={setDislikes} suggestions={dislikeSuggestions} tone="error" />
              </View>
            ) : null}

            {step === 3 ? (
              <View className="items-center gap-3 py-4">
                <Flower2 size={48} color={colors.accentMinus} />
                <Text className="font-nunito-black text-2xl text-white">{t('onboardingAllDoneTitle')}</Text>
                <Text className="text-center font-nunito text-sm text-white/60">
                  {t('onboardingWelcomePrefix')} <Text className="font-nunito-extrabold text-white">{displayName || user?.username}</Text>!
                </Text>
                {saving ? <Text className="font-nunito text-xs text-white/35">{t('onboardingSavingProfile')}</Text> : null}
                {saveError ? (
                  <View className="w-full gap-3">
                    <Text className="text-center font-nunito-bold text-sm text-brand-error">{saveError}</Text>
                    <Button title={t('onboardingRetryBtn')} onPress={save} />
                  </View>
                ) : null}
              </View>
            ) : null}

            {validation ? <Text className="mt-4 font-nunito-bold text-sm text-brand-error">{validation}</Text> : null}

            {step < TOTAL_STEPS ? (
              <View className="mt-6 flex-row items-center gap-3 border-t border-white/10 pt-5">
                {step > 1 ? <Button title={t('backBtn')} variant="ghost" onPress={() => setStep(step - 1)} /> : null}
                <View className="flex-1" />
                <Button title={step === 1 ? t('nextBtn') : t('onboardingFinishBtn')} loading={saving} onPress={next} />
              </View>
            ) : null}
          </AuthCard>

          {step < TOTAL_STEPS ? (
            <Text onPress={skipAll} accessibilityRole="button" className="mt-5 py-3 text-center font-nunito-bold text-xs text-white/40">
              {t('onboardingSkipAllBtn')}
            </Text>
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}
