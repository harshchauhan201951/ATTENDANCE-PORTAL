"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "../lib/supabase";

type StudentNotice = {
  id: number;
  title: string;
  message: string;
  url: string | null;
  category: string;
  created_at: string;
};

function decodeVapidKey(value: string) {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default function StudentNotificationCenter() {
  const router = useRouter();
  const [identity, setIdentity] = useState<{ id: number; username: string } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notice, setNotice] = useState<StudentNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [nativeApp, setNativeApp] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const lastId = useRef<number | null>(null);

  const refresh = useCallback(async (allowPopup = true) => {
    if (!identity) return;
    try {
      const query = new URLSearchParams({ studentId: String(identity.id), studentUsername: identity.username });
      const response = await fetch(`/api/student/notifications?${query}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) return;
      const latest = (result.notifications || []) as StudentNotice[];
      const newestId = latest.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0);
      if (lastId.current === null) {
        lastId.current = newestId;
        return;
      }
      if (allowPopup) {
        const arriving = latest.find((item) => Number(item.id) > (lastId.current || 0));
        if (arriving) {
          setNotice(arriving);
          const audio = notificationAudio.current;
          if (audio) {
            audio.currentTime = 0;
            void audio.play().catch(() => {
              const context = audioContext.current;
              if (!context || context.state !== "running") return;
              const oscillator = context.createOscillator();
              const gain = context.createGain();
              oscillator.type = "sine";
              oscillator.frequency.value = 880;
              gain.gain.setValueAtTime(0.0001, context.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.02);
              gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
              oscillator.connect(gain);
              gain.connect(context.destination);
              oscillator.start();
              oscillator.stop(context.currentTime + 0.23);
            });
          }
          window.setTimeout(() => setNotice((current) => current?.id === arriving.id ? null : current), 9000);
        }
      }
      lastId.current = Math.max(lastId.current || 0, newestId);
    } catch {
      // The OS push notification remains available even if the inbox refresh is offline.
    }
  }, [identity]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let studentId = Number(localStorage.getItem("studentId") || localStorage.getItem("attendance_student_id") || localStorage.getItem("student_id") || 0);
      const username = localStorage.getItem("studentUsername") || localStorage.getItem("student_username") || "";
      if ((!Number.isInteger(studentId) || studentId <= 0) && username) {
        const { data } = await supabase.from("students").select("id").eq("student_username", username).maybeSingle();
        studentId = Number(data?.id || 0);
        if (studentId > 0) localStorage.setItem("studentId", String(studentId));
      }
      if (!cancelled && Number.isInteger(studentId) && studentId > 0 && username) setIdentity({ id: studentId, username });
      if (!cancelled) setNativeApp(Capacitor.isNativePlatform());
    })();
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    notificationAudio.current = new Audio("/racer-notification.mp3");
    notificationAudio.current.preload = "auto";
    const unlockSound = () => {
      const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      audioContext.current ||= new Context();
      void audioContext.current.resume();
    };
    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
      notificationAudio.current?.pause();
      notificationAudio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!identity) return;
    void refresh(false);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 20000);
    const onFocus = () => void refresh();
    const onWorkerMessage = (event: MessageEvent) => { if (event.data?.type === "RACER_NOTIFICATION") void refresh(); };
    window.addEventListener("focus", onFocus);
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
    };
  }, [identity, refresh]);

  useEffect(() => {
    if (!identity || !nativeApp) return;
    let cancelled = false;
    const listeners: Array<{ remove: () => Promise<void> }> = [];

    void (async () => {
      try {
        if (Capacitor.getPlatform() === "android") {
          await PushNotifications.createChannel({
            id: "racer_academy_v4",
            name: "RACER Academy alerts",
            description: "School updates, attendance, homework, results and fee notices.",
            importance: 4,
            sound: "racer_notification",
            visibility: 1,
            lights: true,
            lightColor: "#FFD43B",
            vibration: true,
          });
        }

        const permission = await PushNotifications.checkPermissions();
        const granted = permission.receive === "granted" ||
          (permission.receive === "prompt" && (await PushNotifications.requestPermissions()).receive === "granted");
        if (!granted || cancelled) return;

        listeners.push(await PushNotifications.addListener("registration", async (token) => {
          try {
            const response = await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ studentId: identity.id, subscription: { type: "fcm", token: token.value } }),
            });
            if (!response.ok) console.error("FCM subscription API error:", await response.text());
          } catch (error) {
            console.error("FCM subscription save error:", error);
          }
        }));
        listeners.push(await PushNotifications.addListener("registrationError", (error) => {
          console.error("FCM registration error:", error);
        }));
        listeners.push(await PushNotifications.addListener("pushNotificationReceived", () => {
          void refresh(true);
        }));
        listeners.push(await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          const data = event.notification?.data || {};
          const targetUrl = typeof data.url === "string" && data.url.startsWith("/")
            ? data.url
            : "/student/notifications" + (data.announcementId ? "?announcementId=" + encodeURIComponent(String(data.announcementId)) : "");
          router.push(targetUrl);
        }));

        await PushNotifications.register();
      } catch (error) {
        console.error("Student native push setup failed:", error);
      }
    })();

    return () => {
      cancelled = true;
      listeners.forEach((listener) => { void listener.remove(); });
    };
  }, [identity, nativeApp, refresh, router]);

  async function enableNotifications() {
    if (!identity || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setBusy(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") return;
      const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context) {
        audioContext.current = new Context();
        await audioContext.current.resume();
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const ready = await navigator.serviceWorker.ready;
      const pushManager = ready.pushManager || registration.pushManager;
      let subscription = await pushManager.getSubscription();
      if (!subscription) {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) throw new Error("Push notification key is not configured.");
        subscription = await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(key) as BufferSource });
      }
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: identity.id, subscription: subscription.toJSON() }),
      });
      if (!saved.ok) throw new Error("Could not register this device for notifications.");
      setNotice({ id: -1, title: "Notifications are on", message: "You'll get school updates on this device.", url: null, category: "general", created_at: new Date().toISOString() });
      window.setTimeout(() => setNotice((current) => current?.id === -1 ? null : current), 5000);
    } catch (error) {
      console.error("Student notification setup failed:", error);
    } finally {
      setBusy(false);
    }
  }

  if (!identity) return null;
  return <>
    {!nativeApp && permission !== "granted" && <div style={{ position: "fixed", zIndex: 10001, right: 16, bottom: 18, display: "flex", alignItems: "center", gap: 10, maxWidth: "calc(100vw - 32px)", padding: "10px 13px", border: "1px solid #bfd8f3", borderRadius: 14, background: "#fff", boxShadow: "0 8px 28px #17395824", color: "#24415f", font: "600 12px/1.4 Arial,sans-serif" }}>
      <span>{permission === "unsupported" ? "This browser does not support push notifications." : permission === "denied" ? "Allow RACER notifications in your browser settings." : "Get class, test, fee and result updates instantly."}</span>
      {permission === "default" && <button type="button" disabled={busy} onClick={() => void enableNotifications()} style={{ flex: "0 0 auto", border: 0, borderRadius: 9, padding: "9px 11px", background: "#155ba2", color: "#fff", fontWeight: 800, cursor: "pointer" }}>{busy ? "Enabling…" : "Enable alerts"}</button>}
      <button type="button" aria-label="Dismiss notification prompt" onClick={(event) => event.currentTarget.parentElement?.remove()} style={{ border: 0, background: "transparent", color: "#71839a", fontSize: 18, cursor: "pointer" }}>×</button>
    </div>}
    {notice && <div role="status" aria-live="polite" onClick={() => { if (notice.url) router.push(notice.url); setNotice(null); }} style={{ position: "fixed", zIndex: 10002, top: 16, right: 16, width: "min(390px, calc(100vw - 32px))", padding: 15, border: "1px solid #d4e3f3", borderLeft: "4px solid #1765b5", borderRadius: 15, background: "#fff", boxShadow: "0 12px 35px #1739582b", color: "#203b5b", cursor: notice.url ? "pointer" : "default", fontFamily: "Arial,sans-serif" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><span style={{ fontSize: 20 }}>🔔</span><span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", fontSize: 14 }}>{notice.title}</strong><span style={{ display: "block", marginTop: 5, color: "#586d84", fontSize: 12, lineHeight: 1.45 }}>{notice.message}</span></span><button type="button" aria-label="Close notification" onClick={(event) => { event.stopPropagation(); setNotice(null); }} style={{ border: 0, background: "transparent", color: "#7b8da2", fontSize: 18, cursor: "pointer" }}>×</button></div>
    </div>}
  </>;
}
