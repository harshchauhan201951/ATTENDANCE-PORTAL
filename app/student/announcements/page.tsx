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

type StudentRecord = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  admission_date?: string | null;
  admissionDate?: string | null;
  date_of_admission?: string | null;
  dateOfAdmission?: string | null;
  joining_date?: string | null;
  joiningDate?: string | null;
  [key: string]: unknown;
};

export default function StudentAnnouncementsPage() {
  const router = useRouter();

  const [studentId, setStudentId] =
    useState<number | null>(null);

  const [username, setUsername] =
    useState("");

  const [admissionDate, setAdmissionDate] =
    useState<Date | null>(null);

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [likingId, setLikingId] =
    useState<number | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  /*
   * ============================================================
   * DATE HELPERS
   * ============================================================
   */

  function createDateOnly(
    year: number,
    monthIndex: number,
    day: number
  ): Date {
    return new Date(
      year,
      monthIndex,
      day
    );
  }

  function parseLocalDate(
    value: string
  ): Date | null {
    if (!value) {
      return null;
    }

    const cleanValue =
      value.trim();

    /*
     * YYYY-MM-DD
     */
    const isoMatch =
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(
        cleanValue
      );

    if (isoMatch) {
      const year =
        Number(isoMatch[1]);

      const month =
        Number(isoMatch[2]);

      const day =
        Number(isoMatch[3]);

      const date =
        new Date(
          year,
          month - 1,
          day
        );

      if (
        date.getFullYear() === year &&
        date.getMonth() ===
          month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }

      return null;
    }

    /*
     * 07 Sep 2026
     */
    const textMatch =
      /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(
        cleanValue
      );

    if (textMatch) {
      const day =
        Number(textMatch[1]);

      const monthText =
        textMatch[2]
          .toLowerCase()
          .slice(0, 3);

      const year =
        Number(textMatch[3]);

      const monthMap: Record<
        string,
        number
      > = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };

      const month =
        monthMap[monthText];

      if (
        month !== undefined
      ) {
        const date =
          new Date(
            year,
            month,
            day
          );

        if (
          date.getFullYear() ===
            year &&
          date.getMonth() ===
            month &&
          date.getDate() === day
        ) {
          return date;
        }
      }
    }

    /*
     * dd/mm/yyyy or dd-mm-yyyy
     */
    const slashMatch =
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(
        cleanValue
      );

    if (slashMatch) {
      const day =
        Number(slashMatch[1]);

      const month =
        Number(slashMatch[2]);

      const year =
        Number(slashMatch[3]);

      const date =
        new Date(
          year,
          month - 1,
          day
        );

      if (
        date.getFullYear() ===
          year &&
        date.getMonth() ===
          month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }

    /*
     * Timestamp / standard date fallback.
     */
    const parsed =
      new Date(cleanValue);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    );
  }

  function getStudentAdmissionDate(
    student: StudentRecord
  ): Date | null {
    const possibleKeys = [
      "admission_date",
      "admissionDate",
      "date_of_admission",
      "dateOfAdmission",
      "joining_date",
      "joiningDate",
    ];

    for (
      const key of possibleKeys
    ) {
      const value =
        student[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        const parsed =
          parseLocalDate(
            String(value)
          );

        if (parsed) {
          return parsed;
        }
      }
    }

    return null;
  }

  /*
   * Announcement visibility rule:
   *
   * Admission = 07 Sep 2026
   *
   * Announcement = 06 Sep -> HIDDEN
   * Announcement = 07 Sep -> SHOWN
   * Announcement = 08 Sep -> SHOWN
   */
  function isAnnouncementVisibleForStudent(
    announcementCreatedAt: string,
    studentAdmissionDate: Date | null
  ): boolean {
    /*
     * If admission date cannot be resolved,
     * do not expose old announcements.
     *
     * Returning false is safer than showing
     * the complete old history.
     */
    if (
      !studentAdmissionDate
    ) {
      return false;
    }

    const announcementDate =
      new Date(
        announcementCreatedAt
      );

    if (
      Number.isNaN(
        announcementDate.getTime()
      )
    ) {
      return false;
    }

    /*
     * Compare calendar dates only.
     * Time of announcement should not matter.
     *
     * Example:
     *
     * Admission:
     * 07 Sep 2026
     *
     * Announcement:
     * 07 Sep 2026 08:00 AM
     *
     * -> SHOW
     *
     * Announcement:
     * 06 Sep 2026 11:59 PM
     *
     * -> HIDE
     */
    const announcementOnly =
      createDateOnly(
        announcementDate.getFullYear(),
        announcementDate.getMonth(),
        announcementDate.getDate()
      );

    const admissionOnly =
      createDateOnly(
        studentAdmissionDate.getFullYear(),
        studentAdmissionDate.getMonth(),
        studentAdmissionDate.getDate()
      );

    return (
      announcementOnly >=
      admissionOnly
    );
  }

  /*
   * ============================================================
   * INITIALIZE
   * ============================================================
   */

  async function initialize() {
    setLoading(true);

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

    setUsername(
      savedUsername
    );

    let resolvedId:
      number | null = null;

    /*
     * First resolve using username.
     */
    if (savedUsername) {
      resolvedId =
        await resolveStudentId(
          savedUsername
        );
    }

    /*
     * Fallback to saved studentId.
     */
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

    /*
     * Load admission date before
     * loading announcements.
     */
    const resolvedAdmissionDate =
      await resolveStudentAdmissionDate(
        resolvedId,
        savedUsername
      );

    setAdmissionDate(
      resolvedAdmissionDate
    );

    await loadAnnouncements(
      resolvedId,
      resolvedAdmissionDate
    );

    setLoading(false);
  }

  /*
   * ============================================================
   * RESOLVE STUDENT ID
   * ============================================================
   */

  async function resolveStudentId(
    studentUsername: string
  ): Promise<number | null> {
    try {
      const {
        data,
        error,
      } =
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

      return Number(
        data.id
      );
    } catch (error) {
      console.error(
        "Unexpected student ID lookup error:",
        error
      );

      return null;
    }
  }

  /*
   * ============================================================
   * RESOLVE ADMISSION DATE
   * ============================================================
   */

  async function resolveStudentAdmissionDate(
    currentStudentId:
      number | null,
    studentUsername: string
  ): Promise<Date | null> {
    try {
      let query =
        supabase
          .from("students")
          .select("*");

      /*
       * Prefer ID when available.
       */
      if (
        currentStudentId !==
        null
      ) {
        query =
          query.eq(
            "id",
            currentStudentId
          );
      } else if (
        studentUsername
      ) {
        query =
          query.eq(
            "student_username",
            studentUsername
          );
      } else {
        return null;
      }

      const {
        data,
        error,
      } = await query.maybeSingle();

      if (error) {
        console.error(
          "Admission date lookup error:",
          error
        );

        return null;
      }

      if (!data) {
        return null;
      }

      return getStudentAdmissionDate(
        data as StudentRecord
      );
    } catch (error) {
      console.error(
        "Unexpected admission date lookup error:",
        error
      );

      return null;
    }
  }

  /*
   * ============================================================
   * LOAD ANNOUNCEMENTS
   * ============================================================
   */

  async function loadAnnouncements(
    currentStudentId:
      number | null,
    currentAdmissionDate:
      Date | null = admissionDate
  ) {
    /*
     * Do not show any announcements
     * until student's admission date
     * has been resolved.
     */
    if (
      !currentStudentId ||
      !currentAdmissionDate
    ) {
      setAnnouncements([]);
      return;
    }

    try {
      const {
        data: announcementData,
        error: announcementError,
      } =
        await supabase
          .from("announcements")
          .select(
            "id, title, message, created_at"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (
        announcementError
      ) {
        console.error(
          "Announcements loading error:",
          announcementError
        );

        setAnnouncements([]);

        return;
      }

      const rows =
        announcementData || [];

      /*
       * ========================================================
       * ADMISSION DATE FILTER
       * ========================================================
       *
       * Only announcements on or after
       * admission date are allowed.
       */
      const visibleRows =
        rows.filter(
          (announcement) =>
            isAnnouncementVisibleForStudent(
              announcement.created_at,
              currentAdmissionDate
            )
        );

      if (
        visibleRows.length === 0
      ) {
        setAnnouncements([]);
        return;
      }

      const ids =
        visibleRows.map(
          (announcement) =>
            announcement.id
        );

      const {
        data: likesData,
        error: likesError,
      } =
        await supabase
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
        visibleRows.map(
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
              id:
                announcement.id,

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
    }
  }

  /*
   * ============================================================
   * TOGGLE LIKE
   * ============================================================
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
        const {
          error,
        } =
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
      const {
        error,
      } =
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
            currentStudentId,
            admissionDate
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
      setLikingId(
        null
      );
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

  return (
    <main
      style={styles.page}
    >
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
            {
              announcements.length ===
              1
                ? "ANNOUNCEMENT"
                : "ANNOUNCEMENTS"
            }
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
              announcements available after
              your admission date.
            </p>

          </div>
        ) : (
          <div
            style={
              styles.list
            }
          >

            {announcements.map(
              (announcement) => (
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

                      <h2
                        style={
                          styles.cardTitle
                        }
                      >
                        {
                          announcement.title
                        }
                      </h2>

                      <p
                        style={
                          styles.message
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
              )
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
    minHeight:
      "100vh",

    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",

    padding:
      "18px",

    boxSizing:
      "border-box",

    fontFamily:
      "Arial, Helvetica, sans-serif",

    color:
      "#0f172a",
  },

  container: {
    width:
      "100%",

    maxWidth:
      "1000px",

    margin:
      "0 auto",
  },

  navbar: {
    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "18px",

    padding:
      "14px 18px",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    gap:
      "15px",

    marginBottom:
      "18px",

    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",

    flexWrap:
      "wrap",
  },

  brand: {
    color:
      "#172554",

    fontSize:
      "14px",

    fontWeight:
      "1000",

    letterSpacing:
      "1px",
  },

  subBrand: {
    marginTop:
      "4px",

    color:
      "#64748b",

    fontSize:
      "9px",

    fontWeight:
      "900",

    letterSpacing:
      "2px",
  },

  backButton: {
    border:
      "none",

    background:
      "#2563eb",

    color:
      "#ffffff",

    padding:
      "10px 15px",

    borderRadius:
      "9px",

    fontWeight:
      "900",

    cursor:
      "pointer",
  },

  hero: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",

    borderRadius:
      "22px",

    padding:
      "25px",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "15px",

    marginBottom:
      "18px",

    color:
      "#ffffff",

    boxShadow:
      "0 15px 35px rgba(37,99,235,0.20)",

    flexWrap:
      "wrap",
  },

  heroIcon: {
    width:
      "58px",

    height:
      "58px",

    borderRadius:
      "16px",

    background:
      "rgba(255,255,255,0.15)",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "27px",
  },

  eyebrow: {
    color:
      "#bfdbfe",

    fontSize:
      "9px",

    fontWeight:
      "1000",

    letterSpacing:
      "2px",
  },

  title: {
    margin:
      "4px 0 0",

    fontSize:
      "28px",

    fontWeight:
      "1000",
  },

  subtitle: {
    margin:
      "5px 0 0",

    color:
      "#dbeafe",

    fontSize:
      "11px",

    fontWeight:
      "600",
  },

  countBadge: {
    marginLeft:
      "auto",

    background:
      "rgba(255,255,255,0.14)",

    border:
      "1px solid rgba(255,255,255,0.25)",

    padding:
      "9px 12px",

    borderRadius:
      "9px",

    fontSize:
      "10px",

    fontWeight:
      "1000",
  },

  list: {
    display:
      "flex",

    flexDirection:
      "column",

    gap:
      "12px",
  },

  card: {
    background:
      "#ffffff",

    border:
      "1px solid #dbeafe",

    borderRadius:
      "17px",

    padding:
      "17px",

    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  cardTop: {
    display:
      "flex",

    alignItems:
      "flex-start",

    gap:
      "13px",
  },

  icon: {
    width:
      "47px",

    height:
      "47px",

    minWidth:
      "47px",

    borderRadius:
      "13px",

    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "22px",
  },

  content: {
    minWidth:
      0,

    flex:
      1,
  },

  meta: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "8px",

    flexWrap:
      "wrap",
  },

  teacherBadge: {
    background:
      "#dbeafe",

    color:
      "#1d4ed8",

    padding:
      "4px 7px",

    borderRadius:
      "6px",

    fontSize:
      "8px",

    fontWeight:
      "1000",

    letterSpacing:
      "0.7px",
  },

  date: {
    color:
      "#94a3b8",

    fontSize:
      "9px",

    fontWeight:
      "700",
  },

  cardTitle: {
    margin:
      "7px 0 0",

    color:
      "#172554",

    fontSize:
      "18px",

    fontWeight:
      "1000",

    wordBreak:
      "break-word",
  },

  message: {
    margin:
      "7px 0 0",

    color:
      "#475569",

    fontSize:
      "12px",

    lineHeight:
      1.65,

    fontWeight:
      "600",

    whiteSpace:
      "pre-wrap",

    wordBreak:
      "break-word",
  },

  bottom: {
    marginTop:
      "14px",

    paddingTop:
      "12px",

    borderTop:
      "1px solid #e2e8f0",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    gap:
      "10px",

    flexWrap:
      "wrap",
  },

  everyone: {
    color:
      "#64748b",

    fontSize:
      "10px",

    fontWeight:
      "800",
  },

  likeButton: {
    border:
      "1px solid #cbd5e1",

    background:
      "#ffffff",

    color:
      "#475569",

    padding:
      "8px 11px",

    borderRadius:
      "9px",

    fontSize:
      "11px",

    fontWeight:
      "1000",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "7px",

    cursor:
      "pointer",
  },

  likeActive: {
    background:
      "#fff1f2",

    border:
      "1px solid #fecdd3",

    color:
      "#be123c",
  },

  likeCount: {
    background:
      "#f1f5f9",

    color:
      "#475569",

    minWidth:
      "19px",

    height:
      "19px",

    padding:
      "0 4px",

    borderRadius:
      "999px",

    display:
      "inline-flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "9px",

    fontWeight:
      "1000",
  },

  emptyCard: {
    background:
      "#ffffff",

    border:
      "1px solid #dbeafe",

    borderRadius:
      "18px",

    padding:
      "40px 20px",

    textAlign:
      "center",

    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  emptyIcon: {
    fontSize:
      "35px",
  },

  emptyTitle: {
    margin:
      "10px 0 0",

    color:
      "#172554",

    fontSize:
      "18px",

    fontWeight:
      "1000",
  },

  emptyText: {
    margin:
      "5px 0 0",

    color:
      "#64748b",

    fontSize:
      "11px",

    fontWeight:
      "600",
  },
};