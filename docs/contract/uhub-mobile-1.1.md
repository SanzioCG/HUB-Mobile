# U-HUB mobil viewer — talablar va ma'lumot formati (kontrakt `uhub-mobile/1.1`)

Holat: loyiha, 2026-11-03. Manba: U-HUB architect. Bu hujjat ikki tomon uchun yagona kelishuv:
**U-HUB backend** (V-1 eksport, mobil API) va **mobil ilova** (iOS + Android). O'zgarishlar faqat shu hujjat orqali.

**1.1 o'zgarishlari (2026-11-03):** stek tanlandi (1-bo'lim); QR → detalni modelda tanlash A-1 ga kirdi
(2.1, 4, 5, 6-bo'limlar); qatlamli detallar uchun tugun qoidasi va `reveal` (2.1); `GET /mobile/resolve` (4).

## 1. Maqsad, chegaralar, stek
- Ilova **faqat ko'rish uchun**: tahrirlash yo'q, geometriya hisoblanmaydi. Hamma narsa U-HUB'dan tayyor keladi.
- Platformalar: **iOS va Android, bir xil funksiyalar**.
- **Stek (founder, 2026-11-03):** React Native + **Expo** (TypeScript). 3D — `packages/viewer` (three.js, alohida
  paket, bitta HTML bundle), ilovada **WebView** ichida. Xuddi shu paket keyin mijoz havolasida (8-bo'lim) ishlatiladi.
  U-HUB desktop muharriri o'z viewer'ida qoladi — bu paket undan ko'chirilmaydi, shu kontrakt bo'yicha yangidan yoziladi.
- iOS yig'ish — Expo EAS Build (bulutda, Mac shart emas). AR (A-2) — avval Scene Viewer / Quick Look; ilova ichidagi
  animatsiyali AR A-2 boshida spike bilan tanlanadi.
- Repo: U-HUB monorepo — `mobile/` (Expo ilova), `packages/viewer/` (three.js). Alohida gate: `scripts/check-mobile.ps1`.
- Til: o'zbekcha. Ko'rinish: U-HUB qorong'i uslubi (bg #111214, panel #191A1D, accent #3988FF; Inter, DM Mono).
- Foydalanuvchilar: xodimlar (dizayner, menejer, sex). Mijozlar — ulashish havolasi orqali (8-bo'lim).

## 2. 3D format — glTF 2.0 binary (`.glb`)
| Qoida | Qiymat |
|---|---|
| Birlik | **metr** (U-HUB mm × 0.001), glTF standarti |
| O'qlar | **Y yuqoriga**, old tomon **+Z** (kuzatuvchiga qaragan) |
| Koordinata boshi | Buyum **pol sathida, old-pastki qirra markazida** (AR'da polga qo'yish uchun) |
| Material | PBR metallic-roughness; teksturalar JPEG/PNG, ≤ 1024 × 1024; dekor tola yo'nalishi bilan (egri detalda UV yoyilma bo'yicha) |
| Siqish | Birinchi versiyada yo'q. Draco yoki Meshopt — keyin (kontrakt 1.2) |
| Hajm chegarasi | Bitta buyum ≤ 15 MB, ≤ 150 000 uchburchak (furnitura modellari soddalashtiriladi) |
| Bitta fayl | Bitta **buyum** (shkaf) = bitta GLB. Loyiha = buyumlar ro'yxati |

### 2.1 Tugunlar ierarxiyasi
```
scene
 └─ item__<item_id>                    (buyum)
     ├─ group__carcass                 (korpus panellari)
     ├─ group__fronts
     │    ├─ pivot__door__<id>         (petlya o'qida; animatsiya shu tugunni aylantiradi)
     │    │    └─ part__<uid> + uning furniturasi
     │    └─ slide__drawer__<id>       (tortma; animatsiya shu tugunni suradi)
     │         └─ fasad, tub, orqa devor, yon devorlar, relslarning harakatlanuvchi qismi
     └─ group__hardware                (korpusda qoladigan furnitura: profil, plita)
```
- Tugun nomlarida faqat `a–z 0–9 _ -`; ajratuvchi `__` (three.js `: . [ ] /` ni o'chiradi — U-HUB F-2e tajribasi).
- **Etiketkasi bo'ladigan har detal** (QR chop etiladigan har zagotovka) GLB'da **o'z tuguniga** ega: `part__<uid>`.
  Sendvich qatlamlari ("1/2", "2/2") — alohida tugunlar, har biri o'z geometriyasi bilan.
  `part_uid` reviziyalar orasida barqaror (ADR-025 D2). uid'da ruxsat etilmagan belgi bo'lsa — tugun nomida kodlanadi,
  asl uid `extras.uhub.uid` da.
- Har detal tugunida `extras.uhub`:
```json
{ "kind": "panel|door|drawer_front|hardware",
  "uid": "a1b2c3", "number": "12", "name": "Chap yon devor",
  "material": "Egger W980 ST2 Platinum White, LDSP 16 mm",
  "size_mm": [900, 560, 18],
  "edges": {"L1": "Egger ABS W980 ST2, 23 mm"},
  "article": "450.5001B",
  "reveal": ["door__d1__open"],
  "qr": "uhub:p/51/<part_uid>/<snapshot>" }
```
- `reveal` — detal ko'rinishi uchun ijro etiladigan kliplar (eshik orqasidagi polka → eshik ochiladi; tortma tubi →
  tortma chiqadi). Bo'sh — detal tashqaridan ko'rinadi. U-HUB hisoblaydi, ilova hisoblamaydi.

### 2.2 Animatsiyalar (nomlangan kliplar)
| Klip nomi | Nima | Qoida |
|---|---|---|
| `door__<id>__open` | Bitta eshik ochiladi | `pivot__door` petlya o'qi atrofida aylanadi, burchak petlyadan (110° → ~105° ko'rinish uchun) |
| `drawer__<id>__open` | Bitta tortma chiqadi | `slide__drawer` +Z bo'ylab, masofa = yurish (MERIVOBOX: NL − 10 mm) |
| `all__open` | Hammasi birga | |
- Davomiyligi 0.8 s, klip **yopiqdan ochiqqa**; yopish — teskari ijro.
- Ilova kliplarni nomi bo'yicha topadi; yangi tur qo'shilsa (masalan sliding eshik), nomlash shu qolipda.

### 2.3 O'lchamlar
`item` tugunida `extras.uhub.dimensions`:
```json
{ "overall_mm": {"width": 600, "height": 900, "depth": 560},
  "lines": [ {"label": "900", "from": [x,y,z], "to": [x,y,z]} ] }
```
Koordinatalar metrda, item ramkasida. Ilova o'lchov chiziqlarini shu ro'yxatdan chizadi (o'zi hisoblamaydi).

### 2.4 Metadata
`asset.extras.uhub = { "contract": "1.1", "project_number": 51, "item_id": "...", "revision_id": "...", "snapshot": "...", "approved": true|false, "generated_at": "ISO-8601" }`.
`approved = false` bo'lsa ilova "Tasdiqlanmagan holat" belgisini ko'rsatadi.

## 3. AR
- iOS Quick Look **USDZ** talab qiladi. U-HUB server tomonda GLB'dan USDZ yasaydi (V-1b): **yopiq holat, statik**.
- Android Scene Viewer — GLB bilan.
- Ilova ichidagi animatsiyali AR — A-2 spike natijasiga ko'ra (shu GLB va kliplar bilan).

## 4. Mobil API (U-HUB backend)
HTTPS (LAN sinovida HTTP ruxsat), JSON. Avtorizatsiya: `Authorization: Bearer <device_token>`.
| So'rov | Javob |
|---|---|
| `POST /mobile/pair` `{code}` | `{device_token, user, company}` — kod desktopda "Telefonni ulash" orqali, 6 raqam, 5 daqiqa amal qiladi |
| `GET /mobile/projects?updated_since=` | `[{id, number, name, status, items_count, updated_at, thumb_url}]` |
| `GET /mobile/projects/{id}` | `{…, items: [{item_id, name, revision_id, size_mm, glb_url, usdz_url, thumb_url, approved}]}` |
| `GET /mobile/resolve?qr=<QR matni>` | `{project_id, project_number, item_id, item_name, revision_id, part_uid, part_name, glb_url, is_latest, latest_revision_id, latest_glb_url}` |
| `GET glb_url / usdz_url / thumb_url` | Fayl. URL reviziya bo'yicha o'zgarmas (`…/<revision_id>.glb`) → **abadiy keshlanadi** |
| `DELETE /mobile/device` | Qurilmani uzish |
- `resolve` xatolari: `404 not_found`; `403 other_company` (boshqa kompaniya etiketkasi); detal keyingi reviziyalarda
  o'chirilgan bo'lsa — 200, etiketkadagi reviziya qaytadi, `is_latest=false`, `latest_*` = null.
- Qurilma tokeni faqat o'qish huquqiga ega, desktopdan bekor qilinadi.
- Mijoz shaxsiy ma'lumotlari (telefon, manzil) mobil javoblarga va QR'ga **kirmaydi**.

## 5. Ilova funksiyalari
**A-1:**
- Juftlash, loyihalar ro'yxati (qidiruv), buyumlar, 3D ko'rish (aylantirish, yaqinlashtirish).
- Detalni bosish → karta (`extras.uhub`); eshik/tortmalarni ochish (bittasi yoki hammasi); o'lchamlar.
- **QR skaner** → detal modelda tanlanadi va ko'rsatiladi (6-bo'lim).
- Oflayn kesh (oxirgi ochilganlar).

**A-2:** AR — haqiqiy o'lchamda polga qo'yish, surish, aylantirish, eshik/tortmalarni AR ichida ochish, foto va ulashish.
**Keyin:** ajratilgan ko'rinish (exploded).

## 6. QR → detalni ko'rsatish (A-1)
QR matni: `uhub:p/<project_number>/<part_uid>/<snapshot>` (ADR-021).
1. Skaner QR'ni o'qiydi. `uhub:` bilan boshlanmasa — "Bu U-HUB etiketkasi emas".
2. `GET /mobile/resolve` → buyum va reviziya. Oflaynda: keshda shu reviziya bo'lsa — keshdan; bo'lmasa — xabar.
3. **Etiketkadagi reviziya** ochiladi (sexda aynan shu kesilgan). `is_latest=false` bo'lsa sariq banner:
   "Etiketka eski reviziyadan (R3). Hozirgisi: R5 → ochish".
4. Viewer `part__<uid>` tugunini **tanlaydi**:
   - `reveal` kliplari ijro etiladi (eshik ochiladi / tortma chiqadi);
   - qolgan detallar yarim shaffof (opacity ≈ 0.15), tanlangan detal accent #3988FF konturi bilan;
   - kamera detalga yaqinlashadi (bounding box bo'yicha, 0.6 s);
   - detal kartasi ochiladi.
5. "Hammasini ko'rsatish" — tanlov va shaffoflik bekor, kliplar teskari.
6. Ketma-ket skanerlash: o'sha buyum bo'lsa model qayta yuklanmaydi, faqat tanlov almashadi.
7. Tugun topilmasa (eski GLB, xato) — "Detal modelda topilmadi", model ochiq qoladi.

## 7. Ishlab chiqish tartibi
- Mobil agent V-1 tayyor bo'lguncha **mock server + namunaviy GLB** bilan ishlaydi (`mobile/mock/`, shu kontrakt bo'yicha).
  Mock'da `resolve` ham bor; namunaviy etiketka QR'lari PNG sifatida.
- U-HUB V-1 tayyor bo'lganda haqiqiy namunalar: "M-0 namuna" (eshik + 3 tortma) va "M-1 namuna".
- Ulanish: sinovda telefon va kompyuter bitta Wi-Fi'da (backend `0.0.0.0`, firewall'da port); ishda — VPS, HTTPS (DEP-1).
- Qabul mezonlari: eshik va tortmalar to'g'ri o'qda ochiladi; detal kartasi to'g'ri; haqiqiy etiketka skanerlanganda
  aynan o'sha detal tanlanadi (tortma ichidagi va eshik orqasidagi ham); AR'da o'lcham real (rulet bilan, ±1 %).

## 8. Mijozga ulashish (keyin, V-2)
`https://<domen>/s/<token>` — `packages/viewer` brauzerda (ilovasiz) + AR tugmasi; muddati va bekor qilish desktopdan.
Shu GLB va USDZ ishlatiladi.

## 9. Ochiq savollar
1. Mijozlar ham ilovadan foydalanadimi yoki faqat ulashish havolasi orqalimi?
2. Eng past qo'llab-quvvatlanadigan versiyalar (Android 8? iOS 15?) va AR qurilma talablari.
3. Apple Developer akkaunti (iOS'ga o'rnatish va TestFlight) — qachon va kimning nomiga.