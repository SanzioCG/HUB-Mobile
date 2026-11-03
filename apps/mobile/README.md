# apps/mobile — U-HUB ilovasi (Expo)

React Native + Expo SDK 58, TypeScript strict, `expo-router` (`src/app/`). Expo Go'da ishlaydi.

## Ishga tushirish (Expo Go)

```powershell
npm install                      # repo ildizida
npm run fixtures                 # GLB + QR (bir marta)
npm run mock                     # mock API :8787
npm start -w @hub-mobile/mobile  # viewer build + nusxa + expo start
```

Telefon (Expo Go) kompyuter bilan bitta Wi-Fi'da bo'lishi kerak. QR'ni skanerlang → juftlash kodi `123456`.

Server manzili: `EXPO_PUBLIC_API_URL` (`apps/mobile/.env`), bo'lmasa dev'da Expo serverining IP'si + `:8787`.
Juftlash ekranida qo'lda o'zgartirsa bo'ladi.

## Tuzilma

```
src/app/          ekranlar (expo-router)
src/api/          kontrakt 4-bo'lim klienti, tiplar (taxminlar shu yerda — TODO(contract))
src/session/      token (expo-secure-store), 401 oqimi
src/viewer/       WebView + viewer bundle, GLB yetkazish (ADR-M002)
src/scan/         QR skaner yordamchilari, oxirgi skanerlar, skaner → 3D tanlov
src/offline/      oflayn kesh: GLB (LRU), ro'yxatlar, oflayn QR qidiruvi
src/components/   UI
src/theme.ts      rang/o'lcham tokenlari
src/i18n/uz.ts    matnlar
```

## Ekranlar

`/pair` juftlash · `/projects` loyihalar · `/projects/[id]` buyumlar · `/item/[projectId]/[itemId]` 3D (`?qr=` — skaner tanlovi) ·
`/scan` QR skaner · `/settings` sozlamalar va kesh · `/dev/spike` (dev).

Oflayn kesh chegaralari: `src/config.ts` → `CACHE_LIMITS` (founder sozlamasi).

## Skriptlar

`types` (tsc), `lint`, `jest`, `doctor` (expo-doctor), `copy-viewer` (`packages/viewer/dist/index.html` → `assets/viewer/viewer.html`).
