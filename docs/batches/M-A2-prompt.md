# Batch M-A2 — kontrakt 1.2 ga moslash, QR skaner, oflayn kesh (A-1 ni yopadi)

## Kontekst
- Repo: `D:\Yashnarbek\HUB-Mobile`, `main` = `9f7b4f0` (M-A0, M-A1, config tuzatishi).
- Kontrakt: agar `docs/contract/uhub-mobile-1.2.md` bo'lsa — **u manba**. Bo'lmasa — `uhub-mobile-1.2-draft.md`
  (qoralama). Qoralamadagi `[TASDIQ]` qiymatlarini ishlat, lekin har birini `// TODO(contract-1.2)` bilan belgila;
  `[OCHIQ]` lar uchun M-A0/M-A1 dagi mock qiymatlari qoladi. Hisobotda qaysi fayl bo'yicha ishlaganingni yoz.
- Oldingi hisobotlar: `docs/reports/M-A0-report.md`, `M-A1-report.md`. ADR: M001, M002 (B yo'li oflayn kesh uchun).
- Ekran maketlari (founder tasdiqlagan): skaner — qorong'i kamera, markazda accent ramka (burchaklar), yuqorida yopish +
  "Etiketkani skanerlash" + chiroq tugmasi, ostida yo'riqnoma matni, pastki panelda "Oxirgi skanerlar" (№ DM Mono'da,
  nom, `№ loyiha · buyum · R`). Tanlov holati — 3D ekranda: shaffof model, tanlangan detal accent kontur, yuqorida
  sariq banner (eski reviziya) va "R5 ni ochish", pastda karta: katta № + nom, joylashuvi ("2-tortma ichida"),
  "Hammasini ko'rsatish" (och tugma) va "Keyingisi" (skaner ikonkasi).

## Ish tartibi
- Branch `batch/m-a2`, har qism — bitta commit, oxirida `main` ga o'zing merge qil.
- Brauzer tekshiruvi, skrinshot, ataylab xato sinovi yo'q.
- Oxirida `scripts/check-mobile.ps1 -Quiet` bir marta; faqat xatolarni tuzat, bir marta qayta.
- Remote (`origin`) mavjud bo'lsa — merge'dan keyin `git push`. Bo'lmasa hisobotda eslat.
- Faqat Expo Go'dagi modullar (`expo-camera`, `expo-haptics`, `expo-file-system`, `@react-native-async-storage/async-storage`).
- Bilmagan qiymatni taxmin qilma — `TODO(contract)` + hisobotda savol.

## Qismlar

### 0. Kontrakt 1.2 ga moslash (generator, viewer, mock)
- **Generator:** `asset.extras.uhub` dan `approved` olib tashlanadi, `revision_label` ("R3"/"R5") qo'shiladi; `contract: "1.2"`;
  eshik tugunida `extras.uhub.door`; har tortmada `slide__drawer__<id>__mid` tugun va o'sha klipda yurishning yarmi;
  fixture'ga **bitta ruxsat etilmagan belgili uid** (masalan `A1/B2.c`) — tugun nomi `part__x<base32 kichik, '=' siz>`.
  Klip burchak/yurishi `extras.uhub.door.open_deg` va bitta konstantadan; `extras.uhub.prototype = true`.
  Testlar: base32 kodlash/dekodlash, `__mid` yarim yurish, `approved` yo'qligi, `gltf-validator` 0 error.
- **Viewer:** detal **`extras.uhub.uid` bo'yicha** topiladi (nom bo'yicha qidiruv olib tashlanadi); raycast ham uid'ga
  keltiriladi. `progress {loaded, total}` xabari (fetch/XHR yuklanishi) — ilova foiz ko'rsatishi uchun.
  `select` da `reveal` ketma-ket (mavjud bo'lsa — test bilan tasdiqla).
- **Mock:** xatolar `{error, message}`; boshqa kompaniya — hamma joyda 404 `not_found` (resolve ham);
  `projects/{id}` items va `resolve` da `revision_label`, `latest_revision_label`, `part_in_latest`;
  `POST /mobile/ar-link` → `{url, expires_at}` (10 daqiqa, imzo HMAC `MOCK_SIGN_SECRET` bilan, imzolangan URL
  `Bearer`siz ishlaydi, muddati o'tgani 404). Testlar har o'zgarish uchun.
- **Ilova:** `approved` faqat API'dan; R-belgi `revision_label` dan (M-A1 dagi `revision_id → "R5"` TODO yopiladi);
  `ApiError` `{error, message}` ni o'qiydi.

### 1. QR skaner ekrani
- `expo-camera` `CameraView` + `barcodeScannerSettings: {barcodeTypes: ["qr"]}`; ruxsat so'rash va rad etilganda
  tushuntirish + "Sozlamalarni ochish".
- Maket bo'yicha UI; chiroq (`enableTorch`) tugmasi; bitta kodni qayta-qayta o'qimaslik (debounce, bir xil matn 2 s).
- `uhub:` bilan boshlanmasa — xato haptic + "Bu U-HUB etiketkasi emas" (ekranda qoladi, skaner davom etadi).
- To'g'ri QR — muvaffaqiyat haptic → `resolve` → 3D ekranga tanlov bilan o'tish.
- Loyihalar ekranidagi "Skaner" tugmasi yoqiladi.
- "Oxirgi skanerlar": oxirgi 10 ta (`resolve` natijasi + vaqt), AsyncStorage; bosilsa o'sha tanlovga o'tadi.

### 2. 3D ekranda tanlov holati (kontrakt 6-bo'lim)
- `select {uid}` → viewer javobi bo'yicha karta. `is_latest=false` → sariq banner "Etiketka eski reviziyadan (R3).
  Hozirgisi: R5" + "R5 ni ochish" (latest reviziyani ochadi va o'sha uid'ni qayta tanlaydi; `part_in_latest=false` bo'lsa
  tanlashga urinmaydi va bannerda "Bu detal hozirgi reviziyada yo'q").
- "Hammasini ko'rsatish" → `showAll`; "Keyingisi" → skaner. Ketma-ket skanerlashda o'sha buyum (`item_id`+`revision_id`)
  bo'lsa model qayta yuklanmaydi — faqat `select`.
- `part_not_found` → "Detal modelda topilmadi", model ochiq qoladi.
- Yuklanish foizi `progress` xabaridan (M-A1 dagi "faqat spinner" yopiladi).

### 3. Oflayn kesh (ADR-M002, B yo'li)
- Siyosat: ochilgan va skanerlangan har reviziya keshga yuklanadi (`documentDirectory/cache/<revision_id>.glb`).
  Ochishda: keshda bo'lsa — B, aks holda — A va fonda keshga yuklash.
- Chegaralar: oxirgi **20 reviziya** yoki **500 MB**, LRU bo'yicha tozalash. Ikkalasi `config.ts` da bitta joyda —
  founder sozlamasi (kontraktda yo'q), hisobotda shunday deb yoz.
- Loyiha/buyumlar ro'yxatlari oxirgi javobi AsyncStorage'da; oflaynda shu ko'rsatiladi + "Oflayn" belgisi.
- Oflaynda QR: `resolve` mumkin emas → QR matnidagi `<project_number>/<part_uid>/<snapshot>` bo'yicha keshlangan
  `resolve` natijalarida qidiriladi; topilmasa — "Oflayn: bu etiketka keshda yo'q".
- Buyumlar ro'yxatida "Oflayn mavjud" belgisi yoki hajm (MB). Sozlamalarda "Keshni tozalash" va band hajm.
- Testlar: LRU tozalash, kesh kaliti, oflayn resolve qidiruvi.

### 4. Gate
- Mavjud qadamlar o'zgarmaydi; yangi testlar shu qadamlar ichida. Hech qanday qadam olib tashlanmaydi.

## Qabul mezonlari (founder telefonda, Honor X9d, Expo Go)
1. Gate o'tadi; M-A0/M-A1 testlari buzilmagan.
2. Ekrandagi (`/dev/qr`) etiketkani skanerlash → tebranish → 3D'da aynan o'sha detal: eshik orqasidagi polka (eshik ochiladi),
   tortma tubi (tortma chiqadi, `__mid` yarmida), tashqi detal (klip yo'q).
3. R3 etiketkasi → sariq banner, "R5 ni ochish" ishlaydi; R5 da o'chirilgan detal (`m0p22`) → "hozirgi reviziyada yo'q".
4. Ruxsat etilmagan belgili uid'li detal skanerlansa ham topiladi.
5. Begona QR (oddiy URL) → xato tebranishi + xabar, ilova qulamaydi.
6. Buyumni bir marta ochib, Wi-Fi o'chirilgach: ro'yxatlar, 3D va shu buyum etiketkalari oflayn ishlaydi.
7. Oxirgi skanerlar ro'yxati ilova qayta ochilganda saqlangan.

## Bu batchda YO'Q
AR va `ar-link` dan ilovada foydalanish (A-2; mock'da endpoint bor), iOS build, exploded ko'rinish.

## Hisobot (o'zbekcha, ~20 qator) → `docs/reports/M-A2-report.md` ham commit qilinsin
Bajarilgan / bajarilmagan; qaysi kontrakt fayli bo'yicha ishlangan; telefonda tekshirish qadamlari; gate natijasi,
merge hash, push holati; viewer o'zgarishlari; kontraktdan chetga chiqishlar; `TODO(contract)` va `TODO(contract-1.2)` ro'yxati.
