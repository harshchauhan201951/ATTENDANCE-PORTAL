"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
};

type LikeRecord = {
  announcement_id: number;
  student_id: number;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string | null;
};

type AnnouncementWithLikes = Announcement & {
  likeCount: number;
  likedStudents: Student[];
};

type PushResponse = {
  success?: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  message?: string;
  error?: string;
};

export default function TeacherAnnouncementsPage() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<
    AnnouncementWithLikes[]
  >([]);

  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [expandedLikes, setExpandedLikes] = useState<number | null>(
    null
  );

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  async function loadAnnouncements(): Promise<void> {
    setLoading(true);

    try {
      const {
        data: announcementData,
        error: announcementError,
      } = await supabase
        .from("announcements")
        .select("id, title, message, created_at")
        .order("created_at", {
          ascending: false,
        });

      if (announcementError) {
        console.error(
          "Announcements loading error:",
          announcementError
        );

        alert(
          `Could not load announcements: ${announcementError.message}`
        );

        setAnnouncements([]);
        return;
      }

      const announcementRows = announcementData || [];

      if (announcementRows.length === 0) {
        setAnnouncements([]);
        return;
      }

      const announcementIds = announcementRows.map(
        (announcement) => announcement.id
      );

      const {
        data: likesData,
        error: likesError,
      } = await supabase
        .from("announcement_likes")
        .select("announcement_id, student_id")
        .in("announcement_id", announcementIds);

      if (likesError) {
        console.error(
          "Announcement likes loading error:",
          likesError
        );
      }

      const likes: LikeRecord[] =
        (likesData as LikeRecord[] | null) || [];

      const studentIds = Array.from(
        new Set(
          likes
            .map((like) => Number(like.student_id))
            .filter((id) => !Number.isNaN(id))
        )
      );

      let students: Student[] = [];

      if (studentIds.length > 0) {
        const {
          data: studentsData,
          error: studentsError,
        } = await supabase
          .from("students")
          .select(
            "id, student_name, student_username"
          )
          .in("id", studentIds);

        if (studentsError) {
          console.error(
            "Students loading error:",
            studentsError
          );
        } else {
          students =
            (studentsData as Student[] | null) || [];
        }
      }

      const formattedAnnouncements: AnnouncementWithLikes[] =
        announcementRows.map(
          (announcement) => {
            const announcementLikes =
              likes.filter(
                (like) =>
                  Number(like.announcement_id) ===
                  Number(announcement.id)
              );

            const likedStudentIds =
              announcementLikes.map((like) =>
                Number(like.student_id)
              );

            const likedStudents = students
              .filter((student) =>
                likedStudentIds.includes(
                  Number(student.id)
                )
              )
              .sort((a, b) =>
                (
                  a.student_name ||
                  a.student_username ||
                  ""
                ).localeCompare(
                  b.student_name ||
                    b.student_username ||
                    ""
                )
              );

            return {
              id: announcement.id,
              title: announcement.title,
              message: announcement.message,
              created_at:
                announcement.created_at,
              likeCount: announcementLikes.length,
              likedStudents,
            };
          }
        );

      setAnnouncements(formattedAnnouncements);
    } catch (error) {
      console.error(
        "Unexpected announcements error:",
        error
      );

      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * CREATE ANNOUNCEMENT
   *
   * Announcement save hone ke baad:
   * /api/push/send automatically call hota hai.
   *
   * Isliye student ko refresh karne ki zarurat nahi.
   */
  async function createAnnouncement(): Promise<void> {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) {
      alert("Please enter announcement title.");
      return;
    }

    if (!cleanMessage) {
      alert("Please enter announcement message.");
      return;
    }

    if (creating) {
      return;
    }

    setCreating(true);

    try {
      /*
       * STEP 1
       * SAVE ANNOUNCEMENT
       */
      const {
        data: newAnnouncement,
        error: announcementError,
      } = await supabase
        .from("announcements")
        .insert({
          title: cleanTitle,
          message: cleanMessage,
        })
        .select(
          "id, title, message, created_at"
        )
        .single();

      if (announcementError) {
        console.error(
          "Create announcement error:",
          announcementError
        );

        alert(
          `Could not create announcement: ${announcementError.message}`
        );

        return;
      }

      /*
       * STEP 2
       * CLEAR FORM
       */
      setTitle("");
      setMessage("");

      /*
       * STEP 3
       * REFRESH TEACHER LIST
       */
      await loadAnnouncements();

      /*
       * STEP 4
       * SEND PUSH AUTOMATICALLY
       */
      try {
        const pushResponse = await fetch(
          "/api/push/send",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title: cleanTitle,
              message: cleanMessage,
              announcementId:
                newAnnouncement?.id ?? null,
            }),
          }
        );

        let pushResult: PushResponse = {};

        try {
          pushResult =
            (await pushResponse.json()) as PushResponse;
        } catch {
          pushResult = {};
        }

        console.log(
          "Push notification response:",
          pushResult
        );

        if (!pushResponse.ok) {
          console.error(
            "Push notification failed:",
            pushResult
          );
        } else {
          console.log(
            `Push sent: ${pushResult.sent ?? 0}/${pushResult.total ?? 0}`
          );
        }
      } catch (pushError) {
        /*
         * Announcement already saved hai.
         * Push fail hone par announcement delete nahi hoga.
         */
        console.error(
          "Automatic push notification error:",
          pushError
        );
      }

      alert(
        "Announcement published successfully."
      );
    } catch (error) {
      console.error(
        "Unexpected create announcement error:",
        error
      );

      alert(
        "Something went wrong while creating the announcement."
      );
    } finally {
      setCreating(false);
    }
  }

  /*
   * DELETE ANNOUNCEMENT
   */
  async function deleteAnnouncement(
    announcementId: number
  ): Promise<void> {
    if (deletingId !== null) {
      return;
    }

    const selectedAnnouncement =
      announcements.find(
        (announcement) =>
          announcement.id === announcementId
      );

    if (!selectedAnnouncement) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${selectedAnnouncement.title}"?\n\nThis will also remove all likes for this announcement.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(announcementId);

    try {
      /*
       * DELETE LIKES FIRST
       */
      const { error: likesDeleteError } =
        await supabase
          .from("announcement_likes")
          .delete()
          .eq(
            "announcement_id",
            announcementId
          );

      if (likesDeleteError) {
        console.error(
          "Delete announcement likes error:",
          likesDeleteError
        );
      }

      /*
       * DELETE ANNOUNCEMENT
       */
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

      if (error) {
        console.error(
          "Delete announcement error:",
          error
        );

        alert(
          `Could not delete announcement: ${error.message}`
        );

        return;
      }

      setAnnouncements((previous) =>
        previous.filter(
          (announcement) =>
            announcement.id !== announcementId
        )
      );

      if (
        expandedLikes === announcementId
      ) {
        setExpandedLikes(null);
      }
    } catch (error) {
      console.error(
        "Unexpected delete error:",
        error
      );

      alert(
        "Something went wrong while deleting the announcement."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function toggleLikes(
    announcementId: number
  ): void {
    setExpandedLikes((current) =>
      current === announcementId
        ? null
        : announcementId
    );
  }

  function formatDate(date: string): string {
    if (!date) {
      return "";
    }

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

  const totalLikes = announcements.reduce(
    (total, announcement) =>
      total + announcement.likeCount,
    0
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              type="button"
              onClick={() =>
                router.push("/teacher")
              }
              style={styles.backButton}
            >
              ←
            </button>

            <div>
              <div style={styles.eyebrow}>
                TEACHER PORTAL
              </div>

              <h1 style={styles.heading}>
                Announcements
              </h1>

              <p style={styles.headerSubtitle}>
                Create announcements and see which
                students have liked them.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/teacher")
            }
            style={styles.dashboardButton}
          >
            Teacher Dashboard
          </button>
        </header>

        {/* CREATE ANNOUNCEMENT */}

        <section style={styles.createSection}>
          <div style={styles.createHeader}>
            <div>
              <div style={styles.createEyebrow}>
                📢 NEW ANNOUNCEMENT
              </div>

              <h2 style={styles.createTitle}>
                Publish for All Students
              </h2>

              <p style={styles.createSubtitle}>
                Students will see this announcement
                on their dashboard and receive a
                notification automatically.
              </p>
            </div>
          </div>

          <div style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>
                Announcement Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Example: Raksha Bandhan Holiday"
                style={styles.input}
                maxLength={150}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Announcement Message
              </label>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Write your announcement here..."
                style={styles.textarea}
                rows={5}
                maxLength={2000}
              />
            </div>

            <div style={styles.formBottom}>
              <div style={styles.formHint}>
                👥 All registered students will receive
                the push notification automatically.
              </div>

              <button
                type="button"
                onClick={() =>
                  void createAnnouncement()
                }
                disabled={creating}
                style={{
                  ...styles.publishButton,
                  ...(creating
                    ? styles.publishButtonDisabled
                    : {}),
                }}
              >
                {creating
                  ? "Publishing & Sending..."
                  : "📢 Publish Announcement"}
              </button>
            </div>
          </div>
        </section>

        {/* STATISTICS */}

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#dbeafe",
              }}
            >
              📢
            </div>

            <div>
              <div style={styles.statLabel}>
                TOTAL ANNOUNCEMENTS
              </div>

              <div style={styles.statValue}>
                {announcements.length}
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#ffe4e6",
              }}
            >
              ❤️
            </div>

            <div>
              <div style={styles.statLabel}>
                TOTAL LIKES
              </div>

              <div style={styles.statValue}>
                {totalLikes}
              </div>
            </div>
          </div>
        </section>

        {/* ANNOUNCEMENTS */}

        <section style={styles.listSection}>
          <div style={styles.listHeader}>
            <div>
              <div style={styles.listEyebrow}>
                PUBLISHED UPDATES
              </div>

              <h2 style={styles.listTitle}>
                Your Announcements
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadAnnouncements()
              }
              disabled={loading}
              style={styles.refreshButton}
            >
              {loading
                ? "Loading..."
                : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                ⏳
              </div>

              <h3 style={styles.emptyTitle}>
                Loading Announcements...
              </h3>

              <p style={styles.emptyText}>
                Please wait while we load the
                announcements and student likes.
              </p>
            </div>
          ) : announcements.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No Announcements Yet
              </h3>

              <p style={styles.emptyText}>
                Create your first announcement
                using the form above.
              </p>
            </div>
          ) : (
            <div style={styles.announcementList}>
              {announcements.map(
                (announcement) => {
                  const isExpanded =
                    expandedLikes ===
                    announcement.id;

                  return (
                    <article
                      key={announcement.id}
                      style={
                        styles.announcementCard
                      }
                    >
                      {/* TOP */}

                      <div
                        style={
                          styles.cardMain
                        }
                      >
                        <div
                          style={
                            styles.cardIcon
                          }
                        >
                          📢
                        </div>

                        <div
                          style={
                            styles.cardContent
                          }
                        >
                          <div
                            style={
                              styles.metaRow
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
                                styles.date
                              }
                            >
                              {formatDate(
                                announcement.created_at
                              )}
                            </span>
                          </div>

                          <h3
                            style={
                              styles.announcementTitle
                            }
                          >
                            {announcement.title}
                          </h3>

                          <p
                            style={
                              styles.announcementMessage
                            }
                          >
                            {announcement.message}
                          </p>
                        </div>
                      </div>

                      {/* ACTION BAR */}

                      <div
                        style={
                          styles.actionBar
                        }
                      >
                        <div
                          style={
                            styles.audience
                          }
                        >
                          👥 For all students
                        </div>

                        <div
                          style={
                            styles.actionButtons
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleLikes(
                                announcement.id
                              )
                            }
                            style={{
                              ...styles.likesButton,
                              ...(isExpanded
                                ? styles.likesButtonActive
                                : {}),
                            }}
                          >
                            ❤️{" "}
                            {announcement.likeCount}{" "}
                            {announcement.likeCount ===
                            1
                              ? "Like"
                              : "Likes"}

                            <span
                              style={
                                styles.viewArrow
                              }
                            >
                              {isExpanded
                                ? "▲"
                                : "▼"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void deleteAnnouncement(
                                announcement.id
                              )
                            }
                            disabled={
                              deletingId ===
                              announcement.id
                            }
                            style={
                              styles.deleteButton
                            }
                          >
                            {deletingId ===
                            announcement.id
                              ? "Deleting..."
                              : "🗑 Delete"}
                          </button>
                        </div>
                      </div>

                      {/* LIKED STUDENTS */}

                      {isExpanded && (
                        <div
                          style={
                            styles.likesPanel
                          }
                        >
                          <div
                            style={
                              styles.likesPanelHeader
                            }
                          >
                            <div>
                              <div
                                style={
                                  styles.likesPanelEyebrow
                                }
                              >
                                STUDENT ACTIVITY
                              </div>

                              <h4
                                style={
                                  styles.likesPanelTitle
                                }
                              >
                                Students Who Liked
                              </h4>
                            </div>

                            <div
                              style={
                                styles.likeNumber
                              }
                            >
                              ❤️{" "}
                              {
                                announcement.likeCount
                              }
                            </div>
                          </div>

                          {announcement
                            .likedStudents
                            .length === 0 ? (
                            <div
                              style={
                                styles.noLikes
                              }
                            >
                              <span
                                style={
                                  styles.noLikesIcon
                                }
                              >
                                🤍
                              </span>

                              <div>
                                <div
                                  style={
                                    styles.noLikesTitle
                                  }
                                >
                                  No student has liked
                                  this announcement
                                  yet.
                                </div>

                                <div
                                  style={
                                    styles.noLikesText
                                  }
                                >
                                  Student likes will
                                  appear here.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={
                                styles.studentList
                              }
                            >
                              {announcement.likedStudents.map(
                                (
                                  student,
                                  index
                                ) => (
                                  <div
                                    key={
                                      student.id
                                    }
                                    style={
                                      styles.studentRow
                                    }
                                  >
                                    <div
                                      style={
                                        styles.studentNumber
                                      }
                                    >
                                      {index + 1}
                                    </div>

                                    <div
                                      style={
                                        styles.studentAvatar
                                      }
                                    >
                                      {(
                                        student.student_name ||
                                        student.student_username ||
                                        "S"
                                      )
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>

                                    <div
                                      style={
                                        styles.studentInfo
                                      }
                                    >
                                      <div
                                        style={
                                          styles.studentName
                                        }
                                      >
                                        {student.student_name ||
                                          "Student"}
                                      </div>

                                      {student.student_username && (
                                        <div
                                          style={
                                            styles.studentUsername
                                          }
                                        >
                                          @
                                          {
                                            student.student_username
                                          }
                                        </div>
                                      )}
                                    </div>

                                    <div
                                      style={
                                        styles.heart
                                      }
                                    >
                                      ❤️
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <div style={styles.footerBrand}>
            🎓 Attendance Portal
          </div>

          <div>
            Teacher Portal • Announcements • 2026
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
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 28px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },

  backButton: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "22px",
    fontWeight: "900",
    cursor: "pointer",
    flexShrink: 0,
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  heading: {
    margin: 0,
    color: "#172554",
    fontSize: "29px",
    fontWeight: "1000",
  },

  headerSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  dashboardButton: {
    border: "none",
    background: "#172554",
    color: "#ffffff",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "900",
    fontSize: "11px",
    cursor: "pointer",
  },

  createSection: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 26px rgba(15,23,42,0.06)",
  },

  createHeader: {
    marginBottom: "18px",
  },

  createEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  createTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
    fontWeight: "1000",
  },

  createSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#334155",
    fontSize: "11px",
    fontWeight: "900",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "11px",
    padding: "12px 13px",
    outline: "none",
    color: "#172554",
    background: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "11px",
    padding: "12px 13px",
    outline: "none",
    color: "#172554",
    background: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    resize: "vertical",
    lineHeight: 1.6,
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  formBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },

  formHint: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  publishButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow:
      "0 7px 18px rgba(37,99,235,0.20)",
  },

  publishButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "15px",
    marginBottom: "18px",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  statLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.2px",
  },

  statValue: {
    marginTop: "3px",
    color: "#172554",
    fontSize: "23px",
    fontWeight: "1000",
  },

  listSection: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "22px",
    boxShadow:
      "0 8px 26px rgba(15,23,42,0.06)",
  },

  listHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "17px",
    flexWrap: "wrap",
  },

  listEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  listTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
    fontWeight: "1000",
  },

  refreshButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    padding: "9px 12px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  emptyBox: {
    padding: "35px 20px",
    borderRadius: "15px",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "35px",
    marginBottom: "8px",
  },

  emptyTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "15px",
    fontWeight: "1000",
  },

  emptyText: {
    margin: "5px auto 0",
    maxWidth: "500px",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  announcementList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  announcementCard: {
    background:
      "linear-gradient(135deg,#f8fbff,#ffffff)",
    border: "1px solid #dbeafe",
    borderRadius: "17px",
    overflow: "hidden",
  },

  cardMain: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    padding: "17px",
  },

  cardIcon: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  cardContent: {
    minWidth: 0,
    flex: 1,
  },

  metaRow: {
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

  date: {
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: "700",
  },

  announcementTitle: {
    margin: "7px 0 0",
    color: "#172554",
    fontSize: "19px",
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

  actionBar: {
    borderTop: "1px solid #e2e8f0",
    padding: "12px 17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    background: "#ffffff",
  },

  audience: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
  },

  actionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  likesButton: {
    border: "1px solid #fecdd3",
    background: "#fff1f2",
    color: "#be123c",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  likesButtonActive: {
    background: "#ffe4e6",
    border: "1px solid #fb7185",
  },

  viewArrow: {
    fontSize: "8px",
    marginLeft: "2px",
  },

  deleteButton: {
    border: "1px solid #fecaca",
    background: "#ffffff",
    color: "#dc2626",
    padding: "8px 10px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  likesPanel: {
    borderTop: "1px solid #e2e8f0",
    background:
      "linear-gradient(135deg,#fff7f8,#fff)",
    padding: "17px",
  },

  likesPanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "13px",
  },

  likesPanelEyebrow: {
    color: "#e11d48",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.5px",
    marginBottom: "3px",
  },

  likesPanelTitle: {
    margin: 0,
    color: "#881337",
    fontSize: "15px",
    fontWeight: "1000",
  },

  likeNumber: {
    background: "#ffe4e6",
    color: "#be123c",
    border: "1px solid #fecdd3",
    padding: "7px 10px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: "1000",
  },

  noLikes: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "13px",
    borderRadius: "11px",
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
  },

  noLikesIcon: {
    fontSize: "23px",
  },

  noLikesTitle: {
    color: "#475569",
    fontSize: "11px",
    fontWeight: "900",
  },

  noLikesText: {
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: "700",
  },

  studentList: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  studentRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 11px",
    borderRadius: "10px",
    background: "#ffffff",
    border: "1px solid #f1f5f9",
  },

  studentNumber: {
    width: "22px",
    height: "22px",
    borderRadius: "7px",
    background: "#f8fafc",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "1000",
    flexShrink: 0,
  },

  studentAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "1000",
    flexShrink: 0,
  },

  studentInfo: {
    flex: 1,
    minWidth: 0,
  },

  studentName: {
    color: "#334155",
    fontSize: "11px",
    fontWeight: "1000",
    wordBreak: "break-word",
  },

  studentUsername: {
    marginTop: "2px",
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: "700",
  },

  heart: {
    fontSize: "16px",
    flexShrink: 0,
  },

  footer: {
    marginTop: "22px",
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