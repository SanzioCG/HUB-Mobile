# HUB-Mobile — rasm va ikonkalar (assets)

Barcha fayllar repo ildizidagi **`assets/`** papkasida: bitta manba. Ilova (`apps/mobile`) va viewer (`packages/viewer`) shu yerdan oladi.
Hozir hammasi **vaqtinchalik (TMP)**. Rasmlarda burchakda qizil "TMP" yozuvi, SVG'larda `<!-- TMP placeholder -->` izohi bor.

**Almashtirish qoidasi:** tayyor faylni **aynan shu nom, shu o'lcham va format** bilan ustiga yozing. Kodga tegish shart emas.
SVG almashtirilgach `npm run icons` buyrug'ini ishga tushiring (gate ham tekshiradi). `npm run check:assets` qaysi fayllar hali TMP ekanini ko'rsatadi.

## brand/
| Fayl | O'lcham / format | Talab | Qayerda |
|---|---|---|---|
| `icon.png` | 1024×1024 PNG, shaffofliksiz | Fon `#0B0D0F`, belgi markazda | iOS va asosiy ilova ikonkasi |
| `adaptive-foreground.png` | 1024×1024 PNG, shaffof | Belgi markazdagi 66 % ichida (chetlari kesiladi) | Android adaptive ikonka |
| `adaptive-monochrome.png` | 1024×1024 PNG, shaffof | Faqat oq silueti | Android 13+ temali ikonka |
| `splash-icon.png` | 1024×1024 PNG, shaffof | Faqat belgi (yozuvsiz), markazda | Tizim splash'i (fon `#0B0D0F` koddan) |
| `loading-bg.png` | 1290×2796 PNG | To'liq ekran fon: nur chiziqlari, **logotip va yozuvsiz** (ular ustidan qo'yiladi) | Ilova ichidagi yuklanish ekrani |
| `logo-full.svg` | SVG | Belgi + "U-HUB" + "VIEWER" | Yuklanish ekrani, juftlash ekrani, mijoz havolasi |
| `logo-mark.svg` | SVG | Faqat belgi | Ilova sarlavhasi, kichik joylar |
| `favicon.svg`, `favicon-48.png` | SVG, 48×48 PNG | | Mijozga ulashiladigan veb sahifa (V-2) |

**Muhim:** Android 12+ tizim splash'i faqat **markazdagi ikonkani** (doira ichida) ko'rsatadi, to'liq ekranli rasm qo'yib bo'lmaydi.
Shuning uchun dizayndagi splash (nur chiziqlari, logotip, progress chizig'i) **ikki qism** bo'ladi:
1) tizim splash'i: `splash-icon.png` va qora fon (bir lahzaga chiqadi);
2) darhol undan keyin ilovaning o'z yuklanish ekrani: `loading-bg.png` + `logo-full.svg` + haqiqiy yuklanishga bog'langan progress chizig'i.
Expo Go'da loyiha ikonkasi va tizim splash'i ko'rinmaydi (Expo Go o'zinikini ko'rsatadi). Ular faqat development yoki production build'da ko'rinadi.
Yuklanish ekrani Expo Go'da ham ko'rinadi.

## icons/ (maxsus, Lucide uslubida)
Har biri: SVG, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, yumaloq uchlar.
Rang ko'rsatilmaydi, `currentColor` bo'lishi shart (rangni kod beradi).
| Fayl | Ma'nosi |
|---|---|
| `door-open.svg` | Eshikni ochish (hotspot, karta tugmasi) |
| `door-close.svg` | Eshikni yopish |
| `drawer-open.svg` | Tortmani ochish |
| `drawer-close.svg` | Tortmani yopish |
| `open-all.svg` | Hammasini ochish/yopish (pastki panel) |
| `swing-zone.svg` | Ochilish zonalari (o'ng panel) |
| `hotspot.svg` | Ochish nuqtalarini yoqish/o'chirish (o'ng panel) |
| `cabinet.svg` | Buyum rasmi yo'q bo'lganda o'rnini bosuvchi (ro'yxatlarda) |

Qolgan ikonkalar **Lucide** to'plamidan olinadi, ularni chizish kerak emas: `scan-qr-code`, `ruler`, `box`, `rotate-ccw`, `layers`, `scan`, `rotate-3d`,
`flashlight`, `cloud-download`, `trash-2`, `chevron-left`, `x`, `settings`, `search`, `triangle-alert`, `smartphone`, `log-out`.

## illustrations/
SVG, `viewBox="0 0 320 240"`, faqat ikki rang: chiziqlar `#9AA3AD`, urg'u `#3988FF`. Fon shaffof.
| Fayl | Qayerda |
|---|---|
| `pair-scan.svg` | Juftlash ekrani: telefon kompyuterdagi QR'ni skanerlaydi |
| `ar-coach.svg` | AR boshida: "Telefonni polga qarating va sekin harakatlantiring" |
| `empty-projects.svg` | Loyihalar ro'yxati bo'sh |
| `empty-offline.svg` | Offline tab bo'sh |
| `camera-denied.svg` | Kamera ruxsati berilmagan (skaner) |
| `ar-unsupported.svg` | Qurilma yoki brauzer AR'ni qo'llamaydi |

## Holat (2026-11-04): Brand Kit v1 qo'yildi
Manba: `U-HUB-Mobile-Viewer-Brand-Kit-v1.zip`. Fayllar yuqoridagi nomlarga moslab qo'yildi. Brand Kit hujjatlari `assets/design/` papkasida.
Qo'shimcha fayllar: `brand/logo-mark-mono.svg`, `brand/wordmark.svg`, `brand/web/*` (PWA manifest, 192/512, favicon-16).

Tayyorlash vaqtida qilingan o'zgarishlar:
- `icon.png`: kit'dagi iOS ikonkasida shaffof piksellar bor edi. App Store bunday ikonkani qabul qilmaydi, shuning uchun `#0B0D0F` fonga yopishtirilib RGB qilindi.
- `icons/*.svg`: `stroke="#9AA3AD"` → `stroke="currentColor"`, rangni kod beradi. `hotspot.svg` dagi ko'k nuqta (`#3988FF`) o'zgarmadi.
- Nom moslashtirish: `cabinet-placeholder` → `cabinet`, `ar-guide` → `ar-coach`, `empty-ar` → `ar-unsupported`,
  `empty-camera` → `camera-denied`, `qr-pairing` → `pair-scan`.

Hali TMP qolgan: **`brand/loading-bg.png`**. Kit'da yuklanish ekrani foni yo'q.

## Holat (2026-11-06): yangi logotip — 3D kub (founder)
Manba: founder SVG'si "Минималистичный лаймово-белый 3D-куб на тёмном фоне" (VTracer, 1536×1024): "U" shaklidagi oq yon,
laym `#C1EF1B` yuqori tomon, ikki tortmali oq old tomon. Eski "U" + ko'k (`#3988FF`) belgi o'rniga.
- Fon (`#05060B`) va kuzatish qoldig'i olib tashlandi; oq → `#F3F5F6`, tortma tirqishlari → `#0B0D0F`.
- Almashtirildi: `logo-mark.svg`, `logo-mark-mono.svg` (tirqishlar — mask bilan teshik), `logo-full.svg` (matn o'sha),
  `favicon.svg`, `web/favicon.svg`; PNG'lar shulardan chizildi: `icon.png` (RGB), `adaptive-foreground.png`,
  `adaptive-monochrome.png`, `splash-icon.png`, `favicon-48.png`, `web/*.png`.
- Ilova aksent rangi (`#3988FF`, ilova temasi) o'zgarmadi — logoga moslash alohida qaror.
- Ikonka va splash yangi APK'da ko'rinadi (OTA bilan emas); ilova ichidagi `LogoFull`/`LogoMark` — OTA bilan ham.

Dizaynerga qaytariladigan izohlar:
1. `logo-full.svg` va `wordmark.svg` ichida `<text>` bor. Inter shrifti yuklanmagan joyda boshqa shrift chiqadi. Matnni **kontur (path)** ga aylantirish kerak.
2. `door-open` / `door-close` va `drawer-open` / `drawer-close` faqat kichik strelka bilan farq qiladi, 24 px da deyarli bir xil ko'rinadi. Holatni farqlash kerak: masalan ochiq holat ikonkasida eshik/tortma siljigan bo'lsin.
3. `empty-projects` va `ar-unsupported` dagi "+" belgisi "yaratish/qo'shish" ma'nosini beradi. Ilova faqat ko'rish uchun, shu sabab bu belgi chalg'itadi. `ar-unsupported` uchun "qo'llanmaydi" ma'nosidagi belgi kerak (kesilgan chiziq yoki undov).
4. Bo'sh holat rasmlarining to'rttasi 24×24 ikonka, illyustratsiya emas. Ishlatsa bo'ladi, kodda kattalashtirib ko'rsatiladi.
5. Ikonka chiziq qalinligi 1.8 px. Lucide ikonkalari ham ilovada `strokeWidth={1.8}` bilan chiziladi.
6. Holat ranglari kit tokenlaridan olinadi: success `#67C99A`, warning `#E9B45F`, danger `#ED8F8F`. Ular M-A4 dagi `#4CC38A` / `#F2C14E` o'rnini bosadi.
