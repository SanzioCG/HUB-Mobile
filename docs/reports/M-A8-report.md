# M-A8 hisoboti — Android ichki o'rnatma (APK), EAS Build va OTA yangilanish

- Sana: 2026-11-04 · Branch: `batch/m-a8` → `main`, merge **`34461e5`**
- Shart: M-A6 va M-A7 merge qilingan. Ish daraxtida faqat founder'ning commit qilinmagan hujjatlari
  (`1.7-furnitura-sorov.md`, keyinroq `A-1v-prompt.md`, `uhub-mobile-1.7.md`) — ularga tegilmadi.
- Gate: birinchi ishga tushirishda o'tdi (login'dan oldin); oxirgi o'zgarishlardan keyin yana o'tdi.
- Push: `git push origin main`. Repoda keystore, token yoki haqiqiy `.uhub` yo'q (faqat sintetik `mock/fixtures/uhub/namuna.uhub`).

## Build
| | Qiymat |
|---|---|
| EAS loyiha | `@uhub-mobile/uhub-mobile` (ID `fc157f7a-83bf-4267-80b7-07a8a468e2f7`) |
| Profil | `preview` (internal, APK), kanal `preview` |
| Build ID | `c52fd0ea-0ea7-49db-b357-c3cb6a431f1a` |
| APK | https://expo.dev/artifacts/eas/0BwsCSTTulkF81w7zbHGAu-TLzS-vffwfCb3Z-Hu0D8.apk |
| Hajm | **126 MB** (132 495 142 bayt; 4 ABI — arm64-v8a, armeabi-v7a, x86, x86_64) |
| Vaqt | 07:47 → 08:11 UTC, **≈ 24 daqiqa** (navbat + gradlew) |
| Versiya | 0.1.0, versionCode **2** (EAS remote, autoIncrement) |
| Runtime (fingerprint) | `b967acb082265de3265c3d13f92d3a81684467ed` |
| Commit | `3d7d3d5` |

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 1. Build profillari | `9546f21`, `3d7d3d5` | `eas.json`: preview (asosiy, APK), production (AAB, faqat profil), development (dev client — `expo-dev-client` qo'shilganda); `appVersionSource: remote`, `autoIncrement`. `app.config.ts`: `APP_VARIANT` (development / internal / production), internal nomi **"U-HUB (test)"**, HTTP va iOS ATS — development va internal da (DEP-1 gacha), production da o'chiq; `owner: "uhub-mobile"`, projectId, `runtimeVersion: fingerprint`, `updates` |
| 2. Monorepo va viewer | `c8b7b8f` | `eas-build-post-install`: viewer build + `copy-viewer`. `.easignore` (repo ildizi): docs, `*.uhub`, releases, mock fixtures, `*.md` yuklanmaydi; `assets/brand`, `icons`, `illustrations`, barcha workspace `package.json` va root lockfile — yuklanadi (tekshirildi). `expo-doctor` toza |
| 3. Dev elementlari | `d1c403c` | `SHOW_DEV_UI` (`__DEV__` yoki `APP_VARIANT=development`). Sozlamalar → Versiyalar: ilova, versionCode, viewer, kontrakt, kanal, yangilanish ID'si |
| — `.uhub` intent | `a06cd9c` | `+native-intent.tsx`: `content://` / `file://` → "Fayldan ochilganlar" o'zi ochadi (M-A7 da faqat intent filtri bor edi) |
| 4. OTA | `a827dd8`, `04d679f` | `expo-updates`: ochilganda tekshiradi, fonda yuklaydi, keyingi ochilishda qo'llaydi; Sozlamalar → "Yangilanishni tekshirish". `npm run build:android:preview`, `npm run update:preview -- "<izoh>"` (viewer build + `eas update --channel preview --environment preview --platform android`) |
| 5. Hujjat | `01683cc` | `docs/INSTALL-ANDROID.md` |
| OTA sinovi | `5b80afc` | Sozlamalarda "OTA sinovi 1" yozuvi |

Testlar: mobil Jest 75 (+ devUi, incoming, updates), viewer 111 (+7 ixtiyoriy), mock 46, generator 43.

### Dev elementlari — tekshiruv ro'yxati (release'da ko'rinmaydi)
| Element | Qanday yashirilgan |
|---|---|
| Sozlamalar → "Dasturchi" (Spike) | `SHOW_DEV_UI` |
| 3D statistikasi `ms · fps · △ · MB` | `SHOW_DEV_UI` |
| `dev/spike` marshruti | `Stack.Protected guard={SHOW_DEV_UI}` — havola bilan ham ochilmaydi |
| Juftlashda server manzilini qo'lda o'zgartirish | `SHOW_DEV_UI` (release'da manzil faqat juftlash QR'idan) |
| Fayl va AR xatosining texnik tafsiloti | `SHOW_DEV_UI` |
Testi: `apps/mobile/test/devUi.test.ts` (`showDevUi`, `appVariantOf`).

## Founder qadamlari — natija
| Qadam | Natija |
|---|---|
| expo.dev akkaunt, `eas login` | ✓ `5ilentivm`; loyiha `uhub-mobile` tashkilotida (founder qarori, `owner`) |
| `eas init` | ✓ agent (dinamik config — projectId `app.config.ts` ga qo'lda yozildi) |
| EAS environment | ✓ agent: preview `APP_VARIANT=internal`, production `APP_VARIANT=production` |
| Birinchi build, keystore | ✓ founder: "Generate a new Android Keystore?" → Yes; build FINISHED |
| Telefonga o'rnatish | ✓ "U-HUB (test)" o'rnatildi, juftlash ekrani Brand Kit illyustratsiyasi va ikonkalari bilan |
| LAN mock'ka QR bilan juftlash (HTTP, internal) | ✓ (Sozlamalarga kirish uchun ulandi) |
| Keystore zaxirasi | **founder qiladi** — `docs/INSTALL-ANDROID.md`, 5-bo'lim |

## OTA sinovi
- O'zgarish: Sozlamalarda "OTA sinovi 1" (faqat JS). Runtime **build 2 bilan bir xil**: `b967acb0…` (EAS build JSON va lokal
  `expo-updates runtimeversion:resolve`, `APP_VARIANT=internal`).
- `npm run update:preview -- "OTA sinovi 1"` → Android update ID `01a1a5a8-8db9-787e-a5e7-3382b197ea7c`, kanal `preview`
  (dashboard: https://expo.dev/accounts/uhub-mobile/projects/uhub-mobile/updates/debacfd4-da15-4f04-8368-2a51db3ac779).
- **Telefonda: ishladi** — APK qayta o'rnatilmasdan "OTA sinovi 1" chiqdi (founder, 2026-11-04).
- Izoh: birinchi yuborishda iOS uchun ham update guruhi chiqdi (iOS build yo'q, zararsiz) — skript endi `--platform android`.

## Qabul mezonlari
| # | Mezon | Holat |
|---|---|---|
| 1 | APK yig'iladi, o'rnatiladi; ikonka/splash Brand Kit, nomi "U-HUB (test)" | ✓ |
| 2 | Telegram → "Ochish" → U-HUB → loyiha ochiladi | kod tayyor (`+native-intent`); **founder tasdig'i kutilmoqda** |
| 3 | Fayl rejimida 10.5 mezonlari | founder tekshiradi (Expo Go'da o'tgan) |
| 4 | LAN mock'ka QR orqali juftlash (HTTP) | ✓ |
| 5 | Dev elementlari yo'q; versiya va kanal chiqadi | ✓ (Sozlamalar ochildi) |
| 6 | OTA — qayta o'rnatishsiz | ✓ |
| 7 | Gate, push, repoda maxfiy fayl yo'q | ✓ |

## Ochiq masalalar
1. **APK hajmi 126 MB** — 4 ABI. Ichki sinov uchun ABI bo'yicha ajratish yoki faqat `arm64-v8a` (Honor X9d) — keyin qaror.
2. **"OTA sinovi 1"** yozuvi Sozlamalarda qoldi — keyingi OTA'da olib tashlash mumkin (founder qaroriga).
3. **Juftlash ekranidagi sariq "Server manzili ko'rsatilmagan"** — release'da server faqat QR'dan keladi; xabar
   chalg'itishi mumkin ("QR bilan ulaning" deb o'zgartirish taklifi).
4. Sozlamalar faqat serverga ulanganda ochiladi (tab bar juftlangan holatda) — fayl rejimida versiya va OTA tugmasini ko'rish yo'q.
   Taklif: "Fayldan ochilganlar" ekraniga Sozlamalar/Versiya kirishi.
5. Fingerprint Windows (lokal) va EAS (Linux) da mos chiqdi; native o'zgarishda (yangi modul, `app.config.ts`, `package.json`
   skriptlari) runtime o'zgaradi — yangi APK kerak. `package.json` **skriptlari** ham fingerprint'ga kiradi.
6. "Ulashish" (Share) orqali kelgan fayl qabul qilinmaydi (SEND intent olib tashlandi) — faqat "Ochish".
7. iOS, Play Store (production AAB), HTTPS server (DEP-1), crash reporting — bu batchda yo'q.
