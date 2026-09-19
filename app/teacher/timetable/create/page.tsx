"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Timetable = {
  id: number;
  teacher_id: string;
  teacher_name: string;
  class_names: string[];
  day_of_week: string;
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  is_holiday: boolean;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SUBJECTS = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "General Knowledge",
  "Others",
];

function TimetableCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get("id");

  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("Teacher");

  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [isHoliday, setIsHoliday] = useState(false);
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = Boolean(editId);

  useEffect(() => {
    const id =
      localStorage.getItem("attendance_teacher_id") ||
      localStorage.getItem("teacher_username") ||
      localStorage.getItem("teacherUsername") ||
      "";

    const name =
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherName") ||
      localStorage.getItem("attendance_teacher_name") ||
      localStorage.getItem("teacher_username") ||
      localStorage.getItem("teacherUsername") ||
      "Teacher";

    if (!id) {
      router.replace("/");
      return;
    }

    setTeacherId(id);
    setTeacherName(name);

    loadData(id);
  }, [router, editId]);

  const loadData = async (id: string) => {
    setLoading(true);
    setError("");

    try {
      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select("class_name");

      if (studentError) {
        throw studentError;
      }

      const uniqueClasses = Array.from(
        new Set(
          (studentData || [])
            .map((student: { class_name: string | null }) =>
              student.class_name?.trim()
            )
            .filter(Boolean)
        )
      ).sort((a, b) => a!.localeCompare(b!)) as string[];

      setClasses(uniqueClasses);

      if (editId) {
        const { data, error: timetableError } =
          await supabase
            .from("timetables")
            .select(
              "id, teacher_id, teacher_name, class_names, day_of_week, subject, start_time, end_time, is_holiday"
            )
            .eq("id", Number(editId))
            .single();

        if (timetableError) {
          throw timetableError;
        }

        const timetable = data as Timetable;

        setDayOfWeek(timetable.day_of_week);
        setIsHoliday(Boolean(timetable.is_holiday));
        setSubject(timetable.subject || "");
        setStartTime(timetable.start_time?.slice(0, 5) || "");
        setEndTime(timetable.end_time?.slice(0, 5) || "");
        setSelectedClasses(timetable.class_names || []);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load timetable data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (className: string) => {
    setSelectedClasses((current) =>
      current.includes(className)
        ? current.filter((item) => item !== className)
        : [...current, className]
    );
  };

  const selectAllClasses = () => {
    setSelectedClasses(classes);
  };

  const clearClasses = () => {
    setSelectedClasses([]);
  };

  const handleHolidayChange = (checked: boolean) => {
    setIsHoliday(checked);

    if (checked) {
      setSubject("");
      setStartTime("");
      setEndTime("");
    }
  };

  const handleSave = async () => {
    setError("");

    if (!teacherId) {
      setError("Teacher session not found. Please login again.");
      return;
    }

    if (selectedClasses.length === 0) {
      setError("Please select at least one class.");
      return;
    }

    if (!isHoliday && !subject) {
      setError("Please select a subject.");
      return;
    }

    if (!isHoliday && (!startTime || !endTime)) {
      setError("Please select both start and end time.");
      return;
    }

    if (!isHoliday && endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        teacher_id: teacherId,
        teacher_name: teacherName,
        class_names: selectedClasses,
        day_of_week: dayOfWeek,
        is_holiday: isHoliday,
        subject: isHoliday ? null : subject,
        start_time: isHoliday ? null : startTime,
        end_time: isHoliday ? null : endTime,
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from("timetables")
          .update(payload)
          .eq("id", Number(editId));

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("timetables")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }
      }

      router.push("/teacher/timetable");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save timetable."
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    const keys = [
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",
      "teacherLoggedIn",
      "teacher",
      "teacherUsername",
      "teacher_username",
      "teacherName",
      "teacher_name",
    ];

    keys.forEach((key) => localStorage.removeItem(key));

    sessionStorage.clear();

    router.replace("/");
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #ecfeff 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "30px 36px",
            borderRadius: 18,
            boxShadow: "0 12px 40px rgba(15,23,42,0.10)",
            color: "#1e293b",
            fontWeight: 700,
          }}
        >
          Loading Timetable...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #ecfeff 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <header
        style={{
          background:
            "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #0891b2 100%)",
          color: "#ffffff",
          padding: "18px 20px",
          boxShadow: "0 8px 25px rgba(15,23,42,0.15)",
        }}
      >
        <div
          style={{
            maxWidth: 1150,
            margin: "0 auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => window.location.reload()}
            style={topButton}
          >
            Refresh
          </button>

          <button
            onClick={() => router.back()}
            style={topButton}
          >
            Back
          </button>

          <button
            onClick={() => router.push("/teacher/dashboard")}
            style={topButton}
          >
            Dashboard
          </button>

          <button
            onClick={logout}
            style={{
              ...topButton,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          padding: "28px 20px 50px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #312e81, #4338ca)",
            color: "#ffffff",
            borderRadius: 24,
            padding: "28px",
            marginBottom: 22,
            boxShadow: "0 15px 35px rgba(49,46,129,0.20)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              opacity: 0.85,
              marginBottom: 8,
            }}
          >
            TEACHER • TIMETABLE
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(26px, 5vw, 38px)",
            }}
          >
            {isEditMode
              ? "Edit Timetable"
              : "Create Timetable"}
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              opacity: 0.92,
              lineHeight: 1.6,
            }}
          >
            Select one or multiple classes and create their
            class timetable.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "14px 16px",
              borderRadius: 14,
              marginBottom: 20,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: "22px",
            boxShadow: "0 10px 35px rgba(15,23,42,0.08)",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              color: "#1e1b4b",
              fontSize: 21,
            }}
          >
            Class & Schedule
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <label style={labelStyle}>
              Day
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                style={inputStyle}
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Day Status
              <select
                value={isHoliday ? "Holiday" : "Class"}
                onChange={(e) =>
                  handleHolidayChange(e.target.value === "Holiday")
                }
                style={inputStyle}
              >
                <option value="Class">Class</option>
                <option value="Holiday">Holiday</option>
              </select>
            </label>

            {!isHoliday && (
              <>
                <label style={labelStyle}>
                  Subject
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select Subject</option>

                    {SUBJECTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Start Time
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  End Time
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </>
            )}
          </div>

          {isHoliday && (
            <div
              style={{
                marginTop: 18,
                padding: "14px 16px",
                borderRadius: 14,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontWeight: 800,
              }}
            >
              Holiday selected. Subject and class timings are not
              required.
            </div>
          )}
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: "22px",
            boxShadow: "0 10px 35px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#1e1b4b",
                  fontSize: 21,
                }}
              >
                Select Classes
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                }}
              >
                {selectedClasses.length} class
                {selectedClasses.length === 1 ? "" : "es"} selected
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={selectAllClasses}
                style={smallButton}
              >
                Select All
              </button>

              <button
                onClick={clearClasses}
                style={{
                  ...smallButton,
                  background: "#f1f5f9",
                  color: "#334155",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {classes.length === 0 ? (
            <div
              style={{
                padding: 20,
                borderRadius: 14,
                background: "#f8fafc",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              No classes found in the student records.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {classes.map((className) => {
                const selected =
                  selectedClasses.includes(className);

                return (
                  <button
                    key={className}
                    onClick={() => toggleClass(className)}
                    style={{
                      padding: "14px 12px",
                      borderRadius: 14,
                      border: selected
                        ? "2px solid #4338ca"
                        : "1px solid #cbd5e1",
                      background: selected
                        ? "#eef2ff"
                        : "#ffffff",
                      color: selected
                        ? "#312e81"
                        : "#334155",
                      fontWeight: 800,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {className}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <button
            onClick={() => router.push("/teacher/timetable")}
            style={{
              padding: "14px 22px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "14px 24px",
              borderRadius: 14,
              border: "none",
              background: saving
                ? "#94a3b8"
                : "linear-gradient(135deg, #4338ca, #0891b2)",
              color: "#ffffff",
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 8px 20px rgba(67,56,202,0.22)",
            }}
          >
            {saving
              ? "Saving..."
              : isEditMode
                ? "Update Timetable"
                : "Save Timetable"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function TimetableCreatePage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              padding: 30,
              fontWeight: 800,
              color: "#1e293b",
            }}
          >
            Loading Timetable...
          </div>
        </main>
      }
    >
      <TimetableCreateContent />
    </Suspense>
  );
}

const topButton: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "9px 14px",
  background: "rgba(255,255,255,0.16)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#334155",
  fontWeight: 800,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 15,
  outline: "none",
};

const smallButton: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "9px 13px",
  background: "#e0e7ff",
  color: "#3730a3",
  fontWeight: 800,
  cursor: "pointer",
};