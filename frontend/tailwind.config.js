/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#030712',
          900: '#070C1E',
          800: '#0D1428',
          700: '#141E38',
          600: '#1B284A',
        },
        navy: {
          950: '#030712',
          900: '#070C1E',
          800: '#0D1428',
          700: '#141E38',
          600: '#1B284A',
        },
        pink: {
          DEFAULT: '#FF2A85',
          50: '#FFF0F6',
          100: '#FFD6E7',
          200: '#FFA8CE',
          300: '#FF6EA6',
          400: '#FF4192',
          500: '#FF2A85',
          600: '#E00065',
        },
        purple: {
          DEFAULT: '#9D4EDF',
          50: '#F5E8FF',
          100: '#E7C8FF',
          200: '#D49BFF',
          300: '#BF6EFF',
          400: '#9D4EDF',
          500: '#8328D4',
          600: '#6900B8',
        },
        cyan: {
          DEFAULT: '#00F0FF',
          50: '#E0FBFF',
          100: '#B3F7FF',
          200: '#80F0FF',
          300: '#4DEAFF',
          400: '#1AE4FF',
          500: '#00F0FF',
          600: '#00C4D4',
          700: '#0097A3',
        },
        accent: {
          red: '#FF4757',
          green: '#00FF9D',
          yellow: '#FFB703',
          blue: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #FF2A85 0%, #9D4EDF 40%, #00F0FF 100%)',
        'gradient-accent': 'linear-gradient(135deg, #FF2A85 0%, #9D4EDF 100%)',
        'gradient-cyanpurple': 'linear-gradient(135deg, #00F0FF 0%, #9D4EDF 100%)',
        'gradient-dark': 'linear-gradient(180deg, #030712 0%, #070C1E 50%, #0D1428 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,42,133,0.06) 0%, rgba(157,78,223,0.06) 100%)',
        'gradient-mesh': 'radial-gradient(at 0% 0%, rgba(255, 42, 133, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 240, 255, 0.15) 0px, transparent 50%)',
      },
      boxShadow: {
        'glow-pink': '0 0 35px rgba(255, 42, 133, 0.35)',
        'glow-purple': '0 0 35px rgba(157, 78, 223, 0.35)',
        'glow-cyan': '0 0 25px rgba(0, 240, 255, 0.35)',
        'glow-green': '0 0 15px rgba(0, 255, 157, 0.35)',
        'glow-red': '0 0 15px rgba(255, 71, 87, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-hover': '0 12px 40px 0 rgba(0, 240, 255, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2.5s ease-in-out infinite alternate',
        'blob': 'blob 8s infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(255, 42, 133, 0.2)' },
          '100%': { boxShadow: '0 0 35px rgba(255, 42, 133, 0.6)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(40px, -60px) scale(1.12)' },
          '66%': { transform: 'translate(-30px, 30px) scale(0.92)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
        xl: '20px',
        '2xl': '30px',
      },
    },
  },
  plugins: [],
}
