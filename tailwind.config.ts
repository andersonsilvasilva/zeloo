import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "Barbearia Premium" — ver spec item 2 (Identidade Visual)
        primary: {
          DEFAULT: "#C6A15B", // dourado premium
          light: "#D4AF37",
          foreground: "#080808",
        },
        secondary: {
          DEFAULT: "#FFFFFF",
        },
        background: {
          DEFAULT: "#080808",
          secondary: "#121212",
        },
        card: {
          DEFAULT: "#181818",
        },
        border: {
          DEFAULT: "#2A2A2A",
        },
        text: {
          DEFAULT: "#FFFFFF",
          secondary: "#B5B5B5",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
