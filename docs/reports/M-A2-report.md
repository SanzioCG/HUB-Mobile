# M-A2 hisoboti — kontrakt 1.2 ga moslash, QR skaner, oflayn kesh

- Sana: 2026-11-03 · Branch: `batch/m-a2` → `main`, merge **`073f544`**
- **Kontrakt fayli:** `docs/contract/uhub-mobile-1.2-draft.md` (QORALAMA). `uhub-mobile-1.2.md` yo'q edi.
  Qoralamadan olingan har qiymat kodda `TODO(contract-1.2)` bilan belgilangan.
- Gate (`scripts/check-mobile.ps1 -Quiet`): birinchi ishga tushirishda o'tdi (13 qadam), tuzatish kerak bo'lmadi.
- Push: **qilinmadi** — `origin` remote sozlanmagan.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 0. Kontrakt 1.2 | `e061ee1` | Generator, viewer, mock va ilova qoralamaga moslandi (pastda) |
| 1. QR skaner | `5926ae4` | `expo-camera`, chiroq, 2 s debounce, haptic, "Oxirgi skanerlar" (10 ta, AsyncStorage) |
| 2. Tanlov holati | `ca1e6c6` | Eski reviziya banneri, "R5 ni ochish", `part_in_latest`, skaner kartasi, qayta yuklamasdan tanlash, yuklanish foizi |
| 3. Oflayn kesh | `8f99e8d` | GLB keshi LRU bilan, ro'yxatlar keshi, oflayn QR qidiruvi, Sozlamalar ekrani |
| 4. Gate | `fc2ea32` | Gate qadamlari o'zgarmadi (yangi testlar mavjud qadamlar ichida); ADR-M002 kesh siyosati, README |

**0-qism tafsiloti:**
- Generator: `contract: "1.2"`, `revision_label`, GLB'da `approved` yo'q, `extras.uhub.door`, `slide__drawer__<id>__mid`,
  ruxsat etilmagan uid `A1/B2.c` → `part__xieys6qrsfzrq`, kliplarda `prototype: true`. gltf-validator: 0 error, 0 warning.
- Viewer: detal faqat `extras.uhub.uid` bo'yicha; `progress {loaded, total}`; `reveal` ketma-ketligi test bilan tasdiqlandi.
- Mock: `{error, message}`; boshqa kompaniya — hamma joyda 404; `revision_label`, `latest_revision_label`, `part_in_latest`;
  `POST /mobile/ar-link` (HMAC, 10 daqiqa, Bearer'siz, muddati o'tgani 404).
- Ilova: R-belgi `revision_label` dan (M-A1 dagi `revision_id → "R5"` TODO yopildi); `ApiError` `message` ni o'qiydi.

Testlar: generator 26, mock 32, viewer 51, mobil Jest 46.

**Bajarilmagan / qisman:**
- Kartadagi joylashuv faqat "Eshik orqasida" yoki "Tortma ichida" ko'rinishida; "2-tortma ichida" ko'rinishi uchun ma'lumot yo'q (savol 15).
- "Oxirgi skanerlar" dagi № detal birinchi marta 3D'da tanlangach to'ldiriladi: resolve javobida raqam yo'q (savol 16).

## Telefonda tekshirish (Honor X9d, Expo Go)

1. `npm run fixtures` → `npm run mock` → `npm start -w @hub-mobile/mobile` (telefon hotspot'ida yoki ajratilmagan Wi-Fi'da).
2. Kompyuterda `http://<IP>:8787/dev/qr` ni oching, ilovada **Skaner**:
   - `m0p06.png` (polka) → tebranish → eshik ochiladi, polka konturda;
   - `m0p09.png` (tortma 1 tubi) → tortma chiqadi, rels `__mid` yarmida;
   - `m0p01.png` (tashqi) → klip yo'q.
3. `m0-r3/m0p06.png` → sariq banner "R3 … R5" → "R5 ni ochish" → polka R5 da tanlanadi.
   `m0-r3/m0p22.png` → "Bu detal hozirgi reviziyada yo'q".
4. `xieys6qrsfzrq.png` (uid `A1/B2.c`) → topiladi.
5. Begona QR (oddiy URL) → xato tebranishi va "Bu U-HUB etiketkasi emas"; skaner davom etadi.
6. M-0 ni bir marta oching, Wi-Fi'ni o'chiring → ro'yxatlar "Oflayn" belgisi bilan, 3D ochiladi, shu buyum etiketkalari ishlaydi.
7. Ilovani qayta oching → "Oxirgi skanerlar" saqlangan. Sozlamalar → band hajm va "Keshni tozalash".

## Viewer o'zgarishlari (`e061ee1` ichida)

- Detal faqat `extras.uhub.uid` bo'yicha topiladi (index ham, raycast ham); tugun nomiga tayanilmaydi.
- `ownClipName` `__mid` tugunini ham tortma klipiga bog'laydi.
- `progress {loaded, total}`: fetch oqimi va XHR `onprogress`; ko'pi bilan har 100 ms da (RN ko'prigi to'lmasin).
- `ClipPlayer.openSequence` — `reveal` ketma-ketligi alohida funksiyada, test bilan.

## Kontraktdan chetga chiqishlar va qarorlar

- Ruxsat etilmagan uid sifatida `A1/B2.c` olindi (`/` bilan). QR tahlili: snapshot — oxirgi segment, uid — o'rtadagi
  hammasi. Etiketka PNG nomi — tugun nomidagi kod (`x<base32>`).
- `__mid` "yurishning yarmi" **dunyo ramkasida** deb olindi: slide bolasi bo'lgani uchun lokal −yarim (savol 2).
- Oflayn resolve: joriy reviziya keshlangan loyihadan; uning etiketkalari keshda bo'lmasa `part_in_latest` noma'lum → true.
- `ar-link`: `format: "usdz"` → 404 (mock'da USDZ yo'q).
- Promptda yo'q, qo'shildi: Sozlamalar ekrani (kompaniya, server, kesh, "Qurilmani uzish"); Loyihalar ekranidagi
  "Uzish" tugmasi Sozlamalarga ko'chdi.
- Kesh chegaralari (20 reviziya / 500 MB) — **founder sozlamasi, kontraktda yo'q** (`apps/mobile/src/config.ts`).
- Qoralama 8-bo'limidagi viewer bundle versiyalash (`[TASDIQ]`) batchda yo'q edi — qilinmadi.

## `TODO(contract-1.2)` — qoralamadan olinganlar (architect tasdig'i kerak)

1. `contract: "1.2"` va qoralama umuman.
2. `slide__drawer__<id>__mid` va "yurishning yarmi" — ota ramkasidami yoki dunyodami?
3. Ruxsat etilmagan uid → `part__x<base32>` (kichik harf, `=` siz).
4. `extras.uhub.door` `{hinge_side, hinge, hinge_count, open_deg}` (`[TASDIQ]`).
5. Klip `extras.uhub.prototype = true` (`[TASDIQ]`).
6. `revision_label` (GLB 2.4, API 4) va GLB'da `approved` yo'qligi.
7. Detal faqat `extras.uhub.uid` bo'yicha topiladi.
8. Xato tanasi `{error, message}`; boshqa kompaniya → 404.
9. `part_in_latest`, `latest_revision_label`; `is_latest=false` da `latest_*` doim to'ldiriladi.
10. `POST /mobile/ar-link` tanasi `{item_id, revision_id, format}` (`[TASDIQ]`), muddat 10 daqiqa.
11. Haptic qoidasi (6.8).

## `TODO(contract)` — ochiq qolganlar (1.2 qoralamada ham `[OCHIQ]`)

Avvalgilar: detal `size_mm` tartibi; `edges` kalitlari; `article: null`; `snapshot`/`revision_id` formati;
`user`/`company` maydonlari; loyiha `status` qiymatlari; buyum `size_mm` formati; `thumb_url`/`usdz_url` null;
`uhub:` bo'lmagan QR uchun status/kod; `is_latest=true` da `latest_*`; `DELETE /mobile/device` javobi;
o'chirilgan loyiha `updated_since` da; segment filtr ↔ status; holat ranglari/matnlari.

M-A2 da yangi:
15. Detal joylashuvi ("2-tortma ichida") — kontraktda yo'q, tortma tartib raqami bilinmaydi.
16. `resolve` javobida detal raqami (`number`) yo'q — "Oxirgi skanerlar" uchun qo'shilishi kerakmi?

Yopilganlar: `revision_id → "R5"` (endi `revision_label`), "yuklanish faqat spinner" (endi foiz).

## Eslatma

`docs/batches/M-A3-prompt.md` ish davomida paydo bo'lgan; commit qilinmadi, kuzatilmagan fayl sifatida qoldi.
