"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
  admission_date: string | null;
};

type AttendanceTab =
  | "today"
  | "date-wise"
  | "extra-class"
  | "reporting"
  | "month-wise";

type MonthlyReport = {
  key: string;
  label: string;
  monthName: string;
  year: number;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  regularTotal: number;
  regularPresent: number;
  regularAbsent: number;
  extraTotal: number;
  extraPresent: number;
  extraAbsent: number;
};

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [extraClassRecords, setExtraClassRecords] = useState<
    ExtraClassAttendanceRecord[]
  >([]);

  const [activeTab, setActiveTab] =
    useState<AttendanceTab>("today");

  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString()
  );

  const [selectedMonth, setSelectedMonth] = useState(
    getLocalMonthString()
  );

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
      .select(
        "id, student_name, student_username, admission_date"
      )
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
      .select(
        "id, student_name, student_username, admission_date"
      )
      .ilike("student_username", cleanUsername)
      .limit(1);

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message);
    }

    if (fallbackResult.data?.length) {
      return fallbackResult.data[0] as Student;
    }

    return null;
  }

  async function loadAttendance() {
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

      if (extraClassAttendanceResult.error) {
        throw new Error(
          "Extra Class Attendance could not be loaded: " +
            extraClassAttendanceResult.error.message
        );
      }

      setRecords(
        (regularAttendanceResult.data ||
          []) as AttendanceRecord[]
      );

      setExtraClassRecords(
        (extraClassAttendanceResult.data ||
          []) as ExtraClassAttendanceRecord[]
      );

      if (studentData.admission_date) {
        const admissionMonth =
          studentData.admission_date.slice(0, 7);

        const currentMonth =
          getLocalMonthString();

        setSelectedMonth(
          admissionMonth <= currentMonth
            ? currentMonth
            : admissionMonth
        );
      }
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

    return [...regularRecords, ...extraRecords].sort(
      (a, b) => {
        const dateCompare =
          String(b.attendance_date).localeCompare(
            String(a.attendance_date)
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

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
      }
    );
  }, [records, extraClassRecords]);

  const totalClasses = unifiedAttendance.length;

  const present = unifiedAttendance.filter((record) =>
    isPresent(record.status)
  ).length;

  const absent = unifiedAttendance.filter((record) =>
    isAbsent(record.status)
  ).length;

  const percentage =
    totalClasses > 0
      ? Math.round((present / totalClasses) * 100)
      : 0;

  const regularPresent = records.filter((record) =>
    isPresent(record.status)
  ).length;

  const regularAbsent = records.filter((record) =>
    isAbsent(record.status)
  ).length;

  const extraPresent = extraClassRecords.filter((record) =>
    isPresent(record.status)
  ).length;

  const extraAbsent = extraClassRecords.filter((record) =>
    isAbsent(record.status)
  ).length;

  const extraPercentage =
    extraClassRecords.length > 0
      ? Math.round(
          (extraPresent / extraClassRecords.length) * 100
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * ADMISSION-DATE BASED ATTENDANCE
   * ---------------------------------------------------------
   */

  const admissionDate =
    student?.admission_date || null;

  const currentMonth =
    getLocalMonthString();

  const reportingRecords = useMemo(() => {
    if (!admissionDate) {
      return unifiedAttendance;
    }

    return unifiedAttendance.filter(
      (record) =>
        record.attendance_date >= admissionDate
    );
  }, [unifiedAttendance, admissionDate]);

  const monthlyReports = useMemo<MonthlyReport[]>(() => {
    if (!admissionDate) {
      return [];
    }

    const admissionMonth =
      admissionDate.slice(0, 7);

    const reports: MonthlyReport[] = [];

    let cursor = admissionMonth;

    while (cursor <= currentMonth) {
      const [yearString, monthString] =
        cursor.split("-");

      const year = Number(yearString);
      const month = Number(monthString);

      const monthStart =
        `${yearString}-${monthString}-01`;

      const lastDay = new Date(
        year,
        month,
        0
      ).getDate();

      const monthEnd =
        `${yearString}-${monthString}-${String(
          lastDay
        ).padStart(2, "0")}`;

      const monthRecords =
        reportingRecords.filter(
          (record) =>
            record.attendance_date >=
              monthStart &&
            record.attendance_date <= monthEnd
        );

      const regularMonthRecords =
        monthRecords.filter(
          (record) =>
            record.attendance_type ===
            "regular"
        );

      const extraMonthRecords =
        monthRecords.filter(
          (record) =>
            record.attendance_type ===
            "extra"
        );

      const monthPresent =
        monthRecords.filter((record) =>
          isPresent(record.status)
        ).length;

      const monthAbsent =
        monthRecords.filter((record) =>
          isAbsent(record.status)
        ).length;

      reports.push({
        key: cursor,
        label: new Date(
          year,
          month - 1,
          1
        ).toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        monthName: new Date(
          year,
          month - 1,
          1
        ).toLocaleDateString("en-IN", {
          month: "long",
        }),
        year,
        total: monthRecords.length,
        present: monthPresent,
        absent: monthAbsent,
        percentage:
          monthRecords.length > 0
            ? Math.round(
                (monthPresent /
                  monthRecords.length) *
                  100
              )
            : 0,
        regularTotal:
          regularMonthRecords.length,
        regularPresent:
          regularMonthRecords.filter(
            (record) =>
              isPresent(record.status)
          ).length,
        regularAbsent:
          regularMonthRecords.filter(
            (record) =>
              isAbsent(record.status)
          ).length,
        extraTotal:
          extraMonthRecords.length,
        extraPresent:
          extraMonthRecords.filter(
            (record) =>
              isPresent(record.status)
          ).length,
        extraAbsent:
          extraMonthRecords.filter(
            (record) =>
              isAbsent(record.status)
          ).length,
      });

      cursor = getNextMonth(cursor);
    }

    return reports;
  }, [
    admissionDate,
    currentMonth,
    reportingRecords,
  ]);

  /*
   * ---------------------------------------------------------
   * MONTH-WISE DATA
   * ---------------------------------------------------------
   */

  const selectedMonthRecords =
    unifiedAttendance.filter(
      (record) =>
        record.attendance_date.slice(0, 7) ===
        selectedMonth
    );

  const selectedMonthPresent =
    selectedMonthRecords.filter((record) =>
      isPresent(record.status)
    ).length;

  const selectedMonthAbsent =
    selectedMonthRecords.filter((record) =>
      isAbsent(record.status)
    ).length;

  const selectedMonthPercentage =
    selectedMonthRecords.length > 0
      ? Math.round(
          (selectedMonthPresent /
            selectedMonthRecords.length) *
            100
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * TODAY
   * ---------------------------------------------------------
   */

  const todayRecords =
    unifiedAttendance.filter(
      (record) =>
        record.attendance_date === selectedDate
    );

  const todayPresent =
    todayRecords.filter((record) =>
      isPresent(record.status)
    ).length;

  const todayAbsent =
    todayRecords.filter((record) =>
      isAbsent(record.status)
    ).length;

  /*
   * ---------------------------------------------------------
   * STATUS HELPERS
   * ---------------------------------------------------------
   */

  function getStatusStyle(
    status: string
  ): CSSProperties {
    if (isPresent(status)) {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #bbf7d0",
      };
    }

    if (isAbsent(status)) {
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  /*
   * ---------------------------------------------------------
   * DATE HELPERS
   * ---------------------------------------------------------
   */

  function formatDate(date: string) {
    const d = new Date(
      `${date}T00:00:00`
    );

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

    const suffix =
      hour >= 12 ? "PM" : "AM";

    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  function getDayName(date: string) {
    const d = new Date(
      `${date}T00:00:00`
    );

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
      "studentName",
      "student_name",
      "studentId",
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.href = "/";
  }

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  const tabs: {
    id: AttendanceTab;
    title: string;
    subtitle: string;
    icon: string;
  }[] = [
    {
      id: "today",
      title: "Today's Attendance",
      subtitle: "Today's attendance",
      icon: "01",
    },
    {
      id: "date-wise",
      title: "Date Wise / Period Wise",
      subtitle: "View attendance by date",
      icon: "02",
    },
    {
      id: "extra-class",
      title: "Extra Class",
      subtitle: "Additional classes",
      icon: "03",
    },
    {
      id: "reporting",
      title: "Reporting",
      subtitle: "Admission-date report",
      icon: "04",
    },
    {
      id: "month-wise",
      title: "Month Wise Attendance",
      subtitle: "Monthly attendance",
      icon: "05",
    },
  ];

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}>
            RA
          </div>
          <strong>
            Loading Attendance...
          </strong>
          <span>
            Please wait while we fetch your
            attendance.
          </span>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <header className="attendance-header" style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.smallTitle}>
              RACER ACADEMY
            </div>

            <h1 style={styles.title}>
              Attendance Center
            </h1>

            <p style={styles.subtitle}>
              Complete attendance record and monthly reports
            </p>
          </div>

          <div className="header-buttons" style={styles.headerButtons}>
            <Link
              href="/student/dashboard"
              style={styles.backButton}
            >
              Dashboard
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

        {/* STUDENT PROFILE */}

        <section
          className="student-profile"
          style={styles.studentCard}
        >
          <div style={styles.avatar}>
            {getInitials(
              student?.student_name ||
                student?.student_username ||
                "Student"
            )}
          </div>

          <div style={styles.studentInfo}>
            <span style={styles.profileBadge}>
              STUDENT ATTENDANCE
            </span>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username ||
                "Student"}
            </h2>

            <div className="student-meta" style={styles.studentMeta}>
              <span>
                Username:{" "}
                {student?.student_username || "—"}
              </span>

              <span>
                Student ID:{" "}
                {student?.id ?? "—"}
              </span>

              <span>
                Admission:{" "}
                {student?.admission_date
                  ? formatDate(
                      student.admission_date
                    )
                  : "Not available"}
              </span>
            </div>
          </div>

          <div className="profile-percentage" style={styles.profilePercentage}>
            <span>OVERALL</span>
            <strong>{percentage}%</strong>
            <small>
              {present} Present
            </small>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            <strong>
              Attendance Error
            </strong>
            <div style={styles.errorText}>
              {error}
            </div>
          </div>
        )}

        {/* TOP SUMMARY */}

        <section className="stats-grid" style={styles.statsGrid}>
          <StatCard
            label="Total Classes"
            value={totalClasses}
            detail={`Regular ${records.length} + Extra ${extraClassRecords.length}`}
            icon="TC"
          />

          <StatCard
            label="Present"
            value={present}
            detail={`Regular ${regularPresent} + Extra ${extraPresent}`}
            icon="P"
            tone="green"
          />

          <StatCard
            label="Absent"
            value={absent}
            detail={`Regular ${regularAbsent} + Extra ${extraAbsent}`}
            icon="A"
            tone="red"
          />

          <StatCard
            label="Attendance"
            value={`${percentage}%`}
            detail="Regular + Extra Classes"
            icon="%"
            tone={
              percentage >= 75
                ? "green"
                : "red"
            }
          />
        </section>

        {/* FIVE ATTENDANCE SECTIONS */}

        <section style={styles.navigationCard}>
          <div style={styles.navigationHeading}>
            <div>
              <div style={styles.sectionEyebrow}>
                ATTENDANCE MENU
              </div>

              <h2 style={styles.navigationTitle}>
                Attendance Sections
              </h2>

              <p style={styles.sectionSubtitle}>
                Select a section to view your attendance.
              </p>
            </div>
          </div>

          <div className="attendance-tabs" style={styles.tabsGrid}>
            {tabs.map((tab) => {
              const active =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`attendance-tab ${
                    active ? "active" : ""
                  }`}
                  style={{
                    ...styles.tabButton,
                    ...(active
                      ? styles.activeTabButton
                      : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.tabNumber,
                      ...(active
                        ? styles.activeTabNumber
                        : {}),
                    }}
                  >
                    {tab.icon}
                  </span>

                  <span style={styles.tabText}>
                    <strong>
                      {tab.title}
                    </strong>

                    <small>
                      {tab.subtitle}
                    </small>
                  </span>

                  <span
                    style={styles.tabArrow}
                  >
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            TODAY'S ATTENDANCE
        ====================================================== */}

        {activeTab === "today" && (
          <section style={styles.contentCard}>
            <SectionHeader
              eyebrow="01 • TODAY"
              title="Today's Attendance"
              subtitle="Check your attendance for any selected day."
              action={
                <button
                  type="button"
                  onClick={() =>
                    void loadAttendance()
                  }
                  style={styles.refreshButton}
                  disabled={refreshing}
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              }
            />

            <div className="date-control" style={styles.dateControl}>
              <div>
                <label style={styles.inputLabel}>
                  Select Date
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value
                    )
                  }
                  style={styles.dateInput}
                />
              </div>

              <div style={styles.todaySummary}>
                <div>
                  <span>RECORDS</span>
                  <strong>
                    {todayRecords.length}
                  </strong>
                </div>

                <div>
                  <span>PRESENT</span>
                  <strong
                    style={{
                      color: "#16a34a",
                    }}
                  >
                    {todayPresent}
                  </strong>
                </div>

                <div>
                  <span>ABSENT</span>
                  <strong
                    style={{
                      color: "#dc2626",
                    }}
                  >
                    {todayAbsent}
                  </strong>
                </div>
              </div>
            </div>

            <AttendanceRecordList
              records={todayRecords}
              formatDate={formatDate}
              formatTime={formatTime}
              getDayName={getDayName}
              getStatusStyle={getStatusStyle}
              isPresent={isPresent}
              isAbsent={isAbsent}
              emptyTitle="No Attendance Marked"
              emptyText="No regular or extra-class attendance record was found for this date."
            />
          </section>
        )}

        {/* =====================================================
            DATE WISE / PERIOD WISE
        ====================================================== */}

        {activeTab === "date-wise" && (
          <section style={styles.contentCard}>
            <SectionHeader
              eyebrow="02 • DATE WISE"
              title="Date Wise / Period Wise"
              subtitle="View the attendance record for a specific date."
              action={
                <button
                  type="button"
                  onClick={() =>
                    void loadAttendance()
                  }
                  style={styles.refreshButton}
                  disabled={refreshing}
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              }
            />

            <div style={styles.filterBar}>
              <div>
                <label style={styles.inputLabel}>
                  Attendance Date
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value
                    )
                  }
                  style={styles.dateInput}
                />
              </div>

              <div style={styles.selectedDateInfo}>
                <span>
                  SELECTED DATE
                </span>

                <strong>
                  {formatDate(selectedDate)}
                </strong>

                <small>
                  {getDayName(selectedDate)}
                </small>
              </div>
            </div>

            <AttendanceRecordList
              records={todayRecords}
              formatDate={formatDate}
              formatTime={formatTime}
              getDayName={getDayName}
              getStatusStyle={getStatusStyle}
              isPresent={isPresent}
              isAbsent={isAbsent}
              emptyTitle="No Record for This Date"
              emptyText="Attendance for the selected date has not been recorded."
            />

            <div style={styles.noteBox}>
              <strong>
                Period Wise
              </strong>

              <span>
                This portal currently stores attendance by date. No period or subject
                information is invented when it is not available in the database.
              </span>
            </div>
          </section>
        )}

        {/* =====================================================
            EXTRA CLASS
        ====================================================== */}

        {activeTab === "extra-class" && (
          <section style={styles.contentCard}>
            <SectionHeader
              eyebrow="03 • EXTRA CLASS"
              title="Extra Class Attendance"
              subtitle="Additional classes marked by your teacher."
              action={
                <button
                  type="button"
                  onClick={() =>
                    void loadAttendance()
                  }
                  style={styles.refreshButton}
                  disabled={refreshing}
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              }
            />

            <div
              className="extra-summary-grid"
              style={styles.extraSummaryGrid}
            >
              <MiniMetric
                label="Extra Classes"
                value={
                  extraClassRecords.length
                }
              />

              <MiniMetric
                label="Present"
                value={extraPresent}
                color="#16a34a"
              />

              <MiniMetric
                label="Absent"
                value={extraAbsent}
                color="#dc2626"
              />

              <MiniMetric
                label="Attendance"
                value={`${extraPercentage}%`}
                color="#db2777"
              />
            </div>

            {extraClassRecords.length === 0 ? (
              <EmptyState
                icon="03"
                title="No Extra Class Attendance"
                text="Extra Class attendance will appear here after your teacher marks it."
              />
            ) : (
              <div style={styles.extraCards}>
                {extraClassRecords.map(
                  (record) => (
                    <article
                      key={record.id}
                      style={styles.extraCard}
                    >
                      <div
                        className="extra-card-header"
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
                            EXTRA CLASS
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
                            ? "Present"
                            : isAbsent(
                                record.status
                              )
                            ? "Absent"
                            : record.status}
                        </span>
                      </div>

                      <div
                        className="extra-detail-grid"
                        style={
                          styles.extraDetailGrid
                        }
                      >
                        <InfoItem
                          label="DATE"
                          value={formatDate(
                            record.extra_class_date
                          )}
                        />

                        <InfoItem
                          label="DAY"
                          value={getDayName(
                            record.extra_class_date
                          )}
                        />

                        <InfoItem
                          label="TIME"
                          value={
                            formatTime(
                              record.class_time
                            ) || "—"
                          }
                        />

                        <InfoItem
                          label="TOPIC"
                          value={
                            record.topic || "—"
                          }
                        />
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
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* =====================================================
            REPORTING
        ====================================================== */}

        {activeTab === "reporting" && (
          <section style={styles.contentCard}>
            <SectionHeader
              eyebrow="04 • REPORTING"
              title="Attendance Reporting"
              subtitle="Monthly reporting starts from your admission date."
            />

            <div style={styles.admissionBanner}>
              <div style={styles.admissionIcon}>
                AD
              </div>

              <div>
                <span>
                  REPORTING START DATE
                </span>

                <strong>
                  {admissionDate
                    ? formatDate(
                        admissionDate
                      )
                    : "Admission date not available"}
                </strong>

                <small>
                  Only attendance from the admission date onward is included.
                </small>
              </div>
            </div>

            {monthlyReports.length === 0 ? (
              <EmptyState
                icon="04"
                title="Reporting Not Available"
                text="Admission date is required to generate the monthly attendance report."
              />
            ) : (
              <>
                <div
                  className="report-summary-grid"
                  style={styles.reportSummaryGrid}
                >
                  <MiniMetric
                    label="Months"
                    value={monthlyReports.length}
                  />

                  <MiniMetric
                    label="Total Classes"
                    value={reportingRecords.length}
                  />

                  <MiniMetric
                    label="Present"
                    value={
                      reportingRecords.filter(
                        (record) =>
                          isPresent(
                            record.status
                          )
                      ).length
                    }
                    color="#16a34a"
                  />

                  <MiniMetric
                    label="Absent"
                    value={
                      reportingRecords.filter(
                        (record) =>
                          isAbsent(
                            record.status
                          )
                      ).length
                    }
                    color="#dc2626"
                  />
                </div>

                <div style={styles.reportList}>
                  {monthlyReports.map(
                    (report) => (
                      <article
                        key={report.key}
                        className="report-month-card"
                        style={
                          styles.reportMonthCard
                        }
                      >
                        <div
                          className="report-month-header"
                          style={
                            styles.reportMonthHeader
                          }
                        >
                          <div>
                            <span
                              style={
                                styles.monthNumber
                              }
                            >
                              {String(
                                new Date(
                                  `${report.key}-01`
                                ).getMonth() + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            <div>
                              <h3
                                style={
                                  styles.reportMonthTitle
                                }
                              >
                                {report.label}
                              </h3>

                              <small
                                style={
                                  styles.reportMonthSub
                                }
                              >
                                Reporting from admission date
                              </small>
                            </div>
                          </div>

                          <div
                            style={{
                              ...styles.reportPercentage,
                              color:
                                report.percentage >=
                                75
                                  ? "#16a34a"
                                  : "#dc2626",
                            }}
                          >
                            {report.percentage}%
                          </div>
                        </div>

                        <div
                          className="report-stats"
                          style={
                            styles.reportStats
                          }
                        >
                          <ReportMetric
                            label="TOTAL"
                            value={report.total}
                          />

                          <ReportMetric
                            label="PRESENT"
                            value={
                              report.present
                            }
                            color="#16a34a"
                          />

                          <ReportMetric
                            label="ABSENT"
                            value={
                              report.absent
                            }
                            color="#dc2626"
                          />

                          <ReportMetric
                            label="REGULAR"
                            value={
                              report.regularTotal
                            }
                          />

                          <ReportMetric
                            label="EXTRA"
                            value={
                              report.extraTotal
                            }
                            color="#db2777"
                          />
                        </div>

                        <div
                          style={
                            styles.reportProgressBackground
                          }
                        >
                          <div
                            style={{
                              ...styles.reportProgressBar,
                              width: `${Math.min(
                                report.percentage,
                                100
                              )}%`,
                              background:
                                report.percentage >=
                                75
                                  ? "#16a34a"
                                  : "#dc2626",
                            }}
                          />
                        </div>
                      </article>
                    )
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* =====================================================
            MONTH WISE
        ====================================================== */}

        {activeTab === "month-wise" && (
          <section style={styles.contentCard}>
            <SectionHeader
              eyebrow="05 • MONTH WISE"
              title="Month Wise Attendance"
              subtitle="Detailed attendance records for the selected month."
              action={
                <button
                  type="button"
                  onClick={() =>
                    void loadAttendance()
                  }
                  style={styles.refreshButton}
                  disabled={refreshing}
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              }
            />

            <div style={styles.filterBar}>
              <div>
                <label style={styles.inputLabel}>
                  Select Month
                </label>

                <input
                  type="month"
                  value={selectedMonth}
                  min={
                    admissionDate
                      ? admissionDate.slice(
                          0,
                          7
                        )
                      : undefined
                  }
                  max={currentMonth}
                  onChange={(event) =>
                    setSelectedMonth(
                      event.target.value
                    )
                  }
                  style={styles.dateInput}
                />
              </div>

              <div style={styles.selectedDateInfo}>
                <span>
                  SELECTED MONTH
                </span>

                <strong>
                  {formatMonth(
                    selectedMonth
                  )}
                </strong>

                <small>
                  {selectedMonthRecords.length} attendance records
                </small>
              </div>
            </div>

            <div
              className="month-summary-grid"
              style={styles.monthSummaryGrid}
            >
              <MiniMetric
                label="Total"
                value={
                  selectedMonthRecords.length
                }
              />

              <MiniMetric
                label="Present"
                value={selectedMonthPresent}
                color="#16a34a"
              />

              <MiniMetric
                label="Absent"
                value={selectedMonthAbsent}
                color="#dc2626"
              />

              <MiniMetric
                label="Attendance"
                value={`${selectedMonthPercentage}%`}
                color={
                  selectedMonthPercentage >=
                  75
                    ? "#16a34a"
                    : "#dc2626"
                }
              />
            </div>

            <AttendanceRecordList
              records={selectedMonthRecords}
              formatDate={formatDate}
              formatTime={formatTime}
              getDayName={getDayName}
              getStatusStyle={getStatusStyle}
              isPresent={isPresent}
              isAbsent={isAbsent}
              emptyTitle="No Attendance for This Month"
              emptyText="No attendance record was found for the selected month."
            />
          </section>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            RACER ACADEMY
          </strong>

          <span>
            Student Attendance Portal
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

        .attendance-tab {
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .attendance-tab:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 20px rgba(15, 23, 42, 0.08);
        }

        .attendance-tab.active {
          transform: translateY(-1px);
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .attendance-tabs {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .extra-detail-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .report-stats {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            ) !important;
          }
        }

        @media (max-width: 650px) {
          .attendance-header {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .header-buttons {
            width: 100%;
          }

          .header-buttons a,
          .header-buttons button {
            flex: 1;
          }

          .student-profile {
            align-items: flex-start !important;
            flex-wrap: wrap;
          }

          .profile-percentage {
            width: 100%;
            margin-left: 0 !important;
          }

          .student-meta {
            flex-direction: column !important;
            gap: 4px !important;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .attendance-tabs {
            grid-template-columns: 1fr !important;
          }

          .date-control {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .today-summary {
            width: 100%;
          }

          .filter-bar {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .selected-date-info {
            width: 100%;
          }

          .extra-summary-grid,
          .report-summary-grid,
          .month-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .report-month-header {
            align-items: flex-start !important;
          }

          .report-stats {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .extra-card-header {
            flex-direction: column !important;
          }
        }

        @media (max-width: 430px) {
          .student-attendance-page {
            padding: 8px !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .extra-summary-grid,
          .report-summary-grid,
          .month-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .extra-detail-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .report-stats {
            grid-template-columns: 1fr 1fr !important;
          }

          .attendance-header {
            padding: 16px !important;
          }

          .student-profile {
            padding: 17px !important;
          }

          .content-card-mobile {
            padding: 16px !important;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone?: "blue" | "green" | "red";
}) {
  const toneStyles = {
    blue: {
      background: "#eff6ff",
      color: "#1d4ed8",
      value: "#172554",
    },
    green: {
      background: "#dcfce7",
      color: "#166534",
      value: "#15803d",
    },
    red: {
      background: "#fee2e2",
      color: "#991b1b",
      value: "#dc2626",
    },
  };

  const current = toneStyles[tone];

  return (
    <div style={styles.statCard}>
      <div
        style={{
          ...styles.statIcon,
          background: current.background,
          color: current.color,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <p style={styles.statLabel}>
          {label}
        </p>

        <h2
          style={{
            ...styles.statValue,
            color: current.value,
          }}
        >
          {value}
        </h2>

        <small style={styles.statSmall}>
          {detail}
        </small>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="section-header"
      style={styles.sectionHeader}
    >
      <div>
        <div style={styles.sectionEyebrow}>
          {eyebrow}
        </div>

        <h2 style={styles.sectionTitle}>
          {title}
        </h2>

        <p style={styles.sectionSubtitle}>
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  color = "#172554",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={styles.miniMetric}>
      <span>{label}</span>
      <strong style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

function ReportMetric({
  label,
  value,
  color = "#172554",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div style={styles.reportMetric}>
      <span>{label}</span>
      <strong style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.infoItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        {icon}
      </div>

      <h3 style={styles.emptyTitle}>
        {title}
      </h3>

      <p style={styles.emptyText}>
        {text}
      </p>
    </div>
  );
}

function AttendanceRecordList({
  records,
  formatDate,
  formatTime,
  getDayName,
  getStatusStyle,
  isPresent,
  isAbsent,
  emptyTitle,
  emptyText,
}: {
  records: UnifiedAttendanceRecord[];
  formatDate: (date: string) => string;
  formatTime: (time: string | null) => string;
  getDayName: (date: string) => string;
  getStatusStyle: (
    status: string
  ) => CSSProperties;
  isPresent: (status: string) => boolean;
  isAbsent: (status: string) => boolean;
  emptyTitle: string;
  emptyText: string;
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon="—"
        title={emptyTitle}
        text={emptyText}
      />
    );
  }

  return (
    <div style={styles.recordList}>
      {records.map((record, index) => {
        const isExtra =
          record.attendance_type ===
          "extra";

        return (
          <article
            key={record.id}
            className={
              isExtra
                ? "attendance-record extra-record"
                : "attendance-record"
            }
            style={{
              ...styles.recordCard,
              ...(isExtra
                ? styles.extraRecordCard
                : {}),
            }}
          >
            <div style={styles.recordNumber}>
              {String(index + 1).padStart(
                2,
                "0"
              )}
            </div>

            <div style={styles.recordMain}>
              <div style={styles.recordTop}>
                <div>
                  <strong
                    style={
                      styles.recordDate
                    }
                  >
                    {formatDate(
                      record.attendance_date
                    )}
                  </strong>

                  <span
                    style={
                      styles.recordDay
                    }
                  >
                    {getDayName(
                      record.attendance_date
                    )}
                  </span>
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
                  ) && "✓ "}
                  {isAbsent(
                    record.status
                  ) && "✕ "}
                  {record.status}
                </span>
              </div>

              <div style={styles.recordDetails}>
                <span
                  style={
                    isExtra
                      ? styles.extraBadge
                      : styles.regularBadge
                  }
                >
                  {isExtra
                    ? "EXTRA CLASS"
                    : "REGULAR CLASS"}
                </span>

                {isExtra && (
                  <>
                    {record.subject && (
                      <span>
                        Subject:{" "}
                        {record.subject}
                      </span>
                    )}

                    {record.topic && (
                      <span>
                        Topic:{" "}
                        {record.topic}
                      </span>
                    )}

                    {record.class_time && (
                      <span>
                        Time:{" "}
                        {formatTime(
                          record.class_time
                        )}
                      </span>
                    )}

                    {record.remarks && (
                      <span>
                        Remark:{" "}
                        {record.remarks}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function isPresent(status: string): boolean {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  return (
    value === "PRESENT" ||
    value === "P"
  );
}

function isAbsent(status: string): boolean {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  return (
    value === "ABSENT" ||
    value === "A"
  );
}

function getLocalDateString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalMonthString() {
  return getLocalDateString().slice(
    0,
    7
  );
}

function getNextMonth(monthKey: string) {
  const [year, month] =
    monthKey.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    1
  );

  date.setMonth(
    date.getMonth() + 1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonth(monthKey: string) {
  if (!monthKey) {
    return "—";
  }

  const [year, month] =
    monthKey.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getInitials(name: string) {
  const clean = name.trim();

  if (!clean) {
    return "ST";
  }

  const parts = clean.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

/* =========================================================
   STYLES
========================================================= */

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg,#eff6ff 0%,#f8fafc 48%,#eef2ff 100%)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    minWidth: 0,
  },

  header: {
    background:
      "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "22px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "18px",
    boxShadow:
      "0 12px 35px rgba(15,23,42,0.08)",
  },

  headerLeft: {
    minWidth: 0,
  },

  smallTitle: {
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "30px",
    fontWeight: "900",
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  headerButtons: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
  },

  backButton: {
    textDecoration: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 17px",
    borderRadius: "11px",
    fontWeight: "800",
    fontSize: "13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 17px",
    borderRadius: "11px",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#172554 0%,#1d4ed8 55%,#4f46e5 100%)",
    color: "white",
    borderRadius: "22px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "18px",
    boxShadow:
      "0 16px 35px rgba(30,64,175,0.22)",
    minWidth: 0,
  },

  avatar: {
    width: "70px",
    height: "70px",
    minWidth: "70px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.15)",
    border:
      "1px solid rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    fontWeight: "900",
  },

  studentInfo: {
    flex: 1,
    minWidth: 0,
  },

  profileBadge: {
    display: "inline-block",
    background:
      "rgba(255,255,255,0.13)",
    border:
      "1px solid rgba(255,255,255,0.15)",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1.3px",
  },

  studentName: {
    margin: "7px 0 6px",
    fontSize: "25px",
    fontWeight: "900",
    overflowWrap: "anywhere",
  },

  studentMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px 15px",
    fontSize: "11px",
    opacity: 0.82,
  },

  profilePercentage: {
    minWidth: "110px",
    marginLeft: "auto",
    padding:
      "13px 15px",
    borderRadius: "15px",
    background:
      "rgba(255,255,255,0.11)",
    textAlign: "center",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "13px",
    marginBottom: "18px",
  },

  statCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.055)",
    minWidth: 0,
  },

  statIcon: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: "900",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "800",
  },

  statValue: {
    margin: "3px 0 0",
    fontSize: "24px",
    fontWeight: "900",
  },

  statSmall: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "8px",
    lineHeight: 1.4,
  },

  navigationCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
  },

  navigationHeading: {
    marginBottom: "15px",
  },

  navigationTitle: {
    margin: "2px 0 0",
    color: "#172554",
    fontSize: "21px",
    fontWeight: "900",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.5px",
  },

  tabsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
    gap: "10px",
  },

  tabButton: {
    border:
      "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "15px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    textAlign: "left",
    cursor: "pointer",
    minWidth: 0,
  },

  activeTabButton: {
    border:
      "1px solid #2563eb",
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    boxShadow:
      "0 7px 18px rgba(37,99,235,0.12)",
  },

  tabNumber: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "10px",
    background: "#e2e8f0",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "900",
  },

  activeTabNumber: {
    background: "#2563eb",
    color: "white",
  },

  tabText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flex: 1,
  },

  tabArrow: {
    color: "#94a3b8",
    fontSize: "16px",
    fontWeight: "900",
  },

  contentCard: {
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    minWidth: 0,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: "3px 0 0",
    color: "#172554",
    fontSize: "22px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
  },

  dateControl: {
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "14px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
  },

  filterBar: {
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "14px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
  },

  inputLabel: {
    display: "block",
    color: "#475569",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "6px",
  },

  dateInput: {
    height: "42px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#172554",
    padding: "0 12px",
    outline: "none",
    fontWeight: "700",
  },

  todaySummary: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  todaySummaryItem: {},

  selectedDateInfo: {
    minWidth: "190px",
    background: "white",
    border:
      "1px solid #e2e8f0",
    borderRadius: "11px",
    padding: "9px 12px",
  },

  noteBox: {
    marginTop: "18px",
    padding: "13px 15px",
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "12px",
    color: "#1e3a8a",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  recordList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  recordCard: {
    display: "flex",
    gap: "12px",
    padding: "14px",
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
  },

  extraRecordCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#fdf2f8)",
    border:
      "1px solid #f9a8d4",
  },

  recordNumber: {
    width: "32px",
    height: "32px",
    minWidth: "32px",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "900",
  },

  recordMain: {
    flex: 1,
    minWidth: 0,
  },

  recordTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  recordDate: {
    display: "block",
    color: "#172554",
    fontSize: "14px",
  },

  recordDay: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
  },

  recordDetails: {
    marginTop: "9px",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
    color: "#64748b",
    fontSize: "10px",
  },

  regularBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#eff6ff",
    color: "#2563eb",
    border:
      "1px solid #bfdbfe",
    padding: "4px 7px",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: "900",
  },

  extraBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#fce7f3",
    color: "#9d174d",
    border:
      "1px solid #f9a8d4",
    padding: "4px 7px",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: "900",
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  extraSummaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "10px",
    marginBottom: "18px",
  },

  miniMetric: {
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "13px",
    textAlign: "center",
  },

  extraCards: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  extraCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#fdf2f8)",
    border:
      "1px solid #f9a8d4",
    borderRadius: "16px",
    padding: "16px",
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
    fontSize: "17px",
    fontWeight: "900",
  },

  extraDetailGrid: {
    marginTop: "13px",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "8px",
  },

  infoItem: {
    background:
      "rgba(255,255,255,0.75)",
    border:
      "1px solid rgba(249,168,212,0.55)",
    borderRadius: "10px",
    padding: "10px",
    minWidth: 0,
  },

  remarksBox: {
    marginTop: "10px",
    padding: "10px",
    background:
      "rgba(255,255,255,0.85)",
    borderRadius: "10px",
    border:
      "1px solid #f9a8d4",
  },

  reportSummaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "10px",
    marginBottom: "18px",
  },

  admissionBanner: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "15px",
    marginBottom: "18px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border:
      "1px solid #bfdbfe",
  },

  admissionIcon: {
    width: "45px",
    height: "45px",
    minWidth: "45px",
    borderRadius: "13px",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "900",
  },

  reportList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  reportMonthCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
    background: "#ffffff",
  },

  reportMonthHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  monthNumber: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "900",
  },

  reportMonthTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "16px",
    fontWeight: "900",
  },

  reportMonthSub: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "9px",
  },

  reportPercentage: {
    fontSize: "23px",
    fontWeight: "900",
  },

  reportStats: {
    marginTop: "13px",
    display: "grid",
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
    gap: "7px",
  },

  reportMetric: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "9px",
    textAlign: "center",
  },

  reportProgressBackground: {
    marginTop: "12px",
    height: "8px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  reportProgressBar: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },

  monthSummaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "10px",
    marginBottom: "18px",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "13px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
    fontWeight: "700",
    overflowWrap: "anywhere",
  },

  errorText: {
    marginTop: "5px",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  empty: {
    textAlign: "center",
    padding: "42px 20px",
  },

  emptyIcon: {
    width: "50px",
    height: "50px",
    margin: "0 auto",
    borderRadius: "15px",
    background: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "900",
  },

  emptyTitle: {
    margin: "10px 0 5px",
    color: "#172554",
    fontSize: "18px",
  },

  emptyText: {
    maxWidth: "550px",
    margin: "0 auto",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  loading: {
    background: "white",
    maxWidth: "380px",
    margin: "100px auto",
    padding: "38px",
    borderRadius: "22px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "9px",
    boxShadow:
      "0 12px 35px rgba(15,23,42,0.08)",
  },

  loadingIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "17px",
    background: "#1d4ed8",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "16px",
    marginBottom: "5px",
  },

  footer: {
    padding: "18px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "7px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "10px",
  },

  todaySummaryBox: {},

  infoLabel: {},

  miniMetricLabel: {},

  reportMetricLabel: {},

  profilePercentageLabel: {},
};