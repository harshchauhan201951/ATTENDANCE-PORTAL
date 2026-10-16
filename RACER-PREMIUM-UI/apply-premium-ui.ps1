<#
  RACER ACADEMY - PREMIUM UI INSTALLER

  Kaise chalana hai (VS Code terminal / PowerShell, apne project folder me):
      powershell -ExecutionPolicy Bypass -File .\RACER-PREMIUM-UI\apply-premium-ui.ps1

  Options:
      -NoRun                   changes lagao, par npm run dev mat chalao
      -ProjectPath "D:\proj"   project folder khud batao (jaha package.json aur app\ folder hai)
      -Restore "<backup dir>"  pehle wali files wapas laao (undo)

  Ye script sirf 3 files touch karti hai:
      app\racer-premium-ui.css          (NAYI file - design layer)
      app\layout.tsx                    (css import + font + page title)
      app\teacher\dashboard\page.tsx    (fake numbers hataye, real date/time/modules)
  Har purani file ka backup pehle _backup_premium_ui_<time> folder me banta hai.
#>
param(
  [string]$ProjectPath = "",
  [switch]$NoRun,
  [switch]$Force,
  [string]$Restore = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$filesDir  = Join-Path $scriptDir "files"

# Jo 2 existing files replace hoti hain, unka original (jo aapne zip me bheja tha) SHA256.
# Agar aapki local file alag hai, to script pehle poochegi.
$expected = @{
  "app\layout.tsx"                 = "AEC6963239B39D06FEAD81E621BF814CEA175F0E45CFD221A8687E4B5277BFBB"
  "app\teacher\dashboard\page.tsx" = "22252F93096634E3379ABB42F1B8437ACB99B0C346A2642A86CB7AFA65F34236"
}

function Test-ProjectFolder([string]$p) {
  if (-not $p) { return $false }
  $pkg = Join-Path $p "package.json"
  if (-not (Test-Path -LiteralPath $pkg)) { return $false }
  if (-not (Test-Path -LiteralPath (Join-Path $p "app"))) { return $false }
  $txt = Get-Content -LiteralPath $pkg -Raw
  return ($txt -match '"next"')
}

# ---------- project folder dhundo ----------
if (-not $ProjectPath) {
  $cwd = (Get-Location).Path
  $parent = Split-Path -Parent $scriptDir
  if (Test-ProjectFolder $cwd) { $ProjectPath = $cwd }
  elseif (Test-ProjectFolder $parent) { $ProjectPath = $parent }
}
if (-not (Test-ProjectFolder $ProjectPath)) {
  Write-Host ""
  Write-Host "ERROR: Project folder nahi mila." -ForegroundColor Red
  Write-Host "PowerShell ko apne project folder (jaha package.json aur app folder hai) me kholo,"
  Write-Host "ya ye likho:  -ProjectPath ""D:\apna\project"""
  exit 1
}
$ProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
Write-Host "Project: $ProjectPath" -ForegroundColor Cyan

# ---------- RESTORE mode ----------
if ($Restore) {
  $bk = (Resolve-Path -LiteralPath $Restore).Path
  $manifestPath = Join-Path $bk "manifest.json"
  if (-not (Test-Path -LiteralPath $manifestPath)) { Write-Host "ERROR: manifest.json nahi mila: $bk" -ForegroundColor Red; exit 1 }
  $m = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  foreach ($rel in @($m.backed)) {
    $from = Join-Path $bk $rel
    $to = Join-Path $ProjectPath $rel
    Copy-Item -LiteralPath $from -Destination $to -Force
    Write-Host "  wapas rakha: $rel"
  }
  foreach ($rel in @($m.created)) {
    $p = Join-Path $ProjectPath $rel
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Write-Host "  hataya: $rel" }
  }
  Write-Host "Restore ho gaya. Ab layout.tsx purana hai, design layer hat gayi." -ForegroundColor Green
  exit 0
}

if (-not (Test-Path -LiteralPath $filesDir)) { Write-Host "ERROR: 'files' folder script ke saath nahi mila." -ForegroundColor Red; exit 1 }

# ---------- pehle check: aapki files wahi hain jo humne dekhi thi? ----------
$diff = @()
foreach ($key in $expected.Keys) {
  $cur = Join-Path $ProjectPath $key
  if (Test-Path -LiteralPath $cur) {
    $h = (Get-FileHash -Algorithm SHA256 -LiteralPath $cur).Hash
    if ($h -ne $expected[$key]) { $diff += $key }
  } else {
    $diff += ($key + " (nahi mili)")
  }
}
if ($diff.Count -gt 0 -and -not $Force) {
  Write-Host ""
  Write-Host "DHYAN DO: ye files us version se alag hain jo chat me upload hua tha:" -ForegroundColor Yellow
  $diff | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
  Write-Host "Aage badhne par ye files replace hongi (backup pehle banega, to wapas aa sakti hain)."
  $ans = Read-Host "Aage badhein? (y/n)"
  if ($ans -ne "y" -and $ans -ne "Y") { Write-Host "Roka gaya. Kuch change nahi hua."; exit 0 }
}

# ---------- backup + copy ----------
$stamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $ProjectPath ("_backup_premium_ui_" + $stamp)
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$backed  = @()
$created = @()
$prefixLen = $filesDir.Length

foreach ($srcFile in (Get-ChildItem -LiteralPath $filesDir -Recurse -File)) {
  $rel  = $srcFile.FullName.Substring($prefixLen).TrimStart('\','/')
  $dest = Join-Path $ProjectPath $rel
  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path -LiteralPath $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }

  if (Test-Path -LiteralPath $dest) {
    $bkFile = Join-Path $backup $rel
    $bkDir  = Split-Path -Parent $bkFile
    if (-not (Test-Path -LiteralPath $bkDir)) { New-Item -ItemType Directory -Force -Path $bkDir | Out-Null }
    Copy-Item -LiteralPath $dest -Destination $bkFile -Force
    $backed += $rel
  } else {
    $created += $rel
  }
  Copy-Item -LiteralPath $srcFile.FullName -Destination $dest -Force
  Write-Host "  lagaya: $rel"
}

$manifest = @{ created = @($created); backed = @($backed); time = $stamp }
($manifest | ConvertTo-Json) | Set-Content -LiteralPath (Join-Path $backup "manifest.json") -Encoding UTF8

# ---------- sanity check ----------
$layout = Join-Path $ProjectPath "app\layout.tsx"
if (-not (Select-String -LiteralPath $layout -Pattern "racer-premium-ui.css" -Quiet)) {
  Write-Host "WARNING: layout.tsx me design css import nahi dikha. Restore karke dobara try karo." -ForegroundColor Yellow
}
if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath ".env.local"))) {
  Write-Host "WARNING: .env.local nahi mili. Supabase keys ke bina app data load nahi karega. Apni purani .env.local project me rakho." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Design lag gaya." -ForegroundColor Green
Write-Host "Backup folder : $backup"
Write-Host "Undo karne ke liye:  powershell -ExecutionPolicy Bypass -File .\RACER-PREMIUM-UI\apply-premium-ui.ps1 -Restore ""$backup"""
Write-Host ""

if ($NoRun) { Write-Host "-NoRun diya hai, isliye npm run dev nahi chalaya."; exit 0 }

# ---------- npm ----------
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: npm nahi mila. Pehle Node.js install karo (https://nodejs.org)." -ForegroundColor Red
  exit 1
}
Push-Location $ProjectPath
try {
  if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath "node_modules"))) {
    Write-Host "node_modules nahi mila, npm install chal raha hai (kuch minute lagenge)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install fail hua" }
  }
  Write-Host "npm run dev shuru ho raha hai. Browser me http://localhost:3000 kholo. Band karne ke liye Ctrl+C." -ForegroundColor Cyan
  npm run dev
}
finally {
  Pop-Location
}
