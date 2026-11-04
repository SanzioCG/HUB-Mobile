# Batch M-A7 (A-1u) — kontrakt 1.6: `.uhub` faylidan ochish, ichki tortma tartibi, haqiqiy V-1a fayli

## Kontekst
- Repo `D:\Yashnarbek\HUB-Mobile`. **Avval M-A5 tugagan va `main` ga merge qilingan bo'lishi kerak**, ish daraxti toza.
  Aks holda to'xta va hisobot ber. M-A6 (assets) bu batchga bog'liq emas: M-A7 dan keyin bajariladi.
- Kontrakt **`uhub-mobile/1.6`**. Manba: U-HUB `docs/mobile/VIEWER-CONTRACT.md`. Founder nusxasini
  `docs/contract/uhub-mobile-1.6.md` ga **o'zgarishsiz** qo'ygan. Kontrakt 1-bo'limiga ko'ra HUB-Mobile'dagi nusxa
  aynan shu versiya bo'lishi shart: tahrir qilma, faqat commit qil. `docs/contract/HUB-MOBILE-INTEGRATION.md` ham yangilangan.
- HUB-Mobile hozir **1.3** bo'yicha ishlaydi. Bu batch 1.4, 1.5 va 1.6 dagi mobil o'zgarishlarni yopadi. O'zgarishlar
  ro'yxati kontrakt boshida berilgan, har birini o'qib chiq.
- **Haqiqiy test fayli:** `D:\U-HUB-eksport\V-1a\v-1a-namuna.uhub`. U-HUB V-1a eksporti, loyiha 64, 2 buyum:
  "Shkaf 600" R14 (eshik, tashqi tortma, eshik ortidagi ichki tortma) va "Shkaf 1200" R10 (ikki tabaqali eshik).
  Faylning yonida: `glb/` (shu GLB'lar, `index.json`), `cards.json` (U-HUB detal kartalari), U-HUB skrinshotlari `01…06-*.png`.
  - **Faylni repoga commit qilma.** `.uhub` ichida `project.json` va `documents/` bor, ularda mijoz ma'lumoti bo'lishi
    mumkin, repo esa GitHub'ga push qilinadi. Testlar faylni `UHUB_REAL_FILE` muhit o'zgaruvchisi orqali tashqi yo'ldan o'qiydi.
    O'zgaruvchi berilmagan bo'lsa, real-fayl testlari **skip** qilinadi va bu gate natijasida ko'rinadi.
    `.gitignore` ga `*.uhub` qo'shiladi, `mock/fixtures/` dagi sintetik fayllar bundan mustasno.
- Fayl haqida founder tekshiruvi (ma'lumot uchun, qayta tekshir):
  - SHA-256 manifest bilan mos, `parts` GLB'dagi uid'lar bilan mos, kengaytmalar yo'q.
  - `contract` maydoni **"1.5"**: fayl 1.6 dan oldin eksport qilingan. `warnings` yo'q, `__mid` yo'q, shisha yo'q,
    `lmdf`/`pvc` yo'q. Bu holatlar sintetik fixture bilan sinaladi.
  - `snapshot` hamma joyda **"joriy"**: TODO(contract), hisobotda savol (pastda).

## Ish tartibi
- Branch `batch/m-a7`, har qism — bitta commit, oxirida `main` ga merge va `git push origin main`.
- Gate `-Quiet` bir marta, xatolarni tuzat, bir marta qayta. Brauzer tekshiruvi va skrinshot yo'q (founder telefonda tekshiradi).
- Bilmagan qiymatni taxmin qilma: `TODO(contract)` qo'y va hisobotda savol sifatida yoz.

## Qismlar

### 0. Kontrakt fayllari
`docs/contract/uhub-mobile-1.6.md` va `HUB-MOBILE-INTEGRATION.md` ni commit qil. Kodda kontrakt versiyasi konstantasi `1.6`.
Viewer `1.x` ning hammasini qabul qiladi (fayldagi "1.5" ham), faqat major farq qilsa xabar beradi.

### 1. 1.4 deltasi (mobil qism)
- AR: ilova `ar-link` javobidagi `launch_url` ni tizim brauzerida ochadi (M-A5 bilan solishtir, farq bo'lsa kontraktga moslashtir).
  Mock: `ar` varianti va `launch_url`, kesh kaliti `revision_id` + `variant`.
- `resolve` javobida `usdz_url`. Noto'g'ri juftlash kodi `400 pair_code_invalid` (hozir mockda `401 invalid_code`, tuzat).
- `thickness_mm: null` kartada "—" ko'rinishida chiqadi.
- Tugun nomi kodlash testida kontraktdagi tuzatilgan base32 misoli ishlatiladi.
- `release:viewer` manifestida `contract: "1.6"`; `VIEWER_VERSION` ni oshir (`0.5.0`).

### 2. 1.6: ichki tortma tartibi (2.2) — viewer
- Tortmani ochish (hotspot, karta, AR overlay): shu tortma fasadining `reveal` ro'yxati **tartib bilan ketma-ket**
  ijro etiladi (avval eshik, keyin tortma). Yopish teskari tartibda: avval tortma, keyin eshik.
- Eshikni yopish: avval uning ortidagi ochiq tortmalar yopiladi, keyin eshik. "Ortidagi" deganda `reveal` ro'yxatida
  shu eshik klipi bor tortmalar tushuniladi. Bu ma'lumotdan olinadi, hisoblanmaydi.
- "Hammasini ochish/yopish": ochishda avval eshiklar, keyin ichki tortmalar; yopishda teskari.
- Tortma klipini yolg'iz ijro etish (fasad yopiq eshikdan o'tib ketadi) faqat dev sinov sahifasida bo'ladi.
- Testlar: haqiqiy fayldagi "Tortma fasadi 2" (`reveal`: eshik → tortma) ochish/yopish tartibi;
  tortma ochiq turganda eshikni yopish; tashqi "Tortma fasadi 1" eshikka tegmaydi.

### 3. 1.6: materiallar (2.5) va ogohlantirishlar (10.2)
- `kind` ro'yxatiga `lmdf` va `pvc` qo'shiladi. Noma'lum `kind` xato emas: kartada oddiy material sifatida chiqadi.
- `index.json` `items[].warnings` (ixtiyoriy): buyum ma'lumotida sariq belgi (`warning` tokeni) va matnlar ro'yxati.
  Bo'sh bo'lsa yoki yo'q bo'lsa, hech narsa ko'rinmaydi.
- Sintetik fixture: `lmdf`, `pvc`, noma'lum `kind`, `warnings`, shisha eshik, `__mid` bilan `.uhub`
  (generator `tools/sample-glb` dan, `mock/fixtures/uhub/`).

### 4. 1.5: `.uhub` faylidan ochish (10-bo'lim, to'liq)
- **Yuklagich `packages/viewer` ichida** (JS, ZIP o'qish). Ilova ham, brauzer viewer'i ham shuni ishlatadi.
- Xavfsizlik (10.3, ADR-020 D5):
  - fayl ≤ 50 MB, ≤ 2 000 yozuv, ochilgandagi jami hajm ≤ 200 MB, siqish nisbati chegarasi;
  - `..`, absolyut yo'l, disk harfi va `\` belgisi bo'lgan yozuvlar rad etiladi;
  - faqat `manifest.json` va `viewer/*` o'qiladi, har biri manifestdagi SHA-256 bilan tekshiriladi;
  - `project.json` va `documents/` **ochilmaydi**.
- Xabarlar:
  - `viewer/` papkasi yo'q → "Bu fayl ko'rish uchun tayyorlanmagan — U-HUB'da qayta eksport qiling";
  - `format` major versiyasi noma'lum → "Ilovani yangilang";
  - SHA-256 mos kelmasa → tushunarli rad xabari, ilova yiqilmaydi.
- Ilova:
  - "Fayldan ochish" tugmasi (hujjat tanlash, `expo-document-picker`).
  - Tizim "Ulashish / Ochish" orqali kelgan fayl. Android intent filtri va iOS UTI `uz.uhub.project` qo'yiladi,
    lekin Expo Go'da ishlamaydi. Hisobotda "dev build'da sinaladi" deb yoz. Expo Go'da asosiy yo'l hujjat tanlash.
  - Ochilgan fayl ilova xotirasiga nusxalanadi. Ro'yxat "Fayldan ochilganlar" server loyihalaridan alohida turadi va o'chiriladi.
    Bir xil `project_number` + `revision_id` qayta ochilsa, yangi nusxa yaratilmaydi, mavjudi almashtiriladi.
  - Fayl rejimida AR tugmasi "AR server ulanganda ishlaydi" deydi. Juftlash va server ro'yxati bu rejimda yo'q.
  - `approved` "Eksport paytida: tasdiqlangan / tasdiqlanmagan" deb ko'rsatiladi.
- **"Butun loyiha" ko'rinishi:** hamma buyumlar `transform` bo'yicha bitta sahnada joylashadi
  (`translation` metrda, `rotation` kvaternion `[x,y,z,w]`). Bitta buyum ko'rinishi ham saqlanadi.
  Butun loyihada ham detalni bosish, hotspot va ochilish zonalari ishlaydi.
- **QR → detal, oflayn (10.4)**, to'rt holat aynan kontraktdagi matnlar bilan:
  1. fayl yo'q → "Bu loyiha telefonda yo'q — faylini oching";
  2. `snapshot` mos → 6-bo'limning 4–7 qadamlari;
  3. `snapshot` mos emas, lekin `part_uid` fayldagi `parts` da bor → sariq banner + detal;
  4. `part_uid` yo'q → "Bu detal fayldagi reviziyada yo'q".
- **Brauzer viewer'i:** fayl tanlash va sudrab tashlash orqali ochish (DEMO-1 uchun statik sahifa rejimi).
- Testlar: yuklagich (to'g'ri fayl, buzilgan SHA, `..` yo'l, ZIP-bomba, `viewer/` yo'q, noma'lum `format`),
  `transform` qo'llanishi, QR'ning 4 holati, `project.json` o'qilmaganining isboti (yuklagich unga murojaat qilmaydi).

### 5. Haqiqiy fayl bilan avtomatik tekshiruv (UHUB_REAL_FILE berilganda)
- Fayl ochiladi: 2 buyum, uid'lar mos, kliplar nomi bo'yicha topiladi, har klip mavjud tugunni nishonga oladi.
- "Shkaf 600": `door__…__open`, 2 ta `drawer__…__open`, ichki tortma `reveal` = [eshik, tortma].
  "Shkaf 1200": 2 eshik, `hinge_side` left/right, `leaf` 1/2.
- Detal raqami, nomi va `size_mm` qiymatlari `D:\U-HUB-eksport\V-1a\cards.json` bilan solishtiriladi
  (`UHUB_REAL_CARDS` muhit o'zgaruvchisi). Farq bo'lsa, ro'yxati hisobotga yoziladi.

### 6. Gate
- Mavjud qadamlar o'zgarmaydi. Yangi testlar shu qadamlar ichida. Real-fayl testlari ixtiyoriy (skip ko'rinadi).

## Qabul mezonlari — kontrakt 10.5 (founder, Honor X9d, Expo Go)
Avval faylni telefonga yuborasiz (Telegram yoki kabel), keyin ilovada "Fayldan ochish".
1. `v-1a-namuna.uhub` ilovada va brauzer viewer'ida ochiladi. "Butun loyiha" ko'rinishida ikkala shkaf yonma-yon,
   U-HUB skrinshoti `01-butun-loyiha-yopiq.png` dagidek turadi.
2. Har eshik va tortma to'g'ri o'qda ochiladi. Ichki tortma ochilganda avval eshik ochiladi, yopilganda avval tortma yopiladi.
   Tortma ochiq turganda eshik yopilsa, tortma avval yopiladi (`02`, `03-*`, `04-all-open.png` bilan solishtiring).
3. Detal kartasidagi raqam, nom va o'lcham U-HUB (`05`, `06-*.png`) va GibLab bilan bir xil.
4. Haqiqiy etiketka QR'i fayldan aynan o'z detalini tanlaydi, ichki tortma tubi ham (avval eshik, keyin tortma ochiladi).
5. Buzilgan fayl (bitta GLB bayti o'zgartirilgan nusxa yoki `..` yo'lli ZIP) rad etiladi, tushunarli xabar chiqadi, ilova yiqilmaydi.
6. Gate o'tadi. `main` push qilingan va repoda `.uhub` fayl yo'q.

## Bu batchda YO'Q
VR rejimi, fayldan AR, M-A6 (assets), iOS dev build.

## Architect uchun savollar (hisobotga, TODO(contract))
1. `snapshot = "joriy"`: hamma etiketkada bir xil qiymat. Reviziya o'zgarsa ham eski etiketka "mos" deb ochiladi
   va 10.4 ning 3-holati (sariq banner) hech qachon ishlamaydi. Snapshot har eksport yoki reviziya uchun
   o'zgarmas identifikator bo'lishi kerakmi?
2. Kontrakt 1-bo'limidagi palitra (`yellow #F2C14E`, `green #4CC38A`) Brand Kit tokenlaridan farq qiladi
   (warning `#E9B45F`, success `#67C99A`). Kontrakt brending natijasi bilan yangilanadimi?

## Hisobot → `docs/reports/M-A7-report.md` (commit) + chatda qisqa (o'zbekcha, ~20 qator)
Bajarilgan va bajarilmagan qismlar; haqiqiy fayl natijalari (5-qism va `cards.json` solishtiruvi); telefonda tekshirish
qadamlari; gate, merge hash va push; `TODO(contract)` ro'yxati.
