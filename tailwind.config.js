/** @type {import('tailwindcss').Config} */
// Токены — по бренд-гайду (docs/brand-guide.jpg), совпадают с frontend/src/assets/style.css основного репозитория.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#16192F',
          card: '#1F223C',
          border: '#2A2D45',
          muted: '#3A4060',
          offwhite: '#F9FAFD',
          accent: '#4C67CF',
          'accent-plus': '#31458F',
          'accent-plus-plus': '#161F40',
          'accent-minus': '#A1B4FF',
          'accent-minus-minus': '#D5DDFF',
          'accent-minus-minus-minus': '#EEF2FF',
          success: '#66C770',
          error: '#E14664',
          warning: '#E76F51',
          yellow: '#FFC01F',
          pink: '#F7A9E2',
          purple: '#CD83F5',
        },
      },
      // В React Native начертание задаётся семейством, а не font-weight
      fontFamily: {
        nunito: ['Nunito_400Regular'],
        'nunito-medium': ['Nunito_500Medium'],
        'nunito-bold': ['Nunito_700Bold'],
      },
    },
  },
  plugins: [],
};
