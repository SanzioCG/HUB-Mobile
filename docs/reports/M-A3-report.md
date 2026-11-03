# M-A3 hisoboti — AR 1-bosqich: Scene Viewer, Quick Look yo'li, ilova ichidagi AR spike'i

- Sana: 2026-11-03 · Branch: `batch/m-a3` → `main`, merge **`e06b451`**
- Kontrakt fayli: `docs/contract/uhub-mobile-1.2-draft.md` (QORALAMA) — `uhub-mobile-1.2.md` hali yo'q.
- Gate (`scripts/check-mobile.ps1 -Quiet`): birinchi ishga tushirishda o'tdi, tuzatish kerak bo'lmadi.
- Push: `origin` = https://github.com/SanzioCG/HUB-Mobile.git — `main` push qilindi (AR tuzatishi bilan, `3aea73b`).
- Zaxira (`git bundle`): **yaratilmadi** — zaxira papkasi berilmagan (topshiriqda `<papka>` shablon bo'lib qolgan).
  **Savol: zaxira qaysi papkaga?** Yo'l berilsa: `git bundle create <papka>\HUB-Mobile-2026-11-03.bundle --all`.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 0. AR GLB varianti | `1980d5e` | `<revision_id>-ar.glb`: animatsiyasiz, yopiq holat; `ar-link` (`glb`) shunga; `MOCK_PUBLIC_URL` + cloudflared yo'riqnomasi (`mock/README.md`) |
| 1. Android Scene Viewer | `17181ad` | AR tugmasi → `ar-link` → `com.google.ar.core` (`ar_only`) → yo'q bo'lsa Google app (`ar_preferred`) → yo'q bo'lsa xabar; `resizable=false`, sarlavha ≤ 60 |
| 2. iOS Quick Look yo'li | `e90add6` | `usdz` → `ar-link` → `Linking.openURL` (Safari); `usdz_url` null — tugma o'chiq. **Sinalmagan** |
| 3. ADR-M003 | `0f1e2c0` | Ilova ichidagi animatsiyali AR: cheklovlar manbalar bilan, 3 variant, taklif |
| 4. Gate | `4e82b89` | AR GLB'lar `gltf-validator` qadamida; har asosiy GLB uchun AR varianti borligi tekshiriladi |

Testlar: generator 32 (AR: animatsiya 0, bounding box asosiy GLB bilan ±0.1 mm, 600 × 900 × 560 mm,
≤ 10 material, ≤ 100 000 uchburchak), mock 33, viewer 51, mobil Jest 58 (intent URL, fallback tartibi, HTTPS, oflayn, iOS).

Bajarilmagan: AR'da o'lchov (rulet) — founder telefonda o'lchaydi (pastdagi jadval).

## Telefonda tekshirish (Honor X9d, tunnel bilan)

1. `winget install --id Cloudflare.cloudflared`.
2. `npm run fixtures` → `npm run mock` → boshqa terminalda `cloudflared tunnel --url http://localhost:8787`.
3. Chiqqan `https://….trycloudflare.com` ni `mock/.env` ga yozing: `MOCK_PUBLIC_URL=https://….trycloudflare.com`,
   mock'ni qayta ishga tushiring. Ilova LAN orqali ishlashda davom etadi — faqat AR havolasi tunnel orqali.
4. `npm start -w @hub-mobile/mobile` → Expo Go → M-0 → **AR** → Chrome'da AR sahifasi → "AR'da ochish" → buyumni
   polga qo'ying (WebXR, quyidagi "Tuzatish" bo'limi). Ikki barmoq bilan kattalashtirib bo'lmasligi kerak (`ar-scale="fixed"`).
5. Rulet bilan o'lchang (jadval). Tunnelsiz (`MOCK_PUBLIC_URL` bo'sh) — dev'da "AR HTTPS talab qiladi — MOCK_PUBLIC_URL" xabari. Wi-Fi o'chiq — "AR uchun internet kerak". Ilova qulamasligi kerak.

### O'lchov (founder to'ldiradi; ±1 %)

| O'lcham | Kontrakt | Ruxsat | O'lchangan | Farq | O'tdimi |
|---|---|---|---|---|---|
| Kenglik | 600 mm | ±6 mm | | | |
| Balandlik | 900 mm | ±9 mm | | | |
| Chuqurlik | 560 mm | ±5.6 mm | | | |

Qurilma/sharoit (yorug'lik, pol turi, ARCore versiyasi): ________

## iOS

iOS qurilmasi yo'q — **sinalmagan**. Expo Go'da ilova ichidan Quick Look (QLPreviewController) chaqirib bo'lmaydi,
shuning uchun havola Safari orqali ochiladi. Mock'da USDZ yo'q: `ar-link` `usdz` → 404, ilova "AR bu buyum uchun tayyor
emas" ko'rsatadi. Skanerdan ochilgan reviziyada `usdz_url` noma'lum (resolve'da yo'q) → iOS'da AR tugmasi o'chiq.

## Kontraktga takliflar

1. **AR GLB varianti** (kontrakt 1.3): har reviziya uchun `ar_glb_url` (yoki `ar-link` `format: "glb"` doim AR variantini
   beradi) — animatsiyasiz, yopiq holat. Sabab: Scene Viewer bir nechta klipdan faqat birinchisini o'ynatadi va
   validatori buni xato deb belgilaydi. USDZ ham shu kabi statik (kontrakt 3 da bor).
2. `resolve` javobiga `usdz_url` (yoki `item.usdz_available`) — skanerdan ochilgan buyumda iOS AR tugmasi uchun.
3. `ar-link` `format: "glb"` qaysi faylni berishi kontraktda aniq yozilsin (asosiy yoki AR varianti).

## Kontraktdan chetga chiqishlar va qarorlar

- Mock'da `ar-link` `glb` → `<revision_id>-ar.glb` (kontraktda AR varianti yo'q — taklif 1).
- `MOCK_PUBLIC_URL` faqat imzolangan AR havolalariga ta'sir qiladi; `glb_url` va boshqa URL'lar so'rov hostidan.
- `isOfflineError` `api/errors.ts` ga ko'chirildi (AR va skaner moduli saqlash qatlamiga bog'lanmasin).

## `TODO(contract)` — M-A3 da yangi

1. AR GLB varianti kontraktda yo'q (`tools/sample-glb/src/build.ts`, `mock/src/app.ts`).
2. `resolve` da `usdz_url` yo'q → skanerdan ochilgan buyumda iOS AR o'chiq.

Avvalgi `TODO(contract)` va `TODO(contract-1.2)` ro'yxati o'zgarmadi (M-A2 hisoboti). `ar-link` tanasi va 10 daqiqa
muddati hamon `TODO(contract-1.2)`.

## Tuzatish (telefon sinovidan keyin): Scene Viewer o'rniga Chrome WebXR

Telefonda (Honor X9d) diagnostika:
1. `expo-intent-launcher` (SDK 58) `packageName` ni faqat `className` bilan ishlatadi (`setPackage` yo'q) — intent
   paketsiz ketib brauzerda ochilgan. ARCore'ning yo'naltiruvchi komponenti (`…/.viewer.IntentForwardActivity`)
   bilan ham Scene Viewer Google logosidan keyin qaytgan.
2. Mock sinov sahifasi (vaqtinchalik `/dev/ar-test`) bilan Chrome'dan Google hujjatidagi `intent://` yo'li sinaldi:
   bizning fayl (imzoli va imzosiz), Google demo modeli bizning tunnel orqali, Khronos modeli GitHub'dan — **hammasi**
   Scene Viewer'da logo → qaytish; telefondan fayl so'rovi kelmagan. CORS sarlavhasi qo'shilgani ham yordam bermadi.
   Xulosa: shu qurilmada Scene Viewer (Google app) tashqi modellarni ochmayapti; sababi aniqlanmadi.
3. Google `<model-viewer>` demosi Chrome'da ishlagan — u **WebXR** ishlatadi. Bizning M-0 bilan `<model-viewer>`
   (`ar-modes="webxr"`, `ar-scale="fixed"`) sahifasi **ishladi** (founder tasdiqladi).

**Yechim:** AR tugmasi → `ar-link` → `/ar/launch` sahifasi Chrome'da (`Linking.openURL`) → `<model-viewer>` WebXR,
`ar-scale="fixed"` (kattalashtirish o'chiq), polga. `expo-intent-launcher` olib tashlandi. AR fayllari CORS bilan.

**Kontraktga taklif (1.3):** AR sahifasi backend tomonda (`ar-link` javobida `launch_url` yoki alohida yo'l),
`<model-viewer>` backend'ning o'zida joylashtirilgan (CDN emas). `TODO(contract)`: `apps/mobile/src/ar/arPage.ts`,
`mock/src/app.ts`.

Ilovadagi AR tugmasi bo'yicha yana ikki topilma (`d7d3c14`):
- `Linking.openURL` ichida `this` ishlatiladi — uni `openUrl: Linking.openURL` ko'rinishida kontekstsiz uzatish TypeError
  bergan va "AR mavjud emas" ko'rsatilgan. Endi `(url) => Linking.openURL(url)`; dev'da xatoning asl sababi ham chiqadi.
- Expo ishlab turganda yangi fayl (`src/ar/arPage.ts`) qo'shilganda Metro uni ko'rmagan ("Unable to resolve") va telefon
  eski bundle bilan qolgan. Yechim: `npx expo start -c` va Expo Go'da ilovani to'liq yopib qayta ochish.

**Natija:** ilovadagi AR tugmasi → Chrome → WebXR — telefonda **ishladi** (founder tasdiqladi).

**Ochiq:** rulet o'lchovi (±1 %) WebXR'da qilinishi kerak — o'lchov jadvali yuqorida.

## Founder'dan kerak

- Zaxira papkasi yo'li (`git bundle`).
- ADR-M003 bo'yicha qaror: A-2 da interaktiv AR majburiymi; Apple Developer akkaunti (kontrakt 9.3).
- Rulet o'lchovlari (jadval).
