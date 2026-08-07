/**
 * ─────────────────────────────────────────────────────────────
 * THEME PALETTES
 * ─────────────────────────────────────────────────────────────
 * All app colors live here. Every component references Tailwind
 * class names like `text-pink-400`, `bg-cyan/10`, `border-purple`,
 * etc. — the actual hex values are swapped from ONE place: this file.
 *
 * To change the entire app's look:
 *   1. Pick (or add) a palette below.
 *   2. Set `ACTIVE_THEME` to its key at the bottom of this file.
 *   3. Restart the dev server (Tailwind config is not hot-reloaded).
 *
 * Each palette must define: obsidian, navy, pink, purple, cyan, accent.
 * `pink` = primary accent, `purple` = secondary accent, `cyan` = tertiary accent.
 * (Names are historical — they no longer need to literally be pink/cyan.)
 * ─────────────────────────────────────────────────────────────
 */

const palettes = {
  /**
   * "indigo" — professional dark theme with more depth & saturation than "slate".
   * Richer indigo / violet / teal on a deep navy background. Still no neon.
   */
  indigo: {
    obsidian: { 950: '#0A0D16', 900: '#10141F', 800: '#171C2B', 700: '#212739', 600: '#2C3348' },
    navy:     { 950: '#0A0D16', 900: '#10141F', 800: '#171C2B', 700: '#212739', 600: '#2C3348' },
    pink: {
      DEFAULT: '#5B6EE8',
      50: '#EEF0FD', 100: '#D9DEFA', 200: '#B3BDF5', 300: '#8D9CF0',
      400: '#6C7FEA', 500: '#5B6EE8', 600: '#4453C7',
    },
    purple: {
      DEFAULT: '#A78BFA',
      50: '#F4F0FE', 100: '#E6DCFC', 200: '#CDB9F9', 300: '#B49CF5',
      400: '#A78BFA', 500: '#8B6FE8', 600: '#6D51C9',
    },
    cyan: {
      DEFAULT: '#2FB8AA',
      50: '#E6F8F6', 100: '#C1EEE9', 200: '#8EDDD3', 300: '#5CCBBE',
      400: '#2FB8AA', 500: '#249A8E', 600: '#1B7B72', 700: '#155F58',
    },
    accent: { red: '#F0655F', green: '#3DBE84', yellow: '#E0AC4C', blue: '#5B6EE8' },
  },

  /**
   * "slate" — muted, professional dark theme.
   * Desaturated indigo / sage-violet / muted teal. No neon, minimal glow.
   */
  slate: {
    obsidian: { 950: '#0C0E13', 900: '#12151D', 800: '#1A1E2A', 700: '#242A3A', 600: '#2F3648' },
    navy:     { 950: '#0C0E13', 900: '#12151D', 800: '#1A1E2A', 700: '#242A3A', 600: '#2F3648' },
    pink: {
      DEFAULT: '#6C7FD8',
      50: '#F1F2FC', 100: '#DFE2F7', 200: '#C3C9EF', 300: '#A6AFE6',
      400: '#8B96DD', 500: '#6C7FD8', 600: '#5566B8',
    },
    purple: {
      DEFAULT: '#8A7CA8',
      50: '#F5F3F8', 100: '#E7E2EF', 200: '#D2C9DF', 300: '#BCB0CE',
      400: '#A594BC', 500: '#8A7CA8', 600: '#6F638C',
    },
    cyan: {
      DEFAULT: '#5FA9A0',
      50: '#EFF7F6', 100: '#D7ECE9', 200: '#B3DBD5', 300: '#8FC9C1',
      400: '#77B8AF', 500: '#5FA9A0', 600: '#478A82', 700: '#356B65',
    },
    accent: { red: '#C4726B', green: '#7FAE8C', yellow: '#C9A15A', blue: '#8B93A7' },
  },

  /**
   * "warm" — the previous muted-but-colorful iteration (terracotta / lavender / sky-blue).
   * Kept here in case you want to switch back.
   */
  warm: {
    obsidian: { 950: '#0B0F1A', 900: '#0F1420', 800: '#161D2E', 700: '#1E2740', 600: '#273352' },
    navy:     { 950: '#0B0F1A', 900: '#0F1420', 800: '#161D2E', 700: '#1E2740', 600: '#273352' },
    pink: {
      DEFAULT: '#E8845E',
      50: '#FDF6F2', 100: '#F8E4DA', 200: '#EFC9B6', 300: '#E6A98C',
      400: '#E8845E', 500: '#D06A48', 600: '#B05438',
    },
    purple: {
      DEFAULT: '#8B7AB8',
      50: '#F4F2F8', 100: '#E8E4F0', 200: '#D1C9DE', 300: '#BAAECC',
      400: '#8B7AB8', 500: '#746199', 600: '#5D4E7A',
    },
    cyan: {
      DEFAULT: '#6BA3D6',
      50: '#F0F6FB', 100: '#DCEBF5', 200: '#B8D7EB', 300: '#94C4E1',
      400: '#6BA3D6', 500: '#5288BD', 600: '#3E6D9A', 700: '#2E5277',
    },
    accent: { red: '#E57373', green: '#7EC9A0', yellow: '#E8C87A', blue: '#6BA3D6' },
  },

  /**
   * "cyberpunk" — the original neon pink/purple/cyan look.
   */
  cyberpunk: {
    obsidian: { 950: '#030712', 900: '#070C1E', 800: '#0D1428', 700: '#141E38', 600: '#1B284A' },
    navy:     { 950: '#030712', 900: '#070C1E', 800: '#0D1428', 700: '#141E38', 600: '#1B284A' },
    pink: {
      DEFAULT: '#FF2A85',
      50: '#FFF0F6', 100: '#FFD6E7', 200: '#FFA8CE', 300: '#FF6EA6',
      400: '#FF4192', 500: '#FF2A85', 600: '#E00065',
    },
    purple: {
      DEFAULT: '#9D4EDF',
      50: '#F5E8FF', 100: '#E7C8FF', 200: '#D49BFF', 300: '#BF6EFF',
      400: '#9D4EDF', 500: '#8328D4', 600: '#6900B8',
    },
    cyan: {
      DEFAULT: '#00F0FF',
      50: '#E0FBFF', 100: '#B3F7FF', 200: '#80F0FF', 300: '#4DEAFF',
      400: '#1AE4FF', 500: '#00F0FF', 600: '#00C4D4', 700: '#0097A3',
    },
    accent: { red: '#FF4757', green: '#00FF9D', yellow: '#FFB703', blue: '#E2E8F0' },
  },
};

// ── Pick your active theme here ──────────────────────────────
const ACTIVE_THEME = 'indigo';

export const theme = palettes[ACTIVE_THEME];
export const themes = palettes;
