"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
  likeCount: number;
  likedByMe: boolean;
};

type Service = {
  icon: string;
  title: string;
  description: string;
  path: string;
  section: string;
};

type QuickStat = {
  label: string;
  value: string;
  description: string;
  path: string;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("Student");
  const [username, setUsername] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [time, setTime] = useState("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [likingId, setLikingId] = useState<number | null>(null);

  useEffect(() => {
    initializeStudent();
    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  async function initializeStudent() {
    const name =
      localStorage.getItem("studentName") ||
      localStorage.getItem("student_name") ||
      "Student";

    const savedUsername =
      localStorage.getItem("student_username") ||
      localStorage.getItem("studentUsername") ||
      "";

    const savedStudentId =
      localStorage.getItem("studentId");

    setStudentName(name);
    setUsername(savedUsername);

    if (savedUsername) {
      const resolvedId =
        await resolveStudentId(savedUsername);

      if (resolvedId !== null) {
        setStudentId(resolvedId);

        localStorage.setItem(
          "studentId",
          String(resolvedId)
        );

        await loadAnnouncements(resolvedId);
        await registerPushNotifications(resolvedId);
        return;
      }
    }

    if (savedStudentId) {
      const parsedId = Number(savedStudentId);

      if (!Number.isNaN(parsedId) && parsedId > 0) {
        setStudentId(parsedId);

        await loadAnnouncements(parsedId);
        await registerPushNotifications(parsedId);
        return;
      }
    }

    await loadAnnouncements(null);
  }

  async function resolveStudentId(
    studentUsername: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id")
        .eq("student_username", studentUsername)
        .maybeSingle();

      if (error) {
        console.error(
          "Student ID lookup error:",
          error
        );
        return null;
      }

      return data?.id ? Number(data.id) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function registerPushNotifications(
    currentStudentId: number
  ) {
    try {
      if (typeof window === "undefined") return;

      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;
      if (!("Notification" in window)) return;

      const registration =
        await navigator.serviceWorker.register("/sw.js");

      let permission = Notification.permission;

      if (permission === "default") {
        permission =
          await Notification.requestPermission();
      }

      if (permission !== "granted") return;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) return;

        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToArrayBuffer(
                vapidPublicKey
              ),
          });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: currentStudentId,
          subscription: subscription.toJSON(),
        }),
      });
    } catch (error) {
      console.error(
        "Push registration error:",
        error
      );
    }
  }

  function urlBase64ToArrayBuffer(
    base64String: string
  ): ArrayBuffer {
    const padding =
      "=".repeat(
        (4 - (base64String.length % 4)) % 4
      );

    const base64 = (
      base64String + padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);

    const outputArray =
      new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] =
        rawData.charCodeAt(i);
    }

    return outputArray.buffer;
  }

  function updateTime() {
    setTime(
      new Date().toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }
      )
    );
  }

  async function loadAnnouncements(
    currentStudentId: number | null
  ) {
    setAnnouncementLoading(true);

    try {
      const {
        data: announcementData,
        error: announcementError,
      } = await supabase
        .from("announcements")
        .select(
          "id, title, message, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (announcementError) {
        console.error(announcementError);
        setAnnouncements([]);
        return;
      }

      const rows = announcementData || [];

      if (rows.length === 0) {
        setAnnouncements([]);
        return;
      }

      const ids = rows.map(
        (item) => item.id
      );

      const { data: likesData } =
        await supabase
          .from("announcement_likes")
          .select(
            "announcement_id, student_id"
          )
          .in(
            "announcement_id",
            ids
          );

      const likes = likesData || [];

      setAnnouncements(
        rows.map((announcement) => {
          const announcementLikes =
            likes.filter(
              (like) =>
                Number(
                  like.announcement_id
                ) ===
                Number(announcement.id)
            );

          return {
            id: Number(announcement.id),
            title: announcement.title,
            message: announcement.message,
            created_at:
              announcement.created_at,
            likeCount:
              announcementLikes.length,
            likedByMe:
              currentStudentId !== null &&
              announcementLikes.some(
                (like) =>
                  Number(like.student_id) ===
                  Number(currentStudentId)
              ),
          };
        })
      );
    } catch (error) {
      console.error(error);
      setAnnouncements([]);
    } finally {
      setAnnouncementLoading(false);
    }
  }

  async function toggleLike(
    announcementId: number
  ) {
    let currentStudentId = studentId;

    if (!currentStudentId && username) {
      currentStudentId =
        await resolveStudentId(username);

      if (currentStudentId) {
        setStudentId(currentStudentId);

        localStorage.setItem(
          "studentId",
          String(currentStudentId)
        );
      }
    }

    if (!currentStudentId) {
      alert(
        "Student information could not be found. Please login again."
      );
      return;
    }

    if (likingId !== null) return;

    const selected =
      announcements.find(
        (item) =>
          item.id === announcementId
      );

    if (!selected) return;

    setLikingId(announcementId);

    try {
      if (selected.likedByMe) {
        const { error } =
          await supabase
            .from("announcement_likes")
            .delete()
            .eq(
              "announcement_id",
              announcementId
            )
            .eq(
              "student_id",
              currentStudentId
            );

        if (error) {
          alert(error.message);
          return;
        }

        setAnnouncements((previous) =>
          previous.map((item) =>
            item.id === announcementId
              ? {
                  ...item,
                  likedByMe: false,
                  likeCount:
                    Math.max(
                      0,
                      item.likeCount - 1
                    ),
                }
              : item
          )
        );

        return;
      }

      const { error } =
        await supabase
          .from("announcement_likes")
          .insert({
            announcement_id:
              announcementId,
            student_id:
              currentStudentId,
          });

      if (error) {
        if (error.code === "23505") {
          await loadAnnouncements(
            currentStudentId
          );
        } else {
          alert(error.message);
        }

        return;
      }

      setAnnouncements((previous) =>
        previous.map((item) =>
          item.id === announcementId
            ? {
                ...item,
                likedByMe: true,
                likeCount:
                  item.likeCount + 1,
              }
            : item
        )
      );
    } finally {
      setLikingId(null);
    }
  }

  function logout() {
    localStorage.removeItem(
      "studentLoggedIn"
    );

    localStorage.removeItem(
      "student_username"
    );

    localStorage.removeItem(
      "studentUsername"
    );

    localStorage.removeItem(
      "studentName"
    );

    localStorage.removeItem(
      "student_name"
    );

    localStorage.removeItem(
      "studentId"
    );

    sessionStorage.clear();

    router.push("/");
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function go(path: string) {
    router.push(path);
  }

  const latestAnnouncement =
    announcements[0] || null;

  const firstLetter =
    studentName.charAt(0).toUpperCase();

  const services: Service[] = [
    {
      icon: "HOME",
      title: "Home",
      description:
        "Your dashboard and latest academy updates.",
      path: "/student",
      section: "MAIN",
    },
    {
      icon: "TIME",
      title: "Time Table",
      description:
        "Today's, tomorrow's and weekly class timetable.",
      path: "/student/timetable",
      section: "ACADEMIC",
    },
    {
      icon: "ATT",
      title: "Attendance",
      description:
        "Check daily, semester and detailed attendance.",
      path: "/student/attendance",
      section: "ACADEMIC",
    },
    {
      icon: "HIST",
      title: "Attendance History",
      description:
        "View previous attendance records.",
      path: "/student/attendance-history",
      section: "ACADEMIC",
    },
    {
      icon: "CAL",
      title: "Academic Calendar",
      description:
        "View important academic dates and holidays.",
      path: "/student/calendar",
      section: "ACADEMIC",
    },
    {
      icon: "WORK",
      title: "Homework",
      description:
        "View homework assigned by your teacher.",
      path: "/student/homework",
      section: "ACADEMIC",
    },
    {
      icon: "QUIZ",
      title: "Quiz Tests",
      description:
        "Attempt quizzes and check your results.",
      path: "/student/quiz-tests",
      section: "ACADEMIC",
    },
    {
      icon: "NEWS",
      title: "Announcements",
      description:
        "Read academy announcements.",
      path: "/student/announcements",
      section: "COMMUNICATION",
    },
    {
      icon: "QUERY",
      title: "Ask Query",
      description:
        "Send your academic query to the academy.",
      path: "/student/ask-query",
      section: "COMMUNICATION",
    },
    {
      icon: "NOTE",
      title: "Notifications",
      description:
        "View important academy notifications.",
      path: "/student/announcements",
      section: "COMMUNICATION",
    },
    {
      icon: "FEES",
      title: "Fees",
      description:
        "Check fees and payment information.",
      path: "/student/fees",
      section: "ACCOUNT",
    },
    {
      icon: "REPORT",
      title: "Reports",
      description:
        "View attendance and performance reports.",
      path: "/student/reports",
      section: "ACCOUNT",
    },
    {
      icon: "PROFILE",
      title: "Profile",
      description:
        "View personal and academic information.",
      path: "/student/profile",
      section: "ACCOUNT",
    },
    {
      icon: "SET",
      title: "Settings",
      description:
        "Manage your student account settings.",
      path: "/student/settings",
      section: "ACCOUNT",
    },
  ];

  const quickStats: QuickStat[] = [
    {
      label: "ATTENDANCE",
      value: "VIEW",
      description:
        "Check your current attendance",
      path: "/student/attendance",
    },
    {
      label: "QUIZ TESTS",
      value: "OPEN",
      description:
        "Available and previous quizzes",
      path: "/student/quiz-tests",
    },
    {
      label: "HOMEWORK",
      value: "VIEW",
      description:
        "Check assigned homework",
      path: "/student/homework",
    },
    {
      label: "FEES",
      value: "CHECK",
      description:
        "View your fee information",
      path: "/student/fees",
    },
  ];

  const groupedServices = [
    "MAIN",
    "ACADEMIC",
    "COMMUNICATION",
    "ACCOUNT",
  ];

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        button {
          font-family: Arial, Helvetica, sans-serif;
        }

        .racer-student-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 8% 0%,
              rgba(59,130,246,.12),
              transparent 27%
            ),
            radial-gradient(
              circle at 92% 8%,
              rgba(124,58,237,.10),
              transparent 24%
            ),
            linear-gradient(
              145deg,
              #f8fafc 0%,
              #eef2ff 50%,
              #f8fafc 100%
            );
          color: #0f172a;
          padding: 16px;
          padding-bottom: 30px;
        }

        .racer-student-container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .student-header {
          min-height: 68px;
          background: rgba(255,255,255,.95);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 11px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          box-shadow:
            0 10px 35px rgba(15,23,42,.07);
          margin-bottom: 15px;
        }

        .student-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .student-logo {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #1d4ed8,
              #4f46e5
            );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 1000;
          box-shadow:
            0 8px 20px rgba(37,99,235,.25);
        }

        .student-brand-name {
          color: #172554;
          font-size: 14px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .student-brand-sub {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1.7px;
        }

        .student-header-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .student-clock {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 10px;
          padding: 9px 11px;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .student-header-button {
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          min-width: 42px;
          height: 39px;
          padding: 0 10px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 1000;
        }

        .student-header-profile {
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #7c3aed
            );
          color: white;
          cursor: pointer;
          font-weight: 1000;
          font-size: 15px;
        }

        .student-logout {
          border: none;
          background: #0f172a;
          color: white;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 1000;
        }

        .student-hero {
          position: relative;
          overflow: hidden;
          min-height: 225px;
          border-radius: 25px;
          padding: 28px;
          background:
            radial-gradient(
              circle at 85% 20%,
              rgba(255,255,255,.16),
              transparent 22%
            ),
            linear-gradient(
              135deg,
              #172554 0%,
              #1d4ed8 48%,
              #4f46e5 100%
            );
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          box-shadow:
            0 20px 50px rgba(37,99,235,.22);
          margin-bottom: 15px;
        }

        .student-hero-left {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 18px;
          min-width: 0;
        }

        .student-avatar {
          width: 86px;
          height: 86px;
          flex: 0 0 86px;
          border-radius: 25px;
          background: white;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 35px;
          font-weight: 1000;
          box-shadow:
            0 12px 35px rgba(0,0,0,.18);
        }

        .student-hero-text {
          min-width: 0;
        }

        .student-eyebrow {
          color: #bfdbfe;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 2px;
        }

        .student-hero-title {
          margin: 6px 0 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 1000;
        }

        .student-hero-description {
          margin: 9px 0 0;
          max-width: 690px;
          color: #dbeafe;
          font-size: 12px;
          line-height: 1.65;
          font-weight: 600;
        }

        .student-id-pill {
          display: inline-flex;
          margin-top: 12px;
          padding: 7px 10px;
          border: 1px solid rgba(255,255,255,.2);
          background: rgba(255,255,255,.11);
          border-radius: 8px;
          color: white;
          font-size: 10px;
          font-weight: 900;
        }

        .student-status {
          position: relative;
          z-index: 2;
          min-width: 185px;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(255,255,255,.10);
          border-radius: 15px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .student-status-dot {
          width: 11px;
          height: 11px;
          flex: 0 0 11px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow:
            0 0 0 5px rgba(74,222,128,.14);
        }

        .student-status-title {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .student-status-sub {
          margin-top: 4px;
          color: #bfdbfe;
          font-size: 9px;
          font-weight: 700;
        }

        .student-panel {
          background: rgba(255,255,255,.96);
          border: 1px solid #e2e8f0;
          border-radius: 21px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow:
            0 8px 28px rgba(15,23,42,.055);
        }

        .student-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .student-section-eyebrow {
          color: #2563eb;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 2px;
        }

        .student-section-title {
          margin: 4px 0 0;
          color: #172554;
          font-size: 23px;
          font-weight: 1000;
        }

        .student-count {
          padding: 8px 11px;
          border-radius: 9px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 9px;
          font-weight: 1000;
        }

        .quick-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .quick-card {
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 15px;
          padding: 15px;
          text-align: left;
          cursor: pointer;
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .quick-card:hover {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow:
            0 10px 25px rgba(37,99,235,.10);
        }

        .quick-label {
          color: #94a3b8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1.4px;
        }

        .quick-value {
          margin-top: 8px;
          color: #2563eb;
          font-size: 19px;
          font-weight: 1000;
        }

        .quick-description {
          margin-top: 4px;
          color: #64748b;
          font-size: 9px;
          line-height: 1.45;
          font-weight: 600;
        }

        .student-service-section {
          margin-top: 18px;
        }

        .student-section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1.6px;
        }

        .student-section-label::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #e2e8f0;
        }

        .student-service-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .student-service-card {
          min-width: 0;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 16px;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 11px;
          box-shadow:
            0 4px 15px rgba(15,23,42,.035);
          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .student-service-card:hover {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow:
            0 10px 25px rgba(37,99,235,.10);
        }

        .student-service-icon {
          width: 47px;
          height: 47px;
          flex: 0 0 47px;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #eef2ff
            );
          border: 1px solid #dbeafe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .5px;
        }

        .student-service-content {
          flex: 1;
          min-width: 0;
        }

        .student-service-title {
          margin: 0;
          color: #172554;
          font-size: 14px;
          font-weight: 1000;
        }

        .student-service-description {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
          font-weight: 600;
        }

        .student-service-arrow {
          color: #2563eb;
          font-size: 17px;
          font-weight: 1000;
        }

        .student-view-all {
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #2563eb;
          padding: 8px 11px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 1000;
        }

        .student-empty {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 15px;
          padding: 19px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .student-empty-icon {
          width: 47px;
          height: 47px;
          flex: 0 0 47px;
          border-radius: 13px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          font-size: 9px;
          font-weight: 1000;
        }

        .student-empty strong {
          color: #334155;
          font-size: 13px;
        }

        .student-empty p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .student-announcement-card {
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 16px;
          background:
            linear-gradient(
              135deg,
              #f8fbff,
              #fff
            );
        }

        .student-announcement-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .student-announcement-icon {
          width: 47px;
          height: 47px;
          flex: 0 0 47px;
          border-radius: 13px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 1000;
        }

        .student-announcement-content {
          min-width: 0;
          flex: 1;
        }

        .student-meta {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .student-teacher-badge,
        .student-latest-badge {
          padding: 4px 6px;
          border-radius: 5px;
          font-size: 8px;
          font-weight: 1000;
        }

        .student-teacher-badge {
          color: #1d4ed8;
          background: #dbeafe;
        }

        .student-latest-badge {
          color: #15803d;
          background: #dcfce7;
        }

        .student-date {
          color: #94a3b8;
          font-size: 9px;
        }

        .student-announcement-title {
          margin: 7px 0 0;
          color: #172554;
          font-size: 17px;
          font-weight: 1000;
        }

        .student-announcement-message {
          margin: 6px 0 0;
          color: #475569;
          font-size: 11px;
          line-height: 1.65;
          font-weight: 600;
        }

        .student-announcement-bottom {
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .student-for-all {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .student-open {
          border: none;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          color: white;
          padding: 9px 12px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 1000;
        }

        .student-profile-panel {
          background:
            linear-gradient(
              135deg,
              #ffffff,
              #f8fafc
            );
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .student-profile-icon {
          width: 49px;
          height: 49px;
          flex: 0 0 49px;
          border-radius: 14px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 1000;
        }

        .student-profile-text {
          flex: 1;
          min-width: 180px;
        }

        .student-profile-text h3 {
          margin: 0;
          color: #172554;
          font-size: 14px;
          font-weight: 1000;
        }

        .student-profile-text p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
        }

        .student-profile-button {
          border: none;
          background: #2563eb;
          color: white;
          padding: 10px 14px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 1000;
        }

        .student-footer {
          margin-top: 20px;
          padding: 17px 5px 5px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          color: #94a3b8;
          font-size: 10px;
        }

        .student-footer strong {
          color: #64748b;
        }

        .student-mobile-nav {
          display: none;
        }

        .student-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15,23,42,.68);
          backdrop-filter: blur(6px);
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-modal {
          width: 100%;
          max-width: 700px;
          max-height: 88vh;
          overflow-y: auto;
          background: white;
          border-radius: 21px;
          padding: 20px;
          box-shadow:
            0 25px 70px rgba(0,0,0,.25);
        }

        .student-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .student-modal-eyebrow {
          color: #2563eb;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1.5px;
        }

        .student-modal-title {
          margin: 5px 0 0;
          color: #172554;
          font-size: 22px;
          line-height: 1.25;
          font-weight: 1000;
        }

        .student-close {
          width: 35px;
          height: 35px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
        }

        .student-modal-date {
          margin-top: 12px;
          color: #94a3b8;
          font-size: 10px;
        }

        .student-modal-message {
          margin-top: 15px;
          padding: 16px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .student-modal-footer {
          margin-top: 15px;
          padding-top: 13px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .student-like {
          border: 1px solid #cbd5e1;
          background: white;
          color: #475569;
          padding: 8px 11px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 1000;
        }

        .student-like-active {
          background: #fff1f2;
          border-color: #fecdd3;
          color: #be123c;
        }

        @media (max-width: 1050px) {
          .student-service-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .quick-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .student-hero-title {
            font-size: 27px;
          }
        }

        @media (max-width: 720px) {
          .racer-student-page {
            padding: 9px;
            padding-bottom: 88px;
          }

          .student-header {
            padding: 9px;
            border-radius: 16px;
            margin-bottom: 9px;
          }

          .student-brand-name {
            font-size: 11px;
          }

          .student-brand-sub {
            font-size: 7px;
          }

          .student-logo {
            width: 39px;
            height: 39px;
            flex-basis: 39px;
            border-radius: 12px;
          }

          .student-clock {
            display: none;
          }

          .student-header-actions {
            gap: 4px;
          }

          .student-header-button {
            min-width: 35px;
            width: 35px;
            padding: 0;
            height: 35px;
            border-radius: 9px;
            font-size: 7px;
          }

          .student-header-profile {
            width: 35px;
            height: 35px;
          }

          .student-logout {
            padding: 8px 9px;
            font-size: 8px;
          }

          .student-hero {
            min-height: 0;
            padding: 19px 16px;
            border-radius: 20px;
            display: block;
            margin-bottom: 9px;
          }

          .student-hero-left {
            gap: 11px;
            align-items: flex-start;
          }

          .student-avatar {
            width: 57px;
            height: 57px;
            flex-basis: 57px;
            border-radius: 17px;
            font-size: 23px;
          }

          .student-eyebrow {
            font-size: 8px;
            letter-spacing: 1.3px;
          }

          .student-hero-title {
            font-size: 20px;
          }

          .student-hero-description {
            font-size: 9px;
            line-height: 1.55;
            margin-top: 6px;
          }

          .student-id-pill {
            margin-top: 8px;
            font-size: 8px;
          }

          .student-status {
            width: 100%;
            margin-top: 14px;
            min-width: 0;
            padding: 10px 12px;
          }

          .student-panel {
            padding: 13px;
            border-radius: 17px;
            margin-bottom: 9px;
          }

          .student-section-title {
            font-size: 19px;
          }

          .student-section-eyebrow {
            font-size: 8px;
          }

          .student-count {
            font-size: 8px;
            padding: 7px 8px;
          }

          .quick-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .quick-card {
            padding: 11px;
            border-radius: 12px;
          }

          .quick-label {
            font-size: 7px;
          }

          .quick-value {
            font-size: 16px;
          }

          .quick-description {
            font-size: 8px;
          }

          .student-service-section {
            margin-top: 14px;
          }

          .student-service-grid {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .student-service-card {
            padding: 10px;
            border-radius: 13px;
          }

          .student-service-icon {
            width: 39px;
            height: 39px;
            flex-basis: 39px;
            border-radius: 11px;
            font-size: 7px;
          }

          .student-service-title {
            font-size: 12px;
          }

          .student-service-description {
            font-size: 9px;
          }

          .student-announcement-card {
            padding: 12px;
            border-radius: 13px;
          }

          .student-announcement-title {
            font-size: 15px;
          }

          .student-announcement-message {
            font-size: 10px;
          }

          .student-open {
            width: 100%;
          }

          .student-profile-button {
            width: 100%;
          }

          .student-footer {
            justify-content: center;
            text-align: center;
          }

          .student-mobile-nav {
            position: fixed;
            left: 8px;
            right: 8px;
            bottom: 8px;
            z-index: 5000;
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 3px;
            padding: 6px;
            background: rgba(255,255,255,.97);
            backdrop-filter: blur(14px);
            border: 1px solid #dbeafe;
            border-radius: 17px;
            box-shadow:
              0 12px 35px rgba(15,23,42,.17);
          }

          .student-mobile-item {
            border: none;
            background: transparent;
            color: #475569;
            min-width: 0;
            padding: 7px 2px;
            border-radius: 11px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            cursor: pointer;
          }

          .student-mobile-item:first-child {
            background: #eff6ff;
            color: #2563eb;
          }

          .student-mobile-icon {
            font-size: 14px;
            line-height: 1;
            font-weight: 1000;
          }

          .student-mobile-label {
            font-size: 7px;
            font-weight: 1000;
          }

          .student-modal {
            max-height: 90vh;
            padding: 16px;
            border-radius: 17px;
          }

          .student-modal-title {
            font-size: 18px;
          }

          .student-modal-message {
            font-size: 12px;
            padding: 13px;
          }
        }

        @media (max-width: 390px) {
          .student-brand-sub {
            display: none;
          }

          .student-brand-name {
            font-size: 10px;
          }

          .student-logout {
            padding: 8px;
            font-size: 8px;
          }

          .student-hero-title {
            font-size: 18px;
          }

          .student-section-title {
            font-size: 17px;
          }

          .quick-description {
            display: none;
          }
        }
      `}</style>

      <main className="racer-student-page">
        <div className="racer-student-container">

          {/* HEADER */}

          <header className="student-header">
            <div className="student-brand">
              <div className="student-logo">
                RA
              </div>

              <div>
                <div className="student-brand-name">
                  RACER ACADEMY
                </div>

                <div className="student-brand-sub">
                  STUDENT PORTAL
                </div>
              </div>
            </div>

            <div className="student-header-actions">
              <div className="student-clock">
                {time}
              </div>

              <button
                type="button"
                onClick={() =>
                  go("/student/announcements")
                }
                className="student-header-button"
                aria-label="Notifications"
              >
                BELL
              </button>

              <button
                type="button"
                onClick={() =>
                  go("/student/profile")
                }
                className="student-header-profile"
                aria-label="Profile"
              >
                {firstLetter}
              </button>

              <button
                type="button"
                onClick={logout}
                className="student-logout"
              >
                Logout
              </button>
            </div>
          </header>

          {/* HERO */}

          <section className="student-hero">
            <div className="student-hero-left">
              <div className="student-avatar">
                {firstLetter}
              </div>

              <div className="student-hero-text">
                <div className="student-eyebrow">
                  HELLO,{" "}
                  {studentName.toUpperCase()}
                </div>

                <h1 className="student-hero-title">
                  Welcome to your Student Portal
                </h1>

                <p className="student-hero-description">
                  Manage your classes,
                  attendance, homework,
                  quizzes, fees, reports
                  and academy communication
                  from one place.
                </p>

                {username && (
                  <div className="student-id-pill">
                    STUDENT ID: {username}
                  </div>
                )}
              </div>
            </div>

            <div className="student-status">
              <span className="student-status-dot" />

              <div>
                <div className="student-status-title">
                  ACCOUNT ACTIVE
                </div>

                <div className="student-status-sub">
                  RACER ACADEMY STUDENT
                </div>
              </div>
            </div>
          </section>

          {/* QUICK ACCESS */}

          <section className="student-panel">
            <div className="student-section-header">
              <div>
                <div className="student-section-eyebrow">
                  QUICK ACCESS
                </div>

                <h2 className="student-section-title">
                  My Services
                </h2>
              </div>

              <div className="student-count">
                STUDENT PORTAL
              </div>
            </div>

            <div className="quick-grid">
              {quickStats.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="quick-card"
                  onClick={() =>
                    go(item.path)
                  }
                >
                  <div className="quick-label">
                    {item.label}
                  </div>

                  <div className="quick-value">
                    {item.value}
                  </div>

                  <div className="quick-description">
                    {item.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ALL SERVICES */}

          <section className="student-panel">
            <div className="student-section-header">
              <div>
                <div className="student-section-eyebrow">
                  STUDENT COMMAND CENTER
                </div>

                <h2 className="student-section-title">
                  Student Services
                </h2>
              </div>

              <div className="student-count">
                {services.length} SERVICES
              </div>
            </div>

            {groupedServices.map(
              (section) => {
                const sectionServices =
                  services.filter(
                    (item) =>
                      item.section ===
                      section
                  );

                if (
                  sectionServices.length ===
                  0
                ) {
                  return null;
                }

                return (
                  <div
                    key={section}
                    className="student-service-section"
                  >
                    <div className="student-section-label">
                      {section}
                    </div>

                    <div className="student-service-grid">
                      {sectionServices.map(
                        (service) => (
                          <button
                            key={
                              service.title
                            }
                            type="button"
                            onClick={() =>
                              go(
                                service.path
                              )
                            }
                            className="student-service-card"
                          >
                            <div className="student-service-icon">
                              {service.icon}
                            </div>

                            <div className="student-service-content">
                              <h3 className="student-service-title">
                                {service.title}
                              </h3>

                              <p className="student-service-description">
                                {
                                  service.description
                                }
                              </p>
                            </div>

                            <div className="student-service-arrow">
                              →
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </section>

          {/* LATEST ANNOUNCEMENT */}

          <section className="student-panel">
            <div className="student-section-header">
              <div>
                <div className="student-section-eyebrow">
                  ACADEMY COMMUNICATION
                </div>

                <h2 className="student-section-title">
                  Latest Announcement
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  go(
                    "/student/announcements"
                  )
                }
                className="student-view-all"
              >
                View All →
              </button>
            </div>

            {announcementLoading ? (
              <div className="student-empty">
                <div className="student-empty-icon">
                  LOAD
                </div>

                <div>
                  <strong>
                    Loading announcements...
                  </strong>

                  <p>
                    Checking for the latest
                    academy updates.
                  </p>
                </div>
              </div>
            ) : !latestAnnouncement ? (
              <div className="student-empty">
                <div className="student-empty-icon">
                  NEWS
                </div>

                <div>
                  <strong>
                    No announcements yet
                  </strong>

                  <p>
                    Your teacher has not
                    published an announcement.
                  </p>
                </div>
              </div>
            ) : (
              <div className="student-announcement-card">
                <div className="student-announcement-top">
                  <div className="student-announcement-icon">
                    NEWS
                  </div>

                  <div className="student-announcement-content">
                    <div className="student-meta">
                      <span className="student-teacher-badge">
                        TEACHER
                      </span>

                      <span className="student-latest-badge">
                        LATEST
                      </span>

                      <span className="student-date">
                        {formatDate(
                          latestAnnouncement.created_at
                        )}
                      </span>
                    </div>

                    <h3 className="student-announcement-title">
                      {
                        latestAnnouncement.title
                      }
                    </h3>

                    <p className="student-announcement-message">
                      {getAnnouncementPreview(
                        latestAnnouncement.message
                      )}
                    </p>
                  </div>
                </div>

                <div className="student-announcement-bottom">
                  <span className="student-for-all">
                    FOR ALL STUDENTS
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setAnnouncementOpen(
                        true
                      )
                    }
                    className="student-open"
                  >
                    Open Announcement →
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* PROFILE */}

          <section className="student-profile-panel">
            <div className="student-profile-icon">
              PROFILE
            </div>

            <div className="student-profile-text">
              <h3>
                Student Profile
              </h3>

              <p>
                View your personal and
                academic information.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                go("/student/profile")
              }
              className="student-profile-button"
            >
              View Profile →
            </button>
          </section>

          {/* FOOTER */}

          <footer className="student-footer">
            <strong>
              RACER ACADEMY
            </strong>

            <span>
              Student Portal • 2026
            </span>
          </footer>
        </div>

        {/* ANNOUNCEMENT MODAL */}

        {announcementOpen &&
          latestAnnouncement && (
            <div
              className="student-overlay"
              onClick={() =>
                setAnnouncementOpen(false)
              }
            >
              <div
                className="student-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="student-modal-header">
                  <div>
                    <div className="student-modal-eyebrow">
                      LATEST ANNOUNCEMENT
                    </div>

                    <h2 className="student-modal-title">
                      {
                        latestAnnouncement.title
                      }
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAnnouncementOpen(
                        false
                      )
                    }
                    className="student-close"
                  >
                    ×
                  </button>
                </div>

                <div className="student-modal-date">
                  {formatDate(
                    latestAnnouncement.created_at
                  )}
                </div>

                <div className="student-modal-message">
                  {
                    latestAnnouncement.message
                  }
                </div>

                <div className="student-modal-footer">
                  <span className="student-for-all">
                    FOR ALL STUDENTS
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      toggleLike(
                        latestAnnouncement.id
                      )
                    }
                    disabled={
                      likingId ===
                      latestAnnouncement.id
                    }
                    className={`student-like ${
                      latestAnnouncement.likedByMe
                        ? "student-like-active"
                        : ""
                    }`}
                  >
                    {latestAnnouncement.likedByMe
                      ? "LIKED"
                      : "LIKE"}{" "}
                    {latestAnnouncement.likeCount}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* MOBILE BOTTOM NAVIGATION */}

        <nav className="student-mobile-nav">
          <button
            type="button"
            onClick={() =>
              go("/student")
            }
            className="student-mobile-item"
          >
            <span className="student-mobile-icon">
              H
            </span>

            <span className="student-mobile-label">
              Home
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              go("/student/timetable")
            }
            className="student-mobile-item"
          >
            <span className="student-mobile-icon">
              T
            </span>

            <span className="student-mobile-label">
              Time Table
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              go("/student/ask-query")
            }
            className="student-mobile-item"
          >
            <span className="student-mobile-icon">
              Q
            </span>

            <span className="student-mobile-label">
              Ask Query
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              go("/student/profile")
            }
            className="student-mobile-item"
          >
            <span className="student-mobile-icon">
              P
            </span>

            <span className="student-mobile-label">
              Profile
            </span>
          </button>
        </nav>
      </main>
    </>
  );
}

function getAnnouncementPreview(
  message: string
) {
  if (!message) {
    return "You have a new announcement from your teacher.";
  }

  const clean =
    message.replace(/\s+/g, " ").trim();

  return clean.length <= 190
    ? clean
    : `${clean.substring(0, 190)}...`;
}