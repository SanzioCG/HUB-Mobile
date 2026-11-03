# mock — U-HUB mobil API mock'i

Kontrakt `uhub-mobile/1.2` (qoralama), 4-bo'lim. Fastify, `0.0.0.0:8787`.

```powershell
npm run fixtures   # GLB (R3, R5 + AR variantlari) va QR etiketkalar
npm run mock       # http://<IP>:8787 — konsolda LAN manzili
```

- Juftlash kodi: `123456`. Doimiy dev token: `Bearer dev-token` (`MOCK_DEV_TOKEN`).
- Etiketkalar (ekrandan skanerlash uchun): `http://<IP>:8787/dev/qr`.
- Sozlamalar: `mock/.env` (namuna — `.env.example`). `.env` commit qilinmaydi.

## AR uchun HTTPS (Scene Viewer)

Scene Viewer fayl URL'ini faqat **HTTPS** orqali qabul qiladi. LAN'dagi `http://` mock bilan AR ochilmaydi.
Sinov uchun bepul Cloudflare tunnel (hisob shart emas):

1. `cloudflared` ni o'rnating: `winget install --id Cloudflare.cloudflared`.
2. Mock ishlab turganda boshqa terminalda:
   ```powershell
   cloudflared tunnel --url http://localhost:8787
   ```
   Konsolda `https://<tasodifiy-nom>.trycloudflare.com` manzili chiqadi.
3. `mock/.env` ga yozing va mock'ni qayta ishga tushiring:
   ```
   MOCK_PUBLIC_URL=https://<tasodifiy-nom>.trycloudflare.com
   ```
4. `POST /mobile/ar-link` endi imzolangan havolani shu HTTPS manzil bilan qaytaradi
   (`https://…/files/ar/<revision_id>-ar.glb?exp=…&sig=…`). Ilova o'zi LAN orqali ishlashda davom etadi.

Kod tunnelga bog'lanmagan — faqat `MOCK_PUBLIC_URL` sozlamasi. Tunnel manzili har ishga tushirishda o'zgaradi.

**Zaxira sahifa** `GET /ar/launch?file=<imzolangan havola>&title=…` (tokensiz): ilova Scene Viewer'ni to'g'ridan-to'g'ri
ocha olmasa, shu sahifani brauzerda ochadi; "AR'da ochish" tugmasi Google hujjatidagi
`intent://arvr.google.com/scene-viewer/1.0?…#Intent;scheme=https;package=com.google.android.googlequicksearchbox;…;end;`
havolasini ochadi. Faqat shu serverning `/files/ar/` HTTPS havolalari qabul qilinadi. Kontraktda yo'q — taklif.

## AR varianti

`<revision_id>-ar.glb` — animatsiyasiz, yopiq holat, o'sha geometriya va materiallar
(`tools/sample-glb`, `buildM0(rev, { ar: true })`). Scene Viewer bir nechta klipdan faqat birinchisini o'ynatadi
va validatori buni xato deb belgilaydi, shuning uchun AR uchun alohida fayl. Kontraktda yo'q — taklif (M-A3 hisoboti).
`format: "usdz"` → 404 (mock'da USDZ yo'q, V-1b).
