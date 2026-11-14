/**
 * Единственный TS-файл с цветами. Палитра brand-* совпадает с tailwind.config.js и docs/brand-guide.
 * Группа «вне палитры» — значения, которые уже были в экранах входа и иконках до введения токенов:
 * вынесены без изменения вида, их нужно согласовать с бренд-гайдом (см. docs/ARCHITECTURE.md).
 */
export const colors = {
  // Палитра бренда
  bg: '#16192F',
  border: '#2A2D45',
  offwhite: '#F9FAFD',
  accent: '#4C67CF',
  accentMinus: '#A1B4FF',
  success: '#66C770',
  error: '#E14664',
  warning: '#E76F51',
  yellow: '#FFC01F',
  pink: '#F7A9E2',
  purple: '#CD83F5',
  black: '#000',

  // Вне палитры бренда
  mutedIcon: '#7C86AE',
  authBg: '#080b1a',
  authBgGlass: 'rgba(12,15,32,0.6)',
  disabled: '#3A4060',
  violet: '#a78bfa',
  violetStrong: '#8B6ED8',
  violetBg: 'rgba(124,58,237,0.1)',
  violetBorder: 'rgba(124,58,237,0.25)',
  blue: '#3B82F6',
  periwinkle: '#7B9CFF',
  indigo: '#7B6FD4',
  buttonFrom: '#3d56c4',
  buttonMid: '#6057cc',
  buttonTo: '#7B4FD0',
  errorSoft: '#f87171',
  errorBg: 'rgba(225,70,100,0.08)',
  errorBorder: 'rgba(225,70,100,0.2)',
  accentBg: 'rgba(76,103,207,0.2)',
  accentBorder: 'rgba(76,103,207,0.3)',
  accentFocusBorder: 'rgba(76,103,207,0.6)',
  accentFocusBg: 'rgba(76,103,207,0.07)',
  white04: 'rgba(255,255,255,0.04)',
  white08: 'rgba(255,255,255,0.08)',
  white12: 'rgba(255,255,255,0.12)',
  white20: 'rgba(255,255,255,0.2)',
  white22: 'rgba(255,255,255,0.22)',
  white35: 'rgba(255,255,255,0.35)',
  inkDark: '#1a1a2e',

  // Бренды внешних сервисов (OAuth)
  yandex: '#fc3f1d',
  twitch: '#9146FF',
  googleBlue: '#4285F4',
  googleGreen: '#34A853',
  googleYellow: '#FBBC05',
  googleRed: '#EA4335',
} as const;
