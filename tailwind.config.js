/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        injective: {
          50: '#f0f4ff',
          100: '#e0e8ff',
          500: '#4f6ef7',
          600: '#2d4de8',
          900: '#0f1a3d',
          950: '#070d24',
        },
      },
    },
  },
  plugins: [],
};