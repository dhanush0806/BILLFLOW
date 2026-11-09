/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf7',
          500: '#0c8fe9',
          600: '#0170c7',
          700: '#0259a2',
          800: '#064c85',
          900: '#0b406e',
          950: '#072849',
        },
        navy: {
          800: '#111827',
          900: '#0f172a',
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
};
