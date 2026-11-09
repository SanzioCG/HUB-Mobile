# HUB-Mobile

U-HUB mobil viewer'i: iOS + Android ilova (Expo), three.js viewer va mock API.
Yagona manba — [kontrakt `uhub-mobile/1.10`](docs/contract/uhub-mobile-1.10.md) (asli: U-HUB `docs/mobile/VIEWER-CONTRACT.md`).
Nega alohida repo — [ADR-M001](docs/adr/ADR-M001-separate-repo.md).

## Struktura

```
apps/mobile/          Expo ilova (M-A1 da yaratiladi)
packages/viewer/      three.js viewer → bitta HTML bundle
mock/                 mock API server + fixtures
tools/sample-glb/     namunaviy GLB generatori (M-0)
scripts/check-mobile.ps1  gate
```

## Talablar

- Node 24 LTS (`.nvmrc`), npm 11+. Versiyalar `package.json` `engines` da.
- Windows: PowerShell 5.1+ (gate uchun).

## Ishga tushirish

```powershell
npm install
npm run fixtures      # GLB (R3, R5) + QR PNG'lar → mock/fixtures/
npm run mock          # mock API: http://0.0.0.0:8787 (port .env da)
npm run viewer        # viewer dev: http://localhost:5173
```

Gate (typecheck, lint, test, GLB + validator, viewer build):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-mobile.ps1 -Quiet
```
