"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type Attendance = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

type AssessmentRow = {
  id: number;
  test_name: string;
  test_date: string;
  total_marks: number;
  student_id: number;
  obtained_marks: number;
  remarks: string | null;
  created_at: string;
};

type StudentMark = {
  studentId: number;
  obtainedMarks: string;
  remarks: string;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isPresent(status: string) {
  return (
    status.toLowerCase() === "present" ||
    status.toLowerCase() === "p"
  );
}

function isAbsent(status: string) {
  return (
    status.toLowerCase() === "absent" ||
    status.toLowerCase() === "a"
  );
}

function getPercentage(obtained: number, total: number) {
  if (!total || total <= 0) return 0;
  return (obtained / total) * 100;
}

function getGrade(percentage: number) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function isPass(percentage: number) {
  return percentage >= 40;
}

export default function TeacherReportsPage() {
  const currentDate = new Date();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);

  const [month, setMonth] = useState(
    String(currentDate.getMonth() + 1)
  );

  const [year, setYear] = useState(
    String(currentDate.getFullYear())
  );

  const [loading, setLoading] = useState(true);
  const [assessmentLoading, setAssessmentLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [assessmentMessage, setAssessmentMessage] =
    useState("");
  const [assessmentError, setAssessmentError] =
    useState("");

  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [totalMarks, setTotalMarks] = useState("");

  const [studentMarks, setStudentMarks] = useState<
    StudentMark[]
  >([]);

  const [selectedAssessment, setSelectedAssessment] =
    useState("");

  const [showAssessmentForm, setShowAssessmentForm] =
    useState(true);

  useEffect(() => {
    loadReport();
    loadAssessments();
  }, []);

  async function loadReport() {
    setLoading(true);
    setError("");

    const startDate = `${year}-${String(month).padStart(
      2,
      "0"
    )}-01`;

    const lastDay = new Date(
      Number(year),
      Number(month),
      0
    ).getDate();

    const endDate = `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(lastDay).padStart(2, "0")}`;

    const {
      data: studentsData,
      error: studentsError,
    } = await supabase
      .from("students")
      .select(
        "id, student_name, student_username"
      )
      .order("student_name", {
        ascending: true,
      });

    if (studentsError) {
      setError(studentsError.message);
      setLoading(false);
      return;
    }

    const {
      data: attendanceData,
      error: attendanceError,
    } = await supabase
      .from("attendance")
      .select("*")
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .order("attendance_date", {
        ascending: true,
      });

    if (attendanceError) {
      setError(attendanceError.message);
      setLoading(false);
      return;
    }

    setStudents(studentsData || []);
    setAttendance(attendanceData || []);

    setStudentMarks(
      (studentsData || []).map((student) => ({
        studentId: student.id,
        obtainedMarks: "",
        remarks: "",
      }))
    );

    setLoading(false);
  }

  async function loadAssessments() {
    const {
      data,
      error: assessmentFetchError,
    } = await supabase
      .from("academy_assessments")
      .select("*")
      .order("test_date", {
        ascending: false,
      })
      .order("test_name", {
        ascending: true,
      });

    if (assessmentFetchError) {
      setAssessmentError(
        assessmentFetchError.message
      );
      return;
    }

    setAssessments(data || []);
  }

  function updateStudentMarks(
    studentId: number,
    value: string
  ) {
    setStudentMarks((current) =>
      current.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              obtainedMarks: value,
            }
          : item
      )
    );
  }

  function updateStudentRemarks(
    studentId: number,
    value: string
  ) {
    setStudentMarks((current) =>
      current.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              remarks: value,
            }
          : item
      )
    );
  }

  function resetAssessmentForm() {
    setTestName("");
    setTestDate(
      new Date().toISOString().split("T")[0]
    );
    setTotalMarks("");

    setStudentMarks(
      students.map((student) => ({
        studentId: student.id,
        obtainedMarks: "",
        remarks: "",
      }))
    );

    setSelectedAssessment("");
    setAssessmentError("");
    setAssessmentMessage("");
  }

  async function saveAssessment() {
    setAssessmentMessage("");
    setAssessmentError("");

    const trimmedName = testName.trim();
    const total = Number(totalMarks);

    if (!trimmedName) {
      setAssessmentError(
        "Please Assessment/Test Name enter karein."
      );
      return;
    }

    if (!testDate) {
      setAssessmentError(
        "Please Test Date select karein."
      );
      return;
    }

    if (!total || total <= 0) {
      setAssessmentError(
        "Total Marks 0 se greater hona chahiye."
      );
      return;
    }

    if (students.length === 0) {
      setAssessmentError(
        "Koi student record nahi mila."
      );
      return;
    }

    const invalidMarks = studentMarks.find(
      (item) => {
        const value = Number(
          item.obtainedMarks
        );

        return (
          item.obtainedMarks.trim() === "" ||
          Number.isNaN(value) ||
          value < 0 ||
          value > total
        );
      }
    );

    if (invalidMarks) {
      const student = students.find(
        (item) =>
          item.id === invalidMarks.studentId
      );

      setAssessmentError(
        `${
          student?.student_name ||
          student?.student_username ||
          "Student"
        } ke obtained marks valid nahi hain.`
      );
      return;
    }

    setAssessmentLoading(true);

    try {
      if (selectedAssessment) {
        const existingRows =
          assessments.filter(
            (item) =>
              item.test_name === trimmedName &&
              item.test_date === testDate
          );

        const deleteIds = existingRows.map(
          (item) => item.id
        );

        if (deleteIds.length > 0) {
          const {
            error: deleteError,
          } = await supabase
            .from("academy_assessments")
            .delete()
            .in("id", deleteIds);

          if (deleteError) {
            throw deleteError;
          }
        }
      }

      const rows = studentMarks.map(
        (item) => ({
          test_name: trimmedName,
          test_date: testDate,
          total_marks: total,
          student_id: item.studentId,
          obtained_marks: Number(
            item.obtainedMarks
          ),
          remarks:
            item.remarks.trim() || null,
        })
      );

      const {
        error: insertError,
      } = await supabase
        .from("academy_assessments")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }

      setAssessmentMessage(
        selectedAssessment
          ? "Assessment successfully updated."
          : "Assessment successfully saved."
      );

      await loadAssessments();

      resetAssessmentForm();
    } catch (err) {
      console.error(
        "Assessment save error:",
        err
      );

      setAssessmentError(
        err instanceof Error
          ? err.message
          : "Assessment save nahi ho saka."
      );
    } finally {
      setAssessmentLoading(false);
    }
  }

  function editAssessment(
    assessmentName: string,
    assessmentDate: string
  ) {
    const rows = assessments.filter(
      (item) =>
        item.test_name === assessmentName &&
        item.test_date === assessmentDate
    );

    if (rows.length === 0) return;

    const first = rows[0];

    setTestName(first.test_name);
    setTestDate(first.test_date);
    setTotalMarks(
      String(first.total_marks)
    );

    setStudentMarks(
      students.map((student) => {
        const row = rows.find(
          (item) =>
            item.student_id === student.id
        );

        return {
          studentId: student.id,
          obtainedMarks: row
            ? String(row.obtained_marks)
            : "",
          remarks: row?.remarks || "",
        };
      })
    );

    setSelectedAssessment(
      `${assessmentName}__${assessmentDate}`
    );

    setShowAssessmentForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteAssessment(
    assessmentName: string,
    assessmentDate: string
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${assessmentName}" assessment?`
    );

    if (!confirmed) return;

    setAssessmentError("");
    setAssessmentMessage("");

    const {
      error: deleteError,
    } = await supabase
      .from("academy_assessments")
      .delete()
      .eq("test_name", assessmentName)
      .eq("test_date", assessmentDate);

    if (deleteError) {
      setAssessmentError(
        deleteError.message
      );
      return;
    }

    setAssessmentMessage(
      "Assessment successfully deleted."
    );

    await loadAssessments();
  }

  const assessmentGroups = useMemo(() => {
    const groups = new Map<
      string,
      AssessmentRow[]
    >();

    assessments.forEach((item) => {
      const key = `${item.test_name}__${item.test_date}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(item);
    });

    return Array.from(groups.values());
  }, [assessments]);

  const totalPresent = attendance.filter(
    (record) => isPresent(record.status)
  ).length;

  const totalAbsent = attendance.filter(
    (record) => isAbsent(record.status)
  ).length;

  const totalRecords = attendance.length;

  const overallPercentage =
    totalRecords > 0
      ? (totalPresent / totalRecords) * 100
      : 0;

  const reportData = useMemo(() => {
    return students.map((student) => {
      const records = attendance.filter(
        (record) =>
          record.student_id === student.id
      );

      const present = records.filter(
        (record) =>
          isPresent(record.status)
      ).length;

      const absent = records.filter(
        (record) =>
          isAbsent(record.status)
      ).length;

      const total = records.length;

      const percentage =
        total > 0
          ? (present / total) * 100
          : 0;

      return {
        student,
        total,
        present,
        absent,
        percentage,
      };
    });
  }, [students, attendance]);

  function getStudentName(studentId: number) {
    const student = students.find(
      (item) =>
        item.id === studentId
    );

    if (!student) {
      return "Unknown Student";
    }

    return (
      student.student_name ||
      student.student_username
    );
  }

  function getPercentageColor(
    percentage: number
  ) {
    if (percentage >= 75) {
      return "#166534";
    }

    if (percentage >= 50) {
      return "#92400e";
    }

    return "#991b1b";
  }

  function exportCSV() {
    const headers = [
      "Student Name",
      "Username",
      "Total Classes",
      "Present",
      "Absent",
      "Attendance %",
    ];

    const rows = reportData.map(
      (item) => [
        item.student.student_name ||
          item.student.student_username,
        item.student.student_username,
        item.total,
        item.present,
        item.absent,
        `${item.percentage.toFixed(1)}%`,
      ]
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `attendance-report-${year}-${String(
        month
      ).padStart(2, "0")}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportAssessmentCSV(
    rows: AssessmentRow[]
  ) {
    const headers = [
      "Student Name",
      "Username",
      "Test Name",
      "Test Date",
      "Total Marks",
      "Obtained Marks",
      "Percentage",
      "Grade",
      "Result",
      "Remarks",
    ];

    const csvRows = rows.map(
      (item) => {
        const student = students.find(
          (s) =>
            s.id === item.student_id
        );

        const percentage =
          getPercentage(
            Number(item.obtained_marks),
            Number(item.total_marks)
          );

        return [
          student?.student_name ||
            student?.student_username ||
            "Unknown Student",
          student?.student_username || "",
          item.test_name,
          item.test_date,
          item.total_marks,
          item.obtained_marks,
          `${percentage.toFixed(1)}%`,
          getGrade(percentage),
          isPass(percentage)
            ? "PASS"
            : "FAIL",
          item.remarks || "",
        ];
      }
    );

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "racer-academy-assessments.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          📊 Loading Reports...
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
            <div style={styles.brand}>
              RACER ACADEMY
            </div>

            <h1 style={styles.title}>
              📊 Teacher Reports
            </h1>

            <p style={styles.subtitle}>
              Attendance, assessments and
              student performance reports
            </p>
          </div>

          <a
            href="/teacher"
            style={styles.backButton}
          >
            ← Teacher Dashboard
          </a>
        </header>

        {/* ATTENDANCE FILTER */}

        <section style={styles.filterCard}>
          <div>
            <h2 style={styles.sectionTitle}>
              📅 Attendance Report
            </h2>

            <p style={styles.sectionSubtitle}>
              Select month and year
            </p>
          </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>
                Month
              </label>

              <select
                value={month}
                onChange={(e) =>
                  setMonth(e.target.value)
                }
                style={styles.input}
              >
                {months.map(
                  (item, index) => (
                    <option
                      key={item}
                      value={index + 1}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Year
              </label>

              <select
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
                style={styles.input}
              >
                {[
                  currentDate.getFullYear() - 1,
                  currentDate.getFullYear(),
                  currentDate.getFullYear() + 1,
                ].map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadReport}
              style={styles.generateButton}
            >
              🔄 Generate Report
            </button>

            <button
              onClick={exportCSV}
              style={styles.exportButton}
            >
              📥 Export CSV
            </button>
          </div>

          {error && (
            <div style={styles.error}>
              ❌ {error}
            </div>
          )}
        </section>

        {/* SUMMARY */}

        <section style={styles.summaryGrid}>
          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5)",
            }}
          >
            <div style={styles.summaryIcon}>
              👨‍🎓
            </div>

            <div style={styles.summaryLabel}>
              Total Students
            </div>

            <div style={styles.summaryValue}>
              {students.length}
            </div>
          </div>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#16a34a,#15803d)",
            }}
          >
            <div style={styles.summaryIcon}>
              ✅
            </div>

            <div style={styles.summaryLabel}>
              Present
            </div>

            <div style={styles.summaryValue}>
              {totalPresent}
            </div>
          </div>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#dc2626,#b91c1c)",
            }}
          >
            <div style={styles.summaryIcon}>
              ❌
            </div>

            <div style={styles.summaryLabel}>
              Absent
            </div>

            <div style={styles.summaryValue}>
              {totalAbsent}
            </div>
          </div>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#7c3aed,#9333ea)",
            }}
          >
            <div style={styles.summaryIcon}>
              📈
            </div>

            <div style={styles.summaryLabel}>
              Overall Attendance
            </div>

            <div style={styles.summaryValue}>
              {overallPercentage.toFixed(1)}%
            </div>
          </div>
        </section>

        {/* STUDENT ATTENDANCE */}

        <section style={styles.card}>
          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                👨‍🎓 Student-wise Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[
                  Number(month) - 1
                ]}{" "}
                {year}
              </p>
            </div>

            <div style={styles.recordCount}>
              {reportData.length} Students
            </div>
          </div>

          {reportData.length === 0 ? (
            <div style={styles.empty}>
              No students found.
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>
                      Student
                    </th>
                    <th style={styles.th}>
                      Username
                    </th>
                    <th style={styles.th}>
                      Total Classes
                    </th>
                    <th style={styles.th}>
                      Present
                    </th>
                    <th style={styles.th}>
                      Absent
                    </th>
                    <th style={styles.th}>
                      Attendance %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reportData.map(
                    (item, index) => (
                      <tr
                        key={
                          item.student.id
                        }
                      >
                        <td style={styles.td}>
                          {index + 1}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {item.student
                              .student_name ||
                              item.student
                                .student_username}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          {
                            item.student
                              .student_username
                          }
                        </td>

                        <td style={styles.td}>
                          {item.total}
                        </td>

                        <td style={styles.present}>
                          {item.present}
                        </td>

                        <td style={styles.absent}>
                          {item.absent}
                        </td>

                        <td style={styles.td}>
                          <div
                            style={
                              styles.percentageWrapper
                            }
                          >
                            <div
                              style={
                                styles.progressBackground
                              }
                            >
                              <div
                                style={{
                                  ...styles.progressBar,
                                  width: `${Math.min(
                                    item.percentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <strong
                              style={{
                                color:
                                  getPercentageColor(
                                    item.percentage
                                  ),
                              }}
                            >
                              {item.percentage.toFixed(
                                1
                              )}
                              %
                            </strong>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RACER ACADEMY ASSESSMENTS */}

        <section style={styles.assessmentCard}>
          <div style={styles.assessmentHeader}>
            <div>
              <div style={styles.assessmentBrand}>
                RACER ACADEMY
              </div>

              <h2 style={styles.assessmentTitle}>
                🏆 Academy Assessments
              </h2>

              <p style={styles.assessmentSubtitle}>
                Tests, marks, percentage, grade and
                result management
              </p>
            </div>

            <button
              onClick={() => {
                resetAssessmentForm();
                setShowAssessmentForm(
                  !showAssessmentForm
                );
              }}
              style={styles.assessmentToggle}
            >
              {showAssessmentForm
                ? "Hide Form"
                : "➕ Add Assessment"}
            </button>
          </div>

          {assessmentError && (
            <div style={styles.error}>
              ❌ {assessmentError}
            </div>
          )}

          {assessmentMessage && (
            <div style={styles.success}>
              ✅ {assessmentMessage}
            </div>
          )}

          {showAssessmentForm && (
            <div style={styles.formBox}>
              <h3 style={styles.formTitle}>
                📝 Create / Update Assessment
              </h3>

              <div style={styles.assessmentFormGrid}>
                <div>
                  <label style={styles.label}>
                    Test / Assessment Name
                  </label>

                  <input
                    type="text"
                    value={testName}
                    onChange={(e) =>
                      setTestName(
                        e.target.value
                      )
                    }
                    placeholder="Example: Weekly Test 01"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Test Date
                  </label>

                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) =>
                      setTestDate(
                        e.target.value
                      )
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Total Marks
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={totalMarks}
                    onChange={(e) =>
                      setTotalMarks(
                        e.target.value
                      )
                    }
                    placeholder="Example: 50"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.infoBox}>
                💡 <strong>Automatic:</strong>{" "}
                Percentage, Grade and PASS/FAIL
                will be calculated automatically.
              </div>

              {students.length === 0 ? (
                <div style={styles.empty}>
                  No students found.
                </div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table
                    style={styles.assessmentTable}
                  >
                    <thead>
                      <tr>
                        <th style={styles.th}>
                          #
                        </th>

                        <th style={styles.th}>
                          Student
                        </th>

                        <th style={styles.th}>
                          Username
                        </th>

                        <th style={styles.th}>
                          Total
                        </th>

                        <th style={styles.th}>
                          Obtained
                        </th>

                        <th style={styles.th}>
                          Percentage
                        </th>

                        <th style={styles.th}>
                          Grade
                        </th>

                        <th style={styles.th}>
                          Result
                        </th>

                        <th style={styles.th}>
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {students.map(
                        (student, index) => {
                          const mark =
                            studentMarks.find(
                              (item) =>
                                item.studentId ===
                                student.id
                            );

                          const obtained =
                            Number(
                              mark?.obtainedMarks ||
                                0
                            );

                          const total =
                            Number(
                              totalMarks || 0
                            );

                          const percentage =
                            getPercentage(
                              obtained,
                              total
                            );

                          const grade =
                            getGrade(
                              percentage
                            );

                          return (
                            <tr
                              key={
                                student.id
                              }
                            >
                              <td
                                style={
                                  styles.td
                                }
                              >
                                {index + 1}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <strong>
                                  {student.student_name ||
                                    student.student_username}
                                </strong>
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {
                                  student.student_username
                                }
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {totalMarks ||
                                  "—"}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max={
                                    totalMarks ||
                                    undefined
                                  }
                                  value={
                                    mark?.obtainedMarks ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateStudentMarks(
                                      student.id,
                                      e.target.value
                                    )
                                  }
                                  style={
                                    styles.marksInput
                                  }
                                />
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <strong>
                                  {total > 0
                                    ? `${percentage.toFixed(
                                        1
                                      )}%`
                                    : "—"}
                                </strong>
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <span
                                  style={{
                                    ...styles.gradeBadge,
                                    background:
                                      grade ===
                                      "F"
                                        ? "#fee2e2"
                                        : "#dcfce7",
                                    color:
                                      grade ===
                                      "F"
                                        ? "#991b1b"
                                        : "#166534",
                                  }}
                                >
                                  {total > 0
                                    ? grade
                                    : "—"}
                                </span>
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <span
                                  style={{
                                    ...styles.resultBadge,
                                    background:
                                      total > 0 &&
                                      isPass(
                                        percentage
                                      )
                                        ? "#dcfce7"
                                        : "#fee2e2",
                                    color:
                                      total > 0 &&
                                      isPass(
                                        percentage
                                      )
                                        ? "#166534"
                                        : "#991b1b",
                                  }}
                                >
                                  {total > 0
                                    ? isPass(
                                        percentage
                                      )
                                      ? "PASS"
                                      : "FAIL"
                                    : "—"}
                                </span>
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <input
                                  type="text"
                                  value={
                                    mark?.remarks ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateStudentRemarks(
                                      student.id,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Optional"
                                  style={
                                    styles.remarksInput
                                  }
                                />
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={styles.formActions}>
                <button
                  onClick={saveAssessment}
                  disabled={
                    assessmentLoading
                  }
                  style={
                    styles.saveAssessmentButton
                  }
                >
                  {assessmentLoading
                    ? "Saving..."
                    : selectedAssessment
                    ? "💾 Update Assessment"
                    : "💾 Save Assessment"}
                </button>

                <button
                  onClick={
                    resetAssessmentForm
                  }
                  style={styles.cancelButton}
                >
                  ↻ Clear
                </button>
              </div>
            </div>
          )}

          {/* SAVED ASSESSMENTS */}

          <div style={styles.savedSection}>
            <div style={styles.savedHeader}>
              <div>
                <h3
                  style={styles.savedTitle}
                >
                  📚 Saved Assessments
                </h3>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  All RACER ACADEMY tests
                </p>
              </div>

              {assessments.length > 0 && (
                <button
                  onClick={() =>
                    exportAssessmentCSV(
                      assessments
                    )
                  }
                  style={styles.exportAssessment}
                >
                  📥 Export Assessments
                </button>
              )}
            </div>

            {assessmentGroups.length === 0 ? (
              <div style={styles.empty}>
                📭 No assessments added yet.
              </div>
            ) : (
              <div style={styles.savedList}>
                {assessmentGroups.map(
                  (group) => {
                    const first = group[0];

                    const total =
                      Number(
                        first.total_marks
                      );

                    const totalObtained =
                      group.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.obtained_marks
                          ),
                        0
                      );

                    const average =
                      group.length > 0 &&
                      total > 0
                        ? (totalObtained /
                            (total *
                              group.length)) *
                          100
                        : 0;

                    return (
                      <div
                        key={`${first.test_name}-${first.test_date}`}
                        style={
                          styles.savedCard
                        }
                      >
                        <div>
                          <h4
                            style={
                              styles.savedTestName
                            }
                          >
                            📝 {first.test_name}
                          </h4>

                          <div
                            style={
                              styles.savedMeta
                            }
                          >
                            📅{" "}
                            {first.test_date}
                            {"  •  "}
                            🎯 Total Marks:{" "}
                            {total}
                            {"  •  "}
                            👨‍🎓 Students:{" "}
                            {group.length}
                            {"  •  "}
                            📈 Average:{" "}
                            {average.toFixed(
                              1
                            )}
                            %
                          </div>
                        </div>

                        <div
                          style={
                            styles.savedActions
                          }
                        >
                          <button
                            onClick={() =>
                              editAssessment(
                                first.test_name,
                                first.test_date
                              )
                            }
                            style={
                              styles.editButton
                            }
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteAssessment(
                                first.test_name,
                                first.test_date
                              )
                            }
                            style={
                              styles.deleteButton
                            }
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* GRADE INFO */}

          <div style={styles.gradeInfo}>
            <h3 style={styles.gradeInfoTitle}>
              🎓 Grade System
            </h3>

            <div style={styles.gradeGrid}>
              {[
                ["90–100%", "A+", "PASS"],
                ["80–89%", "A", "PASS"],
                ["70–79%", "B+", "PASS"],
                ["60–69%", "B", "PASS"],
                ["50–59%", "C", "PASS"],
                ["40–49%", "D", "PASS"],
                ["Below 40%", "F", "FAIL"],
              ].map((item) => (
                <div
                  key={item[1]}
                  style={styles.gradeInfoItem}
                >
                  <strong>
                    {item[0]}
                  </strong>

                  <span>
                    Grade {item[1]}
                  </span>

                  <small
                    style={{
                      color:
                        item[2] === "PASS"
                          ? "#166534"
                          : "#991b1b",
                      fontWeight: 800,
                    }}
                  >
                    {item[2]}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ATTENDANCE RECORDS */}

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            📚 Attendance Records
          </h2>

          <p style={styles.sectionSubtitle}>
            All attendance entries for the
            selected month
          </p>

          {attendance.length === 0 ? (
            <div style={styles.empty}>
              No attendance records found
              for this month.
            </div>
          ) : (
            <div style={styles.recordGrid}>
              {attendance.map((record) => (
                <div
                  key={record.id}
                  style={styles.recordCard}
                >
                  <div>
                    <strong
                      style={
                        styles.recordName
                      }
                    >
                      {getStudentName(
                        record.student_id
                      )}
                    </strong>

                    <p
                      style={
                        styles.recordDate
                      }
                    >
                      📅{" "}
                      {record.attendance_date}
                    </p>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background:
                        isPresent(
                          record.status
                        )
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        isPresent(
                          record.status
                        )
                          ? "#166534"
                          : "#991b1b",
                    }}
                  >
                    {isPresent(
                      record.status
                    )
                      ? "✓ PRESENT"
                      : "✕ ABSENT"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          RACER ACADEMY • Teacher Reports •{" "}
          {year}
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
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "25px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  brand: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  title: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  backButton: {
    textDecoration: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
  },

  filterCard: {
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "12px",
    marginTop: "20px",
    alignItems: "end",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#111827",
    fontSize: "14px",
  },

  generateButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  exportButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  error: {
    marginTop: "15px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "600",
  },

  success: {
    marginTop: "15px",
    background: "#ecfdf5",
    color: "#047857",
    border:
      "1px solid #a7f3d0",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "600",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  summaryCard: {
    color: "white",
    padding: "22px",
    borderRadius: "18px",
    boxShadow:
      "0 8px 22px rgba(15,23,42,0.12)",
  },

  summaryIcon: {
    fontSize: "28px",
  },

  summaryLabel: {
    marginTop: "9px",
    fontSize: "13px",
    opacity: 0.9,
  },

  summaryValue: {
    marginTop: "4px",
    fontSize: "28px",
    fontWeight: "800",
  },

  card: {
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  recordCount: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "9px 13px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    marginTop: "20px",
  },

  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
  },

  assessmentTable: {
    width: "100%",
    minWidth: "1150px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "13px",
    textAlign: "left",
    borderBottom:
      "2px solid #dbeafe",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  present: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#166534",
    fontWeight: "800",
  },

  absent: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#991b1b",
    fontWeight: "800",
  },

  percentageWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "150px",
  },

  progressBackground: {
    width: "90px",
    height: "8px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background:
      "linear-gradient(90deg,#2563eb,#4f46e5)",
    borderRadius: "999px",
  },

  /* ASSESSMENT */

  assessmentCard: {
    background: "white",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.10)",
    border:
      "1px solid #dbeafe",
  },

  assessmentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    paddingBottom: "20px",
    borderBottom:
      "1px solid #e2e8f0",
  },

  assessmentBrand: {
    color: "#7c3aed",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  assessmentTitle: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "25px",
    fontWeight: "900",
  },

  assessmentSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  assessmentToggle: {
    border: "none",
    background:
      "linear-gradient(135deg,#7c3aed,#4f46e5)",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  formBox: {
    marginTop: "20px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
  },

  formTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "19px",
    fontWeight: "800",
  },

  assessmentFormGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "14px",
    marginTop: "18px",
  },

  infoBox: {
    marginTop: "15px",
    background: "#eff6ff",
    color: "#1e3a8a",
    border:
      "1px solid #bfdbfe",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "13px",
  },

  marksInput: {
    width: "100px",
    boxSizing: "border-box",
    padding: "9px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "white",
    color: "#111827",
    fontWeight: "700",
  },

  remarksInput: {
    width: "150px",
    boxSizing: "border-box",
    padding: "9px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "white",
    color: "#111827",
  },

  gradeBadge: {
    display: "inline-block",
    minWidth: "38px",
    textAlign: "center",
    padding: "7px 9px",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "12px",
  },

  resultBadge: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "20px",
  },

  saveAssessmentButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "white",
    padding: "13px 20px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  cancelButton: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#334155",
    padding: "13px 20px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  savedSection: {
    marginTop: "25px",
  },

  savedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "15px",
  },

  savedTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "19px",
    fontWeight: "800",
  },

  exportAssessment: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  savedList: {
    display: "grid",
    gap: "12px",
  },

  savedCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  savedTestName: {
    margin: 0,
    color: "#172554",
    fontSize: "16px",
  },

  savedMeta: {
    marginTop: "7px",
    color: "#64748b",
    fontSize: "12px",
  },

  savedActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  editButton: {
    border: "none",
    background: "#dbeafe",
    color: "#1e3a8a",
    padding: "9px 13px",
    borderRadius: "8px",
    fontWeight: "800",
    cursor: "pointer",
  },

  deleteButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "9px 13px",
    borderRadius: "8px",
    fontWeight: "800",
    cursor: "pointer",
  },

  gradeInfo: {
    marginTop: "25px",
    background:
      "linear-gradient(135deg,#f5f3ff,#eff6ff)",
    border:
      "1px solid #ddd6fe",
    borderRadius: "15px",
    padding: "18px",
  },

  gradeInfoTitle: {
    margin: 0,
    color: "#312e81",
    fontSize: "17px",
    fontWeight: "800",
  },

  gradeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(130px,1fr))",
    gap: "10px",
    marginTop: "14px",
  },

  gradeInfoItem: {
    background: "white",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    color: "#475569",
  },

  recordGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "12px",
    marginTop: "20px",
  },

  recordCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    background: "#f8fafc",
  },

  recordName: {
    color: "#172554",
    fontSize: "14px",
  },

  recordDate: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  statusBadge: {
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#64748b",
  },

  loading: {
    background: "white",
    maxWidth: "450px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "18px",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
    padding: "10px",
  },
};