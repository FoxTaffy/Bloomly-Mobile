import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui';
import { useFursonaReferences, useFursonas, useFursuits } from '@/hooks/useProfile';
import { useNsfwMode } from '@/hooks/useNsfwMode';
import { useT } from '@/hooks/useT';
import { mediaSource } from '@/lib/mediaAuth';
import { speciesLabel } from '@/shared/fursonaSpecies';
import { colors } from '@/theme/tokens';

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Вкладка «Фурсона»: персонажи (вид, палитра, «нравится / не нравится», референсы) и фурсьюты. Только чтение. Веб: ProfileFursonaTab.vue, ProfileFursuitTab.vue. */
export function FursonaTab({ userId, isOwn }: { userId: string; isOwn: boolean }) {
  const { t, lang } = useT();
  const { nsfwMode } = useNsfwMode();
  const fursonas = useFursonas(userId, true);
  const suits = useFursuits(userId, true);
  const [pick, setPick] = useState<string | null>(null);
  const list = fursonas.data ?? [];
  const current = list.find((f) => f.id === pick) ?? list.find((f) => f.is_primary) ?? list[0];
  const refs = useFursonaReferences(userId, current?.id);
  const palette = (current?.colors ?? []).filter((c) => HEX.test(c));
  const species = [...(current?.species ?? []).map((k) => speciesLabel(k, lang)), ...(current?.species_other ? [current.species_other] : [])].join(', ');
  // Симпатии скрыл владелец — видит их только он сам
  const showLikes = !!current && (current.likes_dislikes_visible || isOwn) && (current.likes.length > 0 || current.dislikes.length > 0);

  if (fursonas.isLoading || suits.isLoading) return <View className="gap-3 px-4"><Skeleton height={120} /><Skeleton height={80} /></View>;
  if (list.length === 0 && (suits.data ?? []).length === 0) {
    return <Text className="px-4 py-10 text-center font-nunito text-sm text-brand-muted">{t('mFursonaEmpty')}</Text>;
  }

  return (
    <View className="gap-4 px-4 pb-6">
      {list.length > 1 ? (
        <View className="flex-row flex-wrap gap-2">
          {list.map((f) => (
            <Pressable key={f.id} onPress={() => setPick(f.id)} accessibilityRole="button" accessibilityState={{ selected: f.id === current?.id }} className={`rounded-full border px-4 py-1.5 ${f.id === current?.id ? 'border-brand-accent bg-brand-accent-plus-plus' : 'border-brand-border bg-brand-card'}`}>
              <Text className={`font-nunito-bold text-sm ${f.id === current?.id ? 'text-brand-accent-minus' : 'text-brand-muted'}`}>{f.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {current ? (
        <View className="gap-3 rounded-2xl border border-brand-border bg-brand-card p-4">
          <Text className="font-nunito-extrabold text-lg text-brand-offwhite">{current.name}</Text>
          {species ? <Text className="font-nunito text-sm text-brand-muted">{species}</Text> : null}
          {palette.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {palette.map((c) => <View key={c} accessibilityLabel={c} style={{ backgroundColor: c }} className="h-7 w-7 rounded-full border border-brand-border" />)}
            </View>
          ) : null}
          {showLikes ? (
            <View className="gap-2">
              {current.likes.length > 0 ? <Chips label={t('fursonaLikesLabel')} items={current.likes} tone="success" /> : null}
              {current.dislikes.length > 0 ? <Chips label={t('fursonaDislikesLabel')} items={current.dislikes} tone="error" /> : null}
            </View>
          ) : null}
          {(refs.data ?? []).length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {(refs.data ?? []).map((r) => <Image key={r.id} source={mediaSource(r.image_url)} style={{ width: 96, height: 96, borderRadius: 12 }} contentFit="cover" accessibilityLabel={r.artist_name ?? t('mFursonaRef')} />)}
            </View>
          ) : null}
        </View>
      ) : null}

      {(suits.data ?? []).length > 0 ? (
        <View className="gap-3">
          <Text className="font-nunito-bold text-xs text-brand-muted">{t('mFursuits', { n: (suits.data ?? []).length })}</Text>
          {(suits.data ?? []).map((s) => {
            // 18+: как у постов — при режиме «скрыто» не показываем, при «размыто» размываем
            const hidden = s.is_nsfw && nsfwMode === 'hide';
            return (
              <View key={s.id} className="gap-2 overflow-hidden rounded-2xl border border-brand-border bg-brand-card">
                {s.image_url ? (
                  hidden ? (
                    <View className="h-40 items-center justify-center bg-brand-bg"><Text className="font-nunito-bold text-brand-muted">{t('mNsfwHidden')}</Text></View>
                  ) : (
                    <Image source={mediaSource(s.image_url)} style={{ width: '100%', height: 220 }} contentFit="cover" blurRadius={s.is_nsfw && nsfwMode === 'blur' ? 40 : 0} />
                  )
                ) : null}
                {s.description && !hidden ? <Text className="px-4 pb-3 font-nunito text-sm leading-5 text-brand-offwhite">{s.description}</Text> : <View className="pb-1" />}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Chips({ label, items, tone }: { label: string; items: string[]; tone: 'success' | 'error' }) {
  return (
    <View className="gap-1.5">
      <Text className={`font-nunito-bold text-xs ${tone === 'success' ? 'text-brand-success' : 'text-brand-error'}`}>{label}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {items.map((x) => (
          <View key={x} className="rounded-full border border-brand-border bg-brand-bg px-3 py-1"><Text className="font-nunito text-xs text-brand-offwhite">{x}</Text></View>
        ))}
      </View>
    </View>
  );
}
