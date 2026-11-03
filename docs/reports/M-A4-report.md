# M-A4 hisoboti — kontrakt 1.3, dizayn palitrasi, materiallar, juftlash QR'i

- Sana: 2026-11-03 · Branch: `batch/m-a4` → `main`, merge **`83c7279`**
- Kontrakt fayli: `docs/contract/uhub-mobile-1.3.md` (+ `HUB-MOBILE-INTEGRATION.md`, `docs/design/mobile-design-concept.png`).
- Gate (`scripts/check-mobile.ps1 -Quiet`): birinchi ishga tushirishda o'tdi, tuzatish kerak bo'lmadi.
- Push: qilinmadi — topshiriqda "push qilinmaydi" deyilgan. Eslatma: `origin`
  (https://github.com/SanzioCG/HUB-Mobile.git) mavjud; push founder qaroriga qoldirildi.

## 0-qism natijasi

- Ish daraxti toza edi (faqat founder'ning commit qilinmagan hujjatlari: kontrakt 1.3, integratsiya, dizayn rasmi, M-A4 prompt).
- M-A3 **merge qilingan** (`e06b451` + AR tuzatishlari), `main` = `98bb21d`, `batch/m-a3` yarim qolmagan → M-A4 boshlandi.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 1. Hujjatlar | `681251c` | Kontrakt 1.3, integratsiya, dizayn rasmi, prompt commit; 1.2-draft "1.3 bilan almashtirildi"; ADR-M001 qo'shimchasi (viewer shu repoda) |
| 2. Namuna GLB | `90b601f` | Materiallar `mat__<id>` + `extras.uhub` (LDSP teksturasi, bo'yalgan MDF, HDF, ABS kromka, shisha BLEND, metall tutqich); har detal: yuzlar + 4 kromka primitivi; UV U = tola, "Qopqoq" 90° burilgan; eshik extras `pivot__door` da; `size_mm [L,W,T]`; `edges` 4 kalit; id kodlash (`part__x<base32>`); `m0-heavy.glb` (13.5 MB, ~140k uchburchak, 13 tekstura) |
| 3. Mock | `0aa5683` | Status draft/validated/approved, `role`, `export_status` (pending/failed buyumlar), `size_mm` obyekt, `token_invalid`/`token_revoked`, 410 `pair_code_expired` (kod `111111`), 429 `rate_limited` (5 xato/daqiqa/IP), `bad_qr`, `/dev/qr` da juftlash QR'i `uhub-pair:1?server=…&code=…` |
| 4. Viewer | `d17886e` | sRGB, Neutral tone mapping, RoomEnvironment, soya; tanlovda material nusxasi (asl material o'zgarmaydi) + butun detal konturi; `setView`/`setGroupVisible`/`fit`; `selected.door`/`material`; `stats` (dev); `VIEWER_VERSION 0.4.0`, `contract_mismatch`; `uhub-config` (ulashish rejimi) |
| 5. Ilova | `4dc938c` | Dizayn palitrasi; tab bar Loyihalar / Skaner (markazda) / Offline / Sozlamalar; filtr Hammasi/Tasdiqlangan/Tasdiqlanmagan; pending/failed buyumlar ochilmaydi; o'ng panel (Ko'rinishlar, Qatlamlar, Sig'dirish, "…"); detal kartasida material va 4 kromka; "QR bilan ulash" + qo'lda; yangi xato kodlari |
| 6. 1.4 taklifi | `61b0109` | `docs/contract/proposals/1.4-proposal.md`; `npm run release:viewer` → `releases/viewer/0.4.0/{index.html, manifest.json}` |
| 7. Gate | `080f9a6` | `m0-heavy.glb` borligi; validator barcha GLB'larni tekshiradi va `extensionsUsed` bo'sh bo'lmasa yiqiladi |

Testlar: generator 38, mock 42, viewer 68, mobil Jest 59 (yangi: `pairQr`, status normalizatsiyasi/filtr).

Bajarilmagan: ilova ikonkasi, bildirishnomalar, AR o'zgarishlari (topshiriq bo'yicha bu batchda yo'q). Telefonda
tekshiruv va `m0-heavy` o'lchovlari — founder.

## Telefonda tekshirish (Honor X9d, Expo Go, LAN yoki hotspot)

1. `npm run fixtures` → `npm run mock` → `cd apps/mobile && npx expo start -c`, Expo Go'da oching.
2. Ilovada juftlangan bo'lsangiz: Sozlamalar → "Qurilmani uzish".
3. Juftlash ekrani → **"QR bilan ulash"** → kompyuterda `http://<LAN-IP>:8787/dev/qr` dagi yuqori (juftlash) QR'ni
   skanerlang → loyihalar ochiladi, IP qo'lda kiritilmaydi.
4. Loyihalar: filtr Tasdiqlangan (№ 53) / Tasdiqlanmagan (№ 51 "Tekshirilgan", № 52 "Qoralama").
5. № 51 → "M-0 namuna": LDSP tola teksturasi, oq bo'yalgan MDF eshik/tortma fasadi, metall tutqichlar, shisha polka;
   "Qopqoq" tolasi boshqalarga nisbatan 90° burilgan.
6. Detalga bosing → tanlangan detal shaffof emas, qolganlari shaffof; kartada material (kod, ishlab chiqaruvchi, tur,
   qalinlik) va L1 L2 W1 W2 (bo'shi "kromkasiz"). "Hammasini ko'rsatish" → ranglar asl holida.
7. O'ng panel: Ko'rinishlar (Old, Yon, Yuqori, Izometriya), Qatlamlar, Sig'dirish, "…" (R, holat, sana).
8. "Yuqori modul, 2 eshik" ("Model tayyorlanmoqda") va "Tortmali modul, 4 tortma" ("Model yaratilmadi") ochilmaydi.
9. Sozlamalar: server, foydalanuvchi + rol, kompaniya, versiyalar (ilova, viewer 0.4.0, kontrakt 1.3).
   "Qurilmani uzish" → juftlash ekrani; eski token bilan so'rov → `token_revoked` (mock log'ida 401).
10. Offline tab: ochilgan buyumlar (nom, R, MB), bittasini o'chirish, hammasini tozalash.
11. Qo'lda juftlash: kod `111111` → "kod muddati o'tgan"; 5 marta noto'g'ri kod → "juda ko'p urinish".
12. `m0-heavy`: № 51 → "M-0 og'ir namuna (o'lchov uchun)" — pastdagi jadvalni to'ldiring (dev rejimda ekranda stats qatori).

## `m0-heavy.glb` o'lchovlari (founder to'ldiradi)

| O'lchov | 1-urinish | 2-urinish | 3-urinish | Izoh |
|---|---|---|---|---|
| Ochilish vaqti (`load_ms`, s) | | | | |
| FPS (aylantirganda) | | | | |
| FPS (tinch) | | | | |
| Xotira (Android sozlamalari → Expo Go, MB) | | | | |
| Tekstura hajmi (`textures_mb`) | | | | |

Fayl: 13.5 MB, ~140 000 uchburchak, 13 JPEG tekstura (9 tasi 1024 px).

## UI/dizayn qarorlari (men qabul qilganlar)

- Ikkinchi matn `#9AA3AD`, sariq `#F2C14E`, yashil `#4CC38A` — rasmdan; kontrast: bg da 7.6 / 11.6 / 8.8 : 1,
  `surface` da 6.0 / 9.1 / 6.9 : 1 (WCAG AA 4.5:1 dan yuqori).
- `validated` — sariq "Tekshirilgan" (tasdiqlanmagan guruhida); noma'lum status → `draft`.
- Tab bar markazidagi Skaner — accent doira, `/scan` ni to'liq ekran ochadi (tab ichida emas).
- Skaner juftlanmagan holatda ham ochiladi (juftlash QR'i uchun); `uhub:` etiketka juftlashsiz → "Avval ulang".
- Juftlangan holatda juftlash QR'i → "Boshqa serverga ulanasizmi?" → tasdiqlansa eski qurilma uziladi, keyin pair.
- O'ng panel faqat detal kartasi yopiq bo'lganda ko'rinadi (kichik ekranda to'qnashmasin).
- Offline etiketka eski reviziya uchun `approved=false` deb ko'rsatiladi (bilinmaydi — ehtiyotkor tanlov).
- `VIEWER_VERSION` 0.4.0; mock'ga og'ir namuna buyumi (`m0-heavy`) qo'shildi.
- Reliz papkasi `releases/` git'da (versiyalangan artefakt) — kontrakt 1.3 "git'ga kirmaydi" bilan farq, 1.4 taklifida.

## TODO(contract) ro'yxati (savollar)

1. **base32 misoli (2.1):** `A/1` → `part__xifxte` yozilgan, RFC 4648 bo'yicha `part__xiextc`. Kod RFC'ga amal qiladi.
2. **Noto'g'ri juftlash kodi:** kontraktda `error` kodi yo'q — mock `401 invalid_code`.
3. **Metall furnitura `thickness_mm`:** `null` ruxsatmi?
4. **AR varianti** (animatsiyasiz GLB) kontraktda yo'q — 1.4 taklifi 4-band.
5. **AR sahifasi** (Chrome WebXR, M-A3) — kontraktda yo'q, faqat mock.
6. O'chirilgan loyiha `updated_since` javobida qanday bildiriladi?
7. Detalning aniq joylashuvi ("2-tortma ichida") — tartib raqami yo'q.
8. Viewer 8-bo'limi (U-HUB build qiladi) ADR-M001 qo'shimchasiga zid — 1.4 taklifi 3-band.

## 1.4 taklifi

`docs/contract/proposals/1.4-proposal.md` — repo va yo'llar, palitra, viewer reliz artefakti
(`releases/viewer/<VIEWER_VERSION>/index.html` + `manifest.json {viewer_version, contract, sha256}`, U-HUB sha256 ni
tekshiradi), `ar-link format:"glb"` animatsiyasiz variant, qo'shimcha savollar. Architect'ga yuborish kerak.
