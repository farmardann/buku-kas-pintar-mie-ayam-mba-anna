/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        noodle: {
          DEFAULT: '#dd9e3e',
          hover: '#c88a2e',
          light: '#fef7ec',
          border: '#f5d9a8',
        },
        sambal: {
          DEFAULT: '#e11d48',
          hover: '#be123c',
          light: '#fff1f2',
          border: '#fecdd3',
        },
        canvas: '#fafaf9',
        surface: '#ffffff',
        stone: {
          deep: '#1c1917',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(28, 25, 23, 0.04), 0 1px 2px -1px rgba(28, 25, 23, 0.02)',
        'card': '0 2px 8px -2px rgba(28, 25, 23, 0.05), 0 1px 3px -1px rgba(28, 25, 23, 0.03)',
      },
    },
  },
  plugins: [],
};
