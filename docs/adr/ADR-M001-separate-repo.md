# ADR-M001 — HUB-Mobile alohida repoda

- Holat: qabul qilingan (founder, 2026-11-03)
- Kontekst: kontrakt `uhub-mobile/1.1`, 1-bo'lim
- Kontrakt 1.2 da yangilanishi kutiladi

## Kontekst
Kontrakt 1.1 (1-bo'lim) mobil ilovani U-HUB monoreposi ichiga joylaydi: `mobile/` (Expo ilova)
va `packages/viewer/` (three.js), alohida gate `scripts/check-mobile.ps1`.
Founder mobil ishni **alohida git repoda** (`HUB-Mobile`) olib borishni tanladi.

## Qaror
- Repo: `HUB-Mobile`, npm workspaces.
- Struktura:
  - `apps/mobile/` — Expo ilova (kontraktdagi `mobile/` o'rniga);
  - `packages/viewer/` — three.js viewer, bitta HTML bundle;
  - `mock/` — mock API va fixtures (kontrakt 7-bo'limidagi `mobile/mock/` o'rniga);
  - `tools/sample-glb/` — namunaviy GLB generatori;
  - `scripts/check-mobile.ps1` — gate.
- U-HUB monoreposiga bu repodan tegilmaydi. Ikki tomon orasidagi yagona bog'lanish — kontrakt hujjati
  (`docs/contract/`) va HTTP API.

## Oqibatlar
- (+) Mobil ish U-HUB'ning CI'si, bog'liqliklari va reliz siklini to'xtatmaydi; Expo/RN bog'liqliklari monorepoga kirmaydi.
- (+) Mobil agent U-HUB kodini o'zgartira olmaydi — chegara faqat kontrakt orqali.
- (−) Kontrakt nusxasi ikki joyda. Manba — U-HUB; bu repodagi `docs/contract/` faqat nusxa, qo'lda yangilanadi.
- (−) GLB eksport (U-HUB V-1) va viewer bitta repoda emas, shuning uchun mos kelmay qolishi monorepoga nisbatan
  kechroq aniqlanadi. Yumshatish: `tools/sample-glb` testlari va `gltf-validator` kontraktga qarshi tekshiradi;
  V-1 tayyor bo'lgach haqiqiy "M-0 namuna" GLB'si shu testlardan o'tkaziladi.
- (−) Kontrakt 8-bo'limi (mijoz havolasi, V-2) `packages/viewer` ni U-HUB serveri beradi deb hisoblaydi.

## Qo'shimcha (2026-11-03, founder)

- **Viewer HUB-Mobile'da qoladi.** `packages/viewer` shu repoda build qilinadi; U-HUB versiyalangan artefaktni oladi
  (`releases/viewer/<VIEWER_VERSION>/index.html` + `manifest.json` sha256 bilan) — taklif: `docs/contract/proposals/1.4-proposal.md`.
- Kontrakt 1.3 1-bo'limi (monorepo) va 8-bo'limi ("U-HUB build viewer'ni yasaydi") shu qarorga mos emas — 1.4 taklifida.

## Ochiq savol
- **Viewer bundle U-HUB'ga qanday yetadi?** (8-bo'lim, V-2 uchun.) Variantlar:
  1. reliz artefakti (`viewer.html` GitHub release'da), U-HUB uni versiya bo'yicha yuklab oladi;
  2. xususiy npm paket (`@uhub/viewer`);
  3. U-HUB serveri bundle'ni shu repo CI'sidan nusxalaydi.
  Qaror V-2 dan oldin kontrakt 1.2 da qayd etilishi kerak.
