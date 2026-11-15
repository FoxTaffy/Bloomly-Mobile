import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { TagInput } from '@/components/TagInput';
import { Button, Chip, ErrorState, Field, Screen, Skeleton } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useProfileImage } from '@/hooks/useProfileImage';
import { useT } from '@/hooks/useT';
import { updateMyProfile, updateUsername, type PrivacyLevel, type ProfilePatch } from '@/api/users';
import { normalizeUsername, usernameValid, USERNAME_MAX } from '@/shared/username';
import { apiErrorCode, apiErrorMessage } from '@/shared/apiError';
import type { MessageKey } from '@/shared/i18n';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

// Поля формы и их сохранённые значения: на сервер уходят только изменённые (веб: useProfileForm.buildPayload)
interface Form {
  username: string;
  display_name: string;
  bio: string;
  pronouns: string;
  location: string;
  website: string;
  avatar_url: string;
  banner_url: string;
  likes: string[];
  dislikes: string[];
  profile_visibility: PrivacyLevel;
  friends_list_visibility: PrivacyLevel;
  messages_privacy: PrivacyLevel;
  comments_privacy: PrivacyLevel;
  mentions_privacy: PrivacyLevel;
  online_status_visibility: PrivacyLevel;
}
type PrivacyKey = Extract<keyof Form, `${string}_visibility` | `${string}_privacy`>;

const ONLY_ME: PrivacyLevel[] = ['everyone', 'friends', 'only_me'];
const NOBODY: PrivacyLevel[] = ['everyone', 'friends', 'nobody'];
const PRIVACY_ROWS: { field: PrivacyKey; label: MessageKey; options: PrivacyLevel[] }[] = [
  { field: 'profile_visibility', label: 'profileVisibilityLabel', options: ONLY_ME },
  { field: 'friends_list_visibility', label: 'friendsListVisibilityLabel', options: ONLY_ME },
  { field: 'messages_privacy', label: 'messagesPrivacyLabel', options: NOBODY },
  { field: 'comments_privacy', label: 'commentsPrivacyLabel', options: NOBODY },
  { field: 'mentions_privacy', label: 'mentionsPrivacyLabel', options: NOBODY },
  { field: 'online_status_visibility', label: 'onlineStatusVisibilityLabel', options: NOBODY },
];
const LEVEL_LABEL: Record<PrivacyLevel, MessageKey> = { everyone: 'privacyEveryone', friends: 'privacyFriends', nobody: 'privacyNobody', only_me: 'privacyOnlyMe' };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Редактирование своего профиля. Веб-аналог: SettingsProfileView → секции «Основное», «Интересы», «Приватность». */
export default function EditProfileScreen() {
  const { t } = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useSession((s) => s.user);
  const patchUser = useSession((s) => s.patchUser);
  const profile = useProfile(me?.username ?? '');
  const avatar = useProfileImage('avatar');
  const banner = useProfileImage('banner');

  const initial = useMemo<Form | null>(() => {
    const p = profile.data;
    if (!p) return null;
    return {
      username: p.username,
      display_name: p.display_name ?? '',
      bio: p.bio ?? '',
      pronouns: p.pronouns ?? '',
      location: p.location ?? '',
      website: p.website ?? '',
      avatar_url: p.avatar_url ?? '',
      banner_url: p.banner_url ?? '',
      likes: p.likes ?? [],
      dislikes: p.dislikes ?? [],
      profile_visibility: p.profile_visibility ?? 'everyone',
      friends_list_visibility: p.friends_list_visibility ?? 'everyone',
      messages_privacy: p.messages_privacy ?? 'everyone',
      comments_privacy: p.comments_privacy ?? 'everyone',
      mentions_privacy: p.mentions_privacy ?? 'everyone',
      online_status_visibility: p.online_status_visibility ?? 'everyone',
    };
  }, [profile.data]);

  const [form, setForm] = useState<Form | null>(null);
  // Форма заполняется один раз: обновление профиля в фоне не должно затирать то, что человек уже набрал
  useEffect(() => {
    if (initial && !form) setForm(initial);
  }, [initial, form]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const changed = (initial && form ? (Object.keys(form) as (keyof Form)[]).filter((k) => !same(form[k], initial[k])) : []) as (keyof Form)[];
  const usernameBad = !!form && changed.includes('username') && !usernameValid(form.username);
  const dirty = changed.length > 0;

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      for (const k of changed) if (k !== 'username') body[k] = form![k];
      // Ник меняется отдельным запросом (как на вебе: OWN_ENDPOINT); если он занят, остальное не сохраняем
      if (changed.includes('username')) await updateUsername(form!.username);
      const user = Object.keys(body).length ? await updateMyProfile(body as ProfilePatch) : null;
      return { user, username: form!.username };
    },
    onSuccess: ({ user, username }) => {
      patchUser({ username, ...(user ? { display_name: user.display_name, avatar_url: user.avatar_url, bio: user.bio } : {}) });
      qc.invalidateQueries({ queryKey: ['profile'] });
      router.back();
    },
  });

  const close = () => {
    if (!dirty) return router.back();
    Alert.alert(t('mDiscardPostTitle'), t('mEditProfileDiscardHint'), [
      { text: t('mKeepEditing'), style: 'cancel' },
      { text: t('mDiscard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pickAvatar = async () => {
    const url = await avatar.pick();
    if (url) {
      set('avatar_url', url);
    }
  };
  const pickBanner = async () => {
    const url = await banner.pick();
    if (url) set('banner_url', url);
  };

  return (
    <Screen keyboard onBackPress={() => (dirty ? (close(), true) : false)}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('mClose')} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-brand-card">
          <X size={18} color={colors.offwhite} />
        </Pressable>
        <Text className="font-nunito-extrabold text-lg text-brand-offwhite">{t('mEditProfileTitle')}</Text>
        <Button title={t('mSave')} loading={save.isPending} disabled={!dirty || usernameBad || avatar.uploading || banner.uploading} onPress={() => save.mutate()} className="min-h-9 px-4 py-2" />
      </View>

      {profile.isLoading || (!form && !profile.isError) ? (
        <View className="gap-3 px-4 pt-2"><Skeleton height={140} /><Skeleton height={44} /><Skeleton height={44} /></View>
      ) : profile.isError || !form ? (
        <ErrorState onRetry={() => profile.refetch()} />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-4 pb-10 pt-2" keyboardShouldPersistTaps="handled">
          <View>
            <Pressable onPress={pickBanner} accessibilityRole="button" accessibilityLabel={t('changeBanner')} className="h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-card active:opacity-80">
              {form.banner_url ? <Image source={{ uri: form.banner_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
              <View className="absolute inset-0 items-center justify-center bg-black/30">
                {banner.uploading ? <Text className="font-nunito-bold text-sm text-brand-offwhite">{t('mUploading')}</Text> : <Camera size={22} color={colors.offwhite} />}
              </View>
            </Pressable>
            <Pressable onPress={pickAvatar} accessibilityRole="button" accessibilityLabel={t('mChangeAvatar')} className="-mt-8 ml-4 self-start active:opacity-80" style={{ borderRadius: 48, borderWidth: 4, borderColor: colors.bg }}>
              <Avatar uri={form.avatar_url} name={form.display_name || me?.username} size={80} />
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                {avatar.uploading ? <Text className="font-nunito-bold text-xs text-brand-offwhite">{t('mUploading')}</Text> : <Camera size={20} color={colors.offwhite} />}
              </View>
            </Pressable>
            {avatar.error || banner.error ? <Text className="mt-2 font-nunito-bold text-xs text-brand-error">{avatar.error ?? banner.error}</Text> : null}
          </View>

          <Section title={t('secBasic')}>
            <Labeled label={t('mUsernameLabel')} count={form.username.length} max={USERNAME_MAX}>
              <Field value={form.username} onChangeText={(v) => set('username', normalizeUsername(v))} maxLength={USERNAME_MAX} autoCapitalize="none" autoCorrect={false} icon={<Text className="font-nunito-bold text-brand-muted">@</Text>} />
              {usernameBad ? <Text className="font-nunito text-xs text-brand-error">{t('mUsernameRules')}</Text> : null}
            </Labeled>
            <Labeled label={t('displayNameLabel')} count={form.display_name.length} max={50}>
              <Field value={form.display_name} onChangeText={(v) => set('display_name', v)} placeholder={t('displayNamePlaceholder')} maxLength={50} />
            </Labeled>
            <Labeled label={t('aboutLabel')} count={form.bio.length} max={300}>
              <Field value={form.bio} onChangeText={(v) => set('bio', v)} placeholder={t('bioPlaceholder')} maxLength={300} multiline />
            </Labeled>
            <Labeled label={t('pronounsLabel')} count={form.pronouns.length} max={30}>
              <Field value={form.pronouns} onChangeText={(v) => set('pronouns', v)} placeholder={t('pronounsFieldPlaceholder')} maxLength={30} />
            </Labeled>
            <Labeled label={t('locationCardLabel')} count={form.location.length} max={100}>
              <Field value={form.location} onChangeText={(v) => set('location', v)} maxLength={100} />
            </Labeled>
            <Labeled label={t('websiteLabel')} count={form.website.length} max={200}>
              <Field value={form.website} onChangeText={(v) => set('website', v)} maxLength={200} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            </Labeled>
          </Section>

          <Section title={t('secInterests')}>
            <TagInput label={t('fursonaLikesLabel')} placeholder={t('fursonaLikesPlaceholder')} tags={form.likes} onChange={(v) => set('likes', v)} tone="success" />
            <TagInput label={t('fursonaDislikesLabel')} placeholder={t('fursonaDislikesPlaceholder')} tags={form.dislikes} onChange={(v) => set('dislikes', v)} tone="error" />
          </Section>

          <Section title={t('secPrivacy')}>
            {PRIVACY_ROWS.map((r) => (
              <View key={r.field} className="gap-2">
                <Text className="font-nunito-bold text-xs text-brand-muted">{t(r.label)}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {r.options.map((o) => (
                    <Chip key={o} label={t(LEVEL_LABEL[o])} selected={form[r.field] === o} onPress={() => set(r.field, o)} />
                  ))}
                </View>
              </View>
            ))}
          </Section>

          {save.isError ? <Text className="font-nunito-bold text-sm text-brand-error">{apiErrorCode(save.error) === 'USERNAME_TAKEN' ? t('mUsernameTaken') : (apiErrorMessage(save.error) ?? t('settingsProfileSaveError'))}</Text> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="font-nunito-extrabold text-base text-brand-offwhite">{title}</Text>
      {children}
    </View>
  );
}

function Labeled({ label, count, max, children }: { label: string; count: number; max: number; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-nunito-bold text-xs text-brand-muted">{label}</Text>
        <Text className="font-nunito text-xs text-brand-muted">{count}/{max}</Text>
      </View>
      {children}
    </View>
  );
}
