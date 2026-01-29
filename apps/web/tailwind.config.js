/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Mobile-optimized typography scale
        'xs': ['12px', { lineHeight: '16px' }],     // Small labels
        'sm': ['14px', { lineHeight: '20px' }],     // Secondary text
        'base': ['16px', { lineHeight: '24px' }],   // Body text (minimum for mobile)
        'lg': ['18px', { lineHeight: '28px' }],     // Large body text
        'xl': ['20px', { lineHeight: '28px' }],     // Button text
        '2xl': ['24px', { lineHeight: '32px' }],    // Large buttons/headings
        '3xl': ['30px', { lineHeight: '36px' }],    // Section headings
        '4xl': ['36px', { lineHeight: '40px' }],    // Page headings
        '5xl': ['48px', { lineHeight: '1' }],       // Hero text
        '6xl': ['60px', { lineHeight: '1' }],       // Display text
        '7xl': ['72px', { lineHeight: '1' }],       // Large display
        '8xl': ['96px', { lineHeight: '1' }],       // Extra large display
        '9xl': ['128px', { lineHeight: '1' }],      // Massive display
      },
    },
  },
  plugins: [],
};
