# HUB-Mobile ↔ U-HUB — modellar qanday keladi (dasturchi uchun)

Holat: 2026-11-03. Manba: U-HUB architect. Format va API'ning yagona manbasi — `docs/mobile/VIEWER-CONTRACT.md`
(`uhub-mobile/1.3`). Bu hujjat — o'sha kontraktning "qanday ishlaydi" tushuntirishi; ziddiyat bo'lsa kontrakt ustun.

## 1. Hozirgi holat (halol)
| Narsa | Holat |
|---|---|
| U-HUB backend (FastAPI) | Founder kompyuterida, `127.0.0.1:8000`; frontend `127.0.0.1:5173` |
| GLB eksport (V-1) | **Hali yo'q.** Navbatda: FIX-3 → UI-2 → SET-2 → C-2a-fix → **V-1** |
| `/mobile/*` endpointlar | **Hali yo'q** — V-1 bilan birga |
| Desktop "Telefonni ulash" | Hali yo'q — V-1 bilan birga |
| Server internetda (VPS) | Yo'q — DEP-1 (keyin) |
Shuning uchun hozir **faqat mock** (`mobile/mock/`) bilan ishlang. Mock kontrakt bo'yicha bo'lsa, V-1 tayyor
bo'lganda ilovada faqat server manzili o'zgaradi.

## 2. Model qayerdan paydo bo'ladi (U-HUB ichida)
```
Loyiha (ish nusxasi) ──saqlash──► Reviziya (o'zgarmas, ADR-002)
                                      │
                 V-1 eksporteri (backend, ADR-021 registr)
                                      │  har buyum (shkaf) uchun
                                      ▼
   geometriya (backend hisoblaydi, ADR-001) + materiallar katalogi (dekor teksturalari)
   + furnitura modellari (Blum va b., ishlab chiqaruvchi modelidan soddalashtirilgan)
   + animatsiyalar (eshik, tortma) + detal ma'lumoti (extras.uhub)
                                      │
                                      ▼
             <revision_id>.glb   (+ keyin .usdz, thumb.jpg)
                                      │
                       /mobile API orqali beriladi
```
- GLB **reviziya bo'yicha bir marta** yasaladi va o'zgarmaydi → URL ham o'zgarmaydi → ilova uni abadiy keshlaydi.
- Ilova geometriya, o'lcham, burchak, yurish — **hech narsani hisoblamaydi**. Faqat ko'rsatadi va kliplarni ijro etadi.

## 3. Ulanish
1. Founder desktopda: Fayl → Sozlamalar → "Telefonni ulash" → 6 raqamli kod + QR (5 daqiqa amal qiladi).
2. Ilova QR'ni skanerlaydi: `uhub-pair:1?server=…&code=…` → server manzilini saqlaydi →
   `POST <server>/mobile/pair {code}` → `device_token`.
3. Keyingi hamma so'rovlar: `Authorization: Bearer <device_token>`.
4. Loyihalar: `GET /mobile/projects` → buyumlar: `GET /mobile/projects/{id}` → har buyumda `glb_url`.
5. GLB'ni yuklab, `revision_id` bo'yicha keshga yozing va viewer'ga bering.
6. Etiketka QR'i: `GET /mobile/resolve?qr=…` (kontrakt 6-bo'lim).

**Tarmoq:**
- **Sinov (hozir, mock bilan ham):** telefon va kompyuter bitta Wi-Fi'da. Server `0.0.0.0` da ishga tushadi;
  Windows firewall'da port ochiladi (tizim sozlamasi — faqat founder ruxsati bilan). Manzil: `http://<kompyuter IP>:<port>`.
  Expo'da LAN HTTP uchun: Android `usesCleartextTraffic` faqat dev build'da; iOS ATS istisnosi faqat dev.
- **Ish (keyin):** VPS, `https://api.<domen>` (DEP-1). Production build'da HTTP taqiqlangan.

## 4. Materiallar qanday keladi
Hammasi GLB ichida (kontrakt 2.5). Ilova uchun qisqacha:
- three.js `GLTFLoader` — **qo'shimcha sozlamasiz**: faqat glTF core, kengaytmalar yo'q.
- Renderer: `outputColorSpace = SRGBColorSpace`, tone mapping ACES yoki Neutral, ekspozitsiya 1.0;
  yorug'lik — `RoomEnvironment` (PMREM) + bitta yo'naltirilgan yorug'lik soya bilan. Shunda LDSP/MDF/metall
  desktop U-HUB'dagiga yaqin ko'rinadi.
- Har panel: yuzalar — plita/qoplama materiali, qirralar — kromka materiali (alohida primitive). Tanlash konturi
  butun detal tuguniga qo'yiladi, primitive'ga emas.
- Tola yo'nalishi va tekstura masshtabi UV'da tayyor — tekstura `repeat`/`rotation` ga tegmang.
- Material ma'lumoti (kartada ko'rsatish uchun): detal `extras.uhub.material` (matn) va material `extras.uhub`
  (kod, ishlab chiqaruvchi, tur, qalinlik).
- Shisha — `BLEND`; tanlov rejimida boshqa detallarni yarim shaffof qilganda (opacity ≈ 0.15) material
  nusxasini oling, asl materialni o'zgartirmang (bir material ko'p detalda ishlatiladi).

## 5. Hozir nima qilish kerak (M-A1)
1. Mock'ni **1.3** ga yangilang: namunaviy GLB'da
   - kamida 2 xil dekor (LDSP tekstura bilan, bo'yalgan MDF rangi bilan), kromka primitive'lari;
   - furnitura (metall), bitta shisha detal;
   - material `extras.uhub`; tola yo'nalishi bir detalda 90° burilgan (UV tekshiruvi uchun).
2. Juftlash: QR (`uhub-pair:`) + qo'lda kiritish (server manzili + kod). Mock desktop QR'i — PNG.
3. Viewer: 4-bo'limdagi renderer sozlamalari; tanlov shaffofligi material nusxasi bilan.
4. Telefonda LAN orqali mock'ka ulanish — founder telefoni bilan tekshiriladi.
5. Hisobotda: GLB ochilish vaqti (15 MB), xotira, FPS (founder telefoni).

## 6. Haqiqiy modellar qachon
V-1 (U-HUB) tayyor bo'lganda: "M-0 namuna" (eshik + 3 tortma) va "M-1 namuna" GLB'lari, LAN orqali haqiqiy
`/mobile` API. Kontrakt o'zgarsa — faqat `VIEWER-CONTRACT.md` orqali, versiya oshadi.

## 7. Cheklovlar
- Mijoz shaxsiy ma'lumotlari ilovaga kelmaydi va logga yozilmaydi.
- Token, server manzili — faqat `expo-secure-store`. `.env` va kalitlar repo'ga kirmaydi.
- SmartWOP ikonkalari/rasmlari ishlatilmaydi; uchinchi tomon logolari ilovada yo'q.
