import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ember: '#e5092f',
        limeglass: '#a6ff4d',
        ink: '#080808',
        coal: '#121212',
        smoke: '#e8e1d8'
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(166,255,77,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
