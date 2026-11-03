# M-A0 hisoboti — skelet, namunaviy GLB, mock server, viewer

- Sana: 2026-11-03 · Branch: `batch/m-a0` → `main`, merge **`f28d7db`**
- Gate (`scripts/check-mobile.ps1 -Quiet`): birinchi ishga tushirishda o'tdi, tuzatish kerak bo'lmadi.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 1. Repo skeleti | `9d5b42c` | npm workspaces, TS strict, ESLint, Prettier, Node 24 (`engines`), ADR-M001 |
| 2. GLB generatori | `8905bc2` | `m0-r3.glb`, `m0-r5.glb` (22 detal; R5 da `m0p22` yo'q). gltf-validator: 0 error, 0 warning. 14 test |
| 3. Mock server | `c815399` | Kontrakt 4-bo'limining barcha so'rovlari, Bearer, abadiy kesh, QR etiketka PNG'lari. 28 test |
| 4. Viewer | `d6f730b` | Bitta `index.html` (~657 KB), tiplangan bridge, Solid/Qirralar/X-ray, o'lchamlar, `select`. 42 test |
| 5. Gate | `7d0e57d` | typecheck → lint/format → test → GLB+QR → validator → viewer build |

Tekshirilgan: viewer testlari haqiqiy M-0 ustida — eshik Y o'qi atrofida 105°, tortma +Z bo'ylab 450 mm,
yopish teskari, bitta eshik ochiq turganda "Hammasini ochish" sakrashsiz. Mock LAN'da (`0.0.0.0:8787`) javob beradi.

## Qo'lda tekshirish

1. `npm install` → `npm run fixtures` → `npm run mock`.
2. `npm run viewer` → `http://localhost:5173` (dev panel).
3. "QR sinovi" → **Polka**: eshik ochiladi, polka konturlanadi, qolgani shaffof. **Tortma 1 tubi**: tortma chiqadi.
4. Etiketkalar: `http://<IP>:8787/dev/qr`.

## Kontraktdan chetga chiqishlar

- Alohida repo (`apps/mobile`, `mock/`) — ADR-M001.
- Buzilgan `uhub:` QR → 404; boshqa kompaniya loyihasi `projects/{id}` da 404 (mavjudligini oshkor qilmaslik uchun).
- Fayllar ham token talab qiladi. Faqat mock'da: `/dev/qr` va doimiy `MOCK_DEV_TOKEN`.
- `loaded.item` ga `clips` ro'yxati qo'shildi.
- Inter va DM Mono viewer bundle'iga kiritilmagan (oflayn ishlashi uchun), tizim shriftlari ishlatiladi.

## Ochiq savollar (`TODO(contract)`)

1. `snapshot` va `revision_id` formati (fixture: `s3`, `m0-r3`).
2. Detal `size_mm` tartibi.
3. `edges` kalitlari va ma'nosi.
4. Artikuli yo'q detalda `article: null` ruxsat etiladimi.
5. Ruxsat etilmagan belgili uid tugun nomida qanday kodlanadi.
6. Petlya tomoni (prototipda chap).
7. Buyum `size_mm` formati (`projects/{id}`).
8. Loyiha `status` qiymatlari.
9. Xato javobi tanasi (`{error}` deb olindi).
10. `uhub:` bilan boshlanmaydigan QR uchun 400 va uning kodi.
11. `is_latest=true` bo'lganda `latest_*` qiymati.
12. `pair` javobidagi `user` va `company` maydonlari.
13. `DELETE device` javobi (204 deb olindi).
14. `thumb_url` va `usdz_url` null bo'la oladimi.
15. Viewer bundle U-HUB'ga qanday yetadi (ADR-M001, V-2 uchun).

Eslatma: `npm audit` ESLint zanjirida 12 ta moderate zaiflik ko'rsatadi — faqat dev-tooling.
