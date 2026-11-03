# ADR-M002 — GLB'ni viewer'ga yetkazish (WebView)

- Holat: taklif (M-A1 spike). Telefondagi o'lchovlardan keyin qabul qilinadi.
- Kontekst: kontrakt `uhub-mobile/1.1` — 1 (WebView), 4 (fayllar abadiy keshlanadi), 5 (oflayn kesh), 6.2 (QR oflaynda).

## Muammo

Viewer (`packages/viewer`, bitta `index.html`) WebView ichida ishlaydi. GLB (≤ 15 MB) unga qanday yetadi?
Cheklov: fayl React Native → WebView ko'prigi orqali base64 bilan **uzatilmaydi**: hajm 33 % ga oshadi, butun fayl
JS satri sifatida ikki marta xotirada turadi va ko'prik bloklanadi.

## Variantlar (ikkalasi ham kodda: `apps/mobile/src/viewer/delivery.ts`)

### A — onlayn (`online`)

- WebView `source = { html: <viewer.html matni>, baseUrl: <server origin>/ }`.
- Host `load {glbUrl, token}` yuboradi; viewer faylni o'zi `fetch` qiladi (`Authorization: Bearer`).
- `baseUrl` server origin'i bo'lgani uchun so'rov bir xil origin'ga ketadi — CORS va `file://` cheklovlari yo'q.
- Kesh: faqat WebView HTTP keshi (`Cache-Control: immutable`, kontrakt 4). Uning hajmi va umri platforma ixtiyorida,
  ilova boshqarmaydi; oflayn kafolat yo'q.
- Platforma: iOS WKWebView `loadHTMLString:baseURL:`, Android `loadDataWithBaseURL` — ikkalasi ham standart.
  Viewer HTML (~660 KB) bir marta satr sifatida native tomonga uzatiladi. Bu HTML, GLB emas.

### B — oflayn kesh (`offline`)

- `expo-file-system` GLB'ni `documentDirectory/cache/<revision_id>.glb` ga yuklaydi: avval `.part` faylga,
  `glTF` sarlavhasi tekshirilgach ko'chiriladi. Fayl bor bo'lsa qayta yuklanmaydi (URL reviziya bo'yicha o'zgarmas).
- `viewer.html` shu katalogga yoziladi; WebView `file://…/cache/viewer.html` ni ochadi.
- Host `load {glbUrl: "<revision_id>.glb", token: ""}` yuboradi — nisbiy yo'l.
- Viewer o'zgarishi (alohida commit): http(s) bo'lmagan manzil XHR bilan olinadi. Chromium va WKWebView'da
  `fetch` `file:` sxemasini qo'llab-quvvatlamaydi.
- WebView ruxsatlari: Android `allowFileAccess` + `allowFileAccessFromFileURLs` (file sahifadan file XHR uchun);
  iOS `allowingReadAccessToURL = cache/` (WKWebView `loadFileURL:allowingReadAccessToURL:`) +
  `allowFileAccessFromFileURLs`.
- Ma'lum xavflar:
  - Android: `allowFileAccessFromFileURLs` API 30+ da eskirgan (deprecated), lekin ishlaydi. Kelajakda
    `WebViewAssetLoader` (`https://appassets…`) kerak bo'lishi mumkin — bu Expo Go'da yo'q (native modul).
  - iOS: `file://` sahifadan XHR WKWebView'ning ichki sozlamasiga (`allowFileAccessFromFileURLs`) bog'liq.
    react-native-webview uni o'rnatadi, lekin bu ochiq API emas.
  - Kesh hajmi va tozalash siyosati — M-A2 (bu batchda yo'q).

## Debug ekran

`/dev/spike` (Loyihalar ekranida dev rejimda "Spike" tugmasi): yo'lni tanlash, `glb_url`/`revision_id`/token,
"Yuklash", "Keshni tozalash". Ekranda: holat, yuklab olish (B, ms yoki "keshdan"), viewer (`load` → `loaded`, ms),
jami (ms), xato matni.

## O'lchovlar (founder to'ldiradi)

Qurilma: Honor X9d, Expo Go, mock M-0 R5 (~36 KB) va kattaroq GLB (agar bo'lsa).

| Yo'l | Holat | Yuklab olish, ms | Viewer, ms | Jami, ms | Ishladimi / xato |
|---|---|---|---|---|---|
| A — onlayn | birinchi ochish | — | | | |
| A — onlayn | qayta ochish | — | | | |
| B — oflayn | birinchi (yuklab olish) | | | | |
| B — oflayn | keshdan | keshdan | | | |
| B — oflayn | Wi-Fi o'chiq, keshdan | keshdan | | | |
| A — onlayn | Wi-Fi o'chiq | — | | | |

iOS: o'lchanmagan (Expo Go iOS qurilmasi yo'q).

## Qaror (taklif)

- **Asosiy: A (onlayn)** — sodda, standart API'lar, platformaning yashirin sozlamalariga bog'liq emas. M-A1 ekranlari
  standart `EXPO_PUBLIC_GLB_DELIVERY=online` bilan ishlaydi.
- **B — oflayn rejim uchun** (kontrakt 5: "oflayn kesh", 6.2: QR oflaynda). Telefonda ishlasa, M-A2 da kesh siyosati
  bilan qo'shiladi: keshda reviziya bo'lsa B, aks holda A.
- Agar B telefonda ishlamasa: fallback — WebView'ga lokal HTTP server (Expo Go'da yo'q, development build kerak) yoki
  `WebViewAssetLoader`. Bu holda oflayn rejim development build'ga o'tishni talab qiladi — founder qarori.

## Oqibatlar

- Sozlama: `EXPO_PUBLIC_GLB_DELIVERY` (`online` | `offline`), `apps/mobile/src/config.ts` (to‘g‘ridan-to‘g‘ri `process.env`).
- Viewer bundle'i ilovaga asset sifatida kiradi (`npm run copy-viewer`: `packages/viewer/dist` → `assets/viewer`).
- Har ikki yo'lda viewer va bridge protokoli bir xil; farq faqat `source` va `load.glbUrl` da.
