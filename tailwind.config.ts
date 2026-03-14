import type { Config } from "tailwindcss";

export default {
  darkMode: 'media',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          page: '#121217',
          sectionPanel: '#181820',
          card: '#1A0A0D',
          cardBase: '#2D1116',
          cardGradientFrom: '#3A0F14',
          cardGradientTo: '#24080C',
          cardHighlight: '#2B0D13',
          border: '#3A1218',
          accent: '#EF4444',
          accentWarm: '#F97316',
          text: '#F5F5F5',
          textMuted: '#A1A1AA',
        },
        primary: {
          DEFAULT: '#EF4444', // Cinema accent red
          light: '#F87171',
          dark: '#DC2626',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#F87171',
          dark: '#B91C1C',
        },
        neutral: {
          DEFAULT: '#F8FAFC',
          dark: '#121217',
          darker: '#121217',
        },
        text: {
          DEFAULT: '#0F172A',
          light: '#64748B',
          dark: '#F5F5F5',
        },
        surface: {
          light: '#1A0A0D',
          dark: '#121217',
        },
        accent: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0,0,0,0.2)',
        'hover': '0 4px 12px -2px rgba(239, 68, 68, 0.15), 0 2px 6px -2px rgba(0,0,0,0.3)',
        'cinema-card': '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(58, 18, 24, 0.2)',
        'cinema-card-hover': '0 10px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.15)',
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(145deg, #3A0F14, #24080C)',
        'hero-gradient': 'linear-gradient(145deg, #3A0F14, #24080C)',
      },
    },
  },
  plugins: [],
} satisfies Config;
