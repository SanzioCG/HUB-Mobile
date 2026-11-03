import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build — bitta HTML fayl (JS va CSS ichida): WebView va mijoz havolasi uchun (kontrakt 1, 8-bo'limlar).
export default defineConfig({
  plugins: [viteSingleFile()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', outDir: 'dist', chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
