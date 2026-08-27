import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // Phaser 体积较大，单 chunk 超过默认警告线属预期
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 5173,
    host: true,
  },
});
