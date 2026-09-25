 "use client";

import { useEffect, useState } from "react";

export default function RacerStartupSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="racer-splash" aria-hidden="true">
      <div className="racer-om">{String.fromCodePoint(0x0950)}</div>

      <div className="racer-stage">
        <div className="racer-shadow" />

        <div className="racer-arm racer-arm-left">
          <span className="racer-hand" />
        </div>

        <div className="racer-arm racer-arm-right">
          <span className="racer-hand" />
        </div>

        <div className="racer-avatar">
          <div className="racer-hair" />

          <div className="racer-head">
            <span className="racer-eye racer-eye-left" />
            <span className="racer-eye racer-eye-right" />
            <span className="racer-blush racer-blush-left" />
            <span className="racer-blush racer-blush-right" />
            <span className="racer-mouth" />
          </div>

          <div className="racer-neck" />
          <div className="racer-body"><strong>RA</strong></div>

          <div className="racer-leg racer-leg-left">
            <span className="racer-shoe" />
          </div>
          <div className="racer-leg racer-leg-right">
            <span className="racer-shoe" />
          </div>
        </div>
      </div>

      <div className="racer-name">RACER ACADEMY</div>

      <style jsx>{`
        .racer-splash {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 28%, rgba(129, 140, 248, 0.18), transparent 30%),
            radial-gradient(circle at 18% 80%, rgba(56, 189, 248, 0.12), transparent 24%),
            #f8fafc;
          animation: racerSplashOut 3s ease forwards;
        }

        .racer-om {
          margin-bottom: 2px;
          color: #312e81;
          font: 900 clamp(52px, 9vw, 82px)/1 "Noto Sans Devanagari", "Segoe UI", sans-serif;
          text-shadow: 0 8px 22px rgba(49, 46, 129, 0.16);
          animation: racerOmPulse 1.7s ease-in-out infinite;
        }

        .racer-stage {
          position: relative;
          width: min(400px, 88vw);
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 900px;
        }

        .racer-shadow {
          position: absolute;
          bottom: 9px;
          width: 220px;
          height: 58px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.15);
          filter: blur(18px);
        }

        .racer-avatar {
          position: relative;
          z-index: 3;
          width: 178px;
          height: 282px;
          animation: racerFloat 2.5s ease-in-out infinite;
        }

        .racer-hair {
          position: absolute;
          z-index: 5;
          left: 29px;
          top: 4px;
          width: 120px;
          height: 48px;
          border-radius: 58% 58% 38% 38%;
          background: linear-gradient(145deg, #172554, #4f46e5);
          box-shadow: 8px 8px 0 rgba(15, 23, 42, 0.07);
        }

        .racer-head {
          position: absolute;
          z-index: 4;
          left: 22px;
          top: 19px;
          width: 134px;
          height: 126px;
          border-radius: 48%;
          background: linear-gradient(145deg, #fff5e7, #ffcda7);
          border: 4px solid #ffffff;
          box-shadow:
            inset -10px -12px 18px rgba(180, 90, 40, 0.08),
            0 14px 30px rgba(15, 23, 42, 0.15);
        }

        .racer-eye {
          position: absolute;
          top: 52px;
          width: 13px;
          height: 17px;
          border-radius: 50%;
          background: #0f172a;
          box-shadow: inset 3px 3px 0 #ffffff;
        }

        .racer-eye-left { left: 32px; }
        .racer-eye-right { right: 32px; }

        .racer-blush {
          position: absolute;
          top: 79px;
          width: 20px;
          height: 9px;
          border-radius: 50%;
          background: rgba(244, 114, 182, 0.22);
        }

        .racer-blush-left { left: 17px; }
        .racer-blush-right { right: 17px; }

        .racer-mouth {
          position: absolute;
          left: 50px;
          top: 87px;
          width: 34px;
          height: 18px;
          border-bottom: 4px solid #a8550a;
          border-radius: 0 0 28px 28px;
        }

        .racer-neck {
          position: absolute;
          z-index: 2;
          left: 72px;
          top: 132px;
          width: 35px;
          height: 25px;
          border-radius: 0 0 13px 13px;
          background: #f2bc90;
        }

        .racer-body {
          position: absolute;
          z-index: 3;
          left: 30px;
          top: 146px;
          width: 118px;
          height: 106px;
          display: grid;
          place-items: center;
          border-radius: 32px 32px 22px 22px;
          background: linear-gradient(150deg, #6366f1, #312e81 72%, #1e1b4b);
          border: 4px solid #ffffff;
          box-shadow:
            inset -12px -12px 18px rgba(15, 23, 42, 0.16),
            0 15px 27px rgba(30, 41, 59, 0.15);
        }

        .racer-body strong {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          border-radius: 15px;
          background: #ffffff;
          color: #312e81;
          font-size: 16px;
          font-weight: 1000;
          box-shadow: 0 7px 16px rgba(15, 23, 42, 0.13);
        }

        .racer-arm {
          position: absolute;
          z-index: 2;
          top: 150px;
          width: 142px;
          height: 31px;
          border-radius: 999px;
          background: linear-gradient(145deg, #6366f1, #312e81);
          box-shadow:
            inset -8px -7px 13px rgba(15, 23, 42, 0.15),
            0 9px 18px rgba(15, 23, 42, 0.11);
        }

        .racer-arm-left {
          left: -7px;
          transform: rotate(154deg);
          transform-origin: right center;
        }

        .racer-arm-right {
          right: -7px;
          transform: rotate(26deg);
          transform-origin: left center;
        }

        .racer-hand {
          position: absolute;
          top: -9px;
          width: 44px;
          height: 44px;
          border-radius: 48%;
          background: linear-gradient(145deg, #ffe9d0, #ffc99d);
          box-shadow: inset -6px -6px 9px rgba(160, 82, 35, 0.10);
        }

        .racer-arm-left .racer-hand { left: -18px; }
        .racer-arm-right .racer-hand { right: -18px; }

        .racer-leg {
          position: absolute;
          z-index: 1;
          top: 243px;
          width: 39px;
          height: 39px;
          border-radius: 0 0 18px 18px;
          background: linear-gradient(#172554, #0f172a);
        }

        .racer-leg-left { left: 50px; }
        .racer-leg-right { right: 50px; }

        .racer-shoe {
          position: absolute;
          bottom: -13px;
          width: 59px;
          height: 24px;
          border-radius: 17px 24px 10px 11px;
          background: linear-gradient(145deg, #ffffff, #cbd5e1);
          box-shadow: 0 6px 12px rgba(15, 23, 42, 0.15);
        }

        .racer-leg-left .racer-shoe { left: -10px; }
        .racer-leg-right .racer-shoe { right: -10px; }

        .racer-name {
          font-size: clamp(24px, 5vw, 41px);
          line-height: 1;
          font-weight: 1000;
          letter-spacing: 2px;
          color: #0f172a;
          text-align: center;
          text-shadow: 0 6px 16px rgba(15, 23, 42, 0.11);
          animation: racerNameIn 0.8s ease both;
        }

        @keyframes racerFloat {
          0%, 100% { transform: translateY(0) rotateY(-4deg); }
          50% { transform: translateY(-10px) rotateY(4deg); }
        }

        @keyframes racerOmPulse {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        @keyframes racerNameIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes racerSplashOut {
          0%, 76% { opacity: 1; visibility: visible; }
          100% { opacity: 0; visibility: hidden; }
        }

        @media (max-width: 520px) {
          .racer-stage {
            width: 330px;
            height: 300px;
          }

          .racer-avatar {
            transform: scale(0.9);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .racer-avatar,
          .racer-om,
          .racer-name,
          .racer-splash {
            animation: none;
          }

          .racer-splash {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
