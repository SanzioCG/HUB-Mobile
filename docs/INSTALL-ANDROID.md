# U-HUB (test) — Android'ga o'rnatish, yangilash, keystore

Ichki sinov uchun APK (Play Store'ga chiqmaydi). Ilova Expo Go'siz ishlaydi: o'z ikonkasi va splash'i bilan,
Telegram'dagi `.uhub` faylni "Ochish → U-HUB (test)" bilan ochadi. iOS — keyin (Apple Developer akkaunti kerak).

## 1. Bir martalik: akkaunt va loyiha (founder)
1. https://expo.dev da bepul akkaunt oching.
2. Kompyuterda, repo papkasida:
   ```powershell
   cd D:\Yashnarbek\HUB-Mobile\apps\mobile
   npx -y eas-cli@27.4.1 login
   ```
   Email (yoki foydalanuvchi nomi) va parolni **o'zingiz** kiritasiz — agentga aytmang, hech qayerga yozilmaydi.
3. Loyihani EAS'ga bog'lash (agent qiladi, login'dan keyin): `eas init` → loyiha ID'si `apps/mobile/app.config.ts`
   dagi `EAS_PROJECT_ID` ga yoziladi (maxfiy emas). Shu bilan OTA yangilanish yoqiladi.
4. EAS'dagi `preview` environment'iga `APP_VARIANT=internal` o'zgaruvchisi qo'shiladi (agent: `eas env:create`).
   Bu shart: OTA yangilanish APK bilan bir xil sozlamada yig'ilishi kerak, aks holda telefonga yetib bormaydi.

## 2. APK yig'ish (founder)
```powershell
cd D:\Yashnarbek\HUB-Mobile
npm run build:android:preview
```
- **Birinchi build'da** EAS so'raydi: *"Generate a new Android Keystore?"* → **Yes**. Keystore Expo serverida
  saqlanadi (repoga yozilmaydi). Keyingi build'lar o'sha keystore bilan imzolanadi.
- Build bulutda ~10–20 daqiqa. Oxirida **havola va QR** chiqadi (expo.dev → Builds sahifasida ham bor).
- `versionCode` har build'da avtomatik oshadi (EAS remote).

## 3. Telefonga o'rnatish (Honor X9d)
1. Build havolasini telefonda oching (yoki QR'ni kamera bilan skanerlang) → **Install** → `.apk` yuklanadi.
2. Ochishda Android so'raydi: **"Noma'lum manbalardan o'rnatish"** — brauzer (Chrome) yoki fayl menejeri uchun ruxsat bering
   (Sozlamalar → Xavfsizlik → Noma'lum ilovalarni o'rnatish). Honor'da "Pure mode" yoqiq bo'lsa — vaqtincha o'chiring.
3. **O'rnatish** → ilova nomi **"U-HUB (test)"**, ikonka Brand Kit'dan.
4. `.uhub`: Telegram'da faylni bosing → **Ochish** (yoki "…" → "Boshqa ilovada ochish") → **U-HUB (test)** →
   loyiha "Fayldan ochilganlar" da ochiladi.
5. LAN mock (HTTP, faqat shu ichki build'da): ilovada "QR bilan ulash" → kompyuterdagi `/dev/qr` juftlash QR'i.

## 4. Yangilash
| O'zgarish | Nima qilinadi |
|---|---|
| Faqat JS/TS kod yoki viewer (`packages/viewer`) | **OTA**: `npm run update:preview -- "nima o'zgardi"` → ilova keyingi ochilishda oladi (fonda yuklab, keyingi safar qo'llaydi). Darhol: Sozlamalar → "Yangilanishni tekshirish" → "Qayta ishga tushirish" |
| Native: yangi Expo modul, `app.config.ts` (ikonka, splash, ruxsat, intent filtri), Expo SDK | **Yangi APK**: `npm run build:android:preview` va qayta o'rnatish (eskisining ustiga — ma'lumotlar saqlanadi) |

Runtime versiyasi — `fingerprint`: native qism o'zgarsa u o'zgaradi, eski APK yangi OTA'ni olmaydi (shunda yangi APK kerak).
Sozlamalar → Versiyalar: ilova versiyasi, versionCode, viewer, kontrakt, kanal (`preview`) va yangilanish ID'si.

## 5. Keystore zaxirasi (muhim)
Keystore yo'qolsa, keyingi APK eskisining **ustiga o'rnatilmaydi** (o'chirib qayta o'rnatish kerak — telefondagi fayllar yo'qoladi).
```powershell
cd D:\Yashnarbek\HUB-Mobile\apps\mobile
npx -y eas-cli@27.4.1 credentials
```
→ Android → `preview` → **Keystore** → *Download existing keystore* → `.jks` fayl va parollarni **repodan tashqarida**
(masalan shaxsiy bulut yoki USB) saqlang. Repoga, Telegram'ga yoki chatga qo'ymang.

## 6. Ma'lum cheklovlar
- HTTP (LAN mock) faqat ichki build'da (`internal`); `production` da o'chiq — HTTPS server (DEP-1) kelgach ichki build'dan ham olib tashlanadi.
- iOS yo'q (Apple Developer akkaunti kerak). Play Store yo'q (`production` profili — AAB, faqat tayyor turadi).
- "Ulashish" (Share) menyusidan yuborilgan fayl qabul qilinmaydi — **"Ochish"** ishlatiladi.
- Dev elementlari (Spike, statistika, server manzilini qo'lda o'zgartirish) ichki build'da ko'rinmaydi.
- AR (server rejimi) — HTTPS tunnel bilan (mock README), fayl rejimida AR yo'q (kontrakt 10.1).
