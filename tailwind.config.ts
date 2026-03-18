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
        // SaluLink Brand Blue — extracted from the "Salu" wordmark (#38b6ff)
        primary: {
          50:  '#edf9ff',
          100: '#d6f1ff',
          200: '#a6e3ff',
          300: '#68d1ff',
          400: '#38b6ff',  // Brand blue
          500: '#0e9fe8',
          600: '#007dc4',
          700: '#005f9e',
          800: '#004e82',
          900: '#003a61',
          950: '#001f38',
        },
        // SaluLink Purple/Violet — extracted from the abstract orb logo
        salu: {
          blue:      '#38b6ff',
          blueMid:   '#1a9de0',
          blueDark:  '#007dc4',

          violet:    '#7c3aed',
          purple:    '#9333ea',
          lilac:     '#a855f7',
          lavender:  '#c4b5fd',
          periwinkle:'#818cf8',

          // Dark surfaces
          bg:        '#07091a',
          bgDeep:    '#040611',
          surface:   '#0d1025',
          surface2:  '#121630',
          surface3:  '#171d3a',
          border:    '#1e2748',
          borderGlow:'#38b6ff33',

          // Text
          text:      '#f1f5f9',
          textMuted: '#94a3b8',
          textFaint: '#475569',

          // Status
          success:   '#10d9a0',
          warning:   '#f59e0b',
          error:     '#f43f5e',
        },
        // Keep accent for compatibility
        accent: {
          50:  '#fff0f3',
          100: '#ffe0e7',
          200: '#ffc0ce',
          300: '#ff8da5',
          400: '#f43f5e',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
          800: '#881337',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'salu-gradient':    'linear-gradient(135deg, #38b6ff 0%, #7c3aed 50%, #a855f7 100%)',
        'salu-gradient-r':  'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #38b6ff 100%)',
        'salu-dark':        'radial-gradient(ellipse at top left, #0d1025 0%, #07091a 60%, #040611 100%)',
        'card-glow':        'radial-gradient(ellipse at top, #38b6ff18 0%, transparent 70%)',
        'purple-glow':      'radial-gradient(ellipse at bottom right, #7c3aed22 0%, transparent 70%)',
      },
      boxShadow: {
        'salu-blue':   '0 0 20px rgba(56, 182, 255, 0.25), 0 4px 24px rgba(56, 182, 255, 0.12)',
        'salu-purple': '0 0 20px rgba(124, 58, 237, 0.25), 0 4px 24px rgba(124, 58, 237, 0.12)',
        'salu-card':   '0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'salu-inset':  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)',
        'glow-blue':   '0 0 40px rgba(56,182,255,0.3)',
        'glow-purple': '0 0 40px rgba(168,85,247,0.3)',
      },
      animation: {
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'slide-arrow':  'slideArrow 0.8s ease-out',
        'shimmer':      'shimmer 2s linear infinite',
        'spin-slow':    'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', filter: 'blur(20px)' },
          '50%':      { opacity: '1',   filter: 'blur(30px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
