# Batch M-A6 — rasm va ikonkalarni ulash (TMP fayllar bilan), yuklanish ekrani

## Kontekst
- Repo `D:\Yashnarbek\HUB-Mobile`. M-A5 merge qilingan bo'lishi kerak (hotspot, o'ng panel va AR overlay shu batchda ikonka oladi).
  M-A5 merge qilinmagan bo'lsa — to'xta va hisobot ber.
- Founder repo ildiziga **`assets/`** papkasini qo'ygan (brand, icons, illustrations — hammasi TMP) va `docs/design/ASSETS.md` ni.
  ASSETS.md — **yagona manba**: fayl nomlari, o'lchamlar, qayerda ishlatilishi.
- Maqsad: kod hozir TMP fayllar bilan to'liq ishlasin; founder keyin faylni **shu nom bilan almashtiradi**, kod o'zgarmaydi.
- Dizayn: `docs/design/mobile-design-concept.png` (umumiy). Yuklanish ekrani bo'yicha founder rasmi: qora fon, ikki ko'k nur chizig'i
  (yuqori chap va pastki o'ng), markazda logotip ("U-HUB", ostida "— VIEWER —"), pastda ingichka accent progress chizig'i.

## Ish tartibi
- Branch `batch/m-a6`, har qism — bitta commit, oxirida `main` ga merge va `git push origin main`.
- Gate `-Quiet` bir marta, xatolarni tuzat, bir marta qayta. Brauzer tekshiruvi, skrinshot yo'q.
- Faqat Expo Go'dagi modullar (`react-native-svg`, `expo-splash-screen`, `expo-image`).

## Qismlar

### 0. Commit
`assets/**` va `docs/design/ASSETS.md` — commit. `docs/batches/M-A6-prompt.md` ham.

### 1. Ilova ikonkasi va tizim splash'i (`app.config.ts`)
- `icon` → `assets/brand/icon.png`; `android.adaptiveIcon`: `foregroundImage` → `adaptive-foreground.png`, `monochromeImage` →
  `adaptive-monochrome.png`, `backgroundColor: "#0B0D0F"`.
- `expo-splash-screen` plugin: `image` → `splash-icon.png`, `imageWidth` ≈ 200, `backgroundColor: "#0B0D0F"` (iOS va Android bir xil).
- Web favicon → `favicon.svg` / `favicon-48.png` (viewer bundle'ning V-2 rejimi uchun ham).
- Hisobotda yoz: Expo Go'da loyiha ikonkasi va tizim splash'i ko'rinmaydi — faqat build'da.

### 2. Ilova ichidagi yuklanish ekrani
- Tizim splash'idan keyin (`SplashScreen.preventAutoHideAsync` → tayyor bo'lganda `hideAsync`): to'liq ekran `loading-bg.png` (cover),
  markazda `logo-full.svg`, pastda progress chizig'i (eni ekranning ~45 %, balandligi 4 px, fon `surface`, to'lishi `accent`).
- Progress **haqiqiy** bosqichlarga bog'langan: shriftlar → secure-store (server, token) → kesh indeksi → birinchi API so'rovi
  (oflaynda — keshdan). Soxta taymer yo'q. Hammasi < 300 ms bo'lsa ekran miltillamasin (minimal ko'rsatish yoki to'g'ridan-to'g'ri o'tish — qaroringni hisobotda yoz).
- Xato bo'lsa (masalan server javob bermadi) — yuklanish ekrani qotib qolmaydi: oflayn yoki xato holatiga o'tadi.

### 3. Ikonka tizimi
- `lucide-react-native` — ASSETS.md'dagi ro'yxat.
- Maxsus SVG'lar: **generator skript** `npm run icons` — `assets/icons/*.svg` va `assets/illustrations/*.svg` dan
  `apps/mobile/src/ui/generated/*.tsx` (`react-native-svg` komponentlari) yasaydi; `currentColor` → `color` prop. Generatsiya qilingan
  fayllar commit qilinadi; gate ular `assets/` bilan mos ekanini tekshiradi (eskirgan bo'lsa xato: "npm run icons ni ishga tushiring").
- Yagona komponent: `<Icon name="door-open" size={24} color={...} />` — Lucide va maxsuslarni bitta nom ro'yxatida birlashtiradi (tiplangan).
- **Viewer** (`packages/viewer`) hotspot va AR overlay ikonkalari — o'sha `assets/icons/*.svg` dan (Vite `?raw` import),
  bundle ichiga kiritiladi (oflayn ishlashi uchun tarmoqdan olinmaydi).

### 4. Ikonkalarni joyiga qo'yish
- Tab bar (Loyihalar, Skaner, Offline, Sozlamalar), 3D pastki panel (`open-all`, `ruler`, `box`, `rotate-ccw`), o'ng panel
  (`rotate-3d`, `layers`, `scan`, `hotspot`, `swing-zone`, "…"), hotspot'lar (`door-open/close`, `drawer-open/close`),
  detal kartasi tugmasi, skaner (yopish, chiroq), Offline (o'chirish), Sozlamalar (`smartphone`, `log-out`).
- Buyum rasmi (`thumb_url`) yo'q bo'lsa — `cabinet` ikonkasi `surface` fonda.
- Illyustratsiyalar: juftlash (`pair-scan`), AR boshida (`ar-coach`, viewer overlay), bo'sh holatlar (`empty-projects`, `empty-offline`),
  kamera ruxsati yo'q (`camera-denied`), AR qo'llanmaydi (`ar-unsupported`).
- Ikonkasiz qolgan tugma yoki matnli "ikonka" (emoji, belgi) qolmasligi kerak.

### 5. TMP nazorati
- `npm run check:assets` — `assets/` dagi TMP fayllar ro'yxati (PNG: piksel hash'lari `assets/.placeholders.json` dagi ro'yxat bilan
  solishtiriladi; SVG: `TMP placeholder` izohi). Gate'da **ogohlantirish** (yiqitmaydi). Production build skriptida (keyin) — xato.
- Rasm o'lchami va formati ASSETS.md'ga mosligini tekshirish (masalan `icon.png` 1024×1024, shaffofliksiz) — gate'da **xato**.

## Qabul mezonlari (founder, Honor X9d, Expo Go)
1. Gate o'tadi; `check:assets` hozir 23 ta TMP faylni ko'rsatadi.
2. Ilova ochilganda yuklanish ekrani (nur chiziqlari, logotip, progress) ko'rinadi va haqiqiy yuklanish bilan to'ladi.
3. Hamma tugmalarda ikonka bor; matn harfma-harf bo'linmaydi.
4. Bitta SVG'ni (masalan `door-open.svg`) boshqa SVG bilan almashtirib `npm run icons` qilinsa — telefonda yangi ikonka ko'rinadi, kod o'zgarmagan.
5. Bo'sh holatlar va juftlash ekranida illyustratsiyalar bor.

## Bu batchda YO'Q
Yakuniy dizayn fayllari (founder beradi), do'kon rasmlari va skrinshotlar, development/production build.

## Hisobot → `docs/reports/M-A6-report.md` + chatda qisqa (o'zbekcha, ~20 qator)
Bajarilgan / bajarilmagan; yuklanish ekrani qarori; `check:assets` natijasi; founder uchun "faylni qanday almashtirish" 3 qadamda.
