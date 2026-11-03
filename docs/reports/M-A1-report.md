# M-A1 hisoboti — Expo ilova, WebView spike, juftlash, 4 ekran

- Sana: 2026-11-03 · Branch: `batch/m-a1` → `main`, merge **`6dda66a`**
- Tuzatish: `fix/m-a1-config-env` (`bed8608`) — telefonda topilgan xato, pastda.
- Gate: M-A0 ning 6 qadami o'zgarmadi + mobil typecheck, lint, Jest (22 test), expo-doctor (20/20), viewer asset.
  Birinchi ishga tushirishda o'tdi.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| Viewer o'zgarishi | `386c326` | Alohida commit, sabablari pastda |
| 1. Expo skeleti | `0ddc5a0` | Expo SDK 58, `expo-router`, `theme.ts` tokenlari; bridge tiplari `@hub-mobile/viewer/bridge` dan import |
| 2. WebView spike | `bf930c3` | A (onlayn) va B (oflayn kesh) yo'llari, `/dev/spike`, ADR-M002 |
| 3. API va juftlash | `eb8ae18` | Tiplangan klient, `ApiError`, 15 s timeout, `expo-secure-store`, 401 oqimi, Jest |
| 4. Ekranlar | `61b7bdd` | Loyihalar, Loyiha, 3D, Detal kartasi; yuklanish/bo'sh/xato holatlari; matnlar `src/i18n/uz.ts` da |
| 5. Gate | `290a41a` | Yangi qadamlar mavjudlarining oxirida |

Bajarilmagan / qisman: yuklanish ko'rsatkichi faqat spinner, foiz yo'q — viewer progress xabarini bermaydi.

## Telefonda tekshirildi (Honor X9d, Expo Go)

Founder tasdiqladi: `123456` bilan juftlash → loyihalar → buyum → 3D; aylantirish/yaqinlashtirish, ochish/yopish,
rejimlar, o'lchamlar; detal kartasi va "Ochish"; spike; qayta ochganda juftlash saqlangan; 401 da juftlashga qaytish.

Sinov paytida topilgan muammolar:

1. **Mehmon Wi-Fi (EMAN Guest 7) qurilmalarni ajratadi** — telefon kompyuterga yetolmadi (`ERR_ADDRESS_UNREACHABLE`).
   Yechim: telefon hotspot'i. Kod muammosi emas; ofis Wi-Fi'da sinash uchun mehmon bo'lmagan tarmoq kerak.
2. **"undefined is not a function" (`config.ts`)** — `app.config.ts` dagi `process.env.EXPO_PUBLIC_API_URL ?? null`
   Expo config yuklagichidan `{}` bo'lib chiqqan. Tuzatildi (`bed8608`): `EXPO_PUBLIC_*` ilova kodida to'g'ridan-to'g'ri
   o'qiladi va tip tekshiriladi.
3. Brauzerda `:8081` ochilganda web bundle xatosi — kutilgan holat, web nishon emas.

## Spike xulosasi (ADR-M002)

- **A (onlayn) — asosiy taklif.** Viewer HTML'i server manzili bilan ochiladi (`source.html` + `baseUrl`), GLB
  bir xil origin'dan olinadi: CORS va `file://` muammolari yo'q.
- **B (oflayn kesh)** — oflayn rejim uchun (M-A2). WebView'ning `file://` ruxsatlariga bog'liq.
- **Founder to'ldiradi:** ADR-M002 jadvali — A va B: birinchi ochish, keshdan, Wi-Fi o'chiq (ms qiymatlari).

## Viewer'ga kiritilgan o'zgarishlar (`386c326`)

- `exports ./bridge` — ilova xabar tiplarini nusxasiz import qilishi uchun.
- `selected.clip` — kartadagi "Ochish/Yopish" qaysi eshik/tortma klipini chaqirishini bilishi uchun.
- `deselected` (bo'sh joyga bosish) va `deselect` (karta yopildi).
- http(s) bo'lmagan manzil uchun XHR — B yo'li: WebView'da `fetch` `file:` ni qo'llab-quvvatlamaydi.

## Kontraktdan chetga chiqishlar va boshqa qarorlar

- Promptda yo'q, qo'shildi: "Uzish" tugmasi, dev rejimdagi "Spike" tugmasi, juftlash ekranida server manzilini
  qo'lda o'zgartirish.
- Root `package.json` da `overrides: react 19.3.0` — bir paket 19.3.1 ni tortgan, ikki React RN'ni buzardi.
- `@parcel/watcher` o'rnatish skripti rad etildi (Windows binari tayyor, C++ kompilyator talab qilinmasin).
- HTTP faqat `APP_VARIANT=development` da (Android cleartext, iOS ATS); Expo Go bu sozlamalarni ishlatmaydi.

## `TODO(contract)` — M-A1 da qo'shilganlar (barchasi `apps/mobile/src/api/types.ts`)

1. Segment filtr ↔ `status` (Sexda = `production`, Tasdiqlanmagan = `design` deb olindi).
2. Holat ranglari va matnlari.
3. `revision_id` → "R5" ko'rinishi.
4. O'chirilgan loyiha `updated_since` javobida qanday bildiriladi.

M-A0 dagilar takrorlanadi: `user`/`company`, `status`, xato tanasi, buyum `size_mm`, `thumb_url`/`usdz_url` null.

## Keyingi qadam (M-A2)

QR skaner va haptic, "Oxirgi skanerlar", oflayn kesh siyosati (spike o'lchovlariga ko'ra).
