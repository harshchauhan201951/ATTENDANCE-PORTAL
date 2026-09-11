"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  class_name: string | null;
};

type Homework = {
  id: number;
  subject: string;
  title: string;
  description: string;
  due_date: string;
  class_name: string;
  created_at: string | null;
};

type HomeworkTab = "all" | "today";

export default function StudentHomeworkPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [activeTab, setActiveTab] =
    useState<HomeworkTab>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudentHomework();
  }, []);

  async function loadStudentHomework() {
    try {
      setLoading(true);
      setError("");

      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        "";

      if (!username) {
        setError(
          "Student session not found. Please login again."
        );
        setLoading(false);
        return;
      }

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, class_name"
          )
          .eq("student_username", username)
          .single();

      if (studentError) {
        console.error(
          "Student loading error:",
          studentError
        );

        setError(
          "Unable to load your student information."
        );

        setLoading(false);
        return;
      }

      const currentStudent = studentData as Student;

      setStudent(currentStudent);

      const studentClass =
        currentStudent.class_name?.trim() || "";

      if (!studentClass) {
        setError(
          "Your class is not assigned yet. Please contact your teacher."
        );

        setHomework([]);
        setLoading(false);
        return;
      }

      const { data: homeworkData, error: homeworkError } =
        await supabase
          .from("homework")
          .select(
            "id, subject, title, description, due_date, class_name, created_at"
          )
          .order("created_at", {
            ascending: false,
          });

      if (homeworkError) {
        console.error(
          "Homework loading error:",
          homeworkError
        );

        setError(
          "Unable to load your homework right now."
        );

        setLoading(false);
        return;
      }

      const assignedHomework = (
        (homeworkData || []) as Homework[]
      ).filter((item) => {
        const assignedClasses = item.class_name
          .split(",")
          .map((classItem) =>
            classItem.trim().toLowerCase()
          )
          .filter(Boolean);

        return assignedClasses.includes(
          studentClass.toLowerCase()
        );
      });

      setHomework(assignedHomework);
    } catch (err) {
      console.error(
        "Unexpected student homework error:",
        err
      );

      setError(
        "Something went wrong while loading homework."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * INDIA DATE / TIME HELPERS
   *
   * All "Today's Homework" calculations are based
   * on India Standard Time (IST), regardless of the
   * student's device timezone.
   */

  function getIndiaDateKey(date: Date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function isPostedTodayInIndia(
    createdAt: string | null
  ) {
    if (!createdAt) {
      return false;
    }

    const createdDate = new Date(createdAt);

    if (Number.isNaN(createdDate.getTime())) {
      return false;
    }

    return (
      getIndiaDateKey(createdDate) ===
      getIndiaDateKey(new Date())
    );
  }

  function formatPostedDate(
    createdAt: string | null
  ) {
    if (!createdAt) {
      return "Date not available";
    }

    const createdDate = new Date(createdAt);

    if (Number.isNaN(createdDate.getTime())) {
      return "Date not available";
    }

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(createdDate);
  }

  function formatPostedTime(
    createdAt: string | null
  ) {
    if (!createdAt) {
      return "";
    }

    const createdDate = new Date(createdAt);

    if (Number.isNaN(createdDate.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(createdDate);
  }

  function formatDate(date: string) {
    if (!date) {
      return "";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function isOverdue(date: string) {
    if (!date) {
      return false;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const due = new Date(
      `${date}T00:00:00`
    );

    return due < today;
  }

  const todayHomework = useMemo(() => {
    return homework.filter((item) =>
      isPostedTodayInIndia(item.created_at)
    );
  }, [homework]);

  const visibleHomework =
    activeTab === "today"
      ? todayHomework
      : homework;

  function logout() {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("studentName");
    localStorage.removeItem("student_name");
    localStorage.removeItem("studentId");

    sessionStorage.clear();

    router.push("/");
  }

  return (
    <>
      <main
        className="student-homework-page"
        style={styles.page}
      >
        <div
          className="student-homework-container"
          style={styles.container}
        >
          {/* HEADER */}

          <header
            className="homework-header"
            style={styles.header}
          >
            <div
              className="homework-header-left"
              style={styles.headerLeft}
            >
              <div style={styles.logo}>
                📚
              </div>

              <div className="homework-heading-content">
                <div style={styles.portalBadge}>
                  STUDENT PORTAL
                </div>

                <h1 style={styles.title}>
                  My Homework
                </h1>

                <p style={styles.subtitle}>
                  View homework assigned by your teacher
                </p>
              </div>
            </div>

            <div
              className="homework-header-actions"
              style={styles.headerActions}
            >
              <button
                type="button"
                onClick={() =>
                  router.push("/student/dashboard")
                }
                style={styles.dashboardButton}
              >
                ← Dashboard
              </button>

              <button
                type="button"
                onClick={logout}
                style={styles.logoutButton}
              >
                Logout
              </button>
            </div>
          </header>

          {/* STUDENT INFORMATION */}

          {student && (
            <section
              className="homework-student-card"
              style={styles.studentCard}
            >
              <div style={styles.studentAvatar}>
                {(student.student_name || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div
                className="homework-student-info"
                style={styles.studentInfo}
              >
                <div style={styles.infoLabel}>
                  STUDENT
                </div>

                <div style={styles.studentName}>
                  {student.student_name || "Student"}
                </div>

                <div style={styles.username}>
                  @{student.student_username}
                </div>
              </div>

              <div
                className="homework-class-box"
                style={styles.classBox}
              >
                <div style={styles.infoLabel}>
                  MY CLASS
                </div>

                <div style={styles.className}>
                  {student.class_name || "Not Assigned"}
                </div>
              </div>

              <div
                className="homework-count-box"
                style={styles.homeworkCountBox}
              >
                <div style={styles.infoLabel}>
                  HOMEWORK
                </div>

                <div style={styles.homeworkCount}>
                  {homework.length}
                </div>
              </div>
            </section>
          )}

          {/* ERROR */}

          {error && (
            <div
              className="homework-error-box"
              style={styles.errorBox}
            >
              <div style={styles.errorIcon}>
                ⚠️
              </div>

              <div className="homework-error-content">
                <div style={styles.errorTitle}>
                  Unable to Load Homework
                </div>

                <div style={styles.errorText}>
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* LOADING */}

          {loading ? (
            <section style={styles.emptyCard}>
              <div style={styles.loadingIcon}>
                ⏳
              </div>

              <h2 style={styles.emptyTitle}>
                Loading Your Homework...
              </h2>

              <p style={styles.emptyText}>
                Please wait while we load homework
                assigned to your class.
              </p>
            </section>
          ) : !error ? (
            <>
              {/* HOMEWORK TABS */}

              <section
                className="homework-tabs-card"
                style={styles.tabsCard}
              >
                <div style={styles.tabsHeader}>
                  <div>
                    <div style={styles.tabsEyebrow}>
                      HOMEWORK
                    </div>

                    <h2 style={styles.tabsTitle}>
                      अपना Homework देखें
                    </h2>

                    <p style={styles.tabsSubtitle}>
                      India time के अनुसार आज का homework
                      अलग से देखें।
                    </p>
                  </div>

                  <div style={styles.istBadge}>
                    🇮🇳 IST
                  </div>
                </div>

                <div
                  className="homework-tabs"
                  style={styles.tabs}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("today")
                    }
                    className={
                      activeTab === "today"
                        ? "homework-tab active"
                        : "homework-tab"
                    }
                    style={{
                      ...styles.tabButton,
                      ...(activeTab === "today"
                        ? styles.activeTabButton
                        : {}),
                    }}
                  >
                    <span style={styles.tabIcon}>
                      📅
                    </span>

                    <span>
                      आज का Homework
                    </span>

                    <span
                      style={{
                        ...styles.tabCount,
                        ...(activeTab === "today"
                          ? styles.activeTabCount
                          : {}),
                      }}
                    >
                      {todayHomework.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("all")
                    }
                    className={
                      activeTab === "all"
                        ? "homework-tab active"
                        : "homework-tab"
                    }
                    style={{
                      ...styles.tabButton,
                      ...(activeTab === "all"
                        ? styles.activeTabButton
                        : {}),
                    }}
                  >
                    <span style={styles.tabIcon}>
                      📚
                    </span>

                    <span>
                      बाकी के Homework
                    </span>

                    <span
                      style={{
                        ...styles.tabCount,
                        ...(activeTab === "all"
                          ? styles.activeTabCount
                          : {}),
                      }}
                    >
                      {homework.length}
                    </span>
                  </button>
                </div>
              </section>

              {/* TODAY EMPTY MESSAGE */}

              {activeTab === "today" &&
              todayHomework.length === 0 ? (
                <section
                  className="homework-today-empty"
                  style={styles.todayEmptyCard}
                >
                  <div style={styles.todayEmptyIcon}>
                    📭
                  </div>

                  <div style={styles.todayEmptyBadge}>
                    आज का Homework
                  </div>

                  <h2 style={styles.emptyTitle}>
                    आज का Homework नहीं है
                  </h2>

                  <p style={styles.todayEmptyText}>
                    आज का Homework टीचर की तरफ से नहीं
                    डाला गया है।
                  </p>

                  <p style={styles.todayContactText}>
                    कृपया Homework के लिए टीचर से
                    संपर्क करें।
                  </p>

                  <div style={styles.todayDateBadge}>
                    🇮🇳 आज की तारीख:{" "}
                    {new Intl.DateTimeFormat("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }).format(new Date())}
                  </div>
                </section>
              ) : visibleHomework.length === 0 ? (
                /* ALL HOMEWORK EMPTY */

                <section
                  style={styles.emptyCard}
                >
                  <div style={styles.emptyIcon}>
                    📚
                  </div>

                  <h2 style={styles.emptyTitle}>
                    कोई Homework Assigned नहीं है
                  </h2>

                  <p style={styles.emptyText}>
                    There is currently no homework
                    assigned to your class.
                  </p>

                  {student?.class_name && (
                    <div style={styles.emptyClass}>
                      Class: {student.class_name}
                    </div>
                  )}
                </section>
              ) : (
                /* HOMEWORK LIST */

                <section>
                  <div
                    className="homework-section-header"
                    style={styles.sectionHeader}
                  >
                    <div className="homework-section-heading">
                      <div style={styles.sectionEyebrow}>
                        {activeTab === "today"
                          ? "TODAY'S WORK"
                          : "ALL ACADEMIC WORK"}
                      </div>

                      <h2 style={styles.sectionTitle}>
                        {activeTab === "today"
                          ? "आज का Homework"
                          : "बाकी के Homework"}
                      </h2>

                      <p style={styles.sectionSubtitle}>
                        {activeTab === "today"
                          ? "आज India time के अनुसार teacher द्वारा post किया गया homework."
                          : "आपकी class के लिए teacher द्वारा assigned सभी homework."}
                      </p>
                    </div>

                    <div style={styles.readOnlyBadge}>
                      🔒 READ ONLY
                    </div>
                  </div>

                  <div
                    className="homework-list"
                    style={styles.homeworkList}
                  >
                    {visibleHomework.map((item) => {
                      const overdue = isOverdue(
                        item.due_date
                      );

                      return (
                        <article
                          key={item.id}
                          className="homework-card"
                          style={styles.homeworkCard}
                        >
                          <div
                            className="homework-card-header"
                            style={styles.homeworkHeader}
                          >
                            <div
                              className="homework-badges"
                              style={styles.badges}
                            >
                              <span
                                style={
                                  styles.subjectBadge
                                }
                              >
                                {item.subject}
                              </span>

                              <span
                                style={
                                  styles.classBadge
                                }
                              >
                                {student?.class_name}
                              </span>
                            </div>

                            <div
                              style={{
                                ...styles.statusBadge,
                                ...(overdue
                                  ? styles.overdueBadge
                                  : styles.pendingBadge),
                              }}
                            >
                              {overdue
                                ? "OVERDUE"
                                : "ACTIVE"}
                            </div>
                          </div>

                          <h3
                            className="homework-title"
                            style={styles.homeworkTitle}
                          >
                            {item.title}
                          </h3>

                          <div
                            className="homework-description-box"
                            style={styles.descriptionBox}
                          >
                            <div
                              style={
                                styles.descriptionLabel
                              }
                            >
                              HOMEWORK
                            </div>

                            <p
                              className="homework-description"
                              style={
                                styles.homeworkDescription
                              }
                            >
                              {item.description}
                            </p>
                          </div>

                          {/* POSTED DATE */}

                          <div
                            className="homework-posted-box"
                            style={styles.postedBox}
                          >
                            <div
                              style={styles.postedIcon}
                            >
                              🕒
                            </div>

                            <div
                              style={
                                styles.postedContent
                              }
                            >
                              <div
                                style={
                                  styles.postedLabel
                                }
                              >
                                HOMEWORK POSTED
                              </div>

                              <div
                                style={
                                  styles.postedDate
                                }
                              >
                                {formatPostedDate(
                                  item.created_at
                                )}
                              </div>

                              {formatPostedTime(
                                item.created_at
                              ) && (
                                <div
                                  style={
                                    styles.postedTime
                                  }
                                >
                                  {formatPostedTime(
                                    item.created_at
                                  )}{" "}
                                  • India Standard Time
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            className="homework-footer"
                            style={styles.homeworkFooter}
                          >
                            <div
                              className="homework-due-box"
                              style={styles.dueBox}
                            >
                              <div
                                style={styles.dueIcon}
                              >
                                📅
                              </div>

                              <div>
                                <div
                                  style={
                                    styles.dueLabel
                                  }
                                >
                                  DUE DATE
                                </div>

                                <div
                                  style={
                                    styles.dueDate
                                  }
                                >
                                  {formatDate(
                                    item.due_date
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              className="homework-class-visibility"
                              style={
                                styles.classVisibility
                              }
                            >
                              <span
                                style={
                                  styles.visibilityIcon
                                }
                              >
                                👥
                              </span>

                              <span className="visibility-text">
                                Assigned to your class{" "}
                                <strong>
                                  {student?.class_name}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* INFORMATION */}

              <section
                className="homework-info-card"
                style={styles.infoCard}
              >
                <div style={styles.infoCardIcon}>
                  ℹ️
                </div>

                <div className="homework-info-content">
                  <div style={styles.infoCardTitle}>
                    Homework Information
                  </div>

                  <p style={styles.infoCardText}>
                    आज का Homework India Standard Time
                    (IST) के अनुसार दिखाया जाता है।
                    Homework केवल आपकी class के लिए
                    दिखाई देगा और यह page view-only है।
                  </p>
                </div>
              </section>
            </>
          ) : null}

          {/* FOOTER */}

          <footer
            className="homework-footer-page"
            style={styles.footer}
          >
            <div style={styles.footerBrand}>
              🎓 Attendance Portal
            </div>

            <div>
              Student Portal • Homework • 2026
            </div>
          </footer>
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden !important;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .student-homework-page {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .student-homework-container {
          width: 100%;
          max-width: 1150px;
          min-width: 0;
        }

        .homework-header-left {
          min-width: 0;
          flex: 1 1 auto;
        }

        .homework-heading-content {
          min-width: 0;
        }

        .homework-heading-content,
        .homework-section-heading,
        .homework-error-content,
        .homework-info-content {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .homework-title,
        .homework-description,
        .visibility-text {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .homework-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .homework-tab {
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .homework-tab:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .student-homework-page {
            padding: 12px !important;
          }

          .student-homework-container {
            width: 100%;
            max-width: 100%;
          }

          .homework-header {
            padding: 15px !important;
            border-radius: 16px !important;
            align-items: stretch !important;
          }

          .homework-header-left {
            width: 100%;
            align-items: flex-start !important;
          }

          .homework-header-left > div:last-child {
            flex: 1;
            min-width: 0;
          }

          .homework-header-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px !important;
          }

          .homework-header-actions button {
            width: 100%;
            min-width: 0;
            min-height: 42px;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .homework-header-left > div:first-child {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            border-radius: 12px !important;
            font-size: 21px !important;
          }

          .homework-heading-content h1 {
            font-size: 23px !important;
            line-height: 1.2 !important;
          }

          .homework-heading-content p {
            font-size: 11px !important;
            line-height: 1.45 !important;
          }

          .homework-student-card {
            padding: 15px !important;
            border-radius: 16px !important;
            gap: 11px !important;
            align-items: center !important;
          }

          .homework-student-info {
            flex: 1 1 calc(100% - 75px);
            min-width: 0 !important;
          }

          .homework-class-box,
          .homework-count-box {
            flex: 1 1 0;
            min-width: 0 !important;
            padding: 10px !important;
          }

          .homework-class-box {
            margin-left: 73px;
          }

          .homework-count-box {
            margin-left: 0;
          }

          .homework-error-box {
            align-items: flex-start !important;
            padding: 12px !important;
          }

          .homework-tabs-card {
            padding: 15px !important;
            border-radius: 16px !important;
          }

          .homework-tabs {
            grid-template-columns: 1fr !important;
          }

          .homework-section-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            margin-bottom: 13px !important;
          }

          .homework-section-heading {
            width: 100%;
          }

          .homework-section-heading h2 {
            font-size: 21px !important;
          }

          .homework-section-heading p {
            line-height: 1.5 !important;
          }

          .homework-section-header > div:last-child {
            align-self: flex-start;
          }

          .homework-card {
            padding: 15px !important;
            border-radius: 15px !important;
          }

          .homework-card-header {
            align-items: flex-start !important;
          }

          .homework-badges {
            min-width: 0;
            flex: 1 1 100%;
          }

          .homework-card-header > div:last-child {
            margin-top: 2px;
          }

          .homework-title {
            font-size: 18px !important;
            line-height: 1.35 !important;
            margin-top: 11px !important;
          }

          .homework-description-box {
            padding: 11px !important;
            margin-top: 11px !important;
          }

          .homework-description {
            font-size: 11px !important;
            line-height: 1.65 !important;
          }

          .homework-posted-box {
            margin-top: 11px !important;
          }

          .homework-footer {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 11px !important;
          }

          .homework-due-box {
            width: 100%;
          }

          .homework-class-visibility {
            width: 100%;
            align-items: flex-start !important;
          }

          .homework-info-card {
            align-items: flex-start !important;
            padding: 12px !important;
          }

          .homework-footer-page {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .student-homework-page {
            padding: 8px !important;
          }

          .homework-header {
            padding: 12px !important;
          }

          .homework-header-left {
            gap: 9px !important;
          }

          .homework-header-left > div:first-child {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            font-size: 19px !important;
          }

          .homework-heading-content h1 {
            font-size: 21px !important;
          }

          .homework-heading-content p {
            font-size: 10px !important;
          }

          .homework-header-actions {
            grid-template-columns: 1fr;
          }

          .homework-student-card {
            display: grid !important;
            grid-template-columns: 52px minmax(0, 1fr);
            gap: 10px !important;
          }

          .homework-student-card
            > .homework-student-info {
            min-width: 0;
          }

          .homework-student-card
            > .homework-class-box,
          .homework-student-card
            > .homework-count-box {
            margin-left: 0 !important;
            width: 100%;
            min-width: 0;
          }

          .homework-student-card
            > .homework-class-box {
            grid-column: 1 / 2;
          }

          .homework-student-card
            > .homework-count-box {
            grid-column: 2 / 3;
          }

          .homework-tabs-card {
            padding: 12px !important;
          }

          .homework-tabs-header h2 {
            font-size: 18px !important;
          }

          .homework-tab {
            min-height: 50px !important;
            font-size: 10px !important;
          }

          .homework-today-empty {
            padding: 45px 15px !important;
          }

          .homework-card {
            padding: 13px !important;
          }

          .homework-title {
            font-size: 17px !important;
          }

          .subjectBadge,
          .classBadge,
          .statusBadge {
            font-size: 8px !important;
            padding: 5px 7px !important;
          }

          .homework-info-card {
            gap: 8px !important;
          }

          .homework-info-card
            > div:first-child {
            width: 30px !important;
            height: 30px !important;
            min-width: 30px !important;
            font-size: 14px !important;
          }

          .homework-info-content {
            min-width: 0;
          }

          .homework-info-content p {
            font-size: 9px !important;
            line-height: 1.5 !important;
          }

          .homework-footer-page {
            font-size: 9px !important;
          }
        }

        @media (max-width: 360px) {
          .student-homework-page {
            padding: 6px !important;
          }

          .homework-header {
            padding: 10px !important;
          }

          .homework-student-card {
            padding: 12px !important;
          }

          .homework-card {
            padding: 11px !important;
          }

          .homework-section-heading h2 {
            font-size: 19px !important;
          }

          .homework-title {
            font-size: 16px !important;
          }

          .homework-description {
            font-size: 10px !important;
          }

          .homework-class-visibility {
            font-size: 9px !important;
          }
        }
      `}</style>
    </>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100vw",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  header: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
    width: "100%",
    boxSizing: "border-box",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  logo: {
    width: "50px",
    height: "50px",
    minWidth: "50px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    boxShadow:
      "0 8px 18px rgba(37,99,235,0.18)",
  },

  portalBadge: {
    display: "inline-block",
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "27px",
    fontWeight: "1000",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "10px 14px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  logoutButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.18)",
    flexWrap: "wrap",
    width: "100%",
    boxSizing: "border-box",
  },

  studentAvatar: {
    width: "62px",
    height: "62px",
    minWidth: "62px",
    borderRadius: "18px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    fontWeight: "1000",
  },

  studentInfo: {
    flex: 1,
    minWidth: "180px",
  },

  infoLabel: {
    color: "#bfdbfe",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.5px",
    marginBottom: "4px",
  },

  studentName: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "1000",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  username: {
    color: "#dbeafe",
    fontSize: "10px",
    fontWeight: "700",
    marginTop: "3px",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  classBox: {
    padding: "11px 15px",
    minWidth: "120px",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.18)",
  },

  className: {
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "1000",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  homeworkCountBox: {
    padding: "11px 15px",
    minWidth: "90px",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.18)",
  },

  homeworkCount: {
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "1000",
  },

  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  errorIcon: {
    fontSize: "22px",
    flexShrink: 0,
  },

  errorTitle: {
    color: "#991b1b",
    fontSize: "13px",
    fontWeight: "1000",
  },

  errorText: {
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: "600",
    marginTop: "3px",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  tabsCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "18px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.05)",
    width: "100%",
    boxSizing: "border-box",
  },

  tabsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },

  tabsEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  tabsTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "1000",
  },

  tabsSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "600",
  },

  istBadge: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#c2410c",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "9px",
    fontWeight: "1000",
    whiteSpace: "nowrap",
  },

  tabs: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(0,1fr)",
    gap: "10px",
    width: "100%",
  },

  tabButton: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    borderRadius: "12px",
    padding: "13px 14px",
    minHeight: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: "1000",
    cursor: "pointer",
    width: "100%",
  },

  activeTabButton: {
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    border:
      "1px solid rgba(37,99,235,0.8)",
    boxShadow:
      "0 8px 18px rgba(37,99,235,0.18)",
  },

  tabIcon: {
    fontSize: "16px",
    flexShrink: 0,
  },

  tabCount: {
    minWidth: "23px",
    height: "23px",
    padding: "0 6px",
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#475569",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "1000",
  },

  activeTabCount: {
    background:
      "rgba(255,255,255,0.22)",
    color: "#ffffff",
  },

  todayEmptyCard: {
    background: "#ffffff",
    border: "1px solid #bfdbfe",
    borderRadius: "20px",
    padding: "60px 20px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(37,99,235,0.07)",
    width: "100%",
    boxSizing: "border-box",
  },

  todayEmptyIcon: {
    width: "72px",
    height: "72px",
    margin: "0 auto 14px",
    borderRadius: "22px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "34px",
  },

  todayEmptyBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "8px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "9px",
    fontWeight: "1000",
    marginBottom: "9px",
  },

  todayEmptyText: {
    margin: "8px auto 0",
    maxWidth: "500px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "700",
  },

  todayContactText: {
    margin: "4px auto 0",
    maxWidth: "500px",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  todayDateBadge: {
    display: "inline-block",
    marginTop: "17px",
    padding: "8px 12px",
    borderRadius: "9px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "10px",
    fontWeight: "900",
  },

  emptyCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "65px 20px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.05)",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  loadingIcon: {
    fontSize: "40px",
    marginBottom: "12px",
  },

  emptyIcon: {
    fontSize: "50px",
    marginBottom: "12px",
  },

  emptyTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "20px",
    fontWeight: "1000",
    overflowWrap: "anywhere",
  },

  emptyText: {
    margin: "7px auto 0",
    maxWidth: "480px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
    fontWeight: "600",
    overflowWrap: "anywhere",
  },

  emptyClass: {
    display: "inline-block",
    marginTop: "15px",
    padding: "8px 13px",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "900",
    maxWidth: "100%",
    overflowWrap: "anywhere",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginBottom: "15px",
    flexWrap: "wrap",
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
    color: "#172554",
    fontSize: "24px",
    fontWeight: "1000",
    overflowWrap: "anywhere",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
    overflowWrap: "anywhere",
  },

  readOnlyBadge: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },

  homeworkList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    width: "100%",
    minWidth: 0,
  },

  homeworkCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "19px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
  },

  homeworkHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    width: "100%",
    minWidth: 0,
  },

  badges: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  subjectBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
    textTransform: "uppercase",
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  classBadge: {
    background: "#ede9fe",
    color: "#6d28d9",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  statusBadge: {
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  pendingBadge: {
    background: "#dcfce7",
    color: "#15803d",
  },

  overdueBadge: {
    background: "#fee2e2",
    color: "#b91c1c",
  },

  homeworkTitle: {
    margin: "12px 0 0",
    color: "#172554",
    fontSize: "20px",
    fontWeight: "1000",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  descriptionBox: {
    marginTop: "13px",
    padding: "13px",
    borderRadius: "11px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  descriptionLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.2px",
    marginBottom: "5px",
  },

  homeworkDescription: {
    margin: 0,
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.7,
    fontWeight: "600",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  postedBox: {
    marginTop: "13px",
    padding: "11px 13px",
    borderRadius: "11px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  postedIcon: {
    width: "35px",
    height: "35px",
    minWidth: "35px",
    borderRadius: "9px",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  postedContent: {
    minWidth: 0,
  },

  postedLabel: {
    color: "#15803d",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  postedDate: {
    marginTop: "2px",
    color: "#166534",
    fontSize: "11px",
    fontWeight: "900",
    overflowWrap: "anywhere",
  },

  postedTime: {
    marginTop: "2px",
    color: "#4d7c0f",
    fontSize: "9px",
    fontWeight: "700",
    overflowWrap: "anywhere",
  },

  homeworkFooter: {
    marginTop: "14px",
    paddingTop: "13px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    width: "100%",
    minWidth: 0,
  },

  dueBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: 0,
  },

  dueIcon: {
    width: "35px",
    height: "35px",
    minWidth: "35px",
    borderRadius: "9px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
  },

  dueLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  dueDate: {
    marginTop: "2px",
    color: "#172554",
    fontSize: "11px",
    fontWeight: "900",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  classVisibility: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  visibilityIcon: {
    fontSize: "14px",
    flexShrink: 0,
  },

  infoCard: {
    marginTop: "18px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "15px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  infoCardIcon: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "9px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  infoCardTitle: {
    color: "#1e3a8a",
    fontSize: "11px",
    fontWeight: "1000",
  },

  infoCardText: {
    margin: "3px 0 0",
    color: "#475569",
    fontSize: "10px",
    lineHeight: 1.5,
    fontWeight: "600",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
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
    width: "100%",
    boxSizing: "border-box",
  },

  footerBrand: {
    color: "#475569",
    fontWeight: "900",
  },
};