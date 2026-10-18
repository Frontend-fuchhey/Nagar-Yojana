/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#ffffff',
        parchment: '#f5f5f7',
        pearl: '#fafafc',
        ink: {
          DEFAULT: '#1d1d1f',
          80: '#333333',
          48: '#7a7a7a',
        },
        hairline: '#e0e0e0',
        action: {
          DEFAULT: '#0066cc',
          focus: '#0071e3',
          dark: '#2997ff',
        },
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
      borderRadius: {
        apple: '18px',
        'apple-md': '11px',
      },
      fontFamily: {
        sans: [
          '"SF Pro Text"',
          '"SF Pro Display"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
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
