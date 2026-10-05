$ErrorActionPreference = "Stop"

$root = "C:\Users\User\attendance-portal"
$pagePath = Join-Path $root "app\teacher\attendance\page.tsx"
$cssPath = Join-Path $root "app\globals.css"

if (-not (Test-Path $pagePath)) { throw "Attendance page not found: $pagePath" }
if (-not (Test-Path $cssPath)) { throw "Global CSS not found: $cssPath" }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "$pagePath.bak_$stamp"
Copy-Item $pagePath $backupPath -Force

$s = Get-Content $pagePath -Raw
if (-not $s.Contains("racer-attendance-page")) { throw "Expected RACER attendance page marker was not found. No changes made." }
if (-not $s.Contains("function Stat(")) { throw "Expected attendance page structure was not found. No changes made." }

$headerMatch = [regex]::Match($s, '(?s)<header[^>]*>.*?</header>')
if (-not $headerMatch.Success) { throw "Teacher attendance header block not found. No changes made." }

$header = $headerMatch.Value
$header = [regex]::Replace($header, '<header\s+style=\{styles\.header\}>', '<header className="racer-premium-header" style={styles.header}>', 1)
$header = [regex]::Replace($header, 'TEACHER CONTROL CENTER', 'RACER ACADEMY', 1)
$header = [regex]::Replace($header, 'Attendance Management', 'TEACHER CONTROL CENTER', 1)
$header = [regex]::Replace($header, 'Manage all students and mark their\s*daily attendance\.', 'Attendance Management', 1)
$header = [regex]::Replace($header, '>\s*Refresh\s*<', '>↻<', 1)

$s = $s.Substring(0, $headerMatch.Index) + $header + $s.Substring($headerMatch.Index + $headerMatch.Length)
$s = $s.Replace('Students Attendance', 'MARK ATTENDANCE')
$s = $s.Replace('<strong>Attendance Portal</strong>', '<strong>RACER ACADEMY</strong>')
$s = $s.Replace('Teacher Management Center  2026', '•  TEACHER CONTROL CENTER')

[System.IO.File]::WriteAllText($pagePath, $s, (New-Object System.Text.UTF8Encoding($false)))

$css = Get-Content $cssPath -Raw
if (-not $css.Contains('RACER ATTENDANCE VIP UI')) {
  $vip = @'

/* RACER ATTENDANCE VIP UI — shared teacher module visual standard */
.racer-premium-header{
  position:relative!important;
  overflow:hidden!important;
  background:linear-gradient(135deg,#071b3b 0%,#0b2d63 55%,#0d4e98 100%)!important;
  border:1px solid rgba(255,255,255,.16)!important;
  border-radius:20px!important;
  padding:15px 18px!important;
  min-height:72px!important;
  box-shadow:0 12px 28px rgba(3,18,45,.28)!important;
  color:#fff!important;
}
.racer-premium-header .headerLeft,
main.racer-attendance-page > div > header > div:first-child{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;}
.racer-premium-header .badge,
main.racer-attendance-page > div > header .badge{
  position:relative!important;
  display:block!important;
  flex:0 0 auto!important;
  margin:0!important;
  padding:7px 12px 7px 47px!important;
  background:transparent!important;
  color:#fff!important;
  border:0!important;
  border-radius:12px!important;
  font-size:18px!important;
  font-weight:950!important;
  letter-spacing:.2px!important;
  line-height:1.05!important;
  text-transform:none!important;
}
.racer-premium-header .badge:before,
main.racer-attendance-page > div > header .badge:before{
  content:""!important;
  position:absolute!important;
  left:0!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  width:38px!important;
  height:38px!important;
  border-radius:11px!important;
  background:#fff url("/racer-academy-icon.png") center/contain no-repeat!important;
  box-shadow:0 4px 12px rgba(0,0,0,.18)!important;
}
.racer-premium-header .title,
main.racer-attendance-page > div > header .title{
  margin:0!important;
  color:#dbeafe!important;
  font-size:14px!important;
  line-height:1.1!important;
  font-weight:900!important;
  letter-spacing:.7px!important;
  white-space:nowrap!important;
}
.racer-premium-header .subtitle,
main.racer-attendance-page > div > header .subtitle{
  margin:3px 0 0!important;
  color:#fff!important;
  font-size:11px!important;
  font-weight:650!important;
  opacity:.82!important;
}
.racer-premium-header .refreshButton,
main.racer-attendance-page > div > header .refreshButton{
  min-width:42px!important;
  width:42px!important;
  height:42px!important;
  padding:0!important;
  border-radius:50%!important;
  border:1px solid rgba(255,255,255,.22)!important;
  background:rgba(255,255,255,.12)!important;
  color:#fff!important;
  font-size:20px!important;
  font-weight:900!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12)!important;
}
.racer-premium-header:after{
  content:"TC"!important;
  position:absolute!important;
  right:68px!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  width:40px!important;
  height:40px!important;
  border-radius:50%!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  background:linear-gradient(135deg,#3b82f6,#2563eb)!important;
  border:2px solid rgba(255,255,255,.25)!important;
  color:#fff!important;
  font-size:12px!important;
  font-weight:950!important;
  box-shadow:0 5px 15px rgba(0,0,0,.18)!important;
}
main.racer-attendance-page{
  min-height:100vh!important;
  padding:12px!important;
  background:linear-gradient(145deg,#06142d 0%,#08234a 48%,#0a417d 100%)!important;
  color:#0f172a!important;
}
main.racer-attendance-page > div{max-width:1180px!important;}
main.racer-attendance-page .racer-attendance-stats{
  gap:10px!important;
  margin-bottom:10px!important;
}
main.racer-attendance-page .racer-attendance-stats > div{
  min-height:86px!important;
  padding:12px 14px!important;
  border-radius:16px!important;
  box-shadow:0 8px 18px rgba(0,0,0,.16)!important;
}
main.racer-attendance-page .racer-attendance-stats [style*="font-size: 36px"],
main.racer-attendance-page .racer-attendance-stats [style*="fontSize: 36px"]{
  font-size:25px!important;
}
main.racer-attendance-page .racer-attendance-controls{
  gap:10px!important;
  padding:13px!important;
  margin-bottom:10px!important;
  border-radius:16px!important;
  border:1px solid #d8e2f0!important;
  box-shadow:0 6px 18px rgba(0,0,0,.12)!important;
}
main.racer-attendance-page .racer-attendance-controls .label{
  font-size:12px!important;
}
main.racer-attendance-page .racer-attendance-controls input{
  min-height:40px!important;
  padding:9px 11px!important;
  border-radius:10px!important;
  font-size:13px!important;
}
main.racer-attendance-page > div > section:nth-of-type(3){
  padding:13px 14px!important;
  margin-bottom:10px!important;
  border-radius:16px!important;
  border:1px solid #bfd5ef!important;
  box-shadow:0 6px 18px rgba(0,0,0,.12)!important;
}
main.racer-attendance-page > div > section:nth-of-type(3) h2{
  font-size:15px!important;
}
main.racer-attendance-page > div > section:nth-of-type(3) button{
  padding:8px 11px!important;
  border-radius:9px!important;
  font-size:11px!important;
}
main.racer-attendance-page > div > section:nth-of-type(4),
main.racer-attendance-page > div > section:nth-of-type(5){
  padding:14px!important;
  margin-bottom:10px!important;
  border-radius:18px!important;
  border:1px solid #d9e4f1!important;
  box-shadow:0 8px 22px rgba(0,0,0,.13)!important;
}
main.racer-attendance-page > div > section:nth-of-type(4) .sectionHeader,
main.racer-attendance-page > div > section:nth-of-type(5) .sectionHeader{
  margin-bottom:11px!important;
}
main.racer-attendance-page > div > section:nth-of-type(4) .sectionTitle,
main.racer-attendance-page > div > section:nth-of-type(5) .sectionTitle{
  font-size:18px!important;
  letter-spacing:.15px!important;
}
main.racer-attendance-page > div > section:nth-of-type(4) .sectionSubtitle,
main.racer-attendance-page > div > section:nth-of-type(5) .sectionSubtitle{
  font-size:11px!important;
}
main.racer-attendance-page > div > section:nth-of-type(4) .countBadge{
  padding:7px 10px!important;
  font-size:11px!important;
}
main.racer-attendance-page .studentList{
  gap:7px!important;
}
main.racer-attendance-page .studentRow{
  min-width:0!important;
  padding:8px 9px!important;
  gap:7px!important;
  border-radius:12px!important;
  box-shadow:0 3px 10px rgba(15,23,42,.06)!important;
}
main.racer-attendance-page .number{
  width:20px!important;
  min-width:20px!important;
  font-size:11px!important;
}
main.racer-attendance-page .avatar{
  width:34px!important;
  height:34px!important;
  min-width:34px!important;
  border-width:2px!important;
  font-size:13px!important;
}
main.racer-attendance-page .studentInfo{
  min-width:0!important;
}
main.racer-attendance-page .studentName{
  font-size:13px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  word-break:normal!important;
}
main.racer-attendance-page .username{
  margin-top:2px!important;
  font-size:10px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
main.racer-attendance-page .miniStats{
  gap:7px!important;
  margin-top:3px!important;
  flex-wrap:nowrap!important;
  white-space:nowrap!important;
  overflow:hidden!important;
}
main.racer-attendance-page .miniStats span{
  font-size:9px!important;
  flex:0 0 auto!important;
}
main.racer-attendance-page .attendanceActions{
  flex:0 0 auto!important;
  min-width:148px!important;
  align-items:flex-end!important;
  gap:4px!important;
}
main.racer-attendance-page .attendanceActions .presentBadge,
main.racer-attendance-page .attendanceActions .absentBadge{
  padding:4px 7px!important;
  font-size:9px!important;
  border-width:1px!important;
}
main.racer-attendance-page .buttons{
  gap:5px!important;
  flex-wrap:nowrap!important;
}
main.racer-attendance-page .buttons button{
  padding:6px 9px!important;
  border-radius:8px!important;
  font-size:10px!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) .monthInput{
  padding:7px 9px!important;
  font-size:11px!important;
  border-radius:9px!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) .tableWrapper{
  overflow-x:hidden!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) table{
  width:100%!important;
  min-width:0!important;
  table-layout:fixed!important;
  border-collapse:separate!important;
  border-spacing:0!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) th{
  padding:8px 6px!important;
  font-size:10px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) td{
  padding:8px 6px!important;
  font-size:10px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  word-break:normal!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) th:nth-child(1),
main.racer-attendance-page > div > section:nth-of-type(5) td:nth-child(1){width:7%!important;text-align:center!important;}
main.racer-attendance-page > div > section:nth-of-type(5) th:nth-child(2),
main.racer-attendance-page > div > section:nth-of-type(5) td:nth-child(2){width:18%!important;}
main.racer-attendance-page > div > section:nth-of-type(5) th:nth-child(3),
main.racer-attendance-page > div > section:nth-of-type(5) td:nth-child(3){width:31%!important;}
main.racer-attendance-page > div > section:nth-of-type(5) th:nth-child(4),
main.racer-attendance-page > div > section:nth-of-type(5) td:nth-child(4){width:25%!important;}
main.racer-attendance-page > div > section:nth-of-type(5) th:nth-child(5),
main.racer-attendance-page > div > section:nth-of-type(5) td:nth-child(5){width:19%!important;}
main.racer-attendance-page > div > section:nth-of-type(5) .historyName{
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  display:block!important;
}
main.racer-attendance-page > div > section:nth-of-type(5) .presentBadge,
main.racer-attendance-page > div > section:nth-of-type(5) .absentBadge{
  padding:4px 7px!important;
  font-size:9px!important;
  border-width:1px!important;
}
main.racer-attendance-page .racer-attendance-footer{
  color:rgba(255,255,255,.72)!important;
  padding:12px!important;
  font-size:10px!important;
}
@media (max-width:700px){
  main.racer-attendance-page{padding:8px!important;}
  .racer-premium-header,
  main.racer-attendance-page > div > header{
    padding:12px 11px!important;
    min-height:64px!important;
  }
  .racer-premium-header .badge,
  main.racer-attendance-page > div > header .badge{
    font-size:15px!important;
    padding-left:40px!important;
  }
  .racer-premium-header .badge:before,
  main.racer-attendance-page > div > header .badge:before{
    width:32px!important;height:32px!important;border-radius:9px!important;
  }
  .racer-premium-header:after{
    display:none!important;
  }
  .racer-premium-header .title,
  main.racer-attendance-page > div > header .title{
    font-size:11px!important;
  }
  .racer-premium-header .subtitle,
  main.racer-attendance-page > div > header .subtitle{
    font-size:9px!important;
  }
  .racer-premium-header .refreshButton,
  main.racer-attendance-page > div > header .refreshButton{
    width:34px!important;height:34px!important;min-width:34px!important;font-size:16px!important;
  }
  main.racer-attendance-page .racer-attendance-stats{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
  }
  main.racer-attendance-page .racer-attendance-stats > div{
    min-height:75px!important;
    padding:10px!important;
    border-radius:13px!important;
  }
  main.racer-attendance-page .studentRow{
    gap:5px!important;
  }
  main.racer-attendance-page .attendanceActions{
    min-width:126px!important;
  }
  main.racer-attendance-page .buttons button{
    padding:5px 7px!important;
    font-size:9px!important;
  }
}

'@
  $css = $css.TrimEnd() + "`r`n`r`n" + $vip.Trim() + "`r`n"
  [System.IO.File]::WriteAllText($cssPath, $css, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host "RACER ATTENDANCE VIP UI PATCHED" -ForegroundColor Green
Write-Host "Backup: $backupPath" -ForegroundColor Yellow
Write-Host "Page:   $pagePath" -ForegroundColor Cyan
Write-Host "CSS:    $cssPath" -ForegroundColor Cyan
