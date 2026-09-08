"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Student = {
  id: number;
  student_username: string | null;
  student_name: string | null;
  created_at?: string | null;
  admission_date?: string | null;
  date_of_birth?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
};

type LoginActivity = {
  id: number;
  student_id: number | string | null;
  login_at: string;
  created_at?: string | null;
};

type StudentSummary = {
  databaseId: string;
  studentId: string;
  studentName: string;
  username: string;
  totalLogins: number;
  lastLogin: string | null;
  activities: LoginActivity[];
};

type DateFilter = "all" | "today" | "7days" | "30days";

function getStudentName(student: Student): string {
  return student.student_name?.trim() || "Unknown Student";
}

function getStudentId(student: Student): string {
  return student.student_username?.trim() || String(student.id);
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return "Never";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateOnly(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeOnly(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isToday(dateString: string | null): boolean {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getDateFilterStart(filter: DateFilter): Date | null {
  if (filter === "all") {
    return null;
  }

  const now = new Date();

  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (filter === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (filter === "30days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start;
  }

  return null;
}

export default function StudentLoginActivityPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<LoginActivity[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentSummary | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [studentsResult, activitiesResult] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id, student_username, student_name, created_at, admission_date, date_of_birth, father_name, mother_name"
          )
          .order("id", { ascending: true }),

        supabase
          .from("student_login_activity")
          .select("id, student_id, login_at, created_at")
          .order("login_at", { ascending: false }),
      ]);

      if (studentsResult.error) {
        throw new Error(
          `Students data error: ${studentsResult.error.message}`
        );
      }

      if (activitiesResult.error) {
        throw new Error(
          `Login activity error: ${activitiesResult.error.message}`
        );
      }

      setStudents((studentsResult.data || []) as Student[]);
      setActivities((activitiesResult.data || []) as LoginActivity[]);
    } catch (err) {
      console.error("Student login activity loading error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load student login activity.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  /*
   * IMPORTANT:
   *
   * student_login_activity.student_id references students.id.
   *
   * Therefore activity matching MUST use:
   *
   * activity.student_id === student.id
   *
   * Display Student ID comes separately from:
   *
   * students.student_username
   */

  const activityMap = useMemo(() => {
    const map = new Map<string, LoginActivity[]>();

    for (const activity of activities) {
      if (activity.student_id === null || activity.student_id === undefined) {
        continue;
      }

      const databaseId = String(activity.student_id);

      const existing = map.get(databaseId) || [];
      existing.push(activity);

      map.set(databaseId, existing);
    }

    return map;
  }, [activities]);

  const studentSummaries = useMemo<StudentSummary[]>(() => {
    return students.map((student) => {
      const databaseId = String(student.id);

      const studentActivities = [...(activityMap.get(databaseId) || [])].sort(
        (a, b) =>
          new Date(b.login_at).getTime() -
          new Date(a.login_at).getTime()
      );

      const lastLogin =
        studentActivities.length > 0
          ? studentActivities[0].login_at
          : null;

      return {
        databaseId,
        studentId: getStudentId(student),
        studentName: getStudentName(student),
        username: student.student_username?.trim() || "",
        totalLogins: studentActivities.length,
        lastLogin,
        activities: studentActivities,
      };
    });
  }, [students, activityMap]);

  /*
   * Apply date filtering only to login activity.
   *
   * Student list remains complete even if the student has
   * no login during the selected date range.
   */
  const filteredSummaries = useMemo(() => {
    const filterStart = getDateFilterStart(dateFilter);

    const result = studentSummaries.map((student) => {
      const filteredActivities = student.activities.filter((activity) => {
        if (!filterStart) {
          return true;
        }

        return new Date(activity.login_at) >= filterStart;
      });

      const lastLogin =
        filteredActivities.length > 0
          ? filteredActivities[0].login_at
          : null;

      return {
        ...student,
        activities: filteredActivities,
        totalLogins: filteredActivities.length,
        lastLogin,
      };
    });

    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return result;
    }

    return result.filter((student) => {
      return (
        student.studentName.toLowerCase().includes(normalizedSearch) ||
        student.studentId.toLowerCase().includes(normalizedSearch) ||
        student.username.toLowerCase().includes(normalizedSearch) ||
        student.databaseId.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [studentSummaries, search, dateFilter]);

  /*
   * Overall statistics use ALL activity records,
   * not the currently filtered search result.
   */
  const totalStudents = students.length;

  const totalLogins = activities.length;

  const loggedInToday = useMemo(() => {
    return activities.filter((activity) => isToday(activity.login_at)).length;
  }, [activities]);

  const studentsLoggedInToday = useMemo(() => {
    const uniqueIds = new Set<string>();

    for (const activity of activities) {
      if (isToday(activity.login_at) && activity.student_id !== null) {
        uniqueIds.add(String(activity.student_id));
      }
    }

    return uniqueIds.size;
  }, [activities]);

  const neverLoggedIn = useMemo(() => {
    return students.filter((student) => {
      const databaseId = String(student.id);
      const studentActivities = activityMap.get(databaseId) || [];

      return studentActivities.length === 0;
    }).length;
  }, [students, activityMap]);

  const activeStudents = totalStudents - neverLoggedIn;

  const handleOpenHistory = (student: StudentSummary) => {
    setSelectedStudent(student);
    setShowHistory(true);
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
    setSelectedStudent(null);
  };

  const getStatus = (student: StudentSummary) => {
    if (!student.lastLogin) {
      return {
        text: "No Login",
        className: "status-no-login",
        icon: "⚪",
      };
    }

    if (isToday(student.lastLogin)) {
      return {
        text: "Active Today",
        className: "status-active",
        icon: "🟢",
      };
    }

    return {
      text: "Logged Before",
      className: "status-old",
      icon: "🔵",
    };
  };

  return (
    <main className="login-activity-page">
      <div className="page-background" />

      <section className="page-container">
        {/* HEADER */}
        <header className="page-header">
          <div className="header-left">
            <div className="header-icon">🔐</div>

            <div>
              <div className="eyebrow">RACER ACADEMY</div>

              <h1>Student Login Activity</h1>

              <p>
                Track every student&apos;s portal login activity,
                history and login statistics.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <span className={refreshing ? "spin" : ""}>↻</span>

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* ERROR */}
        {error && (
          <div className="error-box">
            <div className="error-icon">⚠️</div>

            <div>
              <strong>Unable to load login activity</strong>
              <p>{error}</p>
            </div>

            <button type="button" onClick={handleRefresh}>
              Retry
            </button>
          </div>
        )}

        {/* STATISTICS */}
        <section className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-icon">👨‍🎓</div>

            <div className="stat-content">
              <span>Total Students</span>
              <strong>{totalStudents}</strong>
              <small>All registered students</small>
            </div>
          </div>

          <div className="stat-card stat-purple">
            <div className="stat-icon">🔐</div>

            <div className="stat-content">
              <span>Total Logins</span>
              <strong>{totalLogins}</strong>
              <small>Successful login records</small>
            </div>
          </div>

          <div className="stat-card stat-green">
            <div className="stat-icon">🟢</div>

            <div className="stat-content">
              <span>Logged In Today</span>
              <strong>{studentsLoggedInToday}</strong>
              <small>{loggedInToday} login event(s) today</small>
            </div>
          </div>

          <div className="stat-card stat-orange">
            <div className="stat-icon">⏳</div>

            <div className="stat-content">
              <span>Never Logged In</span>
              <strong>{neverLoggedIn}</strong>
              <small>
                {activeStudents} student(s) have logged in
              </small>
            </div>
          </div>
        </section>

        {/* CONTROLS */}
        <section className="controls-card">
          <div className="search-wrapper">
            <span className="search-icon">🔎</span>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student name or Student ID..."
              aria-label="Search students"
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="filter-wrapper">
            <label htmlFor="date-filter">Login Period</label>

            <select
              id="date-filter"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as DateFilter)
              }
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </section>

        {/* RESULT INFORMATION */}
        <div className="result-bar">
          <div>
            <strong>All Students</strong>

            <span>
              Showing {filteredSummaries.length} of {totalStudents}{" "}
              students
            </span>
          </div>

          {(search || dateFilter !== "all") && (
            <button
              type="button"
              className="reset-filter"
              onClick={() => {
                setSearch("");
                setDateFilter("all");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* LOADING */}
        {loading ? (
          <section className="loading-card">
            <div className="loader" />

            <h3>Loading Student Login Activity...</h3>

            <p>
              Fetching students and their complete login records
              from Supabase.
            </p>
          </section>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <section className="desktop-table-card">
              <div className="table-header">
                <div>
                  <h2>All Students</h2>
                  <p>
                    Every student and their complete login summary.
                  </p>
                </div>

                <div className="record-count">
                  {filteredSummaries.length} Records
                </div>
              </div>

              {filteredSummaries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>

                  <h3>No students found</h3>

                  <p>
                    No student matches your current search or
                    filter.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDateFilter("all");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Student ID</th>
                        <th>Last Login</th>
                        <th>Total Logins</th>
                        <th>Status</th>
                        <th>History</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSummaries.map((student, index) => {
                        const status = getStatus(student);

                        return (
                          <tr key={student.databaseId}>
                            <td>
                              <span className="row-number">
                                {index + 1}
                              </span>
                            </td>

                            <td>
                              <div className="student-cell">
                                <div className="student-avatar">
                                  {student.studentName
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {student.studentName}
                                  </strong>

                                  {student.username && (
                                    <small>
                                      {student.username}
                                    </small>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="student-id-badge">
                                {student.studentId}
                              </span>
                            </td>

                            <td>
                              {student.lastLogin ? (
                                <div className="last-login">
                                  <strong>
                                    {formatDateOnly(
                                      student.lastLogin
                                    )}
                                  </strong>

                                  <span>
                                    {formatTimeOnly(
                                      student.lastLogin
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="never-login">
                                  Never
                                </span>
                              )}
                            </td>

                            <td>
                              <span className="login-count">
                                {student.totalLogins}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`status-badge ${status.className}`}
                              >
                                {status.icon} {status.text}
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="history-button"
                                onClick={() =>
                                  handleOpenHistory(student)
                                }
                              >
                                View History
                                <span>→</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* MOBILE CARDS */}
            <section className="mobile-students-list">
              {filteredSummaries.length === 0 ? (
                <div className="empty-state mobile-empty">
                  <div className="empty-icon">🔍</div>

                  <h3>No students found</h3>

                  <p>
                    No student matches your current search or
                    filter.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDateFilter("all");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredSummaries.map((student, index) => {
                  const status = getStatus(student);

                  return (
                    <article
                      className="student-mobile-card"
                      key={student.databaseId}
                    >
                      <div className="mobile-card-top">
                        <div className="mobile-student-main">
                          <div className="student-avatar large">
                            {student.studentName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <span className="mobile-number">
                              #{index + 1}
                            </span>

                            <h3>{student.studentName}</h3>

                            <span className="student-id-badge">
                              {student.studentId}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`status-badge ${status.className}`}
                        >
                          {status.icon}
                        </span>
                      </div>

                      <div className="mobile-details-grid">
                        <div className="mobile-detail">
                          <span>Last Login</span>

                          <strong>
                            {student.lastLogin
                              ? formatDateTime(
                                  student.lastLogin
                                )
                              : "Never"}
                          </strong>
                        </div>

                        <div className="mobile-detail">
                          <span>Total Logins</span>

                          <strong>
                            {student.totalLogins}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mobile-history-button"
                        onClick={() => handleOpenHistory(student)}
                      >
                        View Complete History
                        <span>→</span>
                      </button>
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}

        {/* FOOTER */}
        <footer className="page-footer">
          <span>🔐 RACER ACADEMY</span>

          <span>
            Student Login Activity is stored securely in Supabase.
          </span>
        </footer>
      </section>

      {/* HISTORY MODAL */}
      {showHistory && selectedStudent && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseHistory();
            }
          }}
        >
          <div
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
          >
            <div className="modal-header">
              <div className="modal-student-info">
                <div className="student-avatar modal-avatar">
                  {selectedStudent.studentName
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <span className="modal-label">
                    LOGIN HISTORY
                  </span>

                  <h2 id="history-title">
                    {selectedStudent.studentName}
                  </h2>

                  <span className="student-id-badge">
                    {selectedStudent.studentId}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={handleCloseHistory}
                aria-label="Close login history"
              >
                ×
              </button>
            </div>

            <div className="history-summary">
              <div>
                <span>Total Logins</span>
                <strong>
                  {selectedStudent.activities.length}
                </strong>
              </div>

              <div>
                <span>Last Login</span>
                <strong>
                  {selectedStudent.lastLogin
                    ? formatDateTime(
                        selectedStudent.lastLogin
                      )
                    : "Never"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {getStatus(selectedStudent).icon}{" "}
                  {getStatus(selectedStudent).text}
                </strong>
              </div>
            </div>

            <div className="history-content">
              <div className="history-title-row">
                <div>
                  <h3>Complete Login Records</h3>

                  <p>
                    Every successful login recorded for this
                    student.
                  </p>
                </div>
              </div>

              {selectedStudent.activities.length === 0 ? (
                <div className="history-empty">
                  <div>📭</div>

                  <h3>No Login Records</h3>

                  <p>
                    This student has not successfully logged into
                    the portal yet.
                  </p>
                </div>
              ) : (
                <div className="history-list">
                  {selectedStudent.activities.map(
                    (activity, index) => (
                      <div
                        className="history-item"
                        key={activity.id}
                      >
                        <div className="history-number">
                          {selectedStudent.activities.length -
                            index}
                        </div>

                        <div className="history-icon">
                          🔐
                        </div>

                        <div className="history-record">
                          <strong>
                            Successful Login
                          </strong>

                          <span>
                            {formatDateTime(
                              activity.login_at
                            )}
                          </span>

                          <small>
                            Login record #{activity.id}
                          </small>
                        </div>

                        {isToday(activity.login_at) && (
                          <span className="today-badge">
                            Today
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={handleCloseHistory}
                className="modal-close-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-activity-page {
          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          background: #f5f7fb;
          color: #172033;
          padding: 24px;
        }

        .page-background {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(99, 102, 241, 0.08),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(16, 185, 129, 0.07),
              transparent 25%
            ),
            radial-gradient(
              circle at 50% 100%,
              rgba(59, 130, 246, 0.06),
              transparent 30%
            );
        }

        .page-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 62px;
          height: 62px;
          flex: 0 0 62px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 29px;
          background: linear-gradient(
            135deg,
            #4f46e5,
            #7c3aed
          );
          box-shadow:
            0 12px 28px rgba(79, 70, 229, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #6366f1;
          margin-bottom: 4px;
        }

        .page-header h1 {
          margin: 0;
          font-size: clamp(25px, 3vw, 34px);
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.025em;
        }

        .page-header p {
          margin: 7px 0 0;
          color: #667085;
          font-size: 14px;
        }

        .refresh-button {
          border: 0;
          border-radius: 13px;
          padding: 12px 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          background: #ffffff;
          color: #344054;
          font-size: 14px;
          font-weight: 750;
          box-shadow: 0 6px 20px rgba(16, 24, 40, 0.08);
          border: 1px solid #e5e7eb;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .refresh-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 9px 25px rgba(16, 24, 40, 0.12);
        }

        .refresh-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .refresh-button span {
          font-size: 18px;
          line-height: 1;
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px 17px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #991b1b;
        }

        .error-icon {
          font-size: 24px;
        }

        .error-box strong {
          font-size: 14px;
        }

        .error-box p {
          margin: 3px 0 0;
          font-size: 12px;
          color: #b42318;
        }

        .error-box button {
          margin-left: auto;
          border: 0;
          background: #991b1b;
          color: white;
          border-radius: 9px;
          padding: 8px 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.06);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          flex: 0 0 50px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          font-size: 23px;
        }

        .stat-blue .stat-icon {
          background: #eef4ff;
        }

        .stat-purple .stat-icon {
          background: #f2edff;
        }

        .stat-green .stat-icon {
          background: #eafaf2;
        }

        .stat-orange .stat-icon {
          background: #fff5e8;
        }

        .stat-content {
          min-width: 0;
        }

        .stat-content span,
        .stat-content small {
          display: block;
        }

        .stat-content span {
          color: #667085;
          font-size: 12px;
          font-weight: 700;
        }

        .stat-content strong {
          display: block;
          margin-top: 2px;
          font-size: 26px;
          line-height: 1.1;
          font-weight: 850;
        }

        .stat-content small {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 10px;
        }

        .controls-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px;
          margin-bottom: 15px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.05);
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 0;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          pointer-events: none;
        }

        .search-wrapper input {
          width: 100%;
          height: 45px;
          padding: 0 42px;
          border-radius: 11px;
          border: 1px solid #d0d5dd;
          outline: none;
          background: #fff;
          color: #101828;
          font-size: 13px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .search-wrapper input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border: 0;
          border-radius: 50%;
          background: #f2f4f7;
          color: #667085;
          cursor: pointer;
          font-size: 17px;
          line-height: 1;
        }

        .filter-wrapper {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .filter-wrapper label {
          white-space: nowrap;
          color: #667085;
          font-size: 12px;
          font-weight: 700;
        }

        .filter-wrapper select {
          height: 45px;
          min-width: 145px;
          border-radius: 11px;
          border: 1px solid #d0d5dd;
          background: white;
          padding: 0 12px;
          color: #344054;
          font-size: 13px;
          font-weight: 650;
          outline: none;
        }

        .result-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 12px;
          padding: 0 3px;
        }

        .result-bar > div {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .result-bar strong {
          font-size: 16px;
          font-weight: 800;
        }

        .result-bar span {
          color: #98a2b3;
          font-size: 12px;
        }

        .reset-filter {
          border: 0;
          background: transparent;
          color: #4f46e5;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .desktop-table-card {
          overflow: hidden;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 7px 25px rgba(15, 23, 42, 0.055);
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid #eef0f3;
        }

        .table-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
        }

        .table-header p {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .record-count {
          padding: 7px 11px;
          border-radius: 999px;
          background: #f2f4f7;
          color: #475467;
          font-size: 11px;
          font-weight: 750;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .students-table {
          width: 100%;
          min-width: 940px;
          border-collapse: collapse;
        }

        .students-table th {
          padding: 12px 15px;
          text-align: left;
          background: #f8fafc;
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .students-table td {
          padding: 13px 15px;
          border-top: 1px solid #f0f2f5;
          vertical-align: middle;
          font-size: 12px;
        }

        .students-table tbody tr {
          transition: background 0.15s ease;
        }

        .students-table tbody tr:hover {
          background: #fafbff;
        }

        .row-number {
          color: #98a2b3;
          font-weight: 750;
          font-size: 11px;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 180px;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #eef2ff,
            #ddd6fe
          );
          color: #4f46e5;
          font-size: 15px;
          font-weight: 850;
        }

        .student-avatar.large {
          width: 47px;
          height: 47px;
          flex-basis: 47px;
          border-radius: 14px;
        }

        .student-cell strong {
          display: block;
          max-width: 230px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 800;
          color: #101828;
        }

        .student-cell small {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
        }

        .student-id-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 7px;
          background: #f2f4f7;
          color: #344054;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .last-login strong {
          display: block;
          color: #344054;
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
        }

        .last-login span {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
        }

        .never-login {
          color: #98a2b3;
          font-size: 11px;
          font-weight: 650;
        }

        .login-count {
          display: inline-grid;
          min-width: 30px;
          height: 30px;
          padding: 0 8px;
          place-items: center;
          border-radius: 9px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 12px;
          font-weight: 850;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
        }

        .status-active {
          color: #027a48;
          background: #ecfdf3;
        }

        .status-no-login {
          color: #667085;
          background: #f2f4f7;
        }

        .status-old {
          color: #175cd3;
          background: #eff8ff;
        }

        .history-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          padding: 8px 10px;
          border-radius: 9px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .history-button:hover {
          background: #e0e7ff;
          transform: translateX(1px);
        }

        .history-button span,
        .mobile-history-button span {
          font-size: 15px;
        }

        .mobile-students-list {
          display: none;
        }

        .loading-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 330px;
          padding: 40px 20px;
          border-radius: 18px;
          background: white;
          border: 1px solid #e5e7eb;
          box-shadow: 0 7px 25px rgba(15, 23, 42, 0.05);
          text-align: center;
        }

        .loader {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 17px;
        }

        .loading-card h3 {
          margin: 0;
          font-size: 16px;
        }

        .loading-card p {
          margin: 7px 0 0;
          color: #98a2b3;
          font-size: 12px;
        }

        .empty-state {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          border-radius: 16px;
          background: #f2f4f7;
          font-size: 24px;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 16px;
        }

        .empty-state p {
          margin: 5px 0 15px;
          color: #98a2b3;
          font-size: 12px;
        }

        .empty-state button {
          border: 0;
          border-radius: 9px;
          padding: 9px 14px;
          background: #4f46e5;
          color: white;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .page-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 18px;
          padding: 10px 3px;
          color: #98a2b3;
          font-size: 10px;
        }

        .page-footer span:first-child {
          color: #667085;
          font-weight: 800;
        }

        /* MODAL */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(6px);
        }

        .history-modal {
          width: 100%;
          max-width: 760px;
          max-height: calc(100vh - 40px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          background: #ffffff;
          box-shadow:
            0 25px 70px rgba(15, 23, 42, 0.25),
            0 5px 20px rgba(15, 23, 42, 0.1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 19px 20px;
          border-bottom: 1px solid #eef0f3;
        }

        .modal-student-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .modal-avatar {
          width: 48px;
          height: 48px;
          flex-basis: 48px;
        }

        .modal-label {
          display: block;
          margin-bottom: 2px;
          color: #6366f1;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .modal-header h2 {
          margin: 0 0 5px;
          color: #101828;
          font-size: 20px;
          font-weight: 850;
        }

        .close-modal {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 10px;
          background: #f2f4f7;
          color: #475467;
          font-size: 23px;
          line-height: 1;
          cursor: pointer;
        }

        .close-modal:hover {
          background: #e4e7ec;
        }

        .history-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 14px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #eef0f3;
        }

        .history-summary > div {
          min-width: 0;
          padding: 11px;
          border-radius: 11px;
          background: white;
          border: 1px solid #eef0f3;
        }

        .history-summary span {
          display: block;
          color: #98a2b3;
          font-size: 9px;
          font-weight: 750;
        }

        .history-summary strong {
          display: block;
          margin-top: 4px;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .history-content {
          min-height: 0;
          flex: 1;
          overflow-y: auto;
          padding: 18px 20px;
        }

        .history-title-row {
          margin-bottom: 13px;
        }

        .history-title-row h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .history-title-row p {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px;
          border-radius: 12px;
          border: 1px solid #eaecf0;
          background: #ffffff;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .history-item:hover {
          border-color: #c7d2fe;
          background: #fafaff;
        }

        .history-number {
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: #f2f4f7;
          color: #667085;
          font-size: 9px;
          font-weight: 800;
        }

        .history-icon {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #eef2ff;
          font-size: 16px;
        }

        .history-record {
          min-width: 0;
          flex: 1;
        }

        .history-record strong {
          display: block;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .history-record span {
          display: block;
          margin-top: 2px;
          color: #475467;
          font-size: 11px;
        }

        .history-record small {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 9px;
        }

        .today-badge {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #027a48;
          font-size: 9px;
          font-weight: 800;
        }

        .history-empty {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .history-empty > div {
          font-size: 35px;
          margin-bottom: 9px;
        }

        .history-empty h3 {
          margin: 0;
          font-size: 15px;
        }

        .history-empty p {
          max-width: 350px;
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          padding: 13px 20px;
          border-top: 1px solid #eef0f3;
        }

        .modal-close-button {
          border: 0;
          border-radius: 9px;
          padding: 9px 15px;
          background: #344054;
          color: white;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .login-activity-page {
            padding: 15px;
          }

          .page-header {
            align-items: flex-start;
          }

          .controls-card {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-wrapper {
            justify-content: space-between;
          }

          .filter-wrapper select {
            flex: 1;
          }

          .desktop-table-card {
            display: none;
          }

          .mobile-students-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .student-mobile-card {
            padding: 15px;
            border-radius: 16px;
            background: white;
            border: 1px solid #e5e7eb;
            box-shadow: 0 5px 18px rgba(15, 23, 42, 0.05);
          }

          .mobile-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .mobile-student-main {
            display: flex;
            align-items: center;
            gap: 11px;
            min-width: 0;
          }

          .mobile-student-main > div:last-child {
            min-width: 0;
          }

          .mobile-number {
            display: block;
            color: #98a2b3;
            font-size: 9px;
            font-weight: 700;
          }

          .mobile-student-main h3 {
            max-width: 230px;
            overflow: hidden;
            margin: 2px 0 5px;
            color: #101828;
            font-size: 14px;
            font-weight: 850;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobile-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 9px;
            margin-top: 13px;
          }

          .mobile-detail {
            padding: 10px;
            border-radius: 10px;
            background: #f8fafc;
          }

          .mobile-detail span {
            display: block;
            color: #98a2b3;
            font-size: 9px;
            font-weight: 700;
          }

          .mobile-detail strong {
            display: block;
            margin-top: 4px;
            color: #344054;
            font-size: 11px;
            font-weight: 800;
          }

          .mobile-history-button {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 10px;
            padding: 10px 12px;
            border: 0;
            border-radius: 10px;
            background: #eef2ff;
            color: #4f46e5;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
          }
        }

        @media (max-width: 600px) {
          .login-activity-page {
            padding: 10px;
          }

          .page-header {
            flex-direction: column;
          }

          .header-left {
            align-items: flex-start;
          }

          .header-icon {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
            border-radius: 14px;
            font-size: 23px;
          }

          .page-header h1 {
            font-size: 23px;
          }

          .page-header p {
            line-height: 1.45;
          }

          .refresh-button {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .stat-card {
            padding: 12px;
            gap: 9px;
            border-radius: 14px;
          }

          .stat-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
            border-radius: 10px;
            font-size: 17px;
          }

          .stat-content strong {
            font-size: 20px;
          }

          .stat-content span {
            font-size: 10px;
          }

          .stat-content small {
            display: none;
          }

          .filter-wrapper {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-wrapper select {
            width: 100%;
          }

          .result-bar > div {
            flex-direction: column;
            gap: 2px;
          }

          .page-footer {
            flex-direction: column;
            line-height: 1.4;
          }

          .modal-overlay {
            padding: 8px;
          }

          .history-modal {
            max-height: calc(100vh - 16px);
            border-radius: 16px;
          }

          .modal-header {
            padding: 15px;
          }

          .history-summary {
            grid-template-columns: 1fr 1fr;
            padding: 10px 15px;
          }

          .history-summary > div:last-child {
            grid-column: 1 / -1;
          }

          .history-content {
            padding: 15px;
          }

          .history-item {
            align-items: flex-start;
          }

          .today-badge {
            display: none;
          }

          .modal-footer {
            padding: 11px 15px;
          }

          .modal-close-button {
            width: 100%;
          }
        }

        @media (max-width: 390px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .student-mobile-card {
            padding: 12px;
          }

          .mobile-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}