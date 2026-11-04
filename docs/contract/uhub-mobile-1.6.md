# U-HUB mobil viewer — talablar va ma'lumot formati (kontrakt `uhub-mobile/1.6`)

Holat: loyiha, 2026-11-04. Manba: U-HUB architect. Bu hujjat ikki tomon uchun yagona kelishuv:
**U-HUB backend** (V-1 eksport, mobil API) va **mobil ilova** (iOS + Android). O'zgarishlar faqat shu hujjat orqali.

**1.6 o'zgarishlari (2026-11-04, V-1a natijasi bo'yicha):** ichki tortmani qo'lda ochish — `reveal` tartibida (2.2);
material `kind` ro'yxatiga `lmdf`, `pvc` qo'shildi, noma'lum `kind` xato emas (2.5); `index.json` da ixtiyoriy
`warnings` (10.2). Qo'shimcha o'zgarish — 1.5 bilan mos.

**1.5 o'zgarishlari (2026-11-04, founder):** loyihani **`.uhub` faylidan ochish** — serversiz, oflayn (10-bo'lim):
`.uhub` ichida `viewer/` papkasi (GLB + `index.json`), viewer bundle'da `.uhub` yuklagich (ilova va brauzer uchun bitta),
eshik/tortma kliplari fayldan ham majburiy, fayldan QR → detal; ilova `project.json` ni o'qimaydi (mijoz ma'lumoti);
buyumning loyihadagi joyi `transform` — "Butun loyiha" ko'rinishi va keyingi VR rejimi uchun (10.2).
Qo'shimcha o'zgarish — 1.4 bilan mos; server API (4) o'zgarmadi.

**1.4 o'zgarishlari (2026-11-03, HUB-Mobile taklifi bo'yicha):** alohida repo `HUB-Mobile` (1); mobil palitra (1);
AR: animatsiyasiz `ar` varianti, Android — Chrome WebXR sahifasi (`launch_url`), iOS — o'sha sahifa orqali Quick Look (3, 4);
`resolve` da `usdz_url`; noto'g'ri juftlash kodi `400 pair_code_invalid` (4); `thickness_mm: null` (2.5);
base32 misoli tuzatildi (2.1); viewer reliz va pin qilish (8).

**1.3 o'zgarishlari (2026-11-03):** materiallar qoidasi (2.5); juftlash QR'i server manzili bilan (4.1).

**1.2 o'zgarishlari (2026-11-03, mobil agentning 18 savoli bo'yicha):**
- `approved` GLB ichidan olindi — faqat API'dan (2.4); `revision_label` qo'shildi (4).
- Detal `size_mm` — `[L, W, T]`; `edges` kalitlari va `null` (2.1); tugun **uid bo'yicha** topiladi, nom kodlash qoidasi (2.1).
- Eshik `extras.uhub.door` (petlya tomoni, burchak); teleskopik rels o'rta elementi (2.2).
- Xato tanasi, status ro'yxati, pair javobi, null bo'la oladigan URL'lar, ID formati (4).
- Boshqa kompaniya → **404** (403 yo'q); `resolve`: `latest_*` doim to'ldiriladi + `part_in_latest` (4).
- AR uchun muddatli imzolangan havola `POST /mobile/ar-link` (3, 4); viewer bundle'ning V-2 ga yetkazilishi (8).

## 1. Maqsad, chegaralar, stek
- Ilova **faqat ko'rish uchun**: tahrirlash yo'q, geometriya hisoblanmaydi. Hamma narsa U-HUB'dan tayyor keladi.
- Platformalar: **iOS va Android, bir xil funksiyalar**.
- **Stek:** React Native + **Expo** (TypeScript). 3D — `packages/viewer` (three.js, bitta HTML bundle), ilovada **WebView** ichida.
  Xuddi shu bundle mijoz havolasida (8-bo'lim). U-HUB desktop muharriri o'z viewer'ida qoladi.
- iOS yig'ish — Expo EAS Build. AR (A-2) — 3-bo'lim.
- Repo: **`HUB-Mobile` — alohida** (ADR-M001). Yo'llar: `apps/mobile/` (Expo), `packages/viewer/` (three.js),
  `mock/` (mock API), `tools/sample-glb/` (namuna GLB). Gate: `scripts/check-mobile.ps1`.
  **Kontraktning asl nusxasi — U-HUB `docs/mobile/VIEWER-CONTRACT.md`**; HUB-Mobile'dagi nusxa shu versiya bilan bir xil bo'lishi shart.
- Til: o'zbekcha. Shriftlar: Inter (400–700), DM Mono (400, 500).
- Mobil palitra (dizayn konsepti `docs/design/mobile-design-concept.png`):

| Token | Qiymat | Vazifa |
|---|---|---|
| `accent` | `#3988FF` | asosiy amal, tanlov konturi |
| `accentSecondary` | `#6A5CFF` | gradient / ikkinchi urg'u |
| `accentTertiary` | `#00C2FF` | gradient / ma'lumot |
| `bg` | `#0B0D0F` | fon |
| `panel` | `#15181C` | kartalar, panellar |
| `surface` | `#22262B` | maydonlar, tugmalar |
| `border` | `#333A41` | ajratuvchilar |
| `text` | `#F3F5F6` | asosiy matn |
| `textMuted` | `#9AA3AD` | ikkinchi matn |
| `yellow` | `#F2C14E` | tasdiqlanmagan / ogohlantirish |
| `green` | `#4CC38A` | tasdiqlangan |
  `accent` desktop bilan bir xil. Yakuniy umumiy palitra — brending (dizayner) natijasida; o'zgarsa kontrakt versiyasi oshadi.
- Foydalanuvchilar: xodimlar. Mijozlar — ulashish havolasi orqali (8-bo'lim).

## 2. 3D format — glTF 2.0 binary (`.glb`)
| Qoida | Qiymat |
|---|---|
| Birlik | **metr** (U-HUB mm × 0.001) |
| O'qlar | **Y yuqoriga**, old tomon **+Z** |
| Koordinata boshi | Buyum **pol sathida, old-pastki qirra markazida** |
| Material | PBR metallic-roughness; teksturalar JPEG/PNG, ≤ 1024 × 1024; dekor tola yo'nalishi bilan (egri detalda UV yoyilma bo'yicha) |
| Siqish | Yo'q. Draco/Meshopt — keyin |
| Hajm chegarasi | Bitta buyum ≤ 15 MB, ≤ 150 000 uchburchak |
| Bitta fayl | Bitta **buyum** = bitta GLB. Fayl **reviziya bo'yicha o'zgarmas** — ichida vaqt o'tishi bilan o'zgaradigan holat bo'lmaydi |

### 2.1 Tugunlar va detal ma'lumoti
```
scene
 └─ item__<item_id>
     ├─ group__carcass
     ├─ group__fronts
     │    ├─ pivot__door__<id>            (petlya o'qida)
     │    │    └─ part__<…> + furnitura
     │    └─ slide__drawer__<id>          (tortma qutisi + relsning ichki elementi)
     │         └─ fasad, tub, orqa devor, yon devorlar
     │    └─ slide__drawer__<id>__mid     (relsning o'rta elementi, 2.2)
     └─ group__hardware                   (korpusda qoladigan: profil, plita)
```
**Tugunni topish.** Ilova detalni **`extras.uhub.uid` bo'yicha** topadi (asosiy kalit). Tugun nomi — faqat o'qish uchun:
- uid `^[a-z0-9-]+(_[a-z0-9-]+)*$` ga mos va ichida `__` yo'q bo'lsa → `part__<uid>`;
- aks holda → `part__x` + uid'ning UTF-8 baytlari **base32** (RFC 4648, kichik harf, `=` siz). Masalan `A/1` (baytlar `41 2F 31`) → `part__xiextc`.
- `item_id`, eshik/tortma `<id>` ga ham xuddi shu qoida.

**Etiketkasi bo'ladigan har detal** o'z tuguniga ega. Sendvich qatlamlari ("1/2", "2/2") — alohida tugunlar.
`uid` reviziyalar orasida barqaror (ADR-025 D2).

Detal tugunida `extras.uhub`:
```json
{ "kind": "panel|door|drawer_front|hardware",
  "uid": "a1b2c3", "number": "12", "name": "Chap yon devor",
  "material": "Egger W980 ST2 Platinum White, LDSP 18 mm",
  "size_mm": [900, 560, 18],
  "edges": {"L1": "Egger ABS W980 ST2, 23×1 mm", "L2": null, "W1": null, "W2": "Egger ABS W980 ST2, 23×1 mm"},
  "article": null,
  "reveal": ["door__d1__open"],
  "qr": "uhub:p/51/<part_uid>/<snapshot>" }
```
| Maydon | Qoida |
|---|---|
| `size_mm` | `[L, W, T]` — uzunlik, kenglik, qalinlik; **tayyor o'lcham** (kromka bilan), U-HUB detal kartasi va GibLab'dagi L × W × T bilan bir xil. Furniturada — gabarit, `T` = eng kichik o'lcham |
| `edges` | Har doim 4 kalit: `L1`, `L2` — uzunlik bo'ylab qirralar; `W1`, `W2` — kenglik bo'ylab. Detal lokal ramkasida (ADR-003), U-HUB karta va GibLab bilan bir xil nomlar. Qiymat — kromka matni yoki `null` (kromkasiz). Furniturada `edges` yo'q |
| `article` | Ixtiyoriy: `null` yoki yo'q bo'lishi mumkin (panellarda odatda `null`) |
| `material` | Qalinlik matni `size_mm[2]` bilan mos (1.1 misolidagi 16/18 nomuvofiqligi tuzatildi) |
| `reveal` | Detalni ko'rsatish uchun ijro etiladigan kliplar, tartib bilan (ichki tortma: avval eshik, keyin tortma). Bo'sh — tashqaridan ko'rinadi |

Eshik `pivot__door__<id>` tugunida `extras.uhub.door`:
```json
{ "hinge_side": "left|right|top|bottom", "open_angle_deg": 105, "leaf": 1, "leaves": 2 }
```

### 2.2 Animatsiyalar (nomlangan kliplar)
| Klip nomi | Nima | Qoida |
|---|---|---|
| `door__<id>__open` | Eshik ochiladi | `pivot__door` o'q atrofida `open_angle_deg` ga |
| `drawer__<id>__open` | Tortma chiqadi | `slide__drawer__<id>` +Z bo'ylab to'liq yurishga; `…__mid` (bo'lsa) **xuddi shu klipda** yurishning yarmiga |
| `all__open` | Hammasi birga | ichki tortmalar eshikdan keyin |
- Davomiyligi 0.8 s, yopiqdan ochiqqa; yopish — teskari ijro. Ilova kliplarni faqat nomi bo'yicha ijro etadi,
  burchak/yurishni o'zi hisoblamaydi.
- **Ichki tortma (eshik ortida).** Foydalanuvchi uni ochganda ilova shu tortma fasadining `reveal` ro'yxatini tartib
  bilan ijro etadi (avval eshik, keyin tortma); yopishda — teskari tartibda (avval tortma, keyin eshik). Eshikni
  yopishdan oldin uning ortidagi ochiq tortmalar yopiladi. Tortma klipini yolg'iz ijro etish (fasad yopiq eshikdan
  o'tib ketadi) — faqat dasturchi sinov sahifasida.
- **Qiymatlar manbasi (U-HUB, V-1):** `open_angle_deg` = petlyaning katalog ochilish burchagi − 5° (chegarada
  ko'rinmasligi uchun); yurish = rels katalog ma'lumotidan (`docs/catalog/.../data.md`). Katalogda yo'q bo'lsa V-1
  eksport ogohlantirish beradi — taxminiy qiymat (masalan NL − 10) **tasdiqlanmagan**.

### 2.3 O'lchamlar
`item` tugunida `extras.uhub.dimensions`:
```json
{ "overall_mm": {"width": 600, "height": 900, "depth": 560},
  "lines": [ {"label": "900", "from": [x,y,z], "to": [x,y,z]} ] }
```
Koordinatalar metrda, item ramkasida. Ilova chiziqlarni shu ro'yxatdan chizadi.

### 2.4 Metadata
`asset.extras.uhub = { "contract": "1.6", "project_number": 51, "item_id": "...", "revision_id": "...", "revision_label": "R5", "snapshot": "...", "generated_at": "ISO-8601" }`.
- **`approved` GLB'da yo'q.** Reviziya tasdiqlanishi GLB o'zgarmasdan keyin ham bo'ladi; holat faqat API'dan
  (`items[].approved`, `resolve.approved`). Oflaynda — oxirgi olingan API javobi (keshlangan JSON) bo'yicha.

### 2.5 Materiallar
Hamma narsa **GLB ichida** keladi — alohida tekstura URL'lari, material kutubxonasi yoki so'rov yo'q.
Faqat glTF **core** (kengaytmalarsiz: `KHR_texture_transform`, `KHR_materials_*` ishlatilmaydi) — har qanday
yuklagich va three.js `GLTFLoader` qo'shimchasiz ochadi.

| Qoida | Qiymat |
|---|---|
| Material bitta marta | Bir xil U-HUB materiali → bitta glTF material, nomi `mat__<material_id>` (2.1 kodlash qoidasi) |
| Panel yuzalari | Detal mesh'i bir nechta primitive: **yuzalar** (TOP/BOTTOM) — plita yoki qoplama materiali; **har qirra** (L1, L2, W1, W2) — o'sha qirraning kromka materiali; kromkasiz qirra — plita materiali |
| Dekor teksturasi | `baseColorTexture`, JPEG, sRGB, ≤ 1024 px, GLB ichida (bufferView). Bir xil tekstura bir marta saqlanadi |
| Tola yo'nalishi va masshtab | **UV'da** pishirilgan: U o'qi — tola yo'nalishi; 1 UV birligi = tekstura plitkasining real o'lchami (katalogdagi `tile_mm`). Egri detalda — yoyilma bo'yicha. Ilova hech narsa hisoblamaydi |
| Bo'yalgan MDF | Teksturasiz: `baseColorFactor` = RAL/NCS rangi (sRGB → linear), roughness qoplama turidan (mat 0.8 / yarim mat 0.5 / glyanes 0.15) |
| LDSP / shpon / HPL | Tekstura + roughness (LDSP ≈ 0.7, shpon ≈ 0.6, HPL ≈ 0.5); metallic 0 |
| Furnitura | Ishlab chiqaruvchi modelidan soddalashtirilgan; metall — metallic 1, roughness 0.3–0.5; plastik — metallic 0 |
| Shisha | `alphaMode: BLEND`, baseColor alpha ≈ 0.3 |
| `extras.uhub` (materialda) | `{ "id", "code": "W980 ST2", "supplier": "Egger", "name": "Platinum White", "kind": "ldsp|lmdf|mdf|mdf_painted|veneer|hpl|abs|pvc|metal|plastic|glass", "thickness_mm": 18 }` — `thickness_mm` ma'nosiz bo'lsa (`metal`, `plastic`) `null`. Noma'lum `kind` — xato emas, ilova uni oddiy material deb ko'rsatadi |
- Roughness qiymatlari — vizual standart (ishlab chiqarishga ta'sir qilmaydi), U-HUB kompaniya sozlamasida o'zgaradi.
- Detal kartasidagi `material` matni (2.1) va material `extras.uhub` bir xil manbadan.

## 3. AR
- **AR varianti.** U-HUB har reviziya uchun ilova GLB'idan tashqari **animatsiyasiz AR GLB** yasaydi: yopiq holat,
  kliplar yo'q, geometriya, o'lcham va materiallar o'sha. Sabab: Scene Viewer ko'p animatsiyali GLB'da faqat birinchisini
  o'ynatadi va validator xato beradi. iOS uchun USDZ (V-1b) — xuddi shu yopiq holat.
- **AR sahifasi (asosiy yo'l, ikkala platforma).** U-HUB backend `GET /ar/<signed>` sahifasini beradi:
  `<model-viewer>` (U-HUB backend'ning o'zida, CDN emas), `src` = AR GLB, `ios-src` = USDZ, `ar-modes="webxr scene-viewer quick-look"`,
  `ar-scale="fixed"`. Ilova `launch_url` ni tizim brauzerida ochadi (Android — Chrome, iOS — Safari).
  Sahifada mijoz ma'lumotlari yo'q; faqat buyum nomi va o'lchami.
- Android: Chrome WebXR — asosiy (Honor X9d sinovida Scene Viewer ishlamadi, WebXR ishladi); Scene Viewer — ixtiyoriy.
- Bu ko'ruvchilar `Authorization` header yubora olmaydi → hamma AR fayl va sahifa URL'lari **muddatli imzolangan**
  (`POST /mobile/ar-link`). AR fayllarida CORS: `Access-Control-Allow-Origin` — faqat U-HUB server domeni.
- Kesh kaliti URL emas: `revision_id` + `variant` (`app` | `ar`).
- Ilova ichidagi animatsiyali AR — A-2 spike.

## 4. Mobil API (U-HUB backend)
HTTPS (LAN sinovida HTTP ruxsat), JSON. Avtorizatsiya: `Authorization: Bearer <device_token>`.

**Identifikatorlar.** `id`, `item_id`, `revision_id`, `snapshot`, `part_uid` — **shaffof satrlar**: `[A-Za-z0-9_-]`, ≤ 64 belgi.
Ilova ularni tahlil qilmaydi, faqat tenglik bo'yicha solishtiradi. Inson uchun: `number` (loyiha), `revision_label` ("R5").

**Holatlar.** `status` ∈ `draft` | `validated` | `approved` (oxirgi reviziya holati). Noma'lum qiymat — `draft` deb
ko'rsatiladi. O'chirilgan/arxivlangan loyihalar ro'yxatga kirmaydi.

| So'rov | Javob |
|---|---|
| `POST /mobile/pair` `{code}` | `{device_token, user: {id, name, role}, company: {id, name}}`; `role` ∈ `designer` \| `manager` \| `shop` \| `admin`. Email/telefon yo'q |
| `GET /mobile/projects?updated_since=` | `[{id, number, name, status, items_count, updated_at, thumb_url}]` |
| `GET /mobile/projects/{id}` | `{id, number, name, status, updated_at, items: [{item_id, name, revision_id, revision_label, approved, size_mm: {width, height, depth}, export_status, glb_url, usdz_url, thumb_url}]}` |
| `GET /mobile/resolve?qr=<QR matni>` | `{project_id, project_number, item_id, item_name, revision_id, revision_label, approved, part_uid, part_name, glb_url, usdz_url, is_latest, part_in_latest, latest_revision_id, latest_revision_label, latest_glb_url}` |
| `POST /mobile/ar-link` `{item_id, revision_id}` | `{launch_url, glb_url, usdz_url, expires_at}` — hammasi imzolangan, 10 daqiqa. `launch_url` — AR sahifasi (3-bo'lim); `glb_url` — AR varianti (animatsiyasiz); `usdz_url` — V-1b gacha `null` |
| `GET glb_url / usdz_url / thumb_url` | Fayl. URL reviziya bo'yicha o'zgarmas → **abadiy keshlanadi** |
| `DELETE /mobile/device` | `204`, tanasiz; takroriy chaqiruv ham `204`. Keyin token → `401 token_revoked` |

- `items[].size_mm` — obyekt `{width, height, depth}` (mm, o'nlik bo'lishi mumkin), `overall_mm` bilan bir xil.
- **Null bo'la oladi:** `thumb_url`, `usdz_url` (V-1b gacha doim `null`), `glb_url` — faqat `export_status` ≠ `ready`
  bo'lsa. `export_status` ∈ `ready` | `pending` | `failed`.
- **`resolve`:** `latest_*` **doim to'ldiriladi**; `is_latest=true` bo'lsa ular `revision_id`, `revision_label`,
  `glb_url` bilan bir xil. Detal oxirgi reviziyada o'chirilgan bo'lsa — `part_in_latest=false`, `latest_*` baribir
  oxirgi reviziyani ko'rsatadi.

**Xato javobi** (barcha so'rovlar): HTTP status + `{"error": "<code>", "message": "<o'zbekcha matn>"}`.
`message` — ko'rsatish uchun, ilova mantig'i faqat `error` kodiga tayanadi.
| Status | `error` | Qachon |
|---|---|---|
| 400 | `bad_qr` | `uhub:` bilan boshlanadi, lekin tuzilishi buzilgan yoki noma'lum versiya |
| 400 | `bad_request` | boshqa noto'g'ri parametr |
| 401 | `token_invalid`, `token_revoked` | token yo'q/noto'g'ri; qurilma uzilgan |
| 404 | `not_found` | yo'q **yoki boshqa kompaniyaniki** (mavjudlik oshkor qilinmaydi; `resolve` uchun ham) |
| 400 | `pair_code_invalid` | juftlash kodi noto'g'ri (mavjud emas). 401 emas — 401 faqat token uchun, ilova 401 da tokenni o'chiradi |
| 410 | `pair_code_expired` | juftlash kodi muddati o'tgan yoki ishlatilgan |
| 429 | `rate_limited` | juftlashda ko'p urinish |
| 5xx | `server_error` | |
- `uhub:` bilan **boshlanmaydigan** QR — so'rov yuborilmaydi; ilova o'zi "Bu U-HUB etiketkasi emas" deydi.
- Qurilma tokeni faqat o'qish huquqiga ega, desktopdan bekor qilinadi.
- Mijoz shaxsiy ma'lumotlari (telefon, manzil) mobil javoblarga va QR'ga **kirmaydi**.

### 4.1 Juftlash QR'i va server manzili
- Desktop "Telefonni ulash" oynasi 6 raqamli kod va **QR** ko'rsatadi:
  `uhub-pair:1?server=<URL-kodlangan base URL>&code=123456`
  (masalan `server=http%3A%2F%2F192.168.1.20%3A8000` LAN'da, keyin `https%3A%2F%2Fapi.<domen>`).
- Ilova QR'ni o'qiydi → `server` ni saqlaydi → `POST <server>/mobile/pair`. Qo'lda kiritish ham bor
  ("Server manzili" + kod).
- `uhub:` (etiketka) va `uhub-pair:` (juftlash) — har xil prefiks; skaner ikkalasini ajratadi.
- Server manzili va token qurilmada `expo-secure-store` da. Bir vaqtda bitta server.

## 5. Ilova funksiyalari
**A-1:** juftlash; loyihalar (qidiruv); buyumlar; 3D (aylantirish, zoom); detalni bosish → karta; eshik/tortmalarni
ochish; o'lchamlar; **QR → detal** (6-bo'lim); oflayn kesh.
**A-1u (serverdan oldin, birinchi navbatda):** `.uhub` faylidan ochish (10-bo'lim) — 3D, detal kartasi, eshik/tortmalar,
o'lchamlar, fayldan QR → detal. Juftlash va server API kerak emas.
**A-2:** AR — polga qo'yish, surish, aylantirish, AR ichida ochish, foto va ulashish.
**Keyin:** exploded ko'rinish.

## 6. QR → detalni ko'rsatish (A-1)
QR matni: `uhub:p/<project_number>/<part_uid>/<snapshot>` (ADR-021).
1. `uhub:` bilan boshlanmasa — so'rovsiz "Bu U-HUB etiketkasi emas".
2. `GET /mobile/resolve`. `400 bad_qr` → "Etiketka o'qilmadi"; `404` → "Bu detal topilmadi". Oflaynda: keshda
   shu snapshot'ning reviziyasi bo'lsa — keshdan, aks holda xabar.
3. **Etiketkadagi reviziya** ochiladi. `is_latest=false` bo'lsa sariq banner:
   "Etiketka eski reviziyadan (R3). Hozirgisi: R5 → ochish"; `part_in_latest=false` bo'lsa qo'shimcha:
   "R5 da bu detal yo'q".
4. Viewer `extras.uhub.uid` bo'yicha tugunni tanlaydi: `reveal` kliplari tartib bilan; qolganlar opacity ≈ 0.15;
   accent #3988FF kontur; kamera bounding box'ga 0.6 s; detal kartasi.
5. "Hammasini ko'rsatish" — tanlov bekor, kliplar teskari.
6. Ketma-ket skanerlash: o'sha buyum bo'lsa model qayta yuklanmaydi.
7. Tugun topilmasa — "Detal modelda topilmadi", model ochiq qoladi.

## 7. Ishlab chiqish tartibi
- Mobil agent V-1 gacha **mock server + namunaviy GLB** bilan (HUB-Mobile `mock/`, shu versiya bo'yicha).
- U-HUB V-1 tayyor bo'lganda haqiqiy namunalar: "M-0 namuna" va "M-1 namuna".
- Ulanish: sinovda bitta Wi-Fi (backend `0.0.0.0`); ishda — VPS, HTTPS (DEP-1).
- Qabul mezonlari: eshik va tortmalar to'g'ri o'qda; karta to'g'ri; haqiqiy etiketka aynan o'z detalini tanlaydi
  (tortma ichidagi va eshik orqasidagi ham); AR'da o'lcham real (±1 %).

## 8. Mijozga ulashish (V-2) va viewer bundle'ni yetkazish
- Viewer **HUB-Mobile'da** build qilinadi: `npm run release:viewer` → `releases/viewer/<VIEWER_VERSION>/index.html` + `manifest.json`
  `{ "viewer_version": "0.5.0", "contract": "1.6", "sha256": "<index.html sha256, hex>" }`. Reliz git'da, o'zgarmas
  (bir versiya qayta yozilmaydi).
- **U-HUB** relizni o'z repo'siga **vendor** qiladi: `scripts/update-viewer.ps1 <versiya> <manba>` (manba — HUB-Mobile'ning
  lokal klon yo'li yoki GitHub reliz) → `backend/app/static/viewer/<versiya>/index.html` + `manifest.json`, commit bilan.
  `VIEWER_VERSION` U-HUB'da pin qilinadi.
- U-HUB gate (`scripts/check.ps1`) faqat **lokal** tekshiradi: pin qilingan versiya papkasi bor va `sha256` mos. Gate
  tarmoqqa yoki qo'shni repo'ga murojaat qilmaydi. U-HUB viewer'ni o'zi build qilmaydi.
- Mobil ilova xuddi shu relizni o'z asset'iga oladi — bitta manba, ikki iste'molchi.
- `GET /s/<token>` — backend bundle'ni qaytaradi va ichiga konfiguratsiya qo'shadi:
  `<script id="uhub-config" type="application/json">{"glb_url": "...", "usdz_url": "...", "title": "...", "mode": "share"}</script>`.
  Viewer konfiguratsiya bo'lsa undan, bo'lmasa WebView `postMessage` API'sidan ishlaydi.
- Ulashish havolasining GLB/USDZ URL'lari — token bilan cheklangan, muddatli; muddat va bekor qilish desktopdan.
- Bundle versiyasi `VIEWER_VERSION` (semver) va kontrakt versiyasi bundle ichida; kontrakt major versiyasi mos
  kelmasa viewer xabar beradi.

## 9. Ochiq savollar
1. Mijozlar ham ilovadan foydalanadimi yoki faqat ulashish havolasi orqalimi?
2. Eng past qo'llab-quvvatlanadigan versiyalar (Android 8? iOS 15?) va AR qurilma talablari.
3. Apple Developer akkaunti (iOS'ga o'rnatish va TestFlight) — qachon va kimning nomiga.

## 10. `.uhub` faylidan ochish (1.5, serversiz)
Umumiy server DEP-1 da keladi. Ungacha (va keyin ham oflayn) loyiha telefonga **fayl** bo'lib boradi: desktopda
"Fayl → Eksport → Loyiha fayli (.uhub)" (ADR-020) → Telegram / kabel / bulut → ilovada ochish. Xuddi shu fayl
brauzerdagi viewer'ga (DEMO-1, `packages/viewer` statik sahifa) sudrab tashlanadi.

### 10.1 Fayl ichida — `viewer/` papkasi (ADR-020 D6)
`.uhub` — ZIP (ADR-020 D1). U-HUB unga qo'shimcha papka yozadi; qolgan tarkibi o'zgarmaydi:

| Yo'l | Mazmun |
|---|---|
| `viewer/index.json` | buyumlar ro'yxati va detallar indeksi (10.2) |
| `viewer/<item_key>.glb` | buyumning **ilova GLB'i** — 2-bo'lim bilan aynan bir xil (tugunlar, `extras.uhub`, materiallar, **kliplar 2.2**, o'lchamlar 2.3, metadata 2.4) |
| `viewer/<item_key>.png` | ixtiyoriy eskiz, 400 px |

- `<item_key>` — `item_id` 2.1 kodlash qoidasi bo'yicha (`part__` prefiksisiz).
- Hamma `viewer/` fayllari `manifest.json` dagi SHA-256 ro'yxatida (ADR-020 D1, D5).
- AR GLB faylga **kirmaydi**: fayldan AR yo'q, AR — server orqali (3-bo'lim). Fayldan ochilgan loyihada AR tugmasi
  ko'rinmaydi yoki "AR server ulanganda ishlaydi" deydi.
- Hajm: har GLB ≤ 15 MB (2-bo'lim), butun `.uhub` ≤ 50 MB (ADR-020 D5).

### 10.2 `viewer/index.json`
```json
{ "format": "uhub-viewer/1", "contract": "1.6",
  "project_number": 51, "project_name": "Oshxona — namuna",
  "exported_at": "ISO-8601",
  "items": [
    { "item_id": "...", "name": "Shkaf 600", "revision_id": "...", "revision_label": "R5",
      "approved": true, "snapshot": "...",
      "size_mm": {"width": 600, "height": 720, "depth": 560},
      "transform": {"translation": [0.0, 0.0, 0.0], "rotation": [0.0, 0.0, 0.0, 1.0]},
      "glb": "viewer/<item_key>.glb", "thumb": "viewer/<item_key>.png",
      "parts": [ {"uid": "a1b2c3", "number": "12", "name": "Chap yon devor", "kind": "panel"} ] } ] }
```
- `approved` — **eksport paytidagi** holat (fayl o'zgarmaydi; 2.4 dagi qoida server uchun). Ilova uni
  "Eksport paytida: tasdiqlangan" deb ko'rsatadi.
- `parts` — buyum GLB'idagi `extras.uhub.uid` lar bilan bir xil to'plam (QR oflayn qidiruvi uchun; GLB ochmasdan).
- `project_name` — loyiha nomi; **mijoz ma'lumoti yo'q** (ism, telefon, manzil `index.json` ga kirmaydi).
- `thumb` — `null` bo'lishi mumkin. Noma'lum qo'shimcha maydonlar e'tiborsiz qoldiriladi.
- `warnings` — ixtiyoriy, o'zbekcha satrlar ro'yxati (eksport ogohlantirishlari: katalogda yo'q qiymat, taxminiy
  yurish va h.k.). Ilova ularni buyum ma'lumotida sariq belgida ko'rsatadi; bo'sh yoki yo'q bo'lsa — hech narsa.
- `transform` — buyumning **loyiha ramkasidagi** joyi (U-HUB'dagi buyum transformi): `translation` metrda,
  `rotation` — kvaternion `[x, y, z, w]`; o'qlar 2-bo'lim bilan bir xil (Y yuqoriga, old +Z), loyiha boshi — pol sathida.
  Buyum GLB'ining o'zi o'zgarmaydi (o'z boshida, 2-bo'lim); `transform` GLB'ni loyihaga qo'yish uchun. Hamma buyum
  qo'yilsa — U-HUB'dagi loyiha sahnasi bilan bir xil ko'rinish.

### 10.3 Ilova va viewer
- **Ochish yo'llari.** Ilova: "Fayldan ochish" (hujjat tanlash) va tizim "Ulashish / Ochish" (Android intent filtri
  `.uhub`, `application/zip`, `application/octet-stream`; iOS — eksport qilingan UTI `uz.uhub.project`, kengaytma `uhub`).
  Brauzer viewer'i: fayl tanlash yoki sudrab tashlash.
- **Bitta yuklagich.** `.uhub` ni ochish `packages/viewer` ichida (JS, ZIP o'qish) — ilova ham, brauzer ham shuni ishlatadi.
- **Xavfsizlik (ADR-020 D5 bilan bir xil):** ≤ 50 MB, ≤ 2 000 yozuv, ochilgandagi jami ≤ 200 MB, siqish nisbati
  chegarasi; `..`, absolyut yo'l, disk harfi, `\` — rad; faqat `manifest.json` va `viewer/*` o'qiladi, har biri
  manifest SHA-256 bilan tekshiriladi; hech narsa bajarilmaydi.
- **`project.json` va `documents/` o'qilmaydi** — ularda mijoz ma'lumoti bor (ADR-020); ilovaga kerak emas.
- `viewer/` yo'q (eski fayl) → "Bu fayl ko'rish uchun tayyorlanmagan — U-HUB'da qayta eksport qiling".
  `format` major versiyasi noma'lum → "Ilovani yangilang".
- **Saqlash.** Ochilgan fayl ilova xotirasiga nusxalanadi; ro'yxat "Fayldan ochilganlar" — server loyihalaridan alohida,
  o'chirish mumkin. Bir xil `project_number` + `revision_id` qayta ochilsa — yangi nusxa emas, almashtiriladi.

### 10.4 Funksiyalar fayldan
- 3D, detalni bosish → karta (2.1), o'lchamlar (2.3) — serverdagidek.
- **"Butun loyiha" ko'rinishi:** hamma buyumlar `transform` bo'yicha bitta sahnada (bitta buyum ko'rinishi ham qoladi).
  Keyin VR rejimi (MVP'dan keyin, WebXR) xuddi shu sahnani 1:1 ko'rsatadi.
- **Eshik va tortmalar ochilishi majburiy:** `door__<id>__open`, `drawer__<id>__open`, `all__open` (2.2) — fayldan
  ochilgan GLB'da ham xuddi shunday ishlaydi; ichki tortma — avval eshik.
- **QR → detal (oflayn):** `uhub:p/<project_number>/<part_uid>/<snapshot>` →
  1) shu `project_number` li fayl yo'q → "Bu loyiha telefonda yo'q — faylini oching";
  2) `snapshot` mos buyum bor → o'sha buyum, 6-bo'lim 4–7 qadamlari;
  3) `snapshot` mos emas, lekin `part_uid` fayldagi `parts` da bor → sariq banner
     "Etiketka boshqa reviziyadan. Fayldagi: R5" va detal ko'rsatiladi;
  4) `part_uid` yo'q → "Bu detal fayldagi reviziyada yo'q".
- AR, server ro'yxati, juftlash — fayl rejimida yo'q.

### 10.5 Qabul mezonlari (fayl rejimi)
- U-HUB'dan eksport qilingan haqiqiy `.uhub` (eshik, tashqi tortma, ichki tortma, shisha eshik bo'lsa u ham) ilovada
  va brauzer viewer'ida ochiladi; har eshik va tortma to'g'ri o'qda ochiladi; ichki tortma eshikdan keyin.
- Detal kartasidagi raqam, nom, o'lcham U-HUB va GibLab bilan bir xil.
- Haqiqiy etiketka QR'i fayldan aynan o'z detalini tanlaydi.
- Buzilgan fayl (SHA-256 mos emas, `..` yo'l) — rad, tushunarli xabar bilan; ilova yiqilmaydi.
