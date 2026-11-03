# ADR-M003 — Ilova ichidagi animatsiyali AR (eshik va tortmalarni AR ichida ochish)

- Holat: **taklif** — qaror founder'niki (M-A3 spike'i, kod yo'q).
- Kontekst: kontrakt `uhub-mobile/1.2` (qoralama) — 3 (AR), 5 (A-2: "eshik/tortmalarni AR ichida ochish"),
  7 (qabul: AR'da o'lcham real, ±1 %).
- Bog'liq: ADR-M002 (WebView'da viewer), M-A3 (statik AR: Android Scene Viewer, iOS Quick Look yo'li).

## Talab

A-2: foydalanuvchi buyumni haqiqiy o'lchamda polga qo'yadi va **AR ichida** eshik/tortmalarni ochib-yopadi
(viewer'dagi `door__*__open` / `drawer__*__open` kliplari kabi, bittasi yoki hammasi).

## Ma'lum cheklovlar (tekshirilgan)

| Cheklov | Manba |
|---|---|
| **Android WebView'da WebXR yo'q** — `navigator.xr`: `webview_android: version_added: false` (ochiq Chromium xatosi). Ilovaning WebView'idagi three.js viewer AR sessiyasini ocha olmaydi. | MDN browser-compat-data, `api/Navigator.json` → `xr` ([crbug.com/40652382](https://crbug.com/40652382)) |
| **iOS'da WebXR yo'q** — Safari: `version_added: false`; WKWebView ham shu dvigatel. | MDN browser-compat-data, o'sha yozuv |
| **Scene Viewer bitta animatsiya** — "If the glTF file contains multiple animations, Scene Viewer plays only the first animation"; animatsiya takrorlanadi (loop), foydalanuvchi boshqarmaydi. | [developers.google.com/ar/develop/scene-viewer](https://developers.google.com/ar/develop/scene-viewer) |
| **Quick Look statik USDZ** (kontrakt 3: server yopiq holatda yasaydi). USDZ animatsiyasi avtomatik o'ynaydi, boshqaruvsiz. `.reality` faylda tap-trigger xatti-harakatlari bor, lekin forum hisobotlariga ko'ra beqaror va hit-test yo'q. | Kontrakt 3; [Apple AR Quick Look](https://developer.apple.com/augmented-reality/quick-look/); Apple forumlari: [120228](https://developer.apple.com/forums/thread/120228), [692506](https://developer.apple.com/forums/thread/692506) |
| **Expo Go** faqat o'zidagi native modullarni beradi; ARCore/ARKit moduli yo'q → ilova ichidagi AR uchun development build kerak. | `apps/mobile/AGENTS.md` (Expo qoidasi); Expo hujjatlari |

Xulosa: hozirgi stek (Expo Go + WebView + tashqi AR ko'ruvchilar) bilan **AR ichida interaktiv ochish mumkin emas**.

## Variantlar

### (a) Expo development build + native AR moduli

- Nomzod: **ViroReact** (`@reactvision/react-viro`, ReactVision tomonidan qo'llab-quvvatlanadi).
  Joriy holat (changelog 2.55.0): o'rnatish yo'li — **Expo Dev Client**, Expo config plugin native sozlamalarni yasaydi;
  AR uchun **Expo 54 + Expo 55, React Native 0.83** ko'rsatilgan; 2.43.1 dan boshlab faqat **New Architecture**.
  Manbalar: [2.55.0 changelog](https://viro-community.readme.io/changelog/viroreact-2550-horizonos-support-and-studio-integration),
  [2.43.1 changelog](https://viro-community.readme.io/changelog/reactvision-2431-full-new-architecture-support-major-stability-fixes),
  [npm](https://npmjs.com/package/@reactvision/react-viro).
- **Xavf:** biz Expo **SDK 58 / RN 0.88** da; ViroReact changelog'ida SDK 58 qo'llab-quvvatlanishi **ko'rsatilmagan**
  → moslik spike'da tekshirilishi shart. Mos kelmasa — SDK'ni pasaytirish yoki ViroReact yangilanishini kutish.
- Muqobil (tekshirilmagan): o'zimizning Expo native moduli — Android'da ARCore + glTF render (masalan SceneView),
  iOS'da ARKit/RealityKit. Nomli kliplarni boshqarish to'liq bizda, lekin Kotlin + Swift kodi va qo'llab-quvvatlash bizning zimmamizda.
- Expo Go'dan chiqish: **ha** (dev build; har native o'zgarishda qayta yig'ish).
- iOS: Mac shart emas — **EAS Build** (kontrakt 1). Qurilmaga o'rnatish/TestFlight uchun **Apple Developer akkaunti**
  kerak (kontrakt 9.3 — ochiq savol).
- Kod hajmi: katta. AR uchun alohida render yo'li (three.js viewer AR'da ishlatilmaydi): buyumni yuklash, polga qo'yish,
  kliplar UI, o'lchov aniqligi. Taxminiy baho berilmaydi — spike natijasiga qarab.
- Boshqa xavflar: ikki xil render (viewer va AR) bir xil ko'rinishi kerak; ARCore qurilma ro'yxati; o'lchov ±1 % ni
  native kutubxona masshtabi buzmasligi; ilova hajmi oshadi.

### (b) Scene Viewer'ga har eshik/tortma uchun alohida bitta animatsiyali GLB

- Har klip uchun alohida fayl (`…-ar-door-d1.glb`), ilovada "AR: eshik ochiq" kabi tanlov.
- Expo Go'dan chiqish: **yo'q**. iOS: Quick Look uchun ham alohida USDZ kerak (server tomonda, V-1b).
- Kod hajmi: kichik (generator + ilovada tanlov).
- Cheklovlar: animatsiya **takrorlanib o'ynaydi** (loop) — "ochiq turish" holati yo'q; foydalanuvchi boshqarmaydi;
  har fayl almashtirilganda AR sessiyasi qaytadan ochiladi (buyum qayta polga qo'yiladi); "hammasini ochish" uchun
  yana alohida fayl. Muqobil: animatsiya o'rniga **statik "ochiq holat" GLB** (eshik ochiq turgan model) —
  takrorlanish muammosi yo'q, lekin animatsiya ham yo'q.
- Xavf: kontrakt talabini ("AR ichida ochish") qisman qondiradi.

### (c) A-2 dan chiqarish — faqat statik AR

- M-A3 dagi holat: real o'lchamda polga qo'yish (Scene Viewer `resizable=false`, Quick Look), eshik/tortmalar AR'da yopiq.
- Expo Go'dan chiqish: **yo'q**. iOS: USDZ (V-1b) bo'lsa Safari orqali ishlaydi.
- Kod hajmi: qo'shimcha yo'q.
- Xavf: kontrakt 5 (A-2) qayta ko'rib chiqilishi kerak — kontrakt 1.3 da o'zgartirish.

### (d) Chrome WebXR sahifasi (M-A3 telefon sinovidan keyin qo'shildi)

- Topilma: Honor X9d'da Scene Viewer tashqi modellarni ochmadi, lekin **Chrome WebXR** ishladi — Google
  `<model-viewer>` (`ar-modes="webxr"`) bilan M-0 haqiqiy o'lchamda polga qo'yildi. Ilova uni `Linking.openURL` bilan
  Chrome'da ochadi (M-A3 tuzatishi). WebView'da WebXR yo'q (yuqoridagi jadval), Chrome'ning o'zida bor.
- Animatsiya: WebXR sahifasi oddiy veb-sahifa — unda three.js (bizning `packages/viewer` ga yaqin kod) WebXR sessiyasida
  nomli kliplarni boshqara oladi va AR ichida eshik/tortma tugmalari ko'rsatiladi. Bu **tekshirilmagan** — spike kerak
  (DOM overlay, tugmalar, o'lchov aniqligi).
- Expo Go'dan chiqish: **yo'q**. iOS: Safari'da WebXR **yo'q** (MDN) → iOS uchun Quick Look (statik) qoladi.
- Kod hajmi: o'rtacha — AR sahifasi (backend beradi), viewer'ning WebXR rejimi. Ilova o'zgarmaydi.
- Xavflar: foydalanuvchi ilovadan Chrome'ga o'tadi (keyin qaytadi); Chrome va ARCore qurilmada bo'lishi shart;
  iOS'da interaktiv AR bo'lmaydi; sahifa backend'da joylashishi kerak (kontrakt 1.3).

## Taqqoslash

| | (a) dev build + native AR | (b) bitta animatsiyali GLB'lar | (c) faqat statik | (d) Chrome WebXR sahifa |
|---|---|---|---|---|
| AR ichida ochish | Ha, boshqariladi | Qisman (loop) yoki statik "ochiq" | Yo'q | Ha (Android), spike kerak |
| Expo Go | Chiqiladi | Qoladi | Qoladi | Qoladi |
| iOS | EAS + Apple Developer | USDZ variantlari (server) | USDZ (server) | Faqat statik Quick Look |
| Kod hajmi | Katta | Kichik | Yo'q | O'rtacha (sahifa + viewer WebXR) |
| Asosiy xavf | SDK 58 mosligi, ikki render | UX (loop, sessiya qayta) | Talabdan voz kechish | Chrome'ga o'tish, iOS'da yo'q |

## Taklif (founder qaror qiladi)

0. **Yangilanish (M-A3 telefon sinovi):** statik AR endi (d) yo'li bilan ishlaydi (Chrome WebXR). Interaktiv AR uchun
   birinchi navbatda **(d) spike** taklif qilinadi — Expo Go'dan chiqmasdan, mavjud viewer kodiga yaqin.
1. Hozircha **(c)/(d) statik** — o'lcham sinovi (±1 %) WebXR'da o'tkaziladi.
2. Agar (d) interaktiv AR'ni ko'tarmasa va A-2 da u majburiy bo'lsa — **(a) bo'yicha alohida spike**: dev build,
   ViroReact SDK 58 da ishga tushadimi, M-0 GLB'si nomli kliplar bilan ochiladimi va o'lcham ±1 % mi.
   Spike muvaffaqiyatsiz bo'lsa — (b) ning "statik ochiq holat" varianti.
3. Founder'dan kerak: A-2 da interaktiv AR majburiymi; Apple Developer akkaunti (kontrakt 9.3).
