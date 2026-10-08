import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        oled: "#000000",
        // Paleta base Ivory Cream (Claude) y Slate/Obsidian
        ivory: {
          50: "#FCFCF9",
          100: "#FAF9F5",
          200: "#F3F1EA",
          300: "#E5E2D9",
          400: "#C9C5B9",
          900: "#141413",
        },
        obsidian: {
          950: "#07090E",
          900: "#0A0D14",
          850: "#111520",
          800: "#181E2C",
        },
        surface: {
          DEFAULT: "#121214",
          card: "#18181b",
          border: "#27272a",
          muted: "#3f3f46",
        },
        brand: {
          strava: "#FC5200",
          apple: "#FA2D48",
          emerald: "#10B981",
          amber: "#F59E0B",
          cyan: "#06B6D4",
          blue: "#3B82F6",
          clay: "#D97757",    // Acento Claude Hero / Micrófono
          sage: "#3B7C62",    // Cuidado articular / Z2
        },
      },
      boxShadow: {
        'liquid-light': '0 10px 30px -5px rgba(20, 20, 19, 0.05), 0 2px 8px -2px rgba(20, 20, 19, 0.03)',
        'liquid-dark': '0 14px 40px -10px rgba(0, 0, 0, 0.50), 0 2px 10px -2px rgba(0, 0, 0, 0.30)',
        'liquid-bevel-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95)',
        'liquid-bevel-dark': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.14)',
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      transitionTimingFunction: {
        'apple-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'apple-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'apple-snappy': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        appleFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        appleScaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'apple-fade-in': 'appleFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'apple-scale-in': 'appleScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
