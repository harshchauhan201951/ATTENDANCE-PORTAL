"use client";
import { useEffect, useRef, useState } from "react";
const SOUND = "/racer-notification.mp3";
export default function RacerNotificationManager({ studentId }: { studentId?: number | null }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationId = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
    audioRef.current = new Audio(SOUND);
    audioRef.current.preload = "auto";
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "RACER_NOTIFICATION") playSound();
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []);
  useEffect(() => {
    if (!studentId || permission !== "granted") return;
    let active = true;
    const checkNotifications = async () => {
      try {
        const res = await fetch(`/api/student/notifications?studentId=${studentId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        if (!list.length) return;
        const newest = Number(list[0]?.id);
        if (!lastNotificationId.current) {
          lastNotificationId.current = newest;
          return;
        }
        if (active && newest > lastNotificationId.current) {
          lastNotificationId.current = newest;
          playSound();
        }
      } catch {}
    };
    checkNotifications();
    const timer = window.setInterval(checkNotifications, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [studentId, permission]);
  const playSound = () => {
    try {
      const audio = audioRef.current || new Audio(SOUND);
      audioRef.current = audio;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {}
  };
  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;
      setEnabled(true);
      playSound();
      const registration = await navigator.serviceWorker.register("/sw.js");
      const ready = await navigator.serviceWorker.ready;
      if (studentId && "PushManager" in window && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        let subscription = await ready.pushManager.getSubscription();
        if (!subscription) {
          const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          const padding = "=".repeat((4 - (key.length % 4)) % 4);
          const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
          const raw = atob(base64);
          const applicationServerKey = Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
          subscription = await ready.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, subscription }),
        });
      }
      void registration;
    } catch (error) {
      console.error("RACER notification setup error:", error);
    }
  };
  if (permission === "granted" && enabled) {
    return <span style={{ display: "none" }} aria-hidden="true" />;
  }
  if (!("Notification" in (typeof window !== "undefined" ? window : {}))) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={enableNotifications}
      style={{
        position: "fixed",
        right: 12,
        bottom: 76,
        zIndex: 9999,
        border: "none",
        borderRadius: 999,
        padding: "10px 14px",
        background: "#111827",
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        boxShadow: "0 4px 14px rgba(0,0,0,.25)",
        cursor: "pointer",
      }}
    >
      🔔 Allow Notifications
    </button>
  );
}
