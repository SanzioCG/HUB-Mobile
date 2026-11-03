import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  // .env ixtiyoriy — standart qiymatlar ishlatiladi
}

export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 8787),
  devToken: process.env.MOCK_DEV_TOKEN ?? 'dev-token',
  /** `POST /mobile/ar-link` imzosi (HMAC-SHA256). Faqat mock. */
  signSecret: process.env.MOCK_SIGN_SECRET ?? 'dev-sign-secret',
  /** Desktopdagi "Telefonni ulash" kodi o'rnida (kontrakt 4: 6 raqam). Mock faqat shu kodni qabul qiladi. */
  pairCode: '123456',
};

export const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));
