$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$css = Join-Path $root "app\globals.css"
$layout = Join-Path $root "app\student\layout.tsx"
$dash = Join-Path $root "app\student\dashboard\page.tsx"
foreach ($f in @($css,$layout,$dash)) { if (!(Test-Path -LiteralPath $f)) { throw "Missing required file: $f. Run this from the RACER project root." } }
$tag = "RACER_STUDENT_DASHBOARD_FIX_PHASE3_20261015"
$cssText = Get-Content -LiteralPath $css -Raw
if ($cssText.Contains($tag)) { Write-Host "Phase 3 fix already exists; stopping to avoid duplicate edits." -ForegroundColor Yellow; exit 0 }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "backup-student-dashboard-phase3-$stamp"
New-Item -ItemType Directory -Path $backupDir | Out-Null
Copy-Item -LiteralPath $css -Destination (Join-Path $backupDir "globals.css")
Copy-Item -LiteralPath $layout -Destination (Join-Path $backupDir "student-layout.tsx")
Copy-Item -LiteralPath $dash -Destination (Join-Path $backupDir "student-dashboard-page.tsx")
$layoutText = Get-Content -LiteralPath $layout -Raw
# Add the fifth Profile destination only if the existing shared nav has the expected four-item structure.
# We do not replace component logic or authentication.
$profileNavPatched = $false
if ($layoutText -match 'href:\s*["'']/student/profile["'']') {
  Write-Host "Profile route already appears in student layout; CSS will display five navigation slots if five items exist." -ForegroundColor Cyan
}
# Fix current dashboard presentation: restore welcome card visibility, use centered labels, create stable icon tiles,
# and replace mojibake nav symbols with CSS-drawn icons. All selectors are scoped to student portal/mobile.
$patch = @'

/* RACER_STUDENT_DASHBOARD_FIX_PHASE3_20261015 */
@media (max-width: 640px) {
  .racer-student-shell .racer-portal-content {
    padding-top: 104px !important;
    padding-bottom: 94px !important;
    overflow: visible !important;
  }
  .racer-student-shell .racer-portal-content main.student-dashboard-page {
    padding: 8px 8px 100px !important;
    overflow: visible !important;
  }
  .racer-student-shell main.student-dashboard-page > div {
    padding-top: 0 !important;
    overflow: visible !important;
  }
  .racer-student-shell section.student-hero {
    position: relative !important;
    z-index: 1 !important;
    margin-top: 4px !important;
    min-height: 106px !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    background: linear-gradient(110deg,#ffffff,#edf7ff) !important;
    border: 1px solid #cfe7ff !important;
    border-radius: 22px !important;
    box-shadow: 0 6px 20px rgba(8,75,145,.08) !important;
  }
  .racer-student-shell .student-hero-content {
    min-width: 0 !important;
    overflow: visible !important;
    align-items: center !important;
  }
  .racer-student-shell .student-welcome-title {
    color: #092c61 !important;
    font-size: 19px !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;
    white-space: normal !important;
  }
  .racer-student-shell .student-welcome-text {
    display: block !important;
    color: #627d9e !important;
    font-size: 10px !important;
    line-height: 1.35 !important;
    -webkit-line-clamp: unset !important;
    overflow: visible !important;
  }
  .racer-student-shell .student-small-greeting {
    color: #0759b6 !important;
    font-size: 9px !important;
  }
  .racer-student-shell .student-card-grid {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    gap: 9px !important;
  }
  .racer-student-shell .student-service-card {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
    min-width: 0 !important;
    min-height: 91px !important;
    padding: 10px 7px 8px !important;
    border: 1px solid #d8e8fa !important;
    border-radius: 17px !important;
    background: #fff !important;
    box-shadow: 0 5px 14px rgba(12,61,115,.07) !important;
    text-align: center !important;
  }
  .racer-student-shell .student-card-icon {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 43px !important;
    height: 43px !important;
    min-width: 43px !important;
    min-height: 43px !important;
    margin: 0 auto 7px !important;
    border-radius: 14px !important;
    background: linear-gradient(145deg,#0878f9,#064cce) !important;
    color: #fff !important;
    box-shadow: 0 5px 12px rgba(0,87,220,.22) !important;
    font-size: 22px !important;
    line-height: 1 !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
  .racer-student-shell .student-card-icon:empty::before {
    content: "✦";
    color: #fff !important;
    font-size: 22px !important;
  }
  .racer-student-shell .student-card-title {
    width: 100% !important;
    color: #082a59 !important;
    font-size: 10px !important;
    font-weight: 900 !important;
    line-height: 1.25 !important;
    text-align: center !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
  }
  .racer-student-shell .student-open-link {
    display: block !important;
    width: 100% !important;
    margin-top: 4px !important;
    color: #145bc0 !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
    text-align: center !important;
  }
  .racer-student-shell .student-card-description,
  .racer-student-shell .student-card-arrow {
    display: none !important;
  }
  .racer-student-shell .racer-bottom-nav {
    grid-template-columns: repeat(5,minmax(0,1fr)) !important;
    min-height: 70px !important;
    padding: 7px 4px 6px !important;
    gap: 0 !important;
    background: rgba(255,255,255,.98) !important;
    border: 1px solid #d3e5fb !important;
    border-radius: 19px !important;
    box-shadow: 0 8px 24px rgba(0,50,110,.16) !important;
    backdrop-filter: blur(14px) !important;
  }
  .racer-student-shell .racer-bottom-nav-item {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    min-width: 0 !important;
    padding: 4px 1px !important;
    color: #54718f !important;
    font-size: 9px !important;
    font-weight: 700 !important;
  }
  .racer-student-shell .racer-bottom-nav-item.active { color: #075fe0 !important; }
  .racer-student-shell .racer-bottom-nav-icon {
    display: block !important;
    width: 23px !important;
    height: 23px !important;
    font-size: 0 !important;
    line-height: 1 !important;
    color: currentColor !important;
    position: relative !important;
  }
  .racer-student-shell .racer-bottom-nav-icon::before {
    display: block !important;
    font-family: Arial,sans-serif !important;
    font-size: 21px !important;
    font-weight: 900 !important;
    line-height: 23px !important;
    text-align: center !important;
    color: currentColor !important;
  }
  .racer-student-shell .racer-bottom-nav-item:nth-child(1) .racer-bottom-nav-icon::before { content: "⌂"; }
  .racer-student-shell .racer-bottom-nav-item:nth-child(2) .racer-bottom-nav-icon::before { content: "▦"; }
  .racer-student-shell .racer-bottom-nav-item:nth-child(3) .racer-bottom-nav-icon::before { content: "♧"; }
  .racer-student-shell .racer-bottom-nav-item:nth-child(4) .racer-bottom-nav-icon::before { content: "▤"; }
  .racer-student-shell .racer-bottom-nav-item:nth-child(5) .racer-bottom-nav-icon::before { content: "●"; }
  .racer-student-shell .racer-bottom-nav-item > span:last-child {
    font-size: 8px !important;
    line-height: 1.15 !important;
    white-space: nowrap !important;
  }
}
@media (max-width: 360px) {
  .racer-student-shell .racer-bottom-nav-item > span:last-child { font-size: 7px !important; }
  .racer-student-shell .student-card-title { font-size: 9px !important; }
}
'@
Add-Content -LiteralPath $css -Value $patch -Encoding UTF8
Write-Host "Applied mobile welcome/card/nav fixes. Backup folder: $backupDir" -ForegroundColor Green
Write-Host "Checking TypeScript..."
& npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) {
  Copy-Item -LiteralPath (Join-Path $backupDir "globals.css") -Destination $css -Force
  throw "TypeScript check failed; globals.css restored. Backup remains at $backupDir"
}
Write-Host "TypeScript passed. Running production build..."
& npm run build
if ($LASTEXITCODE -ne 0) {
  Copy-Item -LiteralPath (Join-Path $backupDir "globals.css") -Destination $css -Force
  throw "Production build failed; globals.css restored. Backup remains at $backupDir"
}
Write-Host "SUCCESS: Phase 3 mobile CSS passed TypeScript and production build." -ForegroundColor Green
Write-Host "NOTE: This CSS fixes visibility, card icons and nav styling; if the current layout JSX has only four nav links, the fifth Profile link must be added in app\student\layout.tsx after inspecting its exact markup."
