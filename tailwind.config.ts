import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SaluLink baby blue — #38b6ff
        primary: {
          50:  '#eff9ff',
          100: '#d0edff',
          200: '#a7dcff',
          300: '#6dc9ff',
          400: '#38b6ff',
          500: '#0ea0f0',
          600: '#007dd4',
          700: '#0062ab',
          800: '#00508b',
          900: '#003e6b',
        },
        // SaluLink orb purple — mirrors the violet in the brand orb
        accent: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #eff9ff 0%, #f5f3ff 50%, #eff9ff 100%)',
        'brand-header': 'linear-gradient(90deg, #ffffff 60%, #eff9ff 100%)',
      },
    },
  },
  plugins: [],
};

export default config;

