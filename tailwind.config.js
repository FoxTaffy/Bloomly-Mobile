/** @type {import('tailwindcss').Config} */
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
          muted: '#9AA3C7',
          offwhite: '#F9FAFD',
          accent: '#4C67CF',
        },
      },
    },
  },
  plugins: [],
};
