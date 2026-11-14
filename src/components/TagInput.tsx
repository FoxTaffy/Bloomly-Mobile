import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Chip, Field } from '@/components/ui';
import { colors } from '@/theme/tokens';

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: readonly string[];
  /** Как на вебе (SettingsTagInput.vue): до 30 меток, каждая до 100 символов. */
  max?: number;
  tone?: 'success' | 'error';
}

export function TagInput({ label, placeholder, tags, onChange, suggestions = [], max = 30, tone = 'success' }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const add = (value: string) => {
    const v = value.trim().slice(0, 100);
    if (v && !tags.includes(v) && tags.length < max) onChange([...tags, v]);
    setDraft('');
  };
  const free = suggestions.filter((s) => !tags.includes(s));
  const toneText = tone === 'success' ? 'text-brand-success' : 'text-brand-error';

  return (
    <View className="gap-2">
      <Text className={`font-nunito-bold text-xs ${toneText}`}>{label}</Text>
      {tags.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <Pressable key={tag} onPress={() => onChange(tags.filter((x) => x !== tag))} accessibilityRole="button" accessibilityLabel={`${tag}: ×`} className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-brand-border bg-brand-card px-3">
              <Text className="font-nunito-bold text-sm text-brand-offwhite">{tag}</Text>
              <X size={12} color={colors.mutedIcon} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {free.length > 0 && tags.length < max ? (
        <View className="flex-row flex-wrap gap-2">
          {free.map((s) => (
            <Chip key={s} label={s} onPress={() => add(s)} />
          ))}
        </View>
      ) : null}
      <View className="flex-row items-center gap-2">
        <Field value={draft} onChangeText={setDraft} placeholder={placeholder} maxLength={100} onSubmitEditing={() => add(draft)} returnKeyType="done" className="flex-1" />
        <Pressable onPress={() => add(draft)} disabled={!draft.trim() || tags.length >= max} accessibilityRole="button" accessibilityLabel={placeholder} className={`h-11 w-11 items-center justify-center rounded-2xl bg-brand-accent ${!draft.trim() || tags.length >= max ? 'opacity-50' : ''}`}>
          <Plus size={18} color={colors.offwhite} />
        </Pressable>
      </View>
    </View>
  );
}
