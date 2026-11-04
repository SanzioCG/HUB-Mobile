# M-A7 hisoboti (A-1u) — kontrakt 1.6: `.uhub` faylidan ochish, ichki tortma tartibi, haqiqiy V-1a fayli

- Sana: 2026-11-04 · Branch: `batch/m-a7` → `main`, merge **`ce28298`**
- Kontrakt: `docs/contract/uhub-mobile-1.6.md` (founder nusxasi, o'zgarishsiz commit qilindi), integratsiya hujjati yangilangan.
- Shart: M-A5 merge qilingan bo'lishi kerak edi — M-A5 shu sessiyada yakunlandi (gate, merge `8b2b517`, push, hisobot `3801e9f`).
- Gate (`scripts/check-mobile.ps1 -Quiet`): birinchi ishga tushirishda o'tdi.
- Push: `git push origin main` (pastda). Repoda `.uhub` faqat sintetik `mock/fixtures/uhub/namuna.uhub`.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 0. Kontrakt | `f7ed14a` | 1.6 va integratsiya hujjati; `VIEWER_CONTRACT` / `CONTRACT_VERSION` = 1.6; viewer 1.x ning hammasini qabul qiladi (V-1a fayli "1.5") |
| 1. 1.4 deltasi | `ebff1c3` | `ar-link` `{item_id, revision_id}` → `{launch_url, glb_url, usdz_url, expires_at}`, ilova `launch_url` ni tizim brauzerida ochadi (iOS — `usdz` bo'lsa); `resolve.usdz_url`; `400 pair_code_invalid`; `thickness_mm: null` → "—"; base32 misoli `A/1` → `part__xiextc`; `VIEWER_VERSION` 0.5.0 |
| 2. Ichki tortma (2.2) | `07e5693` | `RevealIndex`: tortma ochilishi — `reveal` tartibida (avval eshik), yopilishi teskari; eshikni yopishdan oldin ortidagi ochiq tortmalar; "Hammasini ochish/yopish" bosqichlab. Karta, ilova tugmalari, AR overlay — hammasi shu orqali. Yangi `clipState` xabari (tugmalar holati viewer'dan). Klipni yolg'iz ijro etish — faqat dev sahifasi |
| 3. Materiallar va fixture | `3d48536` | `lmdf`, `pvc`, noma'lum `kind` (xato emas); sintetik `.uhub`: shisha eshik, LMDF + PVX kromka, noma'lum `kind`, `__mid`, `warnings`; `.gitignore`: `*.uhub` (sintetik fixture istisno) |
| 4. `.uhub` dan ochish | `d161418` | Yuklagich `packages/viewer/src/uhub.ts` (ilova va brauzer uchun bitta, sof JS); "Butun loyiha" (`transform`); brauzer: tanlash va sudrab tashlash; ilova: "Fayldan ochilganlar", "Fayldan ochish", loyiha sahifasi, 3D, QR → detal (4 holat), AR → "AR server ulanganda ishlaydi"; intent filtri va iOS UTI |
| 5. Haqiqiy fayl | `4c669c8` | `real-uhub.test.ts` — `UHUB_REAL_FILE`/`UHUB_REAL_CARDS` bilan 7 test |
| 6. Gate | (merge ichida) | Qadamlar o'zgarmadi; gate'da `skip  haqiqiy .uhub testlari (UHUB_REAL_FILE berilmagan)` qatori; viewer reliz `releases/viewer/0.5.0` (`contract: "1.6"`) |

Testlar: viewer 111 (+ 7 real-fayl, ixtiyoriy), mock 46, generator 43, mobil Jest 63. Viewer bundle 709 KiB
(M-A5: 685 KiB; +fflate, +@noble/hashes, +fayl sahifasi).

### Xavfsizlik (10.3) — qanday
- Avval faqat ZIP markaziy katalogi o'qiladi (hech narsa ochilmaydi): hajm ≤ 50 MB, ≤ 2 000 yozuv, jami ≤ 200 MB,
  1 MB dan katta yozuvda siqish nisbati ≤ 100; birorta yozuvda `..`, absolyut yo'l, disk harfi yoki `\` bo'lsa — butun fayl rad.
- Keyin filtr faqat `manifest.json` va `viewer/*` ni ochadi; har biri manifest SHA-256 bilan solishtiriladi.
- `project.json` va `documents/` hech qachon ochilmaydi — isbot testi: ularning siqilgan ma'lumoti buzilgan faylda ham yuklagich ishlaydi.
- Telefonga faqat tekshirilgan `viewer/*` yoziladi (`documentDirectory/uhub/<id>/`); asl `.uhub` va mijoz ma'lumoti saqlanmaydi.

### Qarorlar (meniki)
- Loyiha rejimida klip nomlari `<item_key>::door__…__open` — ikki shkafdagi bir xil nomlar to'qnashmasin; bitta buyumda nomlar o'zgarmaydi.
- Brauzer viewer'i parametrsiz ochilsa — fayl sahifasi (DEMO-1); eski dev sinov sahifasi `?dev` yoki `?glb=…` bilan.
- Juftlangan holatda skaner avval serverdan so'raydi, topilmasa (yoki oflayn) — telefondagi fayldan.
- Fayl rejimi skaneri: juftlanmagan holatda etiketka fayldan (avval "Avval ulang" chiqardi).
- Ilova `id` = `p<project_number>-<revision_id lar sha256 boshi>` — bir xil loyiha va reviziyalar qayta ochilsa almashtiriladi.

## Haqiqiy fayl natijalari (5-qism)

`UHUB_REAL_FILE=D:\U-HUB-eksport\V-1a\v-1a-namuna.uhub`, `UHUB_REAL_CARDS=D:\U-HUB-eksport\V-1a\cards.json` — **7/7 o'tdi**:

- Fayl ochildi: SHA-256 hammasi mos, kengaytmalar yo'q, kontrakt "1.5", loyiha № 64, 2 buyum.
- uid'lar `index.json` `parts` bilan mos ("Shkaf 600" — 15, "Shkaf 1200" — 9); har klip mavjud tugunni nishonga oladi.
- "Shkaf 600" R14: 1 `door__…__open`, 2 `drawer__…__open`; "Tortma fasadi 2" `reveal` = [eshik, tortma];
  "Tortma fasadi 1" eshikka tegmaydi. Ijroda ichki tortma eshik tugaguncha qimirlamaydi.
- "Shkaf 1200" R10: 2 eshik, `hinge_side` left/right, `leaf` 1/2, `leaves` 2.
- **`cards.json` solishtiruvi: farq yo'q** — 24 detalning raqami, nomi va `size_mm` GLB bilan bir xil.

Gate'da o'zgaruvchi berilmasa testlar skip bo'ladi va bu ko'rinadi. To'liq tekshirish:
```powershell
$env:UHUB_REAL_FILE='D:\U-HUB-eksport\V-1a\v-1a-namuna.uhub'; $env:UHUB_REAL_CARDS='D:\U-HUB-eksport\V-1a\cards.json'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-mobile.ps1 -Quiet
```

## Telefonda tekshirish (Honor X9d, Expo Go; fayl rejimi uchun server shart emas)

1. `cd apps/mobile && npx expo start -c` → Expo Go.
2. `v-1a-namuna.uhub` ni telefonga yuboring (Telegram yoki kabel).
3. Ilovada: juftlash ekranida **"Fayldan ochish (serversiz)"** yoki Loyihalar sarlavhasidagi papka ikonkasi → **"Fayldan ochish"** → faylni tanlang.
4. Loyiha sahifasi: "Butun loyiha" → ikkala shkaf yonma-yon (`01-butun-loyiha-yopiq.png` bilan solishtiring).
   Har buyumda "Eksport paytida: tasdiqlanmagan".
5. "Shkaf 600": "Tortma fasadi 2" ni bosing → kartadagi tugma: avval eshik, keyin tortma ochiladi; yopishda avval tortma.
   Tortma ochiq turganda eshik detalini bosib yopsangiz — avval tortma yopiladi (`02`, `03-*`, `04-all-open.png`).
6. Detal kartasi: raqam, nom, o'lcham (`05`, `06-*.png` va GibLab bilan).
7. Haqiqiy etiketka QR'i (juftlanmagan holatda skaner) → fayldagi aynan o'sha detal, ichki tortma tubi ham.
8. Buzilgan fayllar (rad etilishi va xabar chiqishi kerak, ilova yiqilmasligi kerak):
   `C:\Users\user\AppData\Local\Temp\claude\fd46ec9a77733ac9\e8f518f2-8d59-4630-8343-b9bc3ae28887\scratchpad\buzilgan-sha.uhub` (bitta GLB bayti o'zgargan)
   va `…\scratchpad\buzilgan-yol.uhub` (`..` yo'lli yozuv).
9. Sintetik fayl: `mock/fixtures/uhub/namuna.uhub` — shisha eshik, `lmdf`/`pvc`/noma'lum `kind`, sariq "Eksport ogohlantirishlari".
   U loyiha № 51 — mock `/dev/qr` etiketkalari bilan QR → fayl holatlarini sinash mumkin (s5 — mos, s3 — "Namuna B").
10. Brauzer viewer'i: `npm run viewer` → `http://localhost:5173` → faylni tashlang.

| O'lchov (Honor X9d) | Qiymat |
|---|---|
| `v-1a-namuna.uhub` ochilish vaqti (tanlashdan loyiha sahifasigacha) | |
| "Butun loyiha" 3D ochilish vaqti | |

## Bajarilmagan / cheklovlar
- Tizim "Ulashish / Ochish" orqali kelgan faylni qabul qilish: `app.config.ts` da Android intent filtri va iOS UTI
  `uz.uhub.project` qo'yildi, lekin Expo Go ularni ishlatmaydi — **dev build'da sinaladi**; kelgan URL'ni
  `importUhub` ga ulash ham dev build bilan qilinadi. Expo Go'da asosiy yo'l — hujjat tanlash.
- Sintetik fixture'ning ikki buyumi bir xil M-0 uid'larini ishlatadi — "Butun loyiha"da uid bo'yicha tanlash birinchi buyumni topadi
  (haqiqiy faylda uid'lar noyob). Faqat fixture cheklovi.
- SHA-256 Hermes'da (sof JS) — katta fayl (50 MB) vaqti o'lchanmagan (jadvalga).
- iOS — sinalmagan.

## TODO(contract) — architect uchun savollar
1. **`snapshot = "joriy"`** — hamma etiketkada bir xil. Reviziya o'zgarsa ham eski etiketka "mos" deb ochiladi, 10.4 ning
   3-holati (sariq banner) hech qachon ishlamaydi. Snapshot har eksport yoki reviziya uchun o'zgarmas identifikator bo'lishi kerakmi?
2. **Palitra:** kontrakt 1-bo'limidagi `yellow #F2C14E`, `green #4CC38A` Brand Kit tokenlaridan farq qiladi
   (warning `#E9B45F`, success `#67C99A`). Kontrakt brending natijasi bilan yangilanadimi?
3. **AR sahifasi (3-bo'lim):** kontraktda — `<model-viewer>` + animatsiyasiz AR GLB (statik). Founder qarori (M-A5) —
   viewer'ning AR rejimi, asosiy GLB kliplar bilan (AR ichida eshik/tortma). Mock `launch_url` ikkinchisini beradi; ilova faqat
   `launch_url` ni ochadi. Kontrakt 3-bo'limi interaktiv AR bilan yangilanadimi?
4. **`__mid` joyi (2.1):** daraxtda `slide__drawer__<id>__mid` `slide__drawer__<id>` bilan yonma-yon; sample-glb'da u slide'ning bolasi
   (dunyoda baribir yarim yurish). Ikkala variant ham to'g'ri ishlaydi — kontrakt qaysi birini talab qiladi?
5. **AR varianti fayl nomi:** kontraktda `<revision_id>.ar.glb`, mock'da `<revision_id>-ar.glb` (URL shaffof — farq ilovaga ta'sir qilmaydi).
6. **uid noyobligi:** `uid` loyiha bo'ylab noyobmi (QR `uhub:p/<project>/<uid>/…` — buyumsiz)? Haqiqiy faylda noyob.
