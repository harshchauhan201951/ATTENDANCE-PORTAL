# RACER ACADEMY — Student Dashboard Reference UI Patch
# Safe, targeted UI-only patch. Run from the project root in PowerShell.
$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$layout = Join-Path $root "app\student\layout.tsx"
$dashboard = Join-Path $root "app\student\dashboard\page.tsx"
$css = Join-Path $root "app\globals.css"

foreach ($f in @($layout,$dashboard,$css)) {
    if (-not (Test-Path $f)) { throw "Required file not found: $f. Run this script from the RACER project root." }
}
Write-Host "`n--- RACER STUDENT DASHBOARD UI PATCH ---" -ForegroundColor Cyan
Write-Host "Project: $root"
Write-Host "`n--- PRE-CHECK ---" -ForegroundColor Yellow
git status --short
Write-Host "`nChecking existing student routes and UI anchors..."
$layoutText = Get-Content $layout -Raw
$dashText = Get-Content $dashboard -Raw
$cssText = Get-Content $css -Raw
foreach ($term in @("/student/attendance","/student/fees","/student/payments","/student/homework","/student/announcements","/student/quiz-tests/available","/student/monthly-result","/student/timetable","/student/notifications","/student/profile")) {
    $found = (Select-String -InputObject ($layoutText + "`n" + $dashText) -Pattern ([regex]::Escape($term)) -AllMatches).Matches.Count -gt 0
    $status = if ($found) { "FOUND" } else { "NOT FOUND" }; Write-Host ("{0} {1}" -f $status, $term)
}
# Safety backup of only the files this script may touch.
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "backup-student-dashboard-reference-ui-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item $layout (Join-Path $backup "layout.tsx")
Copy-Item $dashboard (Join-Path $backup "dashboard-page.tsx")
Copy-Item $css (Join-Path $backup "globals.css")
Write-Host "`nBackup created: $backup" -ForegroundColor Green

# Patch the existing mobile navigation only when its known anchor is present.
$oldNav = '(?s)const items = \[\s*\{ href: "/student/dashboard", label: "Home", icon: .*?\n\s*\]; // RACER_STUDENT_MOBILE_NAV_REFERENCE_V3'
$newNav = @'
const items = [
      { href: "/student/dashboard", label: "Home", icon: "home" },
      { href: "/student/dashboard#modules", label: "Modules", icon: "grid" },
      { href: "/student/notifications", label: "Notifications", icon: "bell" },
      { href: "/student/monthly-result", label: "Result", icon: "chart" },
      { href: "/student/profile", label: "Profile", icon: "user" },
    ]; // RACER_STUDENT_MOBILE_NAV_REFERENCE_V4
'@
if ($layoutText -match 'RACER_STUDENT_MOBILE_NAV_REFERENCE_V4') {
    Write-Host "Mobile navigation already has V4 marker; skipping nav replacement."
} elseif ($layoutText -match $oldNav) {
    $layoutText = [regex]::Replace($layoutText, $oldNav, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newNav }, 1)
    Set-Content -Path $layout -Value $layoutText -Encoding utf8
    Write-Host "Updated mobile navigation to 5 reference items."
} else {
    Write-Warning "Known V3 mobile nav array was not found. Navigation left unchanged; no guessed replacement made."
}

# Add responsive visual layer without deleting existing styles or business logic.
$marker = "/* RACER_STUDENT_DASHBOARD_REFERENCE_UI_V1 */"
if ($cssText.Contains($marker)) {
    Write-Host "Reference UI CSS already exists; skipping duplicate CSS."
} else {
$uiCss = @'

/* RACER_STUDENT_DASHBOARD_REFERENCE_UI_V1 */
:root {
  --racer-student-navy: #123c83;
  --racer-student-blue: #1767d2;
  --racer-student-yellow: #ffd52f;
  --racer-student-page: #f4f9ff;
}
html:has(.racer-student-fixed-header),
body:has(.racer-student-fixed-header) {
  max-width: 100%;
  overflow-x: clip;
}
.racer-student-fixed-header {
  position: sticky !important;
  top: 0;
  z-index: 1000;
  border-bottom: 3px solid var(--racer-student-yellow) !important;
  box-sizing: border-box;
}
.racer-mobile-appbar {
  max-width: 100%;
  box-sizing: border-box;
}
.racer-student-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  min-height: 38px;
  border-radius: 50%;
}
.racer-student-bell::after {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  top: 5px;
  right: 5px;
  border-radius: 50%;
  background: #ff3b4f;
  border: 2px solid #fff;
}
.racer-bottom-nav {
  position: fixed !important;
  z-index: 1100 !important;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  box-sizing: border-box;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  border-top: 3px solid var(--racer-student-yellow) !important;
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  background: #fff !important;
}
.racer-bottom-nav-item {
  min-width: 0;
  overflow: hidden;
  text-align: center;
  justify-content: center;
  gap: 3px;
  padding-left: 2px !important;
  padding-right: 2px !important;
  white-space: nowrap;
}
.racer-bottom-nav-item > span:last-child {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: clamp(9px, 2.7vw, 11px);
}
.racer-bottom-nav-item.active {
  color: var(--racer-student-blue) !important;
}
.student-dashboard-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: clip;
  padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
  background: var(--racer-student-page);
}
.student-dashboard-page *,
.student-dashboard-page *::before,
.student-dashboard-page *::after {
  box-sizing: border-box;
}
.student-hero {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border-radius: 20px !important;
  overflow: hidden;
}
.student-card-grid {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.student-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
@media (max-width: 430px) {
  .student-dashboard-page {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  .student-hero {
    min-height: 0 !important;
    padding: 16px !important;
  }
  .student-hero-side {
    width: auto !important;
    max-width: 34% !important;
  }
  .student-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
  .student-section-heading {
    justify-content: center;
    text-align: center;
  }
}
@media (max-width: 350px) {
  .student-dashboard-page {
    padding-left: 9px !important;
    padding-right: 9px !important;
  }
  .racer-bottom-nav-item > span:last-child {
    font-size: 9px;
  }
}
@media (min-width: 768px) {
  .student-dashboard-page {
    max-width: 1120px;
    margin-left: auto;
    margin-right: auto;
    padding-bottom: 32px !important;
  }
}
'@
    Add-Content -Path $css -Value $uiCss -Encoding utf8
    Write-Host "Added responsive dashboard UI layer to globals.css."
}

# Change dashboard section heading only if the exact existing phrase occurs.
$dashText = Get-Content $dashboard -Raw
if ($dashText -match 'RACER_STUDENT_MODULES_HEADING_V1') {
    Write-Host "Module heading marker already exists."
} elseif ($dashText -match 'Your Dashboard') {
    $dashText = $dashText -replace 'Your Dashboard', 'Quick Access'
    if ($dashText -notmatch 'id="modules"') {
        $dashText = [regex]::Replace($dashText, '<section>\s*(<div className="student-section-heading")', '<section id="modules">$1', 1)
    }
    $dashText = $dashText.Replace('className="student-section-heading"', 'className="student-section-heading" data-racer-student-modules-heading="RACER_STUDENT_MODULES_HEADING_V1"')
    Set-Content -Path $dashboard -Value $dashText -Encoding utf8
    Write-Host "Updated dashboard heading to Quick Access and added Modules anchor where the expected markup exists."
} else {
    Write-Warning "Dashboard heading anchor was not found; dashboard JSX was not changed."
}

Write-Host "`n--- TYPE CHECK ---" -ForegroundColor Yellow
& npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript check failed. Restore the three files from: $backup" -ForegroundColor Red
    throw "TypeScript check failed."
}
Write-Host "`n--- PRODUCTION BUILD ---" -ForegroundColor Yellow
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Restore the three files from: $backup" -ForegroundColor Red
    throw "Production build failed."
}
Write-Host "`n--- CHANGE SUMMARY ---" -ForegroundColor Yellow
git status --short
git diff --stat
Write-Host "`nPatch/build completed. Backup: $backup" -ForegroundColor Green
Write-Warning "Visual verification is still required. Check actual route destinations and the 10 dashboard module cards in the browser; this script deliberately does not invent or create routes, modules, student data, or backend logic."
