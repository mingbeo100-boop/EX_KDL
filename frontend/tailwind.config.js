/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inst: {
          navy: '#142B49',
          deep: '#0D1F35',
          academic: '#315D91',
          muted: '#6E87A5',
          canvas: '#F4F6F9',
          surface: '#FFFFFF',
          text: '#1B2738',
          textSecondary: '#637187',
          border: '#DFE5ED',
          borderStrong: '#CBD5E1',
          positive: '#18856B',
          warning: '#B7791F',
          critical: '#C43D4B',
          accent: '#255085',
        },
        navy: {
          50: '#F0F4F9',
          100: '#E1E9F2',
          200: '#C3D3E6',
          300: '#94B3D4',
          400: '#5E8EC0',
          500: '#315D91',
          600: '#255085',
          700: '#1D3F6B',
          800: '#142B49',
          900: '#0D1F35',
          950: '#07111E',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'inst-card': '0 1px 3px 0 rgba(20, 43, 73, 0.04), 0 1px 2px -1px rgba(20, 43, 73, 0.02)',
        'inst-dropdown': '0 4px 12px 0 rgba(13, 31, 53, 0.08), 0 2px 4px -1px rgba(13, 31, 53, 0.04)',
      },
      borderRadius: {
        'inst': '8px',
        'inst-lg': '10px',
      }
    },
  },
  plugins: [],
}
