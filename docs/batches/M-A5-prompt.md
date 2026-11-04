# Batch M-A5 — Interaktiv AR (Android, Chrome WebXR): AR ichida eshik va tortmalarni ochish

## Founder qarori (2026-11-03)
- A-2 da **AR ichida animatsiya majburiy** (eshik/tortmalarni ochish-yopish, bittasi yoki hammasi).
- Yo'l: **ADR-M003 (d)** — Chrome WebXR sahifasi, bizning `packages/viewer` asosida. Expo Go'da qolamiz.
- **iOS** — bu batchda yo'q: Safari'da WebXR yo'q; iOS uchun native AR (ADR-M003 (a)) keyin, Apple Developer akkaunti
  bilan. iOS'da hozircha Quick Look (statik) qoladi.
- Maqsad qurilmalar: ARCore qo'llaydigan Android + Chrome. Founder telefoni (Honor X9d) — asosiy sinov qurilmasi.

## Kontekst
- Repo `D:\Yashnarbek\HUB-Mobile`, `main` = M-A4 merge'i (`83c7279`+). Kontrakt `docs/contract/uhub-mobile-1.3.md`,
  integratsiya `HUB-MOBILE-INTEGRATION.md`, taklif `docs/contract/proposals/1.4-proposal.md`.
- M-A3: ilovadagi AR tugmasi → `ar-link` → Chrome'da `/ar/launch` (`<model-viewer>`, statik, `ar-scale="fixed"`) — ishlaydi.
  Bu batch uni **o'zimizning viewer'imizning AR rejimi** bilan almashtiradi.
- ADR-M003, M-A3 va M-A4 hisobotlarini o'qi.

## Ish tartibi
- Avval `git status` / `git log`: ishchi papka toza va M-A4 merge qilingan bo'lishi kerak, aks holda to'xta.
- Branch `batch/m-a5`, har qism — bitta commit, oxirida `main` ga merge va `git push origin main`.
- Gate `-Quiet` bir marta, xatolarni tuzat, bir marta qayta. Brauzer tekshiruvi, skrinshot yo'q (founder telefonda tekshiradi).
- Bilmagan qiymatni taxmin qilma — `TODO(contract)` + hisobotda savol.

## Qismlar

### 1. Viewer: AR rejimi (`packages/viewer`)
- Yangi rejim `mode: "ar"` — `uhub-config` (`{"glb_url","title","mode":"ar"}`) dan ishga tushadi. 3D rejim kodi
  (GLB yuklash, materiallar, kliplarni nomi bo'yicha boshqarish) **qayta ishlatiladi**, nusxalanmaydi.
- AR uchun **asosiy GLB** (kliplar bilan) ishlatiladi, `-ar.glb` varianti emas (u statik ko'ruvchilar uchun qoladi).
- WebXR: `navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"],
  optionalFeatures: ["dom-overlay", "local-floor", "light-estimation"], domOverlay: { root } })`;
  `renderer.xr.enabled = true`, `setReferenceSpaceType("local")`.
- Oqim:
  1. "AR'ni boshlash" tugmasi (sessiya faqat foydalanuvchi bosishi bilan ochiladi).
  2. Pol topilguncha yo'riqnoma ("Telefonni polga qarating va sekin harakatlantiring"); hit-test retikli.
  3. Bosish → buyum retikl joyiga, **old tomoni (+Z) foydalanuvchiga qaragan** holda qo'yiladi.
  4. Joylashtirilgandan keyin: bir barmoq bilan surish (pol bo'ylab, hit-test), ikki barmoq bilan Y o'qi atrofida aylantirish.
     **Masshtablash yo'q** — 1 birlik = 1 m, hech qanday scale qo'llanmaydi.
  5. DOM overlay paneli: har eshik/tortma uchun tugma (kliplar ro'yxatidan, nom: "Eshik 1", "Tortma 2"…),
     "Hammasini ochish/yopish", "Qayta joylashtirish", "Chiqish". Ochish/yopish — 3D rejimdagi bilan bir xil mexanizm.
  6. Overlay tugmalari bosilganda XR `select` hodisasi ishlamasligi kerak (`beforexrselect` → `preventDefault`),
     aks holda buyum qayta joylashadi.
- Ko'rinish: buyum ostida soya tekisligi (`ShadowMaterial`); yorug'lik — `light-estimation` bo'lsa undan, bo'lmasa
  3D rejimdagi `RoomEnvironment` + yo'naltirilgan yorug'lik.
- Fallback: `navigator.xr` yo'q yoki `immersive-ar` qo'llanmasa — "Bu qurilma yoki brauzer AR'ni qo'llamaydi"
  va 3D ko'rinishga o'tish tugmasi.
- Unumdorlik: `m0-heavy.glb` bilan ishlashi kerak; AR'da soyalar faqat bitta yorug'likdan.
- Testlar (Vitest): AR rejimi konfiguratsiyadan tanlanishi; kliplar ro'yxatidan overlay tugmalari; aylantirish/surish
  matematikasi (sof funksiyalar); masshtab har doim 1 (bounding box = `overall_mm` ±0.1 mm); `beforexrselect` himoyasi.

### 1b. Ochilish zonalari (helper) — AR va 3D rejimda
Maqsad (founder): buyumni xonaga qo'yganda eshik va tortmalar **ochilishga joy bormi** — ko'z bilan tekshirish.
- Har eshik/tortma uchun **ochilish zonasi**: klipni (nomi bo'yicha) `t = 0…1` oralig'ida N qadamda (masalan 12)
  baholab, harakatlanuvchi tugun (`pivot__door__*` / `slide__drawer__*`) bounding box'larini yig'ish → yarim shaffof hajm
  (eshik — sektor/yelpig'ich, tortma — quti) + polga proyeksiyasi (eshik yoyi, tortma to'rtburchagi).
  Burchak va yurish **hisoblanmaydi** — faqat GLB'dagi klipdan olinadi (kontrakt 2.2 tamoyili).
- Ko'rinishi: accent `#3988FF`, opacity ≈ 0.2, chegara chizig'i; yoqish/o'chirish — "Ochilish zonalari" tugmasi
  (AR overlay'da va 3D ekranning o'ng panelida, `setHelpers {on}` bridge buyrug'i). Standart — o'chiq.
- Eshik/tortma ochilganda zona saqlanadi (ochiq holatni real devor bilan solishtirish uchun).
- Avtomatik to'qnashuv tekshiruvi (real devor/mebel bilan) — **qilinmaydi**: WebXR `plane-detection`/`depth-sensing`
  eksperimental. Hisobotda Honor X9d da `plane-detection` / `depth-sensing` feature mavjudligini faqat **aniqlash**
  (`supportedFeatures`/sessiya natijasi) va yozish — keyingi qaror uchun.
- Testlar: zona hajmi klipning oxirgi holatini to'liq qamraydi; yopiq holatdagi tugun bilan boshlanadi; `__mid` uchun
  alohida zona chizilmaydi (tortma zonasiga kiradi); zona buyum masshtabini o'zgartirmaydi.

### 2. AR sahifasi (mock) va ilova
- Mock: `ar-link` javobiga `launch_url` (`/ar/<imzo>`) — viewer bundle'ini qaytaradi, ichiga `uhub-config`
  (`mode:"ar"`, asosiy GLB'ning imzolangan URL'i, `title`). `<model-viewer>` sahifasi olib tashlanadi
  (yoki `?legacy=1` ostida qoldiriladi — hisobotda qaysi biri). AR fayllarida CORS. `TODO(contract)`: `launch_url`.
- Ilova: AR tugmasi → `ar-link` → `launch_url`. Sinov: avval `expo-web-browser` `openBrowserAsync` (Chrome Custom Tabs —
  ilovaga qaytish qulay); WebXR Custom Tabs'da ishlamasa — `Linking.openURL` (to'liq Chrome). Qaysi biri ishlagani
  config'da bitta joyda, hisobotda yozilsin (founder telefonda tekshiradi).
- HTTPS talabi saqlanadi (`MOCK_PUBLIC_URL`, cloudflared — M-A3 yo'riqnomasi).

### 3. Hujjatlar
- ADR-M003: "Qaror (2026-11-03, founder): A-2 da interaktiv AR majburiy; Android — (d) Chrome WebXR; iOS — (a) native,
  Apple Developer akkaunti bilan, keyin." Holat: qabul qilingan (Android qismi).
- `1.4-proposal.md` 6-bo'limiga qo'shimcha: AR sahifasi — viewer bundle `mode:"ar"` (backend `/ar/<token>` da
  `uhub-config` bilan beradi, 8-bo'limdagi `/s/<token>` bilan bir mexanizm); AR asosiy GLB'ni (kliplar bilan) ishlatadi.
- Kontrakt 1-bo'lim ("iOS va Android bir xil funksiyalar") bilan vaqtinchalik farq — taklifda alohida band.

### 4. Gate
- Mavjud qadamlar o'zgarmaydi; yangi testlar ichida. Viewer bundle hajmi hisobotda (AR kodidan keyin).

## Qabul mezonlari (founder, Honor X9d, Chrome, tunnel orqali HTTPS)
1. Gate o'tadi, oldingi testlar buzilmagan, `main` push qilingan.
2. Ilova → buyum → AR → Chrome'da AR boshlanadi, pol topiladi, bosganda buyum qo'yiladi.
3. AR ichida: "Eshik 1" eshikni petlya o'qida ochadi/yopadi; tortmalar chiqadi (`__mid` yarmida); "Hammasini ochish" ishlaydi.
4. Overlay tugmasini bosish buyumni qayta joylashtirmaydi.
5. Surish va aylantirish ishlaydi; kattalashtirib bo'lmaydi.
5b. "Ochilish zonalari" yoqilganda buyumni devorga yaqin qo'yib, eshik yoyi devorga tegishini ko'z bilan ko'rish mumkin;
   tortma zonasi to'liq yurish uzunligida.
6. Rulet: 600 / 900 / 560 mm ±1 % — jadvalga.
7. `m0-heavy.glb` AR'da: ochilish vaqti va silliqligi — jadvalga.
8. AR qo'llamaydigan muhitda (masalan kompyuter brauzeri) — aniq xabar, sahifa qulamaydi.

## Bu batchda YO'Q
iOS interaktiv AR, AR'da foto va ulashish (WebXR kamera kadrini olish eksperimental — keyin alohida), exploded ko'rinish.

## Hisobot → `docs/reports/M-A5-report.md` (commit) + chatda qisqa (o'zbekcha, ~20 qator)
Bajarilgan / bajarilmagan; Custom Tabs yoki to'liq Chrome — qaysi biri tanlangan; telefonda tekshirish qadamlari;
o'lchov jadvallari (bo'sh, founder to'ldiradi); gate, merge hash, push; `TODO(contract)`.
