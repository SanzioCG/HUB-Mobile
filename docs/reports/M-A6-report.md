# M-A6 hisoboti — rasm va ikonkalarni ulash, yuklanish ekrani

- Sana: 2026-11-04 · Branch: `batch/m-a6` → `main`, merge **`fcd858e`**
- Manba: `docs/design/ASSETS.md` (yagona manba), `assets/` — Brand Kit v1 (founder).
- Shart: M-A5 merge qilingan (`8b2b517`). M-A7 ham merge qilingan (`ce28298`).
- Gate (`scripts/check-mobile.ps1 -Quiet`): birinchi ishga tushirishda o'tdi.
- Push: `git push origin main`.

## Bajarilgan

| Qism | Commit | Natija |
|---|---|---|
| 0. Commit | `4dbfabf` | `assets/**`, `docs/design/ASSETS.md`, M-A6 prompt |
| 1. Ikonka va tizim splash'i | `62f0fb0` | `icon` → `assets/brand/icon.png`; Android adaptive: `adaptive-foreground`, `adaptive-monochrome`, fon `#0B0D0F`; `expo-splash-screen`: `splash-icon.png`, 200 px, `#0B0D0F` (iOS va Android bir xil); web favicon; viewer bundle'ida `favicon.svg` (V-2). Expo shablon ikonkalari olib tashlandi |
| 3. Ikonka tizimi | `974f657` | `npm run icons` → `apps/mobile/src/ui/generated/*.tsx`; `<Icon name=… />` (Lucide + maxsus, tiplangan); viewer — Vite `?raw`; gate: "ikonkalar (assets/)" |
| 2. Yuklanish ekrani | `4a9acb5` | Tizim splash'i → `loading-bg.png` + `logo-full.svg` + progress; haqiqiy bosqichlar |
| 4. Ikonkalar joyida | `456cb9a` | Tab bar, 3D pastki panel, o'ng panel, detal kartasi, skaner, Offline, Sozlamalar, juftlash, bo'sh holatlar, AR overlay |
| 5. TMP nazorati | `749d423` | `npm run check:assets`: o'lcham/format — xato, TMP — ogohlantirish (`--strict` — xato) |
| Reliz | `d1f477a` | Viewer `0.5.1` (`releases/viewer/0.5.1`, kontrakt 1.6) — 0.5.0 o'zgarmas, bundle o'zgardi |

Tartib: 3-qism 2-qismdan oldin bajarildi — yuklanish ekranidagi logotip generator yasagan komponentdan olinadi.

Testlar: mobil Jest 68 (+4 yuklanish), viewer 111 (+7 real-fayl, ixtiyoriy), mock 46, generator 43.
Viewer bundle 716 KiB (`?raw` SVG'lardagi C2PA metadata build'da olib tashlanadi; aks holda ~785 KiB).

### Ikonkalar qayerda
| Joy | Ikonka |
|---|---|
| Tab bar | `layout-grid` (Loyihalar), `scan-qr-code` (Skaner, markazda), `cloud-download` (Offline), `settings` |
| 3D pastki panel (server va fayl) | `open-all`, `ruler`, `box` (AR), `rotate-ccw` — ikonka ustida, bir qatorli yorliq |
| O'ng panel | `rotate-3d` (ko'rinishlar), `layers` (qatlam belgilari `square`/`square-check`), `scan` (sig'dirish), `swing-zone`, `ellipsis` |
| Detal kartasi | `door-open`/`door-close`, `drawer-open`/`drawer-close` (holatga qarab), `x`, `scan-qr-code` |
| Skaner | `x`, `flashlight`/`flashlight-off`; ruxsat yo'q — `camera-denied` |
| Juftlash | `pair-scan`, `scan-qr-code`, `folder-open` |
| Offline / fayllar / Sozlamalar | `trash-2`, `folder-open`, `layout-grid`, `triangle-alert`, `chevron-right`, `log-out` |
| Orqaga | `chevron-left` |
| Bo'sh holatlar | `empty-projects`, `empty-offline` |
| Eskiz yo'q | `cabinet` (`surface` fonda) |
| Viewer AR overlay | eshik/tortma (holatga qarab), `open-all`, `swing-zone`, `rotate-ccw`, `x`; `ar-coach` (pol qidirilayotganda), `ar-unsupported` |

Ilovada Ionicons endi ishlatilmaydi; matnli "ikonka" (emoji, belgi) qolmadi.

## Yuklanish ekrani — qaror
- Tizim splash'i `preventAutoHideAsync` bilan ushlanadi. Bosqichlar: **shriftlar → secure-store (server, token) →
  kesh indeksi (GLB keshi va fayllar) → birinchi API so'rovi** (juftlangan bo'lsa loyihalar; oflaynda — keshdan). Soxta taymer yo'q.
- **300 ms gacha** hammasi tayyor bo'lsa — yuklanish ekrani **umuman ko'rsatilmaydi** (tizim splash'idan to'g'ridan-to'g'ri ilovaga, miltillamaydi).
  Ko'rsatilsa — **kamida 600 ms**.
- Server javob bermasa — **4 s** dan keyin ilova ochiladi; Loyihalar ekrani o'zi oflayn (kesh) yoki xato holatini ko'rsatadi.
  Juftlanmagan — API bosqichi yo'q.
- Loyihalar ekrani yuklanishdagi javobni qayta so'ramaydi (`primeProjectList`, bir marta).
- Expo Go'da loyiha ikonkasi va tizim splash'i **ko'rinmaydi** (Expo Go o'zinikini ko'rsatadi) — faqat development/production build'da.
  Yuklanish ekrani Expo Go'da ham ko'rinadi.

## `check:assets` natijasi
```
TMP   brand/loading-bg.png
assets: 0 xato, 1 TMP fayl
```
Prompt 23 ta TMP faylni kutgan edi — founder shu orada Brand Kit v1 ni qo'ygan (ASSETS.md "Holat"); hozir faqat
`brand/loading-bg.png` TMP (kit'da yuklanish foni yo'q). Gate'da: `warn  TMP fayllar (1): brand/loading-bg.png`.

## Founder uchun: faylni qanday almashtirish (3 qadam)
1. Tayyor faylni `assets/` dagi **aynan shu nom, o'lcham va format** bilan ustiga yozing (jadval — `docs/design/ASSETS.md`).
2. SVG almashtirgan bo'lsangiz: `npm run icons` (ilova komponentlari qayta yasaladi). PNG uchun hech narsa kerak emas.
3. `npm run check:assets` — xato yo'qligini va TMP ro'yxati qisqarganini tekshiring; keyin gate. Kod o'zgarmaydi.
   (Viewer AR overlay ikonkalari keyingi viewer build'ida avtomatik olinadi.)

## Qarorlar (meniki)
- Holat ranglari Brand Kit tokenlaridan (ASSETS.md 6-izoh): warning `#E9B45F`, success `#67C99A`, danger `#ED8F8F`
  (panel ustida 9.5 / 8.8 / 7.6 : 1). **TODO(contract):** kontrakt 1-bo'limida hali `#F2C14E` / `#4CC38A` (M-A7 hisobotidagi 2-savol).
- Logotip matni (`<text>`, `font-family="Inter,Arial,sans-serif"`, og'irlik 750/700) — generator yuklangan `Inter_700Bold` ga
  moslaydi (react-native-svg shriftlar ro'yxatini qo'llamaydi). Dizaynerga: matnni kontur (path) ga aylantirish (ASSETS.md 1-izoh).
- Lucide ro'yxatiga qo'shimchalar (ilovaga kerak bo'lgani): `folder-open`, `layout-grid`, `chevron-right`, `ellipsis`,
  `flashlight-off`, `square`, `square-check`. Loyihalar tabi — `layout-grid` (ASSETS.md da tab uchun belgilanmagan).
- Generator `SvgXml` (react-native-svg) bilan: SVG o'zgarmagan holda, `currentColor` → `color`; C2PA `<metadata>` (~20 KB) olib tashlanadi.
- Illyustratsiyalar `viewBox` i ASSETS.md dagi `320×240` emas (kit: `560×340`, `560×400`, to'rttasi `24×24`) — kod nisbatni faylning
  o'zidan oladi, tekshiruv viewBox borligini talab qiladi.
- Tab faol holati — rang bilan (Lucide'da to'ldirilgan variant yo'q).

## Bajarilmagan / izohlar
- **Hotspot'lar:** ilovada va viewer'da hotspot (ochish nuqtalari) funksiyasi yo'q — M-A5 promptida ham bo'lmagan. `hotspot.svg`
  generatsiya qilingan va `<Icon name="hotspot">` tayyor, lekin hozircha ishlatilmaydi.
- Yakuniy `loading-bg.png` (founder/dizayner beradi), do'kon rasmlari, development/production build — bu batchda yo'q.
- Dizaynerga izohlar ASSETS.md da (door/drawer open-close farqi, "+" belgisi, bo'sh holat rasmlari 24×24).

## Telefonda tekshirish (Honor X9d, Expo Go)
1. Expo'ni qayta ishga tushiring (`npx expo start -c`) — yangi native modullar (react-native-svg, expo-image, expo-splash-screen) Expo Go'da bor.
2. Ilova ochilganda: yuklanish ekrani (nur chiziqlari — hozir TMP fon, logotip, progress) — sekin tarmoqda ko'rinadi;
   tez bo'lsa to'g'ridan-to'g'ri ilova (qaror shunday).
3. Tab bar, 3D pastki panel, o'ng panel, detal kartasi, skaner — hamma tugmada ikonka; yorliqlar bo'linmaydi.
4. Bo'sh holatlar (bo'sh Offline, qidiruv natijasiz) va juftlash ekranida illyustratsiya.
5. `assets/icons/door-open.svg` ni boshqa SVG bilan almashtiring → `npm run icons` → telefonda yangi ikonka (kod o'zgarmagan).
