$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$css = Join-Path $root 'app\globals.css'
$dash = Join-Path $root 'app\student\dashboard\page.tsx'
$layout = Join-Path $root 'app\student\layout.tsx'
foreach ($p in @($css,$dash,$layout)) { if (!(Test-Path -LiteralPath $p)) { throw "Required file not found: $p. Run this from the RACER project root." } }
$tag = 'RACER_STUDENT_REFERENCE_DASHBOARD_PHASE2_20261015'
$existing = Get-Content -LiteralPath $css -Raw
if ($existing.Contains($tag)) { Write-Host 'Phase 2 styles already exist; no duplicate patch added.' -ForegroundColor Yellow; exit 0 }
$backup = "$css.before-$tag-$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item -LiteralPath $css -Destination $backup
$patch = @'

/* RACER_STUDENT_REFERENCE_DASHBOARD_PHASE2_20261015 */
@media (max-width: 600px) {
  .racer-student-shell { background:#f1f7fd !important; }
  .racer-student-shell .racer-mobile-appbar,
  .racer-student-shell .racer-student-fixed-header {
    min-height:72px !important; height:72px !important; padding:8px 14px !important;
    background:#064487 !important; background-image:linear-gradient(110deg,#064487,#073b79) !important;
    border:0 !important; box-shadow:0 3px 10px rgba(0,35,85,.2) !important;
  }
  .racer-student-shell .racer-appbar-logo { width:44px !important;height:44px !important;min-width:44px !important;border:2px solid #ffcc31 !important;background:#fff !important;color:#0750a0 !important; }
  .racer-student-shell .racer-student-header-brand-copy strong { color:#fff !important;font-size:16px !important;font-weight:900 !important;letter-spacing:.1px !important; }
  .racer-student-shell .racer-student-header-meta { color:#dceaff !important;font-size:10px !important;font-weight:800 !important; }
  .racer-student-shell .racer-student-header-logout { display:none !important; }
  .racer-student-shell .racer-student-bell { color:#fff !important;border-color:rgba(255,255,255,.3) !important; }
  .racer-student-shell .racer-student-content-area { padding:8px 7px 86px !important; }
  .racer-student-shell main.student-dashboard-page { background:#f1f7fd !important;padding:0 !important;margin:0 !important;min-height:calc(100dvh - 72px) !important; }
  .racer-student-shell main.student-dashboard-page > div { width:100% !important;max-width:100% !important;padding:0 7px 90px !important;margin:0 auto !important; }
  .racer-student-shell .student-navbar { display:none !important; }
  .racer-student-shell .student-hero { display:flex !important;min-height:96px !important;height:auto !important;margin:2px 0 9px !important;padding:10px 11px !important;border-radius:17px !important;border:1px solid #d7e8fa !important;background:#fff !important;box-shadow:0 4px 14px rgba(17,70,130,.07) !important; }
  .racer-student-shell .student-hero-content { display:flex !important;align-items:center !important;gap:10px !important;min-width:0 !important; }
  .racer-student-shell .student-avatar { width:54px !important;height:54px !important;min-width:54px !important;border-radius:50% !important; }
  .racer-student-shell .student-small-greeting { display:block !important;color:#0956a6 !important;font-size:8px !important;letter-spacing:.8px !important;margin:0 0 3px !important;font-weight:900 !important; }
  .racer-student-shell .student-welcome-title { color:#061e46 !important;font-size:19px !important;line-height:1.12 !important;margin:0 !important;font-weight:900 !important; }
  .racer-student-shell .student-welcome-text { color:#61758d !important;font-size:9px !important;line-height:1.35 !important;margin:4px 0 0 !important; }
  .racer-student-shell .student-hero-side { display:none !important; }
  .racer-student-shell .student-latest-announcement { display:none !important; }
  .racer-student-shell .student-announcement-section { margin:0 0 9px !important;padding:10px 11px !important;border-radius:14px !important;border:1px solid #d8e7f7 !important;background:#fff !important;box-shadow:0 3px 12px rgba(17,70,130,.06) !important; }
  .racer-student-shell .student-announcement-header { display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important;margin:0 !important; }
  .racer-student-shell .student-announcement-eyebrow { color:#1759a6 !important;font-size:7px !important;letter-spacing:1.1px !important;margin:0 0 2px !important; }
  .racer-student-shell .student-announcement-title { color:#071f48 !important;font-size:16px !important;line-height:1.15 !important;margin:0 !important; }
  .racer-student-shell .student-announcement-subtitle { color:#52677f !important;font-size:7px !important;margin:2px 0 0 !important; }
  .racer-student-shell .student-view-announcements { background:#0860d9 !important;color:#fff !important;padding:10px 12px !important;border-radius:9px !important;font-size:8px !important;font-weight:900 !important;white-space:nowrap !important; }
  .racer-student-shell .student-notice { display:none !important; }
  .racer-student-shell .student-section-heading { display:flex !important;align-items:center !important;justify-content:space-between !important;margin:9px 1px 7px !important; }
  .racer-student-shell .student-section-eyebrow { color:#0759b7 !important;font-size:6px !important;letter-spacing:1.3px !important; }
  .racer-student-shell .student-section-title { color:#08254d !important;font-size:17px !important;line-height:1.2 !important;margin:0 !important;font-weight:900 !important; }
  .racer-student-shell .student-service-count { background:#fff !important;color:#174b89 !important;border:1px solid #d9e7f6 !important;font-size:6px !important;padding:5px 7px !important;border-radius:8px !important; }
  .racer-student-shell .student-card-grid { display:grid !important;grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:8px 6px !important; }
  .racer-student-shell .student-service-card { display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:flex-start !important;min-width:0 !important;min-height:75px !important;padding:8px 3px 6px !important;border:1px solid #e1eaf5 !important;border-radius:12px !important;background:#fff !important;box-shadow:0 2px 8px rgba(18,65,115,.07) !important;text-align:center !important;overflow:hidden !important; }
  .racer-student-shell .student-card-top { display:flex !important;align-items:center !important;justify-content:center !important;position:static !important;min-height:0 !important;height:auto !important;width:100% !important;padding:0 !important;margin:0 0 5px !important;background:transparent !important;border:0 !important;box-shadow:none !important; }
  .racer-student-shell .student-card-icon { display:flex !important;align-items:center !important;justify-content:center !important;opacity:1 !important;visibility:visible !important;width:34px !important;height:34px !important;min-width:34px !important;border-radius:10px !important;font-size:17px !important;color:#fff !important;box-shadow:0 2px 5px rgba(0,0,0,.12) !important; }
  .racer-student-shell .student-card-arrow { display:none !important; }
  .racer-student-shell .student-card-body { width:100% !important;padding:0 !important;margin:0 !important;text-align:center !important; }
  .racer-student-shell .student-card-title { color:#09244a !important;font-size:7px !important;line-height:1.18 !important;font-weight:900 !important;overflow-wrap:anywhere !important; }
  .racer-student-shell .student-card-description { display:none !important; }
  .racer-student-shell .student-open-link { color:#1759a6 !important;font-size:6px !important;line-height:1.1 !important;margin-top:3px !important;font-weight:800 !important; }
  .racer-student-shell .student-bottom-panel { display:none !important; }
  .racer-student-shell .racer-bottom-nav { position:fixed !important;left:7px !important;right:7px !important;bottom:6px !important;z-index:9999 !important;width:auto !important;min-height:55px !important;padding:5px 3px !important;display:grid !important;grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:0 !important;transform:none !important;border:1px solid #d5e5f7 !important;border-radius:14px !important;background:#fff !important;box-shadow:0 5px 18px rgba(0,48,100,.15) !important; }
  .racer-student-shell .racer-bottom-nav-item { display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;gap:2px !important;min-width:0 !important;padding:3px 1px !important;color:#58718f !important;text-decoration:none !important; }
  .racer-student-shell .racer-bottom-nav-item.active { color:#075fe0 !important; }
  .racer-student-shell .racer-bottom-nav-icon { font-size:16px !important;line-height:1.1 !important; }
  .racer-student-shell .racer-bottom-nav-item > span:last-child { font-size:7px !important;line-height:1.1 !important; }
}
@media (max-width:360px) {
  .racer-student-shell .student-card-grid { gap:6px 4px !important; }
  .racer-student-shell .student-service-card { min-height:69px !important;padding:6px 2px 5px !important; }
  .racer-student-shell .student-card-icon { width:30px !important;height:30px !important;min-width:30px !important;font-size:15px !important; }
  .racer-student-shell .student-card-title { font-size:6.5px !important; }
}
'@
Add-Content -LiteralPath $css -Value $patch -Encoding UTF8
Write-Host "Applied targeted dashboard reference CSS. Backup: $backup" -ForegroundColor Green
Write-Host 'Running TypeScript check...'
& npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) { Copy-Item -LiteralPath $backup -Destination $css -Force; throw 'TypeScript check failed; original globals.css restored.' }
Write-Host 'TypeScript passed. Running production build...'
& npm run build
if ($LASTEXITCODE -ne 0) { Copy-Item -LiteralPath $backup -Destination $css -Force; throw 'Production build failed; original globals.css restored.' }
Write-Host 'SUCCESS: dashboard mobile layout patch passed TypeScript and production build.' -ForegroundColor Green
