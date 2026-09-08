"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

type ExtraClassAttendanceRecord = {
  id: number;
  extra_class_id: number | null;
  student_id: number;
  extra_class_date: string;
  class_time: string | null;
  subject: string | null;
  topic: string | null;
  status: string;
  remarks: string | null;
  created_at?: string | null;
};

type UnifiedAttendanceRecord = {
  id: string;
  student_id: number;
  attendance_date: string;
  status: string;
  attendance_type: "regular" | "extra";
  extra_class_id?: number | null;
  class_time?: string | null;
  subject?: string | null;
  topic?: string | null;
  remarks?: string | null;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [extraClassRecords, setExtraClassRecords] =
    useState<ExtraClassAttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAttendance();
  }, []);

  async function findStudentByUsername(
    username: string
  ): Promise<Student | null> {
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      return null;
    }

    const exactResult = await supabase
      .from("students")
      .select("id, student_name, student_username")
      .eq("student_username", cleanUsername)
      .maybeSingle();

    if (exactResult.error) {
      throw new Error(exactResult.error.message);
    }

    if (exactResult.data) {
      return exactResult.data as Student;
    }

    const fallbackResult = await supabase
      .from("students")
      .select("id, student_name, student_username")
      .ilike("student_username", cleanUsername)
      .limit(1);

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message);
    }

    if (
      fallbackResult.data &&
      fallbackResult.data.length > 0
    ) {
      return fallbackResult.data[0] as Student;
    }

    return null;
  }

  async function loadAttendance() {
    if (loading) {
      setLoading(true);
    }

    setRefreshing(true);
    setError("");

    try {
      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("username");

      if (!username) {
        setError("Student login information not found.");
        return;
      }

      const studentData =
        await findStudentByUsername(username);

      if (!studentData) {
        setError("Student account not found.");
        return;
      }

      setStudent(studentData);

      /*
       * -------------------------------------------------------
       * REGULAR ATTENDANCE
       * -------------------------------------------------------
       */
      const regularAttendancePromise = supabase
        .from("attendance")
        .select(
          "id, student_id, attendance_date, status"
        )
        .eq("student_id", studentData.id)
        .order("attendance_date", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

      /*
       * -------------------------------------------------------
       * EXTRA CLASS ATTENDANCE
       * -------------------------------------------------------
       *
       * Teacher Portal is expected to save Extra Classes in:
       *
       * extra_class_attendance
       *
       * with:
       * student_id
       * extra_class_id
       * extra_class_date
       * class_time
       * subject
       * topic
       * status
       * remarks
       *
       * We query it independently from regular attendance.
       */
      const extraClassAttendancePromise = supabase
        .from("extra_class_attendance")
        .select(
          "id, extra_class_id, student_id, extra_class_date, class_time, subject, topic, status, remarks, created_at"
        )
        .eq("student_id", studentData.id)
        .order("extra_class_date", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

      const [
        regularAttendanceResult,
        extraClassAttendanceResult,
      ] = await Promise.all([
        regularAttendancePromise,
        extraClassAttendancePromise,
      ]);

      if (regularAttendanceResult.error) {
        throw new Error(
          regularAttendanceResult.error.message
        );
      }

      /*
       * IMPORTANT:
       *
       * If RLS/table permission is the reason that the Extra Class
       * query cannot be read, show that exact Supabase error instead
       * of silently displaying zero records.
       */
      if (extraClassAttendanceResult.error) {
        throw new Error(
          "Extra Class Attendance could not be loaded: " +
            extraClassAttendanceResult.error.message
        );
      }

      setRecords(
        (regularAttendanceResult.data || []) as AttendanceRecord[]
      );

      setExtraClassRecords(
        (extraClassAttendanceResult.data ||
          []) as ExtraClassAttendanceRecord[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading attendance."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * UNIFIED ATTENDANCE
   * ---------------------------------------------------------
   */
  const unifiedAttendance = useMemo<
    UnifiedAttendanceRecord[]
  >(() => {
    const regularRecords: UnifiedAttendanceRecord[] =
      records.map((record) => ({
        id: `regular-${record.id}`,
        student_id: record.student_id,
        attendance_date: record.attendance_date,
        status: record.status,
        attendance_type: "regular",
      }));

    const extraRecords: UnifiedAttendanceRecord[] =
      extraClassRecords.map((record) => ({
        id: `extra-${record.id}`,
        student_id: record.student_id,
        attendance_date: record.extra_class_date,
        status: record.status,
        attendance_type: "extra",
        extra_class_id: record.extra_class_id,
        class_time: record.class_time,
        subject: record.subject,
        topic: record.topic,
        remarks: record.remarks,
      }));

    return [
      ...regularRecords,
      ...extraRecords,
    ].sort((a, b) => {
      const dateCompare =
        String(b.attendance_date).localeCompare(
          String(a.attendance_date)
        );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      /*
       * On the same date, Extra Class appears first.
       */
      if (
        a.attendance_type === "extra" &&
        b.attendance_type !== "extra"
      ) {
        return -1;
      }

      if (
        a.attendance_type !== "extra" &&
        b.attendance_type === "extra"
      ) {
        return 1;
      }

      return b.id.localeCompare(a.id);
    });
  }, [records, extraClassRecords]);

  /*
   * ---------------------------------------------------------
   * STATUS HELPERS
   * ---------------------------------------------------------
   */
  function isPresent(status: string): boolean {
    const value = String(status || "")
      .trim()
      .toUpperCase();

    return value === "PRESENT" || value === "P";
  }

  function isAbsent(status: string): boolean {
    const value = String(status || "")
      .trim()
      .toUpperCase();

    return value === "ABSENT" || value === "A";
  }

  /*
   * ---------------------------------------------------------
   * STATS
   * ---------------------------------------------------------
   */
  const totalClasses = unifiedAttendance.length;

  const present = unifiedAttendance.filter((record) =>
    isPresent(record.status)
  ).length;

  const absent = unifiedAttendance.filter((record) =>
    isAbsent(record.status)
  ).length;

  const regularTotal = records.length;

  const regularPresent = records.filter((record) =>
    isPresent(record.status)
  ).length;

  const regularAbsent = records.filter((record) =>
    isAbsent(record.status)
  ).length;

  const extraTotal = extraClassRecords.length;

  const extraPresent = extraClassRecords.filter((record) =>
    isPresent(record.status)
  ).length;

  const extraAbsent = extraClassRecords.filter((record) =>
    isAbsent(record.status)
  ).length;

  const percentage =
    totalClasses > 0
      ? Math.round((present / totalClasses) * 100)
      : 0;

  const extraPercentage =
    extraTotal > 0
      ? Math.round((extraPresent / extraTotal) * 100)
      : 0;

  /*
   * ---------------------------------------------------------
   * STATUS STYLE
   * ---------------------------------------------------------
   */
  function getStatusStyle(status: string) {
    const value = String(status || "")
      .trim()
      .toUpperCase();

    if (isPresent(value)) {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (isAbsent(value)) {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  /*
   * ---------------------------------------------------------
   * DATE / TIME
   * ---------------------------------------------------------
   */
  function formatDate(date: string) {
    const d = new Date(`${date}T00:00:00`);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(time: string | null) {
    if (!time) {
      return "";
    }

    const parts = time.split(":");

    if (parts.length < 2) {
      return time;
    }

    const hour = Number(parts[0]);
    const minute = parts[1];

    if (!Number.isFinite(hour)) {
      return time;
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  function getDayName(date: string) {
    const d = new Date(`${date}T00:00:00`);

    if (Number.isNaN(d.getTime())) {
      return "—";
    }

    return d.toLocaleDateString("en-IN", {
      weekday: "long",
    });
  }

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */
  function logout() {
    const keys = [
      "student_username",
      "studentUsername",
      "username",
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Loading Attendance...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.smallTitle}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              Attendance
            </h1>

            <p style={styles.subtitle}>
              View your complete attendance record
            </p>
          </div>

          <div style={styles.headerButtons}>
            <Link
              href="/student/dashboard"
              style={styles.backButton}
            >
              Back to Dashboard
            </Link>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        </header>

        {/* STUDENT INFO */}

        <section style={styles.studentCard}>
          <div style={styles.avatar}>
            🎓
          </div>

          <div style={styles.studentInfo}>
            <span style={styles.profileBadge}>
              STUDENT
            </span>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username ||
                "Student"}
            </h2>

            <p style={styles.username}>
              Username:{" "}
              {student?.student_username || "—"}
            </p>

            <p style={styles.studentId}>
              Student ID: {student?.id ?? "—"}
            </p>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            <strong>⚠️ Attendance Error</strong>
            <div style={styles.errorText}>
              {error}
            </div>
          </div>
        )}

        {/* SUMMARY */}

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              TC
            </div>

            <div>
              <p style={styles.statLabel}>
                Total Classes
              </p>

              <h2 style={styles.statValue}>
                {totalClasses}
              </h2>

              <small style={styles.statSmall}>
                Regular {regularTotal} + Extra{" "}
                {extraTotal}
              </small>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              P
            </div>

            <div>
              <p style={styles.statLabel}>
                Present
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#16a34a",
                }}
              >
                {present}
              </h2>

              <small style={styles.statSmall}>
                {regularPresent} regular +{" "}
                {extraPresent} extra
              </small>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fee2e2",
                color: "#991b1b",
              }}
            >
              A
            </div>

            <div>
              <p style={styles.statLabel}>
                Absent
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#dc2626",
                }}
              >
                {absent}
              </h2>

              <small style={styles.statSmall}>
                {regularAbsent} regular +{" "}
                {extraAbsent} extra
              </small>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background:
                  percentage >= 75
                    ? "#dcfce7"
                    : "#fee2e2",
                color:
                  percentage >= 75
                    ? "#166534"
                    : "#991b1b",
              }}
            >
              %
            </div>

            <div>
              <p style={styles.statLabel}>
                Attendance %
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color:
                    percentage >= 75
                      ? "#16a34a"
                      : "#dc2626",
                }}
              >
                {percentage}%
              </h2>

              <small style={styles.statSmall}>
                Including Extra Classes
              </small>
            </div>
          </div>
        </section>

        {/* EXTRA CLASS SUMMARY */}

        <section
          style={{
            ...styles.card,
            border:
              extraTotal > 0
                ? "1px solid #f9a8d4"
                : "1px solid #e2e8f0",
            background:
              extraTotal > 0
                ? "linear-gradient(135deg,#fff7ed,#fdf2f8)"
                : "#ffffff",
          }}
        >
          <div style={styles.extraHeader}>
            <div style={styles.extraIcon}>
              ⭐
            </div>

            <div style={styles.extraInfo}>
              <h2 style={styles.sectionTitle}>
                Extra Class Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                Attendance marked by your teacher
                for additional classes
              </p>
            </div>

            <strong
              style={{
                color: "#db2777",
                fontSize: "24px",
                whiteSpace: "nowrap",
              }}
            >
              {extraPercentage}%
            </strong>
          </div>

          <div style={styles.extraStatsGrid}>
            <div style={styles.extraStatBox}>
              <span>EXTRA CLASSES</span>
              <strong>{extraTotal}</strong>
            </div>

            <div
              style={{
                ...styles.extraStatBox,
                background: "#f0fdf4",
              }}
            >
              <span>PRESENT</span>
              <strong
                style={{ color: "#16a34a" }}
              >
                {extraPresent}
              </strong>
            </div>

            <div
              style={{
                ...styles.extraStatBox,
                background: "#fef2f2",
              }}
            >
              <span>ABSENT</span>
              <strong
                style={{ color: "#dc2626" }}
              >
                {extraAbsent}
              </strong>
            </div>
          </div>

          {extraTotal === 0 && !error && (
            <div style={styles.extraEmpty}>
              <strong>
                No Extra Class Attendance Found
              </strong>

              <p>
                Extra Class attendance will appear
                here after your teacher uploads and
                marks it for you.
              </p>
            </div>
          )}
        </section>

        {/* ATTENDANCE PROGRESS */}

        <section style={styles.card}>
          <div style={styles.progressHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Attendance Overview
              </h2>

              <p style={styles.sectionSubtitle}>
                Your current attendance percentage
                including Extra Classes
              </p>
            </div>

            <strong
              style={{
                color:
                  percentage >= 75
                    ? "#16a34a"
                    : "#dc2626",
                fontSize: "22px",
              }}
            >
              {percentage}%
            </strong>
          </div>

          <div style={styles.progressBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: `${Math.min(
                  percentage,
                  100
                )}%`,
                background:
                  percentage >= 75
                    ? "#16a34a"
                    : "#dc2626",
              }}
            />
          </div>

          <div style={styles.progressMessage}>
            {percentage >= 75
              ? "Your attendance is good."
              : "Your attendance is below 75%. Try to attend more classes."}
          </div>
        </section>

        {/* ATTENDANCE RECORDS */}

        <section style={styles.card}>
          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Attendance Records
              </h2>

              <p style={styles.sectionSubtitle}>
                Regular + Extra Class attendance
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAttendance()}
              style={styles.refreshButton}
              disabled={refreshing}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {unifiedAttendance.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📅
              </div>

              <h3 style={styles.emptyTitle}>
                No Attendance Records
              </h3>

              <p style={styles.emptyText}>
                Your attendance records will
                appear here once your teacher
                marks attendance.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>

                    <th style={styles.th}>
                      Date
                    </th>

                    <th style={styles.th}>
                      Day
                    </th>

                    <th style={styles.th}>
                      Type
                    </th>

                    <th style={styles.th}>
                      Details
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {unifiedAttendance.map(
                    (record, index) => {
                      const date = new Date(
                        `${record.attendance_date}T00:00:00`
                      );

                      const isExtra =
                        record.attendance_type ===
                        "extra";

                      const recordStatus =
                        String(
                          record.status || ""
                        )
                          .trim()
                          .toUpperCase();

                      return (
                        <tr
                          key={record.id}
                          style={
                            isExtra
                              ? styles.extraRow
                              : undefined
                          }
                        >
                          <td style={styles.td}>
                            {index + 1}
                          </td>

                          <td style={styles.td}>
                            <strong>
                              {formatDate(
                                record.attendance_date
                              )}
                            </strong>
                          </td>

                          <td style={styles.td}>
                            {date.toLocaleDateString(
                              "en-IN",
                              {
                                weekday: "long",
                              }
                            )}
                          </td>

                          <td style={styles.td}>
                            {isExtra ? (
                              <span
                                style={
                                  styles.extraBadge
                                }
                              >
                                ⭐ EXTRA
                              </span>
                            ) : (
                              <span
                                style={
                                  styles.regularBadge
                                }
                              >
                                REGULAR
                              </span>
                            )}
                          </td>

                          <td style={styles.td}>
                            {isExtra ? (
                              <div
                                style={
                                  styles.details
                                }
                              >
                                <strong
                                  style={{
                                    color:
                                      "#9d174d",
                                  }}
                                >
                                  {record.subject ||
                                    "Extra Class"}
                                </strong>

                                {record.topic && (
                                  <span>
                                    Topic:{" "}
                                    {
                                      record.topic
                                    }
                                  </span>
                                )}

                                {record.class_time && (
                                  <span>
                                    🕐{" "}
                                    {formatTime(
                                      record.class_time
                                    )}
                                  </span>
                                )}

                                {record.remarks && (
                                  <span>
                                    Remark:{" "}
                                    {
                                      record.remarks
                                    }
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{
                                  color:
                                    "#64748b",
                                }}
                              >
                                Regular Class
                              </span>
                            )}
                          </td>

                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.badge,
                                ...getStatusStyle(
                                  recordStatus
                                ),
                              }}
                            >
                              {isPresent(
                                recordStatus
                              ) && "✓ "}

                              {isAbsent(
                                recordStatus
                              ) && "✕ "}

                              {record.status}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* EXTRA CLASS DETAILS */}

        {extraClassRecords.length > 0 && (
          <section
            style={{
              ...styles.card,
              border: "1px solid #f9a8d4",
            }}
          >
            <div style={styles.historyHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  ⭐ Extra Class Details
                </h2>

                <p style={styles.sectionSubtitle}>
                  Complete Extra Class attendance
                  uploaded by your teacher
                </p>
              </div>

              <span
                style={{
                  ...styles.extraBadge,
                  fontSize: "11px",
                  padding: "8px 12px",
                }}
              >
                {extraClassRecords.length} Records
              </span>
            </div>

            <div style={styles.extraCards}>
              {extraClassRecords.map((record) => (
                <article
                  key={`extra-detail-${record.id}`}
                  style={styles.extraCard}
                >
                  <div
                    style={
                      styles.extraCardHeader
                    }
                  >
                    <div>
                      <span
                        style={
                          styles.extraSmallLabel
                        }
                      >
                        ⭐ EXTRA CLASS
                      </span>

                      <h3
                        style={
                          styles.extraCardTitle
                        }
                      >
                        {record.subject ||
                          "Extra Class"}
                      </h3>
                    </div>

                    <span
                      style={{
                        ...styles.badge,
                        ...getStatusStyle(
                          record.status
                        ),
                      }}
                    >
                      {isPresent(
                        record.status
                      )
                        ? "✓ Present"
                        : isAbsent(
                            record.status
                          )
                        ? "✕ Absent"
                        : record.status}
                    </span>
                  </div>

                  <div
                    style={
                      styles.extraCardGrid
                    }
                  >
                    <div>
                      <span>DATE</span>
                      <strong>
                        {formatDate(
                          record.extra_class_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>DAY</span>
                      <strong>
                        {getDayName(
                          record.extra_class_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>TIME</span>
                      <strong>
                        {formatTime(
                          record.class_time
                        ) || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>TOPIC</span>
                      <strong>
                        {record.topic || "—"}
                      </strong>
                    </div>
                  </div>

                  {record.remarks && (
                    <div
                      style={
                        styles.remarksBox
                      }
                    >
                      <span>
                        REMARKS
                      </span>

                      <p>
                        {record.remarks}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>Attendance Portal</strong>

          <span>
            Student Attendance - 2026
          </span>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        body {
          min-width: 0;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 800px) {
          .attendance-page-table {
            min-width: 850px;
          }
        }

        @media (max-width: 600px) {
          .student-attendance-page {
            padding: 10px !important;
          }

          .student-attendance-header {
            padding: 16px !important;
          }

          .student-attendance-header
            h1 {
            font-size: 24px !important;
          }

          .student-card-mobile {
            padding: 17px !important;
          }

          .stats-grid-mobile {
            grid-template-columns: 1fr 1fr !important;
          }

          .attendance-card-mobile {
            padding: 16px !important;
          }

          .history-header-mobile {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .refresh-mobile {
            width: 100%;
          }

          .extra-header-mobile {
            align-items: flex-start !important;
          }
        }

        @media (max-width: 430px) {
          .student-attendance-page {
            padding: 7px !important;
          }

          .student-attendance-header
            > div:last-child {
            width: 100%;
            display: flex;
          }

          .student-attendance-header
            a,
          .student-attendance-header
            button {
            flex: 1;
          }

          .stats-grid-mobile {
            grid-template-columns: 1fr !important;
          }

          .extra-stats-mobile {
            grid-template-columns: 1fr !important;
          }

          .extra-card-grid-mobile {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    minWidth: 0,
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  smallTitle: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  headerButtons: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  backButton: {
    textDecoration: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "white",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    boxShadow:
      "0 12px 30px rgba(37,99,235,0.20)",
  },

  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    flexShrink: 0,
  },

  studentInfo: {
    minWidth: 0,
  },

  profileBadge: {
    display: "inline-block",
    background:
      "rgba(255,255,255,0.16)",
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.2px",
  },

  studentName: {
    margin: "7px 0 3px",
    fontSize: "25px",
    fontWeight: "800",
    overflowWrap: "anywhere",
  },

  username: {
    margin: 0,
    fontSize: "13px",
    opacity: 0.85,
    overflowWrap: "anywhere",
  },

  studentId: {
    margin: "5px 0 0",
    fontSize: "11px",
    opacity: 0.78,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "15px",
    marginBottom: "20px",
  },

  statCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    minWidth: 0,
  },

  statIcon: {
    width: "52px",
    height: "52px",
    minWidth: "52px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "800",
    color: "#1e3a8a",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  statValue: {
    margin: "4px 0 0",
    color: "#172554",
    fontSize: "25px",
    fontWeight: "800",
  },

  statSmall: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "9px",
    lineHeight: 1.4,
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    minWidth: 0,
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  extraHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  extraIcon: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "14px",
    background: "#fce7f3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  extraInfo: {
    flex: 1,
    minWidth: 0,
  },

  extraStatsGrid: {
    marginTop: "15px",
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: "10px",
  },

  extraStatBox: {
    background: "#fff7ed",
    borderRadius: "11px",
    padding: "12px",
    textAlign: "center",
    border: "1px solid #f9a8d4",
  },

  extraStatBoxLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "900",
  },

  extraEmpty: {
    marginTop: "15px",
    padding: "15px",
    background: "rgba(255,255,255,0.75)",
    borderRadius: "12px",
    border: "1px dashed #f9a8d4",
    color: "#9d174d",
    textAlign: "center",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
  },

  progressBackground: {
    width: "100%",
    height: "15px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.4s ease",
  },

  progressMessage: {
    marginTop: "13px",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },

  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },

  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "13px",
    textAlign: "left",
    borderBottom: "2px solid #dbeafe",
    fontSize: "13px",
  },

  td: {
    padding: "14px 13px",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
    verticalAlign: "top",
  },

  extraRow: {
    background:
      "linear-gradient(90deg,#fff7ed,#ffffff)",
  },

  regularBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  extraBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#fce7f3",
    color: "#9d174d",
    border: "1px solid #f9a8d4",
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  details: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
  },

  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  extraCards: {
    marginTop: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  extraCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#fdf2f8)",
    border: "1px solid #f9a8d4",
    borderRadius: "15px",
    padding: "15px",
  },

  extraCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  extraSmallLabel: {
    display: "block",
    color: "#db2777",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  extraCardTitle: {
    margin: "4px 0 0",
    color: "#9d174d",
    fontSize: "16px",
  },

  extraCardGrid: {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,1fr)",
    gap: "8px",
  },

  remarksBox: {
    marginTop: "10px",
    padding: "10px",
    background: "rgba(255,255,255,0.85)",
    borderRadius: "10px",
    border: "1px solid #f9a8d4",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "13px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
    overflowWrap: "anywhere",
  },

  errorText: {
    marginTop: "5px",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  empty: {
    textAlign: "center",
    padding: "45px 20px",
  },

  emptyIcon: {
    fontSize: "45px",
    fontWeight: "800",
    color: "#64748b",
  },

  emptyTitle: {
    margin: "10px 0 5px",
    color: "#172554",
    fontSize: "19px",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  loading: {
    background: "white",
    maxWidth: "400px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
  },

  footer: {
    padding: "20px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },
};