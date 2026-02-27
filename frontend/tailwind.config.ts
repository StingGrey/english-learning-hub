import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Helvetica Neue",
          "Helvetica",
          "Inter",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        swiss: {
          black: "#0a0a0a",
          dark: "#1a1a1a",
          gray: "#6b6b6b",
          light: "#e5e5e5",
          bg: "#fafafa",
          white: "#ffffff",
          accent: "#e60000", // 瑞士红，用于极少量强调
        },
      },
      spacing: {
        grid: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
