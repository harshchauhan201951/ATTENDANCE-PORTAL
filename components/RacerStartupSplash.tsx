"use client";

import { useEffect, useState, type ReactNode } from "react";

const SPLASH_DURATION = 5000;
const EXIT_FADE_START = 4550;

export default function RacerStartupSplash({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const ratio = Math.min(1, elapsed / SPLASH_DURATION);
      setProgress(Math.round(ratio * 100));

      if (elapsed >= EXIT_FADE_START) {
        setLeaving(true);
      }

      if (elapsed >= SPLASH_DURATION) {
        setProgress(100);
        setLeaving(true);
        window.setTimeout(() => setVisible(false), 450);
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!visible) return <>{children}</>;

  return (
    <div
      className={leaving ? "racer-simple-splash leaving" : "racer-simple-splash"}
      aria-label="RACER ACADEMY loading"
    >
      <img
        className="racer-simple-splash-image"
        src="/racer-simple-splash.png"
        alt="RACER ACADEMY educational splash"
      />

      <div className="racer-simple-splash-om" aria-hidden="true">
        ॐ
      </div>

      <div className="racer-simple-splash-loading-zone" aria-hidden="true">
        <div className="racer-simple-splash-track">
          <div
            className="racer-simple-splash-fill"
            style={{ width: progress + "%" }}
          />
        </div>
        <div className="racer-simple-splash-label">Loading...</div>
      </div>

      <style jsx>{`
        .racer-simple-splash {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          width: 100vw;
          height: 100svh;
          min-height: 100vh;
          overflow: hidden;
          background: #eef8ff;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
          animation: racerSplashIn 240ms ease-out both;
        }

        .racer-simple-splash.leaving {
          animation: racerSplashOut 450ms ease-in both;
        }

        .racer-simple-splash-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        .racer-simple-splash-om {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: 60.7%;
          transform: translate(-50%, -50%);
          color: #153b89;
          font-family: "Noto Sans Devanagari", "Mangal", sans-serif;
          font-size: clamp(19px, 5.2vw, 30px);
          line-height: 1;
          font-weight: 500;
          text-shadow: 0 1px 3px rgba(21, 59, 137, .14);
          pointer-events: none;
        }

        .racer-simple-splash-loading-zone {
          position: absolute;
          z-index: 4;
          left: 50%;
          bottom: 5.6%;
          transform: translateX(-50%);
          width: min(42vw, 190px);
          min-width: 125px;
          text-align: center;
          pointer-events: none;
        }

        .racer-simple-splash-track {
          height: 7px;
          width: 100%;
          border-radius: 999px;
          background: rgba(217, 235, 250, .96);
          box-shadow: 0 1px 4px rgba(62, 130, 190, .1);
          overflow: hidden;
        }

        .racer-simple-splash-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #11aeea 0%, #2196ff 100%);
          box-shadow: 0 0 8px rgba(25, 156, 242, .35);
          transition: width 80ms linear;
        }

        .racer-simple-splash-label {
          margin-top: 6px;
          color: #21437e;
          font-size: clamp(9px, 2.8vw, 13px);
          line-height: 1;
          font-weight: 600;
          letter-spacing: .15px;
        }

        @keyframes racerSplashIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes racerSplashOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @media (max-width: 390px) {
          .racer-simple-splash-om { top: 60.9%; }
          .racer-simple-splash-loading-zone { bottom: 5.2%; width: 45vw; }
        }

        @media (prefers-reduced-motion: reduce) {
          .racer-simple-splash,
          .racer-simple-splash.leaving {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
