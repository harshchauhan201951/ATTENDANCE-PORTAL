"use client";
import { PropsWithChildren, useEffect, useState } from "react";

export default function RacerStartupSplash({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  if (ready) return <>{children}</>;

  return (
    <div className="racer-startup" aria-label="RACER ACADEMY">
      <div className="racer-om">{String.fromCodePoint(0x0950)}</div>
      <div className="stage">
        <div className="ground" />
        <div className="arm left"><i /></div>
        <div className="arm right"><i /></div>
        <div className="person">
          <div className="hair" />
          <div className="face">
            <i className="eye ex1" /><i className="eye e2" />
            <i className="cheek c1" /><i className="cheek c2" /><i className="smile" />
          </div>
          <div className="neck" />
          <div className="shirt"><b>RA</b></div>
          <div className="leg l1"><i /></div><div className="leg l2"><i /></div>
        </div>
        <i className="spark s1" /><i className="spark s2" /><i className="spark s3" />
      </div>
      <div className="name">RACER ACADEMY</div>
      <div className="tag">LEARN - GROW - ACHIEVE</div>
      <style jsx>{`
        .racer-startup{position:fixed;inset:0;z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 28%,#e0e7ff 0,transparent 31%),radial-gradient(circle at 18% 78%,#dbeafe 0,transparent 25%),linear-gradient(145deg,#f8fafc,#eef2ff,#f8fafc);font-family:Inter,system-ui,sans-serif}
        .racer-om{height:86px;font:900 68px/1 "Noto Sans Devanagari","Segoe UI",sans-serif;color:#312e81;text-shadow:0 2px #a5b4fc,0 5px rgba(79,70,229,.25),0 14px 25px rgba(49,46,129,.2);animation:om 2s ease-in-out infinite}
        .stage{position:relative;width:330px;height:285px}.ground{position:absolute;left:50%;bottom:10px;width:145px;height:30px;transform:translateX(-50%);border-radius:50%;background:#312e8128;filter:blur(12px)}
        .person{position:absolute;z-index:4;left:50%;bottom:28px;width:128px;height:220px;transform:translateX(-50%);animation:float 2.4s ease-in-out infinite}
        .hair{position:absolute;z-index:5;left:20px;top:0;width:88px;height:44px;border-radius:55%;background:linear-gradient(145deg,#172554,#4f46e5);box-shadow:inset -8px -8px 12px #0f172a25,0 7px 14px #0f172a20}
        .face{position:absolute;z-index:4;left:10px;top:20px;width:108px;height:103px;border:4px solid #fff;border-radius:48%;background:linear-gradient(145deg,#fff0da,#ffc897);box-shadow:inset -9px -10px 14px #9f4f1c18,0 13px 24px #0f172a22}
        .eye{position:absolute;top:42px;width:11px;height:14px;border-radius:50%;background:#0f172a;box-shadow:inset 3px 3px #fff}.e1{left:25px}.e2{right:25px}
        .cheek{position:absolute;top:67px;width:18px;height:8px;border-radius:50%;background:#f472b640}.c1{left:11px}.c2{right:11px}
        .smile{position:absolute;left:39px;top:70px;width:30px;height:15px;border-bottom:4px solid #a8550a;border-radius:0 0 25px 25px}
        .neck{position:absolute;z-index:2;left:47px;top:112px;width:35px;height:27px;border-radius:0 0 13px 13px;background:#efb786}
        .shirt{position:absolute;z-index:3;left:8px;top:127px;width:112px;height:82px;border:4px solid #fff;border-radius:30px 30px 22px 22px;display:grid;place-items:center;background:linear-gradient(150deg,#818cf8,#4f46e5 48%,#312e81);box-shadow:inset -10px -11px #0f172a25,0 14px 22px #0f172a20}
        .shirt b{width:42px;height:42px;display:grid;place-items:center;order:background:#fff;color:#312e81;font-size:14px;font-weight:1000;box-shadow:0 6px 12px #0f172a24}
        .arm{position:absolute;z-index:2;top:144px;width:120px;height:27px;border-radius:999px;background:linear-gradient(145deg,#818cf8,#312e81);box-shadow:inset -8px -7px 12px #0f172a22,0 7px 14px #0f172a18}
        .arm.left{left:5px;transform:rotate(154deg);transform-origin:right center}.arm.right{right:5px;transform:rotate(26deg);transform-origin:left center}
        .arm i{position:absolute;top:-7px;width:40px;height:40px;border-radius:48%;background:linear-gradient(145deg,#ffe8cc,#ffc897);box-shadow:inset -5px -5px 8px #a0522318}.left i{left:-10px}.right i{right:-10px}
        .leg{position:absolute;z-index:2;top:203px;width:29px;height:27px;border-radius:0 0 12px 12px 12px;background:linear-gradient(#172554,#0f172a).l1{left:33px}.l2{right:33px}
        .leg i{position:absolute;bottom:-9px;width:43px;height:18px;border-radius:14px;background:linear-gradient(145deg,#fff,cbd5e1);box-shadow:0 4px 9px #0f172a1f}.l1 i{left:-7px}.l2 i{right:-7px}
        .spark{position:absolute;width:9px;height:9px;border-radius:50%;background:#818cf8;box-shadow:0 0 17px #6366f199;animation:spark 1.7s ease-in-out infinite}.s1{left:42px;top:100px}.s2{right:38px;top:67px;animation-delay:.4s}.s3{right:57px;bottom:44px;animation-delay:.8s}
        .name{margin-top:-2px;font-size:36px;font-weight:1000;letter-spacing:2px;background:linear-gradient(90deg,#172554,#4f46e5,#172554);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 2px #fff00 7px 14px #312e8121f }
        .tag{margin-top:7px;color:#64748b;font-size:9px;font-weight:900;letter-spacing:3px}
        @keyframes float{50%{transform:translateX(-50%) translateY(-8px) rotateY(5deg)}}@keyframes om{50%{transform:scale(1.05)}}@keyframes spark{50%{opacity:1;transform:scale(1.2) translateY(-6px)}}@media(max-width:520px){.stage{transform:scale(.9);margin:-10px 0}.name{font-size:27px}.racer-om{font-size:60px}}@-media(prefers-reduced-motion:reduce){.person,.racer-om,.spark{animation:none}}
      `}</style>
    </div>
  );
}
