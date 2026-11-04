<#
.SYNOPSIS
  HUB-Mobile gate: typecheck, lint, testlar, GLB generatsiya + gltf-validator (m0-heavy, extensionsUsed), viewer build.
.DESCRIPTION
  Qadamlar ketma-ket; birinchi xatoda to'xtaydi va nol bo'lmagan exit code qaytaradi.
.PARAMETER Quiet
  Buyruqlar chiqishini yashiradi; faqat qadam natijasi. Xato bo'lsa o'sha qadam chiqishi ko'rsatiladi.
#>
param([switch]$Quiet)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Step([string]$Name, [string]$Command) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  if ($Quiet) {
    # cmd orqali: PowerShell 5.1 native stderr'ni xato yozuviga aylantirmasin.
    $out = & cmd.exe /d /c "$Command 2>&1"
  } else {
    Write-Host "==> $Name" -ForegroundColor Cyan
    & cmd.exe /d /c $Command
  }
  $code = $LASTEXITCODE
  $sec = '{0:N1}s' -f $sw.Elapsed.TotalSeconds
  if ($code -ne 0) {
    if ($Quiet) { $out | ForEach-Object { Write-Host $_ } }
    Write-Host "FAIL  $Name ($sec, exit $code)" -ForegroundColor Red
    exit $code
  }
  Write-Host "ok    $Name ($sec)" -ForegroundColor Green
}

Invoke-Step 'typecheck' 'npm run typecheck'
Invoke-Step 'lint' 'npm run lint && npm run format:check'
# M-A6: apps/mobile/src/ui/generated assets/ bilan mos (eskirgan bo'lsa: "npm run icons ni ishga tushiring").
Invoke-Step 'ikonkalar (assets/)' 'npm run icons -- --check'
Invoke-Step 'test' 'npm test'
# M-A7: haqiqiy .uhub testlari (packages/viewer/test/real-uhub.test.ts) — ixtiyoriy; fayl repoga kirmaydi.
if ($env:UHUB_REAL_FILE -and (Test-Path $env:UHUB_REAL_FILE)) {
  Write-Host "ok    haqiqiy .uhub testlari: $env:UHUB_REAL_FILE" -ForegroundColor Green
} else {
  Write-Host 'skip  haqiqiy .uhub testlari (UHUB_REAL_FILE berilmagan)' -ForegroundColor Yellow
}
Invoke-Step 'GLB generatsiya + QR' 'npm run fixtures'
Invoke-Step 'gltf-validator' 'npm run validate -w @hub-mobile/sample-glb'

# M-A3: har reviziyaning AR varianti (animatsiyasiz) ham yaratilgan va validatordan o'tgan bo'lishi kerak.
$glbDir = Join-Path $root 'mock/fixtures/glb'
$arFiles = @(Get-ChildItem -Path $glbDir -Filter '*-ar.glb' -File -ErrorAction SilentlyContinue)
# M-A4: m0-heavy.glb — og'ir namuna (o'lchov uchun), AR varianti yo'q.
$mainFiles = @(Get-ChildItem -Path $glbDir -Filter '*.glb' -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '*-ar.glb' -and $_.Name -ne 'm0-heavy.glb' })
if ($arFiles.Count -eq 0 -or $arFiles.Count -ne $mainFiles.Count) {
  Write-Host "FAIL  AR GLB: $($mainFiles.Count) asosiy, $($arFiles.Count) AR varianti" -ForegroundColor Red
  exit 1
}
Write-Host "ok    AR GLB: $($arFiles.Name -join ', ')" -ForegroundColor Green
# M-A4: og'ir namuna mavjud; validator qadami uni ham tekshiradi va extensionsUsed bo'sh bo'lmasa yiqiladi.
$heavy = Join-Path $glbDir 'm0-heavy.glb'
if (-not (Test-Path $heavy)) {
  Write-Host 'FAIL  m0-heavy.glb yaratilmagan' -ForegroundColor Red
  exit 1
}
$mb = '{0:N1}' -f ((Get-Item $heavy).Length / 1MB)
Write-Host "ok    m0-heavy.glb ($mb MB, extensionsUsed yo'q)" -ForegroundColor Green
Invoke-Step 'viewer build' 'npm run build -w @hub-mobile/viewer'

$dist = Join-Path $root 'packages/viewer/dist'
$files = @(Get-ChildItem -Path $dist -Recurse -File)
if ($files.Count -ne 1 -or $files[0].Name -ne 'index.html') {
  Write-Host "FAIL  viewer bundle: bitta index.html kutilgan, topildi: $($files.Name -join ', ')" -ForegroundColor Red
  exit 1
}
$kb = '{0:N1}' -f ($files[0].Length / 1KB)
Write-Host "ok    viewer bundle: packages/viewer/dist/index.html ($kb KB)" -ForegroundColor Green

# ---- apps/mobile (M-A1) ----
Invoke-Step 'mobile typecheck' 'npm run types -w @hub-mobile/mobile'
Invoke-Step 'mobile lint' 'npm run lint -w @hub-mobile/mobile'
Invoke-Step 'mobile jest' 'npm run jest -w @hub-mobile/mobile'
Invoke-Step 'expo-doctor' 'npm run doctor -w @hub-mobile/mobile'
Invoke-Step 'viewer asset nusxasi' 'npm run copy-viewer -w @hub-mobile/mobile'

$asset = Join-Path $root 'apps/mobile/assets/viewer/viewer.html'
if (-not (Test-Path $asset)) {
  Write-Host "FAIL  viewer asset yo'q: apps/mobile/assets/viewer/viewer.html" -ForegroundColor Red
  exit 1
}
$assetLen = (Get-Item $asset).Length
if ($assetLen -ne $files[0].Length) {
  Write-Host "FAIL  viewer asset hajmi dist bilan mos emas ($assetLen != $($files[0].Length))" -ForegroundColor Red
  exit 1
}
$akb = '{0:N1}' -f ($assetLen / 1KB)
Write-Host "ok    viewer asset: apps/mobile/assets/viewer/viewer.html ($akb KB)" -ForegroundColor Green
Write-Host 'check-mobile: hammasi o''tdi' -ForegroundColor Green
exit 0
