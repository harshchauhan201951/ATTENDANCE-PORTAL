"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TeacherNotice = { id: number; title: string; message: string; category: string; url: string; metadata?: Record<string, unknown>; is_read: boolean; created_at: string };

function teacherId() {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem("attendance_teacher_id") || localStorage.getItem("teacher_id") || sessionStorage.getItem("attendance_teacher_id") || sessionStorage.getItem("teacher_id") || "0");
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function TeacherNotificationsBell({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TeacherNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [incoming, setIncoming] = useState<TeacherNotice | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastNotificationId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const id = teacherId();
    if (!id) return;
    const response = await fetch(`/api/teacher/notifications?teacherId=${encodeURIComponent(String(id))}`, { cache: "no-store" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    if (response?.ok && result?.success) {
      const notifications = (result.notifications || []) as TeacherNotice[];
      const newestId = notifications.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0);
      if (lastNotificationId.current === null) {
        lastNotificationId.current = newestId;
      } else if (newestId > lastNotificationId.current) {
        const nextNotification = notifications.find((item) => Number(item.id) > (lastNotificationId.current || 0));
        lastNotificationId.current = newestId;
        if (nextNotification?.category === "quiz_submission") {
          setIncoming(nextNotification);
          if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setIncoming(null), 10000);
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            void audio.play().catch(() => undefined);
          }
        }
      }
      setItems(notifications);
      setUnread(Number(result.unreadCount || 0));
    }
  }, []);

  useEffect(() => {
    const audio = new Audio("/racer-notification.mp3");
    audio.preload = "auto";
    audioRef.current = audio;
    const unlockAudio = () => {
      audio.muted = true;
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => { audio.muted = false; });
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      audio.pause();
      audioRef.current = null;
    };
  }, [load]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  const markRead = async (item: TeacherNotice) => {
    const id = teacherId();
    if (!item.is_read) { await fetch("/api/teacher/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherId: id, notificationId: item.id }) }); setItems((current) => current.map((notice) => notice.id === item.id ? { ...notice, is_read: true } : notice)); setUnread((count) => Math.max(0, count - 1)); }
    setOpen(false);
    if (item.url?.startsWith("/")) router.push(item.url);
  };

  const markAll = async () => { const id = teacherId(); if (!id || !unread) return; await fetch("/api/teacher/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherId: id, markAll: true }) }); setItems((current) => current.map((item) => ({ ...item, is_read: true }))); setUnread(0); };

  return <div ref={panelRef} className={`teacher-notifications${className ? ` ${className}` : ""}`}>
    <button type="button" className="teacher-notifications-trigger" onClick={() => setOpen((value) => !value)} aria-label="Teacher notifications" aria-expanded={open}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
    </button>
    {open && <section className="teacher-notifications-panel" aria-label="Teacher notifications inbox">
      <header><strong>Notifications</strong><button type="button" onClick={() => void markAll()} disabled={!unread}>Mark all read</button></header>
      {items.length === 0 ? <p className="teacher-notifications-empty">No notifications yet.</p> : <div className="teacher-notifications-list">{items.map((item) => <button type="button" key={item.id} className={`teacher-notification-item${item.is_read ? " read" : ""}`} onClick={() => void markRead(item)}><span className="teacher-notification-icon">{item.category === "quiz_submission" ? "✓" : "↗"}</span><span><strong>{item.title}</strong><small>{item.message}</small><em>{timeLabel(item.created_at)}</em></span></button>)}</div>}
    </section>}
    {incoming && <button type="button" role="status" onClick={() => { setIncoming(null); if (incoming.url?.startsWith("/")) router.push(incoming.url); }} style={{ position: "fixed", zIndex: 10010, top: 18, right: 18, width: "min(420px, calc(100vw - 36px))", padding: "15px 17px", border: "1px solid #cbdcf0", borderLeft: "4px solid #1765b5", borderRadius: 14, background: "#fff", boxShadow: "0 12px 35px #17395830", color: "#203b5b", textAlign: "left", cursor: "pointer" }}>
      <strong style={{ display: "block", fontSize: 14 }}>{incoming.title}</strong>
      <span style={{ display: "block", marginTop: 5, fontSize: 12, lineHeight: 1.45, color: "#586d84" }}>{incoming.message}</span>
      <span style={{ display: "block", marginTop: 7, fontSize: 11, color: "#71839a" }}>{timeLabel(incoming.created_at)} · Open quiz result</span>
    </button>}
  </div>;
}
