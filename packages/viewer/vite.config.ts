import { defineConfig, type Plugin } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * M-A6: assets/ dagi SVG'lar (`?raw`) ichidagi C2PA `<metadata>` (har birida ~20 KB) bundle'ga kirmasin.
 * Ko'rinishga ta'sir qilmaydi; runtime'dagi `stripSvgMetadata` — qo'shimcha himoya.
 */
function stripSvgMetadata(): Plugin {
  const re = new RegExp('<metadata>[^]*?</metadata>', 'g');
  return {
    name: 'uhub-strip-svg-metadata',
    enforce: 'post',
    transform(code, id) {
      if (!id.includes('.svg?raw')) return null;
      return { code: code.replace(re, ''), map: null };
    },
  };
}

// Build — bitta HTML fayl (JS va CSS ichida): WebView va mijoz havolasi uchun (kontrakt 1, 8-bo'limlar).
export default defineConfig({
  plugins: [stripSvgMetadata(), viteSingleFile()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', outDir: 'dist', chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
