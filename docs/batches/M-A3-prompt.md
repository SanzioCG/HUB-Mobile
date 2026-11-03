# Batch M-A3 — AR 1-bosqich: Scene Viewer (Android), Quick Look yo'li, ilova ichidagi AR spike'i

## Kontekst
- Repo: `D:\Yashnarbek\HUB-Mobile`, `main` = M-A2 merge'i. Kontrakt: `uhub-mobile-1.2.md` bo'lsa u, aks holda `uhub-mobile-1.2-draft.md`.
- Kontrakt 3-bo'lim: iOS — Quick Look (USDZ, statik), Android — Scene Viewer (GLB); tashqi AR ilovalari `Authorization`
  yubora olmaydi → `POST /mobile/ar-link` imzolangan 10 daqiqalik havola (mock'da M-A2 da qilingan).
- Maqsad: kontrakt 7-bo'lim qabul mezoni — **AR'da o'lcham real (rulet bilan, ±1 %)**.

### Scene Viewer talablari (Google ARCore hujjati, tekshirilgan)
- Ishga tushirish: `https://arvr.google.com/scene-viewer/1.0?file=<url-escaped>&mode=...`, paket
  `com.google.android.googlequicksearchbox` (Google app, `ar_preferred`, 3D'ga qaytish bilan) yoki
  `com.google.ar.core` (`ar_only`, qaytishni ilova qiladi).
- Parametrlar: `file` (majburiy), `mode`, `resizable=false` (AR'da masshtablashni o'chiradi — real o'lcham uchun **majburiy**),
  `title` (≤ 60 belgi), `link`.
- Fayl URL'i **HTTPS** bo'lishi kerak.
- Animatsiya: bir nechta animatsiya bo'lsa **faqat birinchisi** o'ynaydi va validator buni xato deb belgilaydi.
- Tavsiya: ≤ 10 MB, ≤ 100 000 uchburchak, ≤ 10 material; Y yuqoriga, 1 birlik = 1 m (kontrakt bilan mos).
- Qurilma: ARCore qo'llaydigan, Android 7.0+, yangilangan Google app va Google Play Services for AR.

## Ish tartibi
- Branch `batch/m-a3`, har qism — bitta commit, oxirida `main` ga merge. Gate `-Quiet` bir marta, xatolarni tuzat, bir marta qayta.
- Merge'dan keyin zaxira: `git bundle create <zaxira papka>\HUB-Mobile-<sana>.bundle --all` (papka founder'dan; yo'q bo'lsa hisobotda so'ra).
- Faqat Expo Go'dagi modullar (`expo-intent-launcher`, `expo-linking`). Brauzer tekshiruvi, skrinshot yo'q.
- Bilmagan qiymatni taxmin qilma — `TODO(contract)` + hisobotda savol.

## Qismlar

### 0. AR uchun GLB varianti (generator + mock)
- Muammo: asosiy GLB'da ko'p klip bor → Scene Viewer faqat birinchisini o'ynatadi va validator xato beradi.
- Generator: har reviziya uchun `<revision_id>-ar.glb` — **animatsiyasiz, yopiq holat**, o'sha geometriya va materiallar.
  Test: animatsiyalar soni 0, o'lchamlar asosiy GLB bilan bir xil (bounding box ±0.1 mm), `gltf-validator` 0 error.
- Mock: `ar-link` `format: "glb"` → AR variantiga imzolangan URL. `TODO(contract)`: kontraktda AR varianti yo'q — hisobotda taklif.
- Mock'ga HTTPS sinovi uchun yo'riqnoma (README): `cloudflared tunnel --url http://localhost:8787` (bepul, hisob shart emas)
  va `MOCK_PUBLIC_URL` sozlamasi — imzolangan URL shu tashqi manzil bilan yasalsin. Kod tunnelga bog'lanmasin, faqat sozlama.

### 1. Android: Scene Viewer
- 3D ekrandagi AR tugmasi yoqiladi (Android). Bosilganda: `ar-link` → URL → `expo-intent-launcher`
  `startActivityAsync('android.intent.action.VIEW', {data, packageName})`.
- Avval `com.google.ar.core` + `mode=ar_only`; xato bo'lsa (paket yo'q) — `com.google.android.googlequicksearchbox` + `ar_preferred`;
  ikkalasi ham bo'lmasa — "Bu qurilmada AR mavjud emas" xabari.
- Parametrlar: `resizable=false`, `title` = buyum nomi (60 belgigacha qisqartiriladi).
- Holatlar: havola olinmoqda (spinner), `ar-link` xatosi, oflayn ("AR uchun internet kerak").
- URL `http://` bo'lsa ishga tushirmaydi va dev rejimda aniq xabar beradi: "Scene Viewer HTTPS talab qiladi — MOCK_PUBLIC_URL".
- Testlar: intent URL yasash (escape, parametrlar), fallback tartibi (paketlar mock qilinadi).

### 2. iOS: Quick Look yo'li (kodlanadi, sinalmaydi)
- `format: "usdz"` → `ar-link` → `Linking.openURL(url)` (Safari AR Quick Look'ni ochadi). `usdz_url` `null` bo'lsa — tugma o'chiq,
  "AR bu buyum uchun tayyor emas".
- Mock'da USDZ yo'q: `ar-link` `usdz` uchun 404 `not_found` qaytaradi; ilova buni to'g'ri ko'rsatadi.
- Hisobotda: "iOS qurilmasi yo'q — sinalmagan; Expo Go'da ilova ichidan Quick Look (QLPreviewController) mumkin emas,
  Safari orqali ochiladi".

### 3. Spike: ilova ichidagi animatsiyali AR (kod yo'q, faqat ADR)
- `docs/adr/ADR-M003-in-app-ar.md`: kontrakt A-2 talabi — AR ichida eshik/tortmalarni ochish.
- Ma'lum cheklovlar (tekshir va manba bilan yoz): WebView'da WebXR yo'q; Scene Viewer bitta animatsiya; Quick Look statik USDZ.
- Variantlar: (a) Expo development build + native AR modul (ARCore/ARKit, masalan ViroReact yoki o'xshash — joriy holatini tekshir),
  (b) Scene Viewer'ga har bir eshik uchun alohida bitta animatsiyali GLB, (c) A-2 dan chiqarib, faqat statik AR.
  Har biri uchun: Expo Go'dan chiqish kerakmi, iOS uchun Mac/EAS kerakmi, kod hajmi, xavflar.
- Qaror founder'niki — ADR "taklif" holatida qoladi.

### 4. Gate
- Yangi testlar mavjud qadamlar ichida; AR GLB validatsiyasi GLB qadamiga qo'shiladi.

## Qabul mezonlari (founder, Honor X9d)
1. Gate o'tadi; oldingi testlar buzilmagan.
2. Mock HTTPS tunnel orqali: 3D → AR → Scene Viewer ochiladi, buyum polga qo'yiladi, barmoq bilan kattalashtirib bo'lmaydi.
3. Rulet bilan: kenglik 600, balandlik 900, chuqurlik 560 mm — har biri ±1 % (6 / 9 / 5.6 mm) ichida. Natija hisobotga.
4. Oflayn yoki `http://` URL'da aniq xabar, ilova qulamaydi.
5. ADR-M003 founder qaror qilishi uchun yetarli (variantlar, narx, xavf).

## Bu batchda YO'Q
Ilova ichidagi AR kodi, USDZ yasash, AR'da foto/ulashish, iOS build.

## Hisobot → `docs/reports/M-A3-report.md` (commit) + chatda qisqa (o'zbekcha, ~20 qator)
Bajarilgan / bajarilmagan; telefonda tekshirish qadamlari (tunnel bilan); rulet o'lchovlari uchun jadval (founder to'ldiradi);
gate, merge hash, zaxira; kontraktga takliflar (AR GLB varianti); `TODO(contract)` ro'yxati.
