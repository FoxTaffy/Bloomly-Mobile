import { useCallback } from 'react';
import { useLang } from '@/stores/lang';
import { LANG_LOCALE, translate, type MessageKey, type Params } from '@/shared/i18n';

/** `const { t } = useT()`: t('key', { n: 3 }). Меняется вместе с языком, поэтому годится в deps. */
export function useT() {
  const lang = useLang((s) => s.lang);
  const t = useCallback((key: MessageKey, params?: Params) => translate(lang, key, params), [lang]);
  return { t, lang, locale: LANG_LOCALE[lang] };
}
