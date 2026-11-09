# V-110 hisoboti — pantograf ilovada (kontrakt uhub-mobile/1.10), telefonga yetkazish

- Sana: 2026-11-09 · Branch: `feat/v-110-mobile` → `main` (merge, push)
- Asos: `batch/viewer-1.10` (`b23c98c`, `8ea5053`) `main` ga fast-forward qilindi.
- Gate (`scripts/check-mobile.ps1 -Quiet`): har qismdan keyin yashil.
- OTA: `preview` kanali, Android update ID **`01a1bea2-cd31-7bc7-ac44-1e3d1a183d39`**. Yangi APK kerak emas.

---

# QISM 1 — founder uchun

## Nima o'zgardi
- Pantografli shkafda pantograf detalini bossangiz, kartada **"Pantografni tushirish"** tugmasi chiqadi.
  Pantograf tushgandan keyin tugma **"Pantografni ko'tarish"** ga almashadi.
- Ikonka — pastga (tushirish) yoki yuqoriga (ko'tarish) qaragan strelka.
- Skaner orqali pantograf detali tanlansa, joylashuvi **"Pantografda"** deb yoziladi.
- Fayl ro'yxatidagi kulrang izohlar (`notes`) ishlaydi. Avval ochilgan eski fayllar ham xatosiz ochiladi.
- Viewer versiyasi **0.6.1**, kontrakt **1.10**. Batch'da 0.6.0 deyilgan edi; nega 0.6.1 bo'lgani "Qarorlar" jadvalida.
- Shu yangilanish bilan birga yangi logo va Graphite (laym) dizayn ham `main` ga kirdi. Telefonda ular 06–09.11 dan beri
  OTA orqali bor edi.

## Sinov qadamlari (Honor X9d)
Oldindan: telefonda **06.11 dagi yangi logoli APK (versionCode 3)** o'rnatilgan bo'lishi kerak. Ikonka 3D kub bo'lsa,
o'sha APK turibdi. Eski ikonka bo'lsa, avval shu APK'ni o'rnating:
https://expo.dev/artifacts/eas/_vd9yMTY-cuhxgfppaIiK5Egi6BfBIbhC0H2lSVr1HE.apk

1. Ilovani to'liq yoping (so'nggi ilovalar ro'yxatidan suring) va qayta oching. Yangilanish fonda yuklanadi.
   Yana bir marta yopib oching.
   (Yoki: Sozlamalar → "Yangilanishni tekshirish" → "Qayta ishga tushirish".)
2. Sozlamalar → Versiyalar: **Viewer 0.6.1**, **Kontrakt 1.10**, Yangilanish `01a1bea2`.
3. U-HUB'da "F-HG1 namuna": pantografli shkaf oldiga eshik qo'yib saqlang, `.uhub` eksport qiling, Telegram orqali
   telefonga yuboring → faylni bosing → **"Ochish" → U-HUB (test)**.
4. Shkafni oching → pantograf detalini bosing → **"Pantografni tushirish"**.
   Kutiladi: avval eshiklar ochiladi, keyin pantograf tushadi; tutqich osilib turadi (U-HUB `hang__` tugunini yozgan bo'lsa).
5. Yana bosing (**"Pantografni ko'tarish"**). Kutiladi: pantograf ko'tariladi, keyin eshiklar yopiladi.
6. Pastdagi **"Hammasini ochish"**. Kutiladi: avval eshiklar, keyin pantograf.
   **fps** ni yozib qo'ying. Statistika `ms · fps · △ · MB` faqat dev build'da chiqadi, test APK'da yo'q
   (M-A8 qarori). fps kerak bo'lsa: kompyuter brauzerida `npm run viewer` → faylni tashlang → statistika.
7. Natijani yozing: qaysi qadam ishladi, qaysi biri yo'q (skrinshot bo'lsa yaxshi).

---

# QISM 2 — texnik

## Commit'lar
| Qism | Commit | Natija |
|---|---|---|
| Asos | `8ea5053` (ff) | `batch/viewer-1.10` → `main` (fast-forward) |
| Sessiya ishi | `acf2c14` (merge) | Yangi logo `e90704a` (APK v3 runtime), SessionProvider tuzatishi `29cb8ac`, Graphite redizayn `db69587` |
| 1. Pantograf tugmasi | `cd7012e` | `viewer/clipAction.ts`: `clipAction()` (lift → "Pantografni tushirish/ko'tarish", `arrow-down/up-to-line`), `locationOf()` → "Pantografda"; viewer `clipIconName` (`lift-down`/`lift-up`), brauzer fayl ro'yxati klip tugmalarida ikonka |
| 1a. Reliz | `8995670` | `releases/viewer/0.6.0` asl holiga qaytarildi; **0.6.1** reliz (sha256 `ef08658d…`) |
| 2. `notes` | `c5df1b8` | `files/store.itemNotes()`; jest: eski saqlangan yozuv (notes'siz) xatosiz o'qiladi |
| 3. Kontrakt | `b99ef9b` | `docs/contract/uhub-mobile-1.10.md` (asl bilan bayt bo'yicha bir xil, `cmp`), README → 1.10 |
| 4. OTA | — | Fayl o'zgarmadi. `viewer.html` = `dist` = `releases/viewer/0.6.1/index.html` (`cmp`); runtime `83d4ded8…` = APK v3 |
| 6. Hisobot | shu commit | — |

## Testlar
- Mobil Jest: **84** (+5 `partSheet.test.ts`, +2 `notes.test.ts`). Viewer Vitest: **129** (+11 ixtiyoriy, haqiqiy fayl kerak),
  +3 `icons.test.ts`. Mock va generator — o'zgarmadi, o'tdi.
- Eslatma: worktree yo'lida (`.claude\…`) Jest testlarni topmaydi va `No tests found` bilan 0 qaytaradi — gate'dagi
  "mobile jest" u yerda bo'sh o'tadi. Mobil testlar ilovaning vaqtinchalik nusxasida ishga tushirildi (84/84).
  Asosiy checkout'da (`D:\Yashnarbek\HUB-Mobile`) muammo yo'q.

## OTA
| | Qiymat |
|---|---|
| Kanal / platforma | `preview` / android |
| Runtime | `83d4ded8825e9bd5274fc4ac92d1173393bf8918` (versionCode 3, build `fa464d57`) |
| Update group | `1f8d3d81-d96b-4c5a-9ed5-9fc3c292c89a` |
| Android update ID | `01a1bea2-cd31-7bc7-ac44-1e3d1a183d39` |
| Commit | `b99ef9b` (toza daraxt) |
| Dashboard | https://expo.dev/accounts/uhub-mobile/projects/uhub-mobile/updates/1f8d3d81-d96b-4c5a-9ed5-9fc3c292c89a |

## Ochiq savollar va qarorlar
| # | Savol | Qaror |
|---|---|---|
| 1 | Pantograf ikonkasi Brand Kit'da yo'q | Lucide `arrow-down-to-line` (tushirish) / `arrow-up-to-line` (ko'tarish); viewer'da `lift-down`/`lift-up`. **Dizaynerga savol:** maxsus `lift-down.svg` / `lift-up.svg` (24×24, `currentColor`) — kelsa `assets/icons/` ga qo'yiladi, `npm run icons` |
| 2 | Viewer 0.6.0 o'zgarmas (kontrakt 8-bo'lim), lekin batch viewer ikonkalarini o'zgartirishni so'radi | 0.6.0 tegilmadi; ikonkalar **0.6.1** patch relizida (kontrakt 1.10 o'sha). Sozlamalarda viewer **0.6.1**. U-HUB vendor qilishi kerak bo'lsa — 0.6.1 |
| 3 | A-1v 0.6.0 ni rejalashtirgan | A-1v promptida **0.7.0** ga tuzatildi (fayl founder'ning commit qilinmagan hujjati — joyida tahrir, commit qilinmadi) |
| 4 | OTA runtime: APK v3 (06.11) yangi logo bilan yig'ilgan — logo PNG'lari fingerprint'ga kiradi | Sessiya branch'i (logo, SessionProvider, redizayn) `feat/v-110-mobile` ga merge qilindi; aks holda runtime boshqa bo'lib, OTA telefonga yetmasdi |
| 5 | Graphite redizayndagi viewer ranglari (laym kontur) | Bu batch'ga kiritilmadi (viewer relizi o'zgarmas). Keyingi viewer relizida (A-1v / 0.7.0 bilan) — alohida qaror |
| 6 | `locationOf` tartibi | Pantograf detali `reveal` ida eshiklar ham bor → avval `lift__` tekshiriladi ("Pantografda"), keyin tortma, keyin eshik |
| 7 | fps | Test APK'da statistika yashirin (M-A8). Founder brauzerda yoki dev build'da o'lchaydi |
| 8 | Mantiq qayerda | `clipAction`/`locationOf` — `src/viewer/clipAction.ts` (react-native importsiz, jest uchun); `PartSheet` qayta eksport qiladi |

## Doiradan tashqari
- Furnitura va teshik qatlamlari, ularning kartalari — A-1v.
- U-HUB eksportida eshik yoki `hang__` yo'qligi — U-HUB tomonida.
