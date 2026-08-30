"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type DashboardCard = {
  icon: string;
  title: string;
  description: string;
  path: string;
  className: string;
};

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
  likeCount: number;
  likedByMe: boolean;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("Student");
  const [username, setUsername] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [time, setTime] = useState("");

  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [announcementLoading, setAnnouncementLoading] =
    useState(true);

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

    /*
     * FIRST:
     * Resolve the real student ID from username.
     */
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

        /*
         * Register this student's device for
         * push notifications.
         */
        await registerPushNotifications(resolvedId);

        return;
      }
    }

    /*
     * FALLBACK:
     * Existing studentId from localStorage.
     */
    if (savedStudentId) {
      const parsedId = Number(savedStudentId);

      if (!Number.isNaN(parsedId) && parsedId > 0) {
        setStudentId(parsedId);

        await loadAnnouncements(parsedId);

        /*
         * Register this student's device for
         * push notifications.
         */
        await registerPushNotifications(parsedId);

        return;
      }
    }

    /*
     * No student identity found.
     */
    setStudentId(null);

    await loadAnnouncements(null);
  }

  async function resolveStudentId(
    studentUsername: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id")
        .eq(
          "student_username",
          studentUsername
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Student ID lookup error:",
          error
        );

        return null;
      }

      if (!data?.id) {
        console.error(
          "Student ID not found for username:",
          studentUsername
        );

        return null;
      }

      return Number(data.id);
    } catch (error) {
      console.error(
        "Unexpected student ID lookup error:",
        error
      );

      return null;
    }
  }

  /*
   * =====================================================
   * PUSH NOTIFICATION REGISTRATION
   * =====================================================
   *
   * This runs automatically after the student ID
   * has been successfully identified.
   *
   * It:
   * 1. Checks browser support.
   * 2. Registers /sw.js.
   * 3. Requests notification permission.
   * 4. Reuses an existing subscription if available.
   * 5. Creates a new PushSubscription when required.
   * 6. Sends the subscription to:
   *    /api/push/subscribe
   */
  async function registerPushNotifications(
    currentStudentId: number
  ) {
    try {
      if (typeof window === "undefined") {
        return;
      }

      if (!("serviceWorker" in navigator)) {
        console.warn(
          "Service Worker is not supported by this browser."
        );

        return;
      }

      if (!("PushManager" in window)) {
        console.warn(
          "Push notifications are not supported by this browser."
        );

        return;
      }

      if (!("Notification" in window)) {
        console.warn(
          "Notifications are not supported by this browser."
        );

        return;
      }

      /*
       * Register the existing public/sw.js file.
       */
      const registration =
        await navigator.serviceWorker.register(
          "/sw.js"
        );

      console.log(
        "Push service worker registered:",
        registration.scope
      );

      /*
       * Ask the browser for notification permission.
       */
      let permission =
        Notification.permission;

      if (permission === "default") {
        permission =
          await Notification.requestPermission();
      }

      /*
       * Student denied notifications.
       *
       * Do not stop the dashboard.
       */
      if (permission !== "granted") {
        console.warn(
          "Notification permission was not granted."
        );

        return;
      }

      /*
       * Get an existing push subscription.
       */
      let subscription =
        await registration.pushManager.getSubscription();

      /*
       * If there is no existing subscription,
       * create a new one.
       */
      if (!subscription) {
        const vapidPublicKey =
          process.env
            .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          console.error(
            "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing."
          );

          return;
        }

        const applicationServerKey =
          urlBase64ToUint8Array(
            vapidPublicKey
          );

        subscription =
          await registration.pushManager.subscribe(
            {
              userVisibleOnly: true,
              applicationServerKey,
            }
          );
      }

      /*
       * Send the subscription to the API.
       */
      const response = await fetch(
        "/api/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            studentId:
              currentStudentId,
            subscription:
              subscription.toJSON(),
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Push subscription API error:",
          errorText
        );

        return;
      }

      console.log(
        "Student push notification registration completed."
      );
    } catch (error) {
      /*
       * Push registration must NEVER break
       * the student dashboard.
       */
      console.error(
        "Push notification registration error:",
        error
      );
    }
  }

  /*
   * Convert VAPID public key from Base64URL
   * into Uint8Array for PushManager.subscribe().
   */
  function urlBase64ToUint8Array(
    base64String: string
  ) {
    const padding =
      "=".repeat(
        (4 -
          (base64String.length % 4)) %
          4
      );

    const base64 =
      (
        base64String +
        padding
      )
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData =
      window.atob(base64);

    const outputArray =
      new Uint8Array(
        rawData.length
      );

    for (
      let i = 0;
      i < rawData.length;
      ++i
    ) {
      outputArray[i] =
        rawData.charCodeAt(i);
    }

    return outputArray;
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
        console.error(
          "Announcements loading error:",
          announcementError
        );

        setAnnouncements([]);

        return;
      }

      const announcementRows =
        announcementData || [];

      if (announcementRows.length === 0) {
        setAnnouncements([]);

        return;
      }

      const announcementIds =
        announcementRows.map(
          (announcement) =>
            announcement.id
        );

      const {
        data: likesData,
        error: likesError,
      } = await supabase
        .from("announcement_likes")
        .select(
          "announcement_id, student_id"
        )
        .in(
          "announcement_id",
          announcementIds
        );

      if (likesError) {
        console.error(
          "Announcement likes loading error:",
          likesError
        );
      }

      const likes =
        likesData || [];

      const formattedAnnouncements =
        announcementRows.map(
          (announcement) => {
            const announcementLikes =
              likes.filter(
                (like) =>
                  Number(
                    like.announcement_id
                  ) ===
                  Number(
                    announcement.id
                  )
              );

            const likedByMe =
              currentStudentId !== null &&
              announcementLikes.some(
                (like) =>
                  Number(
                    like.student_id
                  ) ===
                  Number(
                    currentStudentId
                  )
              );

            return {
              id: announcement.id,
              title: announcement.title,
              message:
                announcement.message,
              created_at:
                announcement.created_at,
              likeCount:
                announcementLikes.length,
              likedByMe,
            };
          }
        );

      setAnnouncements(
        formattedAnnouncements
      );
    } catch (error) {
      console.error(
        "Unexpected announcements error:",
        error
      );

      setAnnouncements([]);
    } finally {
      setAnnouncementLoading(false);
    }
  }

  async function toggleLike(
    announcementId: number
  ) {
    let currentStudentId =
      studentId;

    if (
      !currentStudentId &&
      username
    ) {
      const resolvedId =
        await resolveStudentId(
          username
        );

      if (resolvedId !== null) {
        currentStudentId =
          resolvedId;

        setStudentId(
          resolvedId
        );

        localStorage.setItem(
          "studentId",
          String(resolvedId)
        );
      }
    }

    if (!currentStudentId) {
      alert(
        "Student information could not be found. Please login again."
      );

      return;
    }

    if (likingId !== null) {
      return;
    }

    const selectedAnnouncement =
      announcements.find(
        (item) =>
          item.id ===
          announcementId
      );

    if (!selectedAnnouncement) {
      return;
    }

    setLikingId(
      announcementId
    );

    try {
      /*
       * UNLIKE
       */
      if (
        selectedAnnouncement.likedByMe
      ) {
        const { error } =
          await supabase
            .from(
              "announcement_likes"
            )
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
          console.error(
            "Unlike error:",
            error
          );

          alert(
            `Could not remove like: ${error.message}`
          );

          return;
        }

        setAnnouncements(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                announcementId
                  ? {
                      ...item,
                      likedByMe:
                        false,
                      likeCount:
                        Math.max(
                          0,
                          item.likeCount -
                            1
                        ),
                    }
                  : item
            )
        );

        return;
      }

      /*
       * LIKE
       */
      const { error } =
        await supabase
          .from(
            "announcement_likes"
          )
          .insert({
            announcement_id:
              announcementId,
            student_id:
              currentStudentId,
          });

      if (error) {
        console.error(
          "Like error:",
          error
        );

        if (
          error.code ===
          "23505"
        ) {
          await loadAnnouncements(
            currentStudentId
          );
        } else {
          alert(
            `Could not like announcement: ${error.message}`
          );
        }

        return;
      }

      setAnnouncements(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              announcementId
                ? {
                    ...item,
                    likedByMe:
                      true,
                    likeCount:
                      item.likeCount +
                      1,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        "Unexpected like error:",
        error
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

  function formatAnnouncementDate(
    date: string
  ) {
    if (!date) {
      return "";
    }

    return new Date(
      date
    ).toLocaleString(
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

  const firstLetter =
    studentName
      .charAt(0)
      .toUpperCase();

  const cards: DashboardCard[] = [
    {
      icon: "📊",
      title: "My Attendance",
      description:
        "View your current attendance and attendance percentage.",
      path: "/student/attendance",
      className: "blue",
    },
    {
      icon: "📜",
      title: "Attendance History",
      description:
        "Check your previous attendance records and details.",
      path: "/student/attendance-history",
      className: "purple",
    },
    {
      icon: "📅",
      title: "Academic Calendar",
      description:
        "View important academic dates and calendar information.",
      path: "/student/calendar",
      className: "green",
    },
    {
      icon: "📈",
      title: "Reports",
      description:
        "View your attendance reports and performance details.",
      path: "/student/reports",
      className: "orange",
    },
    {
      icon: "💰",
      title: "Fees",
      description:
        "Check your student fee information and payment details.",
      path: "/student/fees",
      className: "pink",
    },
    {
      icon: "📚",
      title: "Homework",
      description:
        "View homework assigned to your class by your teacher.",
      path: "/student/homework",
      className: "indigo",
    },
    {
      icon: "⚙️",
      title: "Settings",
      description:
        "Manage your account, name and password.",
      path: "/student/settings",
      className: "cyan",
    },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* TOP NAVIGATION */}

        <nav style={styles.navbar}>
          <div style={styles.brandArea}>
            <div style={styles.brandIcon}>
              🎓
            </div>

            <div>
              <div style={styles.brandName}>
                ATTENDANCE PORTAL
              </div>

              <div style={styles.brandSub}>
                STUDENT CENTER
              </div>
            </div>
          </div>

          <div style={styles.navRight}>
            <div style={styles.clock}>
              🕒 {time}
            </div>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        </nav>

        {/* HERO */}

        <section style={styles.hero}>
          <div
            style={
              styles.heroGlowOne
            }
          />

          <div
            style={
              styles.heroGlowTwo
            }
          />

          <div style={styles.heroContent}>
            <div style={styles.avatar}>
              {firstLetter}
            </div>

            <div style={styles.welcomeArea}>
              <div style={styles.smallGreeting}>
                STUDENT DASHBOARD
              </div>

              <h1 style={styles.welcomeTitle}>
                Welcome, {studentName}
              </h1>

              <p style={styles.welcomeText}>
                Manage your attendance,
                academic information,
                homework, reports, fees
                and account settings from
                one place.
              </p>

              {username && (
                <div
                  style={
                    styles.usernameBadge
                  }
                >
                  Username: {username}
                </div>
              )}
            </div>
          </div>

          <div style={styles.heroSide}>
            <div style={styles.statusDot} />

            <div>
              <div style={styles.onlineText}>
                ACCOUNT ACTIVE
              </div>

              <div style={styles.onlineSub}>
                Student Portal
              </div>
            </div>
          </div>
        </section>

        {/* ANNOUNCEMENTS */}

        <section
          style={
            styles.announcementSection
          }
        >
          <div
            style={
              styles.announcementHeader
            }
          >
            <div>
              <div
                style={
                  styles.announcementEyebrow
                }
              >
                📢 IMPORTANT
              </div>

              <h2
                style={
                  styles.announcementTitle
                }
              >
                Announcements
              </h2>

              <p
                style={
                  styles.announcementSubtitle
                }
              >
                Latest updates from your
                teacher for all students.
              </p>
            </div>

            <div
              style={
                styles.announcementBadge
              }
            >
              {announcements.length}{" "}
              {announcements.length === 1
                ? "ANNOUNCEMENT"
                : "ANNOUNCEMENTS"}
            </div>
          </div>

          {announcementLoading ? (
            <div
              style={
                styles.announcementLoading
              }
            >
              <div
                style={
                  styles.loadingIcon
                }
              >
                ⏳
              </div>

              <div>
                <div
                  style={
                    styles.loadingTitle
                  }
                >
                  Loading Announcements...
                </div>

                <div
                  style={
                    styles.loadingText
                  }
                >
                  Please wait.
                </div>
              </div>
            </div>
          ) : announcements.length ===
            0 ? (
            <div
              style={
                styles.noAnnouncements
              }
            >
              <div
                style={
                  styles.noAnnouncementIcon
                }
              >
                📭
              </div>

              <div>
                <h3
                  style={
                    styles.noAnnouncementTitle
                  }
                >
                  No Announcements Yet
                </h3>

                <p
                  style={
                    styles.noAnnouncementText
                  }
                >
                  Your teacher has not
                  published any announcement
                  yet.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={
                styles.announcementList
              }
            >
              {announcements.map(
                (announcement) => (
                  <article
                    key={
                      announcement.id
                    }
                    style={
                      styles.announcementCard
                    }
                  >
                    <div
                      style={
                        styles.announcementCardTop
                      }
                    >
                      <div
                        style={
                          styles.announcementIcon
                        }
                      >
                        📢
                      </div>

                      <div
                        style={
                          styles.announcementCardContent
                        }
                      >
                        <div
                          style={
                            styles.announcementMeta
                          }
                        >
                          <span
                            style={
                              styles.teacherBadge
                            }
                          >
                            TEACHER
                          </span>

                          <span
                            style={
                              styles.announcementDate
                            }
                          >
                            {formatAnnouncementDate(
                              announcement.created_at
                            )}
                          </span>
                        </div>

                        <h3
                          style={
                            styles.announcementCardTitle
                          }
                        >
                          {
                            announcement.title
                          }
                        </h3>

                        <p
                          style={
                            styles.announcementMessage
                          }
                        >
                          {
                            announcement.message
                          }
                        </p>
                      </div>
                    </div>

                    <div
                      style={
                        styles.announcementBottom
                      }
                    >
                      <div
                        style={
                          styles.everyoneText
                        }
                      >
                        👥 For all students
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleLike(
                            announcement.id
                          )
                        }
                        disabled={
                          likingId ===
                          announcement.id
                        }
                        style={{
                          ...styles.likeButton,
                          ...(announcement.likedByMe
                            ? styles.likeButtonActive
                            : {}),
                          opacity:
                            likingId ===
                            announcement.id
                              ? 0.65
                              : 1,
                          cursor:
                            likingId ===
                            announcement.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {announcement.likedByMe
                          ? "❤️ Liked"
                          : "🤍 Like"}

                        <span
                          style={
                            styles.likeCount
                          }
                        >
                          {
                            announcement.likeCount
                          }
                        </span>
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* NOTICE */}

        <section style={styles.notice}>
          <div style={styles.noticeIcon}>
            ℹ️
          </div>

          <div>
            <div style={styles.noticeTitle}>
              Student Information Center
            </div>

            <p style={styles.noticeText}>
              Use the options below to check
              your attendance, academic
              calendar, homework, reports,
              fees and account settings.
            </p>
          </div>
        </section>

        {/* SERVICES */}

        <section>
          <div style={styles.sectionHeading}>
            <div>
              <div
                style={
                  styles.sectionEyebrow
                }
              >
                STUDENT SERVICES
              </div>

              <h2 style={styles.sectionTitle}>
                Your Dashboard
              </h2>
            </div>

            <div style={styles.serviceCount}>
              {cards.length} OPTIONS
            </div>
          </div>

          <div style={styles.cardGrid}>
            {cards.map((card) => {
              const styleKey =
                `card${card.className
                  .charAt(0)
                  .toUpperCase()}${card.className.slice(
                  1
                )}`;

              return (
                <button
                  key={card.path}
                  type="button"
                  onClick={() =>
                    router.push(
                      card.path
                    )
                  }
                  style={
                    styles.serviceCard
                  }
                >
                  <div
                    style={{
                      ...styles.cardTop,
                      ...(styles[
                        styleKey
                      ] || {}),
                    }}
                  >
                    <div
                      style={
                        styles.cardIcon
                      }
                    >
                      {card.icon}
                    </div>

                    <div
                      style={
                        styles.arrow
                      }
                    >
                      →
                    </div>
                  </div>

                  <div
                    style={
                      styles.cardBody
                    }
                  >
                    <h3
                      style={
                        styles.cardTitle
                      }
                    >
                      {card.title}
                    </h3>

                    <p
                      style={
                        styles.cardDescription
                      }
                    >
                      {
                        card.description
                      }
                    </p>

                    <div
                      style={
                        styles.openLink
                      }
                    >
                      <span>
                        Open
                      </span>

                      <span>
                        →
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* PROFILE PANEL */}

        <section
          style={
            styles.bottomPanel
          }
        >
          <div style={styles.bottomIcon}>
            👤
          </div>

          <div style={styles.bottomText}>
            <h3
              style={
                styles.bottomTitle
              }
            >
              Keep your profile updated
            </h3>

            <p
              style={
                styles.bottomDescription
              }
            >
              Your personal information is
              managed through your student
              profile.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/profile"
              )
            }
            style={
              styles.profileButton
            }
          >
            View Profile →
          </button>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <div style={styles.footerBrand}>
            🎓 Attendance Portal
          </div>

          <div>
            Student Portal • 2026
          </div>
        </footer>
      </div>
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  navbar: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  brandIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  brandName: {
    fontSize: "13px",
    fontWeight: "1000",
    letterSpacing: "1px",
    color: "#172554",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "2px",
    color: "#64748b",
  },

  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  clock: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "9px 12px",
    borderRadius: "9px",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
  },

  logoutButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "25px",
    padding: "34px",
    minHeight: "220px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "25px",
    marginBottom: "18px",
    boxShadow:
      "0 18px 45px rgba(37,99,235,0.22)",
    boxSizing: "border-box",
  },

  heroGlowOne: {
    position: "absolute",
    width: "230px",
    height: "230px",
    borderRadius: "50%",
    background:
      "rgba(255,255,255,0.08)",
    right: "120px",
    top: "-100px",
  },

  heroGlowTwo: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background:
      "rgba(255,255,255,0.06)",
    right: "-40px",
    bottom: "-90px",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "20px",
    minWidth: 0,
  },

  avatar: {
    width: "88px",
    height: "88px",
    minWidth: "88px",
    borderRadius: "24px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    fontWeight: "1000",
    boxShadow:
      "0 12px 30px rgba(0,0,0,0.18)",
  },

  welcomeArea: {
    minWidth: 0,
  },

  smallGreeting: {
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  welcomeTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: "1000",
    wordBreak: "break-word",
  },

  welcomeText: {
    margin: "9px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1.6,
    maxWidth: "600px",
  },

  usernameBadge: {
    display: "inline-block",
    marginTop: "13px",
    padding: "7px 11px",
    borderRadius: "8px",
    background:
      "rgba(255,255,255,0.13)",
    border:
      "1px solid rgba(255,255,255,0.22)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "900",
  },

  heroSide: {
    position: "relative",
    zIndex: 2,
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.2)",
    borderRadius: "14px",
    padding: "13px 15px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: "155px",
  },

  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow:
      "0 0 0 5px rgba(74,222,128,0.15)",
  },

  onlineText: {
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  onlineSub: {
    marginTop: "3px",
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: "700",
  },

  announcementSection: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "25px",
    boxShadow:
      "0 8px 26px rgba(15,23,42,0.06)",
  },

  announcementHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },

  announcementEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  announcementTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "24px",
    fontWeight: "1000",
  },

  announcementSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  announcementBadge: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
  },

  announcementLoading: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "18px",
    background: "#f8fafc",
    borderRadius: "14px",
    border: "1px dashed #cbd5e1",
  },

  loadingIcon: {
    fontSize: "27px",
  },

  loadingTitle: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: "900",
  },

  loadingText: {
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "600",
  },

  noAnnouncements: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "14px",
    border: "1px dashed #cbd5e1",
  },

  noAnnouncementIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  noAnnouncementTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    fontWeight: "1000",
  },

  noAnnouncementText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  announcementList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  announcementCard: {
    background:
      "linear-gradient(135deg,#f8fbff,#ffffff)",
    border: "1px solid #dbeafe",
    borderRadius: "16px",
    padding: "16px",
  },

  announcementCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
  },

  announcementIcon: {
    width: "45px",
    height: "45px",
    minWidth: "45px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  announcementCardContent: {
    minWidth: 0,
    flex: 1,
  },

  announcementMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  teacherBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "0.7px",
  },

  announcementDate: {
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: "700",
  },

  announcementCardTitle: {
    margin: "7px 0 0",
    color: "#172554",
    fontSize: "18px",
    fontWeight: "1000",
    wordBreak: "break-word",
  },

  announcementMessage: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.65,
    fontWeight: "600",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  announcementBottom: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  everyoneText: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
  },

  likeButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "1000",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  likeButtonActive: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#be123c",
  },

  likeCount: {
    background: "#f1f5f9",
    color: "#475569",
    minWidth: "19px",
    height: "19px",
    padding: "0 4px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "1000",
  },

  notice: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "17px",
    padding: "15px 18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "25px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  noticeIcon: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "11px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  noticeTitle: {
    color: "#172554",
    fontSize: "13px",
    fontWeight: "900",
  },

  noticeText: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginBottom: "15px",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "1000",
    color: "#172554",
  },

  serviceCount: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "900",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "15px",
  },

  serviceCard: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "19px",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  cardTop: {
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardBlue: {
    background:
      "linear-gradient(135deg,#dbeafe,#bfdbfe)",
  },

  cardPurple: {
    background:
      "linear-gradient(135deg,#ede9fe,#ddd6fe)",
  },

  cardGreen: {
    background:
      "linear-gradient(135deg,#dcfce7,#bbf7d0)",
  },

  cardOrange: {
    background:
      "linear-gradient(135deg,#ffedd5,#fed7aa)",
  },

  cardPink: {
    background:
      "linear-gradient(135deg,#fce7f3,#fbcfe8)",
  },

  cardIndigo: {
    background:
      "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
  },

  cardCyan: {
    background:
      "linear-gradient(135deg,#cffafe,#a5f3fc)",
  },

  cardIcon: {
    width: "47px",
    height: "47px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  arrow: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background:
      "rgba(255,255,255,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#172554",
    fontWeight: "1000",
  },

  cardBody: {
    padding: "17px",
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "17px",
    fontWeight: "1000",
  },

  cardDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    minHeight: "36px",
    fontWeight: "600",
  },

  openLink: {
    marginTop: "13px",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "1000",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomPanel: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#ffffff,#f8fafc)",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    flexWrap: "wrap",
  },

  bottomIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  bottomText: {
    flex: 1,
    minWidth: "200px",
  },

  bottomTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "14px",
    fontWeight: "1000",
  },

  bottomDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  footer: {
    marginTop: "25px",
    padding: "18px 5px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    flexWrap: "wrap",
  },

  footerBrand: {
    color: "#475569",
    fontWeight: "900",
  },
};