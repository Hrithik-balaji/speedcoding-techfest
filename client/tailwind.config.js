/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#1a1a1a',
        panel:   '#282828',
        border:  '#3a3a3a',
        accent:  '#FFA116',
        easy:    '#2cbb5d',
        medium:  '#FFA116',
        hard:    '#ef4743',
        text:    '#eff1f6',
        muted:   '#8b949e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
