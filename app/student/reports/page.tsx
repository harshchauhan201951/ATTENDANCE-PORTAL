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

type FeeRecord = {
  id: number;
  student_id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  payment_date: string | null;
  payment_mode?: string | null;
  transaction_id?: string | null;
  remarks?: string | null;
  receipt_url?: string | null;
};

type AssessmentRecord = {
  id: number;
  test_name: string;
  test_date: string;
  total_marks: number;
  student_id: number;
  obtained_marks: number;
  remarks: string | null;
  created_at: string;
  subject?: string | null;
  attendance_status?: string | null;
  test_images?: unknown;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type StudentIdentifier = {
  username?: string;
  id?: number;
};

type SectionName =
  | "attendance"
  | "tests"
  | "fees"
  | "overall";

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

function getPercentage(obtained: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  if (!Number.isFinite(obtained)) {
    return 0;
  }

  return Math.min(100, Math.max(0, (obtained / total) * 100));
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function isPass(percentage: number): boolean {
  return percentage >= 40;
}

function isPresentStatus(status: string): boolean {
  const value = String(status || "").trim().toUpperCase();

  return value === "PRESENT" || value === "P";
}

function isAbsentStatus(status: string): boolean {
  const value = String(status || "").trim().toUpperCase();

  return value === "ABSENT" || value === "A";
}

function parseLocalDate(
  dateString: string | null | undefined
): Date | null {
  if (!dateString) {
    return null;
  }

  const value = String(dateString).slice(0, 10);

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(
  dateString: string | null | undefined
): string {
  if (!dateString) {
    return "—";
  }

  const date = parseLocalDate(dateString);

  if (!date) {
    return String(dateString);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDayName(
  dateString: string | null | undefined
): string {
  const date = parseLocalDate(dateString);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
  });
}

/*
 * FIXED:
 * This function is intentionally kept simple so the
 * TypeScript/Turbopack parser cannot get confused.
 */
function getAttendanceKey(dateString: string): string {
  const date = parseLocalDate(dateString);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return year + "-" + month;
}

function getMonthLabel(key: string): string {
  const parts = key.split("-");

  if (parts.length !== 2) {
    return key;
  }

  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;

  if (
    !Number.isFinite(year) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return key;
  }

  return months[monthIndex] + " " + year;
}

function getImageUrls(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item): string => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item === "object" && item !== null) {
          const objectItem = item as Record<string, unknown>;

          if (typeof objectItem.url === "string") {
            return objectItem.url;
          }

          if (typeof objectItem.path === "string") {
            return objectItem.path;
          }
        }

        return "";
      })
      .filter((item) => item.trim().length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return getImageUrls(parsed);
      }

      if (parsed && typeof parsed === "object") {
        const objectValue = parsed as Record<string, unknown>;

        if (typeof objectValue.url === "string") {
          return [objectValue.url];
        }

        if (typeof objectValue.path === "string") {
          return [objectValue.path];
        }
      }
    } catch {
      // Normal URL/string.
    }

    return [trimmed];
  }

  return [];
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFeeStatus(
  status: string
): "paid" | "pending" | "refunded" | "other" {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (
    value === "paid" ||
    value === "success" ||
    value === "successful" ||
    value === "completed"
  ) {
    return "paid";
  }

  if (
    value === "pending" ||
    value === "unpaid" ||
    value === "due"
  ) {
    return "pending";
  }

  if (value === "refunded" || value === "refund") {
    return "refunded";
  }

  return "other";
}

function CircularProgress({
  percentage,
  size = 170,
  stroke = 14,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
}) {
  const safePercentage = Math.min(
    100,
    Math.max(0, Number(percentage) || 0)
  );

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const offset =
    circumference -
    (safePercentage / 100) * circumference;

  return (
    <div
      className="circular-progress"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="circular-content">
        <strong>{safePercentage.toFixed(1)}%</strong>
        <span>OVERALL</span>
      </div>
    </div>
  );
}

function createPdfWindow(
  student: Student,
  assessments: AssessmentRecord[],
  selectedSubject: string
) {
  const filtered =
    selectedSubject === "All"
      ? assessments
      : assessments.filter(
          (test) =>
            String(test.subject || "") === selectedSubject
        );

  const totalMarks = filtered.reduce(
    (sum, test) => sum + (Number(test.total_marks) || 0),
    0
  );

  const obtainedMarks = filtered.reduce(
    (sum, test) => sum + (Number(test.obtained_marks) || 0),
    0
  );

  const percentage = getPercentage(
    obtainedMarks,
    totalMarks
  );

  const testRows = filtered
    .map((test, index) => {
      const testPercentage = getPercentage(
        Number(test.obtained_marks) || 0,
        Number(test.total_marks) || 0
      );

      return (
        "<tr>" +
        "<td>" +
        String(index + 1) +
        "</td>" +
        "<td>" +
        escapeHtml(test.test_name) +
        "</td>" +
        "<td>" +
        escapeHtml(test.subject || "Not Specified") +
        "</td>" +
        "<td>" +
        escapeHtml(formatDate(test.test_date)) +
        "</td>" +
        "<td>" +
        String(test.obtained_marks) +
        " / " +
        String(test.total_marks) +
        "</td>" +
        "<td>" +
        testPercentage.toFixed(1) +
        "%</td>" +
        "<td>" +
        getGrade(testPercentage) +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  const html =
    "<!DOCTYPE html>" +
    "<html>" +
    "<head>" +
    "<title>RACER ACADEMY - Test Report</title>" +
    "<meta charset='UTF-8' />" +
    "<style>" +
    "body{font-family:Arial,Helvetica,sans-serif;padding:30px;color:#172554}" +
    ".header{text-align:center;border-bottom:3px solid #2563eb;padding-bottom:20px;margin-bottom:25px}" +
    ".brand{font-size:28px;font-weight:800;color:#1e3a8a}" +
    ".subtitle{color:#64748b;margin-top:6px}" +
    ".student{background:#eff6ff;padding:18px;border-radius:12px;margin-bottom:20px}" +
    ".summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:25px}" +
    ".box{border:1px solid #dbeafe;padding:15px;border-radius:10px;text-align:center}" +
    ".box strong{display:block;font-size:22px;margin-top:5px}" +
    "table{width:100%;border-collapse:collapse}" +
    "th{background:#1e3a8a;color:white;padding:10px;text-align:left}" +
    "td{padding:10px;border-bottom:1px solid #e2e8f0}" +
    ".footer{text-align:center;margin-top:30px;color:#64748b;font-size:12px}" +
    "@media print{body{padding:10px}.summary{grid-template-columns:repeat(4,1fr)}}" +
    "</style>" +
    "</head>" +
    "<body>" +
    "<div class='header'>" +
    "<div class='brand'>RACER ACADEMY</div>" +
    "<div class='subtitle'>Student Test Performance Report</div>" +
    "</div>" +
    "<div class='student'>" +
    "<strong>Student:</strong> " +
    escapeHtml(
      student.student_name || student.student_username
    ) +
    "<br/>" +
    "<strong>Username:</strong> " +
    escapeHtml(student.student_username) +
    "<br/>" +
    "<strong>Subject:</strong> " +
    escapeHtml(selectedSubject) +
    "</div>" +
    "<div class='summary'>" +
    "<div class='box'>Tests<strong>" +
    String(filtered.length) +
    "</strong></div>" +
    "<div class='box'>Obtained<strong>" +
    String(obtainedMarks) +
    "</strong></div>" +
    "<div class='box'>Total<strong>" +
    String(totalMarks) +
    "</strong></div>" +
    "<div class='box'>Average<strong>" +
    percentage.toFixed(1) +
    "%</strong></div>" +
    "</div>" +
    "<table>" +
    "<thead><tr>" +
    "<th>#</th>" +
    "<th>Test</th>" +
    "<th>Subject</th>" +
    "<th>Date</th>" +
    "<th>Marks</th>" +
    "<th>Percentage</th>" +
    "<th>Grade</th>" +
    "</tr></thead>" +
    "<tbody>" +
    (testRows ||
      "<tr><td colspan='7'>No test records found.</td></tr>") +
    "</tbody>" +
    "</table>" +
    "<div class='footer'>Generated from RACER ACADEMY Student Portal</div>" +
    "</body>" +
    "</html>";

  const printWindow = window.open(
    "",
    "_blank",
    "width=1100,height=800"
  );

  if (!printWindow) {
    alert(
      "Please allow pop-ups to download the PDF report."
    );
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

export default function StudentReportsPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [assessments, setAssessments] =
    useState<AssessmentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  const [selectedSubject, setSelectedSubject] =
    useState("All");

  const [openSection, setOpenSection] =
    useState<SectionName>("attendance");

  const [expandedMonth, setExpandedMonth] =
    useState<string | null>(null);

  const [expandedTestId, setExpandedTestId] =
    useState<number | null>(null);

  const [expandedImages, setExpandedImages] =
    useState<number | null>(null);

  const [showAllFees, setShowAllFees] = useState(false);

  useEffect(() => {
    void loadReport();
  }, []);

  function readStorageValue(key: string): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const localValue = localStorage.getItem(key);

    if (localValue && localValue.trim()) {
      return localValue.trim();
    }

    const sessionValue = sessionStorage.getItem(key);

    if (sessionValue && sessionValue.trim()) {
      return sessionValue.trim();
    }

    return null;
  }

  function extractStudentIdentifier(
    value: unknown
  ): StudentIdentifier {
    if (!value) {
      return {};
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) {
        return {};
      }

      try {
        const parsed = JSON.parse(trimmed);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          return extractStudentIdentifier(parsed);
        }
      } catch {
        return {
          username: trimmed,
        };
      }

      return {
        username: trimmed,
      };
    }

    if (typeof value !== "object") {
      return {};
    }

    const obj = value as Record<string, unknown>;

    const nestedKeys = [
      "student",
      "studentData",
      "loggedInStudent",
      "currentStudent",
      "student_user",
      "user",
      "currentUser",
      "loggedInUser",
      "profile",
      "data",
    ];

    for (const key of nestedKeys) {
      if (obj[key]) {
        const result =
          extractStudentIdentifier(obj[key]);

        if (
          result.username ||
          result.id !== undefined
        ) {
          return result;
        }
      }
    }

    const usernameKeys = [
      "student_username",
      "studentUsername",
      "username",
      "user_name",
      "userName",
      "login_username",
      "loginUsername",
    ];

    for (const key of usernameKeys) {
      const item = obj[key];

      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return {
          username: item.trim(),
        };
      }
    }

    const idKeys = [
      "student_id",
      "studentId",
      "studentID",
      "id",
    ];

    for (const key of idKeys) {
      const item = obj[key];

      if (
        item !== undefined &&
        item !== null
      ) {
        const numericId = Number(item);

        if (Number.isFinite(numericId)) {
          return {
            id: numericId,
          };
        }
      }
    }

    return {};
  }

  function getStudentIdentifier(): StudentIdentifier {
    if (typeof window === "undefined") {
      return {};
    }

    const usernameKeys = [
      "student_username",
      "studentUsername",
      "username",
      "student_username_value",
      "loggedInStudentUsername",
      "user_name",
      "userName",
      "login_username",
      "loginUsername",
    ];

    const idKeys = [
      "student_id",
      "studentId",
      "studentID",
      "loggedInStudentId",
    ];

    for (const key of usernameKeys) {
      const value = readStorageValue(key);

      if (value) {
        const result =
          extractStudentIdentifier(value);

        if (
          result.username ||
          result.id !== undefined
        ) {
          return result;
        }
      }
    }

    for (const key of idKeys) {
      const value = readStorageValue(key);

      if (value) {
        const result =
          extractStudentIdentifier(value);

        if (
          result.username ||
          result.id !== undefined
        ) {
          return result;
        }
      }
    }

    const objectKeys = [
      "student",
      "studentData",
      "loggedInStudent",
      "currentStudent",
      "student_user",
      "user",
      "currentUser",
      "loggedInUser",
      "studentLogin",
      "student_login",
      "loginData",
      "userData",
    ];

    for (const key of objectKeys) {
      const value = readStorageValue(key);

      if (!value) {
        continue;
      }

      const result =
        extractStudentIdentifier(value);

      if (
        result.username ||
        result.id !== undefined
      ) {
        return result;
      }
    }

    const storages: Storage[] = [
      localStorage,
      sessionStorage,
    ];

    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);

        if (!key) {
          continue;
        }

        const lowerKey = key.toLowerCase();

        if (
          !lowerKey.includes("student") &&
          !lowerKey.includes("user") &&
          !lowerKey.includes("login")
        ) {
          continue;
        }

        const value = storage.getItem(key);

        if (!value) {
          continue;
        }

        const result =
          extractStudentIdentifier(value);

        if (
          result.username ||
          result.id !== undefined
        ) {
          return result;
        }
      }
    }

    return {};
  }

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
        "id, student_name, student_username"
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
        "id, student_name, student_username"
      )
      .ilike("student_username", cleanUsername)
      .limit(1);

    if (fallbackResult.error) {
      throw new Error(
        fallbackResult.error.message
      );
    }

    if (
      fallbackResult.data &&
      fallbackResult.data.length > 0
    ) {
      return fallbackResult.data[0] as Student;
    }

    return null;
  }

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const identifier =
        getStudentIdentifier();

      if (
        !identifier.username &&
        identifier.id === undefined
      ) {
        setError(
          "Student login information not found. Please login again."
        );
        return;
      }

      let studentData: Student | null = null;

      if (identifier.username) {
        studentData =
          await findStudentByUsername(
            identifier.username
          );
      }

      if (
        !studentData &&
        identifier.id !== undefined
      ) {
        const result = await supabase
          .from("students")
          .select(
            "id, student_name, student_username"
          )
          .eq("id", identifier.id)
          .maybeSingle();

        if (result.error) {
          throw new Error(result.error.message);
        }

        studentData =
          result.data as Student | null;
      }

      if (!studentData) {
        setError("Student account not found.");
        return;
      }

      setStudent(studentData);

      const [
        attendanceResult,
        feeResult,
        assessmentResult,
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select(
            "id, student_id, attendance_date, status"
          )
          .eq("student_id", studentData.id)
          .order("attendance_date", {
            ascending: false,
          }),

        supabase
          .from("fees")
          .select("*")
          .eq("student_id", studentData.id)
          .order("year", {
            ascending: false,
          })
          .order("month", {
            ascending: false,
          }),

        supabase
          .from("academy_assessments")
          .select("*")
          .eq("student_id", studentData.id)
          .order("test_date", {
            ascending: false,
          }),
      ]);

      if (attendanceResult.error) {
        throw new Error(
          attendanceResult.error.message
        );
      }

      if (feeResult.error) {
        throw new Error(
          feeResult.error.message
        );
      }

      if (assessmentResult.error) {
        throw new Error(
          assessmentResult.error.message
        );
      }

      setAttendance(
        (attendanceResult.data ||
          []) as AttendanceRecord[]
      );

      setFees(
        (feeResult.data ||
          []) as FeeRecord[]
      );

      setAssessments(
        (assessmentResult.data ||
          []) as AssessmentRecord[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading reports."
      );
    } finally {
      setLoading(false);
    }
  }

  const overallAttendanceStats =
    useMemo(() => {
      const total = attendance.length;

      const present = attendance.filter(
        (record) =>
          isPresentStatus(record.status)
      ).length;

      const absent = attendance.filter(
        (record) =>
          isAbsentStatus(record.status)
      ).length;

      const percentage =
        total > 0
          ? (present / total) * 100
          : 0;

      return {
        total,
        present,
        absent,
        percentage,
      };
    }, [attendance]);

  const monthlyAttendance =
    useMemo(() => {
      const grouped =
        new Map<string, AttendanceRecord[]>();

      attendance.forEach((record) => {
        const key =
          getAttendanceKey(
            record.attendance_date
          );

        if (!key) {
          return;
        }

        const current =
          grouped.get(key) || [];

        current.push(record);
        grouped.set(key, current);
      });

      return Array.from(grouped.entries())
        .map(([key, records]) => {
          const present =
            records.filter(
              (record) =>
                isPresentStatus(record.status)
            ).length;

          const absent =
            records.filter(
              (record) =>
                isAbsentStatus(record.status)
            ).length;

          const total = records.length;

          const percentage =
            total > 0
              ? (present / total) * 100
              : 0;

          return {
            key,
            records: [...records].sort(
              (a, b) =>
                a.attendance_date.localeCompare(
                  b.attendance_date
                )
            ),
            present,
            absent,
            total,
            percentage,
          };
        })
        .sort((a, b) =>
          a.key.localeCompare(b.key)
        );
    }, [attendance]);

  const selectedMonthKey =
    String(selectedYear) +
    "-" +
    String(selectedMonth).padStart(2, "0");

  const selectedMonthAttendance =
    monthlyAttendance.find(
      (item) =>
        item.key === selectedMonthKey
    );

  const filteredAssessments =
    useMemo(() => {
      if (selectedSubject === "All") {
        return assessments;
      }

      return assessments.filter(
        (test) =>
          String(test.subject || "") ===
          selectedSubject
      );
    }, [
      assessments,
      selectedSubject,
    ]);

  const availableSubjects =
    useMemo(() => {
      const subjects = assessments
        .map((test) =>
          String(test.subject || "").trim()
        )
        .filter(Boolean);

      return Array.from(
        new Set(subjects)
      ).sort();
    }, [assessments]);

  const assessmentStats =
    useMemo(() => {
      const totalTests =
        filteredAssessments.length;

      const totalMarks =
        filteredAssessments.reduce(
          (sum, test) =>
            sum +
            (Number(test.total_marks) || 0),
          0
        );

      const obtainedMarks =
        filteredAssessments.reduce(
          (sum, test) =>
            sum +
            (Number(test.obtained_marks) || 0),
          0
        );

      const averagePercentage =
        getPercentage(
          obtainedMarks,
          totalMarks
        );

      const passedTests =
        filteredAssessments.filter(
          (test) =>
            isPass(
              getPercentage(
                Number(
                  test.obtained_marks
                ) || 0,
                Number(
                  test.total_marks
                ) || 0
              )
            )
        ).length;

      const failedTests =
        totalTests - passedTests;

      return {
        totalTests,
        totalMarks,
        obtainedMarks,
        averagePercentage,
        passedTests,
        failedTests,
      };
    }, [filteredAssessments]);

  const feeStats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;

    fees.forEach((fee) => {
      const amount =
        Number(fee.amount) || 0;

      total += amount;

      const status =
        getFeeStatus(fee.status);

      if (status === "paid") {
        paid += amount;
      }

      if (status === "pending") {
        pending += amount;
      }
    });

    return {
      total,
      paid,
      pending,
    };
  }, [fees]);

  const selectedFees =
    useMemo(() => {
      if (showAllFees) {
        return fees;
      }

      return fees.filter(
        (fee) =>
          Number(fee.month) ===
            selectedMonth &&
          Number(fee.year) ===
            selectedYear
      );
    }, [
      fees,
      selectedMonth,
      selectedYear,
      showAllFees,
    ]);

  const overallPerformance =
    useMemo(() => {
      const attendanceValue =
        overallAttendanceStats.percentage;

      const testValue =
        assessmentStats.averagePercentage;

      const hasAttendance =
        attendance.length > 0;

      const hasTests =
        assessments.length > 0;

      if (
        hasAttendance &&
        hasTests
      ) {
        return (
          (attendanceValue +
            testValue) /
          2
        );
      }

      if (hasAttendance) {
        return attendanceValue;
      }

      if (hasTests) {
        return testValue;
      }

      return 0;
    }, [
      attendance,
      assessments,
      overallAttendanceStats.percentage,
      assessmentStats.averagePercentage,
    ]);

  function toggleSection(
    section: SectionName
  ) {
    setOpenSection(section);
  }

  function logout() {
    const keys = [
      "student_username",
      "studentUsername",
      "username",
      "student_username_value",
      "loggedInStudentUsername",
      "student_id",
      "studentId",
      "studentID",
      "loggedInStudentId",
      "student",
      "studentData",
      "loggedInStudent",
      "currentStudent",
      "student_user",
      "user",
      "currentUser",
      "loggedInUser",
      "studentLogin",
      "student_login",
      "loginData",
      "userData",
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.href = "/";
  }

  function downloadAllResults() {
    if (!student) {
      return;
    }

    createPdfWindow(
      student,
      assessments,
      selectedSubject
    );
  }

  function downloadSingleResult(
    test: AssessmentRecord
  ) {
    if (!student) {
      return;
    }

    createPdfWindow(
      student,
      [test],
      String(test.subject || "All")
    );
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div className="loading-icon">
            📊
          </div>

          <strong>
            Loading Student Reports...
          </strong>

          <span>
            Please wait while your
            complete report is loaded.
          </span>
        </div>
      </main>
    );
  }

  return (
    <main
      style={styles.page}
      className="reports-page"
    >
      <div
        style={styles.container}
        className="reports-container"
      >
        <header
          style={styles.header}
          className="reports-header"
        >
          <div className="reports-header-content">
            <div style={styles.smallTitle}>
              RACER ACADEMY
            </div>

            <h1 style={styles.title}>
              Student Reports
            </h1>

            <p style={styles.subtitle}>
              Complete attendance, test,
              fee and performance report
            </p>
          </div>

          <div style={styles.headerButtons}>
            <Link
              href="/student/dashboard"
              style={styles.dashboardButton}
            >
              ← Dashboard
            </Link>

            <button
              type="button"
              style={styles.logoutButton}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <section
          style={styles.studentCard}
          className="student-info-card"
        >
          <div style={styles.studentIcon}>
            👨‍🎓
          </div>

          <div style={styles.studentInfoContent}>
            <span className="profile-status">
              ● STUDENT PROFILE
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
          </div>
        </section>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        <section
          style={styles.filterCard}
          className="filter-card"
        >
          <div>
            <h2 style={styles.sectionTitle}>
              Report Period
            </h2>

            <p style={styles.sectionSubtitle}>
              Select month and year to view
              detailed attendance and fee
              information.
            </p>
          </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>
                Month
              </label>

              <select
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(
                    Number(event.target.value)
                  )
                }
                style={styles.input}
              >
                {months.map((month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Year
              </label>

              <select
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(
                    Number(event.target.value)
                  )
                }
                style={styles.input}
              >
                {[
                  2025,
                  2026,
                  2027,
                  2028,
                  2029,
                  2030,
                ].map((year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ================= ATTENDANCE ================= */}

        <section
          style={styles.accordionCard}
          className="accordion-card"
        >
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("attendance")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon attendance-icon">
                📅
              </div>

              <div>
                <h2>Attendance</h2>

                <p>
                  Complete graphical
                  attendance report
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value green-value">
                {overallAttendanceStats.percentage.toFixed(
                  1
                )}
                %
              </span>

              <span className="accordion-arrow">
                {openSection === "attendance"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection === "attendance" && (
            <div className="accordion-content">
              <div className="attendance-hero">
                <div className="attendance-circle-wrap">
                  <CircularProgress
                    percentage={
                      overallAttendanceStats.percentage
                    }
                    size={190}
                    stroke={15}
                  />
                </div>

                <div className="attendance-hero-info">
                  <span className="eyebrow">
                    OVERALL ATTENDANCE
                  </span>

                  <h2>
                    {overallAttendanceStats.percentage >=
                    75
                      ? "🎯 Attendance is on track"
                      : "⚠️ Attendance needs attention"}
                  </h2>

                  <p>
                    Your attendance percentage
                    is calculated from all
                    attendance records available
                    in your account.
                  </p>

                  <div className="attendance-mini-grid">
                    <div className="attendance-mini">
                      <span>PRESENT</span>

                      <strong className="green-text">
                        {
                          overallAttendanceStats.present
                        }
                      </strong>
                    </div>

                    <div className="attendance-mini">
                      <span>ABSENT</span>

                      <strong className="red-text">
                        {
                          overallAttendanceStats.absent
                        }
                      </strong>
                    </div>

                    <div className="attendance-mini">
                      <span>TOTAL</span>

                      <strong>
                        {
                          overallAttendanceStats.total
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="selected-period-card">
                <div>
                  <span>SELECTED MONTH</span>

                  <strong>
                    {months[selectedMonth - 1]}{" "}
                    {selectedYear}
                  </strong>
                </div>

                <div className="selected-period-value">
                  {selectedMonthAttendance
                    ? selectedMonthAttendance.percentage.toFixed(
                        1
                      )
                    : "0.0"}
                  %
                </div>
              </div>

              <div className="month-section-heading">
                <div>
                  <span className="eyebrow">
                    MONTH-WISE REPORT
                  </span>

                  <h3>
                    Attendance by Month
                  </h3>
                </div>

                <span>
                  {monthlyAttendance.length}{" "}
                  month
                  {monthlyAttendance.length !==
                  1
                    ? "s"
                    : ""}
                </span>
              </div>

              {monthlyAttendance.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    📅
                  </div>

                  <h3>
                    No Attendance Records
                  </h3>

                  <p>
                    Attendance records will
                    appear here after your
                    teacher marks attendance.
                  </p>
                </div>
              ) : (
                <div className="monthly-list">
                  {monthlyAttendance.map(
                    (monthData) => {
                      const isOpen =
                        expandedMonth ===
                        monthData.key;

                      const ringDegrees =
                        (monthData.percentage /
                          100) *
                        360;

                      return (
                        <article
                          key={monthData.key}
                          className={
                            isOpen
                              ? "month-card month-card-open"
                              : "month-card"
                          }
                        >
                          <button
                            type="button"
                            className="month-card-header"
                            onClick={() =>
                              setExpandedMonth(
                                isOpen
                                  ? null
                                  : monthData.key
                              )
                            }
                          >
                            <div className="month-title-area">
                              <div className="month-icon">
                                📆
                              </div>

                              <div>
                                <strong>
                                  {getMonthLabel(
                                    monthData.key
                                  )}
                                </strong>

                                <span>
                                  {
                                    monthData.total
                                  }{" "}
                                  attendance
                                  records
                                </span>
                              </div>
                            </div>

                            <div className="month-stat-area">
                              <div
                                className="mini-ring"
                                style={{
                                  background: `conic-gradient(#2563eb 0deg, #2563eb ${ringDegrees}deg, #e2e8f0 ${ringDegrees}deg, #e2e8f0 360deg)`,
                                }}
                              >
                                <span>
                                  {monthData.percentage.toFixed(
                                    0
                                  )}
                                  %
                                </span>
                              </div>

                              <div className="month-stat-text">
                                <span className="green-text">
                                  {
                                    monthData.present
                                  }{" "}
                                  Present
                                </span>

                                <span className="red-text">
                                  {
                                    monthData.absent
                                  }{" "}
                                  Absent
                                </span>
                              </div>

                              <span className="month-arrow">
                                {isOpen
                                  ? "⌃"
                                  : "⌄"}
                              </span>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="month-details">
                              <div className="month-detail-summary">
                                <div>
                                  <span>
                                    PRESENT
                                  </span>

                                  <strong className="green-text">
                                    {
                                      monthData.present
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    ABSENT
                                  </span>

                                  <strong className="red-text">
                                    {
                                      monthData.absent
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    TOTAL
                                  </span>

                                  <strong>
                                    {
                                      monthData.total
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    PERCENTAGE
                                  </span>

                                  <strong>
                                    {monthData.percentage.toFixed(
                                      1
                                    )}
                                    %
                                  </strong>
                                </div>
                              </div>

                              <div className="day-list">
                                {monthData.records.map(
                                  (
                                    record,
                                    index
                                  ) => {
                                    const present =
                                      isPresentStatus(
                                        record.status
                                      );

                                    return (
                                      <div
                                        key={
                                          record.id
                                        }
                                        className={
                                          present
                                            ? "day-attendance day-present"
                                            : "day-attendance day-absent"
                                        }
                                      >
                                        <div className="day-date">
                                          <strong>
                                            {String(
                                              index +
                                                1
                                            ).padStart(
                                              2,
                                              "0"
                                            )}
                                          </strong>

                                          <span>
                                            {formatDate(
                                              record.attendance_date
                                            )}
                                          </span>
                                        </div>

                                        <div className="day-full-date">
                                          {getDayName(
                                            record.attendance_date
                                          )}
                                        </div>

                                        <span
                                          className={
                                            present
                                              ? "day-status status-present"
                                              : "day-status status-absent"
                                          }
                                        >
                                          {present
                                            ? "✓ Present"
                                            : "✕ Absent"}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ================= TEST ZONE ================= */}

        <section
          style={styles.accordionCard}
          className="accordion-card"
        >
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("tests")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon test-icon">
                🏆
              </div>

              <div>
                <h2>Test Zone</h2>

                <p>
                  Tests, marks, grades,
                  remarks and reports
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value purple-value">
                {assessmentStats.averagePercentage.toFixed(
                  1
                )}
                %
              </span>

              <span className="accordion-arrow">
                {openSection === "tests"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection === "tests" && (
            <div className="accordion-content">
              <div className="test-zone-hero">
                <div>
                  <span className="eyebrow purple-eyebrow">
                    ACADEMIC PERFORMANCE
                  </span>

                  <h2>
                    Your Test Performance
                  </h2>

                  <p>
                    Review every test,
                    marks, percentage, grade,
                    remarks and uploaded test
                    images.
                  </p>
                </div>

                <button
                  type="button"
                  className="all-pdf-button"
                  onClick={downloadAllResults}
                  disabled={
                    assessments.length ===
                    0
                  }
                >
                  📄 Download All PDF
                </button>
              </div>

              <div className="test-filter-row">
                <div>
                  <label>
                    Filter by Subject
                  </label>

                  <select
                    value={selectedSubject}
                    onChange={(event) =>
                      setSelectedSubject(
                        event.target.value
                      )
                    }
                    style={
                      styles.subjectSelect
                    }
                  >
                    <option value="All">
                      All Subjects
                    </option>

                    {availableSubjects.map(
                      (subject) => (
                        <option
                          key={subject}
                          value={subject}
                        >
                          {subject}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="test-overview">
                <div className="test-overview-circle">
                  <CircularProgress
                    percentage={
                      assessmentStats.averagePercentage
                    }
                    size={145}
                    stroke={12}
                  />
                </div>

                <div className="test-overview-stats">
                  <div>
                    <span>TOTAL TESTS</span>

                    <strong>
                      {
                        assessmentStats.totalTests
                      }
                    </strong>
                  </div>

                  <div className="overview-pass">
                    <span>PASSED</span>

                    <strong>
                      {
                        assessmentStats.passedTests
                      }
                    </strong>
                  </div>

                  <div className="overview-fail">
                    <span>FAILED</span>

                    <strong>
                      {
                        assessmentStats.failedTests
                      }
                    </strong>
                  </div>

                  <div>
                    <span>AVERAGE</span>

                    <strong>
                      {assessmentStats.averagePercentage.toFixed(
                        1
                      )}
                      %
                    </strong>
                  </div>
                </div>
              </div>

              {filteredAssessments.length ===
              0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    🏆
                  </div>

                  <h3>
                    No Test Records
                  </h3>

                  <p>
                    Your test results will
                    appear here when available.
                  </p>
                </div>
              ) : (
                <div className="compact-test-list">
                  {filteredAssessments.map(
                    (test, index) => {
                      const testPercentage =
                        getPercentage(
                          Number(
                            test.obtained_marks
                          ) || 0,
                          Number(
                            test.total_marks
                          ) || 0
                        );

                      const passed =
                        isPass(
                          testPercentage
                        );

                      const isOpen =
                        expandedTestId ===
                        test.id;

                      const imageUrls =
                        getImageUrls(
                          test.test_images
                        );

                      return (
                        <article
                          key={test.id}
                          className={
                            isOpen
                              ? "compact-test-card test-open"
                              : "compact-test-card"
                          }
                        >
                          <button
                            type="button"
                            className="compact-test-header"
                            onClick={() =>
                              setExpandedTestId(
                                isOpen
                                  ? null
                                  : test.id
                              )
                            }
                          >
                            <div className="test-index">
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </div>

                            <div className="compact-test-main">
                              <div className="compact-test-title-row">
                                <strong>
                                  {
                                    test.test_name
                                  }
                                </strong>

                                <span
                                  className={
                                    passed
                                      ? "pass-pill"
                                      : "fail-pill"
                                  }
                                >
                                  {passed
                                    ? "PASS"
                                    : "FAIL"}
                                </span>
                              </div>

                              <div className="compact-test-subtitle">
                                <span>
                                  {test.subject ||
                                    "Subject Not Specified"}
                                </span>

                                <span>
                                  {formatDate(
                                    test.test_date
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="compact-score">
                              <strong>
                                {
                                  test.obtained_marks
                                }
                                /
                                {
                                  test.total_marks
                                }
                              </strong>

                              <span>
                                {testPercentage.toFixed(
                                  1
                                )}
                                %
                              </span>
                            </div>

                            <span className="compact-arrow">
                              {isOpen
                                ? "⌃"
                                : "⌄"}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="test-details-panel">
                              <div className="test-detail-grid">
                                <div>
                                  <span>
                                    TEST
                                  </span>

                                  <strong>
                                    {
                                      test.test_name
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    SUBJECT
                                  </span>

                                  <strong>
                                    {test.subject ||
                                      "Not Specified"}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    DATE
                                  </span>

                                  <strong>
                                    {formatDate(
                                      test.test_date
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    MARKS
                                  </span>

                                  <strong>
                                    {
                                      test.obtained_marks
                                    }{" "}
                                    /{" "}
                                    {
                                      test.total_marks
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    PERCENTAGE
                                  </span>

                                  <strong>
                                    {testPercentage.toFixed(
                                      1
                                    )}
                                    %
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    GRADE
                                  </span>

                                  <strong>
                                    {getGrade(
                                      testPercentage
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <div className="remarks-panel">
                                <span>
                                  REMARKS
                                </span>

                                <p>
                                  {test.remarks ||
                                    "No remarks added for this test."}
                                </p>
                              </div>

                              <div className="test-action-row">
                                <button
                                  type="button"
                                  className="single-pdf-button"
                                  onClick={() =>
                                    downloadSingleResult(
                                      test
                                    )
                                  }
                                >
                                  📄 Download PDF
                                </button>

                                {imageUrls.length >
                                  0 && (
                                  <button
                                    type="button"
                                    className="image-toggle-button"
                                    onClick={() =>
                                      setExpandedImages(
                                        expandedImages ===
                                          test.id
                                          ? null
                                          : test.id
                                      )
                                    }
                                  >
                                    🖼️{" "}
                                    {expandedImages ===
                                    test.id
                                      ? "Hide Test Images"
                                      : "View Test Images"}
                                  </button>
                                )}
                              </div>

                              {imageUrls.length ===
                                0 && (
                                <div className="no-test-images">
                                  No test images
                                  available.
                                </div>
                              )}

                              {expandedImages ===
                                test.id &&
                                imageUrls.length >
                                  0 && (
                                  <div className="test-image-grid">
                                    {imageUrls.map(
                                      (
                                        image,
                                        imageIndex
                                      ) => (
                                        <a
                                          key={
                                            image +
                                            String(
                                              imageIndex
                                            )
                                          }
                                          href={
                                            image
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="test-image-card"
                                        >
                                          <img
                                            src={
                                              image
                                            }
                                            alt={
                                              "Test image " +
                                              String(
                                                imageIndex +
                                                  1
                                              )
                                            }
                                          />

                                          <span>
                                            Open Image
                                          </span>
                                        </a>
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

              <div className="grade-info-new">
                <div>
                  <span className="eyebrow">
                    GRADE SYSTEM
                  </span>

                  <h3>
                    Understanding Your
                    Grades
                  </h3>
                </div>

                <div className="grade-new-grid">
                  <span>
                    <strong>A+</strong> 90–100%
                  </span>

                  <span>
                    <strong>A</strong> 80–89%
                  </span>

                  <span>
                    <strong>B+</strong> 70–79%
                  </span>

                  <span>
                    <strong>B</strong> 60–69%
                  </span>

                  <span>
                    <strong>C</strong> 50–59%
                  </span>

                  <span>
                    <strong>D</strong> 40–49%
                  </span>

                  <span>
                    <strong>F</strong> Below 40%
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ================= FEE REPORT ================= */}

        <section
          style={styles.accordionCard}
          className="accordion-card"
        >
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("fees")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon fee-icon-new">
                💰
              </div>

              <div>
                <h2>Fee Report</h2>

                <p>
                  Payment history and fee
                  details
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value">
                ₹
                {feeStats.total.toLocaleString(
                  "en-IN"
                )}
              </span>

              <span className="accordion-arrow">
                {openSection === "fees"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection === "fees" && (
            <div className="accordion-content">
              <div className="fee-overview">
                <div className="fee-overview-item total-fee">
                  <div className="fee-overview-icon">
                    💳
                  </div>

                  <span>TOTAL FEE</span>

                  <strong>
                    ₹
                    {feeStats.total.toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <div className="fee-overview-item paid-fee">
                  <div className="fee-overview-icon">
                    ✓
                  </div>

                  <span>PAID</span>

                  <strong>
                    ₹
                    {feeStats.paid.toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <div className="fee-overview-item pending-fee">
                  <div className="fee-overview-icon">
                    !
                  </div>

                  <span>PENDING</span>

                  <strong>
                    ₹
                    {feeStats.pending.toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>
              </div>

              <div className="selected-fee-banner">
                <div>
                  <span>
                    SELECTED FEE PERIOD
                  </span>

                  <strong>
                    {months[selectedMonth - 1]}{" "}
                    {selectedYear}
                  </strong>
                </div>

                <button
                  type="button"
                  className="view-fees-main-button"
                  onClick={() =>
                    setShowAllFees(
                      !showAllFees
                    )
                  }
                >
                  {showAllFees
                    ? "Show Selected Month"
                    : "View All Fees"}
                </button>
              </div>

              {selectedFees.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    💰
                  </div>

                  <h3>No Fee Records</h3>

                  <p>
                    No fee payment records
                    are available for the
                    selected period.
                  </p>
                </div>
              ) : (
                <div className="fee-card-list">
                  {selectedFees.map((fee) => {
                    const status =
                      getFeeStatus(
                        fee.status
                      );

                    return (
                      <article
                        key={fee.id}
                        className="mobile-fee-card"
                      >
                        <div className="fee-card-top">
                          <div>
                            <span className="fee-month-label">
                              {months[
                                Number(
                                  fee.month
                                ) - 1
                              ] || "Month"}{" "}
                              {fee.year}
                            </span>

                            <strong className="fee-amount">
                              ₹
                              {Number(
                                fee.amount
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </strong>
                          </div>

                          <span
                            className={
                              status === "paid"
                                ? "fee-status fee-paid"
                                : status ===
                                  "pending"
                                ? "fee-status fee-pending"
                                : status ===
                                  "refunded"
                                ? "fee-status fee-refunded"
                                : "fee-status"
                            }
                          >
                            {status === "paid"
                              ? "PAID"
                              : status ===
                                "pending"
                              ? "PENDING"
                              : status ===
                                "refunded"
                              ? "REFUNDED"
                              : String(
                                  fee.status ||
                                    "OTHER"
                                ).toUpperCase()}
                          </span>
                        </div>

                        <div className="fee-details-grid">
                          <div>
                            <span>
                              PAYMENT MODE
                            </span>

                            <strong>
                              {fee.payment_mode ||
                                "—"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              PAYMENT DATE
                            </span>

                            <strong>
                              {formatDate(
                                fee.payment_date
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              TRANSACTION ID
                            </span>

                            <strong>
                              {fee.transaction_id ||
                                "—"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              REMARKS
                            </span>

                            <strong>
                              {fee.remarks ||
                                "—"}
                            </strong>
                          </div>
                        </div>

                        {fee.receipt_url ? (
                          <a
                            href={
                              fee.receipt_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="receipt-button"
                          >
                            🧾 View Payment Receipt
                          </a>
                        ) : (
                          <span className="receipt-unavailable">
                            Receipt not available
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ================= OVERALL PERFORMANCE ================= */}

        <section
          style={styles.accordionCard}
          className="accordion-card"
        >
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("overall")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon overall-icon">
                📊
              </div>

              <div>
                <h2>
                  Overall Performance
                </h2>

                <p>
                  Complete academic
                  performance summary
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value">
                {overallPerformance.toFixed(
                  1
                )}
                %
              </span>

              <span className="accordion-arrow">
                {openSection === "overall"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection === "overall" && (
            <div className="accordion-content">
              <div className="overall-hero">
                <CircularProgress
                  percentage={
                    overallPerformance
                  }
                  size={180}
                  stroke={15}
                />

                <div>
                  <span className="eyebrow">
                    OVERALL PERFORMANCE
                  </span>

                  <h2>
                    {overallPerformance >=
                    80
                      ? "🌟 Excellent Performance"
                      : overallPerformance >=
                        60
                      ? "👍 Good Performance"
                      : overallPerformance >
                        0
                      ? "📈 Keep Improving"
                      : "📚 Performance Data Pending"}
                  </h2>

                  <p>
                    Overall performance
                    combines your available
                    attendance percentage
                    and academy test average.
                  </p>
                </div>
              </div>

              <div className="performance-cards">
                <div className="performance-card attendance-performance">
                  <div className="performance-card-icon">
                    📅
                  </div>

                  <div>
                    <span>ATTENDANCE</span>

                    <strong>
                      {overallAttendanceStats.percentage.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="performance-bar">
                      <div
                        style={{
                          width:
                            Math.min(
                              100,
                              overallAttendanceStats.percentage
                            ) + "%",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="performance-card test-performance">
                  <div className="performance-card-icon">
                    🏆
                  </div>

                  <div>
                    <span>TEST AVERAGE</span>

                    <strong>
                      {assessmentStats.averagePercentage.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="performance-bar">
                      <div
                        style={{
                          width:
                            Math.min(
                              100,
                              assessmentStats.averagePercentage
                            ) + "%",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="performance-card fee-performance">
                  <div className="performance-card-icon">
                    💰
                  </div>

                  <div>
                    <span>FEE STATUS</span>

                    <strong>
                      {feeStats.pending > 0
                        ? "PENDING"
                        : feeStats.paid > 0
                        ? "PAID"
                        : "NO RECORDS"}
                    </strong>

                    <small>
                      {feeStats.pending > 0
                        ? "₹" +
                          feeStats.pending.toLocaleString(
                            "en-IN"
                          ) +
                          " pending"
                        : "Payment status"}
                    </small>
                  </div>
                </div>

                <div className="performance-card overall-performance">
                  <div className="performance-card-icon">
                    ⭐
                  </div>

                  <div>
                    <span>OVERALL SCORE</span>

                    <strong>
                      {overallPerformance.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="performance-bar">
                      <div
                        style={{
                          width:
                            Math.min(
                              100,
                              overallPerformance
                            ) + "%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="performance-summary-grid">
                <div>
                  <span>
                    Attendance Records
                  </span>

                  <strong>
                    {attendance.length}
                  </strong>
                </div>

                <div>
                  <span>Total Tests</span>

                  <strong>
                    {assessments.length}
                  </strong>
                </div>

                <div>
                  <span>Fee Records</span>

                  <strong>
                    {fees.length}
                  </strong>
                </div>

                <div>
                  <span>Passed Tests</span>

                  <strong className="green-text">
                    {
                      assessmentStats.passedTests
                    }
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <strong>RACER ACADEMY</strong>

          <span>
            Student Reports •{" "}
            {new Date().getFullYear()}
          </span>
        </footer>
      </div>

      <style jsx global>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden !important;
        }

        body {
          min-width: 0 !important;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .reports-page {
          color: #172554;
        }

        .reports-container {
          overflow: visible !important;
        }

        .reports-header-content {
          min-width: 0;
          flex: 1 1 300px;
        }

        .profile-status {
          display: inline-block;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          background: rgba(255, 255, 255, 0.16);
          padding: 6px 9px;
          border-radius: 999px;
          margin-bottom: 7px;
        }

        .loading-icon {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .loading span {
          display: block;
          margin-top: 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .accordion-card {
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .accordion-header {
          width: 100%;
          border: 0;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 20px;
          cursor: pointer;
          text-align: left;
          color: #172554;
        }

        .accordion-header:hover {
          background: #f8fafc;
        }

        .accordion-left {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          flex: 1;
        }

        .accordion-left h2 {
          margin: 0;
          font-size: 19px;
          line-height: 1.3;
        }

        .accordion-left p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
        }

        .accordion-icon {
          width: 48px;
          height: 48px;
          min-width: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
        }

        .attendance-icon {
          background: #dbeafe;
        }

        .test-icon {
          background: #ede9fe;
        }

        .fee-icon-new {
          background: #dcfce7;
        }

        .overall-icon {
          background: #fef3c7;
        }

        .accordion-right {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-shrink: 0;
        }

        .header-mini-value {
          font-size: 15px;
          font-weight: 900;
          color: #172554;
        }

        .green-value {
          color: #16a34a;
        }

        .purple-value {
          color: #7c3aed;
        }

        .accordion-arrow {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 900;
        }

        .accordion-content {
          padding: 0 20px 25px;
          border-top: 1px solid #eef2f7;
          animation: reportOpen 0.22s ease;
        }

        @keyframes reportOpen {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .attendance-hero {
          margin-top: 20px;
          padding: 25px;
          border-radius: 20px;
          background: linear-gradient(
            135deg,
            #eff6ff,
            #eef2ff,
            #f5f3ff
          );
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .attendance-circle-wrap {
          flex-shrink: 0;
        }

        .circular-progress {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .circular-progress svg {
          display: block;
        }

        .circular-content {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .circular-content strong {
          font-size: 25px;
          color: #172554;
          line-height: 1;
        }

        .circular-content span {
          margin-top: 7px;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .attendance-hero-info {
          min-width: 0;
          flex: 1;
        }

        .eyebrow {
          display: block;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .attendance-hero-info h2 {
          margin: 7px 0;
          font-size: 25px;
          line-height: 1.25;
        }

        .attendance-hero-info p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          max-width: 650px;
        }

        .attendance-mini-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, minmax(100px, 1fr));
          gap: 10px;
        }

        .attendance-mini {
          background: #ffffff;
          border-radius: 12px;
          padding: 12px;
          border: 1px solid #e2e8f0;
        }

        .attendance-mini span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .attendance-mini strong {
          display: block;
          margin-top: 4px;
          font-size: 21px;
        }

        .green-text {
          color: #16a34a !important;
        }

        .red-text {
          color: #dc2626 !important;
        }

        .selected-period-card {
          margin-top: 20px;
          padding: 17px 19px;
          background: #ffffff;
          border: 1px solid #dbeafe;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .selected-period-card span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .selected-period-card strong {
          display: block;
          margin-top: 4px;
          font-size: 17px;
        }

        .selected-period-value {
          font-size: 25px;
          font-weight: 900;
          color: #2563eb;
        }

        .month-section-heading {
          margin-top: 25px;
          margin-bottom: 13px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
        }

        .month-section-heading h3 {
          margin: 5px 0 0;
          font-size: 19px;
        }

        .month-section-heading > span {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .monthly-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .month-card {
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          overflow: hidden;
          background: #ffffff;
        }

        .month-card-open {
          border-color: #bfdbfe;
          box-shadow: 0 7px 20px rgba(37, 99, 235, 0.08);
        }

        .month-card-header {
          width: 100%;
          border: 0;
          background: #ffffff;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          text-align: left;
        }

        .month-title-area {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          flex: 1;
        }

        .month-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 11px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }

        .month-title-area strong {
          display: block;
          font-size: 14px;
          color: #172554;
        }

        .month-title-area span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
        }

        .month-stat-area {
          display: flex;
          align-items: center;
          gap: 11px;
          flex-shrink: 0;
        }

        .mini-ring {
          width: 43px;
          height: 43px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .mini-ring::after {
          content: "";
          position: absolute;
          inset: 5px;
          background: white;
          border-radius: 50%;
        }

        .mini-ring span {
          position: relative;
          z-index: 1;
          font-size: 9px;
          font-weight: 900;
        }

        .month-stat-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 9px;
          font-weight: 800;
        }

        .month-arrow {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .month-details {
          border-top: 1px solid #e2e8f0;
          padding: 15px;
          background: #f8fafc;
        }

        .month-detail-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 9px;
          margin-bottom: 13px;
        }

        .month-detail-summary > div {
          background: #ffffff;
          border-radius: 11px;
          padding: 11px;
          border: 1px solid #e2e8f0;
        }

        .month-detail-summary span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .month-detail-summary strong {
          display: block;
          margin-top: 4px;
          font-size: 18px;
        }

        .day-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .day-attendance {
          display: grid;
          grid-template-columns: 190px 1fr auto;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
        }

        .day-present {
          border-left: 4px solid #16a34a;
        }

        .day-absent {
          border-left: 4px solid #dc2626;
        }

        .day-date {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .day-date strong {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .day-date span {
          font-size: 11px;
          font-weight: 800;
        }

        .day-full-date {
          color: #64748b;
          font-size: 11px;
        }

        .day-status {
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-present {
          background: #dcfce7;
          color: #166534;
        }

        .status-absent {
          background: #fee2e2;
          color: #991b1b;
        }

        /* TEST ZONE */

        .test-zone-hero {
          margin-top: 20px;
          padding: 22px;
          border-radius: 17px;
          background: linear-gradient(
            135deg,
            #f5f3ff,
            #eef2ff
          );
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .purple-eyebrow {
          color: #7c3aed;
        }

        .test-zone-hero h2 {
          margin: 6px 0;
          font-size: 22px;
        }

        .test-zone-hero p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          max-width: 650px;
        }

        .all-pdf-button,
        .single-pdf-button,
        .image-toggle-button {
          border: 0;
          border-radius: 10px;
          padding: 10px 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .all-pdf-button {
          background: #7c3aed;
          color: white;
          white-space: nowrap;
        }

        .all-pdf-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .test-filter-row {
          margin-top: 17px;
          display: flex;
          justify-content: flex-end;
        }

        .test-filter-row label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
        }

        .test-overview {
          margin-top: 17px;
          padding: 18px;
          border-radius: 16px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .test-overview-circle {
          flex-shrink: 0;
        }

        .test-overview-stats {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .test-overview-stats > div {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 12px;
        }

        .test-overview-stats span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .test-overview-stats strong {
          display: block;
          margin-top: 5px;
          font-size: 20px;
        }

        .overview-pass strong {
          color: #16a34a;
        }

        .overview-fail strong {
          color: #dc2626;
        }

        .compact-test-list {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compact-test-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: white;
        }

        .test-open {
          border-color: #c4b5fd;
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.07);
        }

        .compact-test-header {
          width: 100%;
          border: 0;
          background: white;
          padding: 13px;
          display: grid;
          grid-template-columns: 42px 1fr auto 28px;
          align-items: center;
          gap: 11px;
          text-align: left;
          cursor: pointer;
        }

        .test-index {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: #f5f3ff;
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 11px;
        }

        .compact-test-main {
          min-width: 0;
        }

        .compact-test-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .compact-test-title-row strong {
          font-size: 13px;
        }

        .pass-pill,
        .fail-pill {
          border-radius: 999px;
          padding: 4px 7px;
          font-size: 8px;
          font-weight: 900;
        }

        .pass-pill {
          background: #dcfce7;
          color: #166534;
        }

        .fail-pill {
          background: #fee2e2;
          color: #991b1b;
        }

        .compact-test-subtitle {
          margin-top: 4px;
          display: flex;
          gap: 10px;
          color: #64748b;
          font-size: 10px;
          flex-wrap: wrap;
        }

        .compact-score {
          text-align: right;
        }

        .compact-score strong {
          display: block;
          font-size: 14px;
        }

        .compact-score span {
          display: block;
          margin-top: 2px;
          color: #7c3aed;
          font-size: 9px;
          font-weight: 900;
        }

        .compact-arrow {
          width: 28px;
          height: 28px;
          background: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .test-details-panel {
          border-top: 1px solid #e2e8f0;
          padding: 15px;
          background: #fafafa;
        }

        .test-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .test-detail-grid > div {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
        }

        .test-detail-grid span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
        }

        .test-detail-grid strong {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .remarks-panel {
          margin-top: 10px;
          padding: 13px;
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .remarks-panel > span {
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .remarks-panel p {
          margin: 6px 0 0;
          color: #334155;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .test-action-row {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .single-pdf-button {
          background: #1e3a8a;
          color: white;
        }

        .image-toggle-button {
          background: #ede9fe;
          color: #6d28d9;
        }

        .no-test-images {
          margin-top: 11px;
          color: #64748b;
          background: #f1f5f9;
          border-radius: 9px;
          padding: 10px;
          font-size: 10px;
        }

        .test-image-grid {
          margin-top: 13px;
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(180px, 1fr)
          );
          gap: 10px;
        }

        .test-image-card {
          display: block;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          text-decoration: none;
        }

        .test-image-card img {
          display: block;
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .test-image-card span {
          display: block;
          padding: 8px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 800;
        }

        .grade-info-new {
          margin-top: 18px;
          padding: 16px;
          border-radius: 14px;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .grade-info-new h3 {
          margin: 5px 0 0;
          font-size: 16px;
        }

        .grade-new-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .grade-new-grid span {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 7px 9px;
          border-radius: 8px;
          font-size: 9px;
          color: #64748b;
        }

        .grade-new-grid strong {
          color: #7c3aed;
          margin-right: 3px;
        }

        /* FEES */

        .fee-overview {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .fee-overview-item {
          border-radius: 15px;
          padding: 17px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .fee-overview-icon {
          width: 35px;
          height: 35px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          font-weight: 900;
          margin-bottom: 9px;
        }

        .fee-overview-item > span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .fee-overview-item > strong {
          display: block;
          margin-top: 5px;
          font-size: 21px;
        }

        .total-fee {
          border-top: 4px solid #2563eb;
        }

        .paid-fee {
          border-top: 4px solid #16a34a;
        }

        .pending-fee {
          border-top: 4px solid #dc2626;
        }

        .selected-fee-banner {
          margin-top: 17px;
          background: #f8fafc;
          border-radius: 13px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .selected-fee-banner span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .selected-fee-banner strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
        }

        .view-fees-main-button {
          border: 0;
          background: #1e3a8a;
          color: white;
          border-radius: 9px;
          padding: 9px 12px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .fee-card-list {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mobile-fee-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 15px;
          background: white;
        }

        .fee-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .fee-month-label {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .fee-amount {
          display: block;
          margin-top: 3px;
          color: #172554;
          font-size: 21px;
        }

        .fee-status {
          border-radius: 999px;
          padding: 7px 10px;
          background: #f1f5f9;
          color: #475569;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }

        .fee-paid {
          background: #dcfce7;
          color: #166534;
        }

        .fee-pending {
          background: #fee2e2;
          color: #991b1b;
        }

        .fee-refunded {
          background: #fef3c7;
          color: #92400e;
        }

        .fee-details-grid {
          margin-top: 13px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .fee-details-grid > div {
          background: #f8fafc;
          border-radius: 9px;
          padding: 9px;
          min-width: 0;
        }

        .fee-details-grid span {
          display: block;
          color: #64748b;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .fee-details-grid strong {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .receipt-button {
          display: inline-flex;
          margin-top: 11px;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 9px;
          padding: 8px 11px;
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
        }

        .receipt-unavailable {
          display: inline-block;
          margin-top: 11px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
        }

        /* OVERALL */

        .overall-hero {
          margin-top: 20px;
          padding: 25px;
          border-radius: 20px;
          background: linear-gradient(
            135deg,
            #eef2ff,
            #f5f3ff,
            #eff6ff
          );
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .overall-hero h2 {
          margin: 7px 0;
          font-size: 24px;
        }

        .overall-hero p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
          max-width: 650px;
        }

        .performance-cards {
          margin-top: 17px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 11px;
        }

        .performance-card {
          padding: 15px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .performance-card-icon {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .performance-card > div:last-child {
          min-width: 0;
          flex: 1;
        }

        .performance-card span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .performance-card strong {
          display: block;
          margin-top: 3px;
          font-size: 18px;
        }

        .performance-card small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .performance-bar {
          height: 6px;
          margin-top: 7px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .performance-bar > div {
          height: 100%;
          border-radius: inherit;
          background: #2563eb;
          transition: width 0.3s ease;
        }

        .performance-summary-grid {
          margin-top: 17px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 9px;
        }

        .performance-summary-grid > div {
          background: #f8fafc;
          border-radius: 11px;
          padding: 12px;
          text-align: center;
        }

        .performance-summary-grid span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
        }

        .performance-summary-grid strong {
          display: block;
          margin-top: 4px;
          font-size: 20px;
        }

        /* EMPTY */

        .accordion-content h3 {
          color: #172554;
        }

        .accordion-content p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* RESPONSIVE */

        @media (max-width: 800px) {
          .attendance-hero,
          .overall-hero {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .attendance-mini-grid {
            width: 100%;
          }

          .test-zone-hero {
            flex-direction: column;
            align-items: stretch;
          }

          .all-pdf-button {
            width: 100%;
          }

          .test-overview {
            flex-direction: column;
          }

          .test-overview-stats {
            width: 100%;
          }

          .grade-info-new {
            flex-direction: column;
            align-items: stretch;
          }

          .grade-new-grid {
            justify-content: flex-start;
          }

          .fee-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .reports-page {
            padding: 10px !important;
          }

          .reports-header {
            padding: 16px !important;
            border-radius: 16px !important;
          }

          .reports-header h1 {
            font-size: 24px !important;
          }

          .reports-header p {
            font-size: 11px !important;
          }

          .reports-header-content {
            width: 100%;
            flex-basis: 100%;
          }

          .reports-header
            .reports-header-content {
            margin-bottom: 2px;
          }

          .reports-header > div:last-child {
            width: 100%;
          }

          .reports-header a,
          .reports-header button {
            flex: 1;
          }

          .student-info-card {
            padding: 17px !important;
            border-radius: 17px !important;
          }

          .student-info-card h2 {
            font-size: 20px !important;
          }

          .filter-card {
            padding: 16px !important;
          }

          .filter-card > div {
            width: 100%;
          }

          .filter-grid {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }

          .filter-grid > div {
            min-width: 0 !important;
          }

          .filter-grid select {
            width: 100% !important;
            min-width: 0 !important;
          }

          .accordion-header {
            padding: 15px !important;
          }

          .accordion-left h2 {
            font-size: 16px !important;
          }

          .accordion-left p {
            font-size: 10px !important;
          }

          .accordion-icon {
            width: 41px;
            height: 41px;
            min-width: 41px;
            border-radius: 12px;
            font-size: 19px;
          }

          .header-mini-value {
            font-size: 12px;
          }

          .accordion-arrow {
            width: 28px;
            height: 28px;
            font-size: 15px;
          }

          .accordion-content {
            padding: 0 13px 18px;
          }

          .attendance-hero,
          .overall-hero {
            padding: 18px 13px;
          }

          .attendance-hero-info h2,
          .overall-hero h2 {
            font-size: 19px;
          }

          .attendance-mini-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .attendance-mini {
            padding: 9px 6px;
          }

          .attendance-mini strong {
            font-size: 17px;
          }

          .selected-period-card {
            padding: 13px;
          }

          .month-card-header {
            padding: 12px 10px;
          }

          .month-stat-text {
            display: none;
          }

          .month-detail-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .day-attendance {
            grid-template-columns: 1fr auto;
          }

          .day-full-date {
            display: none;
          }

          .test-overview-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .compact-test-header {
            grid-template-columns: 35px 1fr auto;
          }

          .compact-arrow {
            display: none;
          }

          .compact-score {
            grid-column: 3;
          }

          .test-detail-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .performance-cards {
            grid-template-columns: 1fr;
          }

          .performance-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .fee-overview {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .reports-page {
            padding: 7px !important;
          }

          .student-info-card {
            gap: 11px !important;
          }

          .student-info-card > div:first-child {
            width: 52px !important;
            height: 52px !important;
            min-width: 52px !important;
            border-radius: 15px !important;
            font-size: 25px !important;
          }

          .profile-status {
            font-size: 8px;
            letter-spacing: 1px;
          }

          .username {
            font-size: 11px !important;
          }

          .filter-grid {
            grid-template-columns: 1fr !important;
          }

          .accordion-left {
            gap: 9px;
          }

          .accordion-left h2 {
            font-size: 14px !important;
          }

          .accordion-left p {
            display: none;
          }

          .accordion-right {
            gap: 6px;
          }

          .header-mini-value {
            font-size: 10px;
          }

          .attendance-hero .circular-progress {
            transform: scale(0.82);
            margin: -17px;
          }

          .overall-hero .circular-progress {
            transform: scale(0.82);
            margin: -17px;
          }

          .attendance-mini-grid {
            gap: 5px;
          }

          .attendance-mini span {
            font-size: 7px;
          }

          .attendance-mini strong {
            font-size: 15px;
          }

          .selected-period-card {
            flex-direction: column;
            align-items: stretch;
          }

          .selected-period-value {
            font-size: 20px;
          }

          .month-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 5px;
          }

          .month-stat-area {
            gap: 6px;
          }

          .mini-ring {
            width: 37px;
            height: 37px;
          }

          .month-arrow {
            width: 25px;
            height: 25px;
          }

          .month-details {
            padding: 10px;
          }

          .month-detail-summary {
            gap: 5px;
          }

          .month-detail-summary > div {
            padding: 8px;
          }

          .month-detail-summary strong {
            font-size: 15px;
          }

          .day-attendance {
            padding: 9px;
          }

          .day-date {
            gap: 6px;
          }

          .day-date span {
            font-size: 9px;
          }

          .day-status {
            padding: 5px 7px;
            font-size: 8px;
          }

          .test-zone-hero {
            padding: 15px;
          }

          .test-zone-hero h2 {
            font-size: 18px;
          }

          .test-overview {
            padding: 12px;
          }

          .test-overview .circular-progress {
            transform: scale(0.85);
            margin: -10px;
          }

          .test-overview-stats > div {
            padding: 9px;
          }

          .test-overview-stats strong {
            font-size: 17px;
          }

          .compact-test-header {
            padding: 10px;
            grid-template-columns: 31px 1fr auto;
            gap: 7px;
          }

          .test-index {
            width: 31px;
            height: 31px;
            border-radius: 9px;
            font-size: 9px;
          }

          .compact-test-title-row strong {
            font-size: 11px;
          }

          .compact-test-subtitle {
            font-size: 8px;
          }

          .compact-score strong {
            font-size: 11px;
          }

          .compact-score span {
            font-size: 8px;
          }

          .test-details-panel {
            padding: 10px;
          }

          .test-detail-grid {
            gap: 5px;
          }

          .test-detail-grid > div {
            padding: 8px;
          }

          .test-action-row button {
            flex: 1 1 100%;
          }

          .test-image-grid {
            grid-template-columns: 1fr 1fr;
          }

          .test-image-card img {
            height: 110px;
          }

          .grade-new-grid span {
            font-size: 8px;
          }

          .selected-fee-banner {
            align-items: stretch;
            flex-direction: column;
          }

          .view-fees-main-button {
            width: 100%;
          }

          .fee-card-top {
            align-items: flex-start;
          }

          .fee-amount {
            font-size: 18px;
          }

          .fee-details-grid {
            grid-template-columns: 1fr;
          }

          .performance-card {
            padding: 12px;
          }

          .performance-summary-grid {
            gap: 5px;
          }

          .performance-summary-grid > div {
            padding: 9px 5px;
          }

          .performance-summary-grid strong {
            font-size: 17px;
          }
        }

        @media (max-width: 360px) {
          .reports-page {
            padding: 5px !important;
          }

          .reports-header {
            padding: 13px !important;
          }

          .reports-header h1 {
            font-size: 21px !important;
          }

          .reports-header > div:last-child {
            flex-direction: column;
          }

          .reports-header a,
          .reports-header button {
            width: 100%;
            flex: none;
          }

          .accordion-header {
            padding: 12px !important;
          }

          .accordion-left h2 {
            font-size: 13px !important;
          }

          .accordion-icon {
            width: 37px;
            height: 37px;
            min-width: 37px;
            font-size: 17px;
          }

          .accordion-content {
            padding-left: 10px;
            padding-right: 10px;
          }

          .attendance-mini-grid {
            grid-template-columns: 1fr;
          }

          .month-detail-summary {
            grid-template-columns: 1fr 1fr;
          }

          .day-attendance {
            grid-template-columns: 1fr;
          }

          .day-status {
            width: 100%;
            text-align: center;
          }

          .test-overview-stats {
            grid-template-columns: 1fr 1fr;
          }

          .test-detail-grid {
            grid-template-columns: 1fr;
          }

          .fee-overview-item {
            padding: 13px;
          }

          .performance-summary-grid {
            grid-template-columns: 1fr 1fr;
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
    maxWidth: "100%",
    minWidth: 0,
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px 15px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
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
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    flexWrap: "wrap",
  },

  smallTitle: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "3px",
  },

  title: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5,#7c3aed)",
    color: "white",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.20)",
    minWidth: 0,
  },

  studentIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    flexShrink: 0,
  },

  studentInfoContent: {
    minWidth: 0,
    flex: 1,
  },

  studentName: {
    margin: "4px 0",
    fontSize: "25px",
    fontWeight: "800",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  username: {
    margin: 0,
    fontSize: "13px",
    opacity: 0.85,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  filterCard: {
    background: "white",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
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

  filterGrid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "700",
  },

  input: {
    minWidth: "150px",
    padding: "11px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#111827",
    fontSize: "14px",
  },

  subjectSelect: {
    minWidth: "200px",
    padding: "11px 13px",
    border: "1px solid #c4b5fd",
    borderRadius: "10px",
    background: "white",
    color: "#172554",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  accordionCard: {
    background: "white",
    borderRadius: "20px",
    marginBottom: "18px",
    minWidth: 0,
  },

  empty: {
    textAlign: "center",
    padding: "40px 15px",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "12px",
    marginTop: "18px",
    overflowWrap: "anywhere",
  },

  emptyIcon: {
    fontSize: "38px",
    marginBottom: "8px",
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
    color: "#172554",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  footer: {
    padding: "25px 10px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },
};