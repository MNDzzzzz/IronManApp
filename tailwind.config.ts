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
        },
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
    },
  },
  plugins: [],
};

export default config;
