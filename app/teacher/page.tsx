"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Student = {
  id: number;
  student_name: string;
  student_username: string;
  admission_date: string;
};

export default function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [attendance, setAttendance] = useState<
    Record<number, "Present" | "Absent">
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      loadAttendance();
    }
  }, [selectedDate, students]);

  async function loadStudents() {
    const { data, error } = await supabase
      .from("students")
      .select(
        "id, student_name, student_username, admission_date"
      )
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Failed to load students");
      setLoading(false);
      return;
    }

    setStudents(data || []);
    setLoading(false);
  }

  async function loadAttendance() {
    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error(error);
      return;
    }

    const result: Record<
      number,
      "Present" | "Absent"
    > = {};

    (data || []).forEach((item) => {
      result[item.student_id] = item.status;
    });

    setAttendance(result);
  }

  function markAllPresent() {
    const result: Record<
      number,
      "Present" | "Absent"
    > = {};

    students.forEach((student) => {
      result[student.id] = "Present";
    });

    setAttendance(result);
    setMessage("All students marked Present 🟢");

    setTimeout(() => {
      setMessage("");
    }, 2000);
  }

  function markAllAbsent() {
    const result: Record<
      number,
      "Present" | "Absent"
    > = {};

    students.forEach((student) => {
      result[student.id] = "Absent";
    });

    setAttendance(result);
    setMessage("All students marked Absent 🔴");

    setTimeout(() => {
      setMessage("");
    }, 2000);
  }

  function markStudent(
    studentId: number,
    status: "Present" | "Absent"
  ) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }

  async function saveAttendance() {
    if (students.length === 0) {
      setMessage("No students found.");
      return;
    }

    const missingStudents = students.filter(
      (student) => !attendance[student.id]
    );

    if (missingStudents.length > 0) {
      setMessage(
        `${missingStudents.length} student(s) are not marked yet.`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const records = students.map((student) => ({
      student_id: student.id,
      attendance_date: selectedDate,
      status: attendance[student.id],
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(records, {
        onConflict: "student_id,attendance_date",
      });

    if (error) {
      console.error(error);
      setMessage("Failed to save attendance ❌");
      setSaving(false);
      return;
    }

    setMessage("Attendance saved successfully ✅");
    setSaving(false);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  const presentCount = students.filter(
    (student) =>
      attendance[student.id] === "Present"
  ).length;

  const absentCount = students.filter(
    (student) =>
      attendance[student.id] === "Absent"
  ).length;

  if (loading) {
    return (
      <div className="loading">
        Loading Teacher Dashboard...
      </div>
    );
  }

  return (
    <main className="page">

      <div className="container">

        {/* HEADER */}

        <header className="header">

          <div>

            <p className="small-title">
              ATTENDANCE PORTAL
            </p>

            <h1>
              Teacher Dashboard
            </h1>

            <p className="subtitle">
              Manage student attendance
            </p>

          </div>

          <button
            className="logout"
            onClick={() => {
              localStorage.removeItem("teacher");
              window.location.href = "/";
            }}
          >
            Logout
          </button>

        </header>


        {/* DATE + SUMMARY */}

        <section className="top-card">

          <div className="date-box">

            <h2>
              Attendance Date
            </h2>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
            />

          </div>


          <div className="summary">

            <div className="summary-box total">

              <span>
                Total
              </span>

              <strong>
                {students.length}
              </strong>

            </div>


            <div className="summary-box present">

              <span>
                Present
              </span>

              <strong>
                {presentCount}
              </strong>

            </div>


            <div className="summary-box absent">

              <span>
                Absent
              </span>

              <strong>
                {absentCount}
              </strong>

            </div>

          </div>

        </section>


        {/* BULK BUTTONS */}

        <section className="bulk-card">

          <div>

            <h2>
              Quick Attendance
            </h2>

            <p>
              Mark all students at once
            </p>

          </div>


          <div className="bulk-buttons">

            <button
              className="all-present"
              onClick={markAllPresent}
            >
              🟢 Mark All Present
            </button>

            <button
              className="all-absent"
              onClick={markAllAbsent}
            >
              🔴 Mark All Absent
            </button>

          </div>

        </section>


        {/* MESSAGE */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}


        {/* STUDENTS */}

        <section className="students-card">

          <div className="section-title">

            <div>

              <h2>
                Student List
              </h2>

              <p>
                Mark individual attendance if required
              </p>

            </div>

          </div>


          <div className="student-list">

            {students.map((student, index) => (

              <div
                className="student-row"
                key={student.id}
              >

                {/* STUDENT */}

                <div className="student-info">

                  <div className="number">
                    {index + 1}
                  </div>


                  <div className="details">

                    <strong>
                      {student.student_name}
                    </strong>

                    <span>
                      Username: {student.student_username}
                    </span>

                    <span>
                      Admission Date:{" "}
                      {new Date(
                        student.admission_date
                      ).toLocaleDateString("en-IN")}
                    </span>

                  </div>

                </div>


                {/* ATTENDANCE BUTTONS */}

                <div className="actions">

                  <button
                    className={
                      attendance[student.id] ===
                      "Present"
                        ? "present active"
                        : "present"
                    }
                    onClick={() =>
                      markStudent(
                        student.id,
                        "Present"
                      )
                    }
                  >
                    ✓ Present
                  </button>


                  <button
                    className={
                      attendance[student.id] ===
                      "Absent"
                        ? "absent active"
                        : "absent"
                    }
                    onClick={() =>
                      markStudent(
                        student.id,
                        "Absent"
                      )
                    }
                  >
                    ✕ Absent
                  </button>

                </div>

              </div>

            ))}

          </div>


          {/* SAVE */}

          <div className="save-area">

            <button
              className="save-button"
              onClick={saveAttendance}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "💾 Save Attendance"}
            </button>

          </div>

        </section>


        <footer>
          Student Attendance Management System
        </footer>

      </div>


      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f1f5f9;
          color: #0f172a;
          padding: 30px 20px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .container {
          max-width: 1150px;
          margin: auto;
        }

        /* HEADER */

        .header {
          background: #0f172a;
          color: white;
          padding: 30px;
          border-radius: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .small-title {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.7;
          margin: 0 0 8px;
        }

        h1 {
          font-size: 32px;
          margin: 0;
        }

        .subtitle {
          color: #cbd5e1;
          margin: 10px 0 0;
        }

        .logout {
          border: none;
          background: white;
          color: #0f172a;
          padding: 11px 20px;
          border-radius: 10px;
          font-weight: bold;
          cursor: pointer;
        }


        /* TOP CARD */

        .top-card {
          background: white;
          border-radius: 20px;
          padding: 25px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 25px;
          box-shadow: 0 5px 25px rgba(15, 23, 42, 0.08);
        }

        .date-box h2 {
          margin: 0 0 12px;
          font-size: 20px;
        }

        input[type="date"] {
          padding: 12px 15px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 16px;
          color: #0f172a;
          background: white;
        }

        .summary {
          display: flex;
          gap: 12px;
        }

        .summary-box {
          min-width: 100px;
          padding: 15px;
          border-radius: 12px;
          text-align: center;
        }

        .summary-box span {
          display: block;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .summary-box strong {
          font-size: 24px;
        }

        .summary-box.total {
          background: #e0e7ff;
          color: #3730a3;
        }

        .summary-box.present {
          background: #dcfce7;
          color: #15803d;
        }

        .summary-box.absent {
          background: #fee2e2;
          color: #dc2626;
        }


        /* BULK */

        .bulk-card {
          background: white;
          border-radius: 20px;
          padding: 25px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          box-shadow: 0 5px 25px rgba(15, 23, 42, 0.08);
        }

        .bulk-card h2 {
          margin: 0;
        }

        .bulk-card p {
          color: #64748b;
          margin: 7px 0 0;
        }

        .bulk-buttons {
          display: flex;
          gap: 10px;
        }

        .bulk-buttons button {
          border: none;
          padding: 12px 18px;
          border-radius: 10px;
          font-weight: bold;
          cursor: pointer;
        }

        .all-present {
          background: #16a34a;
          color: white;
        }

        .all-absent {
          background: #dc2626;
          color: white;
        }


        /* MESSAGE */

        .message {
          background: #dcfce7;
          color: #166534;
          padding: 15px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-weight: bold;
        }


        /* STUDENTS */

        .students-card {
          background: white;
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 5px 25px rgba(15, 23, 42, 0.08);
        }

        .section-title h2 {
          margin: 0;
        }

        .section-title p {
          color: #64748b;
          margin: 7px 0 0;
        }

        .student-list {
          margin-top: 25px;
        }

        .student-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 0;
          border-top: 1px solid #e2e8f0;
          gap: 20px;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
        }

        .number {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          background: #dbeafe;
          color: #2563eb;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .details strong {
          display: block;
          font-size: 17px;
        }

        .details span {
          display: block;
          color: #64748b;
          font-size: 13px;
          margin-top: 4px;
        }


        /* ACTIONS */

        .actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .actions button {
          border: none;
          padding: 11px 16px;
          border-radius: 9px;
          font-weight: bold;
          cursor: pointer;
        }

        .present {
          background: #dcfce7;
          color: #15803d;
        }

        .present.active {
          background: #16a34a;
          color: white;
        }

        .absent {
          background: #fee2e2;
          color: #dc2626;
        }

        .absent.active {
          background: #dc2626;
          color: white;
        }


        /* SAVE */

        .save-area {
          margin-top: 25px;
          padding-top: 25px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
        }

        .save-button {
          border: none;
          background: #2563eb;
          color: white;
          padding: 15px 30px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }

        .save-button:hover {
          background: #1d4ed8;
        }

        .save-button:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }


        /* FOOTER */

        footer {
          text-align: center;
          color: #64748b;
          font-size: 13px;
          margin-top: 25px;
        }


        /* LOADING */

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #0f172a;
          font-size: 20px;
        }


        /* MOBILE */

        @media (max-width: 800px) {

          .page {
            padding: 15px;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }

          .logout {
            width: 100%;
          }

          .top-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .summary {
            width: 100%;
          }

          .summary-box {
            flex: 1;
            min-width: 0;
          }

          .bulk-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .bulk-buttons {
            width: 100%;
          }

          .bulk-buttons button {
            flex: 1;
          }

        }


        @media (max-width: 600px) {

          h1 {
            font-size: 26px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }

          .summary-box {
            padding: 10px 5px;
          }

          .summary-box strong {
            font-size: 20px;
          }

          .bulk-buttons {
            flex-direction: column;
          }

          .student-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .actions {
            width: 100%;
          }

          .actions button {
            flex: 1;
          }

          .save-area {
            justify-content: stretch;
          }

          .save-button {
            width: 100%;
          }

        }

      `}</style>

    </main>
  );
}