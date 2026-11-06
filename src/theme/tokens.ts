// Единственное место, где в TS-коде живут цвета бренда (для нативных пропсов вроде StatusBar/иконок).
// Должно совпадать с tailwind.config.js и frontend/src/assets/style.css. В компонентах — классы `brand-*`.
export const colors = {
  bg: '#16192F',
  card: '#1F223C',
  border: '#2A2D45',
  offwhite: '#F9FAFD',
  accent: '#4C67CF',
  accentMinus: '#A1B4FF',
  success: '#66C770',
  error: '#E14664',
} as const;

// Классы ширины окна. Pixel Fold и планшеты попадают в medium/expanded (Material window size classes).
export const breakpoints = { medium: 600, expanded: 840 } as const;
