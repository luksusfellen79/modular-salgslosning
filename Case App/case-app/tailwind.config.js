/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        telenor: {
          blue: '#005A8E',
          'blue-dark': '#003D61',
          teal: '#00827F',
          light: '#01ACFB',
        },
      },
    },
  },
  plugins: [],
};
