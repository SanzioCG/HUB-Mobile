# Batch M-A4 — kontrakt 1.3, materiallar, juftlash QR'i, yangi dizayn

## 0. Avval holatni tekshir (kod yozishdan oldin)
- `git status`, `git log --oneline -15`, `git branch -a`. Ishchi papka toza bo'lmasa — to'xta va hisobot ber.
- **M-A3 (AR) holati:**
  - `batch/m-a3` merge qilingan bo'lsa — shu `main` dan boshla.
  - `batch/m-a3` boshlangan, lekin merge qilinmagan bo'lsa — **to'xta**, nima qilinganini yoz, founder qaror qiladi.
  - M-A3 boshlanmagan bo'lsa — **avval M-A4** (shu batch). M-A3 keyin, 1.3 dagi yangi generator ustiga quriladi;
    `docs/batches/M-A3-prompt.md` ga tegma.

## Manbalar (ziddiyat bo'lsa yuqoridagi ustun)
1. `docs/contract/uhub-mobile-1.3.md` — kontrakt (U-HUB'dagi `docs/mobile/VIEWER-CONTRACT.md` nusxasi).
2. `docs/contract/HUB-MOBILE-INTEGRATION.md` — U-HUB architect'ning "qanday ishlaydi" hujjati (renderer, mock talablari).
3. Founder qarorlari (2026-11-03), kontraktdan ustun bo'lgan joylar:
   - **Repo:** viewer **HUB-Mobile'da qoladi** (ADR-M001). Kontrakt 1-bo'lim (`monorepo`) va 8-bo'lim
     ("U-HUB build viewer'ni yasaydi") shu qarorga mos emas — 6-qismdagi taklif bilan architect'ga yuboriladi.
     Kontraktdagi `mobile/`, `mobile/mock/` yo'llari — bizda `apps/mobile/`, `mock/`.
   - **Palitra:** kontraktdagi `#111214 / #191A1D` emas, **yangi dizayn palitrasi** (pastda). Kontrakt 1-bo'limini
     yangilash taklifi ham 6-qismda.
4. `docs/design/mobile-design-concept.png` — yangi dizayn (ekranlar, palitra, tipografiya). Rasmni o'zing ko'rib chiq.
5. Oldingi hisobotlar `docs/reports/`, ADR'lar `docs/adr/`.

## Ish tartibi
- Branch `batch/m-a4`, har qism — bitta commit, oxirida `main` ga o'zing merge qil.
- Brauzer tekshiruvi, skrinshot, ataylab xato sinovi yo'q.
- Oxirida `scripts/check-mobile.ps1 -Quiet` bir marta; faqat xatolarni tuzat, bir marta qayta.
- GitHub remote yo'q — push qilinmaydi.
- Faqat Expo Go'dagi modullar. Windows firewall va tizim sozlamalariga tegma (founder qiladi).
- Bilmagan qiymatni taxmin qilma — `TODO(contract)` + hisobotda savol. Faqat UI matnlari va dizayn tafsilotlari uchun
  o'zing qaror qilishing mumkin — hisobotda ro'yxat qil.

## Qismlar

### 1. Hujjatlar
- Commit: `docs/contract/uhub-mobile-1.3.md`, `docs/contract/HUB-MOBILE-INTEGRATION.md`, `docs/design/mobile-design-concept.png`
  (founder qo'ygan, hali commit qilinmagan). `uhub-mobile-1.2-draft.md` — o'chirilmaydi, boshiga "1.3 bilan almashtirildi" qatori.
- ADR-M001 ga qo'shimcha: "2026-11-03, founder: viewer HUB-Mobile'da qoladi, U-HUB versiyalangan artefaktni oladi".

### 2. Namunaviy GLB generatori → 1.3
- `asset.extras.uhub.contract = "1.3"`; `approved` yo'q; `revision_label`.
- **Nom kodlash (2.1):** uid `^[a-z0-9-]+(_[a-z0-9-]+)*$` ga mos va `__` siz → `part__<uid>`, aks holda
  `part__x<base32 kichik, '=' siz>`; `item_id`, eshik/tortma `<id>` ga ham. Test: kontraktdagi misol `A/1` → `part__xifxte`.
- **Eshik:** `extras.uhub.door = {hinge_side, open_angle_deg, leaf, leaves}` — `pivot__door__<id>` **tugunida**.
- **Tortma:** `slide__drawer__<id>__mid` — o'sha klipda yurishning yarmi.
- `size_mm` = `[L, W, T]`; `edges` har doim 4 kalit `L1 L2 W1 W2`, qiymat matn yoki `null`; `article` `null` bo'la oladi;
  `material` matnidagi qalinlik `size_mm[2]` bilan mos (test).
- **Materiallar (2.5 + integratsiya hujjati 5.1):**
  - Har panel — bir nechta primitive: yuzalar (TOP/BOTTOM) va 4 qirra (L1, L2, W1, W2); kromkasiz qirra — plita materiali.
  - Bir xil material bir marta, nomi `mat__<material_id>`; tekstura bir marta (bufferView, JPEG, sRGB, ≤ 1024 px).
  - Kamida: LDSP tekstura bilan (protsedural yog'och tolasi, `jpeg-js` yoki shunga o'xshash sof JS kutubxona bilan
    yasaladi), bo'yalgan MDF (`baseColorFactor`, roughness 0.8), ABS kromka, metall furnitura (metallic 1, roughness 0.4),
    **bitta shisha detal** (`alphaMode: BLEND`, alpha 0.3).
  - Tola: U o'qi = tola; 1 UV birligi = `tile_mm`; **bitta detalda tola 90° burilgan** (UV tekshiruvi uchun).
  - Material `extras.uhub = {id, code, supplier, name, kind, thickness_mm}`.
  - Faqat glTF core: kengaytmalar yo'q (test: `extensionsUsed` bo'sh).
- **Og'ir namuna** `m0-heavy.glb`: chegara yaqinida (~14 MB, ≤ 150 000 uchburchak, 1024 px teksturalar) — telefonda
  ochilish vaqti, FPS va xotirani o'lchash uchun (integratsiya hujjati 5.5).
- M-A3 (AR) qilingan bo'lsa — `-ar.glb` varianti ham yangi materiallar bilan chiqadi.
- `gltf-validator`: hamma GLB'da 0 error.

### 3. Mock → 1.3
- `status` ∈ `draft|validated|approved`; noma'lum → ilovada `draft`.
- `pair` → `{device_token, user:{id,name,role}, company:{id,name}}`; noto'g'ri kod 401, muddati o'tgan/ishlatilgan kod
  `410 pair_code_expired`, 1 daqiqada 5 tadan ko'p urinish `429 rate_limited`.
- `DELETE /mobile/device` → 204 (takroran ham 204), keyin token → `401 token_revoked`.
- `projects/{id}` items: `size_mm` obyekt `{width,height,depth}`, `approved`, `revision_label`, `export_status`;
  fixture'da bitta buyum `pending` va bitta `failed` (`glb_url: null`). `thumb_url`/`usdz_url` `null` bo'la oladi.
- `resolve`: `approved`; `latest_*` **doim** to'ldiriladi; `400 bad_qr`; `404 not_found` (boshqa kompaniya ham).
- Barcha xatolar `{error, message}` (o'zbekcha `message`).
- **Juftlash QR'i (4.1):** mock ishga tushganda `uhub-pair:1?server=<URL-kodlangan LAN manzil>&code=123456` QR PNG'si
  (`mock/fixtures/qr/pair.png`) va `/dev/qr` sahifasida ko'rsatiladi.
- Har o'zgarish uchun test.

### 4. Viewer
- **Renderer (integratsiya 4):** `outputColorSpace = SRGBColorSpace`, `NeutralToneMapping`, ekspozitsiya 1.0,
  `RoomEnvironment` (PMREM) + bitta yo'naltirilgan yorug'lik soya bilan. Tekstura `repeat`/`rotation` ga tegilmaydi.
- **Tanlov shaffofligi:** detallarning materiallari **nusxa** qilinib shaffof qilinadi; asl material hech qachon
  o'zgartirilmaydi (bir material ko'p detalda). `showAll` asl materiallarni qaytaradi. Test: tanlovdan keyin
  tanlanmagan detal bilan bir material ishlatgan tanlangan detal shaffof bo'lmaydi.
- Kontur butun `part__` tuguniga (primitive'lar emas). Shisha BLEND to'g'ri tartibda.
- Detal `extras.uhub.uid` bo'yicha; eshik ma'lumoti `pivot__door` tugunidan.
- `VIEWER_VERSION` (semver) va qo'llaydigan kontrakt versiyasi bundle ichida; GLB `contract` major'i mos kelmasa —
  `error {code:"contract_mismatch"}`.
- **8-bo'lim:** `<script id="uhub-config" type="application/json">` bo'lsa viewer undan ishga tushadi (`mode:"share"`),
  bo'lmasa `postMessage` dan. Test ikkalasi uchun.
- Dizayndagi o'ng vertikal panel uchun bridge buyruqlari: `setView {front|side|top|iso}`,
  `setGroupVisible {group: carcass|fronts|hardware, on}`, `fit`.
- Dev uchun `stats {load_ms, fps, triangles, textures_mb}` xabari (`renderer.info` asosida).

### 5. Ilova
- **Palitra va tipografiya** (`theme.ts`, dizayn rasmi bo'yicha):
  | Token | Qiymat | Ishlatilishi |
  |---|---|---|
  | `accent` | `#3988FF` | asosiy tugmalar, faol holat, tanlov konturi |
  | `accentSecondary` | `#6A5CFF` | faqat brend elementlari (logo, splash, onboarding) |
  | `accentTertiary` | `#00C2FF` | faqat brend elementlari |
  | `bg` | `#0B0D0F` | fon (rasmda "#0B0DDF" — xato yozuv, rang qorong'i fon) |
  | `panel` | `#15181C` | panellar, kartalar |
  | `surface` | `#22262B` | ichki elementlar, inputlar |
  | `border` | `#333A41` | ajratuvchilar |
  | `text` | `#F3F5F6` | asosiy matn |
  Holat nuqtalari (sariq/yashil) va ikkinchi matn rangi — rasmdan, WCAG AA (4.5:1) kontrast bilan; tanlaganlaringni
  hisobotda yoz. Inter (400–700) va DM Mono (400, 500) — `@expo-google-fonts/*`, raqamlar va o'lchamlar DM Mono'da.
- **Navigatsiya (rasm bo'yicha):** pastki tab bar — Loyihalar / **Skaner** (markazda, katta, accent) / Offline / Sozlamalar.
  Skaner rasmda yo'q — founder tasdiqlagan oqimdan (sexning asosiy amali). Qo'ng'iroqcha (bildirishnomalar) — **qo'shilmaydi**
  (kontraktda yo'q).
- **Statuslar:** filtr Hammasi / Tasdiqlangan (`approved`) / Tasdiqlanmagan (`draft`+`validated`). Belgilar:
  `approved` yashil "Tasdiqlangan", `validated` "Tekshirilgan", `draft` sariq "Qoralama". "Sexda" olib tashlanadi.
- **Buyum holatlari:** `export_status: pending` → "Model tayyorlanmoqda" (ochilmaydi), `failed` → "Model yaratilmadi".
- **3D ekran (rasmdagi 3- va 4-ekran):** yuqorida segment Solid / Qirralar / X-ray; o'ngda vertikal panel —
  Ko'rinishlar (`setView`), Qatlamlar (`setGroupVisible`), Sig'dirish (`fit`), "…" (reviziya ma'lumoti: R, holat, sana);
  pastki panel — Hammasini ochish / O'lchamlar / AR / Tiklash (AR — M-A3 holatiga ko'ra). `approved=false` → sariq
  nuqta "Tasdiqlanmagan · R…". Detal kartasida material `extras.uhub` (kod, ishlab chiqaruvchi, tur, qalinlik) va
  4 qirra (`L1 L2 W1 W2`, `null` → "kromkasiz").
- **Juftlash (4.1):** "QR bilan ulash" (asosiy) — skaner `uhub-pair:` ni taniydi → `server` + `code` → pair; "Qo'lda"
  — server manzili + 6 raqam. Server va token `expo-secure-store` da; bir vaqtda bitta server.
  Skaner prefikslarni ajratadi: `uhub:` — etiketka, `uhub-pair:` — juftlash (juftlangan holatda: "Boshqa serverga
  ulanasizmi?" tasdig'i), boshqa — "Bu U-HUB etiketkasi emas".
- **Xato kodlari** (kontrakt 4): `bad_qr` "Etiketka o'qilmadi", `not_found` "Bu detal topilmadi", `token_revoked` →
  juftlashga, `pair_code_expired`, `rate_limited` — alohida xabarlar; mantiq faqat `error` kodiga, matn `message` dan.
- **Offline tab:** keshlangan buyumlar (nom, R, hajm MB), bittasini o'chirish, hammasini tozalash, band hajm.
- **Sozlamalar tab:** server manzili, foydalanuvchi va kompaniya (`role` bilan), "Qurilmani uzish" (`DELETE /mobile/device`),
  versiyalar (ilova, `VIEWER_VERSION`, kontrakt).
- Ilova ikonkasi — **qilinmaydi** (founder alohida fayl beradi); hozirgi joyida qoladi.

### 6. Architect uchun taklif (kod emas)
- `docs/contract/proposals/1.4-proposal.md`:
  1. 1-bo'lim: repo — `HUB-Mobile` alohida (ADR-M001); yo'llar `apps/mobile/`, `mock/`.
  2. 1-bo'lim: palitra — yangi tokenlar (5-qism jadvali).
  3. 8-bo'lim: viewer HUB-Mobile'da build qilinadi; artefakt `releases/viewer/<VIEWER_VERSION>/index.html` +
     `manifest.json {viewer_version, contract, sha256}`; U-HUB `check.ps1` pin qilingan versiyani nusxalaydi
     (`backend/app/static/viewer/`), sha256 ni tekshiradi.
  4. 3-bo'lim: Scene Viewer bir nechta animatsiyali GLB'da faqat birinchisini o'ynatadi va validator xato beradi →
     `ar-link format:"glb"` animatsiyasiz AR variantini qaytarsin (manba: Google ARCore Scene Viewer hujjati).
- Releases papkasi va `npm run release:viewer` skripti (manifest + sha256) — shu qismda.

### 7. Gate
- Mavjud qadamlar o'zgarmaydi; yangi testlar ichida; GLB qadami `m0-heavy.glb` va `extensionsUsed` tekshiruvini qo'shadi.

## Qabul mezonlari (founder, Honor X9d, Expo Go, LAN yoki hotspot)
1. Gate o'tadi; oldingi testlar buzilmagan.
2. `/dev/qr` dagi juftlash QR'i skanerlanadi → server avtomatik saqlanadi → loyihalar ochiladi (IP qo'lda kiritilmaydi).
3. 3D'da LDSP teksturasi, bo'yalgan MDF, metall furnitura va shisha ko'rinadi; 90° burilgan tola ko'zga ko'rinadi.
4. QR tanlov: tanlangan detal shaffof bo'lmaydi, qolganlari shaffof; "Hammasini ko'rsatish"dan keyin ranglar asl holida.
5. `pending`/`failed` buyumlar ochilmaydi va to'g'ri yozuv bilan ko'rinadi.
6. "Qurilmani uzish" → juftlash ekrani; eski token bilan so'rov `token_revoked`.
7. Ranglar, shriftlar va tab bar dizayn rasmiga mos.
8. `m0-heavy.glb`: hisobotdagi jadvalga founder ochilish vaqti, FPS va xotirani yozadi.

## Bu batchda YO'Q
AR (M-A3), ilova ikonkasi, bildirishnomalar, haqiqiy U-HUB `/mobile` (V-1 hali yo'q), iOS build.

## Hisobot → `docs/reports/M-A4-report.md` (commit) + chatda qisqa (o'zbekcha, ~20 qator)
0-qism natijasi (M-A3 holati); bajarilgan / bajarilmagan; telefonda tekshirish qadamlari; `m0-heavy` o'lchovlari uchun
bo'sh jadval; gate va merge hash; o'zing qabul qilgan UI/dizayn qarorlari; `TODO(contract)` ro'yxati; 1.4 taklifi fayli.
