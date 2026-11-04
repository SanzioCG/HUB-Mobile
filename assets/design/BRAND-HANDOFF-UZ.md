# U-HUB Mobile Viewer — Brand & Icon Handoff v1.0

## Brend yo‘nalishi
- Fon: #0B0D0F; panel: #15181C; surface: #22262B.
- Asosiy aksent: #3988FF. Violet #6A5CFF va cyan #00C2FF faqat ikkilamchi, juda kam ishlatiladi.
- Matn: #F3F5F6; ikkilamchi matn: #9AA3AD.
- Logo flat-vector: soya, 3D, glass va gradient yo‘q. U-HUB wordmark; VIEWER ikkilamchi descriptor.
- Inter — UI; DM Mono — o‘lchamlar va texnik qiymatlar.

## Paket tarkibi
- `brand/`: asosiy SVG logo, belgi, wordmark va monochrome belgi.
- `app-icons/ios/AppIcon-1024.png`: opaque 1024×1024 iOS app icon master.
- `app-icons/android/`: adaptive foreground PNG, monochrome PNG, background rang va XML namunasi.
- `app-icons/splash-mark-1024.png`: shaffof mark; native splash fonini #0B0D0F qilib sozlang.
- `app-icons/web/`: favicon SVG/16/48 PNG, PWA manifest va 192/512 PNG.
- `icons/custom/`: 8 ta mebelga xos 24×24 SVG ikonka.
- `illustrations/`: QR pairing, AR guide, loyiha yo‘q, offline, kamera ruxsati, AR qo‘llanmaydi.
- `docs/lucide-icon-mapping.csv`: standart ikonkalarning Lucide nomlari.
- `docs/design-tokens.json`: rang va ikonka tokenlari.

## Platforma eslatmalari
- iOS app icon 1024×1024 opaque; burchaklarni tizim yumaloqlaydi.
- Android adaptive foreground shaffof; background alohida #0B0D0F. Mask turiga qarab chetlar kesilishi mumkin.
- Android monochrome asset oq siluet va shaffof fon.
- Splash mark shaffof PNG. Progress indikatorini rasmga pishirmang; native loading holatiga bog‘lang.
- PWA manifestdagi icon yo‘llari `/icons/app-icon-192.png` va `/icons/app-icon-512.png` sifatida ko‘rsatilgan; deploy vaqtida shu fayllarni `/icons/` ostiga joylang.

## Lucide mapping
Standart ikonkalarning 17 tasi `lucide-icon-mapping.csv` da berilgan. Ularni qayta chizish shart emas. React Native loyihasida lucide-react-native paketini ishlating va versiyasini lockfile’da mahkamlang.

## Qabul tekshiruvi
- 16/24/32/48 px o‘lchamlarda belgi o‘qilishi.
- Android circle/squircle/rounded-square adaptive mask sinovi.
- iOS home screen ikonka sinovi.
- Android 13+ themed monochrome ikonka sinovi.
- SVG rendering tanlangan React Native SVG kutubxonasida tekshirilishi.
- O‘zbek lotin va kirill shrift glyph sinovi.
- Logo yakuniy geometriyasi va huquqiy tozaligi asoschi tomonidan tasdiqlanishi.

## Chegara
Bu paket dizayn assetlari va integratsiya namunalarini beradi. Mobil ilova kodi, AR, GLB yuklash, API, native splash wiring yoki store submission'ni amalga oshirmaydi. Store banner/screenshotlar real ilova ekranlari tayyor bo‘lgach olinadi.
