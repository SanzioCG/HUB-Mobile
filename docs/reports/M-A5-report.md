# M-A5 hisoboti — interaktiv AR (Android, Chrome WebXR): AR ichida eshik va tortmalarni ochish

- Sana: 2026-11-04 · Branch: `batch/m-a5` → `main`, merge **`8b2b517`**
- Asos: ADR-M003 (d), founder qarori 2026-11-03. Kontrakt `uhub-mobile-1.3`, taklif `1.4-proposal.md`.
- Gate (`scripts/check-mobile.ps1 -Quiet`):
  1. birinchi urinish — `format:check` founder'ning commit qilinmagan `assets/` papkasidagi 3 faylda yiqildi
     (M-A6 materiallari) → founder roziligi bilan `assets` `.prettierignore` ga qo'shildi (`4533ba5`);
  2. keyingi urinish — `expo-doctor`: Expo SDK 58 ning yangi patch'lari chiqqan → `npx expo install --fix` (`0bb3600`);
  3. oxirgi urinish — hammasi o'tdi.
- Push: `git push origin main` (pastdagi "Push" qatori).

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 1. Viewer AR rejimi | `f6d2ffb` | `uhub-config` `mode: "ar"` → o'sha viewer (GLB, materiallar, kliplar qayta ishlatiladi) + DOM overlay. `immersive-ar`: `hit-test` majburiy; `dom-overlay`, `local-floor`, `light-estimation` ixtiyoriy. Retikl → bosish → buyum polga, old tomoni (+Z) foydalanuvchiga. Bir barmoq — surish (transient hit-test), ikki barmoq — Y atrofida aylantirish. Masshtablash yo'q. Overlay: "Eshik N"/"Tortma N", "Hammasini ochish/yopish", "Ochilish zonalari", "Qayta joylashtirish", "Chiqish"; `beforexrselect` himoyasi. AR yo'q bo'lsa — "Bu qurilma yoki brauzer AR'ni qo'llamaydi" + "3D ko'rinishga o'tish" |
| 1b. Ochilish zonalari | `f6d2ffb` | Klip t = 0…1 da 12 qadamda baholanadi → eshik: sektor (petlya o'qi atrofida) + polda yoy; tortma: quti + polda to'rtburchak. Accent `#3988FF`, opacity 0.2, chegara chizig'i. `setHelpers {on}` bridge buyrug'i; AR overlay'da va ilovaning 3D o'ng panelida tugma. Standart — o'chiq |
| 2. Mock va ilova | `88b2114` | `ar-link` javobida `launch_url` (`/ar/<revision_id>.<exp>.<imzo>`) → viewer bundle + `uhub-config` (asosiy GLB, kliplar bilan). Eski `<model-viewer>` sahifasi `/ar/launch` da zaxira (ilova `launch_url` bo'lmasa ochadi). Ilova: AR → `ar-link` → `launch_url` |
| 3. Hujjatlar | `4ef43b0` | ADR-M003: "Qaror (2026-11-03)", holat — qabul qilingan (Android qismi). 1.4 taklifi 6-bo'limiga AR sahifasi mexanizmi va iOS/Android vaqtinchalik farqi |
| 4. Gate | `4533ba5`, `0bb3600` | Qadamlar o'zgarmadi; yangi testlar ichida |

Testlar: viewer 83 (yangi: `ar.test.ts` 10, `zones.test.ts` 5), mock 46 (yangi: `/ar/<imzo>` 4), mobil Jest 63
(yangi: `launch_url` 4). Viewer bundle: **685 KiB** (M-A4: 666 KiB, +19 KiB AR kodi).

Eslatma: 1 va 1b bitta commit'da — ikkalasi `viewer.ts` ning bir xil joylariga tegadi (`anchor` guruhi, sikl).

### Custom Tabs yoki to'liq Chrome
Standart — **Custom Tabs** (`expo-web-browser` `openBrowserAsync`, ilovaga qaytish qulay). WebXR Custom Tabs'da
ishlamasa: `apps/mobile/.env` ga `EXPO_PUBLIC_AR_OPEN=chrome` yozing va Expo'ni `-c` bilan qayta ishga tushiring —
`Linking.openURL` (to'liq Chrome, M-A3 da ishlagan yo'l). Bitta joy: `apps/mobile/src/config.ts` → `AR_OPEN`.
**Qaysi biri ishlagani — founder telefonda tekshiradi**, natijani shu yerga yozamiz.

### Qarorlar (meniki)
- `anchor` guruhi: buyum, zonalar, soya tekisligi va quyosh yorug'ligi birga; AR'da faqat u joylashadi (joy + yaw).
  Zonalar buyum ildiziga qo'shilmaydi — o'lcham, `fit` va tanlovga ta'sir qilmaydi.
- Surishda barmoq va buyum orasidagi siljish saqlanadi — oddiy bosish buyumni sakratmaydi.
- `light-estimation` bo'lsa — muhit va yorug'lik undan; soya baribir bitta yo'naltirilgan yorug'likdan.
- `plane-detection` va `depth-sensing` faqat **aniqlanadi** (ixtiyoriy so'raladi, `depth-sensing` — faqat CPU varianti,
  three.js okklyuziyasi yoqilmasin). Natija AR overlay'ning yuqorisida: `XR: hit-test bor · … · depth-sensing yo'q`.
- Eshik zonasi: o'qqa yaqin burchaklar (eshik qalinligi) burchak oralig'iga kirmaydi — "hub" doirasi sifatida.

## Telefonda tekshirish (Honor X9d, Chrome, tunnel orqali HTTPS)

1. `npm run fixtures` → `npm run build -w @hub-mobile/viewer` → `npm run mock`.
2. Boshqa terminalda `cloudflared tunnel --url http://localhost:8787`; chiqqan manzilni `mock/.env` ga
   `MOCK_PUBLIC_URL=https://….trycloudflare.com` deb yozing, mock'ni qayta ishga tushiring.
3. `cd apps/mobile && npx expo start -c` → Expo Go. Ilova → № 51 → "M-0 namuna" → **AR**.
4. Sahifada "AR'ni boshlash" → telefonni polga qarating → ko'k doira chiqqach ekranga bosing → shkaf qo'yiladi.
5. Overlay: "Eshik 1" — eshik petlya o'qida ochiladi/yopiladi; "Tortma 1–3" — tortmalar chiqadi (relsi yarim yurishda);
   "Hammasini ochish".
6. Overlay tugmasini bosing — shkaf joyidan siljimasligi kerak.
7. Bir barmoq bilan surish, ikki barmoq bilan aylantirish; chimchilab kattalashtirib bo'lmasligi kerak.
8. "Ochilish zonalari" → shkafni devorga yaqin qo'ying: eshik yoyi devorga tegishi ko'rinadi; tortma zonasi to'liq yurishda.
9. Yuqoridagi `XR: …` qatorini jadvalga yozing.
10. Rulet bilan o'lchang (pastdagi jadval). Eslatma: tutqichlar oldidan 12 mm chiqib turadi — korpusni o'lchang.
11. "M-0 og'ir namuna" bilan AR — ochilish vaqti va silliqligi.
12. Kompyuter brauzerida `launch_url` ni oching — "AR'ni qo'llamaydi" xabari, sahifa qulamaydi.

## O'lchovlar (founder to'ldiradi)

| Ochish yo'li | Natija |
|---|---|
| Custom Tabs (standart) | |
| To'liq Chrome (`EXPO_PUBLIC_AR_OPEN=chrome`) | |

| XR imkoniyati (Honor X9d) | bor / yo'q |
|---|---|
| hit-test | |
| dom-overlay | |
| local-floor | |
| light-estimation | |
| plane-detection | |
| depth-sensing | |

| Rulet (M-0, korpus) | Kutilgan | O'lchangan | Farq, % (±1 %) |
|---|---|---|---|
| Eni | 600 mm | | |
| Bo'yi | 900 mm | | |
| Chuqurligi | 560 mm | | |

| `m0-heavy.glb` AR'da | Qiymat |
|---|---|
| Ochilish vaqti (s) | |
| Silliqlik (FPS yoki taassurot) | |
| Eshik/tortma ochilishi silliqmi | |

## TODO(contract)

1. `ar-link` javobidagi `launch_url` va AR sahifasi `/ar/<token>` — kontraktda yo'q (1.4 taklifi 6-bo'lim).
2. AR sahifasi asosiy GLB'ni (kliplar bilan) ishlatadi; animatsiyasiz variant faqat statik ko'ruvchilar uchun — taklif.
3. Interaktiv AR faqat Android'da — kontrakt 1-bo'lim "bir xil funksiyalar" bilan vaqtinchalik farq (taklifda alohida band).
4. `uhub-config` `mode: "ar"` qiymati — kontrakt 8-bo'limida faqat `"share"`.

## Bu batchda yo'q
iOS interaktiv AR, AR'da foto/ulashish, exploded ko'rinish, avtomatik to'qnashuv tekshiruvi.
