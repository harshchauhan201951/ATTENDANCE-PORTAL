$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
if (!(Test-Path (Join-Path $root "app\student\layout.tsx"))) { throw "Open D:\RACER-ACADEMY\attendance-portal first." }
$cssPath = Join-Path $root "app\globals.css"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$cssPath.before-student-reference-ui-$stamp.bak"
Copy-Item -LiteralPath $cssPath -Destination $backup
$marker = "RACER ACADEMY student reference UI — CSS-only presentation layer; data/actions untouched"
if (Select-String -LiteralPath $cssPath -SimpleMatch $marker -Quiet) { Write-Host "Reference UI CSS already exists; no duplicate changes added."; exit 0 }
$blockPath = Join-Path $env:TEMP "racer_student_reference_mobile.css"
@'
/* RACER ACADEMY student reference UI — CSS-only presentation layer; data/actions untouched */
@media (max-width: 640px) {
  .racer-student-shell { background:#f3f8ff !important; color:#10284c !important; }
  .racer-student-shell .racer-mobile-appbar,
  .racer-student-shell .racer-student-fixed-header { position:fixed !important; inset:0 0 auto 0 !important; z-index:1000 !important; min-height:66px !important; padding:9px 14px !important; display:flex !important; align-items:center !important; gap:10px !important; background:linear-gradient(135deg,#06458b,#073777) !important; color:#fff !important; box-shadow:0 3px 12px #082c5826 !important; border:0 !important; }
  .racer-student-shell .racer-appbar-brand { min-width:0 !important; gap:10px !important; color:#fff !important; text-decoration:none !important; }
  .racer-student-shell .racer-appbar-logo { width:38px !important; height:38px !important; flex:0 0 38px !important; border:2px solid #ffd43b !important; border-radius:50% !important; overflow:hidden !important; background:#fff !important; }
  .racer-student-shell .racer-student-header-brand-copy strong { display:block !important; color:#fff !important; font-size:14px !important; line-height:1.15 !important; font-weight:900 !important; letter-spacing:.1px !important; }
  .racer-student-shell .racer-student-header-meta { display:block !important; color:#e3efff !important; font-size:10px !important; line-height:1.35 !important; white-space:nowrap !important; }
  .racer-student-shell .racer-student-header-actions { margin-left:auto !important; display:flex !important; align-items:center !important; gap:7px !important; }
  .racer-student-shell .racer-student-bell { width:32px !important; height:32px !important; display:grid !important; place-items:center !important; font-size:0 !important; border:0 !important; background:transparent !important; color:#fff !important; text-decoration:none !important; }
  .racer-student-shell .racer-student-bell:after { content:'♧' !important; font-size:23px !important; }
  .racer-student-shell .racer-student-header-logout { display:none !important; }
  .racer-student-shell .racer-student-desktop-header,
  .racer-student-shell .racer-student-desktop-sidebar,
  .racer-student-shell .racer-student-module-heading { display:none !important; }
  .racer-student-shell .racer-student-desktop-workspace { display:block !important; width:100% !important; margin:0 !important; padding:0 !important; }
  .racer-student-shell .racer-student-workarea { display:block !important; min-width:0 !important; width:100% !important; margin:0 !important; padding:0 !important; }
  .racer-student-shell .racer-student-content-area { width:100% !important; max-width:100% !important; min-width:0 !important; box-sizing:border-box !important; margin:0 !important; padding:76px 10px 88px !important; background:#f3f8ff !important; }
  .racer-student-shell .racer-bottom-nav { position:fixed !important; inset:auto 0 0 0 !important; z-index:1001 !important; display:grid !important; grid-template-columns:repeat(4,minmax(0,1fr)) !important; gap:0 !important; min-height:58px !important; padding:5px 4px max(5px,env(safe-area-inset-bottom)) !important; background:#fff !important; border-top:1px solid #dce8f7 !important; box-shadow:0 -3px 12px #092b5510 !important; }
  .racer-student-shell .racer-bottom-nav-item { display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; gap:2px !important; min-width:0 !important; padding:3px 1px !important; color:#526b89 !important; text-decoration:none !important; font-size:9px !important; line-height:1.1 !important; font-weight:700 !important; }
  .racer-student-shell .racer-bottom-nav-item.active { color:#0765d9 !important; }
  .racer-student-shell .racer-bottom-nav-icon { font-size:18px !important; line-height:1.1 !important; }
  .racer-student-shell .student-dashboard-page { width:100% !important; max-width:430px !important; margin:0 auto !important; padding:0 !important; background:transparent !important; color:#10284c !important; }
  .racer-student-shell .student-dashboard-page > div { width:100% !important; max-width:100% !important; margin:0 auto !important; padding:0 !important; }
  .racer-student-shell .student-navbar { display:none !important; }
  .racer-student-shell .student-hero { display:flex !important; flex-direction:column !important; gap:10px !important; margin:0 0 12px !important; padding:13px !important; border:1px solid #dceaff !important; border-radius:16px !important; background:#fff !important; color:#10284c !important; box-shadow:0 3px 12px #173e6810 !important; }
  .racer-student-shell .student-hero-content { display:flex !important; align-items:center !important; gap:10px !important; min-width:0 !important; }
  .racer-student-shell .student-avatar { width:48px !important; height:48px !important; flex:0 0 48px !important; border-radius:50% !important; overflow:hidden !important; }
  .racer-student-shell .student-welcome-title { font-size:16px !important; line-height:1.25 !important; color:#10284c !important; }
  .racer-student-shell .student-small-greeting,.racer-student-shell .student-welcome-text,.racer-student-shell .student-username { font-size:11px !important; line-height:1.4 !important; }
  .racer-student-shell .student-hero-side { display:none !important; }
  .racer-student-shell .student-latest-announcement { width:100% !important; margin:0 !important; padding:0 !important; }
  .racer-student-shell .student-card-grid { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:8px !important; }
  .racer-student-shell .student-card-grid > * { min-width:0 !important; border-radius:12px !important; }
  .racer-student-shell .student-dashboard-page h1,.racer-student-shell .student-dashboard-page h2,.racer-student-shell .student-dashboard-page h3 { color:#10284c !important; }
  .racer-student-shell .racer-student-content-area :is(input,select,textarea,button) { max-width:100% !important; box-sizing:border-box !important; }
  .racer-student-shell .racer-student-content-area :is(input,select,textarea) { border-radius:9px !important; }
  .racer-student-shell .racer-student-content-area :is(button,[role=button]) { touch-action:manipulation !important; }
  .racer-student-shell .racer-student-content-area :is(table) { width:100% !important; font-size:11px !important; }
  .racer-student-shell .racer-student-content-area :is(th,td) { padding:7px 6px !important; }
  .racer-student-shell .racer-student-content-area :is(.card,.student-card,.stat-card,[class*=card]) { border-radius:12px; }
}
@media (min-width: 641px) {
  .racer-student-shell .racer-mobile-appbar { display:none !important; }
}

'@ | Set-Content -LiteralPath $blockPath -Encoding utf8
Add-Content -LiteralPath $cssPath -Value "`r`n`r`n$(Get-Content -LiteralPath $blockPath -Raw -Encoding utf8)" -Encoding utf8
Write-Host "CSS-only student mobile UI added. Backup: $backup"
Write-Host "Running TypeScript validation..."
& npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) { Copy-Item -LiteralPath $backup -Destination $cssPath -Force; throw "TypeScript check failed; globals.css restored from backup." }
Write-Host "Running production build..."
& npm run build
if ($LASTEXITCODE -ne 0) { Copy-Item -LiteralPath $backup -Destination $cssPath -Force; throw "Build failed; globals.css restored from backup. Existing TSX/data/functions were not changed." }
Write-Host "SUCCESS: student mobile presentation CSS applied; existing page logic unchanged."
