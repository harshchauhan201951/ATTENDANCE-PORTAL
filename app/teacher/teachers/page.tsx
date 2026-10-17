"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Teacher = {
  id: number;
  teacher_username: string;
  created_at: string;
  assigned_student_count?: number;
};

type AssignmentStudent = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  class_name: string | null;
};

export default function TeacherManagementPage() {
  const router = useRouter();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentTeacherId, setCurrentTeacherId] = useState<number | null>(null);
  const [canManageAssignments, setCanManageAssignments] = useState(false);
  const [assignmentTeacher, setAssignmentTeacher] = useState<Teacher | null>(null);
  const [assignmentStudents, setAssignmentStudents] = useState<AssignmentStudent[]>([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  async function loadTeachers() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("teachers")
      .select(
        "id, teacher_username, created_at"
      )
      .order("id", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      setTeachers([]);
    } else {
      const teachersWithAssignments = await Promise.all(
        (data || []).map(async (teacher) => {
          if (teacher.id === 1) {
            const { count, error: studentsCountError } = await supabase
              .from("students")
              .select("id", { count: "exact", head: true });
            if (studentsCountError) {
              console.error("Main teacher student count lookup failed:", studentsCountError);
            }
            return { ...teacher, assigned_student_count: count || 0 };
          }
          const { data: assignedRows, error: assignmentError } = await supabase.rpc(
            "get_teacher_assigned_student_ids",
            { p_teacher_id: teacher.id }
          );
          if (assignmentError) {
            console.error(`Assigned students lookup failed for teacher ${teacher.id}:`, assignmentError);
            return { ...teacher, assigned_student_count: 0 };
          }
          return { ...teacher, assigned_student_count: (assignedRows || []).length };
        })
      );
      setTeachers(teachersWithAssignments);
    }

    setLoading(false);
  }

  useEffect(() => {
    const loggedInTeacherId = Number(localStorage.getItem("attendance_teacher_id") || localStorage.getItem("teacher_id") || "0");
    setCurrentTeacherId(loggedInTeacherId || null);
    setCanManageAssignments(loggedInTeacherId === 1);
    loadTeachers();
  }, []);

  async function openAssignmentManager(teacher: Teacher) {
    setAssignmentTeacher(teacher);
    setAssignmentSearch("");
    setAssignmentStudents([]);
    setSelectedAssignmentIds([]);
    setLoadingAssignments(true);
    setError("");
    try {
      const [studentsResult, assignmentsResult] = await Promise.all([
        supabase.from("students").select("id, student_name, student_username, class_name").eq("is_active", true).order("class_name").order("student_name"),
        supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacher.id }),
      ]);
      if (studentsResult.error) throw new Error(studentsResult.error.message);
      if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
      setAssignmentStudents((studentsResult.data || []) as AssignmentStudent[]);
      setSelectedAssignmentIds((assignmentsResult.data || []).map((row: { student_id: number }) => Number(row.student_id)));
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to load assigned students.");
      setAssignmentTeacher(null);
    } finally {
      setLoadingAssignments(false);
    }
  }

  function toggleAssignmentStudent(studentId: number) {
    setSelectedAssignmentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  }

  async function saveAssignments() {
    if (!assignmentTeacher || !canManageAssignments) return;
    setSavingAssignments(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerTeacherId: 1,
          teacherId: assignmentTeacher.id,
          studentIds: selectedAssignmentIds,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save student assignments.");
      setMessage(`${selectedAssignmentIds.length} students assigned to ${assignmentTeacher.teacher_username}.`);
      setAssignmentTeacher(null);
      await loadTeachers();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Could not save student assignments.");
    } finally {
      setSavingAssignments(false);
    }
  }

  async function handleAddTeacher(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanUsername =
      username.trim();

    if (!cleanUsername) {
      setError(
        "Teacher username is required."
      );
      return;
    }

    if (password.length < 4) {
      setError(
        "Password must be at least 4 characters."
      );
      return;
    }

    setAdding(true);

    const { error } = await supabase.rpc(
      "create_teacher",
      {
        p_username: cleanUsername,
        p_password: password,
      }
    );

    if (error) {
      setError(error.message);
      setAdding(false);
      return;
    }

    setUsername("");
    setPassword("");
    setShowPassword(false);

    setMessage(
      "Teacher added successfully."
    );

    await loadTeachers();

    setAdding(false);
  }

  const filteredAssignmentStudents = assignmentStudents.filter((student) => {
    const query = assignmentSearch.trim().toLowerCase();
    if (!query) return true;
    return `${student.student_name || ""} ${student.student_username || ""} ${student.class_name || ""}`.toLowerCase().includes(query);
  });

  return (
    <main data-racer-vip-module="teachers"  className="racer-module-page racer-teachers-page"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <header data-racer-vip-header="1" 
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "22px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.08)",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#6366f1",
                marginBottom: "7px",
                letterSpacing: "0.5px",
              }}
            >
              RACER ACADEMY
            </div>

            <h1
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "28px",
                fontWeight: 900,
              }}
            >RACER ACADEMY</h1>

            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >TEACHER CONTROL CENTER</p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/teacher")
            }
            style={{
              border: "none",
              background: "#4f46e5",
              color: "#ffffff",
              padding: "12px 18px",
              borderRadius: "11px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back to Dashboard
          </button>
        </header>

        {/* ADD TEACHER */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "22px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.07)",
          }}
        >
          <h2
            style={{
              margin:
                "0 0 6px",
              color: "#0f172a",
              fontSize: "21px",
              fontWeight: 900,
            }}
          >
            Add New Teacher
          </h2>

          <p
            style={{
              margin:
                "0 0 20px",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Create login credentials
            for a new teacher. Teacher modules show only assigned students; the main teacher sees the full roster.
          </p>

          <form
            onSubmit={
              handleAddTeacher
            }
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                Teacher Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                placeholder="Enter username"
                autoComplete="off"
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding: "13px 14px",
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: "11px",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                Password
              </label>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                }}
              >
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter password"
                  autoComplete="new-password"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    boxSizing:
                      "border-box",
                    padding:
                      "13px 14px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius: "11px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    borderRadius: "11px",
                    padding:
                      "0 13px",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={adding}
              style={{
                border: "none",
                background: adding
                  ? "#94a3b8"
                  : "#4f46e5",
                color: "#ffffff",
                padding: "13px 18px",
                borderRadius: "11px",
                fontWeight: 900,
                cursor: adding
                  ? "not-allowed"
                  : "pointer",
                minHeight: "46px",
              }}
            >
              {adding
                ? "Adding..."
                : "+ Add Teacher"}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: "15px",
                background: "#dcfce7",
                color: "#166534",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "15px",
                background: "#fee2e2",
                color: "#991b1b",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                overflowWrap:
                  "anywhere",
              }}
            >
              {error}
            </div>
          )}
        </section>

        {/* TEACHER LIST */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "24px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "21px",
                  fontWeight: 900,
                }}
              >
                All Teachers
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Total teachers:{" "}
                <strong>
                  {teachers.length}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={loadTeachers}
              disabled={loading}
              style={{
                border:
                  "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                padding:
                  "10px 14px",
                borderRadius: "10px",
                fontWeight: 800,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              Loading teachers...
            </div>
          ) : teachers.length ===
            0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#64748b",
                background: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              No teachers found.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {teachers.map(
                (teacher) => (
                  <div
                    key={teacher.id}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "14px",
                      padding:
                        "16px",
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
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "13px",
                      }}
                    >
                      <div
                        style={{
                          width: "46px",
                          height: "46px",
                          borderRadius:
                            "50%",
                          background:
                            "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
                          color:
                            "#4338ca",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize:
                            "20px",
                          fontWeight:
                            900,
                        }}
                      >
                        {teacher.teacher_username
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              color: "#0f172a",
                              fontSize: "16px",
                              fontWeight: 900,
                            }}
                          >
                            {teacher.teacher_username}
                          </span>
                          {currentTeacherId === teacher.id && (
                            <span
                              style={{
                                background: "#dbeafe",
                                color: "#1d4ed8",
                                padding: "4px 8px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 900,
                                letterSpacing: "0.04em",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                            color:
                              "#94a3b8",
                            fontSize:
                              "12px",
                          }}
                        >
                          Teacher ID:{" "}
                          {teacher.id}
                        </div>
                        <div
                          style={{
                            marginTop: "6px",
                            color: "#475569",
                            fontSize: "12px",
                            fontWeight: 750,
                          }}
                        >
                          👥 {teacher.assigned_student_count ?? 0} assigned students
                        </div>
                      </div>
                    </div>

                    {teacher.id ===
                    1 ? (
                      <span
                        style={{
                          background:
                            "#dcfce7",
                          color:
                            "#166534",
                          padding:
                            "8px 12px",
                          borderRadius:
                            "999px",
                          fontSize:
                            "12px",
                          fontWeight:
                            900,
                        }}
                      >
                        MAIN TEACHER
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {canManageAssignments && (
                          <button
                            type="button"
                            onClick={() => void openAssignmentManager(teacher)}
                            style={{ border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4338ca", padding: "9px 12px", borderRadius: "10px", fontWeight: 900, cursor: "pointer" }}
                          >
                            👥 Assign Students
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {assignmentTeacher && (
          <div role="presentation" onClick={() => !savingAssignments && setAssignmentTeacher(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "18px", background: "rgba(15,23,42,0.48)" }}>
            <section role="dialog" aria-modal="true" aria-labelledby="teacher-assignment-title" onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 620px)", maxHeight: "min(84vh, 760px)", display: "flex", flexDirection: "column", gap: "14px", padding: "22px", borderRadius: "20px", background: "#ffffff", boxShadow: "0 24px 80px rgba(15,23,42,0.28)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ color: "#4f46e5", fontSize: "11px", fontWeight: 900, letterSpacing: "1px" }}>TEACHER ACCESS</div>
                  <h2 id="teacher-assignment-title" style={{ margin: "5px 0 0", color: "#0f172a", fontSize: "21px" }}>Assign Students</h2>
                  <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px" }}>{assignmentTeacher.teacher_username} will see and manage the selected students.</p>
                </div>
                <button type="button" aria-label="Close assignment dialog" onClick={() => setAssignmentTeacher(null)} disabled={savingAssignments} style={{ border: 0, borderRadius: "10px", background: "#f1f5f9", color: "#334155", width: "36px", height: "36px", fontSize: "20px", cursor: "pointer" }}>×</button>
              </div>

              <input type="search" value={assignmentSearch} onChange={(event) => setAssignmentSearch(event.target.value)} placeholder="Search by student name, username, or class" aria-label="Search students to assign" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "11px", outline: "none", fontSize: "14px" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", color: "#475569", fontSize: "12px", fontWeight: 800 }}>
                <span>{selectedAssignmentIds.length} selected · {filteredAssignmentStudents.length} shown</span>
                <button type="button" onClick={() => setSelectedAssignmentIds(filteredAssignmentStudents.map((student) => student.id))} style={{ border: 0, background: "transparent", color: "#4f46e5", fontWeight: 900, cursor: "pointer" }}>Select shown</button>
              </div>

              <div style={{ minHeight: "180px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "13px", background: "#f8fafc" }}>
                {loadingAssignments ? (
                  <div style={{ padding: "28px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>Loading students…</div>
                ) : filteredAssignmentStudents.length === 0 ? (
                  <div style={{ padding: "28px", textAlign: "center", color: "#64748b" }}>No students match your search.</div>
                ) : filteredAssignmentStudents.map((student) => {
                  const checked = selectedAssignmentIds.includes(student.id);
                  return (
                    <label key={student.id} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "11px 13px", borderBottom: "1px solid #e8edf4", cursor: "pointer", background: checked ? "#eef2ff" : "transparent" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleAssignmentStudent(student.id)} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ display: "block", color: "#1e293b", fontSize: "13px" }}>{student.student_name || student.student_username || `Student ${student.id}`}</strong>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>{student.student_username || ""}{student.class_name ? ` · ${student.class_name}` : ""}</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px", paddingTop: "2px" }}>
                <button type="button" disabled={savingAssignments} onClick={() => setAssignmentTeacher(null)} style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 14px", background: "#fff", color: "#475569", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
                <button type="button" disabled={loadingAssignments || savingAssignments} onClick={() => void saveAssignments()} style={{ border: 0, borderRadius: "10px", padding: "10px 16px", background: savingAssignments ? "#94a3b8" : "#4f46e5", color: "#fff", fontWeight: 900, cursor: savingAssignments ? "not-allowed" : "pointer" }}>{savingAssignments ? "Saving…" : "Save assignments"}</button>
              </div>
            </section>
          </div>
        )}

        <footer
          style={{
            textAlign: "center",
            marginTop: "30px",
            padding: "18px",
            color: "#94a3b8",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          RACER ACADEMY • Teacher Management • 2026
        </footer>
      </div>
    </main>
  );
}
