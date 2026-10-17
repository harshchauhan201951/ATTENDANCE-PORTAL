"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  admission_date: string | null;
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
  subject: "English" | "Mathematics";
  attendance_status: "PRESENT" | "ABSENT" | "NO_TEST";
  test_images: unknown;
};

type StudentMark = {
  studentId: number;
  subject: "English" | "Mathematics";
  obtainedMarks: string;
  remarks: string;
  attendanceStatus: "PRESENT" | "ABSENT" | "NO_TEST";
  testImages: string[];
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
  const value = String(status || "").toLowerCase();
  return value === "present" || value === "p";
}

function isAbsent(status: string) {
  const value = String(status || "").toLowerCase();
  return value === "absent" || value === "a";
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

function getImageUrls(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => getImageUrls(item))
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const item = value as {
      url?: unknown;
      path?: unknown;
    };

    if (typeof item.url === "string") {
      return item.url.trim() ? [item.url.trim()] : [];
    }

    if (typeof item.path === "string") {
      return item.path.trim() ? [item.path.trim()] : [];
    }

    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (parsed !== value) {
        return getImageUrls(parsed);
      }
    } catch {
      // Normal URL/string.
    }

    return [trimmed];
  }

  return [];
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function waitForImagesToLoad(printWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    const images = Array.from(printWindow.document.images);

    if (images.length === 0) {
      resolve();
      return;
    }

    let completed = 0;
    let resolved = false;

    const finish = () => {
      completed += 1;

      if (completed >= images.length && !resolved) {
        resolved = true;
        resolve();
      }
    };

    images.forEach((image) => {
      if (image.complete) {
        finish();
      } else {
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 7000);
  });
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
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  const [error, setError] = useState("");
  const [assessmentMessage, setAssessmentMessage] = useState("");
  const [assessmentError, setAssessmentError] = useState("");

  const [testName, setTestName] = useState("");

  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [totalMarks, setTotalMarks] = useState("");

  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);

  const [selectedAssessment, setSelectedAssessment] = useState("");

  const [showAssessmentForm, setShowAssessmentForm] = useState(true);
  const [activeReportSection, setActiveReportSection] = useState<"attendance-report" | "student-attendance" | "academy" | "assessment-create" | "saved-assessments" | "attendance-records">("attendance-report");
  const [reportMenuOpen, setReportMenuOpen] = useState(true);
  const [assessmentStudentIndex, setAssessmentStudentIndex] = useState(0);
  const [showAssessmentRemark, setShowAssessmentRemark] = useState(false);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<number | null>(null);
  const [studentDetailMonth, setStudentDetailMonth] = useState(String(currentDate.getMonth() + 1));
  const [studentDetailYear, setStudentDetailYear] = useState(String(currentDate.getFullYear()));
  const [studentDetailAttendance, setStudentDetailAttendance] = useState<Attendance[]>([]);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [expandedTestWeek, setExpandedTestWeek] = useState<string | null>(null);

  useEffect(() => {
    void loadReport();
    void loadAssessments();
  }, []);

  useEffect(() => {
    if (selectedReportStudentId === null) return;
    const start = `${studentDetailYear}-${String(studentDetailMonth).padStart(2, "0")}-01`;
    const end = new Date(Number(studentDetailYear), Number(studentDetailMonth), 0).getDate();
    let active = true;
    setStudentDetailAttendance([]);
    setStudentDetailLoading(true);
    void (async () => {
      try {
        const { data, error: detailError } = await supabase.from("attendance").select("id, student_id, attendance_date, status")
          .eq("student_id", selectedReportStudentId).gte("attendance_date", start)
          .lte("attendance_date", `${studentDetailYear}-${String(studentDetailMonth).padStart(2, "0")}-${String(end).padStart(2, "0")}`)
          .order("attendance_date", { ascending: false });
        if (!active) return;
        if (detailError) setError(detailError.message);
        else setStudentDetailAttendance((data || []) as Attendance[]);
      } finally { if (active) setStudentDetailLoading(false); }
    })();
    return () => { active = false; };
  }, [selectedReportStudentId, studentDetailMonth, studentDetailYear]);

  async function loadReport() {
    setLoading(true);
    setError("");

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

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
        "id, student_name, student_username, admission_date"
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

    const loadedStudents = (studentsData || []) as Student[];

    setStudents(loadedStudents);

    setAttendance(
      (attendanceData || []) as Attendance[]
    );

    setStudentMarks(
      loadedStudents.map((student) => ({
        studentId: student.id,
        subject: "Mathematics",
        obtainedMarks: "",
        remarks: "",
        attendanceStatus: "PRESENT",
        testImages: [],
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

    setAssessments(
      (data || []) as AssessmentRow[]
    );
  }

  function isStudentEligibleForTest(
    student: Student,
    date: string
  ) {
    if (!student.admission_date) return true;
    return student.admission_date <= date;
  }

  const eligibleStudents = useMemo(() => {
    return students.filter((student) =>
      isStudentEligibleForTest(student, testDate)
    );
  }, [students, testDate]);

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

  function updateStudentSubject(
    studentId: number,
    value: "English" | "Mathematics"
  ) {
    setStudentMarks((current) =>
      current.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              subject: value,
            }
          : item
      )
    );
  }

  function updateStudentAttendance(
    studentId: number,
    value: "PRESENT" | "ABSENT" | "NO_TEST"
  ) {
    setStudentMarks((current) =>
      current.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              attendanceStatus: value,
              obtainedMarks:
                value === "PRESENT"
                  ? item.obtainedMarks
                  : "",
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

  async function uploadTestImages(
    studentId: number,
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;

    setAssessmentError("");
    setAssessmentMessage("");

    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        const extension =
          file.name.split(".").pop() || "jpg";

        const safeExtension =
          extension
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") || "jpg";

        const fileName = `${studentId}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${safeExtension}`;

        const filePath = `tests/${fileName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("test-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("test-images")
          .getPublicUrl(filePath);

        const publicUrl =
          publicUrlData?.publicUrl;

        if (!publicUrl) {
          throw new Error(
            "Uploaded image ka public URL nahi mila."
          );
        }

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length === 0) {
        setAssessmentError(
          "Koi valid image upload nahi hui."
        );
        return;
      }

      setStudentMarks((current) =>
        current.map((item) =>
          item.studentId === studentId
            ? {
                ...item,
                testImages: [
                  ...item.testImages,
                  ...uploadedUrls,
                ],
              }
            : item
        )
      );

      setAssessmentMessage(
        `${uploadedUrls.length} test image(s) uploaded successfully. Save Assessment par click karke images result ke saath save karein.`
      );
    } catch (err) {
      console.error(
        "Test image upload error:",
        err
      );

      setAssessmentError(
        err instanceof Error
          ? err.message
          : "Test images upload nahi ho paayi."
      );
    }
  }

  function removeTestImage(
    studentId: number,
    imageUrl: string
  ) {
    setStudentMarks((current) =>
      current.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              testImages: item.testImages.filter(
                (url) => url !== imageUrl
              ),
            }
          : item
      )
    );
  }

  function resetAssessmentForm() {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    setTestName("");
    setAssessmentStudentIndex(0);
    setShowAssessmentRemark(false);
    setTestDate(today);
    setTotalMarks("");

    setStudentMarks(
      students
        .filter((student) =>
          isStudentEligibleForTest(
            student,
            today
          )
        )
        .map((student) => ({
          studentId: student.id,
          subject: "Mathematics",
          obtainedMarks: "",
          remarks: "",
          attendanceStatus: "PRESENT",
          testImages: [],
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

    if (eligibleStudents.length === 0) {
      setAssessmentError(
        "Is test date ke liye koi eligible student nahi mila."
      );
      return;
    }

    const eligibleIds = new Set(
      eligibleStudents.map(
        (student) => student.id
      )
    );

    const validMarks = studentMarks.filter(
      (item) =>
        eligibleIds.has(item.studentId)
    );

    const invalidMarks = validMarks.find(
      (item) => {
        if (
          item.attendanceStatus === "ABSENT" ||
          item.attendanceStatus === "NO_TEST"
        ) {
          return false;
        }

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

        const deleteIds =
          existingRows.map(
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

      const rows = validMarks.map(
        (item) => ({
          test_name: trimmedName,
          test_date: testDate,
          total_marks: total,
          student_id: item.studentId,

          obtained_marks:
            item.attendanceStatus === "PRESENT"
              ? Number(item.obtainedMarks)
              : 0,

          remarks:
            item.remarks.trim() || null,

          subject: item.subject,

          attendance_status:
            item.attendanceStatus,

          test_images:
            Array.isArray(item.testImages)
              ? item.testImages
              : [],
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
      students
        .filter((student) =>
          isStudentEligibleForTest(
            student,
            first.test_date
          )
        )
        .map((student) => {
          const row = rows.find(
            (item) =>
              item.student_id === student.id
          );

          return {
            studentId: student.id,

            subject:
              row?.subject ||
              "Mathematics",

            obtainedMarks:
              row?.attendance_status ===
                "ABSENT" ||
              row?.attendance_status ===
                "NO_TEST"
                ? ""
                : row
                ? String(row.obtained_marks)
                : "",

            remarks: row?.remarks || "",

            attendanceStatus:
              row?.attendance_status ||
              "PRESENT",

            testImages: getImageUrls(
              row?.test_images
            ),
          };
        })
    );

    setSelectedAssessment(
      `${assessmentName}__${assessmentDate}`
    );

    setAssessmentStudentIndex(0);
    setShowAssessmentForm(true);
    setActiveReportSection("assessment-create");

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

  const assessmentWeeks = useMemo(() => {
    const weeks = new Map<string, AssessmentRow[][]>();
    assessmentGroups.forEach((group) => {
      const date = new Date(`${group[0].test_date}T00:00:00`);
      const weekday = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - weekday);
      const monday = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      weeks.set(monday, [...(weeks.get(monday) || []), group]);
    });
    return Array.from(weeks, ([startDate, groups]) => ({ startDate, groups })).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [assessmentGroups]);

  useEffect(() => {
    if (expandedTestWeek === null && assessmentWeeks.length > 0) setExpandedTestWeek(assessmentWeeks[0].startDate);
  }, [assessmentWeeks, expandedTestWeek]);

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

  const selectedReportStudent = students.find((student) => student.id === selectedReportStudentId) || null;

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

  function exportSelectedStudentAttendance() {
    const student = students.find((item) => item.id === selectedReportStudentId);
    if (!student) return;
    const rows = [["Date", "Student", "Username", "Status"], ...studentDetailAttendance.map((record) => [record.attendance_date, student.student_name || "Student", student.student_username, record.status])];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance-${student.student_username}-${studentDetailYear}-${studentDetailMonth}.xlsx`);
  }

  function exportAssessmentCSV(
    rows: AssessmentRow[]
  ) {
    const headers = [
      "Student Name",
      "Username",
      "Test Name",
      "Test Date",
      "Subject",
      "Attendance",
      "Total Marks",
      "Obtained Marks",
      "Percentage",
      "Grade",
      "Result",
      "Remarks",
      "Test Images",
    ];

    const csvRows = rows.map(
      (item) => {
        const student = students.find(
          (s) =>
            s.id === item.student_id
        );

        const isAbsentStudent =
          item.attendance_status ===
          "ABSENT";

        const isNoTestStudent =
          item.attendance_status ===
          "NO_TEST";

        const percentage =
          !isAbsentStudent &&
          !isNoTestStudent
            ? getPercentage(
                Number(item.obtained_marks),
                Number(item.total_marks)
              )
            : 0;

        return [
          student?.student_name ||
            student?.student_username ||
            "Unknown Student",

          student?.student_username || "",

          item.test_name,
          item.test_date,
          item.subject,
          item.attendance_status,

          isAbsentStudent || isNoTestStudent
            ? ""
            : item.total_marks,

          isAbsentStudent || isNoTestStudent
            ? ""
            : item.obtained_marks,

          isAbsentStudent || isNoTestStudent
            ? ""
            : `${percentage.toFixed(1)}%`,

          isAbsentStudent || isNoTestStudent
            ? ""
            : getGrade(percentage),

          isAbsentStudent
            ? "ABSENT"
            : isNoTestStudent
            ? "NO TEST"
            : isPass(percentage)
            ? "PASS"
            : "FAIL",

          item.remarks || "",

          getImageUrls(item.test_images).join(
            " | "
          ),
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

  function downloadStudentResult(
    studentId: number,
    testNameValue: string,
    testDateValue: string
  ) {
    const rows = assessments.filter(
      (item) =>
        item.student_id === studentId &&
        item.test_name === testNameValue &&
        item.test_date === testDateValue
    );

    if (rows.length === 0) {
      window.alert(
        "Is student ka result nahi mila."
      );
      return;
    }

    const student = students.find(
      (item) => item.id === studentId
    );

    const printWindow =
      window.open("", "_blank");

    if (!printWindow) {
      window.alert(
        "Popup blocked hai. Please browser me popup allow karein."
      );
      return;
    }

    const resultRows = rows
      .map((item) => {
        const isAbsentStudent =
          item.attendance_status ===
          "ABSENT";

        const isNoTestStudent =
          item.attendance_status ===
          "NO_TEST";

        const percentage =
          !isAbsentStudent &&
          !isNoTestStudent
            ? getPercentage(
                Number(item.obtained_marks),
                Number(item.total_marks)
              )
            : 0;

        return `
          <tr>
            <td>${escapeHtml(item.subject)}</td>
            <td>${
              isAbsentStudent
                ? "ABSENT"
                : isNoTestStudent
                ? "NO TEST"
                : "PRESENT"
            }</td>
            <td>${
              isAbsentStudent || isNoTestStudent
                ? "—"
                : escapeHtml(item.total_marks)
            }</td>
            <td>${
              isAbsentStudent || isNoTestStudent
                ? "—"
                : escapeHtml(item.obtained_marks)
            }</td>
            <td>${
              isAbsentStudent || isNoTestStudent
                ? "—"
                : `${percentage.toFixed(1)}%`
            }</td>
            <td>${
              isAbsentStudent || isNoTestStudent
                ? "—"
                : getGrade(percentage)
            }</td>
            <td>${
              isAbsentStudent
                ? "ABSENT"
                : isNoTestStudent
                ? "NO TEST"
                : isPass(percentage)
                ? "PASS"
                : "FAIL"
            }</td>
            <td>${escapeHtml(item.remarks || "")}</td>
          </tr>
        `;
      })
      .join("");

    const imageItems = rows.flatMap((row) =>
      getImageUrls(row.test_images).map(
        (imageUrl) => ({
          imageUrl,
          subject: row.subject,
          remarks: row.remarks || "",
        })
      )
    );

    const imagePages = imageItems
      .map(
        (image, index) => `
          <section class="pdf-image-page">
            <div class="image-page-header">
              <div class="brand">
                RACER ACADEMY
              </div>

              <h2>
                Checked Test Paper / Photo
              </h2>

              <div class="image-meta">
                <strong>Student:</strong>
                ${escapeHtml(
                  student?.student_name ||
                    student?.student_username ||
                    ""
                )}
              </div>

              <div class="image-meta">
                <strong>Test:</strong>
                ${escapeHtml(testNameValue)}
              </div>

              <div class="image-meta">
                <strong>Date:</strong>
                ${escapeHtml(testDateValue)}
              </div>

              <div class="image-meta">
                <strong>Subject:</strong>
                ${escapeHtml(image.subject)}
              </div>

              <div class="image-number">
                Image ${index + 1}
              </div>
            </div>

            <div class="image-container">
              <img
                src="${escapeHtml(image.imageUrl)}"
                alt="Checked test paper"
              />
            </div>

            ${
              image.remarks
                ? `
                  <div class="image-remarks">
                    <strong>Remarks:</strong>
                    ${escapeHtml(image.remarks)}
                  </div>
                `
                : ""
            }
          </section>
        `
      )
      .join("");

    const totalImageCount = imageItems.length;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <title>
            RACER ACADEMY Result -
            ${escapeHtml(
              student?.student_name ||
                student?.student_username ||
                ""
            )}
          </title>

          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              color: #111827;
            }

            .result-section {
              width: 100%;
              page-break-after: auto;
            }

            .brand {
              color: #2563eb;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 3px;
              margin-bottom: 6px;
            }

            h1 {
              color: #1e3a8a;
              margin: 0 0 12px;
              font-size: 27px;
            }

            .meta {
              margin: 6px 0;
              color: #475569;
              font-size: 13px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 11px;
            }

            th,
            td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #eff6ff;
              color: #1e3a8a;
              font-weight: 800;
            }

            .summary {
              margin-top: 18px;
              display: grid;
              grid-template-columns:
                repeat(3, 1fr);
              gap: 10px;
            }

            .summary-box {
              border: 1px solid #dbeafe;
              background: #f8fafc;
              border-radius: 9px;
              padding: 10px;
            }

            .summary-label {
              font-size: 9px;
              color: #64748b;
              text-transform: uppercase;
            }

            .summary-value {
              margin-top: 4px;
              font-size: 15px;
              font-weight: 800;
              color: #172554;
            }

            .print-button {
              margin-top: 22px;
              border: none;
              background: #1e3a8a;
              color: white;
              padding: 11px 17px;
              border-radius: 8px;
              font-weight: 800;
              cursor: pointer;
            }

            .pdf-image-page {
              break-before: page;
              page-break-before: always;

              min-height:
                calc(297mm - 24mm);

              display: flex;
              flex-direction: column;

              padding: 5px 0;
            }

            .image-page-header {
              border-bottom:
                1px solid #cbd5e1;

              padding-bottom: 10px;
              margin-bottom: 12px;
            }

            .image-page-header h2 {
              color: #172554;
              margin: 3px 0 10px;
              font-size: 20px;
            }

            .image-meta {
              color: #475569;
              font-size: 11px;
              margin-top: 3px;
            }

            .image-number {
              display: inline-block;
              margin-top: 8px;
              padding: 5px 9px;
              border-radius: 999px;
              background: #dbeafe;
              color: #1e3a8a;
              font-size: 10px;
              font-weight: 800;
            }

            .image-container {
              flex: 1;
              min-height: 0;

              display: flex;
              align-items: center;
              justify-content: center;

              width: 100%;
              overflow: hidden;

              padding: 8px;
            }

            .image-container img {
              display: block;

              max-width: 100%;
              max-height: 225mm;

              width: auto;
              height: auto;

              object-fit: contain;

              border: 1px solid #cbd5e1;
            }

            .image-remarks {
              margin-top: 10px;
              padding: 9px;

              border-radius: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;

              color: #475569;
              font-size: 11px;
            }

            @media print {
              body {
                padding: 0;
              }

              .print-button {
                display: none !important;
              }

              .pdf-image-page {
                break-before: page;
                page-break-before: always;
              }
            }
          </style>
        </head>

        <body>
          <div class="result-section">
            <div class="brand">
              RACER ACADEMY
            </div>

            <h1>
              Student Result
            </h1>

            <div class="meta">
              <strong>Student:</strong>
              ${escapeHtml(
                student?.student_name ||
                  student?.student_username ||
                  ""
              )}
            </div>

            <div class="meta">
              <strong>Username:</strong>
              ${escapeHtml(
                student?.student_username || ""
              )}
            </div>

            <div class="meta">
              <strong>Test:</strong>
              ${escapeHtml(testNameValue)}
            </div>

            <div class="meta">
              <strong>Date:</strong>
              ${escapeHtml(testDateValue)}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Attendance</th>
                  <th>Total</th>
                  <th>Obtained</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                  <th>Result</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                ${resultRows}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-box">
                <div class="summary-label">
                  Total Subjects
                </div>

                <div class="summary-value">
                  ${rows.length}
                </div>
              </div>

              <div class="summary-box">
                <div class="summary-label">
                  Uploaded Images
                </div>

                <div class="summary-value">
                  ${totalImageCount}
                </div>
              </div>

              <div class="summary-box">
                <div class="summary-label">
                  Academy
                </div>

                <div class="summary-value">
                  RACER ACADEMY
                </div>
              </div>
            </div>

            <button
              class="print-button"
              onclick="window.print()"
            >
              Print / Save as PDF
            </button>
          </div>

          ${imagePages}
        </body>
      </html>
    `);

    printWindow.document.close();

    void waitForImagesToLoad(
      printWindow
    ).then(() => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (printError) {
          console.error(
            "Print error:",
            printError
          );
        }
      }, 500);
    });
  }

  if (loading) {
    return (
      <main className="racer-module-page racer-reports-page" style={styles.page}>
<style>{`@media (max-width:640px){
  .racer-reports-page{padding:0 0 86px!important;background:#f5f9ff!important;min-height:100vh!important;overflow-x:hidden!important}
  .racer-reports-page>div{width:100%!important;max-width:none!important;padding:0 16px 24px!important;box-sizing:border-box!important}
  .racer-reports-page .header{padding:18px 0 12px!important;margin:0!important}
  .racer-reports-page .title{font-size:27px!important;line-height:1.05!important;color:#172d5f!important;font-weight:900!important}
  .racer-reports-page .summaryGrid{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:9px!important}
  .racer-reports-page .summaryCard{padding:12px!important;border-radius:17px!important;min-height:92px!important}
  .racer-reports-page .summaryLabel{font-size:10px!important}
  .racer-reports-page .summaryValue{font-size:24px!important}
  .racer-reports-page .mobile-report-section{margin-top:12px!important;padding:14px!important;border-radius:20px!important;background:#fff!important;border:1px solid #dfe8f5!important;box-shadow:0 10px 26px rgba(25,58,112,.08)!important}
  .racer-reports-page .mobile-report-section .tableHeader{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin-bottom:12px!important}
  .racer-reports-page .mobile-report-section .sectionTitle{font-size:20px!important;line-height:1.1!important;margin:0!important;color:#193566!important}
  .racer-reports-page .mobile-report-section .sectionSubtitle{font-size:10px!important;margin:5px 0 0!important;color:#6b7b98!important}
  .racer-reports-page .mobile-report-section .recordCount{font-size:10px!important;padding:7px 9px!important;border-radius:999px!important;background:#edf4ff!important;color:#2563eb!important;font-weight:900!important;white-space:nowrap!important}
  .racer-reports-page .mobile-report-section .tableWrapper{overflow:visible!important;width:100%!important}
  .racer-reports-page .mobile-report-section .mobile-report-table{display:block!important;width:100%!important;min-width:0!important;border:0!important;background:transparent!important}
  .racer-reports-page .mobile-report-section .mobile-report-table thead{display:none!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody{display:grid!important;gap:10px!important;width:100%!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody tr{display:grid!important;grid-template-columns:minmax(0,1fr) repeat(3,auto)!important;grid-template-areas:"student total present absent" "username percent percent percent"!important;gap:7px 8px!important;padding:13px!important;margin:0!important;border:1px solid #dce7f5!important;border-radius:17px!important;background:#fff!important;box-shadow:0 5px 16px rgba(31,65,120,.06)!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td{display:block!important;width:auto!important;padding:0!important;margin:0!important;border:0!important;min-width:0!important;background:transparent!important;white-space:normal!important;overflow-wrap:break-word!important;word-break:normal!important;color:#334155!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(1){display:none!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(2){grid-area:student!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(3){grid-area:username!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(4){grid-area:total!important;text-align:center!important;background:#eff6ff!important;padding:7px 8px!important;border-radius:10px!important;font-weight:900!important;font-size:12px!important;color:#1d4ed8!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(5){grid-area:present!important;text-align:center!important;background:#ecfdf5!important;padding:7px 8px!important;border-radius:10px!important;font-weight:900!important;font-size:12px!important;color:#15803d!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(6){grid-area:absent!important;text-align:center!important;background:#fef2f2!important;padding:7px 8px!important;border-radius:10px!important;font-weight:900!important;font-size:12px!important;color:#b91c1c!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(7){grid-area:percent!important;padding-top:2px!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(2) strong{display:block!important;font-size:14px!important;line-height:1.1!important;color:#142b57!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(3){font-size:9px!important;color:#6b7b98!important;font-weight:800!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(7) .percentageWrapper{width:100%!important;display:flex!important;align-items:center!important;gap:7px!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(7) .progressBackground{flex:1!important;height:9px!important;border-radius:99px!important;overflow:hidden!important}
  .racer-reports-page .mobile-report-section .mobile-report-table tbody td:nth-child(7) .progressBar{height:100%!important;border-radius:99px!important}
  }
`}</style>
        <div style={styles.loading}>
          Loading Reports...
        </div>
      </main>
    );
  }

  return (
    <main className="racer-module-page racer-reports-page" style={styles.page}>
      <style>{`
        @media print{body *{visibility:hidden!important}.reports-student-overlay,.reports-student-overlay *{visibility:visible!important}.reports-student-overlay{position:absolute!important;inset:0!important;padding:0!important;background:#fff!important}.reports-student-modal{width:100%!important;max-width:none!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;border:0!important}.reports-student-modal button{display:none!important}}
        .racer-reports-page{background:#f3f7fc!important;color:#182944!important;padding:24px 20px 42px!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important}
        .racer-reports-page>div{max-width:1280px!important}
        .racer-reports-page .reports-page-header{padding:20px 24px!important;border:1px solid #e5ebf4!important;border-radius:20px!important;box-shadow:0 8px 26px rgba(30,55,90,.06)!important;margin-bottom:16px!important}
        .racer-reports-page .reports-page-header .reports-title{font-size:26px!important;letter-spacing:-.6px!important;color:#172b4d!important}
        .racer-reports-page .reports-page-header .reports-subtitle{font-size:13px!important;color:#71809a!important}
        .racer-reports-page .reports-filter{display:grid!important;grid-template-columns:minmax(190px,1fr) minmax(340px,1.5fr);align-items:center!important;gap:18px!important;padding:18px 20px!important;border:1px solid #e1e8f2!important;border-radius:18px!important;background:#fff!important;box-shadow:0 5px 18px rgba(30,55,90,.04)!important;margin-bottom:14px!important}
        .racer-reports-page .reports-filter h2,.racer-reports-page .reports-filter p{margin-top:0!important;margin-bottom:0!important}
        .racer-reports-page .reports-controls{display:grid!important;grid-template-columns:1fr 1fr auto auto!important;align-items:end!important;gap:10px!important}
        .racer-reports-page input,.racer-reports-page select,.racer-reports-page textarea{border-color:#d8e1ed!important;border-radius:10px!important;min-height:42px!important;font-size:13px!important}
        .racer-reports-page button{transition:transform .16s ease,box-shadow .16s ease,filter .16s ease!important;font-weight:750!important}
        .racer-reports-page button:hover{filter:brightness(.98)!important;transform:translateY(-1px)!important;box-shadow:0 5px 13px rgba(30,64,110,.13)!important}
        .racer-reports-page .reports-summary{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:14px!important}
        .racer-reports-page .reports-summary-card{position:relative!important;overflow:hidden!important;min-height:98px!important;padding:16px 18px!important;border-radius:17px!important;box-shadow:0 7px 18px rgba(30,55,90,.08)!important}
        .racer-reports-page .reports-summary-card:after{content:"";position:absolute;right:-18px;bottom:-38px;width:105px;height:105px;border:1px solid rgba(255,255,255,.24);border-radius:50%;box-shadow:0 0 0 13px rgba(255,255,255,.08),0 0 0 27px rgba(255,255,255,.05)}
        .racer-reports-page .reports-attendance,.racer-reports-page .reports-assessments,.racer-reports-page .reports-records{padding:20px!important;border:1px solid #e3eaf3!important;border-radius:19px!important;background:#fff!important;box-shadow:0 7px 22px rgba(30,55,90,.05)!important;margin-bottom:15px!important}
        .racer-reports-page .sectionTitle{font-size:19px!important;letter-spacing:-.25px!important;color:#20395f!important;margin:0!important}
        .racer-reports-page .sectionSubtitle{font-size:12px!important;color:#78869b!important;margin:5px 0 0!important}
        .racer-reports-page .reports-attendance-table-wrap{margin-top:12px!important;max-height:min(44vh,440px)!important;overflow:auto!important;border:1px solid #e7edf5!important;border-radius:13px!important;overscroll-behavior:contain!important}
        .racer-reports-page .reports-attendance .mobile-report-table{min-width:720px!important;border-collapse:separate!important;border-spacing:0!important;overflow-wrap:normal!important}
        .racer-reports-page .reports-attendance .mobile-report-table th{position:sticky;top:0;background:#f5f8fc!important;color:#65748a!important;font-size:10px!important;text-transform:uppercase;letter-spacing:.055em;padding:12px 10px!important;border-bottom:1px solid #e6edf5!important}
        .racer-reports-page .reports-attendance .mobile-report-table td{padding:11px 10px!important;border-bottom:1px solid #eef2f7!important;color:#4a5a70!important;font-size:12px!important;overflow-wrap:normal!important;word-break:normal!important}
        .racer-reports-page .reports-attendance .mobile-report-table tr:last-child td{border-bottom:0!important}
        .racer-reports-page .reports-attendance .mobile-report-table td strong{color:#263c5d!important;font-size:12px!important}
        .racer-reports-page .reports-assessments .assessmentHeader,.racer-reports-page .reports-assessments .savedHeader{gap:12px!important;padding-bottom:16px!important;border-bottom:1px solid #edf1f6!important}
        .racer-reports-page .reports-assessments .assessmentTitle{font-size:22px!important;color:#1c3559!important}
        .racer-reports-page .reports-assessments .assessmentSubtitle{font-size:12px!important;color:#78869b!important}
        .racer-reports-page .reports-assessments .formBox{background:#f8fafd!important;border:1px solid #e5ebf3!important;border-radius:16px!important;padding:18px!important;margin-top:16px!important}
        .racer-reports-page .reports-assessments .formTitle{font-size:16px!important;color:#2a4162!important}
        .racer-reports-page .assessment-entry-table-wrap{max-height:min(52vh,580px)!important;overflow:auto!important;border:1px solid #e3eaf2!important;border-radius:13px!important;background:#fff!important;overscroll-behavior:contain!important}
        .racer-reports-page .reports-assessments table{border-collapse:separate!important;border-spacing:0!important}
        .racer-reports-page .reports-assessments table th{position:sticky;top:0;background:#f1f5fa!important;color:#5d6d84!important;font-size:10px!important;text-transform:uppercase;letter-spacing:.04em!important}
        .racer-reports-page .reports-assessments table td{font-size:12px!important;color:#45556c!important;border-bottom:1px solid #edf1f5!important}
        .racer-reports-page .reports-assessments .savedSection{margin-top:20px!important}
        .racer-reports-page .reports-assessments .saved-week-list{max-height:min(44vh,440px);overflow:auto;overscroll-behavior:contain}
        .racer-reports-page .reports-assessments .saved-week{margin:10px 0;border:1px solid #e2eaf3;border-radius:13px;overflow:hidden;background:#fff}
        .racer-reports-page .reports-assessments .saved-week-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:0;background:#f4f8fd;color:#29466b;text-align:left;cursor:pointer}
        .racer-reports-page .reports-assessments .saved-week-toggle strong{font-size:13px}
        .racer-reports-page .reports-assessments .saved-week-tests{display:grid;gap:8px;padding:9px;max-height:min(44vh,440px);overflow:auto;overscroll-behavior:contain}
        .racer-reports-page .reports-records .recordGrid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))!important;max-height:42vh!important;overflow:auto!important;padding-right:4px!important}
        .racer-reports-page .reports-records .recordCard{cursor:pointer!important;text-align:left!important}
        .racer-reports-page .reports-assessments .savedList{gap:10px!important}
        .racer-reports-page .reports-assessments .savedCard{border:1px solid #e3eaf2!important;border-radius:14px!important;padding:15px!important;box-shadow:0 3px 12px rgba(30,55,90,.04)!important}
        .racer-reports-page .reports-assessments .savedTestName{font-size:15px!important;color:#253b5d!important}
        .racer-reports-page .reports-assessments .savedMeta{font-size:11px!important;color:#728099!important}
        .racer-reports-page .reports-records .recordGrid{gap:9px!important}
        .racer-reports-page .reports-records .recordCard{border:1px solid #e5ebf3!important;border-radius:13px!important;padding:12px!important;background:#fff!important}
        .racer-reports-page .reports-records .recordName{font-size:12px!important;color:#314765!important}
        .racer-reports-page .reports-records .recordDate{font-size:11px!important;color:#7b8798!important}
        @media(max-width:760px){
          .racer-reports-page{padding:10px 0 88px!important;background:#f3f7fc!important;overflow-x:hidden!important}
          .racer-reports-page>div{width:100%!important;max-width:none!important;padding:0 12px 20px!important;box-sizing:border-box!important}
          .racer-reports-page .reports-page-header{padding:15px!important;border-radius:16px!important;margin-bottom:10px!important;gap:10px!important}
          .racer-reports-page .reports-page-header .reports-title{font-size:22px!important;line-height:1.15!important}
          .racer-reports-page .reports-page-header .reports-subtitle{font-size:11px!important;line-height:1.4!important}
          .racer-reports-page .reports-page-header a{padding:9px 11px!important;font-size:11px!important}
          .racer-reports-page .reports-filter{grid-template-columns:1fr!important;gap:12px!important;padding:14px!important;border-radius:15px!important;margin-bottom:10px!important}
          .racer-reports-page .reports-controls{grid-template-columns:1fr 1fr!important;gap:8px!important}
          .racer-reports-page .reports-controls button{min-height:40px!important;padding:9px 10px!important;font-size:11px!important}
          .racer-reports-page .reports-controls select{padding:9px!important;min-height:40px!important}
          .racer-reports-page .reports-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin-bottom:10px!important}
          .racer-reports-page .reports-summary-card{min-height:82px!important;padding:12px!important;border-radius:14px!important}
          .racer-reports-page .reports-summary-card>div:first-child{font-size:12px!important}
          .racer-reports-page .reports-summary-card>div:nth-child(2){font-size:10px!important;margin-top:5px!important}
          .racer-reports-page .reports-summary-card>div:nth-child(3){font-size:23px!important;margin-top:1px!important}
          .racer-reports-page .reports-attendance,.racer-reports-page .reports-assessments,.racer-reports-page .reports-records{padding:13px!important;border-radius:16px!important;margin-bottom:10px!important}
          .racer-reports-page .sectionTitle{font-size:16px!important}
          .racer-reports-page .sectionSubtitle{font-size:10px!important}
          .racer-reports-page .reports-attendance .tableHeader{gap:7px!important;margin-bottom:10px!important}
          .racer-reports-page .reports-attendance .recordCount{font-size:10px!important;padding:6px 8px!important}
          .racer-reports-page .reports-attendance-table-wrap{max-height:min(38vh,300px)!important;overflow-y:auto!important;overflow-x:hidden!important;border:0!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
          .racer-reports-page .reports-attendance .mobile-report-table{display:block!important;min-width:0!important;width:100%!important}
          .racer-reports-page .reports-attendance .mobile-report-table thead{display:none!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody{display:grid!important;gap:8px!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody tr{display:grid!important;grid-template-columns:minmax(0,1fr) repeat(3,auto)!important;grid-template-areas:"student total present absent" "username percent percent percent"!important;gap:6px 7px!important;padding:11px!important;border:1px solid #e3eaf3!important;border-radius:13px!important;background:#fff!important;box-shadow:0 3px 10px rgba(30,55,90,.04)!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td{padding:0!important;border:0!important;min-width:0!important;font-size:11px!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(1){display:none!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(2){grid-area:student!important;white-space:normal!important;overflow-wrap:anywhere!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(2) strong{font-size:12px!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(3){grid-area:username!important;font-size:9px!important;color:#8490a2!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(4){grid-area:total!important;background:#eff6ff!important;color:#2563eb!important;padding:5px 6px!important;border-radius:8px!important;text-align:center!important;font-weight:800!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(5){grid-area:present!important;background:#ecfdf5!important;color:#15803d!important;padding:5px 6px!important;border-radius:8px!important;text-align:center!important;font-weight:800!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(6){grid-area:absent!important;background:#fff1f1!important;color:#c24141!important;padding:5px 6px!important;border-radius:8px!important;text-align:center!important;font-weight:800!important}
          .racer-reports-page .reports-attendance .mobile-report-table tbody td:nth-child(7){grid-area:percent!important;padding-top:1px!important}
          .racer-reports-page .reports-attendance .percentageWrapper{display:flex!important;align-items:center!important;gap:8px!important;width:100%!important}
          .racer-reports-page .reports-attendance .progressBackground{flex:1!important;height:7px!important}
          .racer-reports-page .reports-assessments .assessmentHeader,.racer-reports-page .reports-assessments .savedHeader{align-items:flex-start!important;flex-wrap:wrap!important}
          .racer-reports-page .reports-assessments .assessmentTitle{font-size:19px!important}
          .racer-reports-page .reports-assessments .assessmentSubtitle{font-size:10px!important}
          .racer-reports-page .reports-assessments .formBox{padding:12px!important;border-radius:13px!important}
          .racer-reports-page .assessment-entry-table-wrap{max-height:min(44vh,340px)!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
          .racer-reports-page .reports-assessments table{min-width:1450px!important}
          .racer-reports-page .reports-assessments table th,.racer-reports-page .reports-assessments table td{padding:8px!important;font-size:10px!important}
          .racer-reports-page .reports-assessments .savedCard{padding:12px!important;gap:10px!important}
          .racer-reports-page .reports-assessments .saved-week-list{max-height:min(40vh,290px);overflow:auto;-webkit-overflow-scrolling:touch}
          .racer-reports-page .reports-assessments .savedTestName{font-size:13px!important}
          .racer-reports-page .reports-assessments .savedMeta{line-height:1.55!important;white-space:normal!important}
          .racer-reports-page .reports-assessments .savedActions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;width:100%!important}
          .racer-reports-page .reports-assessments .savedActions button{padding:8px 5px!important;font-size:10px!important}
          .racer-reports-page .reports-assessments .gradeGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
          .racer-reports-page .reports-records .recordGrid{grid-template-columns:1fr!important}
          .racer-reports-page .reports-records .recordGrid{max-height:38vh!important}
          .racer-reports-page .reports-records .recordCard{padding:10px!important}
        }
        .racer-reports-page .reports-section-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:3px 2px 12px;margin-bottom:12px}
        .racer-reports-page .reports-section-tab{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:10px 12px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;color:#51627b;font-size:13px;font-weight:750;line-height:1.3;text-align:center;white-space:normal;cursor:pointer;transition:background .16s,border-color .16s,color .16s,box-shadow .16s}
        .racer-reports-page .reports-section-tab>span{font-size:15px;color:#2d65bc}
        .racer-reports-page .reports-section-tab:hover{border-color:#9db9e5;background:#f5f9ff}
        .racer-reports-page .reports-section-tab.is-active{border-color:#2d65bc;background:#eaf2ff;color:#17478c;box-shadow:0 3px 10px rgba(45,101,188,.12)}
        .racer-reports-page .reports-academy-hub{display:grid;grid-template-columns:auto minmax(0,1fr);gap:15px;align-items:center;padding:22px;border:1px solid #e0e9f4;border-radius:16px;background:linear-gradient(135deg,#f7faff,#fff 65%)}
        .racer-reports-page .reports-academy-mark{display:grid;place-items:center;width:56px;height:56px;border-radius:16px;background:#e6efff;color:#2459a6;font-size:18px;font-weight:900;letter-spacing:-.04em}
        .racer-reports-page .reports-hub-eyebrow{font-size:10px;font-weight:850;letter-spacing:.09em;color:#6680a2}
        .racer-reports-page .reports-academy-hub h3{margin:3px 0;color:#203b60;font-size:19px}
        .racer-reports-page .reports-academy-hub p{margin:0;color:#6e7d91;font-size:12px;line-height:1.5}
        .racer-reports-page .reports-hub-actions{grid-column:2;display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
        .racer-reports-page .reports-hub-actions button{min-height:40px;padding:9px 12px;border:1px solid #dce6f3;border-radius:10px;background:#fff;color:#2c5389;font-size:11px;font-weight:800;cursor:pointer}
        .racer-reports-page .reports-hub-actions button:first-child{border-color:#2459a6;background:#2459a6;color:#fff}
        .racer-reports-page .reports-hub-actions button span{display:inline-grid;place-items:center;min-width:21px;height:21px;margin-left:5px;border-radius:99px;background:#eaf2ff;color:#2459a6}
        .racer-reports-page .reports-content.module-open .reports-page-header{display:none!important}
        .racer-reports-page .reports-back-to-menu{display:flex;align-items:center;justify-content:center;min-height:40px;margin:2px 0 10px;padding:8px 13px;border:1px solid #d8e3f1;border-radius:10px;background:#fff;color:#315884;font-size:12px;font-weight:850;cursor:pointer}
        .racer-reports-page .reports-content.module-open{padding-top:8px!important}
        .racer-reports-page .reports-content.module-open>footer{display:none!important}
        .racer-reports-page .assessment-form-box{margin-top:10px!important;padding:12px!important}
        .racer-reports-page .assessment-form-grid{margin-top:10px!important}
        .racer-reports-page .assessment-form-actions{display:flex!important;gap:8px!important;margin-top:10px!important}
        .racer-reports-page .mobile-assessment-student{display:none}
        .racer-reports-page .mobile-add-remark{height:32px;border:1px solid #dce5f0;border-radius:8px;background:#f8fbff;color:#4b678b;font-size:9px;font-weight:800;cursor:pointer}
        .racer-reports-page .student-photo-actions{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
        .racer-reports-page .student-photo-button{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:7px 9px;border:1px solid #d6e2f1;border-radius:9px;background:#fff;color:#31557f;font-size:10px;font-weight:800;white-space:nowrap;cursor:pointer}
        .racer-reports-page .student-photo-button input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
        .racer-reports-page .camera-photo-button{border-color:#cdddf5;background:#f0f6ff;color:#2459a6}
        .racer-reports-page .reports-attendance-table-wrap,.racer-reports-page .assessment-entry-table-wrap,.racer-reports-page .reports-assessments .saved-week-list,.racer-reports-page .reports-assessments .saved-week-tests,.racer-reports-page .reports-records .recordGrid{max-height:none!important;height:auto!important;overflow:visible!important;overscroll-behavior:auto!important;-webkit-overflow-scrolling:auto!important}
        .racer-reports-page .reports-attendance-table-wrap{overflow-x:visible!important}
        .racer-reports-page .reports-assessments .saved-week-tests{display:grid;gap:8px;padding:9px}
        .racer-reports-page .assessment-entry-table-wrap{border:0!important;background:transparent!important}
        .racer-reports-page .student-assessment-stepper{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:9px;margin:12px 0;padding:10px;border:1px solid #e0e8f2;border-radius:13px;background:#f7faff;color:#5e7088;font-size:12px;text-align:center}
        .racer-reports-page .student-assessment-stepper strong{color:#204e8e}
        .racer-reports-page .student-assessment-stepper button{min-height:42px;padding:9px 12px;border:1px solid #cbdcf2;border-radius:10px;background:#fff;color:#2459a6;font-size:12px;font-weight:850;cursor:pointer}
        .racer-reports-page .student-assessment-stepper button:last-child{background:#2459a6;color:#fff}
        .racer-reports-page .student-assessment-stepper button:disabled{opacity:.42;cursor:not-allowed}
        .racer-reports-page .reports-assessments .student-assessment-entry-table{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;border-spacing:0!important;border-collapse:separate!important}
        .racer-reports-page .student-assessment-entry-table thead{display:none!important}
        .racer-reports-page .student-assessment-entry-table tbody{display:block!important;width:100%!important}
        .racer-reports-page .student-assessment-entry-table tbody tr{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:12px!important;border:1px solid #e0e8f2!important;border-radius:16px!important;background:#fff!important;box-shadow:0 5px 18px rgba(30,55,90,.06)!important}
        .racer-reports-page .student-assessment-entry-table tbody td{display:flex!important;flex-direction:column!important;justify-content:center!important;gap:6px!important;min-width:0!important;padding:9px!important;border:1px solid #edf1f6!important;border-radius:10px!important;background:#fbfdff!important;font-size:12px!important;overflow-wrap:anywhere!important}
        .racer-reports-page .student-assessment-entry-table tbody td:before{color:#7a8ba1;font-size:9px;font-weight:850;letter-spacing:.045em;text-transform:uppercase}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(1){display:none!important}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(4),.racer-reports-page .student-assessment-entry-table tbody td:nth-child(6){display:none!important}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(2){grid-column:1/-1;align-items:flex-start;background:#f2f7ff!important;color:#244875!important;font-size:14px!important}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(2):before{content:"STUDENT"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(3):before{content:"SUBJECT"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(4):before{content:"ADMISSION DATE"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(5):before{content:"ATTENDANCE"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(6):before{content:"TOTAL MARKS"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(7):before{content:"OBTAINED MARKS"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(8):before{content:"PERCENTAGE"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(9):before{content:"GRADE"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(10):before{content:"RESULT"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(11):before{content:"REMARKS"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(12):before{content:"TEST PHOTOS"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(7):before{content:"SCORE"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(8):before{content:"PERCENT"}
        .racer-reports-page .student-assessment-entry-table tbody td:nth-child(11):before{content:"NOTES"}
        .racer-reports-page .student-assessment-entry-table input,.racer-reports-page .student-assessment-entry-table select{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important}
        .racer-reports-page .student-assessment-entry-table .uploadBox{min-width:0!important}
        @media(max-width:760px){.racer-reports-page .reports-section-nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 10px;padding:2px 0 8px}.racer-reports-page .reports-section-tab{min-height:56px;padding:10px 8px;font-size:12px;border-radius:12px}.racer-reports-page .reports-academy-hub{gap:10px;padding:14px}.racer-reports-page .reports-academy-mark{width:44px;height:44px;border-radius:13px;font-size:15px}.racer-reports-page .reports-academy-hub h3{font-size:16px}.racer-reports-page .reports-academy-hub p{font-size:11px}.racer-reports-page .reports-hub-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr}.racer-reports-page .reports-hub-actions button{width:100%;text-align:left}.racer-reports-page .student-photo-actions{min-width:0;display:grid;grid-template-columns:1fr 1fr}.racer-reports-page .student-photo-button{font-size:9px;padding:7px 6px}.racer-reports-page .reports-content.module-open{padding-top:5px!important}.racer-reports-page .reports-content.module-open .reports-back-to-menu{min-height:34px;margin:0 0 6px;padding:6px 10px;font-size:11px}.racer-reports-page .reports-assessments{padding:10px!important}.racer-reports-page .assessment-form-box{margin-top:0!important;padding:7px!important;border-radius:10px!important}.racer-reports-page .assessment-form-box .formTitle{margin:0 0 4px!important;font-size:14px!important}.racer-reports-page .assessment-form-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;margin-top:6px!important}.racer-reports-page .assessment-form-grid>div{min-width:0!important}.racer-reports-page .assessment-form-grid label{font-size:9px!important}.racer-reports-page .assessment-form-grid input{min-width:0!important;width:100%!important;height:34px!important;padding:5px!important;font-size:10px!important}.racer-reports-page .assessment-info-box{display:none!important}.racer-reports-page .assessment-entry-table-wrap{display:none!important}.racer-reports-page .mobile-assessment-student{display:grid;gap:8px;padding:11px;border:1px solid #dfe8f4;border-radius:14px;background:#fff;box-shadow:0 4px 14px rgba(30,55,90,.06)}.racer-reports-page .mobile-assessment-student>header{display:grid;gap:3px;padding:2px 1px 8px;border-bottom:1px solid #eaf0f7}.racer-reports-page .mobile-assessment-student>header strong{color:#244875;font-size:14px}.racer-reports-page .mobile-assessment-student>header small{color:#718198;font-size:10px}.racer-reports-page .mobile-assessment-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.racer-reports-page .mobile-assessment-student label{display:grid;gap:4px;min-width:0;color:#74849a;font-size:9px;font-weight:800}.racer-reports-page .mobile-assessment-student input,.racer-reports-page .mobile-assessment-student select{box-sizing:border-box;width:100%;min-width:0;height:36px;padding:6px;border:1px solid #dce5f0;border-radius:8px;background:#fff;color:#304765;font-size:10px;font-weight:700}.racer-reports-page .mobile-assessment-student input:disabled{background:#f2f5f9;color:#98a3b1}.racer-reports-page .mobile-assessment-result{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.racer-reports-page .mobile-assessment-result span{display:grid;gap:2px;padding:6px 8px;border:1px solid #e6edf5;border-radius:8px;background:#f7faff;color:#244875;font-size:11px;font-weight:850}.racer-reports-page .mobile-assessment-result small{color:#8290a2;font-size:8px;font-weight:750;text-transform:uppercase}.racer-reports-page .mobile-assessment-photos{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px}.racer-reports-page .mobile-assessment-photos>strong{color:#718198;font-size:10px}.racer-reports-page .mobile-assessment-photos .student-photo-actions{display:flex}.racer-reports-page .mobile-assessment-remarks input{height:33px}.racer-reports-page .mobile-assessment-photo-preview{display:flex;flex-wrap:wrap;gap:5px}.racer-reports-page .mobile-assessment-photo-preview>div{position:relative;width:38px;height:38px}.racer-reports-page .mobile-assessment-photo-preview img{width:100%;height:100%;object-fit:cover;border-radius:6px}.racer-reports-page .mobile-assessment-photo-preview button{position:absolute;right:-5px;top:-5px;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:#c62828;color:white}.racer-reports-page .student-assessment-entry-table tbody tr{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;padding:7px!important}.racer-reports-page .student-assessment-entry-table tbody td{gap:4px!important;padding:6px!important;font-size:10px!important}.racer-reports-page .student-assessment-entry-table tbody td:before{font-size:8px!important}.racer-reports-page .student-assessment-entry-table tbody td:nth-child(2){font-size:12px!important}.racer-reports-page .student-assessment-entry-table tbody td:nth-child(12){grid-column:1/-1}.racer-reports-page .student-assessment-stepper{position:static;margin:5px 0;padding:5px;gap:5px;font-size:10px}.racer-reports-page .student-assessment-stepper button{min-height:34px;padding:6px 8px;font-size:10px}.racer-reports-page .assessment-form-actions{margin-top:7px!important}.racer-reports-page .assessment-form-actions button{min-height:34px!important;padding:7px 9px!important}}
        @media(max-width:760px){.racer-reports-page .mobile-assessment-student{gap:4px;padding:7px}.racer-reports-page .mobile-assessment-student>header{gap:2px;padding:0 1px 4px}.racer-reports-page .mobile-assessment-student>header strong{font-size:12px}.racer-reports-page .mobile-assessment-student>header small{font-size:9px}.racer-reports-page .mobile-assessment-fields{gap:4px}.racer-reports-page .mobile-assessment-student label{gap:2px;font-size:8px}.racer-reports-page .mobile-assessment-student input,.racer-reports-page .mobile-assessment-student select{height:31px;padding:4px;font-size:9px}.racer-reports-page .mobile-assessment-result{gap:4px}.racer-reports-page .mobile-assessment-result span{padding:3px 6px;font-size:10px}.racer-reports-page .mobile-assessment-extras{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:6px;align-items:end}.racer-reports-page .mobile-assessment-photos{display:grid;gap:2px}.racer-reports-page .mobile-assessment-photos>strong{display:none}.racer-reports-page .mobile-assessment-photos .student-photo-actions{display:flex;gap:3px}.racer-reports-page .mobile-assessment-photos .student-photo-button{flex:1;min-width:0;min-height:29px;padding:4px 3px;font-size:8px}.racer-reports-page .mobile-assessment-photo-preview{gap:3px}.racer-reports-page .mobile-assessment-photo-preview>div{width:30px;height:30px}.racer-reports-page .mobile-add-remark{height:29px;font-size:8px}.racer-reports-page .assessment-form-actions{margin-top:4px!important}.racer-reports-page .assessment-form-actions button{min-height:30px!important;padding:5px 8px!important;font-size:10px!important}}
        @media(min-width:761px) and (max-width:1050px){.racer-reports-page .reports-filter{grid-template-columns:1fr!important}.racer-reports-page .reports-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      `}</style>
      <div className={reportMenuOpen ? "reports-content" : "reports-content module-open"} style={styles.container}>
        <header className="reports-page-header" style={styles.header}>
          <div>
            <div style={styles.brand}>
              RACER ACADEMY
            </div>

            <h1 className="reports-title" style={styles.title}>
              Teacher Reports
            </h1>

            <p className="reports-subtitle" style={styles.subtitle}>
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

        {reportMenuOpen && <nav className="reports-section-nav" aria-label="Report sections">
          {([
            ["attendance-report", "Attendance Report", "▦"],
            ["student-attendance", "Student-wise Attendance", "♙"],
            ["academy", "RACER ACADEMY", "◆"],
            ["assessment-create", "Create / Update Assessment", "+"],
            ["saved-assessments", "Saved Assessments", "▤"],
            ["attendance-records", "Attendance Records", "◷"],
          ] as const).map(([key, label, icon]) => (
            <button key={key} type="button" aria-current={activeReportSection === key ? "page" : undefined}
              className={activeReportSection === key ? "reports-section-tab is-active" : "reports-section-tab"}
              onClick={() => {
                setActiveReportSection(key);
                setReportMenuOpen(false);
                document.documentElement.scrollTop = 0;
                document.querySelector<HTMLElement>(".racer-reports-page")?.scrollTo({ top: 0, left: 0 });
                if (key === "assessment-create" && !selectedAssessment) {
                  resetAssessmentForm();
                  setShowAssessmentForm(true);
                }
              }}>
              <span aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
        </nav>}
        {!reportMenuOpen && <button type="button" className="reports-back-to-menu" onClick={() => { setReportMenuOpen(true); document.documentElement.scrollTop = 0; document.querySelector<HTMLElement>(".racer-reports-page")?.scrollTo({ top: 0, left: 0 }); }}>← All report sections</button>}

        {activeReportSection === "attendance-report" && <>
        <section className="reports-filter" style={styles.filterCard}>
          <div>
            <h2 style={styles.sectionTitle}>
              Attendance Report
            </h2>

            <p style={styles.sectionSubtitle}>
              Select month and year
            </p>
          </div>

          <div className="reports-controls" style={styles.filterGrid}>
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
              onClick={() => void loadReport()}
              style={styles.generateButton}
            >
              Generate Report
            </button>

            <button
              onClick={exportCSV}
              style={styles.exportButton}
            >
              Export CSV
            </button>
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}
        </section>

        <section className="reports-summary" style={styles.summaryGrid}>
          <div
            className="reports-summary-card"
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5)",
            }}
          >
            <div style={styles.summaryIcon}>
              Students
            </div>

            <div style={styles.summaryLabel}>
              Total Students
            </div>

            <div style={styles.summaryValue}>
              {students.length}
            </div>
          </div>

          <div
            className="reports-summary-card"
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#16a34a,#15803d)",
            }}
          >
            <div style={styles.summaryIcon}>
              Present
            </div>

            <div style={styles.summaryLabel}>
              Present
            </div>

            <div style={styles.summaryValue}>
              {totalPresent}
            </div>
          </div>

          <div
            className="reports-summary-card"
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#dc2626,#b91c1c)",
            }}
          >
            <div style={styles.summaryIcon}>
              Absent
            </div>

            <div style={styles.summaryLabel}>
              Absent
            </div>

            <div style={styles.summaryValue}>
              {totalAbsent}
            </div>
          </div>

          <div
            className="reports-summary-card"
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#7c3aed,#9333ea)",
            }}
          >
            <div style={styles.summaryIcon}>
              Attendance
            </div>

            <div style={styles.summaryLabel}>
              Overall Attendance
            </div>

            <div style={styles.summaryValue}>
              {overallPercentage.toFixed(1)}%
            </div>
          </div>
        </section>
        </>}

        {activeReportSection === "student-attendance" &&
        <section className="mobile-report-section reports-attendance" style={styles.card}>
          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Student-wise Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[Number(month) - 1]}{" "}
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
            <div className="reports-attendance-table-wrap" style={styles.tableWrapper}>
              <table className="mobile-report-table" style={styles.table}>
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
                          <button type="button" onClick={() => { setStudentDetailMonth(month); setStudentDetailYear(year); setSelectedReportStudentId(item.student.id); }} style={{ border: 0, padding: 0, background: "transparent", color: "#2355a2", textAlign: "left", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", fontWeight: 800 }}>
                            {item.student
                              .student_name ||
                              item.student
                                .student_username}
                          </button>
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
        }

        {(activeReportSection === "academy" || activeReportSection === "assessment-create" || activeReportSection === "saved-assessments") &&
        <section className="reports-assessments" style={styles.assessmentCard}>
          {activeReportSection === "academy" && <div className="assessmentHeader" style={styles.assessmentHeader}>
            <div>
              <div style={styles.assessmentBrand}>
                RACER ACADEMY
              </div>

              <h2 style={styles.assessmentTitle}>
                Academy Assessments
              </h2>

              <p style={styles.assessmentSubtitle}>
                Tests, subjects, marks, results and
                checked test photos
              </p>
            </div>

            <button
              onClick={() => {
                if (showAssessmentForm) {
                  setShowAssessmentForm(false);
                } else {
                  resetAssessmentForm();
                  setShowAssessmentForm(true);
                }
              }}
              style={styles.assessmentToggle}
            >
              {showAssessmentForm
                ? "Hide Form"
                : "Add Assessment"}
            </button>
          </div>}

          {activeReportSection === "academy" && (
            <div className="reports-academy-hub">
              <div className="reports-academy-mark" aria-hidden="true">RA</div>
              <div><span className="reports-hub-eyebrow">RACER ACADEMY</span><h3>Academy Assessments</h3>
                <p>Create tests, enter each student’s marks, attach test photos, and manage saved results.</p></div>
              <div className="reports-hub-actions">
                <button type="button" onClick={() => { resetAssessmentForm(); setShowAssessmentForm(true); setActiveReportSection("assessment-create"); }}>＋ Create / Update Assessment</button>
                <button type="button" onClick={() => setActiveReportSection("saved-assessments")}>▤ View Saved Assessments <span>{assessmentGroups.length}</span></button>
              </div>
            </div>
          )}

          {assessmentError && (
            <div style={styles.error}>
              {assessmentError}
            </div>
          )}

          {assessmentMessage && (
            <div style={styles.success}>
              {assessmentMessage}
            </div>
          )}

          {activeReportSection === "assessment-create" && showAssessmentForm && (
            <div className="assessment-form-box" style={styles.formBox}>
              <h3 style={styles.formTitle}>
                Create / Update Assessment
              </h3>

              <div className="assessment-form-grid" style={styles.assessmentFormGrid}>
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
                    placeholder="Example: Saturday Test 01"
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

              <div className="assessment-info-box" style={styles.infoBox}>
                <strong>Automatic:</strong>{" "}
                Admission date ke according students
                automatically show honge. Test date se
                baad admission wale students nahi dikhenge.
              </div>

              {eligibleStudents.length === 0 ? (
                <div style={styles.empty}>
                  Is test date ke liye koi eligible
                  student nahi mila.
                </div>
              ) : (
                <>
                <div className="student-assessment-stepper">
                    <button type="button" disabled={assessmentStudentIndex <= 0}
                      onClick={() => setAssessmentStudentIndex((index) => Math.max(0, index - 1))}>← Previous</button>
                    <span><strong>{Math.min(assessmentStudentIndex + 1, eligibleStudents.length)}</strong> / {eligibleStudents.length} students</span>
                    <button type="button" disabled={assessmentStudentIndex >= eligibleStudents.length - 1}
                      onClick={() => setAssessmentStudentIndex((index) => Math.min(eligibleStudents.length - 1, index + 1))}>Next →</button>
                </div>
                {eligibleStudents[assessmentStudentIndex] && (() => {
                  const student = eligibleStudents[assessmentStudentIndex];
                  const mark = studentMarks.find((item) => item.studentId === student.id);
                  const isAbsent = mark?.attendanceStatus === "ABSENT";
                  const isNoTest = mark?.attendanceStatus === "NO_TEST";
                  const score = Number(mark?.obtainedMarks || 0);
                  const total = Number(totalMarks || 0);
                  const percentage = !isAbsent && !isNoTest ? getPercentage(score, total) : 0;
                  return <article className="mobile-assessment-student">
                    <header><strong>{student.student_name || student.student_username}</strong><small>{student.student_username} · Joined {student.admission_date || "—"}</small></header>
                    <div className="mobile-assessment-fields">
                      <label>Subject<select aria-label={`Subject for ${student.student_name || student.student_username}`} value={mark?.subject || "Mathematics"} onChange={(event) => updateStudentSubject(student.id, event.target.value as "English" | "Mathematics")}><option value="English">English</option><option value="Mathematics">Mathematics</option></select></label>
                      <label>Attendance<select aria-label={`Attendance for ${student.student_name || student.student_username}`} value={mark?.attendanceStatus || "PRESENT"} onChange={(event) => updateStudentAttendance(student.id, event.target.value as "PRESENT" | "ABSENT" | "NO_TEST")}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="NO_TEST">No test</option></select></label>
                      <label>Marks<input aria-label={`Marks for ${student.student_name || student.student_username}`} type="number" min="0" max={totalMarks || undefined} value={mark?.obtainedMarks || ""} disabled={isAbsent || isNoTest} placeholder={isAbsent ? "Absent" : isNoTest ? "No test" : "Enter marks"} onChange={(event) => updateStudentMarks(student.id, event.target.value)} /></label>
                    </div>
                    <div className="mobile-assessment-result"><span>{total > 0 && !isAbsent && !isNoTest ? `${percentage.toFixed(1)}%` : "—"}<small>Score</small></span><span>{total > 0 && !isAbsent && !isNoTest ? getGrade(percentage) : "—"}<small>Grade</small></span><span>{isAbsent ? "Absent" : isNoTest ? "No test" : total > 0 ? isPass(percentage) ? "Pass" : "Fail" : "—"}<small>Result</small></span></div>
                    <div className="mobile-assessment-extras">{showAssessmentRemark || mark?.remarks ? <label className="mobile-assessment-remarks">Remarks<input aria-label={`Remarks for ${student.student_name || student.student_username}`} type="text" value={mark?.remarks || ""} onChange={(event) => updateStudentRemarks(student.id, event.target.value)} placeholder="Optional" /></label> : <button type="button" className="mobile-add-remark" onClick={() => setShowAssessmentRemark(true)}>＋ Add note</button>}
                    <div className="mobile-assessment-photos"><strong>Test photos</strong><div className="student-photo-actions">
                      <label className="student-photo-button camera-photo-button"><span aria-hidden="true">▣</span> Camera<input type="file" accept="image/*" capture="environment" aria-label={`Take test photo for ${student.student_name || student.student_username}`} onChange={(event) => { void uploadTestImages(student.id, event.currentTarget.files); event.currentTarget.value = ""; }} style={styles.hiddenFileInput} /></label>
                      <label className="student-photo-button gallery-photo-button"><span aria-hidden="true">＋</span> Gallery<input type="file" accept="image/*" multiple aria-label={`Upload test photos for ${student.student_name || student.student_username}`} onChange={(event) => { void uploadTestImages(student.id, event.currentTarget.files); event.currentTarget.value = ""; }} style={styles.hiddenFileInput} /></label>
                    </div>{mark && mark.testImages.length > 0 && <div className="mobile-assessment-photo-preview">{mark.testImages.map((url) => <div key={url}><img src={url} alt={`Test work for ${student.student_name || student.student_username}`} /><button type="button" aria-label="Remove photo" onClick={() => removeTestImage(student.id, url)}>×</button></div>)}</div>}</div></div>
                  </article>;
                })()}
                <div className="assessment-entry-table-wrap" style={styles.tableWrapper}>
                  <table
                    className="student-assessment-entry-table"
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
                          Subject
                        </th>
                        <th style={styles.th}>
                          Admission Date
                        </th>
                        <th style={styles.th}>
                          Attendance
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
                        <th style={styles.th}>
                          Camera / Test Photos
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {eligibleStudents.slice(assessmentStudentIndex, assessmentStudentIndex + 1).map(
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

                          const isAbsentStudent =
                            mark?.attendanceStatus ===
                            "ABSENT";

                          const isNoTestStudent =
                            mark?.attendanceStatus ===
                            "NO_TEST";

                          const percentage =
                            !isAbsentStudent &&
                            !isNoTestStudent
                              ? getPercentage(
                                  obtained,
                                  total
                                )
                              : 0;

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
                              <td style={styles.td}>
                                {index + 1}
                              </td>

                              <td style={styles.td}>
                                <strong>
                                  {student.student_name ||
                                    student.student_username}
                                </strong>

                                <div
                                  style={
                                    styles.smallText
                                  }
                                >
                                  {student.student_username} · Joined {student.admission_date || "—"}
                                </div>
                              </td>

                              <td style={styles.td}>
                                <select
                                  value={
                                    mark?.subject ||
                                    "Mathematics"
                                  }
                                  onChange={(e) =>
                                    updateStudentSubject(
                                      student.id,
                                      e.target
                                        .value as
                                        | "English"
                                        | "Mathematics"
                                    )
                                  }
                                  style={
                                    styles.subjectSelect
                                  }
                                >
                                  <option value="English">
                                    English
                                  </option>

                                  <option value="Mathematics">
                                    Mathematics
                                  </option>
                                </select>
                              </td>

                              <td style={styles.td}>
                                <span
                                  style={
                                    styles.admissionBadge
                                  }
                                >
                                  {student.admission_date ||
                                    "—"}
                                </span>
                              </td>

                              <td style={styles.td}>
                                <select
                                  value={
                                    mark?.attendanceStatus ||
                                    "PRESENT"
                                  }
                                  onChange={(e) =>
                                    updateStudentAttendance(
                                      student.id,
                                      e.target
                                        .value as
                                        | "PRESENT"
                                        | "ABSENT"
                                        | "NO_TEST"
                                    )
                                  }
                                  style={{
                                    ...styles.subjectSelect,
                                    color:
                                      mark?.attendanceStatus ===
                                      "ABSENT"
                                        ? "#991b1b"
                                        : mark?.attendanceStatus ===
                                          "NO_TEST"
                                        ? "#92400e"
                                        : "#166534",
                                    fontWeight: 800,
                                  }}
                                >
                                  <option value="PRESENT">
                                    PRESENT
                                  </option>

                                  <option value="ABSENT">
                                    ABSENT
                                  </option>

                                  <option value="NO_TEST">
                                    NO TEST
                                  </option>
                                </select>
                              </td>

                              <td style={styles.td}>
                                {isAbsentStudent ||
                                isNoTestStudent
                                  ? "—"
                                  : totalMarks ||
                                    "—"}
                              </td>

                              <td style={styles.td}>
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
                                  disabled={
                                    isAbsentStudent ||
                                    isNoTestStudent
                                  }
                                  onChange={(e) =>
                                    updateStudentMarks(
                                      student.id,
                                      e.target
                                        .value
                                    )
                                  }
                                  style={
                                    styles.marksInput
                                  }
                                  placeholder={
                                    isAbsentStudent
                                      ? "Absent"
                                      : isNoTestStudent
                                      ? "No Test"
                                      : "Marks"
                                  }
                                />
                              </td>

                              <td style={styles.td}>
                                <strong>
                                  {isAbsentStudent
                                    ? "ABSENT"
                                    : isNoTestStudent
                                    ? "NO TEST"
                                    : total > 0
                                    ? `${percentage.toFixed(
                                        1
                                      )}%`
                                    : "—"}
                                </strong>
                              </td>

                              <td style={styles.td}>
                                <span
                                  style={{
                                    ...styles.gradeBadge,
                                    background:
                                      isAbsentStudent
                                        ? "#fee2e2"
                                        : isNoTestStudent
                                        ? "#fef3c7"
                                        : grade ===
                                          "F"
                                        ? "#fee2e2"
                                        : "#dcfce7",
                                    color:
                                      isAbsentStudent
                                        ? "#991b1b"
                                        : isNoTestStudent
                                        ? "#92400e"
                                        : grade ===
                                          "F"
                                        ? "#991b1b"
                                        : "#166534",
                                  }}
                                >
                                  {isAbsentStudent
                                    ? "ABSENT"
                                    : isNoTestStudent
                                    ? "NO TEST"
                                    : total > 0
                                    ? grade
                                    : "—"}
                                </span>
                              </td>

                              <td style={styles.td}>
                                <span
                                  style={{
                                    ...styles.resultBadge,
                                    background:
                                      isAbsentStudent
                                        ? "#fee2e2"
                                        : isNoTestStudent
                                        ? "#fef3c7"
                                        : total > 0 &&
                                          isPass(
                                            percentage
                                          )
                                        ? "#dcfce7"
                                        : "#fee2e2",
                                    color:
                                      isAbsentStudent
                                        ? "#991b1b"
                                        : isNoTestStudent
                                        ? "#92400e"
                                        : total > 0 &&
                                          isPass(
                                            percentage
                                          )
                                        ? "#166534"
                                        : "#991b1b",
                                  }}
                                >
                                  {isAbsentStudent
                                    ? "ABSENT"
                                    : isNoTestStudent
                                    ? "NO TEST"
                                    : total > 0
                                    ? isPass(
                                        percentage
                                      )
                                      ? "PASS"
                                      : "FAIL"
                                    : "—"}
                                </span>
                              </td>

                              <td style={styles.td}>
                                <input
                                  type="text"
                                  value={
                                    mark?.remarks ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateStudentRemarks(
                                      student.id,
                                      e.target
                                        .value
                                    )
                                  }
                                  placeholder="Optional"
                                  style={
                                    styles.remarksInput
                                  }
                                />
                              </td>

                              <td style={styles.td}>
                                <div
                                  style={
                                    styles.uploadBox
                                  }
                                >
                                  <div className="student-photo-actions">
                                    <label className="student-photo-button camera-photo-button">
                                      <span aria-hidden="true">▣</span> Camera
                                      <input type="file" accept="image/*" capture="environment"
                                        aria-label={`Take test photo for ${student.student_name || student.student_username}`}
                                        onChange={(e) => {
                                          void uploadTestImages(student.id, e.currentTarget.files);
                                          e.currentTarget.value = "";
                                        }} style={styles.hiddenFileInput} />
                                    </label>
                                    <label className="student-photo-button gallery-photo-button">
                                      <span aria-hidden="true">＋</span> Gallery
                                      <input type="file" accept="image/*" multiple
                                        aria-label={`Upload test photos for ${student.student_name || student.student_username}`}
                                        onChange={(e) => {
                                          void uploadTestImages(student.id, e.currentTarget.files);
                                          e.currentTarget.value = "";
                                        }} style={styles.hiddenFileInput} />
                                    </label>
                                  </div>

                                  <small
                                    style={
                                      styles.optionalText
                                    }
                                  >
                                    Optional
                                  </small>

                                  {mark &&
                                    mark.testImages
                                      .length >
                                      0 && (
                                      <div
                                        style={
                                          styles.imagePreviewGrid
                                        }
                                      >
                                        {mark.testImages.map(
                                          (
                                            imageUrl
                                          ) => (
                                            <div
                                              key={
                                                imageUrl
                                              }
                                              style={
                                                styles.imagePreview
                                              }
                                            >
                                              <img
                                                src={
                                                  imageUrl
                                                }
                                                alt="Checked test"
                                                style={
                                                  styles.previewImage
                                                }
                                              />

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeTestImage(
                                                    student.id,
                                                    imageUrl
                                                  )
                                                }
                                                style={
                                                  styles.removeImageButton
                                                }
                                              >
                                                ×
                                              </button>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              <div className="assessment-form-actions" style={styles.formActions}>
                <button
                  onClick={() =>
                    void saveAssessment()
                  }
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
                    ? "Update Assessment"
                    : "Save Assessment"}
                </button>

                <button
                  onClick={
                    resetAssessmentForm
                  }
                  style={styles.cancelButton}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {activeReportSection === "saved-assessments" && <div style={styles.savedSection}>
            <div className="savedHeader" style={styles.savedHeader}>
              <div>
                <h3
                  style={styles.savedTitle}
                >
                  Saved Assessments
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
                  Export Assessments
                </button>
              )}
            </div>

            {assessmentGroups.length === 0 ? (
              <div style={styles.empty}>
                No assessments added yet.
              </div>
            ) : (
              <div className="saved-week-list">
                {assessmentWeeks.map((week) => (
                  <section className="saved-week" key={week.startDate}>
                    <button type="button" className="saved-week-toggle" aria-expanded={expandedTestWeek === week.startDate} onClick={() => setExpandedTestWeek(expandedTestWeek === week.startDate ? null : week.startDate)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: 0, borderRadius: 12, background: "#f1f6fc", color: "#29466b", textAlign: "left", cursor: "pointer" }}>
                      <strong>▸ Weekly Tests · Week of {new Date(`${week.startDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                      <span>{week.groups.length} {week.groups.length === 1 ? "test" : "tests"} {expandedTestWeek === week.startDate ? "−" : "+"}</span>
                    </button>
                    {expandedTestWeek === week.startDate && <div className="saved-week-tests">
                      {week.groups.map((group) => {
                    const first = group[0];

                    const total =
                      Number(
                        first.total_marks
                      );

                    const scoredStudents =
                      group.filter(
                        (item) =>
                          item.attendance_status ===
                          "PRESENT"
                      );

                    const totalObtained =
                      scoredStudents.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.obtained_marks
                          ),
                        0
                      );

                    const average =
                      scoredStudents.length > 0 &&
                      total > 0
                        ? (totalObtained /
                            (total *
                              scoredStudents.length)) *
                          100
                        : 0;

                    const absentCount =
                      group.filter(
                        (item) =>
                          item.attendance_status ===
                          "ABSENT"
                      ).length;

                    const noTestCount =
                      group.filter(
                        (item) =>
                          item.attendance_status ===
                          "NO_TEST"
                      ).length;

                    const imageCount =
                      group.reduce(
                        (
                          count,
                          item
                        ) =>
                          count +
                          getImageUrls(
                            item.test_images
                          ).length,
                        0
                      );

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
                            {first.test_name}
                          </h4>

                          <div
                            style={
                              styles.savedMeta
                            }
                          >
                            {first.test_date}
                            {" • "}
                            Total Marks:{" "}
                            {total}
                            {" • "}
                            Students:{" "}
                            {group.length}
                            {" • "}
                            Average:{" "}
                            {average.toFixed(
                              1
                            )}
                            %
                          </div>

                          <div
                            style={
                              styles.subjectSummary
                            }
                          >
                            {Array.from(
                              new Set(
                                group.map(
                                  (item) =>
                                    item.subject
                                )
                              )
                            ).map(
                              (subject) => (
                                <span
                                  key={
                                    subject
                                  }
                                  style={
                                    styles.subjectBadge
                                  }
                                >
                                  {subject}
                                </span>
                              )
                            )}

                            {absentCount >
                              0 && (
                              <span
                                style={
                                  styles.absentCountBadge
                                }
                              >
                                {absentCount}{" "}
                                Absent
                              </span>
                            )}

                            {noTestCount >
                              0 && (
                              <span
                                style={
                                  styles.noTestCountBadge
                                }
                              >
                                {noTestCount}{" "}
                                No Test
                              </span>
                            )}

                            <span
                              style={
                                styles.imageCountBadge
                              }
                            >
                              {imageCount} Images
                            </span>
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
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              downloadStudentResult(
                                first.student_id,
                                first.test_name,
                                first.test_date
                              )
                            }
                            style={
                              styles.pdfButton
                            }
                          >
                            Result PDF
                          </button>

                          <button
                            onClick={() =>
                              void deleteAssessment(
                                first.test_name,
                                first.test_date
                              )
                            }
                            style={
                              styles.deleteButton
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                      })}
                    </div>}
                  </section>
                ))}
              </div>
            )}
          </div>}

          {activeReportSection === "saved-assessments" && <div style={styles.gradeInfo}>
            <h3 style={styles.gradeInfoTitle}>
              Grade System
            </h3>

            <div className="gradeGrid" style={styles.gradeGrid}>
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
          </div>}
        </section>
        }

        {activeReportSection === "attendance-records" &&
        <section className="reports-records" style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Attendance Records
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
            <div className="recordGrid" style={styles.recordGrid}>
              {reportData.map((item) => (
                <div
                  key={item.student.id}
                  style={styles.recordCard}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setStudentDetailMonth(month); setStudentDetailYear(year); setSelectedReportStudentId(item.student.id); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setStudentDetailMonth(month); setStudentDetailYear(year); setSelectedReportStudentId(item.student.id); } }}
                >
                  <div>
                    <strong
                      style={
                        styles.recordName
                      }
                    >
                      {item.student.student_name || item.student.student_username}
                    </strong>

                    <p
                      style={
                        styles.recordDate
                      }
                    >
                      {item.present} present · {item.absent} absent · {item.total} classes
                    </p>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background: "#eef5ff",
                      color: "#2259a7",
                    }}
                  >
                    View records →
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        }

        <footer style={styles.footer}>
          RACER ACADEMY • Teacher Reports •{" "}
          {year}
        </footer>

        {selectedReportStudent && (
          <div className="reports-student-overlay" role="presentation" onClick={() => setSelectedReportStudentId(null)} style={{ position: "fixed", inset: "108px 0 72px", zIndex: 10000, display: "grid", placeItems: "center", padding: 12, background: "rgba(13,29,53,.55)" }}>
            <section className="reports-student-modal" role="dialog" aria-modal="true" aria-label={`${selectedReportStudent.student_name || "Student"} attendance records`} onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 680px)", maxHeight: "calc(100dvh - 200px)", overflow: "auto", padding: 20, borderRadius: 18, background: "#fff", boxShadow: "0 24px 80px rgba(10,25,48,.25)" }}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 15 }}>
                <div><small style={{ color: "#64748b", fontWeight: 800 }}>STUDENT ATTENDANCE</small><h2 style={{ margin: "4px 0", color: "#17345d", fontSize: 21 }}>{selectedReportStudent.student_name || "Student"}</h2><span style={{ color: "#74839a", fontSize: 12 }}>{selectedReportStudent.student_username}</span></div>
                <button type="button" onClick={() => setSelectedReportStudentId(null)} style={{ border: "1px solid #dbe4ef", borderRadius: 9, padding: "8px 11px", background: "#f8fafc", color: "#334155", cursor: "pointer" }}>Close</button>
              </header>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 9, marginBottom: 13 }}>
                <label style={{ display: "grid", gap: 4, color: "#52647d", fontSize: 11, fontWeight: 800 }}>Month<select aria-label="Student report month" value={studentDetailMonth} onChange={(event) => setStudentDetailMonth(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #dbe4ef", borderRadius: 9, background: "#fff", color: "#243b5c" }}>{months.map((item, index) => <option key={item} value={String(index + 1)}>{item}</option>)}</select></label>
                <label style={{ display: "grid", gap: 4, color: "#52647d", fontSize: 11, fontWeight: 800 }}>Year<select aria-label="Student report year" value={studentDetailYear} onChange={(event) => setStudentDetailYear(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #dbe4ef", borderRadius: 9, background: "#fff", color: "#243b5c" }}>{[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((item) => <option key={item} value={String(item)}>{item}</option>)}</select></label>
                <button type="button" onClick={exportSelectedStudentAttendance} style={{ minHeight: 40, padding: "8px 12px", border: 0, borderRadius: 9, background: "#176b45", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Export Excel</button>
                <button type="button" onClick={() => window.print()} style={{ minHeight: 40, padding: "8px 12px", border: 0, borderRadius: 9, background: "#1e3a8a", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Print / Save PDF</button>
              </div>
              <div style={{ maxHeight: "52vh", overflow: "auto", display: "grid", gap: 7 }}>
                {studentDetailLoading ? <p style={{ color: "#64748b" }}>Loading attendance…</p> : studentDetailAttendance.length === 0 ? <p style={{ color: "#64748b" }}>No attendance records found for this month.</p> : studentDetailAttendance.map((record) => (
                  <div key={record.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid #e5ebf3", borderRadius: 11 }}><strong style={{ color: "#334b68", fontSize: 13 }}>{record.attendance_date}</strong><span style={{ color: isPresent(record.status) ? "#16804c" : "#c43d45", fontSize: 12, fontWeight: 850 }}>{record.status}</span></div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<
  string,
  CSSProperties
> = {
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
    fontSize: "16px",
    fontWeight: "800",
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
    WebkitOverflowScrolling: "touch",
  },

  table: {
    width: "100%",
    minWidth: "0",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    overflowWrap: "anywhere",
  },

  assessmentTable: {
    width: "100%",
    minWidth: "1700px",
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
    verticalAlign: "top",
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
    gap: "6px",
    minWidth: "120px",
  },

  progressBackground: {
    width: "70px",
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

  subjectSelect: {
    minWidth: "145px",
    boxSizing: "border-box",
    padding: "9px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "white",
    color: "#111827",
    fontWeight: "700",
  },

  admissionBadge: {
    display: "inline-block",
    background: "#f1f5f9",
    color: "#334155",
    padding: "7px 9px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  smallText: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "11px",
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

  uploadBox: {
    minWidth: "230px",
  },

  uploadButton: {
    display: "inline-block",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
  },

  hiddenFileInput: {
    display: "none",
  },

  optionalText: {
    display: "block",
    marginTop: "5px",
    color: "#64748b",
    fontSize: "11px",
  },

  imagePreviewGrid: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "10px",
  },

  imagePreview: {
    position: "relative",
    width: "65px",
    height: "65px",
  },

  previewImage: {
    width: "65px",
    height: "65px",
    objectFit: "cover",
    borderRadius: "8px",
    border:
      "1px solid #cbd5e1",
  },

  removeImageButton: {
    position: "absolute",
    top: "-7px",
    right: "-7px",
    width: "20px",
    height: "20px",
    border: "none",
    borderRadius: "50%",
    background: "#dc2626",
    color: "white",
    fontWeight: "900",
    cursor: "pointer",
    lineHeight: "20px",
    padding: 0,
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

  subjectSummary: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
    marginTop: "9px",
  },

  subjectBadge: {
    background: "#ede9fe",
    color: "#5b21b6",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
  },

  absentCountBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
  },

  noTestCountBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
  },

  imageCountBadge: {
    background: "#dbeafe",
    color: "#1e3a8a",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
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

  pdfButton: {
    border: "none",
    background: "#ede9fe",
    color: "#6d28d9",
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

