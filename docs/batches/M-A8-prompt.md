# Batch M-A8 — Android ichki o'rnatma (APK), EAS Build va OTA yangilanish

## Maqsad
Ilova Expo Go'siz, telefonga oddiy ilova bo'lib o'rnatilsin: o'z ikonkasi va splash'i bilan, `.uhub` faylni
Telegram'dan "U-HUB bilan ochish" orqali ocha oladigan holda. Avval faqat **Android** va faqat **ichki sinov** uchun
(APK, Play Store'ga chiqmaydi). iOS keyinroq qilinadi, unga Apple Developer akkaunti kerak.

## Kontekst
- Repo `D:\Yashnarbek\HUB-Mobile`. Avval M-A7 (va M-A6) merge qilingan bo'lishi kerak, ish daraxti toza bo'lsin.
  Aks holda to'xta.
- `apps/mobile/app.config.ts`: `android.package = "uz.uhub.mobile"`, `version 0.1.0`, ikonka/splash `assets/brand` dan,
  `.uhub` intent filtrlari bor, cleartext faqat `APP_VARIANT=development` da.
- Hozir HTTPS server yo'q (DEP-1). Server rejimi faqat LAN'dagi HTTP mock bilan ishlaydi. Fayl rejimi (`.uhub`)
  serversiz ishlaydi. Bu o'rnatmaning asosiy maqsadi fayl rejimi.

## Ish tartibi
- Branch `batch/m-a8`, har qism — bitta commit, oxirida `main` ga merge va push.
- Gate `-Quiet` bir marta, xatolarni tuzat, bir marta qayta.
- **Founder qiladigan qadamlar** (agent ular uchun to'xtaydi va kutadi):
  - expo.dev'da bepul akkaunt ochish;
  - `npx eas-cli login`;
  - birinchi build'da Android keystore'ni EAS'ga yaratishni tasdiqlash.
- Agent parol, token va keystore fayllarini repoga yozmaydi va logga chiqarmaydi.

## Qismlar

### 1. Build profillari (`apps/mobile/eas.json`)
- `development`: dev client (keyin, ixtiyoriy).
- `preview` (**asosiy**): `distribution: "internal"`, `android.buildType: "apk"`, `env.APP_VARIANT = "internal"`,
  `channel: "preview"`.
- `production`: AAB, `APP_VARIANT = "production"`, `channel: "production"`. Hozir build qilinmaydi, faqat tayyor turadi.
- `app.config.ts`:
  - cleartext (HTTP) va iOS ATS istisnosi `development` **va** `internal` da yoqiq, `production` da o'chiq. Izoh qoldir:
    "internal — DEP-1 gacha LAN mock uchun; HTTPS server kelgach olib tashlanadi".
  - `android.versionCode` EAS remote orqali avtomatik oshadi (`cli.appVersionSource: "remote"`, `autoIncrement`).
  - Ilova nomi `internal` da "U-HUB (test)". Shunda ichki o'rnatma keyingi production ilova bilan adashtirilmaydi.
    `package` ikkalasida bir xil qoladi.

### 2. Monorepo va viewer asset'i EAS'da
- EAS bulutda `npm install` dan keyin viewer'ni build qilishi va `assets/viewer` ga nusxalashi kerak (`copy-viewer`).
  Buni `eas-build-post-install` skripti qiladi. Lokal `expo start` oqimi o'zgarmaydi.
- Workspace bog'liqliklari (`@hub-mobile/viewer`) va root lockfile EAS'da to'g'ri o'rnatiladi. `npx expo-doctor` toza bo'lsin.
- `.easignore`: mock fixtures'dagi og'ir fayllar, `*.uhub`, `docs/` va hisobotlar yuklanmaydi.
- Repo ildizidagi `assets/` build'ga kiradi, chunki `app.config.ts` uni nisbiy yo'l bilan oladi. Buni tekshir.

### 3. Release'da dev elementlarini yashirish
- Spike tugmasi, `ms · fps · △ · MB` statistikasi, dev sinov sahifalari, server manzilini qo'lda o'zgartirish:
  faqat `__DEV__` yoki `APP_VARIANT=development` da ko'rinadi. Har biri uchun test yoki tekshiruv ro'yxati bo'lsin.
- Sozlamalar → Versiyalar: ilova versiyasi, `versionCode`, `VIEWER_VERSION`, kontrakt, kanal (`preview`) va update ID.

### 4. OTA yangilanish (EAS Update, `expo-updates`)
- Maqsad: APK bir marta o'rnatiladi, keyingi JS/viewer o'zgarishlari qayta o'rnatishsiz keladi.
- `runtimeVersion: { policy: "fingerprint" }`. Native o'zgarish bo'lsa yangi APK kerak bo'ladi va hisobot buni aytadi.
- Ilova ochilganda yangilanishni tekshiradi, fonda yuklaydi va keyingi ochilishda qo'llaydi. Sozlamalarda
  "Yangilanishni tekshirish" tugmasi bor.
- Skriptlar:
  - `npm run build:android:preview` → `eas build -p android --profile preview`;
  - `npm run update:preview -- "<izoh>"` → `eas update --channel preview`.

### 5. Hujjat
`docs/INSTALL-ANDROID.md`, o'zbekcha. Unda:
- founder qadamlari (akkaunt, login, build, APK havolasi yoki QR);
- telefonga o'rnatish ("Noma'lum manbalardan o'rnatish" ruxsati);
- yangilash: OTA yoki yangi APK;
- keystore zaxirasi: `eas credentials` → yuklab olib, repodan **tashqarida** saqlash. Usiz keyingi APK eskisining
  ustiga o'rnatilmaydi;
- ma'lum cheklovlar: HTTP faqat ichki build'da, iOS yo'q.

## Qabul mezonlari (founder, Honor X9d)
1. `preview` APK EAS'da yig'iladi, havola yoki QR orqali telefonga o'rnatiladi. Ikonka va splash Brand Kit'dan, nomi "U-HUB (test)".
2. Telegram'dagi `v-1a-namuna.uhub` → "Ochish" → U-HUB tanlanadi → loyiha ochiladi (intent filtri ishlaydi).
3. Fayl rejimida 10.5 mezonlari Expo Go'dagidek o'tadi: eshik/tortmalar, ichki tortma tartibi, karta, QR.
4. LAN mock'ka QR orqali juftlash ishlaydi (HTTP, internal build).
5. Dev elementlari ko'rinmaydi. Sozlamalarda versiya va kanal chiqadi.
6. Kichik JS o'zgarishi `update:preview` bilan yuboriladi va ilova qayta ochilganda qo'llanadi (APK qayta o'rnatilmaydi).
7. Gate o'tadi, `main` push qilingan, repoda keystore, token yoki `.uhub` yo'q.

## Bu batchda YO'Q
iOS build, Play Store (production AAB faqat profil sifatida tayyor turadi), HTTPS server (DEP-1), crash reporting.

## Hisobot → `docs/reports/M-A8-report.md` + chatda qisqa (o'zbekcha)
Build havolasi va hajmi (MB), build vaqti, founder qadamlari natijasi, OTA sinovi, ochiq masalalar.
