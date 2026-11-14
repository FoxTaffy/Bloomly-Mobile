import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useT } from '@/hooks/useT';
import { dateFieldOrder, parseDateParts, todayIso, type DateField as Part, type DateParts } from '@/shared/age';
import { colors } from '@/theme/tokens';

interface DateFieldProps {
  /** ISO YYYY-MM-DD или null. */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Дата введена, но неверна (вне диапазона, 31.02, будущее). */
  onInvalid?: (invalid: boolean) => void;
  label?: string;
}

/** Дата тремя полями (порядок по локали), как DateInput.vue: наружу уходит только пустое или верное значение. */
export function DateField({ value, onChange, onInvalid, label }: DateFieldProps) {
  const { t, locale } = useT();
  const order = dateFieldOrder(locale);
  const [parts, setParts] = useState<DateParts>(() => {
    const [y = '', m = '', d = ''] = (value ?? '').split('-');
    return { year: y, month: m, day: d };
  });
  const refs = useRef<Partial<Record<Part, TextInput | null>>>({});
  const placeholders: Record<Part, string> = { day: t('mDateDay'), month: t('mDateMonth'), year: t('mDateYear') };

  const parsed = parseDateParts(parts, todayIso());
  const invalid = parsed.state === 'invalid';

  useEffect(() => {
    onInvalid?.(invalid);
    onChange(parsed.state === 'valid' ? parsed.value : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]);

  const set = (field: Part, raw: string, i: number) => {
    const max = field === 'year' ? 4 : 2;
    const v = raw.replace(/\D/g, '').slice(0, max);
    setParts((p) => ({ ...p, [field]: v }));
    const next = order[i + 1];
    if (v.length === max && next) refs.current[next]?.focus();
  };

  const reason = parsed.state === 'invalid' ? t(parsed.reason === 'range' ? 'mDateRange' : parsed.reason === 'overflow' ? 'mDateOverflow' : 'mDateFuture') : null;

  return (
    <View>
      {label ? <Text className="mb-1.5 font-nunito-bold text-xs text-brand-muted">{label}</Text> : null}
      <View className="flex-row gap-2">
        {order.map((field, i) => (
          <TextInput
            key={field}
            ref={(r) => {
              refs.current[field] = r;
            }}
            value={parts[field]}
            onChangeText={(v) => set(field, v, i)}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && parts[field] === '' && i > 0) refs.current[order[i - 1]]?.focus();
            }}
            keyboardType="number-pad"
            maxLength={field === 'year' ? 4 : 2}
            placeholder={placeholders[field]}
            placeholderTextColor={colors.mutedIcon}
            accessibilityLabel={placeholders[field]}
            className={`min-h-11 rounded-2xl border bg-brand-card px-3 text-center font-nunito text-brand-offwhite ${field === 'year' ? 'w-24' : 'w-16'} ${invalid ? 'border-brand-error' : 'border-brand-border'}`}
          />
        ))}
      </View>
      {reason ? <Text className="mt-1 font-nunito text-xs text-brand-error">{reason}</Text> : null}
    </View>
  );
}
