import { theme as activeTheme } from './theme.js';

// Small helper to convert a hex color to "r, g, b" for rgba() strings below.
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
}

const P = activeTheme.pink.DEFAULT;
const PU = activeTheme.purple.DEFAULT;
const C = activeTheme.cyan.DEFAULT;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: activeTheme.obsidian,
        navy: activeTheme.navy,
        pink: activeTheme.pink,
        purple: activeTheme.purple,
        cyan: activeTheme.cyan,
        accent: activeTheme.accent,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-hero': `linear-gradient(135deg, ${C} 0%, ${PU} 40%, ${P} 100%)`,
        'gradient-accent': `linear-gradient(135deg, ${C} 0%, ${PU} 100%)`,
        'gradient-cyanpurple': `linear-gradient(135deg, ${C} 0%, ${PU} 100%)`,
        'gradient-dark': `linear-gradient(180deg, ${activeTheme.obsidian[950]} 0%, ${activeTheme.obsidian[900]} 50%, ${activeTheme.obsidian[800]} 100%)`,
        'gradient-card': `linear-gradient(135deg, rgba(${hexToRgb(C)},0.04) 0%, rgba(${hexToRgb(PU)},0.04) 100%)`,
        'gradient-mesh': `radial-gradient(at 0% 0%, rgba(${hexToRgb(C)}, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(${hexToRgb(P)}, 0.06) 0px, transparent 50%)`,
      },
      boxShadow: {
        'glow-pink': `0 2px 20px rgba(${hexToRgb(P)}, 0.12)`,
        'glow-purple': `0 2px 20px rgba(${hexToRgb(PU)}, 0.12)`,
        'glow-cyan': `0 2px 16px rgba(${hexToRgb(C)}, 0.12)`,
        'glow-green': `0 2px 12px rgba(${hexToRgb(activeTheme.accent.green)}, 0.12)`,
        'glow-red': `0 2px 12px rgba(${hexToRgb(activeTheme.accent.red)}, 0.12)`,
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
        'glass-hover': `0 12px 40px 0 rgba(${hexToRgb(C)}, 0.08)`,
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
          '0%': { boxShadow: `0 0 4px rgba(${hexToRgb(C)}, 0.1)` },
          '100%': { boxShadow: `0 0 12px rgba(${hexToRgb(C)}, 0.2)` },
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
