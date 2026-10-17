"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
  likeCount: number;
  likedByMe: boolean;
};

function isWithinLatest24Hours(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  const age = Date.now() - createdTime;

  return Number.isFinite(createdTime) && age >= 0 && age < 24 * 60 * 60 * 1000;
}

export default function StudentAnnouncementsPage() {
  const router = useRouter();

  const [studentId, setStudentId] =
    useState<number | null>(null);

  const [username, setUsername] =
    useState("");

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [likingId, setLikingId] =
    useState<number | null>(null);

  const [expandedAnnouncementId, setExpandedAnnouncementId] =
    useState<number | null>(null);

  const [collapsedFreshAnnouncementId, setCollapsedFreshAnnouncementId] =
    useState<number | null>(null);

  const [, setAnnouncementClock] = useState(0);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnnouncementClock((value) => value + 1);
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function initialize() {
    const savedUsername =
      localStorage.getItem(
        "student_username"
      ) ||
      localStorage.getItem(
        "studentUsername"
      ) ||
      "";

    const savedStudentId =
      localStorage.getItem(
        "studentId"
      );

    setUsername(savedUsername);

    let resolvedId:
      number | null = null;

    if (savedUsername) {
      resolvedId =
        await resolveStudentId(
          savedUsername
        );
    }

    if (
      resolvedId === null &&
      savedStudentId
    ) {
      const parsedId =
        Number(savedStudentId);

      if (
        !Number.isNaN(
          parsedId
        ) &&
        parsedId > 0
      ) {
        resolvedId =
          parsedId;
      }
    }

    setStudentId(
      resolvedId
    );

    await loadAnnouncements(
      resolvedId
    );
  }

  async function resolveStudentId(
    studentUsername: string
  ): Promise<number | null> {
    try {
      const { data, error } =
        await supabase
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

  async function loadAnnouncements(
    currentStudentId:
      number | null
  ) {
    setLoading(true);

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

      const rows =
        announcementData || [];

      if (rows.length === 0) {
        setAnnouncements([]);

        return;
      }

      const ids =
        rows.map(
          (announcement) =>
            announcement.id
        );

      const {
        data: likesData,
        error: likesError,
      } = await supabase
        .from(
          "announcement_likes"
        )
        .select(
          "announcement_id, student_id"
        )
        .in(
          "announcement_id",
          ids
        );

      if (likesError) {
        console.error(
          "Announcement likes loading error:",
          likesError
        );
      }

      const likes =
        likesData || [];

      const formatted =
        rows.map(
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
              currentStudentId !==
                null &&
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
        formatted
      );
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

  async function toggleLike(
    announcementId: number
  ) {
    let currentStudentId =
      studentId;

    if (
      !currentStudentId &&
      username
    ) {
      currentStudentId =
        await resolveStudentId(
          username
        );

      if (
        currentStudentId !==
        null
      ) {
        setStudentId(
          currentStudentId
        );

        localStorage.setItem(
          "studentId",
          String(
            currentStudentId
          )
        );
      }
    }

    if (!currentStudentId) {
      alert(
        "Student information could not be found. Please login again."
      );

      return;
    }

    if (
      likingId !== null
    ) {
      return;
    }

    const selected =
      announcements.find(
        (item) =>
          item.id ===
          announcementId
      );

    if (!selected) {
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
        selected.likedByMe
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

  function formatDate(
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

  function renderInlineAnnouncementText(text: string) {
    return text
      .split(/(\*\*.+?\*\*|\*[^*\n]+\*|__.+?__)/g)
      .map((part, index) => {
        const isBold =
          (part.startsWith("**") && part.endsWith("**")) ||
          (part.startsWith("__") && part.endsWith("__")) ||
          (part.startsWith("*") && part.endsWith("*"));

        return isBold ? (
          <strong key={index} style={{ color: "#172d44", fontWeight: 800 }}>
            {part.replace(/^(\*\*|__|\*)|(?:(\*\*|__)|\*)$/g, "")}
          </strong>
        ) : (
          part
        );
      });
  }

  function renderAnnouncementMessage(title: string, message: string) {
    const lines = String(message || "")
      .replace(/\r\n?/g, "\n")
      .trim()
      .split("\n");
    const normalizeForCompare = (value: string) =>
      value.replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
    const firstContentLine = lines.findIndex((line) => line.trim());

    if (
      firstContentLine >= 0 &&
      normalizeForCompare(lines[firstContentLine]) === normalizeForCompare(title)
    ) {
      lines.splice(firstContentLine, 1);
    }

    return lines.map((line, index) => {
      const trimmed = line.trim();
      const indentation = line.length - line.trimStart().length;

      if (!trimmed) {
        return <div key={`space-${index}`} aria-hidden="true" style={{ height: "7px" }} />;
      }

      if (/^[━─—_=-]{4,}$/.test(trimmed)) {
        return <hr key={`rule-${index}`} style={{ border: 0, borderTop: "1px solid #d7e1eb", margin: "8px 0" }} />;
      }

      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        return (
          <h3 key={`heading-${index}`} style={{ margin: "12px 0 5px", color: "#174a82", fontSize: "17px", lineHeight: 1.45 }}>
            {renderInlineAnnouncementText(heading[1])}
          </h3>
        );
      }

      const numberedItem = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      if (numberedItem) {
        return (
          <div key={`number-${index}`} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: "5px", margin: "4px 0 7px" }}>
            <strong style={{ color: "#2563eb" }}>{numberedItem[1]}.</strong>
            <span>{renderInlineAnnouncementText(numberedItem[2])}</span>
          </div>
        );
      }

      const bulletItem = trimmed.match(/^[•●▪*-]\s+(.+)$/);
      if (bulletItem) {
        return (
          <div key={`bullet-${index}`} style={{ display: "grid", gridTemplateColumns: "20px minmax(0, 1fr)", gap: "5px", margin: "4px 0 7px", marginLeft: `${Math.min(indentation, 3) * 7}px` }}>
            <span aria-hidden="true" style={{ color: "#e66b2e", fontWeight: 900 }}>•</span>
            <span>{renderInlineAnnouncementText(bulletItem[1])}</span>
          </div>
        );
      }

      return (
        <p key={`paragraph-${index}`} style={{ margin: `0 0 8px ${indentation ? "22px" : "0"}` }}>
          {renderInlineAnnouncementText(trimmed)}
        </p>
      );
    });
  }

  const latestFreshAnnouncementId =
    announcements.find((announcement) =>
      isWithinLatest24Hours(announcement.created_at)
    )?.id ?? null;

  function toggleAnnouncement(announcement: Announcement) {
    if (announcement.id === latestFreshAnnouncementId) {
      setCollapsedFreshAnnouncementId((current) =>
        current === announcement.id ? null : announcement.id
      );
      return;
    }

    setExpandedAnnouncementId((current) =>
      current === announcement.id ? null : announcement.id
    );
  }

  return (
    <main style={styles.page}>
      <div
        style={
          styles.container
        }
      >
        {/* NAVIGATION */}

        <nav
          style={
            styles.navbar
          }
        >
          <div>
            <div
              style={
                styles.brand
              }
            >
              📢 STUDENT ANNOUNCEMENTS
            </div>

            <div
              style={
                styles.subBrand
              }
            >
              ALL TEACHER UPDATES
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/dashboard"
              )
            }
            style={
              styles.backButton
            }
          >
            ← Dashboard
          </button>
        </nav>

        {/* HERO */}

        <section
          style={
            styles.hero
          }
        >
          <div
            style={
              styles.heroIcon
            }
          >
            📢
          </div>

          <div>
            <div
              style={
                styles.eyebrow
              }
            >
              STUDENT CENTER
            </div>

            <h1
              style={
                styles.title
              }
            >
              Announcements
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              All teacher announcements are
              available here.
            </p>
          </div>

          <div
            style={
              styles.countBadge
            }
          >
            {announcements.length}{" "}
            {announcements.length ===
            1
              ? "ANNOUNCEMENT"
              : "ANNOUNCEMENTS"}
          </div>
        </section>

        {/* ANNOUNCEMENTS */}

        {loading ? (
          <div
            style={
              styles.emptyCard
            }
          >
            <div
              style={
                styles.emptyIcon
              }
            >
              ⏳
            </div>

            <h2
              style={
                styles.emptyTitle
              }
            >
              Loading Announcements...
            </h2>

            <p
              style={
                styles.emptyText
              }
            >
              Please wait.
            </p>
          </div>
        ) : announcements.length ===
          0 ? (
          <div
            style={
              styles.emptyCard
            }
          >
            <div
              style={
                styles.emptyIcon
              }
            >
              📭
            </div>

            <h2
              style={
                styles.emptyTitle
              }
            >
              No Announcements
            </h2>

            <p
              style={
                styles.emptyText
              }
            >
              There are currently no teacher
              announcements.
            </p>
          </div>
        ) : (
          <div
            style={
              styles.list
            }
          >
            {announcements.map(
              (announcement) => {
                const isExpanded =
                  (announcement.id === latestFreshAnnouncementId &&
                    collapsedFreshAnnouncementId !== announcement.id) ||
                  (announcement.id !== latestFreshAnnouncementId &&
                    expandedAnnouncementId === announcement.id);

                return (
                <article
                  key={
                    announcement.id
                  }
                  style={
                    styles.card
                  }
                >
                  <div
                    style={
                      styles.cardTop
                    }
                  >
                    <div
                      style={
                        styles.icon
                      }
                    >
                      📢
                    </div>

                    <div
                      style={
                        styles.content
                      }
                    >
                      <div
                        style={
                          styles.meta
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

                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`announcement-body-${announcement.id}`}
                        onClick={() => toggleAnnouncement(announcement)}
                        style={styles.topicButton}
                      >
                        <span
                          role="heading"
                          aria-level={2}
                          style={{ ...styles.cardTitle, margin: 0, minWidth: 0, flex: "1 1 auto" }}
                        >
                          {renderInlineAnnouncementText(announcement.title)}
                        </span>
                        <span style={styles.topicHint}>
                          {isExpanded
                            ? "Hide details ↑"
                            : "Tap to read →"}
                        </span>
                      </button>

                    </div>
                  </div>

                  <div
                    id={`announcement-body-${announcement.id}`}
                    hidden={!isExpanded}
                    style={styles.message}
                  >
                    {renderAnnouncementMessage(announcement.title, announcement.message)}
                  </div>

                  <div
                    hidden={!isExpanded}
                    style={
                      styles.bottom
                    }
                  >
                    <span
                      style={
                        styles.everyone
                      }
                    >
                      👥 For all students
                    </span>

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
                          ? styles.likeActive
                          : {}),
                        opacity:
                          likingId ===
                          announcement.id
                            ? 0.6
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
                );
              }
            )}
          </div>
        )}
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
      '"Segoe UI", Inter, Arial, sans-serif',
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
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

  brand: {
    color: "#172554",
    fontSize: "14px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  subBrand: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  backButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  hero: {
    background:
      "linear-gradient(125deg,#142b58 0%,#2455a5 56%,#6652c8 100%)",
    borderRadius: "22px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    color: "#ffffff",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.20)",
    flexWrap: "wrap",
  },

  heroIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
  },

  eyebrow: {
    color: "#bfdbfe",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
  },

  title: {
    margin: "4px 0 0",
    fontSize: "25px",
    fontWeight: "1000",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#dbeafe",
    fontSize: "11px",
    fontWeight: "600",
  },

  countBadge: {
    marginLeft: "auto",
    background:
      "rgba(255,255,255,0.14)",
    border:
      "1px solid rgba(255,255,255,0.25)",
    padding: "9px 12px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  card: {
    background: "linear-gradient(135deg,#ffffff 0%,#fbfdff 72%,#f4f7ff 100%)",
    border: "1px solid #dce6f5",
    borderLeft: "4px solid #5979df",
    borderRadius: "16px",
    padding: "15px",
    boxShadow:
      "0 8px 24px rgba(30,58,110,0.07)",
  },

  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
  },

  icon: {
    width: "43px",
    height: "43px",
    minWidth: "43px",
    borderRadius: "14px",
    background:
      "linear-gradient(145deg,#e0edff,#eee8ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
    boxShadow: "inset 0 0 0 1px rgba(95,124,210,0.08)",
  },

  content: {
    minWidth: 0,
    flex: 1,
  },

  meta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  teacherBadge: {
    background: "#e9f0ff",
    color: "#3158ad",
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "0.7px",
  },

  date: {
    color: "#8290a7",
    fontSize: "11px",
    fontWeight: "700",
  },

  cardTitle: {
    margin: "0",
    color: "#172b50",
    fontSize: "17px",
    fontWeight: "1000",
    wordBreak: "break-word",
    lineHeight: 1.5,
  },

  topicButton: {
    width: "100%",
    margin: "9px 0 0",
    padding: "9px 10px",
    border: "1px solid #e4eaf5",
    borderRadius: "11px",
    background: "rgba(244,247,255,0.85)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    textAlign: "left",
    cursor: "pointer",
  },

  topicHint: {
    flex: "0 0 auto",
    marginTop: "2px",
    padding: "5px 8px",
    borderRadius: "999px",
    background: "#e8efff",
    color: "#3158ad",
    fontSize: "10px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  message: {
    margin: "11px 0 0",
    padding: "14px 15px",
    border: "1px solid #e0e8f3",
    borderRadius: "12px",
    background: "linear-gradient(180deg,#ffffff,#f8faff)",
    color: "#33445d",
    fontSize: "14px",
    lineHeight: 1.75,
    fontWeight: "500",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },

  bottom: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  everyone: {
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
    cursor: "pointer",
  },

  likeActive: {
    background: "#fff1f2",
    border:
      "1px solid #fecdd3",
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

  emptyCard: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "40px 20px",
    textAlign: "center",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  emptyIcon: {
    fontSize: "35px",
  },

  emptyTitle: {
    margin: "10px 0 0",
    color: "#172554",
    fontSize: "18px",
    fontWeight: "1000",
  },

  emptyText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },
};
