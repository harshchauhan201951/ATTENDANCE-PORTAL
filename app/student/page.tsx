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

  const [showAllAnnouncements, setShowAllAnnouncements] =
    useState(false);

  const [likingId, setLikingId] = useState<number | null>(
    null
  );

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
     * First resolve the real student ID from username.
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
         * Register this student's device
         * for push notifications.
         */
        await registerPushNotifications(resolvedId);

        return;
      }
    }

    /*
     * Fallback to existing studentId.
     */
    if (savedStudentId) {
      const parsedId = Number(savedStudentId);

      if (
        !Number.isNaN(parsedId) &&
        parsedId > 0
      ) {
        setStudentId(parsedId);

        await loadAnnouncements(parsedId);

        /*
         * Register this student's device
         * for push notifications.
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
       * Register existing public/sw.js.
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
       * Ask for notification permission.
       */
      let permission =
        Notification.permission;

      if (permission === "default") {
        permission =
          await Notification.requestPermission();
      }

      /*
       * Do not break dashboard if permission denied.
       */
      if (permission !== "granted") {
        console.warn(
          "Notification permission was not granted."
        );

        return;
      }

      /*
       * Get existing subscription.
       */
      let subscription =
        await registration.pushManager.getSubscription();

      /*
       * Create subscription if required.
       */
      if (!subscription) {
        const vapidPublicKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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

        /*
         * Create a real ArrayBuffer.
         *
         * This avoids the Next.js / TypeScript
         * ArrayBufferLike vs ArrayBuffer error.
         */
        const applicationServerKeyBuffer =
          new ArrayBuffer(
            applicationServerKey.byteLength
          );

        new Uint8Array(
          applicationServerKeyBuffer
        ).set(applicationServerKey);

        subscription =
          await registration.pushManager.subscribe(
            {
              userVisibleOnly: true,
              applicationServerKey:
                applicationServerKeyBuffer,
            }
          );
      }

      /*
       * Save subscription to API.
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
       * Push registration must NEVER
       * break the student dashboard.
       */
      console.error(
        "Push notification registration error:",
        error
      );
    }
  }

  /*
   * Convert VAPID public key from Base64URL
   * to Uint8Array.
   */
  function urlBase64ToUint8Array(
    base64String: string
  ): Uint8Array {
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
      i++
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

  /*
   * =====================================================
   * LOAD ANNOUNCEMENTS
   * =====================================================
   */
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
              title:
                announcement.title,
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

  /*
   * =====================================================
   * LIKE / UNLIKE ANNOUNCEMENT
   * =====================================================
   */
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

  const latestAnnouncement =
    announcements.length > 0
      ? announcements[0]
      : null;

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

        {/* =====================================================
            TOP NAVIGATION
        ===================================================== */}

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

        {/* =====================================================
            HERO
        ===================================================== */}

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

        {/* =====================================================
            LATEST ANNOUNCEMENT
        ===================================================== */}

        <section
          style={
            styles.latestAnnouncementSection
          }
        >
          <div
            style={
              styles.latestHeader
            }
          >
            <div>
              <div
                style={
                  styles.latestEyebrow
                }
              >
                📢 NEW UPDATE
              </div>

              <h2
                style={
                  styles.latestTitle
                }
              >
                Latest Announcement
              </h2>

              <p
                style={
                  styles.latestSubtitle
                }
              >
                Your newest teacher update is
                shown here.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowAllAnnouncements(true)
              }
              style={
                styles.allAnnouncementsButton
              }
            >
              <span>📚</span>
              <span>
                All Announcements
              </span>

              <span
                style={
                  styles.allAnnouncementCount
                }
              >
                {announcements.length}
              </span>
            </button>
          </div>

          {announcementLoading ? (
            <div
              style={
                styles.latestLoading
              }
            >
              <div
                style={
                  styles.loadingSpinner
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
                  Checking for new announcements...
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
          ) : latestAnnouncement ? (
            <article
              style={
                styles.latestAnnouncementCard
              }
            >
              <div
                style={
                  styles.latestCardGlow
                }
              />

              <div
                style={
                  styles.latestCardContent
                }
              >
                <div
                  style={
                    styles.latestCardTop
                  }
                >
                  <div
                    style={
                      styles.latestIcon
                    }
                  >
                    📢
                  </div>

                  <div
                    style={
                      styles.latestMetaArea
                    }
                  >
                    <div
                      style={
                        styles.latestMeta
                      }
                    >
                      <span
                        style={
                          styles.newBadge
                        }
                      >
                        ✨ NEW
                      </span>

                      <span
                        style={
                          styles.teacherBadge
                        }
                      >
                        TEACHER
                      </span>

                      <span
                        style={
                          styles.latestDate
                        }
                      >
                        {formatAnnouncementDate(
                          latestAnnouncement.created_at
                        )}
                      </span>
                    </div>

                    <h3
                      style={
                        styles.latestCardTitle
                      }
                    >
                      {
                        latestAnnouncement.title
                      }
                    </h3>
                  </div>
                </div>

                <p
                  style={
                    styles.latestMessage
                  }
                >
                  {
                    latestAnnouncement.message
                  }
                </p>

                <div
                  style={
                    styles.latestBottom
                  }
                >
                  <div
                    style={
                      styles.latestAudience
                    }
                  >
                    👥 For all students
                  </div>

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
                      ...styles.latestLikeButton,
                      ...(latestAnnouncement.likedByMe
                        ? styles.latestLikeActive
                        : {}),
                      opacity:
                        likingId ===
                        latestAnnouncement.id
                          ? 0.65
                          : 1,
                      cursor:
                        likingId ===
                        latestAnnouncement.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    <span>
                      {latestAnnouncement.likedByMe
                        ? "❤️"
                        : "🤍"}
                    </span>

                    <span>
                      {latestAnnouncement.likedByMe
                        ? "Liked"
                        : "Like"}
                    </span>

                    <span
                      style={
                        styles.latestLikeCount
                      }
                    >
                      {
                        latestAnnouncement.likeCount
                      }
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div
              style={
                styles.noLatestAnnouncement
              }
            >
              <div
                style={
                  styles.noLatestIcon
                }
              >
                📭
              </div>

              <div>
                <h3
                  style={
                    styles.noLatestTitle
                  }
                >
                  No New Announcements
                </h3>

                <p
                  style={
                    styles.noLatestText
                  }
                >
                  Your teacher has not
                  published any announcement
                  yet.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAllAnnouncements(true)
                }
                style={
                  styles.viewAllSmallButton
                }
              >
                View All
              </button>
            </div>
          )}
        </section>

        {/* =====================================================
            ALL ANNOUNCEMENTS MODAL
        ===================================================== */}

        {showAllAnnouncements && (
          <div
            style={
              styles.modalOverlay
            }
            onClick={() =>
              setShowAllAnnouncements(false)
            }
          >
            <div
              style={
                styles.announcementModal
              }
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div
                style={
                  styles.modalHeader
                }
              >
                <div>
                  <div
                    style={
                      styles.modalEyebrow
                    }
                  >
                    📢 ANNOUNCEMENT CENTER
                  </div>

                  <h2
                    style={
                      styles.modalTitle
                    }
                  >
                    All Announcements
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    View and like all updates
                    from your teacher.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAllAnnouncements(false)
                  }
                  style={
                    styles.modalCloseButton
                  }
                  aria-label="Close announcements"
                >
                  ✕
                </button>
              </div>

              <div
                style={
                  styles.modalCountBar
                }
              >
                <span>
                  📚 Total Announcements
                </span>

                <strong>
                  {announcements.length}
                </strong>
              </div>

              {announcements.length ===
              0 ? (
                <div
                  style={
                    styles.modalEmpty
                  }
                >
                  <div
                    style={
                      styles.modalEmptyIcon
                    }
                  >
                    📭
                  </div>

                  <h3>
                    No Announcements
                  </h3>

                  <p>
                    There are no announcements
                    available right now.
                  </p>
                </div>
              ) : (
                <div
                  style={
                    styles.modalAnnouncementList
                  }
                >
                  {announcements.map(
                    (
                      announcement,
                      index
                    ) => (
                      <article
                        key={
                          announcement.id
                        }
                        style={
                          styles.modalAnnouncementCard
                        }
                      >
                        <div
                          style={
                            styles.modalCardTop
                          }
                        >
                          <div
                            style={
                              styles.modalAnnouncementIcon
                            }
                          >
                            📢
                          </div>

                          <div
                            style={
                              styles.modalCardMain
                            }
                          >
                            <div
                              style={
                                styles.modalMeta
                              }
                            >
                              {index ===
                                0 && (
                                <span
                                  style={
                                    styles.newBadge
                                  }
                                >
                                  ✨ NEW
                                </span>
                              )}

                              <span
                                style={
                                  styles.teacherBadge
                                }
                              >
                                TEACHER
                              </span>

                              <span
                                style={
                                  styles.modalDate
                                }
                              >
                                {formatAnnouncementDate(
                                  announcement.created_at
                                )}
                              </span>
                            </div>

                            <h3
                              style={
                                styles.modalCardTitle
                              }
                            >
                              {
                                announcement.title
                              }
                            </h3>

                            <p
                              style={
                                styles.modalMessage
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
                            styles.modalCardBottom
                          }
                        >
                          <div
                            style={
                              styles.modalAudience
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
                              ...styles.modalLikeButton,
                              ...(announcement.likedByMe
                                ? styles.modalLikeActive
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
                            <span>
                              {announcement.likedByMe
                                ? "❤️"
                                : "🤍"}
                            </span>

                            <span>
                              {announcement.likedByMe
                                ? "Liked"
                                : "Like"}
                            </span>

                            <span
                              style={
                                styles.modalLikeCount
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
            </div>
          </div>
        )}

        {/* =====================================================
            NOTICE
        ===================================================== */}

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

        {/* =====================================================
            SERVICES
        ===================================================== */}

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

        {/* =====================================================
            PROFILE PANEL
        ===================================================== */}

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

        {/* =====================================================
            FOOTER
        ===================================================== */}

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

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

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
    fontWeight: 1000,
    letterSpacing: "1px",
    color: "#172554",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "9px",
    fontWeight: 900,
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
    fontWeight: 800,
  },

  logoutButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: 900,
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
    fontWeight: 1000,
    boxShadow:
      "0 12px 30px rgba(0,0,0,0.18)",
  },

  welcomeArea: {
    minWidth: 0,
  },

  smallGreeting: {
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  welcomeTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: 1000,
    wordBreak: "break-word",
  },

  welcomeText: {
    margin: "9px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: 600,
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
    fontWeight: 900,
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
    fontWeight: 1000,
    letterSpacing: "1px",
  },

  onlineSub: {
    marginTop: "3px",
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: 700,
  },

  /*
   * =======================================================
   * LATEST ANNOUNCEMENT
   * =======================================================
   */

  latestAnnouncementSection: {
    background:
      "linear-gradient(135deg,#ffffff,#f8fbff)",
    border:
      "1px solid #bfdbfe",
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "25px",
    boxShadow:
      "0 10px 30px rgba(37,99,235,0.08)",
    position: "relative",
    overflow: "hidden",
  },

  latestHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },

  latestEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  latestTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "24px",
    fontWeight: 1000,
  },

  latestSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 600,
  },

  allAnnouncementsButton: {
    border:
      "1px solid #bfdbfe",
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    color: "#1d4ed8",
    padding: "10px 13px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "11px",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow:
      "0 5px 14px rgba(37,99,235,0.08)",
  },

  allAnnouncementCount: {
    minWidth: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: 1000,
  },

  latestLoading: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "15px",
    border:
      "1px dashed #cbd5e1",
  },

  loadingSpinner: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  loadingTitle: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 900,
  },

  loadingText: {
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 600,
  },

  latestAnnouncementCard: {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg,#eef6ff,#ffffff 60%,#f5f3ff)",
    border:
      "1px solid #bfdbfe",
    borderRadius: "18px",
    padding: "18px",
    boxShadow:
      "0 9px 25px rgba(37,99,235,0.08)",
  },

  latestCardGlow: {
    position: "absolute",
    width: "160px",
    height: "160px",
    borderRadius: "50%",
    background:
      "rgba(96,165,250,0.08)",
    right: "-70px",
    top: "-70px",
  },

  latestCardContent: {
    position: "relative",
    zIndex: 2,
  },

  latestCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
  },

  latestIcon: {
    width: "50px",
    height: "50px",
    minWidth: "50px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    boxShadow:
      "0 7px 18px rgba(37,99,235,0.10)",
  },

  latestMetaArea: {
    flex: 1,
    minWidth: 0,
  },

  latestMeta: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexWrap: "wrap",
  },

  newBadge: {
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: 1000,
    letterSpacing: "0.5px",
    boxShadow:
      "0 4px 10px rgba(37,99,235,0.18)",
  },

  teacherBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: 1000,
    letterSpacing: "0.7px",
  },

  latestDate: {
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: 700,
  },

  latestCardTitle: {
    margin: "8px 0 0",
    color: "#172554",
    fontSize: "19px",
    lineHeight: 1.35,
    fontWeight: 1000,
    wordBreak: "break-word",
  },

  latestMessage: {
    margin: "15px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.7,
    fontWeight: 600,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  latestBottom: {
    marginTop: "15px",
    paddingTop: "12px",
    borderTop:
      "1px solid #dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  latestAudience: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 800,
  },

  latestLikeButton: {
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    padding: "8px 12px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 1000,
  },

  latestLikeActive: {
    background: "#fff1f2",
    border:
      "1px solid #fecdd3",
    color: "#be123c",
  },

  latestLikeCount: {
    minWidth: "20px",
    height: "20px",
    padding: "0 5px",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: 1000,
  },

  noLatestAnnouncement: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "15px",
    border:
      "1px dashed #cbd5e1",
    flexWrap: "wrap",
  },

  noLatestIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  noLatestTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    fontWeight: 1000,
  },

  noLatestText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 600,
  },

  viewAllSmallButton: {
    marginLeft: "auto",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "9px 12px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 900,
    cursor: "pointer",
  },

  /*
   * =======================================================
   * ANNOUNCEMENT MODAL
   * =======================================================
   */

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(15,23,42,0.62)",
    backdropFilter: "blur(7px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px",
    boxSizing: "border-box",
  },

  announcementModal: {
    width: "100%",
    maxWidth: "850px",
    maxHeight: "90vh",
    background: "#ffffff",
    borderRadius: "22px",
    overflow: "hidden",
    boxShadow:
      "0 30px 80px rgba(15,23,42,0.30)",
    display: "flex",
    flexDirection: "column",
  },

  modalHeader: {
    padding: "20px 20px 15px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "15px",
    borderBottom:
      "1px solid #e2e8f0",
    background:
      "linear-gradient(135deg,#f8fbff,#ffffff)",
  },

  modalEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "24px",
    fontWeight: 1000,
  },

  modalSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 600,
  },

  modalCloseButton: {
    width: "36px",
    height: "36px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#475569",
    fontSize: "15px",
    fontWeight: 900,
    cursor: "pointer",
    flexShrink: 0,
  },

  modalCountBar: {
    margin: "13px 20px 5px",
    padding: "9px 12px",
    borderRadius: "10px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 800,
  },

  modalCountBarStrong: {
    color: "#172554",
  },

  modalAnnouncementList: {
    padding: "10px 20px 20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "11px",
  },

  modalAnnouncementCard: {
    background:
      "linear-gradient(135deg,#f8fbff,#ffffff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "15px",
    padding: "15px",
  },

  modalCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  modalAnnouncementIcon: {
    width: "43px",
    height: "43px",
    minWidth: "43px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  modalCardMain: {
    flex: 1,
    minWidth: 0,
  },

  modalMeta: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexWrap: "wrap",
  },

  modalDate: {
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: 700,
  },

  modalCardTitle: {
    margin: "7px 0 0",
    color: "#172554",
    fontSize: "17px",
    lineHeight: 1.35,
    fontWeight: 1000,
    wordBreak: "break-word",
  },

  modalMessage: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "11px",
    lineHeight: 1.65,
    fontWeight: 600,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  modalCardBottom: {
    marginTop: "12px",
    paddingTop: "10px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  modalAudience: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 800,
  },

  modalLikeButton: {
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    padding: "7px 10px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    fontWeight: 1000,
  },

  modalLikeActive: {
    background: "#fff1f2",
    border:
      "1px solid #fecdd3",
    color: "#be123c",
  },

  modalLikeCount: {
    minWidth: "19px",
    height: "19px",
    padding: "0 4px",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: 1000,
  },

  modalEmpty: {
    padding: "45px 20px",
    textAlign: "center",
    color: "#64748b",
  },

  modalEmptyIcon: {
    width: "58px",
    height: "58px",
    margin: "0 auto 12px",
    borderRadius: "16px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
  },

  /*
   * =======================================================
   * NOTICE
   * =======================================================
   */

  notice: {
    background: "#ffffff",
    border:
      "1px solid #dbeafe",
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
    fontWeight: 900,
  },

  noticeText: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5,
    fontWeight: 600,
  },

  /*
   * =======================================================
   * SERVICES
   * =======================================================
   */

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
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 1000,
    color: "#172554",
  },

  serviceCount: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    color: "#64748b",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 900,
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "15px",
  },

  serviceCard: {
    border:
      "1px solid #e2e8f0",
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
    fontWeight: 1000,
  },

  cardBody: {
    padding: "17px",
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "17px",
    fontWeight: 1000,
  },

  cardDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    minHeight: "36px",
    fontWeight: 600,
  },

  openLink: {
    marginTop: "13px",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  /*
   * =======================================================
   * PROFILE
   * =======================================================
   */

  bottomPanel: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#ffffff,#f8fafc)",
    border:
      "1px solid #e2e8f0",
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
    fontWeight: 1000,
  },

  bottomDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 600,
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: 900,
    cursor: "pointer",
  },

  /*
   * =======================================================
   * FOOTER
   * =======================================================
   */

  footer: {
    marginTop: "25px",
    padding: "18px 5px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 700,
    flexWrap: "wrap",
  },

  footerBrand: {
    color: "#475569",
    fontWeight: 900,
  },
};