/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        telenor: {
          blue:      '#01ACFB',
          'blue-dark': '#0085C3',
          'blue-deep': '#005A8E',
          'blue-light': '#E6F7FF',
          'blue-pale': '#F0FAFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
