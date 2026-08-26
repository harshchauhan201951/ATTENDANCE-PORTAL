"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string;
  student_username: string;
};

type AttendanceRecord = {
  student_id: number;
  attendance_date: string;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [students, setStudents] =
    useState<Student[]>([]);

  const [attendance, setAttendance] =
    useState<Record<number, string>>({});

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const teacherLoggedIn =
      localStorage.getItem(
        "teacherLoggedIn"
      );

    if (teacherLoggedIn !== "true") {
      router.replace("/");
      return;
    }

    loadStudents();
  }, [router]);

  useEffect(() => {
    if (students.length > 0) {
      loadAttendance();
    }
  }, [selectedDate, students]);

  async function loadStudents() {
    setLoading(true);
    setMessage("");

    const { data, error } =
      await supabase
        .from("students")
        .select(
          "id, student_name, student_username"
        )
        .order("id", {
          ascending: true,
        });

    if (error) {
      console.error(
        "Students error:",
        error
      );

      setMessage(
        "Students load nahi ho rahe: " +
          error.message
      );

      setLoading(false);
      return;
    }

    setStudents(data || []);
    setLoading(false);
  }

  async function loadAttendance() {
    const { data, error } =
      await supabase
        .from("attendance")
        .select(
          "student_id, attendance_date, status"
        )
        .eq(
          "attendance_date",
          selectedDate
        );

    if (error) {
      console.error(
        "Attendance error:",
        error
      );
      return;
    }

    const result: Record<
      number,
      string
    > = {};

    (data || []).forEach(
      (item: AttendanceRecord) => {
        result[item.student_id] =
          item.status;
      }
    );

    setAttendance(result);
  }

  function markAttendance(
    studentId: number,
    status: string
  ) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }

  function markAll(status: string) {
    const result: Record<
      number,
      string
    > = {};

    students.forEach((student) => {
      result[student.id] = status;
    });

    setAttendance(result);
  }

  async function saveAttendance() {
    if (students.length === 0) {
      setMessage(
        "Koi student nahi mila."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const rows = students
      .filter(
        (student) =>
          attendance[student.id]
      )
      .map((student) => ({
        student_id: student.id,
        attendance_date:
          selectedDate,
        status:
          attendance[student.id],
      }));

    if (rows.length === 0) {
      setMessage(
        "Pehle Present ya Absent mark karo."
      );

      setSaving(false);
      return;
    }

    const { error } =
      await supabase
        .from("attendance")
        .upsert(rows, {
          onConflict:
            "student_id,attendance_date",
        });

    if (error) {
      console.error(
        "Save attendance error:",
        error
      );

      setMessage(
        "Attendance save nahi hui: " +
          error.message
      );

      setSaving(false);
      return;
    }

    setMessage(
      "✅ Attendance successfully save ho gayi!"
    );

    await loadAttendance();

    setSaving(false);
  }

  function logout() {
    localStorage.removeItem(
      "teacherLoggedIn"
    );

    localStorage.removeItem(
      "teacher"
    );

    localStorage.removeItem(
      "teacherUsername"
    );

    localStorage.removeItem(
      "teacherName"
    );

    router.replace("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "22px",
            marginBottom: "20px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              📚 Attendance Portal
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#666",
                marginBottom: 0,
              }}
            >
              Teacher Attendance Management
            </p>
          </div>

          <button
            onClick={logout}
            style={{
              padding: "11px 17px",
              border: "none",
              borderRadius: "8px",
              background: "#dc3545",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>

        {/* DATE */}

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.08)",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Attendance Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(
                e.target.value
              )
            }
            style={{
              padding: "11px 14px",
              border:
                "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "15px",
            }}
          />
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() =>
              markAll("Present")
            }
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#198754",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✓ Mark All Present
          </button>

          <button
            onClick={() =>
              markAll("Absent")
            }
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#dc3545",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✕ Mark All Absent
          </button>

          <button
            onClick={saveAttendance}
            disabled={saving}
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: "8px",
              background: "#0d6efd",
              color: "white",
              fontWeight: 600,
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "Saving..."
              : "💾 Save Attendance"}
          </button>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {/* STUDENTS */}

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>
              👨‍🎓 Students
            </h2>

            <span
              style={{
                background: "#eef3ff",
                padding: "8px 12px",
                borderRadius: "20px",
                fontWeight: 600,
              }}
            >
              Total: {students.length}
            </span>
          </div>

          {loading ? (
            <p>Students loading...</p>
          ) : students.length === 0 ? (
            <div
              style={{
                padding: "25px",
                textAlign: "center",
                background: "#fff3cd",
                borderRadius: "10px",
              }}
            >
              ⚠️ Students table se koi
              student nahi mil raha.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "12px",
              }}
            >
              {students.map(
                (student, index) => {
                  const status =
                    attendance[
                      student.id
                    ];

                  return (
                    <div
                      key={student.id}
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          "12px",
                        padding: "15px",
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: "15px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize:
                              "17px",
                          }}
                        >
                          {index + 1}.{" "}
                          {student.student_name ||
                            "Student"}
                        </div>

                        <div
                          style={{
                            color: "#777",
                            fontSize:
                              "14px",
                            marginTop:
                              "4px",
                          }}
                        >
                          Username:{" "}
                          {
                            student.student_username
                          }
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            markAttendance(
                              student.id,
                              "Present"
                            )
                          }
                          style={{
                            padding:
                              "9px 15px",
                            borderRadius:
                              "8px",
                            border:
                              status ===
                              "Present"
                                ? "2px solid #198754"
                                : "1px solid #ccc",
                            background:
                              status ===
                              "Present"
                                ? "#198754"
                                : "white",
                            color:
                              status ===
                              "Present"
                                ? "white"
                                : "#198754",
                            fontWeight:
                              600,
                            cursor:
                              "pointer",
                          }}
                        >
                          ✓ Present
                        </button>

                        <button
                          onClick={() =>
                            markAttendance(
                              student.id,
                              "Absent"
                            )
                          }
                          style={{
                            padding:
                              "9px 15px",
                            borderRadius:
                              "8px",
                            border:
                              status ===
                              "Absent"
                                ? "2px solid #dc3545"
                                : "1px solid #ccc",
                            background:
                              status ===
                              "Absent"
                                ? "#dc3545"
                                : "white",
                            color:
                              status ===
                              "Absent"
                                ? "white"
                                : "#dc3545",
                            fontWeight:
                              600,
                            cursor:
                              "pointer",
                          }}
                        >
                          ✕ Absent
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}