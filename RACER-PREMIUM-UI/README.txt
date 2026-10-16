RACER ACADEMY - PREMIUM UI (student + teacher)
==============================================

STEP 1: Zip ko project folder me extract karo (PowerShell me, apne project folder se):

   cd C:\Users\User\attendance-portal
   Expand-Archive "$env:USERPROFILE\Downloads\RACER-PREMIUM-UI.zip" -DestinationPath . -Force
   dir .\RACER-PREMIUM-UI

   (dir me apply-premium-ui.ps1, README.txt aur files dikhne chahiye.
    Zip ka naam alag ho, jaise "RACER-PREMIUM-UI (1).zip", to wahi naam likhna.)

STEP 2: Design lagao aur app chalao:

   powershell -ExecutionPolicy Bypass -File .\RACER-PREMIUM-UI\apply-premium-ui.ps1

   Script: backup lega > design lagayegi > (node_modules na ho to npm install) > npm run dev.
   Phir browser me http://localhost:3000 kholo.
   Sirf lagana ho, server nahi chalana:  ... apply-premium-ui.ps1 -NoRun

UNDO (wapas purana)
   Script ke end me exact -Restore command print hoti hai. Wahi chalao.

KYA BADLA HAI
- app\racer-premium-ui.css         NAYI file: naya design (navy + royal blue, white cards, 3-column tiles,
                                    naye module headers, naya bottom navigation, inputs ka naya shape).
- app\layout.tsx                    css import + Plus Jakarta Sans font + tab title "Racer Academy".
- app\teacher\dashboard\page.tsx    fake numbers (Classes 12, Attendance 92%, Reports 18, bell badge 12) hataye.
                                    Ab Today (date), Time, Modules (18). Total Students pehle jaisa real.

KYA NAHI BADLA
- Supabase calls, login, attendance save, fees/Razorpay, quiz, push notification - sab logic same.
- Aapki .env.local aur database ko script touch nahi karti.
- Har module page ke andar ke cards/tables ka apna layout (wo 50 alag-alag bade pages hain).

NOTE
- Ye changes chat me aapke project par chalakar test nahi hue. Pehli baar npm run dev me dashboard aur
  2-3 module pages khol ke dekh lena. Kuch gadbad dikhe to screenshot bhej dena.
