$ErrorActionPreference = "Stop"
Set-Location "D:\RACER-ACADEMY\attendance-portal"
$layout = ".\app\student\layout.tsx"
$dash = ".\app\student\dashboard\page.tsx"
$css = ".\app\globals.css"
foreach ($f in @($layout,$dash,$css)) { if (!(Test-Path $f)) { throw "Required file missing: $f" } }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = ".\backup-student-mobile-nav-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
foreach ($f in @($layout,$dash,$css)) { Copy-Item $f (Join-Path $backup ([IO.Path]::GetFileName($f))) }
$enc = New-Object System.Text.UTF8Encoding($false)
$l = [IO.File]::ReadAllText((Resolve-Path $layout))
$oldItems = '(?s)const items = \[.*?\]; // RACER_STUDENT_MOBILE_NAV_REFERENCE_V3'
$newItems = @'
const items = [
  { href: "/student/dashboard", label: "Home", icon: "home" },
  { href: "/student/dashboard#modules", label: "Modules", icon: "grid" },
  { href: "/student/notifications", label: "Notifications", icon: "bell" },
  { href: "/student/monthly-result", label: "Results", icon: "chart" },
  { href: "/student/profile", label: "Profile", icon: "user" },
]; // RACER_STUDENT_MOBILE_NAV_REFERENCE_V4
'@
if ($l -notmatch $oldItems) { throw "Could not locate the expected mobile nav array; no files changed." }
$l = [regex]::Replace($l, $oldItems, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newItems }, 1)
$oldBell = '<Link href="/student/announcements" className="racer-appbar-action racer-student-bell" aria-label="Announcements">Notice</Link>'
$newBell = @'
<Link href="/student/notifications" className="racer-appbar-action racer-student-bell" aria-label="Notifications" title="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span className="racer-student-bell-dot" aria-hidden="true" /></Link>
'@.Trim()
if (!$l.Contains($oldBell)) { throw "Could not locate the expected mobile Notice link; no files changed." }
$l = $l.Replace($oldBell, $newBell)
$oldRender = '<span className="racer-bottom-nav-icon">{item.icon}</span><span>{item.label}</span>'
$newRender = @'
<span className="racer-bottom-nav-icon" aria-hidden="true">
                {item.icon === "home" ? <svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg> :
                 item.icon === "grid" ? <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> :
                 item.icon === "bell" ? <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg> :
                 item.icon === "chart" ? <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h17"/><rect x="7" y="11" width="3" height="5" rx="1"/><rect x="13" y="7" width="3" height="9" rx="1"/><rect x="19" y="3" width="2" height="13" rx="1"/></svg> :
                 <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>}
              </span><span>{item.label}</span>
'@.Trim()
if (!$l.Contains($oldRender)) { throw "Could not locate expected bottom-nav icon renderer; no files changed." }
$l = $l.Replace($oldRender, $newRender)
[IO.File]::WriteAllText((Resolve-Path $layout), $l, $enc)
$d = [IO.File]::ReadAllText((Resolve-Path $dash))
$oldSection = '<section>' + "`r`n" + '            <div' + "`r`n" + '              className="student-section-heading"'
$newSection = '<section id="modules">' + "`r`n" + '            <div' + "`r`n" + '              className="student-section-heading"'
if ($d.Contains($oldSection)) { $d = $d.Replace($oldSection,$newSection) } else {
  $oldSection = "<section>`n            <div`n              className=""student-section-heading"""
  $newSection = "<section id=""modules"">`n            <div`n              className=""student-section-heading"""
  if ($d.Contains($oldSection)) { $d = $d.Replace($oldSection,$newSection) } else { throw "Could not locate module section to add anchor; restoring backups." }
}
# Make the existing section heading match the requested module heading.
$d = $d.Replace(">Your Dashboard<", ">All Modules<")
[IO.File]::WriteAllText((Resolve-Path $dash), $d, $enc)
$g = [IO.File]::ReadAllText((Resolve-Path $css))
$marker = "/* RACER_STUDENT_MOBILE_REFERENCE_FIX_V4 */"
if (!$g.Contains($marker)) {
$mobileCss = @'

/* RACER_STUDENT_MOBILE_REFERENCE_FIX_V4 */
.racer-student-shell .racer-mobile-appbar.racer-student-fixed-header {
  position: sticky !important; top: 0 !important; z-index: 1000 !important;
  min-height: 66px !important; height: auto !important; padding: 9px 13px !important;
  box-sizing: border-box !important; border-bottom: 4px solid #f6c744 !important;
  overflow: visible !important;
}
.racer-student-shell .racer-student-header-brand-copy { min-width: 0 !important; }
.racer-student-shell .racer-student-header-brand-copy strong { display:block !important; line-height:1.2 !important; }
.racer-student-shell .racer-student-header-meta { display:block !important; white-space:normal !important; line-height:1.25 !important; }
.racer-student-shell .racer-student-bell {
  width: 42px !important; height: 42px !important; min-width:42px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  position:relative !important; border-radius:13px !important; color:#174a91 !important;
  background:#fff !important; border:1px solid #e1eaf6 !important; font-size:0 !important;
}
.racer-student-shell .racer-student-bell svg { display:block !important; width:22px !important; height:22px !important; }
.racer-student-shell .racer-student-bell-dot { position:absolute !important; right:7px !important; top:6px !important; width:7px !important; height:7px !important; border-radius:50% !important; background:#f5bd32 !important; border:1px solid #fff !important; }
.racer-student-shell .racer-bottom-nav {
  grid-template-columns:repeat(5,minmax(0,1fr)) !important; display:grid !important;
  padding:7px 4px calc(7px + env(safe-area-inset-bottom,0px)) !important;
  min-height:68px !important; box-sizing:border-box !important; gap:0 !important;
  border-top:3px solid #f6c744 !important; background:#fff !important;
}
.racer-student-shell .racer-bottom-nav-item {
  min-width:0 !important; padding:4px 1px !important; display:flex !important;
  flex-direction:column !important; align-items:center !important; justify-content:center !important;
  gap:4px !important; font-size:10px !important; line-height:1.1 !important;
  white-space:nowrap !important; text-decoration:none !important;
}
.racer-student-shell .racer-bottom-nav-icon {
  width:24px !important; height:24px !important; display:flex !important;
  align-items:center !important; justify-content:center !important; font-size:0 !important;
}
.racer-student-shell .racer-bottom-nav-icon svg {
  width:21px !important; height:21px !important; display:block !important;
  fill:none !important; stroke:currentColor !important; stroke-width:1.8 !important;
  stroke-linecap:round !important; stroke-linejoin:round !important;
}
.racer-student-shell .racer-bottom-nav-item.active { color:#1556a5 !important; font-weight:700 !important; }
@media (max-width:768px) {
  .racer-student-shell .racer-portal-content { padding-top:0 !important; }
  .racer-student-shell main.student-dashboard-page { padding:12px 12px 90px !important; }
  .racer-student-shell section.student-hero {
    display:block !important; width:100% !important; min-height:0 !important;
    height:auto !important; box-sizing:border-box !important; padding:16px !important;
    margin:0 0 14px !important; overflow:visible !important;
  }
  .racer-student-shell .student-hero-content { min-width:0 !important; width:100% !important; flex-wrap:wrap !important; }
  .racer-student-shell .student-welcome-title { overflow-wrap:anywhere !important; }
  .racer-student-shell .student-hero-side { width:100% !important; min-width:0 !important; margin:12px 0 0 !important; box-sizing:border-box !important; }
  .racer-student-shell .student-section-heading { display:flex !important; align-items:center !important; justify-content:center !important; position:relative !important; text-align:center !important; }
  .racer-student-shell .student-section-heading > div:first-child { text-align:center !important; margin-inline:auto !important; }
  .racer-student-shell .student-section-heading .student-service-count { position:absolute !important; right:0 !important; }
  .racer-student-shell #modules { scroll-margin-top:78px !important; }
}
'@
$g += "`r`n" + $mobileCss
[IO.File]::WriteAllText((Resolve-Path $css), $g, $enc)
}
Write-Host "Patch applied. Backup: $((Resolve-Path $backup).Path)" -ForegroundColor Green
Write-Host "`n--- TypeScript check ---"
npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) { throw "TypeScript failed. Restore from backup folder: $backup" }
Write-Host "`n--- Production build ---"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed. Restore from backup folder: $backup" }
Write-Host "`nSUCCESS: mobile navigation, bell, yellow accents and dashboard spacing patched." -ForegroundColor Green
