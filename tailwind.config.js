import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2fbf9',
          100: '#d1f4eb',
          200: '#a1e9d8',
          300: '#6bd8c0',
          400: '#3fc0a4',
          500: '#179d86',
          600: '#0f766e',
          700: '#0f5d59',
          800: '#114c48',
          900: '#103f3d',
        },
      },
    },
  },
  plugins: [forms],
};
