# Batch M-A1 — Expo ilova: WebView spike, juftlash, 4 ekran

## Kontekst
- Repo: `D:\Yashnarbek\HUB-Mobile`, `main` = M-A0 (`f28d7db`). Kontrakt: `docs/contract/uhub-mobile-1.1.md`.
- Viewer (`packages/viewer`, bitta `index.html`) va uning bridge protokoli M-A0 da tayyor — **qayta yozilmaydi**.
  Viewer'ga o'zgarish kerak bo'lsa — minimal, alohida commit, hisobotda sababi bilan.
- Kontraktdagi javobsiz savollar (pair `user/company`, loyiha `status` qiymatlari, xato tanasi, item `size_mm`,
  `thumb_url/usdz_url` null) — mock'dagi qiymatlar bilan ishla, kodda `// TODO(contract)`, taxminni bitta joyda (tiplar faylida) saqla.
- Uslub: bg `#111214`, panel `#191A1D`, panel-2 `#222428`, faol `#2C2F35`, accent `#3988FF`, matn `#E6E8EB`,
  ikkinchi matn `#8B929B`, holat nuqtalari: sariq `#F2C14E`, yashil `#4CC38A`. Shrift Inter, raqamlar DM Mono (`expo-font`).
  Chegarasiz panellar, faol holat — och fon + oq qalin matn, rangli urg'u faqat tanlov va asosiy amal (Skaner) uchun.
  Matn 14–16 px, bosiladigan nishon ≥ 44 px.

## Ish tartibi
- Branch `batch/m-a1`, har qism — bitta commit, oxirida `main` ga o'zing merge qil.
- Brauzer tekshiruvi, skrinshot, ataylab xato sinovi yo'q.
- Oxirida `scripts/check-mobile.ps1 -Quiet` bir marta; faqat xatolarni tuzat, bir marta qayta.
- Bilmagan qiymatni taxmin qilma — `TODO(contract)` + hisobotda savol.

## Qismlar

### 1. Expo ilova skeleti (`apps/mobile`)
- `create-expo-app` (eng oxirgi stable SDK), TypeScript strict, `expo-router`. Expo Go'da ishlashi shart
  (faqat Expo Go'dagi modullar: `react-native-webview`, `expo-file-system`, `expo-secure-store`, `expo-font`, `expo-haptics`).
- `src/theme.ts` — yuqoridagi tokenlar; komponentlarda rang/o'lcham hardcode qilinmaydi.
- Workspace'ga ulash; bridge xabar tiplari `packages/viewer` dan **import** qilinadi (nusxa emas).

### 2. WebView spike: GLB yetkazish (eng muhim qism)
- Viewer `index.html` ilovaga asset sifatida kiradi (build vaqtida `packages/viewer/dist` dan nusxa, skript bilan).
- Ikki yo'l, ikkalasi ham kodda, sozlama bilan almashtiriladi:
  - **A — onlayn:** WebView `load {glbUrl, token}` xabarini oladi va faylni o'zi `fetch` qiladi.
  - **B — oflayn kesh:** `expo-file-system` GLB'ni `documentDirectory/cache/<revision_id>.glb` ga yuklaydi;
    viewer HTML ham shu katalogga yoziladi; WebView `file://` dan ochiladi (iOS `allowingReadAccessToURL`,
    Android `allowFileAccess`, kerak bo'lsa `allowFileAccessFromFileURLs`); viewer GLB'ni nisbiy yo'l bilan oladi.
- Fayl React Native → WebView orqali base64 bilan **uzatilmaydi**.
- Debug ekran (`/dev/spike`): yo'lni tanlash, yuklash vaqti (ms) va xato matni ekranda.
- Natija: `docs/adr/ADR-M002-glb-delivery.md` — har yo'l, platforma cheklovlari, qaysi biri asosiy. Telefondagi
  o'lchovlar bo'sh qoldiriladi ("founder to'ldiradi"), taxminiy raqam yozilmaydi.

### 3. API klient va juftlash
- `src/api/` — kontrakt 4-bo'lim bo'yicha tiplangan klient; xatolar bitta `ApiError` tipiga keltiriladi; timeout.
- Server manzili sozlamada (standart `.env` / `app.config` dan, dev'da LAN IP). Token — `expo-secure-store`.
- HTTP faqat dev build'da: Android `usesCleartextTraffic` va iOS ATS istisnosi faqat dev konfiguratsiyasida, izoh bilan.
- Juftlash ekrani: 6 raqam (raqamli klaviatura, avto-yuborish), xato holatlari (noto'g'ri kod, tarmoq yo'q, server topilmadi).
  `401` istalgan so'rovda → token o'chiriladi, juftlash ekraniga qaytish.
- Testlar (Jest): klient mock server javoblari bilan, xatolarni `ApiError` ga keltirish, 401 oqimi.

### 4. Ekranlar
1. **Loyihalar:** sarlavha, holat nuqtasi + kompaniya, ko'k "Skaner" tugmasi (M-A2 gacha o'chirilgan, "tez orada"),
   qidiruv (raqam yoki nom, mahalliy filtr), segment filtr (Hammasi / Sexda / Tasdiqlanmagan — `status` qiymatlari TODO),
   ro'yxat: thumb (yo'q bo'lsa grafit joy), `№ raqam` + nom, meta (buyumlar soni, yangilangan vaqt — nisbiy, o'zbekcha),
   holat nuqtasi + matn. Pull-to-refresh, `updated_since` bilan.
2. **Loyiha:** orqaga, nom, meta; tasdiqlanmagan buyum bo'lsa sariq nuqtali eslatma; buyumlar ro'yxati
   (thumb, nom, o'lcham DM Mono'da, holat + revision).
3. **3D ko'rish:** WebView to'liq ekran; ustida suzuvchi sarlavha (orqaga, nom, o'lcham); segment Solid / Qirralar / X-ray;
   `approved=false` → "Tasdiqlanmagan · R…" nuqta bilan; pastki panel: Hammasini ochish/Yopish, O'lchamlar (toggle),
   AR (o'chirilgan, A-2), Tiklash. Yuklanish progressi va xato + "Qayta urinish".
4. **Detal kartasi:** viewer `selected` xabaridan pastdan chiqadigan sheet: katta `№ raqam` (DM Mono) + nom,
   O'lcham, Material, Kromka (`edges`), Artikul; eshik/tortma bo'lsa "Ochish/Yopish" (`toggle`); yopish tugmasi.
   Bo'sh joyga bosish — tanlovni bekor qiladi. Kontraktda ma'lumoti yo'q bo'limlar (Furnitura, Ishlov berish) **qo'shilmaydi**.
- Holatlar: yuklanmoqda (skeleton), bo'sh ro'yxat, tarmoq xatosi — har ekranda.
- Matnlar o'zbekcha, bitta `src/i18n/uz.ts` faylida.

### 5. Gate
- `check-mobile.ps1` ga qo'shiladi: `apps/mobile` typecheck, lint, Jest, `npx expo-doctor`, viewer asset nusxasi
  mavjudligi va hajmi. Mavjud qadamlar o'zgarmaydi.

## Qabul mezonlari
1. Gate o'tadi; M-A0 testlari buzilmagan.
2. `npx expo start` → Honor X9d'da Expo Go orqali: `123456` bilan juftlash → loyihalar → buyum → 3D.
3. 3D'da: aylantirish/yaqinlashtirish, Hammasini ochish/Yopish, rejimlar, o'lchamlar ishlaydi.
4. Detalni bosish → karta to'g'ri `extras.uhub` bilan; eshik kartasida "Ochish" eshikni ochadi; bosish o'zi eshikni ochmaydi.
5. Spike: A va B yo'llar ikkalasi ham telefonda M-0 ni ochadi (yoki ishlamagani sababi ADR-M002 da).
6. Ilovani qayta ochganda juftlash saqlangan; `401` da juftlashga qaytadi.

## Bu batchda YO'Q
QR skaner va haptic, "Oxirgi skanerlar" (M-A2); oflayn kesh siyosati (qaysi buyumlar, hajm chegarasi — M-A2,
spike natijasiga ko'ra); AR (A-2); iOS build (EAS) — faqat Expo Go.

## Hisobot (o'zbekcha, ~20 qator)
Bajarilgan / bajarilmagan; spike xulosasi (qaysi yo'l asosiy, nima founder o'lchashi kerak); qo'lda tekshirish
qadamlari (telefonda, Expo Go); gate natijasi va merge hash; viewer'ga kiritilgan o'zgarishlar; kontraktdan chetga
chiqishlar; `TODO(contract)` ro'yxati (M-A0 dagilarga qo'shilganlari alohida).
