"use client";

import { useEffect, useState, type ReactNode } from "react";

const SPLASH_DURATION = 5000;
const EXIT_FADE_START = 4550;

export default function RacerStartupSplash({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const splashShown = sessionStorage.getItem("racer_startup_splash_shown");
    if (splashShown === "1") return;
    sessionStorage.setItem("racer_startup_splash_shown", "1");
    setVisible(true);
    const fadeTimer = window.setTimeout(() => setLeaving(true), EXIT_FADE_START);
    const hideTimer = window.setTimeout(() => setVisible(false), SPLASH_DURATION);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return <>{children}</>;

  return (
    <div
      aria-label="RACER ACADEMY loading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 450ms ease",
      }}
    >
      <video
        src="/racer-academy-startup.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}



