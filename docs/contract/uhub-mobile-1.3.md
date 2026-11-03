# U-HUB mobil viewer — talablar va ma'lumot formati (kontrakt `uhub-mobile/1.3`)

Holat: loyiha, 2026-11-03. Manba: U-HUB architect. Bu hujjat ikki tomon uchun yagona kelishuv:
**U-HUB backend** (V-1 eksport, mobil API) va **mobil ilova** (iOS + Android). O'zgarishlar faqat shu hujjat orqali.

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
- iOS yig'ish — Expo EAS Build. AR (A-2) — avval Scene Viewer / Quick Look; ilova ichidagi animatsiyali AR — A-2 spike.
- Repo: U-HUB monorepo — `mobile/`, `packages/viewer/`. Gate: `scripts/check-mobile.ps1`.
- Til: o'zbekcha. Ko'rinish: U-HUB qorong'i uslubi (bg #111214, panel #191A1D, accent #3988FF; Inter, DM Mono).
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
- aks holda → `part__x` + uid'ning UTF-8 baytlari **base32** (RFC 4648, kichik harf, `=` siz). Masalan `A/1` → `part__xifxte`.
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
`asset.extras.uhub = { "contract": "1.3", "project_number": 51, "item_id": "...", "revision_id": "...", "revision_label": "R5", "snapshot": "...", "generated_at": "ISO-8601" }`.
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
| `extras.uhub` (materialda) | `{ "id", "code": "W980 ST2", "supplier": "Egger", "name": "Platinum White", "kind": "ldsp|mdf|mdf_painted|veneer|hpl|abs|metal|plastic|glass", "thickness_mm": 18 }` |
- Roughness qiymatlari — vizual standart (ishlab chiqarishga ta'sir qilmaydi), U-HUB kompaniya sozlamasida o'zgaradi.
- Detal kartasidagi `material` matni (2.1) va material `extras.uhub` bir xil manbadan.

## 3. AR
- iOS Quick Look — USDZ (V-1b, yopiq holat, statik). Android Scene Viewer — GLB.
- Bu tizim ko'ruvchilari `Authorization` header yubora olmaydi → ilova `POST /mobile/ar-link` dan **muddatli imzolangan
  URL** oladi va shuni beradi (4-bo'lim). Kesh kaliti URL emas, `revision_id`.
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
| `GET /mobile/resolve?qr=<QR matni>` | `{project_id, project_number, item_id, item_name, revision_id, revision_label, approved, part_uid, part_name, glb_url, is_latest, part_in_latest, latest_revision_id, latest_revision_label, latest_glb_url}` |
| `POST /mobile/ar-link` `{item_id, revision_id, format: "glb"\|"usdz"}` | `{url, expires_at}` — imzolangan, faqat shu fayl, amal muddati 10 daqiqa |
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
- Mobil agent V-1 gacha **mock server + namunaviy GLB** bilan (`mobile/mock/`, 1.2 bo'yicha yangilanadi).
- U-HUB V-1 tayyor bo'lganda haqiqiy namunalar: "M-0 namuna" va "M-1 namuna".
- Ulanish: sinovda bitta Wi-Fi (backend `0.0.0.0`); ishda — VPS, HTTPS (DEP-1).
- Qabul mezonlari: eshik va tortmalar to'g'ri o'qda; karta to'g'ri; haqiqiy etiketka aynan o'z detalini tanlaydi
  (tortma ichidagi va eshik orqasidagi ham); AR'da o'lcham real (±1 %).

## 8. Mijozga ulashish (V-2) va viewer bundle'ni yetkazish
- `packages/viewer` monorepo'da; bundle (`dist/index.html`) **build artefakti**, git'ga kirmaydi.
- U-HUB build (`scripts/check.ps1` ichida `viewer` build bosqichi) bundle'ni `backend/app/static/viewer/` ga qo'yadi.
  Mobil ilova xuddi shu build'ni o'z asset'iga oladi — bitta manba, ikki iste'molchi.
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
