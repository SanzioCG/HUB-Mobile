# Batch M-A0 — HUB-Mobile skeleti, namunaviy GLB, mock server, viewer

## Kontekst
- Repo: `D:\Yashnarbek\HUB-Mobile` (yangi, alohida git repo, Windows). U-HUB monoreposiga **tegilmaydi**.
- Yagona manba — kontrakt `docs/contract/uhub-mobile-1.1.md` (founder shu faylni qo'yadi). Kontraktni o'zgartirma.
  Ma'lum farq: kontrakt monorepo deydi, founder alohida repo tanladi (kontrakt 1.2 kutilmoqda) — strukturani quyidagicha qil.
- Ilova faqat ko'rish uchun: geometriya hisoblanmaydi, hammasi GLB va API'dan keladi.
- Uslub tokenlari (kontrakt 1-bo'lim): bg `#111214`, panel `#191A1D`, accent `#3988FF`, shrift Inter va DM Mono.
  Ikkinchi daraja panel `#222428`, faol tugma `#2C2F35` — maketdan, taxminiy.

## Ish tartibi
- Bitta branch: `batch/m-a0`. Har bir qism (1–5) — bitta commit. Oxirida `main` ga o'zing merge qil.
- Brauzer tekshiruvi, skrinshot, ataylab xato kiritib sinash yo'q.
- Oxirida `scripts/check-mobile.ps1 -Quiet` bir marta; faqat xatolarni tuzat, bir marta qayta ishga tushir.
- Bilmagan qiymatni taxmin qilma: kontraktda yo'q bo'lsa — kodda `// TODO(contract)` va hisobotda ochiq savol.

## Struktura (npm workspaces)
```
HUB-Mobile/
  docs/contract/            kontrakt (founder qo'yadi)
  docs/adr/ADR-M001-separate-repo.md   alohida repo qarori va oqibatlari (viewer bundle U-HUB'ga qanday yetadi — ochiq)
  apps/mobile/              Expo ilova — BU BATCHDA FAQAT BO'SH JOY (README), M-A1 da yaratiladi
  packages/viewer/          three.js viewer → bitta HTML bundle
  mock/                     mock API server + fixtures
  tools/sample-glb/         namunaviy GLB generatori
  scripts/check-mobile.ps1  gate
```

## Qismlar

### 1. Repo skeleti
- Root `package.json` (workspaces), TypeScript strict, ESLint, Prettier, `.gitignore`, `.editorconfig`, README (ishga tushirish).
- Node LTS; versiyalarni `package.json` `engines` da qayd et.

### 2. Namunaviy GLB generatori (`tools/sample-glb`)
- `@gltf-transform/core` bilan Node'da, qo'lda emas. Chiqish: `mock/fixtures/glb/m0-r3.glb` va `m0-r5.glb`
  (R5 da bitta detal o'chirilgan — `is_latest=false` holatini sinash uchun).
- M-0 tarkibi: korpus (2 yon, tub, qopqoq, orqa), 1 eshik (yuqorida), uning orqasida 1 polka, 3 tortma (har birida fasad, tub, 2 yon, orqa).
  Buyum 600 × 900 × 560 mm. Geometriya oddiy quti (box) — maqsad struktura, chiroy emas.
- Kontrakt 2-bo'lim bo'yicha qat'iy: metr, Y yuqoriga, +Z old, boshi pol sathida old-pastki qirra markazida;
  tugun nomlari 2.1 ierarxiyasi va `__` ajratuvchi; har detalda to'liq `extras.uhub` (uid, number, name, material, size_mm,
  edges, article, reveal, qr); `item` da `dimensions`; `asset.extras.uhub` (contract "1.1", snapshot, approved=false).
- `reveal`: eshik orqasidagi polka → `["door__d1__open"]`; tortma tubi → `["drawer__dN__open"]`; tashqi detallar → `[]`.
- Kliplar 2.2 bo'yicha: `door__d1__open` (Y o'qi atrofida, petlya qirrasida, 105°), `drawer__d2..d4__open` (+Z, yurish 450 mm), `all__open`; 0.8 s, LINEAR.
  Burchak va yurish — prototip qiymatlar: generatorda bitta konstantada, izoh bilan "manba yo'q, prototip".
- Test: generator chiqargan GLB'ni qayta o'qib tekshiradi — tugun nomlari, har `part__` da extras, barcha kliplar mavjud,
  har klip mavjud tugunni nishonga oladi, `reveal` dagi har klip mavjud. `gltf-validator` — 0 error.

### 3. Mock server (`mock/`)
- Node + Fastify (yoki Express), TypeScript. `0.0.0.0`, port `.env` dan (standart 8787). `.env` commit qilinmaydi, `.env.example` bor.
- Kontrakt 4-bo'limdagi barcha so'rovlar: `pair` (kod `123456` qabul, boshqasi 401), `projects`, `projects/{id}`, `resolve`, `DELETE device`, fayllar.
- `Bearer` tekshiruvi (pair'dan boshqa hammasi). Fayllar `Cache-Control: public, max-age=31536000, immutable`.
- `resolve`: to'g'ri QR → 200; `uhub:` bilan boshlanmasa → 400; noma'lum → 404 `not_found`; boshqa kompaniya → 403 `other_company`;
  R5 da o'chirilgan detal → 200, `is_latest=false`, `latest_*` = null.
- Fixtures: 2–3 loyiha, M-0 buyumi; har detal uchun QR PNG (`mock/fixtures/qr/<uid>.png`, `qrcode` paketi), etiketka matni bilan.
- Testlar: har endpoint va har `resolve` xato holati.

### 4. Viewer (`packages/viewer`)
- Vite + three.js + TypeScript; build — **bitta HTML fayl** (`vite-plugin-singlefile`). Dev rejimda brauzerda mustaqil ishlaydi
  (URL parametrida GLB manzili, standart — mock'dagi M-0).
- Host bilan aloqa: `src/bridge.ts` — tiplangan xabarlar (`window.postMessage` / React Native WebView `onMessage`).
  Kiruvchi: `load {glbUrl, token}`, `select {uid}`, `showAll`, `openAll`, `closeAll`, `toggle {clip}`, `setMode {solid|edges|xray}`, `setDims {on}`, `resetView`.
  Chiquvchi: `ready`, `loaded {item, parts}`, `selected {uid, extras}`, `error {code, message}`.
  GLB'ni viewer **o'zi** `fetch` qiladi (token header'da) — fayl host orqali uzatilmaydi.
- Funksiyalar:
  - OrbitControls: bir barmoq aylantirish, ikki barmoq yaqinlashtirish/surish, ikki marta bosish — resetView.
  - Kliplar faqat **nomi** bo'yicha topiladi. Ochish — oldinga, yopish — teskari ijro (bir xil action).
  - "Hammasini ochish" = barcha `door__*`/`drawer__*` kliplarini birga ijro; `all__open` **ishlatilmaydi**
    (individual kliplar bilan bir tugunda to'qnashadi). Bitta eshik ochiq turganda "hammasini ochish" sakrashsiz ishlasin.
  - Bosish = tanlash: raycast → eng yaqin `part__` ota-tugun → `selected` xabari. Eshik bosilganda ochilmaydi.
  - `select {uid}` (QR oqimi, kontrakt 6-bo'lim): `reveal` kliplari ro'yxat tartibida ketma-ket; qolgan detallar opacity 0.15
    (`transparent`, `depthWrite=false`); tanlangan detal accent `#3988FF` kontur; kamera bounding box bo'yicha 0.6 s da yaqinlashadi.
    Tugun topilmasa — `error {code:"part_not_found"}`, model ochiq qoladi. `showAll` — hammasini qaytaradi, kliplar teskari.
  - Rejimlar Solid / Qirralar / X-ray; o'lcham chiziqlari faqat `extras.uhub.dimensions.lines` dan.
- Testlar (Vitest): klip nomini topish, `part__` ota-tugunni topish, `reveal` tartibi, bridge xabar validatsiyasi.

### 5. Gate (`scripts/check-mobile.ps1`)
- `-Quiet` parametri. Ketma-ket: typecheck (barcha workspace), lint, testlar, GLB generatsiya + validator, viewer build
  (bitta HTML hosil bo'lganini va hajmini chiqaradi). Birinchi xatoda to'xtaydi, nol bo'lmagan exit code.

## Qabul mezonlari
1. `npm install` va `scripts/check-mobile.ps1 -Quiet` toza mashinada o'tadi.
2. `gltf-validator` M-0 da 0 error; GLB testlari o'tadi.
3. Mock server `0.0.0.0:8787` da; telefon brauzeridan bir xil Wi-Fi orqali `GET /mobile/projects` (token bilan) javob beradi.
4. Viewer dev rejimda M-0 ni ochadi; eshik petlya o'qida, tortmalar +Z da ochiladi; yopish teskari.
5. `select` polka uid'i bilan — eshik ochiladi, polka konturlanadi, qolgani shaffof; tortma tubi bilan — tortma chiqadi.
6. Kodda klip yoki tugun indeksi bo'yicha hardcode yo'q.

## Bu batchda YO'Q
Expo ilova va ekranlar (M-A1), WebView integratsiyasi va GLB yetkazish spike'i (M-A1 boshi), QR skaner va haptic (M-A2),
oflayn kesh, AR.

## Hisobot (o'zbekcha, ~20 qator)
Bajarilgan / bajarilmagan qismlar; qo'lda tekshirish qadamlari (mock'ni ishga tushirish, viewer'ni ochish, `select` sinovi);
gate natijasi va merge hash; kontraktdan har bir chetga chiqish; ochiq savollar (`TODO(contract)` lar ro'yxati).
