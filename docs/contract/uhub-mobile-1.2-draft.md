> **1.3 bilan almashtirildi** (`uhub-mobile-1.3.md`, 2026-11-03). Bu fayl tarix uchun saqlanadi.

# U-HUB mobil viewer — talablar va ma'lumot formati (kontrakt `uhub-mobile/1.2`) — QORALAMA

Holat: **qoralama**, 2026-11-03. Asos: 1.1 + U-HUB architect qarorlari (2026-11-03, chat) + M-A0/M-A1 savollari.
**U-HUB architect tasdiqlashi kerak.** `[TASDIQ]` — architect javobi yo'q, qoralama taklifi; `[OCHIQ]` — javob kerak.
Tasdiqlangach fayl `uhub-mobile-1.2.md` deb qayta nomlanadi, qoralama belgilari olib tashlanadi.

**1.2 o'zgarishlari:** alohida repo (1); detal uid bo'yicha topiladi, uid kodlash (2.1); `extras.uhub.door` (2.1);
teleskopik rels `__mid` (2.1, 2.2); burchak/yurish katalogdan (2.2); GLB'da `approved` yo'q, `revision_label` bor (2.4);
AR imzolangan havola (3, 4); xato formati, boshqa kompaniya → 404, `revision_label`, `part_in_latest` (4);
haptic (6); LAN sinov tarmog'i (7); viewer bundle versiyasi (8).

## 1. Maqsad, chegaralar, stek
- Ilova **faqat ko'rish uchun**: tahrirlash yo'q, geometriya hisoblanmaydi. Hamma narsa U-HUB'dan tayyor keladi.
- Platformalar: **iOS va Android, bir xil funksiyalar**.
- Stek: React Native + **Expo** (TypeScript). 3D — `packages/viewer` (three.js, **bitta HTML bundle**), ilovada **WebView** ichida.
- **Repo (1.2):** alohida `HUB-Mobile` repo (ADR-M001): `apps/mobile/` (Expo), `packages/viewer/`, `mock/`,
  `tools/sample-glb/`, gate `scripts/check-mobile.ps1`. U-HUB bilan yagona bog'lanish — shu kontrakt va HTTP API.
  Kontraktning manbasi — U-HUB; HUB-Mobile'dagi nusxa qo'lda yangilanadi.
- iOS yig'ish — Expo EAS Build. AR (A-2) — Scene Viewer / Quick Look; ilova ichidagi animatsiyali AR — A-2 spike.
- Til: o'zbekcha. Ko'rinish: U-HUB qorong'i uslubi (bg #111214, panel #191A1D, accent #3988FF; Inter, DM Mono).
- Foydalanuvchilar: xodimlar (dizayner, menejer, sex). Mijozlar — ulashish havolasi orqali (8-bo'lim).

## 2. 3D format — glTF 2.0 binary (`.glb`)
| Qoida | Qiymat |
|---|---|
| Birlik | **metr** (U-HUB mm × 0.001), glTF standarti |
| O'qlar | **Y yuqoriga**, old tomon **+Z** |
| Koordinata boshi | Buyum **pol sathida, old-pastki qirra markazida** |
| Material | PBR metallic-roughness; teksturalar JPEG/PNG, ≤ 1024 × 1024; dekor tola yo'nalishi bilan |
| Siqish | Yo'q. Draco yoki Meshopt — kontrakt 1.3 |
| Hajm chegarasi | Bitta buyum ≤ 15 MB, ≤ 150 000 uchburchak |
| Bitta fayl | Bitta **buyum** = bitta GLB. Loyiha = buyumlar ro'yxati |

### 2.1 Tugunlar ierarxiyasi
```
scene
 └─ item__<item_id>
     ├─ group__carcass
     ├─ group__fronts
     │    ├─ pivot__door__<id>              (petlya o'qida; klip shu tugunni aylantiradi)
     │    │    └─ part__<uid> + furniturasi
     │    └─ slide__drawer__<id>            (tortma; klip shu tugunni suradi — to'liq yurish)
     │         ├─ fasad, tub, orqa, yon devorlar, relsning tashqi (harakatlanuvchi) qismi
     │         └─ slide__drawer__<id>__mid  (relsning o'rta elementi; o'sha klipda yurishning yarmi)
     └─ group__hardware
```
- Tugun nomlarida faqat `a–z 0–9 _ -`; ajratuvchi `__`.
- **Detal `extras.uhub.uid` bo'yicha topiladi** (1.2). Tugun nomi faqat o'qish uchun, unga tayanilmaydi.
- uid'da ruxsat etilmagan belgi bo'lsa: tugun nomi `part__x<base32>`, bu yerda base32 — RFC 4648 alifbosi
  **kichik harflarda, `=` to'ldiruvchisiz**. Asl uid `extras.uhub.uid` da.
- Etiketkasi bo'ladigan har detal o'z tuguniga ega; sendvich qatlamlari — alohida tugunlar. `part_uid` reviziyalar orasida barqaror (ADR-025 D2).
- Har detal tugunida `extras.uhub`:
```json
{ "kind": "panel|door|drawer_front|hardware",
  "uid": "a1b2c3", "number": "12", "name": "Chap yon devor",
  "material": "Egger W980 ST2 Platinum White, LDSP 18 mm",
  "size_mm": [900, 560, 18],
  "edges": {"L1": "Egger ABS W980 ST2, 23 mm"},
  "article": "450.5001B",
  "reveal": ["door__d1__open"],
  "qr": "uhub:p/51/<part_uid>/<snapshot>" }
```
- Eshik tugunida (`kind: "door"`) qo'shimcha `extras.uhub.door` `[TASDIQ]`:
```json
{ "hinge_side": "left|right", "hinge": "Blum CLIP top 110° 71T3590", "hinge_count": 2, "open_deg": 105 }
```
- `reveal` — detal ko'rinishi uchun ijro etiladigan kliplar, **ro'yxat tartibida ketma-ket**. Bo'sh — tashqaridan ko'rinadi.
- `[OCHIQ]` `size_mm` tartibi (uzunlik, kenglik, qalinlik?); `edges` kalitlari va ma'nosi; `article: null` ruxsatmi.

### 2.2 Animatsiyalar (nomlangan kliplar)
| Klip nomi | Nima | Qoida |
|---|---|---|
| `door__<id>__open` | Eshik ochiladi | `pivot__door` petlya o'qi atrofida; burchak — `extras.uhub.door.open_deg` |
| `drawer__<id>__open` | Tortma chiqadi | `slide__drawer` +Z bo'ylab yurish masofasiga; `__mid` o'sha klipda yarmiga |
| `all__open` | Hammasi birga | Ixtiyoriy. Ilova **ishlatmaydi** (individual kliplar bilan bir tugunda to'qnashadi) |
- Davomiyligi 0.8 s, yopiqdan ochiqqa; yopish — teskari ijro. Ilova kliplarni nomi bo'yicha topadi.
- Burchak va yurish **katalogdan** olinadi (1.2). 1.1 dagi "NL − 10 mm" tekshirilmagan qiymat edi.
  Katalog qiymati tasdiqlanmagan bo'lsa — prototip qiymat va klipning `extras.uhub.prototype = true` `[TASDIQ]`.

### 2.3 O'lchamlar
`item` tugunida `extras.uhub.dimensions`:
```json
{ "overall_mm": {"width": 600, "height": 900, "depth": 560},
  "lines": [ {"label": "900", "from": [x,y,z], "to": [x,y,z]} ] }
```
`from`/`to` — **metrda**, item ramkasida. Ilova chiziqlarni shu ro'yxatdan chizadi.

### 2.4 Metadata
`asset.extras.uhub = { "contract": "1.2", "project_number": 51, "item_id": "...", "revision_id": "...",
"revision_label": "R5", "snapshot": "...", "generated_at": "ISO-8601" }`.
- **`approved` GLB'da yo'q** (1.2): fayl abadiy keshlanadi, tasdiqlash esa keyin o'zgarishi mumkin. Holat faqat API'dan.
- `[OCHIQ]` `snapshot` va `revision_id` formati.

## 3. AR
- iOS Quick Look — USDZ (yopiq holat, statik); Android Scene Viewer — GLB.
- Tashqi AR ilovalari `Authorization` sarlavhasini yubora olmaydi → fayl **imzolangan muddatli havola** orqali (4-bo'lim, `ar-link`).
- Ilova ichidagi animatsiyali AR — A-2 spike natijasiga ko'ra.

## 4. Mobil API (U-HUB backend)
HTTPS (LAN sinovida HTTP — faqat dev build), JSON. Avtorizatsiya: `Authorization: Bearer <device_token>`.
| So'rov | Javob |
|---|---|
| `POST /mobile/pair` `{code}` | `{device_token, user, company}` — 6 raqam, 5 daqiqa |
| `GET /mobile/projects?updated_since=` | `[{id, number, name, status, items_count, updated_at, thumb_url}]` |
| `GET /mobile/projects/{id}` | `{…, items: [{item_id, name, revision_id, revision_label, size_mm, glb_url, usdz_url, thumb_url, approved}]}` |
| `GET /mobile/resolve?qr=<QR matni>` | `{project_id, project_number, item_id, item_name, revision_id, revision_label, part_uid, part_name, glb_url, is_latest, part_in_latest, latest_revision_id, latest_revision_label, latest_glb_url}` |
| `POST /mobile/ar-link` `{item_id, revision_id, format: "usdz"\|"glb"}` | `{url, expires_at}` — imzolangan havola, **10 daqiqa** `[TASDIQ: so'rov tanasi]` |
| `GET glb_url / usdz_url / thumb_url` | Fayl, `Bearer` bilan. URL reviziya bo'yicha o'zgarmas → abadiy keshlanadi (kesh kaliti `revision_id`) |
| `DELETE /mobile/device` | Qurilmani uzish |
- **Xatolar** (1.2): tana har doim `{"error": "<kod>", "message": "<matn>"}`.
- **Boshqa kompaniyaga tegishli** loyiha, fayl yoki etiketka — **404 `not_found`** (403 emas): mavjudligi oshkor bo'lmaydi. `resolve` ham.
- `resolve`: `part_in_latest=false` — detal keyingi reviziyada o'chirilgan; `is_latest=false` bo'lsa `latest_*` to'ldiriladi.
- Qurilma tokeni faqat o'qish huquqiga ega, desktopdan bekor qilinadi. Mijoz shaxsiy ma'lumotlari javoblarga va QR'ga kirmaydi.
- `[OCHIQ]` `user`/`company` maydonlari; loyiha `status` qiymatlari ro'yxati; item `size_mm` formati; `thumb_url`/`usdz_url`
  `null` bo'la oladimi; `uhub:` bilan boshlanmaydigan yoki buzilgan QR → qaysi status/kod; `is_latest=true` da `latest_*`
  (null yoki o'sha qiymatlar); `DELETE /mobile/device` javobi; o'chirilgan loyiha `updated_since` da qanday bildiriladi.

## 5. Ilova funksiyalari
**A-1:** juftlash; loyihalar (qidiruv); buyumlar; 3D (aylantirish, yaqinlashtirish); detalni bosish → karta;
eshik/tortmalarni ochish (bittasi yoki hammasi); o'lchamlar; **QR skaner** → detal modelda (6-bo'lim); oflayn kesh.
**A-2:** AR — haqiqiy o'lchamda polga qo'yish, eshik/tortmalarni AR ichida ochish, foto va ulashish.
**Keyin:** ajratilgan ko'rinish (exploded).

## 6. QR → detalni ko'rsatish (A-1)
QR matni: `uhub:p/<project_number>/<part_uid>/<snapshot>` (ADR-021).
1. Skaner QR'ni o'qiydi. `uhub:` bilan boshlanmasa — "Bu U-HUB etiketkasi emas".
2. `GET /mobile/resolve`. Oflaynda: keshda shu reviziya bo'lsa — keshdan; bo'lmasa — xabar.
3. **Etiketkadagi reviziya** ochiladi. `is_latest=false` bo'lsa sariq banner:
   "Etiketka eski reviziyadan (`revision_label`). Hozirgisi: `latest_revision_label` → ochish";
   `part_in_latest=false` bo'lsa banner qo'shimchasi: "Bu detal hozirgi reviziyada yo'q".
4. Viewer detalni **`extras.uhub.uid` bo'yicha** tanlaydi: `reveal` kliplari ketma-ket; qolganlari opacity ≈ 0.15;
   tanlangan detal accent #3988FF konturi; kamera bounding box bo'yicha 0.6 s; detal kartasi ochiladi.
5. "Hammasini ko'rsatish" — tanlov va shaffoflik bekor, kliplar teskari.
6. Ketma-ket skanerlash: o'sha buyum bo'lsa model qayta yuklanmaydi.
7. Detal topilmasa — "Detal modelda topilmadi", model ochiq qoladi.
8. **Haptic** (1.2): muvaffaqiyatli o'qish — qisqa bitta tebranish; xato (U-HUB etiketkasi emas, topilmadi) — xato signali.

## 7. Ishlab chiqish tartibi
- Mobil agent V-1 tayyor bo'lguncha **mock server + namunaviy GLB** bilan ishlaydi (`mock/`, `tools/sample-glb/`).
- V-1 tayyor bo'lganda haqiqiy "M-0 namuna" va "M-1 namuna" GLB'lari `tools/sample-glb` testlari va `gltf-validator` dan o'tkaziladi.
- Ulanish: sinovda telefon va kompyuter bitta tarmoqda. **Mehmon Wi-Fi qurilmalarni ajratadi** — sinov ajratilmagan
  tarmoq yoki telefon hotspot'ida (1.2). Ishda — VPS, HTTPS (DEP-1).
- Qabul mezonlari: eshik va tortmalar to'g'ri o'qda ochiladi; detal kartasi to'g'ri; etiketka skanerlanganda aynan o'sha
  detal tanlanadi (tortma ichidagi va eshik orqasidagi ham); AR'da o'lcham real (rulet bilan, ±1 %).

## 8. Mijozga ulashish (V-2) va viewer bundle
- `https://<domen>/s/<token>` — `packages/viewer` brauzerda + AR tugmasi; muddati va bekor qilish desktopdan.
- **Viewer bundle bitta build'dan** (1.2): mobil ilova ham, U-HUB ham aynan shu `index.html` ni oladi.
  V-2 da backend uni `/s/<token>` orqali beradi va ichiga konfiguratsiya joylaydi.
- Bundle versiyalanadi: `viewer x.y.z` va qo'llaydigan kontrakt versiyasi bundle ichida va reliz nomida. `[TASDIQ]`
- `[OCHIQ]` U-HUB bundle'ni qanday oladi: GitHub release artefakti (taklif) yoki xususiy npm paket.

## 9. Ochiq savollar
1. Mijozlar ham ilovadan foydalanadimi yoki faqat ulashish havolasi orqalimi?
2. Eng past qo'llab-quvvatlanadigan versiyalar va AR qurilma talablari.
3. Apple Developer akkaunti — qachon va kimning nomiga.
4. Yuqoridagi `[OCHIQ]` va `[TASDIQ]` belgilari.
