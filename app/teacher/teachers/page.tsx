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
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setTeachers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTeachers();
  }, []);

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

  async function handleDeleteTeacher(
    teacher: Teacher
  ) {
    if (teacher.id === 1) {
      setError(
        "The main teacher cannot be deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete teacher "${teacher.teacher_username}"?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingId(teacher.id);

    const { error } = await supabase.rpc(
      "delete_teacher",
      {
        p_teacher_id: teacher.id,
      }
    );

    if (error) {
      setError(error.message);
      setDeletingId(null);
      return;
    }

    setMessage(
      "Teacher deleted successfully."
    );

    await loadTeachers();

    setDeletingId(null);
  }

  return (
    <main
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

        <header
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
            >
              Teacher Management
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Add and manage academy
              teachers.
            </p>
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
            for a new teacher.
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
                        <div
                          style={{
                            color:
                              "#0f172a",
                            fontSize:
                              "16px",
                            fontWeight:
                              900,
                          }}
                        >
                          {
                            teacher.teacher_username
                          }
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
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteTeacher(
                            teacher
                          )
                        }
                        disabled={
                          deletingId ===
                          teacher.id
                        }
                        style={{
                          border:
                            "none",
                          background:
                            deletingId ===
                            teacher.id
                              ? "#94a3b8"
                              : "#fee2e2",
                          color:
                            deletingId ===
                            teacher.id
                              ? "#ffffff"
                              : "#b91c1c",
                          padding:
                            "9px 14px",
                          borderRadius:
                            "10px",
                          fontWeight:
                            900,
                          cursor:
                            deletingId ===
                            teacher.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {deletingId ===
                        teacher.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

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