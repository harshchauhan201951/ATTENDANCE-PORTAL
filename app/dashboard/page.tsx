"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Attendance = {
  id: number;
  attendance_date: string;
  status: "Present" | "Absent";
};

export default function Dashboard() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [username, setUsername] = useState("student01");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    try {
      // Login ke baad saved student information
      const savedStudentId = localStorage.getItem("student_id");
      const savedUsername = localStorage.getItem("student_username");

      // Agar student_id available hai to uske records load karo
      if (savedStudentId) {
        if (savedUsername) {
          setUsername(savedUsername);
        }

        const { data, error } = await supabase
          .from("attendance")
          .select("id, attendance_date, status")
          .eq("student_id", Number(savedStudentId))
          .order("attendance_date", {
            ascending: false,
          });

        if (error) {
          console.error("Attendance error:", error);
        } else {
          setAttendance(data || []);
        }

        setLoading(false);
        return;
      }

      // Agar localStorage mein ID nahi hai,
      // students table se student01 find karo.
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("id, student_username, student_name")
        .eq("student_username", "student01")
        .limit(1);

      if (studentError) {
        console.error("Student error:", studentError);
        setLoading(false);
        return;
      }

      const student = students?.[0];

      if (!student) {
        console.error("student01 not found");
        setLoading(false);
        return;
      }

      setUsername(student.student_username);

      // Future page loads ke liye ID save kar do
      localStorage.setItem(
        "student_id",
        String(student.id)
      );

      localStorage.setItem(
        "student_username",
        student.student_username
      );

      const { data, error } = await supabase
        .from("attendance")
        .select("id, attendance_date, status")
        .eq("student_id", student.id)
        .order("attendance_date", {
          ascending: false,
        });

      if (error) {
        console.error("Attendance error:", error);
      } else {
        setAttendance(data || []);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalClasses = attendance.length;

  const present = attendance.filter(
    (item) => item.status === "Present"
  ).length;

  const absent = attendance.filter(
    (item) => item.status === "Absent"
  ).length;

  const percentage =
    totalClasses === 0
      ? 0
      : Math.round((present / totalClasses) * 100);

  function logout() {
    localStorage.removeItem("student_id");
    localStorage.removeItem("student_username");
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="loading">
        <div>
          <div className="loading-icon">📚</div>
          <h2>Loading Dashboard...</h2>
          <p>Please wait</p>
        </div>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: #f1f5f9;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
          }

          .loading-icon {
            font-size: 45px;
            margin-bottom: 15px;
          }

          h2 {
            margin: 0;
          }

          p {
            color: #64748b;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">

        <header className="header">
          <div>
            <p className="small-title">
              ATTENDANCE PORTAL
            </p>

            <h1>Student Dashboard</h1>

            <p className="welcome">
              Welcome back, <strong>{username}</strong> 👋
            </p>
          </div>

          <button
            className="logout"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <section className="cards">

          <div className="card blue">
            <div className="icon">📚</div>
            <p>Total Classes</p>
            <h2>{totalClasses}</h2>
          </div>

          <div className="card green">
            <div className="icon">✓</div>
            <p>Present</p>
            <h2>{present}</h2>
          </div>

          <div className="card red">
            <div className="icon">✕</div>
            <p>Absent</p>
            <h2>{absent}</h2>
          </div>

          <div className="card purple">
            <div className="icon">%</div>
            <p>Attendance</p>
            <h2>{percentage}%</h2>
          </div>

        </section>

        <section className="attendance-section">

          <div className="section-header">
            <div>
              <h2>Attendance History</h2>
              <p>
                Your recent attendance records
              </p>
            </div>

            <div className="percentage">
              {percentage}%
            </div>
          </div>

          {attendance.length === 0 ? (
            <div className="empty">
              No attendance records found.
            </div>
          ) : (
            <div className="table">

              <div className="table-head">
                <span>Date</span>
                <span>Status</span>
              </div>

              {attendance.map((item) => (
                <div
                  className="table-row"
                  key={item.id}
                >
                  <span>
                    {new Date(
                      item.attendance_date
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <span
                    className={
                      item.status === "Present"
                        ? "status present"
                        : "status absent"
                    }
                  >
                    {item.status}
                  </span>
                </div>
              ))}

            </div>
          )}

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
          width: 100%;
          max-width: 1100px;
          margin: auto;
        }

        .header {
          background: #0f172a;
          color: white;
          padding: 30px;
          border-radius: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
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

        .welcome {
          margin: 10px 0 0;
          color: #cbd5e1;
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

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 25px;
        }

        .card {
          padding: 25px;
          border-radius: 18px;
          color: white;
          min-height: 160px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.12);
        }

        .blue {
          background: #2563eb;
        }

        .green {
          background: #16a34a;
        }

        .red {
          background: #dc2626;
        }

        .purple {
          background: #7c3aed;
        }

        .icon {
          width: 42px;
          height: 42px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 18px;
        }

        .card p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .card h2 {
          font-size: 32px;
          margin: 8px 0 0;
        }

        .attendance-section {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 5px 25px rgba(15, 23, 42, 0.08);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 24px;
        }

        .section-header p {
          color: #64748b;
          margin: 7px 0 0;
        }

        .percentage {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }

        .table {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .table-head,
        .table-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 18px 20px;
        }

        .table-head {
          background: #f8fafc;
          font-weight: bold;
          color: #475569;
        }

        .table-row {
          border-top: 1px solid #e2e8f0;
          color: #1e293b;
        }

        .status {
          font-weight: bold;
        }

        .present {
          color: #16a34a;
        }

        .absent {
          color: #dc2626;
        }

        .empty {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        footer {
          text-align: center;
          margin-top: 25px;
          color: #64748b;
          font-size: 13px;
        }

        @media (max-width: 800px) {
          .cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .header {
            padding: 22px;
          }

          h1 {
            font-size: 26px;
          }
        }

        @media (max-width: 520px) {
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

          .cards {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .card {
            padding: 18px;
            min-height: 140px;
          }

          .card h2 {
            font-size: 26px;
          }

          .attendance-section {
            padding: 20px 15px;
          }
        }
      `}</style>
    </main>
  );
}