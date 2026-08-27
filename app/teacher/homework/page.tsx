"use client";

import { useState } from "react";

type Homework = {
  id: number;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: "Pending" | "Completed";
};

export default function TeacherHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  function addHomework() {
    if (!subject.trim()) {
      alert("Please enter subject.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter homework title.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter homework description.");
      return;
    }

    if (!dueDate) {
      alert("Please select due date.");
      return;
    }

    const newHomework: Homework = {
      id: Date.now(),
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim(),
      dueDate,
      status: "Pending",
    };

    setHomework((previous) => [newHomework, ...previous]);

    setSubject("");
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  function deleteHomework(id: number) {
    setHomework((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef2ff, #f8fafc, #eff6ff)",
        padding: "24px 15px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "25px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              TEACHER PORTAL
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              📚 Homework
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Create and manage student homework
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              border: "none",
              background: "#475569",
              color: "#ffffff",
              padding: "11px 18px",
              borderRadius: "10px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </header>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "25px",
            marginBottom: "20px",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            border: "2px solid #bfdbfe",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              ➕
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                  fontWeight: 900,
                  color: "#172554",
                }}
              >
                Create New Homework
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                Add homework for your students
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#334155",
                }}
              >
                Subject
              </label>

              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#334155",
                }}
              >
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                gridColumn: "1 / -1",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#334155",
                }}
              >
                Homework Title
              </label>

              <input
                type="text"
                placeholder="Enter homework title"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                gridColumn: "1 / -1",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#334155",
                }}
              >
                Description
              </label>

              <textarea
                rows={5}
                placeholder="Write homework instructions..."
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "120px",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={addHomework}
              style={{
                border: "none",
                background:
                  "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#ffffff",
                padding: "13px 22px",
                borderRadius: "11px",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ➕ Add Homework
            </button>
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "25px",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              📋
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                  fontWeight: 900,
                  color: "#172554",
                }}
              >
                Homework List
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                {homework.length} homework item
                {homework.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {homework.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                background: "#f8fafc",
                borderRadius: "16px",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={{
                  fontSize: "45px",
                  marginBottom: "10px",
                }}
              >
                📚
              </div>

              <h3
                style={{
                  margin: "5px 0",
                  color: "#334155",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                No Homework Added
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Create your first homework using
                the form above.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {homework.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "18px",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "inline-block",
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          padding: "5px 9px",
                          borderRadius: "7px",
                          fontSize: "10px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.subject}
                      </div>

                      <h3
                        style={{
                          margin: "8px 0 0",
                          color: "#172554",
                          fontSize: "19px",
                          fontWeight: 900,
                        }}
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: 900,
                      }}
                    >
                      {item.status}
                    </div>
                  </div>

                  <p
                    style={{
                      margin: "14px 0",
                      color: "#475569",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      fontWeight: 600,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {item.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      paddingTop: "12px",
                      borderTop: "1px solid #e2e8f0",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        color: "#475569",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      📅 Due:{" "}
                      {new Date(
                        `${item.dueDate}T00:00:00`
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteHomework(item.id)
                      }
                      style={{
                        border: "none",
                        background: "#fee2e2",
                        color: "#991b1b",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer
          style={{
            textAlign: "center",
            padding: "25px 10px",
            color: "#64748b",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Attendance Portal • Teacher Homework • 2026
        </footer>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 600,
  outline: "none",
};