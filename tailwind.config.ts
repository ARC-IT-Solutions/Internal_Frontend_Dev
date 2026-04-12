import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono:  ['var(--font-mono)'],
      },
      colors: {
        'arc-gold':   '#c9a84c',
        'arc-gold-lt':'#e8c96a',
        'arc-cream':  '#e8e0d0',
        'arc-ivory':  '#f5f0e8',
        'arc-mute':   '#7a7060',
        'arc-dim':    '#3d3828',
        'arc-bg':     '#0e0c09',
      },
    },
  },
  plugins: [],
};
export default config;
