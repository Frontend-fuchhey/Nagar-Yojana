/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F9FA',
        simrik: {
          DEFAULT: '#DC143C',
          50: '#fff1f2',
          100: '#ffe4e6',
          600: '#dc143c',
          700: '#be123c',
        },
        forest: {
          DEFAULT: '#2E8B57',
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#2e8b57',
          700: '#15803d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
