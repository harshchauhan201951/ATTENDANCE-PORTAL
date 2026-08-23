"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: "Present" | "Absent";
};

type Student = {
  id: number;
  student_name: string;
  student_username: string;
  admission_date: string;
};

const originalPasswords: Record<string, string> = {
  STU1001: "Aditya1",
  STU1002: "Anmol2",
  STU1003: "Chirag3",
  STU1004: "Duggu4",
  STU1005: "Duggu5",
  STU1006: "Jaggu6",
  STU1007: "Mannu7",
  STU1008: "Palak8",
  STU1009: "Piyush9",
  STU1010: "Prince10",
  STU1011: "Raghav11",
  STU1012: "Sharvi12",
};

export default function StudentDashboard() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================================================
  // LOAD STUDENT AND ATTENDANCE
  // =========================================================

  useEffect(() => {
    loadStudentData();
  }, []);

  async function loadStudentData() {
    try {
      setLoading(true);
      setError("");

      const loggedIn =
        localStorage.getItem("studentLoggedIn");

      if (loggedIn !== "true") {
        router.push("/student");
        return;
      }

      const savedUsername =
        localStorage.getItem("studentUsername");

      if (!savedUsername) {
        router.push("/student");
        return;
      }

      const cleanUsername =
        savedUsername.trim().toUpperCase();

      // =====================================================
      // FIND STUDENT DIRECTLY FROM SUPABASE
      // =====================================================

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, admission_date"
          )
          .ilike(
            "student_username",
            cleanUsername
          )
          .maybeSingle();

      if (studentError) {
        console.error(
          "Student loading error:",
          studentError
        );

        setError(
          "Unable to load student information."
        );

        setLoading(false);
        return;
      }

      if (!studentData) {
        console.error(
          "Student not found:",
          cleanUsername
        );

        setError(
          "Student account not found in database."
        );

        setLoading(false);
        return;
      }

      const currentStudent =
        studentData as Student;

      setStudent(currentStudent);

      localStorage.setItem(
        "studentUsername",
        currentStudent.student_username
      );

      localStorage.setItem(
        "studentName",
        currentStudent.student_name
      );

      // =====================================================
      // LOAD ATTENDANCE DIRECTLY FROM SUPABASE
      // =====================================================

      await loadAttendance(
        currentStudent.id
      );
    } catch (err) {
      console.error(err);

      setError(
        "Something went wrong while loading dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOAD ATTENDANCE
  // =========================================================

  async function loadAttendance(
    studentId: number
  ) {
    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from("attendance")
        .select(
          "id, student_id, attendance_date, status"
        )
        .eq("student_id", studentId)
        .order("attendance_date", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Attendance loading error:",
          error
        );

        setError(
          "Unable to load attendance records."
        );

        setAttendance([]);
        return;
      }

      const records =
        (data || []) as AttendanceRecord[];

      console.log(
        "Student ID:",
        studentId
      );

      console.log(
        "Attendance records:",
        records
      );

      setAttendance(records);
    } finally {
      setRefreshing(false);
    }
  }

  // =========================================================
  // REFRESH ATTENDANCE
  // =========================================================

  async function refreshAttendance() {
    if (!student) return;

    setMessage("");
    setError("");

    await loadAttendance(student.id);

    setMessage(
      "Attendance refreshed successfully ✅"
    );

    setTimeout(() => {
      setMessage("");
    }, 2000);
  }

  // =========================================================
  // COUNTS
  // =========================================================

  const totalClasses =
    attendance.length;

  const presentCount =
    attendance.filter(
      (item) =>
        item.status === "Present"
    ).length;

  const absentCount =
    attendance.filter(
      (item) =>
        item.status === "Absent"
    ).length;

  const attendancePercentage =
    totalClasses === 0
      ? 0
      : Math.round(
          (presentCount /
            totalClasses) *
            100
        );

  // =========================================================
  // SETTINGS
  // =========================================================

  function openSettings() {
    if (!student) return;

    setShowSettings(true);

    setNewUsername(
      student.student_username
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setMessage("");
    setError("");
  }

  function closeSettings() {
    setShowSettings(false);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setMessage("");
    setError("");
  }

  // =========================================================
  // CHANGE USERNAME / PASSWORD
  // =========================================================

  async function changeCredentials() {
    setMessage("");
    setError("");

    if (!student) {
      setError(
        "Student information not available."
      );
      return;
    }

    const username =
      newUsername.trim().toUpperCase();

    if (!username) {
      setError(
        "Username cannot be empty."
      );
      return;
    }

    if (!currentPassword) {
      setError(
        "Please enter your current password."
      );
      return;
    }

    if (!newPassword) {
      setError(
        "Please enter a new password."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "New passwords do not match."
      );
      return;
    }

    // -------------------------------------------------------
    // CHECK CURRENT PASSWORD
    // -------------------------------------------------------

    const oldUsername =
      student.student_username
        .trim()
        .toUpperCase();

    let correctPassword =
      originalPasswords[oldUsername] || "";

    const savedAccounts = JSON.parse(
      localStorage.getItem(
        "studentAccounts"
      ) || "{}"
    );

    if (
      savedAccounts[oldUsername] &&
      savedAccounts[oldUsername]
        .password
    ) {
      correctPassword =
        savedAccounts[oldUsername]
          .password;
    }

    if (
      currentPassword !==
      correctPassword
    ) {
      setError(
        "Current password is incorrect."
      );
      return;
    }

    // -------------------------------------------------------
    // CHECK USERNAME DUPLICATE IN SUPABASE
    // -------------------------------------------------------

    if (
      username !== oldUsername
    ) {
      const { data: existingStudent, error: checkError } =
        await supabase
          .from("students")
          .select("id")
          .ilike(
            "student_username",
            username
          )
          .neq("id", student.id)
          .maybeSingle();

      if (checkError) {
        console.error(
          "Username check error:",
          checkError
        );

        setError(
          "Unable to check username."
        );
        return;
      }

      if (existingStudent) {
        setError(
          "This username is already in use."
        );
        return;
      }
    }

    // -------------------------------------------------------
    // UPDATE USERNAME IN SUPABASE
    // -------------------------------------------------------

    if (
      username !== oldUsername
    ) {
      const { error: usernameError } =
        await supabase
          .from("students")
          .update({
            student_username:
              username,
          })
          .eq("id", student.id);

      if (usernameError) {
        console.error(
          "Username update error:",
          usernameError
        );

        setError(
          "Failed to update username."
        );
        return;
      }
    }

    // -------------------------------------------------------
    // SAVE PASSWORD LOCALLY
    //
    // NOTE:
    // Your current students table stores password_hash.
    // The existing student login system uses the database
    // password hash. We keep local account data compatible
    // with the current portal until the password RPC is
    // updated separately.
    // -------------------------------------------------------

    const updatedAccount = {
      username,
      password: newPassword,
      name: student.student_name,
    };

    savedAccounts[username] =
      updatedAccount;

    if (
      oldUsername !== username
    ) {
      delete savedAccounts[
        oldUsername
      ];
    }

    localStorage.setItem(
      "studentAccounts",
      JSON.stringify(
        savedAccounts
      )
    );

    localStorage.setItem(
      "studentUsername",
      username
    );

    localStorage.setItem(
      "studentName",
      student.student_name
    );

    setStudent({
      ...student,
      student_username: username,
    });

    setNewUsername(username);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setMessage(
      "Username and password changed successfully ✅"
    );
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function logout() {
    localStorage.removeItem(
      "studentLoggedIn"
    );

    localStorage.removeItem(
      "studentUsername"
    );

    localStorage.removeItem(
      "studentName"
    );

    router.push("/student");
  }

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1f5f9",
          fontFamily:
            "Arial, Helvetica, sans-serif",
          color: "#0f172a",
          fontSize: "20px",
          fontWeight: "700",
        }}
      >
        Loading Student Dashboard...
      </main>
    );
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#eef2ff,#f8fafc,#ecfdf5)",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        style={{
          background:
            "linear-gradient(135deg,#1d4ed8,#2563eb,#4f46e5)",
          color: "white",
          padding: "18px 20px",
          boxShadow:
            "0 5px 20px rgba(37,99,235,0.25)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "auto",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.85,
                letterSpacing:
                  "1.5px",
              }}
            >
              ATTENDANCE PORTAL
            </div>

            <h1
              style={{
                margin:
                  "3px 0 0",
                fontSize: "23px",
              }}
            >
              Student Dashboard
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={
                openSettings
              }
              style={{
                background:
                  "rgba(255,255,255,0.18)",
                border:
                  "1px solid rgba(255,255,255,0.5)",
                color: "white",
                padding:
                  "10px 13px",
                borderRadius:
                  "10px",
                cursor:
                  "pointer",
                fontWeight:
                  "700",
              }}
            >
              ⚙️ Settings
            </button>

            <button
              onClick={logout}
              style={{
                background:
                  "#dc2626",
                border: "none",
                color: "white",
                padding:
                  "10px 13px",
                borderRadius:
                  "10px",
                cursor:
                  "pointer",
                fontWeight:
                  "700",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <section
        style={{
          maxWidth: "1100px",
          margin:
            "30px auto",
          padding:
            "0 20px 40px",
        }}
      >
        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div
            style={{
              background:
                "#fee2e2",
              border:
                "1px solid #fca5a5",
              color:
                "#991b1b",
              padding:
                "14px 18px",
              borderRadius:
                "12px",
              marginBottom:
                "20px",
              fontWeight:
                "700",
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* ===================================================
            WELCOME
        =================================================== */}

        <div
          style={{
            background:
              "linear-gradient(135deg,#ffffff,#eff6ff)",
            borderRadius:
              "20px",
            padding:
              "28px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
            border:
              "1px solid #dbeafe",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "18px",
            }}
          >
            <div
              style={{
                width: "65px",
                height: "65px",
                borderRadius:
                  "50%",
                background:
                  "linear-gradient(135deg,#2563eb,#7c3aed)",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize:
                  "30px",
                flexShrink: 0,
              }}
            >
              🎓
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  color:
                    "#64748b",
                }}
              >
                Welcome back
              </p>

              <h2
                style={{
                  margin:
                    "4px 0",
                  color:
                    "#0f172a",
                }}
              >
                {student?.student_name ||
                  "Student"}{" "}
                👋
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "#64748b",
                }}
              >
                Username:{" "}
                {student?.student_username ||
                  "Student"}
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            STATS
        =================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap: "18px",
            marginTop:
              "25px",
          }}
        >
          <Stat
            icon="📊"
            title="Attendance"
            value={`${attendancePercentage}%`}
            text="Overall attendance"
            background="linear-gradient(135deg,#2563eb,#1d4ed8)"
          />

          <Stat
            icon="✅"
            title="Present"
            value={String(
              presentCount
            )}
            text="Classes attended"
            background="linear-gradient(135deg,#16a34a,#15803d)"
          />

          <Stat
            icon="❌"
            title="Absent"
            value={String(
              absentCount
            )}
            text="Classes missed"
            background="linear-gradient(135deg,#ef4444,#dc2626)"
          />

          <Stat
            icon="📚"
            title="Total Classes"
            value={String(
              totalClasses
            )}
            text="Classes conducted"
            background="linear-gradient(135deg,#7c3aed,#6d28d9)"
          />
        </div>

        {/* ===================================================
            ATTENDANCE DETAILS
        =================================================== */}

        <div
          style={{
            background:
              "white",
            borderRadius:
              "18px",
            padding:
              "25px",
            marginTop:
              "25px",
            boxShadow:
              "0 8px 25px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "15px",
              marginBottom:
                "20px",
            }}
          >
            <div>
              <h2
                style={{
                  color:
                    "#0f172a",
                  margin:
                    "0 0 5px",
                }}
              >
                📅 Attendance Details
              </h2>

              <p
                style={{
                  color:
                    "#64748b",
                  margin: 0,
                }}
              >
                Attendance is loaded
                directly from Supabase.
              </p>
            </div>

            <button
              onClick={
                refreshAttendance
              }
              disabled={
                refreshing
              }
              style={{
                border: "none",
                borderRadius:
                  "10px",
                padding:
                  "11px 15px",
                background:
                  refreshing
                    ? "#93c5fd"
                    : "#2563eb",
                color:
                  "white",
                fontWeight:
                  "700",
                cursor:
                  refreshing
                    ? "not-allowed"
                    : "pointer",
                whiteSpace:
                  "nowrap",
              }}
            >
              {refreshing
                ? "Refreshing..."
                : "🔄 Refresh"}
            </button>
          </div>

          {attendance.length ===
          0 ? (
            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px dashed #94a3b8",
                borderRadius:
                  "15px",
                padding:
                  "35px 15px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontSize:
                    "45px",
                }}
              >
                📋
              </div>

              <h3
                style={{
                  color:
                    "#334155",
                  margin:
                    "10px 0",
                }}
              >
                No attendance
                records yet
              </h3>

              <p
                style={{
                  color:
                    "#64748b",
                  margin: 0,
                }}
              >
                Your attendance
                records will appear
                here once your teacher
                marks attendance.
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "10px",
              }}
            >
              {attendance.map(
                (record) => (
                  <div
                    key={
                      record.id
                    }
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "15px",
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      background:
                        record.status ===
                        "Present"
                          ? "#f0fdf4"
                          : "#fef2f2",
                      border:
                        record.status ===
                        "Present"
                          ? "1px solid #bbf7d0"
                          : "1px solid #fecaca",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display:
                            "block",
                          color:
                            "#0f172a",
                          fontSize:
                            "16px",
                        }}
                      >
                        {formatDate(
                          record.attendance_date
                        )}
                      </strong>

                      <span
                        style={{
                          display:
                            "block",
                          color:
                            "#64748b",
                          fontSize:
                            "13px",
                          marginTop:
                            "4px",
                        }}
                      >
                        Attendance
                        Record
                      </span>
                    </div>

                    <strong
                      style={{
                        color:
                          record.status ===
                          "Present"
                            ? "#15803d"
                            : "#dc2626",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {record.status ===
                      "Present"
                        ? "✅ Present"
                        : "❌ Absent"}
                    </strong>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        style={{
          textAlign:
            "center",
          color:
            "#64748b",
          padding:
            "20px",
          fontSize:
            "13px",
        }}
      >
        Student Attendance Management System © 2026
      </footer>

      {/* =====================================================
          SETTINGS MODAL
      ===================================================== */}

      {showSettings && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.75)",
            backdropFilter:
              "blur(6px)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "20px",
            zIndex:
              9999,
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                "470px",
              maxHeight:
                "90vh",
              overflowY:
                "auto",
              background:
                "linear-gradient(145deg,#ffffff,#eff6ff)",
              borderRadius:
                "24px",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.35)",
              border:
                "2px solid #bfdbfe",
            }}
          >
            {/* SETTINGS HEADER */}

            <div
              style={{
                background:
                  "linear-gradient(135deg,#1d4ed8,#4f46e5)",
                color:
                  "white",
                padding:
                  "25px",
                borderRadius:
                  "22px 22px 0 0",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "35px",
                    }}
                  >
                    ⚙️
                  </div>

                  <h2
                    style={{
                      margin:
                        "5px 0",
                      fontSize:
                        "25px",
                    }}
                  >
                    Account Settings
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color:
                        "#dbeafe",
                      fontSize:
                        "14px",
                    }}
                  >
                    Manage your
                    student account
                  </p>
                </div>

                <button
                  onClick={
                    closeSettings
                  }
                  style={{
                    width:
                      "40px",
                    height:
                      "40px",
                    borderRadius:
                      "50%",
                    border:
                      "1px solid rgba(255,255,255,0.5)",
                    background:
                      "rgba(255,255,255,0.15)",
                    color:
                      "white",
                    fontSize:
                      "20px",
                    cursor:
                      "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SETTINGS BODY */}

            <div
              style={{
                padding:
                  "25px",
              }}
            >
              {/* CURRENT ACCOUNT */}

              <div
                style={{
                  background:
                    "linear-gradient(135deg,#dbeafe,#e0e7ff)",
                  border:
                    "1px solid #93c5fd",
                  borderRadius:
                    "15px",
                  padding:
                    "17px",
                  marginBottom:
                    "22px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "12px",
                    fontWeight:
                      "700",
                    color:
                      "#475569",
                  }}
                >
                  CURRENT ACCOUNT
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",
                    color:
                      "#1e3a8a",
                    fontSize:
                      "21px",
                    fontWeight:
                      "700",
                  }}
                >
                  👤{" "}
                  {student?.student_name}
                </div>

                <div
                  style={{
                    marginTop:
                      "4px",
                    color:
                      "#475569",
                  }}
                >
                  Username:{" "}
                  {
                    student?.student_username
                  }
                </div>
              </div>

              {/* USERNAME */}

              <label
                style={
                  labelStyle
                }
              >
                👤 New Username
              </label>

              <input
                type="text"
                value={
                  newUsername
                }
                onChange={(e) =>
                  setNewUsername(
                    e.target.value
                  )
                }
                placeholder="Enter new username"
                style={
                  inputStyle(
                    "#93c5fd"
                  )
                }
              />

              {/* CURRENT PASSWORD */}

              <label
                style={
                  labelStyle
                }
              >
                🔑 Current Password
              </label>

              <input
                type="password"
                value={
                  currentPassword
                }
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                placeholder="Enter current password"
                style={
                  inputStyle(
                    "#a5b4fc"
                  )
                }
              />

              {/* NEW PASSWORD */}

              <label
                style={
                  labelStyle
                }
              >
                🔐 New Password
              </label>

              <input
                type="password"
                value={
                  newPassword
                }
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Minimum 8 characters"
                style={
                  inputStyle(
                    "#86efac"
                  )
                }
              />

              {/* CONFIRM PASSWORD */}

              <label
                style={
                  labelStyle
                }
              >
                🔐 Confirm New Password
              </label>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
                style={
                  inputStyle(
                    "#fde68a"
                  )
                }
              />

              {/* ERROR */}

              {error && (
                <div
                  style={{
                    background:
                      "#fee2e2",
                    border:
                      "2px solid #fca5a5",
                    color:
                      "#991b1b",
                    padding:
                      "13px",
                    borderRadius:
                      "11px",
                    marginTop:
                      "15px",
                    fontWeight:
                      "600",
                  }}
                >
                  ❌ {error}
                </div>
              )}

              {/* SUCCESS */}

              {message && (
                <div
                  style={{
                    background:
                      "#dcfce7",
                    border:
                      "2px solid #86efac",
                    color:
                      "#166534",
                    padding:
                      "13px",
                    borderRadius:
                      "11px",
                    marginTop:
                      "15px",
                    fontWeight:
                      "600",
                  }}
                >
                  {message}
                </div>
              )}

              {/* SAVE */}

              <button
                onClick={
                  changeCredentials
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "15px",
                  marginTop:
                    "20px",
                  border:
                    "none",
                  borderRadius:
                    "12px",
                  background:
                    "linear-gradient(135deg,#2563eb,#4f46e5)",
                  color:
                    "white",
                  fontSize:
                    "17px",
                  fontWeight:
                    "700",
                  cursor:
                    "pointer",
                  boxShadow:
                    "0 8px 20px rgba(37,99,235,0.3)",
                }}
              >
                💾 Save Changes
              </button>

              {/* CANCEL */}

              <button
                onClick={
                  closeSettings
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "14px",
                  marginTop:
                    "10px",
                  border:
                    "2px solid #cbd5e1",
                  borderRadius:
                    "12px",
                  background:
                    "white",
                  color:
                    "#334155",
                  fontSize:
                    "16px",
                  fontWeight:
                    "600",
                  cursor:
                    "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MOBILE STYLES
      ===================================================== */}

      <style jsx>{`
        @media (max-width: 600px) {
          header {
            padding: 15px !important;
          }

          header > div {
            flex-direction: column;
            align-items: stretch !important;
          }

          header > div > div:last-child {
            width: 100%;
          }

          header button {
            flex: 1;
          }

          section {
            margin-top: 20px !important;
          }
        }
      `}</style>
    </main>
  );
}

// ============================================================
// STAT COMPONENT
// ============================================================

function Stat({
  icon,
  title,
  value,
  text,
  background,
}: {
  icon: string;
  title: string;
  value: string;
  text: string;
  background: string;
}) {
  return (
    <div
      style={{
        background,
        color:
          "white",
        padding:
          "25px",
        borderRadius:
          "18px",
        boxShadow:
          "0 10px 25px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          fontSize:
            "32px",
        }}
      >
        {icon}
      </div>

      <p
        style={{
          margin:
            "12px 0 5px",
          opacity:
            0.85,
        }}
      >
        {title}
      </p>

      <h2
        style={{
          fontSize:
            "32px",
          margin: 0,
        }}
      >
        {value}
      </h2>

      <p
        style={{
          fontSize:
            "13px",
          opacity:
            0.8,
        }}
      >
        {text}
      </p>
    </div>
  );
}

// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  date: string
) {
  const parts =
    date.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return new Date(
    date
  ).toLocaleDateString(
    "en-IN"
  );
}

// ============================================================
// LABEL STYLE
// ============================================================

const labelStyle = {
  display:
    "block",
  fontWeight:
    "700",
  color:
    "#172554",
  marginTop:
    "18px",
  marginBottom:
    "8px",
};

// ============================================================
// INPUT STYLE
// ============================================================

const inputStyle = (
  borderColor: string
) => ({
  width:
    "100%",
  boxSizing:
    "border-box" as const,
  padding:
    "14px",
  border:
    `2px solid ${borderColor}`,
  borderRadius:
    "11px",
  fontSize:
    "16px",
  color:
    "#111827",
  background:
    "#ffffff",
  outline:
    "none",
});