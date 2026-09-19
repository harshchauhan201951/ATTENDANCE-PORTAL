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
                ) === Number(announcement.id)
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

  const latestAnnouncement =
    announcements[0] || null;

  const firstLetter =
    studentName.charAt(0).toUpperCase();

  const services: Service[] = [
    {
      icon: "🏠",
      title: "Home",
      description:
        "Your student dashboard and latest updates.",
      path: "/student",
      section: "MAIN",
    },
    {
      icon: "🕐",
      title: "Time Table",
      description:
        "View today's, tomorrow's and weekly class timetable.",
      path: "/student/timetable",
      section: "ACADEMIC",
    },
    {
      icon: "📊",
      title: "Attendance",
      description:
        "Check today's, semester and detailed attendance.",
      path: "/student/attendance",
      section: "ACADEMIC",
    },
    {
      icon: "📅",
      title: "Attendance History",
      description:
        "View previous attendance records.",
      path: "/student/attendance-history",
      section: "ACADEMIC",
    },
    {
      icon: "📆",
      title: "Academic Calendar",
      description:
        "View important academic dates.",
      path: "/student/calendar",
      section: "ACADEMIC",
    },
    {
      icon: "📚",
      title: "Homework",
      description:
        "View homework assigned by your teacher.",
      path: "/student/homework",
      section: "ACADEMIC",
    },
    {
      icon: "🧠",
      title: "Quiz Tests",
      description:
        "Attempt quizzes and check your results.",
      path: "/student/quiz-tests",
      section: "ACADEMIC",
    },
    {
      icon: "📢",
      title: "Announcements",
      description:
        "Read all announcements from the academy.",
      path: "/student/announcements",
      section: "COMMUNICATION",
    },
    {
      icon: "💬",
      title: "Ask Query",
      description:
        "Send your academic query to the academy.",
      path: "/student/ask-query",
      section: "COMMUNICATION",
    },
    {
      icon: "🔔",
      title: "Notifications",
      description:
        "View important student notifications.",
      path: "/student/announcements",
      section: "COMMUNICATION",
    },
    {
      icon: "💰",
      title: "Fees",
      description:
        "Check fees and payment information.",
      path: "/student/fees",
      section: "ACCOUNT",
    },
    {
      icon: "📑",
      title: "Reports",
      description:
        "View attendance and performance reports.",
      path: "/student/reports",
      section: "ACCOUNT",
    },
    {
      icon: "👤",
      title: "Profile",
      description:
        "View your student and academic information.",
      path: "/student/profile",
      section: "ACCOUNT",
    },
    {
      icon: "⚙️",
      title: "Settings",
      description:
        "Manage your student account settings.",
      path: "/student/settings",
      section: "ACCOUNT",
    },
  ];

  const groupedServices = [
    "MAIN",
    "ACADEMIC",
    "COMMUNICATION",
    "ACCOUNT",
  ];

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.brand}>
            <div style={styles.logo}>
              RA
            </div>

            <div>
              <div style={styles.brandName}>
                RACER ACADEMY
              </div>

              <div style={styles.brandSub}>
                STUDENT PORTAL
              </div>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.clock}>
              🕐 {time}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/announcements"
                )
              }
              style={styles.iconButton}
              aria-label="Notifications"
            >
              🔔
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/profile"
                )
              }
              style={styles.profileMini}
              aria-label="Profile"
            >
              {firstLetter}
            </button>

            <button
              type="button"
              onClick={logout}
              style={styles.logout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* WELCOME */}

        <section style={styles.hero}>
          <div style={styles.heroLeft}>
            <div style={styles.avatar}>
              {firstLetter}
            </div>

            <div style={styles.heroText}>
              <div style={styles.eyebrow}>
                HELLO, {studentName.toUpperCase()}
              </div>

              <h1 style={styles.heroTitle}>
                Welcome to your Student Portal
              </h1>

              <p style={styles.heroDescription}>
                Manage your classes, attendance,
                homework, quizzes, fees,
                reports and communication
                from one place.
              </p>

              {username && (
                <div style={styles.username}>
                  Student ID: {username}
                </div>
              )}
            </div>
          </div>

          <div style={styles.activeBox}>
            <span style={styles.activeDot} />
            <div>
              <div style={styles.activeTitle}>
                ACCOUNT ACTIVE
              </div>
              <div style={styles.activeSub}>
                RACER ACADEMY
              </div>
            </div>
          </div>
        </section>

        {/* QUICK ACCESS */}

        <section style={styles.quickSection}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>
                QUICK ACCESS
              </div>

              <h2 style={styles.sectionTitle}>
                Student Services
              </h2>
            </div>

            <div style={styles.countBadge}>
              {services.length} SERVICES
            </div>
          </div>

          {groupedServices.map(
            (section) => {
              const sectionServices =
                services.filter(
                  (item) =>
                    item.section === section
                );

              if (
                sectionServices.length === 0
              ) {
                return null;
              }

              return (
                <div
                  key={section}
                  style={styles.serviceSection}
                >
                  <div
                    style={
                      styles.sectionLabel
                    }
                  >
                    {section}
                  </div>

                  <div
                    style={
                      styles.serviceGrid
                    }
                  >
                    {sectionServices.map(
                      (service) => (
                        <button
                          key={service.path}
                          type="button"
                          onClick={() =>
                            router.push(
                              service.path
                            )
                          }
                          style={
                            styles.serviceCard
                          }
                        >
                          <div
                            style={
                              styles.serviceIcon
                            }
                          >
                            {service.icon}
                          </div>

                          <div
                            style={
                              styles.serviceContent
                            }
                          >
                            <h3
                              style={
                                styles.serviceTitle
                              }
                            >
                              {service.title}
                            </h3>

                            <p
                              style={
                                styles.serviceDescription
                              }
                            >
                              {
                                service.description
                              }
                            </p>
                          </div>

                          <div
                            style={
                              styles.serviceArrow
                            }
                          >
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

        <section style={styles.announcementSection}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>
                COMMUNICATION
              </div>

              <h2 style={styles.sectionTitle}>
                Latest Announcement
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/announcements"
                )
              }
              style={styles.viewAllButton}
            >
              View All →
            </button>
          </div>

          {announcementLoading ? (
            <div style={styles.emptyBox}>
              <div style={styles.loadingCircle}>
                ⏳
              </div>

              <div>
                <strong>
                  Loading announcements...
                </strong>

                <p>
                  Please wait while we
                  check for updates.
                </p>
              </div>
            </div>
          ) : !latestAnnouncement ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                📭
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
            <div style={styles.announcementCard}>
              <div style={styles.announcementTop}>
                <div style={styles.announcementIcon}>
                  📢
                </div>

                <div style={styles.announcementContent}>
                  <div style={styles.meta}>
                    <span style={styles.teacherBadge}>
                      TEACHER
                    </span>

                    <span style={styles.newBadge}>
                      LATEST
                    </span>

                    <span style={styles.date}>
                      {formatDate(
                        latestAnnouncement.created_at
                      )}
                    </span>
                  </div>

                  <h3 style={styles.announcementTitle}>
                    {latestAnnouncement.title}
                  </h3>

                  <p style={styles.announcementMessage}>
                    {getAnnouncementPreview(
                      latestAnnouncement.message
                    )}
                  </p>
                </div>
              </div>

              <div style={styles.announcementBottom}>
                <span style={styles.forAll}>
                  👥 For all students
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setAnnouncementOpen(true)
                  }
                  style={styles.openButton}
                >
                  Open Announcement →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* MODAL */}

        {announcementOpen &&
          latestAnnouncement && (
            <div
              style={styles.overlay}
              onClick={() =>
                setAnnouncementOpen(false)
              }
            >
              <div
                style={styles.modal}
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div style={styles.modalHeader}>
                  <div>
                    <div style={styles.modalEyebrow}>
                      LATEST ANNOUNCEMENT
                    </div>

                    <h2 style={styles.modalTitle}>
                      {latestAnnouncement.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAnnouncementOpen(false)
                    }
                    style={styles.closeButton}
                  >
                    ×
                  </button>
                </div>

                <div style={styles.modalDate}>
                  {formatDate(
                    latestAnnouncement.created_at
                  )}
                </div>

                <div style={styles.modalMessage}>
                  {latestAnnouncement.message}
                </div>

                <div style={styles.modalFooter}>
                  <span style={styles.forAll}>
                    👥 For all students
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
                    style={{
                      ...styles.likeButton,
                      ...(latestAnnouncement.likedByMe
                        ? styles.likeActive
                        : {}),
                    }}
                  >
                    {latestAnnouncement.likedByMe
                      ? "❤️ Liked"
                      : "🤍 Like"}{" "}
                    {latestAnnouncement.likeCount}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* PROFILE PROMO */}

        <section style={styles.profilePanel}>
          <div style={styles.profilePanelIcon}>
            👤
          </div>

          <div style={styles.profilePanelText}>
            <h3>
              Keep your student profile updated
            </h3>

            <p>
              View your personal and academic
              information in your student profile.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/profile"
              )
            }
            style={styles.profileButton}
          >
            View Profile →
          </button>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            RACER ACADEMY
          </strong>

          <span>
            Student Portal • 2026
          </span>
        </footer>
      </div>

      {/* MOBILE BOTTOM NAV */}

      <nav style={styles.mobileNav}>
        <button
          type="button"
          onClick={() =>
            router.push("/student")
          }
          style={styles.mobileNavItem}
        >
          <span>🏠</span>
          <small>Home</small>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/student/timetable"
            )
          }
          style={styles.mobileNavItem}
        >
          <span>🕐</span>
          <small>Time Table</small>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/student/ask-query"
            )
          }
          style={styles.mobileNavItem}
        >
          <span>💬</span>
          <small>Ask Query</small>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/student/profile"
            )
          }
          style={styles.mobileNavItem}
        >
          <span>👤</span>
          <small>Profile</small>
        </button>
      </nav>
    </main>
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

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#f8fafc,#eef2ff,#f0f9ff)",
    padding: "16px",
    paddingBottom: "30px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    maxWidth: "1250px",
    width: "100%",
    margin: "0 auto",
  },

  header: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    boxShadow:
      "0 7px 25px rgba(15,23,42,.06)",
    marginBottom: "16px",
    flexWrap: "wrap",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  logo: {
    width: "44px",
    height: "44px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "1000",
  },

  brandName: {
    fontSize: "14px",
    fontWeight: "1000",
    letterSpacing: "1px",
    color: "#172554",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "9px",
    letterSpacing: "1.5px",
    color: "#64748b",
    fontWeight: "900",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  clock: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    padding: "9px 11px",
    fontSize: "10px",
    fontWeight: "800",
    color: "#475569",
  },

  iconButton: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "17px",
  },

  profileMini: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff",
    fontWeight: "1000",
    cursor: "pointer",
  },

  logout: {
    border: "none",
    background: "#0f172a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "24px",
    padding: "30px",
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 18px 45px rgba(37,99,235,.22)",
  },

  heroLeft: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    minWidth: 0,
  },

  avatar: {
    width: "82px",
    height: "82px",
    minWidth: "82px",
    borderRadius: "23px",
    background: "#fff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "35px",
    fontWeight: "1000",
    boxShadow:
      "0 10px 30px rgba(0,0,0,.18)",
  },

  heroText: {
    minWidth: 0,
  },

  eyebrow: {
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "2px",
  },

  heroTitle: {
    margin: "7px 0 0",
    fontSize: "29px",
    lineHeight: 1.2,
    fontWeight: "1000",
  },

  heroDescription: {
    margin: "8px 0 0",
    color: "#dbeafe",
    fontSize: "12px",
    lineHeight: 1.6,
    maxWidth: "650px",
    fontWeight: "600",
  },

  username: {
    display: "inline-block",
    marginTop: "12px",
    padding: "7px 10px",
    borderRadius: "8px",
    background:
      "rgba(255,255,255,.13)",
    border:
      "1px solid rgba(255,255,255,.2)",
    fontSize: "10px",
    fontWeight: "900",
  },

  activeBox: {
    background:
      "rgba(255,255,255,.12)",
    border:
      "1px solid rgba(255,255,255,.2)",
    borderRadius: "13px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: "150px",
  },

  activeDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow:
      "0 0 0 5px rgba(74,222,128,.15)",
  },

  activeTitle: {
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  activeSub: {
    marginTop: "3px",
    fontSize: "9px",
    color: "#bfdbfe",
  },

  quickSection: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 7px 24px rgba(15,23,42,.05)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: "23px",
    fontWeight: "1000",
    color: "#172554",
  },

  countBadge: {
    padding: "8px 11px",
    borderRadius: "9px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "1000",
  },

  serviceSection: {
    marginTop: "18px",
  },

  sectionLabel: {
    fontSize: "9px",
    fontWeight: "1000",
    color: "#94a3b8",
    letterSpacing: "1.5px",
    marginBottom: "9px",
  },

  serviceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "12px",
  },

  serviceCard: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: "15px",
    padding: "14px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
    boxShadow:
      "0 5px 16px rgba(15,23,42,.04)",
  },

  serviceIcon: {
    width: "45px",
    height: "45px",
    minWidth: "45px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  serviceContent: {
    flex: 1,
    minWidth: 0,
  },

  serviceTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "1000",
    color: "#172554",
  },

  serviceDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  serviceArrow: {
    color: "#2563eb",
    fontSize: "18px",
    fontWeight: "1000",
  },

  announcementSection: {
    background: "#fff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 7px 24px rgba(15,23,42,.05)",
  },

  viewAllButton: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  emptyBox: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  loadingCircle: {
    fontSize: "25px",
  },

  emptyIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  announcementCard: {
    border: "1px solid #bfdbfe",
    borderRadius: "15px",
    padding: "15px",
    background:
      "linear-gradient(135deg,#f8fbff,#fff)",
  },

  announcementTop: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },

  announcementIcon: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    borderRadius: "12px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  announcementContent: {
    minWidth: 0,
    flex: 1,
  },

  meta: {
    display: "flex",
    gap: "7px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  teacherBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "4px 6px",
    borderRadius: "5px",
    fontSize: "8px",
    fontWeight: "1000",
  },

  newBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "4px 6px",
    borderRadius: "5px",
    fontSize: "8px",
    fontWeight: "1000",
  },

  date: {
    color: "#94a3b8",
    fontSize: "9px",
  },

  announcementTitle: {
    margin: "7px 0 0",
    color: "#172554",
    fontSize: "17px",
    fontWeight: "1000",
  },

  announcementMessage: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  announcementBottom: {
    marginTop: "13px",
    paddingTop: "11px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  forAll: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
  },

  openButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#fff",
    padding: "9px 12px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(15,23,42,.65)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },

  modal: {
    width: "100%",
    maxWidth: "700px",
    maxHeight: "88vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: "20px",
    padding: "20px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },

  modalEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "1.5px",
  },

  modalTitle: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "22px",
    fontWeight: "1000",
  },

  closeButton: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "22px",
    cursor: "pointer",
  },

  modalDate: {
    marginTop: "12px",
    color: "#94a3b8",
    fontSize: "10px",
  },

  modalMessage: {
    marginTop: "15px",
    padding: "15px",
    borderRadius: "13px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
  },

  modalFooter: {
    marginTop: "15px",
    paddingTop: "13px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  likeButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#475569",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  likeActive: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#be123c",
  },

  profilePanel: {
    background:
      "linear-gradient(135deg,#fff,#f8fafc)",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  profilePanelIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  profilePanelText: {
    flex: 1,
    minWidth: "200px",
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  footer: {
    marginTop: "20px",
    padding: "17px 5px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    color: "#94a3b8",
    fontSize: "10px",
  },

  mobileNav: {
    position: "fixed",
    bottom: "10px",
    left: "10px",
    right: "10px",
    zIndex: 5000,
    background: "rgba(255,255,255,.96)",
    backdropFilter: "blur(12px)",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    padding: "7px 5px",
    display: "none",
    gridTemplateColumns:
      "repeat(4,1fr)",
    boxShadow:
      "0 10px 30px rgba(15,23,42,.15)",
  },

  mobileNavItem: {
    border: "none",
    background: "transparent",
    padding: "6px 2px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    color: "#475569",
    cursor: "pointer",
    fontWeight: "800",
  },
};

/* RESPONSIVE CSS */

if (
  typeof document !== "undefined"
) {
  const styleId =
    "racer-student-dashboard-responsive";

  if (!document.getElementById(styleId)) {
    const style =
      document.createElement("style");

    style.id = styleId;

    style.innerHTML = `
      @media (max-width: 900px) {
        .racer-student-dashboard-placeholder {
          display: none;
        }
      }

      @media (max-width: 700px) {
        body {
          margin: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }
}