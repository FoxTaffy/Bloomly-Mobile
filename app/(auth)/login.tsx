import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  Image,
} from 'react-native';
import { Screen } from '@/components/ui';
import { AgeConsentFields } from '@/components/auth/AgeConsentFields';
import { useAgeConsent } from '@/hooks/useAgeConsent';
import { usePendingSignup } from '@/stores/pendingSignup';
import { useRouter, type Href } from 'expo-router';
import { Mail, Lock, User, Eye, EyeOff, Key, ShieldCheck, ChevronLeft, Monitor, CircleAlert } from 'lucide-react-native';
import { useSession } from '@/stores/session';
import { loginWithOAuth } from '@/lib/oauth';
import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { AuthCard } from '@/components/auth/AuthCard';
import { GradientText } from '@/components/auth/GradientText';
import { TabSwitch } from '@/components/auth/TabSwitch';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton } from '@/components/auth/AuthButton';
import { YandexIcon, GoogleIcon, XIcon, TwitchIcon } from '@/components/auth/OAuthIcons';
import { colors } from '@/theme/tokens';
import { useT } from '@/hooks/useT';

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const ICON_COLOR = colors.white35;

export default function AuthScreen() {
  const { t } = useT();
  const login = useSession((s) => s.login);
  const register = useSession((s) => s.register);
  const verifyEmail = useSession((s) => s.verifyEmail);
  const resendOtp = useSession((s) => s.resendOtp);
  const forgotPassword = useSession((s) => s.forgotPassword);
  const resetPassword = useSession((s) => s.resetPassword);

  const router = useRouter();
  const consent = useAgeConsent();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    if (next !== 'verify' && next !== 'reset') setEmail('');
    setUsername('');
    setPassword('');
    setNewPassword('');
    setResetCode('');
    setOtpCode('');
    setShowPass(false);
    setShowNewPass(false);
  }

  const activePassword = mode === 'reset' ? newPassword : password;
  const pwStrength = useMemo(() => {
    const p = activePassword;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }, [activePassword]);
  const pwLabel = !activePassword
    ? ''
    : activePassword.length < 8
      ? t('loginPasswordMinLength')
      : ['', t('loginPwWeak'), t('loginPwMedium'), t('loginPwGood'), t('loginPwExcellent')][pwStrength];
  const pwColor =
    activePassword && activePassword.length < 8
      ? colors.error
      : ['', colors.error, colors.warning, colors.yellow, colors.success][pwStrength];

  async function onResendOtp() {
    if (resendCountdown > 0) return;
    try {
      await resendOtp(email, mode === 'verify' ? 'register' : 'reset');
      setResendCountdown(60);
    } catch {
      // error surfaced via onSubmit paths only
    }
  }

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email.trim(), password, remember);
      } else if (mode === 'register') {
        // как на вебе: дата рождения и согласия обязательны до отправки
        if (consent.validationError) {
          setError(consent.validationError);
          return;
        }
        await register(username.trim(), email.trim(), password, consent.payload());
        setMode('verify');
        setResendCountdown(60);
      } else if (mode === 'verify') {
        await verifyEmail(email.trim(), otpCode, remember);
      } else if (mode === 'forgot') {
        await forgotPassword(email.trim());
        setMode('reset');
        setResendCountdown(60);
      } else if (mode === 'reset') {
        await resetPassword(email.trim(), resetCode, newPassword);
        switchMode('login');
      }
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      // Аккаунт без даты рождения: сессии нет, токен в ответе, ведём на возрастную проверку (как на вебе)
      if (code === 'AGE_VERIFICATION_REQUIRED') {
        usePendingSignup.getState().set(e?.response?.data?.data?.signupToken ?? null);
        router.push('/(auth)/age');
        return;
      }
      if (mode === 'login' && code === 'EMAIL_NOT_VERIFIED') {
        setMode('verify');
        setResendCountdown(60);
        resendOtp(email.trim(), 'register').catch(() => {});
      } else {
        setError(e?.response?.data?.error?.message ?? t('mSomethingWrong'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onOAuth(provider: 'yandex' | 'google' | 'twitter' | 'twitch') {
    setOauthLoading(provider);
    setError(null);
    try {
      const result = await loginWithOAuth(provider);
      if (result === 'error') setError(t('loginOauthFailed'));
      if (result === 'signup') router.push('/(auth)/age');
    } finally {
      setOauthLoading(null);
    }
  }

  const heading =
    mode === 'login'
      ? t('loginHeading')
      : mode === 'register'
        ? t('mRegisterHeading')
        : mode === 'verify'
          ? t('loginVerifyHeading')
          : mode === 'forgot'
            ? t('loginForgotHeading')
            : t('loginResetHeading');

  const subtitle =
    mode === 'login'
      ? t('loginSubheading')
      : mode === 'register'
        ? t('loginRegisterSubheading')
        : mode === 'verify'
          ? t('mCodeSentToMail', { email: email || t('loginYourEmailFallback') })
          : mode === 'forgot'
            ? t('loginForgotSubheading')
            : t('loginResetSubheading');

  const submitLabel =
    mode === 'login'
      ? t('submitLogin')
      : mode === 'register'
        ? t('submitRegister')
        : mode === 'verify'
          ? t('loginConfirmEmailBtn')
          : mode === 'forgot'
            ? t('sendCodeBtn')
            : t('changePasswordBtn');

  return (
    <View className="flex-1">
      <AuroraBackground />
      <Screen transparent keyboard edges={['top', 'bottom']}>
          <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8" keyboardShouldPersistTaps="handled">
            <View className="mb-6 items-center">
              <View
                className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor: colors.accentBg,
                  borderColor: colors.accentBorder,
                  shadowColor: colors.accent,
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Image source={require('../../assets/bloomly-logo.png')} style={{ width: 34, height: 34 }} resizeMode="contain" />
              </View>
              <GradientText style={{ fontFamily: 'Nunito_900Black', fontSize: 24 }}>Bloomly</GradientText>
            </View>

            <AuthCard>
              <View className="mb-5">
                <Text className="mb-1 font-nunito-black text-2xl text-white">{heading}</Text>
                <Text className="font-nunito-semibold text-sm text-white/35">{subtitle}</Text>
              </View>

              {mode === 'login' || mode === 'register' ? (
                <View className="mb-5">
                  <TabSwitch
                    value={mode}
                    onChange={(v) => switchMode(v as Mode)}
                    options={[
                      { key: 'login', label: t('loginTab') },
                      { key: 'register', label: t('registerTab') },
                    ]}
                  />
                </View>
              ) : (
                <Pressable onPress={() => switchMode('login')} className="mb-4 -mt-1 flex-row items-center gap-1.5">
                  <ChevronLeft size={14} color={colors.white35} />
                  <Text className="font-nunito-semibold text-xs text-white/35">
                    {mode === 'verify' ? t('loginChangeEmailBtn') : t('loginBackToLoginBtn')}
                  </Text>
                </Pressable>
              )}

              <View className="gap-3.5">
                {mode !== 'verify' ? (
                  <AuthInput
                    icon={<Mail size={17} color={ICON_COLOR} />}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                ) : null}

                {mode === 'register' ? (
                  <View>
                    <AuthInput
                      icon={<User size={17} color={ICON_COLOR} />}
                      value={username}
                      onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30))}
                      placeholder="username"
                      autoCapitalize="none"
                      autoComplete="username"
                      autoCorrect={false}
                    />
                    <Text className="mt-1.5 pl-1 font-nunito-semibold text-[11px] text-white/30">
                      {!username
                        ? t('loginUsernameHint')
                        : username.length < 3
                          ? t('mUsernameNeedMore', { n: 3 - username.length })
                          : t('mUsernameWillBe', { name: username })}
                    </Text>
                  </View>
                ) : null}

                {mode === 'login' || mode === 'register' ? (
                  <AuthInput
                    icon={<Lock size={17} color={ICON_COLOR} />}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    rightElement={
                      <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                        {showPass ? <EyeOff size={17} color={ICON_COLOR} /> : <Eye size={17} color={ICON_COLOR} />}
                      </Pressable>
                    }
                  />
                ) : null}

                {mode === 'login' ? (
                  <Pressable onPress={() => switchMode('forgot')} className="-mt-2 items-end">
                    <Text className="font-nunito-bold text-xs text-white/35">{t('forgotPassword')}</Text>
                  </Pressable>
                ) : null}

                {mode === 'login' ? (
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Monitor size={13} color={colors.white35} />
                      <Text className="font-nunito-semibold text-xs text-white/35">{t('loginRememberDevice')}</Text>
                    </View>
                    <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.accent, false: colors.white12 }} />
                  </View>
                ) : null}

                {mode === 'reset' ? (
                  <AuthInput
                    icon={<Key size={17} color={ICON_COLOR} />}
                    value={resetCode}
                    onChangeText={(v) => setResetCode(v.replace(/\D+/g, '').slice(0, 6))}
                    placeholder={t('loginSixDigitCodePlaceholder')}
                    keyboardType="number-pad"
                    style={{ textAlign: 'center', letterSpacing: 4 }}
                  />
                ) : null}

                {mode === 'verify' ? (
                  <View className="gap-3">
                    <View
                      className="flex-row items-center gap-2.5 rounded-2xl border p-3.5"
                      style={{ backgroundColor: colors.violetBg, borderColor: colors.violetBorder }}
                    >
                      <ShieldCheck size={16} color={colors.violet} />
                      <Text className="flex-1 font-nunito-semibold text-xs" style={{ color: colors.violet }}>
                        {t('mCodeSentToPrefix')}<Text className="text-white">{email}</Text>
                      </Text>
                    </View>
                    <AuthInput
                      icon={<Key size={17} color={ICON_COLOR} />}
                      value={otpCode}
                      onChangeText={(v) => setOtpCode(v.replace(/\D+/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      keyboardType="number-pad"
                      style={{ textAlign: 'center', letterSpacing: 8, fontSize: 18 }}
                    />
                    <Pressable onPress={onResendOtp} disabled={resendCountdown > 0} className="items-end">
                      <Text className="font-nunito-bold text-xs" style={{ color: resendCountdown > 0 ? colors.white20 : colors.violet }}>
                        {resendCountdown > 0 ? t('mResendIn', { n: resendCountdown }) : t('loginResendCode')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {mode === 'reset' ? (
                  <AuthInput
                    icon={<Lock size={17} color={ICON_COLOR} />}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('newPasswordLabel')}
                    secureTextEntry={!showNewPass}
                    autoComplete="new-password"
                    rightElement={
                      <Pressable onPress={() => setShowNewPass((v) => !v)} hitSlop={8}>
                        {showNewPass ? <EyeOff size={17} color={ICON_COLOR} /> : <Eye size={17} color={ICON_COLOR} />}
                      </Pressable>
                    }
                  />
                ) : null}

                {(mode === 'register' || mode === 'reset') && activePassword.length > 0 ? (
                  <View>
                    <View className="mb-1.5 flex-row gap-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <View
                          key={n}
                          className="h-1 flex-1 rounded-full"
                          style={{ backgroundColor: n <= pwStrength ? pwColor : colors.white08 }}
                        />
                      ))}
                    </View>
                    <Text className="font-nunito-bold text-xs" style={{ color: pwColor }}>
                      {pwLabel}
                    </Text>
                  </View>
                ) : null}

                {mode === 'register' ? <AgeConsentFields form={consent} /> : null}

                {error ? (
                  <View
                    className="flex-row items-start gap-2.5 rounded-2xl border p-3.5"
                    style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBorder }}
                  >
                    <CircleAlert size={16} color={colors.errorSoft} />
                    <Text className="flex-1 font-nunito-bold text-sm" style={{ color: colors.errorSoft }}>{error}</Text>
                  </View>
                ) : null}

                <AuthButton onPress={onSubmit} loading={loading}>
                  {submitLabel}
                </AuthButton>
              </View>

              {mode === 'login' || mode === 'register' ? (
                <View className="mt-5">
                  <View className="mb-4 flex-row items-center gap-3">
                    <View className="h-px flex-1 bg-white/[0.08]" />
                    <Text className="font-nunito-bold text-[11px] uppercase tracking-widest text-white/25">
                      {t('loginOrContinueWith')}
                    </Text>
                    <View className="h-px flex-1 bg-white/[0.08]" />
                  </View>

                  <Pressable
                    onPress={() => onOAuth('yandex')}
                    disabled={!!oauthLoading}
                    className="mb-2 flex-row items-center justify-center gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: colors.yandex, opacity: oauthLoading && oauthLoading !== 'yandex' ? 0.5 : 1 }}
                  >
                    <YandexIcon size={18} />
                    <Text className="font-nunito-extrabold text-sm text-white">{t('mLoginYandex')}</Text>
                  </Pressable>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => onOAuth('google')}
                      disabled={!!oauthLoading}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-2.5"
                      style={{ opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1 }}
                    >
                      <GoogleIcon size={16} />
                      <Text className="font-nunito-extrabold text-xs" style={{ color: colors.inkDark }}>Google</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onOAuth('twitter')}
                      disabled={!!oauthLoading}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-black px-2 py-2.5"
                      style={{ opacity: oauthLoading && oauthLoading !== 'twitter' ? 0.5 : 1 }}
                    >
                      <XIcon size={14} />
                      <Text className="font-nunito-extrabold text-xs text-white">X</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onOAuth('twitch')}
                      disabled={!!oauthLoading}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2.5"
                      style={{ backgroundColor: colors.twitch, opacity: oauthLoading && oauthLoading !== 'twitch' ? 0.5 : 1 }}
                    >
                      <TwitchIcon size={16} />
                      <Text className="font-nunito-extrabold text-xs text-white">Twitch</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View className="mt-6 flex-row flex-wrap items-center justify-center gap-x-4">
                <Text onPress={() => router.push('/legal/terms' as Href)} accessibilityRole="link" className="py-2 font-nunito-semibold text-xs text-white/40">
                  {t('ageConsentTermsLink')}
                </Text>
                <Text onPress={() => router.push('/legal/privacy' as Href)} accessibilityRole="link" className="py-2 font-nunito-semibold text-xs text-white/40">
                  {t('ageConsentPrivacyLink')}
                </Text>
              </View>
            </AuthCard>
          </ScrollView>
      </Screen>
    </View>
  );
}
