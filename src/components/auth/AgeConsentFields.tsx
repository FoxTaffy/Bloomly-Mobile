import { Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Checkbox, DateField, Field } from '@/components/ui';
import type { AgeConsentForm } from '@/hooks/useAgeConsent';
import { useT } from '@/hooks/useT';

/** Дата рождения, email родителя и согласия: общие поля регистрации и экрана возрастной проверки (веб: AgeConsentFields.vue). */
export function AgeConsentFields({ form }: { form: AgeConsentForm }) {
  const { t } = useT();
  const router = useRouter();
  const { state, patch } = form;
  const open = (doc: 'terms' | 'privacy') => router.push(`/legal/${doc}` as Href);

  return (
    <View className="gap-3">
      <View className="gap-2">
        <DateField label={t('birthdayLabel')} value={state.birthDate} onChange={(birthDate) => patch({ birthDate })} onInvalid={(birthDateInvalid) => patch({ birthDateInvalid })} />
        {form.tooYoung ? (
          <Text className="font-nunito-bold text-xs text-brand-error">{t('ageConsentTooYoung')}</Text>
        ) : form.needsParent ? (
          <View className="gap-2">
            <Text className="font-nunito text-xs text-brand-muted">{t('ageConsentNeedsParent')}</Text>
            <Field value={state.parentEmail} onChangeText={(parentEmail) => patch({ parentEmail })} placeholder={t('ageConsentParentEmail')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} />
          </View>
        ) : null}
      </View>

      <View className="rounded-2xl border border-brand-border bg-brand-card px-3 py-1">
        <Checkbox checked={state.consentPolicy} onChange={(consentPolicy) => patch({ consentPolicy })} label={t('ageConsentPolicyPrefix')}>
          <Text className="font-nunito text-xs leading-4 text-brand-offwhite">
            {t('ageConsentPolicyPrefix')}{' '}
            <Text className="text-brand-accent-minus" onPress={() => open('terms')} accessibilityRole="link">{t('ageConsentTermsLink')}</Text>{' '}
            {t('ageConsentAnd')}{' '}
            <Text className="text-brand-accent-minus" onPress={() => open('privacy')} accessibilityRole="link">{t('ageConsentPrivacyLink')}</Text>{' '}
            {t('ageConsentPolicySuffix')}
          </Text>
        </Checkbox>
        <Checkbox checked={state.consentAge} onChange={(consentAge) => patch({ consentAge })} label={t('ageConsentAgeConfirm')}>
          <Text className="font-nunito text-xs leading-4 text-brand-offwhite">{t('ageConsentAgeConfirm')}</Text>
        </Checkbox>
        <Checkbox checked={state.consentMarketing} onChange={(consentMarketing) => patch({ consentMarketing })} label={t('ageConsentMarketing')}>
          <Text className="font-nunito text-xs leading-4 text-brand-muted">{t('ageConsentMarketing')}</Text>
        </Checkbox>
      </View>
    </View>
  );
}
