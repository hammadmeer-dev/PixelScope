import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './src/popup/index.html',
    './src/options/index.html',
    './src/devtools/devtools.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

