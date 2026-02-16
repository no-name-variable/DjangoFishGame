/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#f5f0e8',
          100: '#e8dcc8',
          200: '#d4c5a9',
          300: '#c0a87a',
          400: '#a8894e',
          500: '#8b6d3f',
          600: '#5c3d1e',
          700: '#4a3118',
          800: '#3a2512',
          900: '#2a1a0d',
        },
        forest: {
          50: '#e8f5e8',
          100: '#c8e6c8',
          200: '#a5d6a5',
          300: '#7bc67b',
          400: '#4caf4c',
          500: '#2e7d2e',
          600: '#1a5a1a',
          700: '#1a3a1a',
          800: '#122812',
          900: '#0d1f0d',
        },
        water: {
          50: '#e8f0f5',
          100: '#c8d8e8',
          200: '#a0b8d0',
          300: '#7898b8',
          400: '#5078a0',
          500: '#3a6088',
          600: '#2a4a6a',
          700: '#1a2a4a',
          800: '#101a30',
          900: '#0a1020',
        },
        gold: {
          DEFAULT: '#d4a84a',
          light: '#e8c86a',
          dark: '#b08830',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'PT Serif', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'wood-grain': 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      },
      boxShadow: {
        'inner-glow': 'inset 0 0 20px rgba(0,0,0,0.3)',
        'wood': '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bob': 'bob 2s ease-in-out infinite',
        'ripple': 'ripple 1.5s ease-out infinite',
      },
      keyframes: {
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
