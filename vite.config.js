import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — щоб зібраний сайт працював з будь-якої папки (GitHub Pages, itch.io тощо)
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
