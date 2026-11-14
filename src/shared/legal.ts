// Правовые документы. Текст на вебе зашит в шаблоны Vue (TermsView, PrivacyView, DmcaView), а не в данные, поэтому
// приложение показывает публичные страницы bloomly.fun во встроенном WebView. Реквизиты — из frontend/src/lib/legal.ts.
export const LEGAL_DOCS = ['terms', 'privacy', 'dmca'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const isLegalDoc = (v: unknown): v is LegalDoc => typeof v === 'string' && (LEGAL_DOCS as readonly string[]).includes(v);

export const LEGAL_PATH: Record<LegalDoc, string> = { terms: '/terms', privacy: '/privacy', dmca: '/dmca' };

export const COMPANY_CONTACTS = {
  supportEmail: 'support@bloomly.fun',
  privacyEmail: 'privacy@bloomly.fun',
  dmcaEmail: 'dmca@bloomly.fun',
} as const;
