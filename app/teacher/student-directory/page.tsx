"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: number;
  student_username: string | null;
  student_name: string | null;
  created_at: string | null;
  admission_date: string | null;
  date_of_birth: string | null;
  father_name: string | null;
  mother_name: string | null;
};

export default function StudentDirectoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("students")
        .select(
          `
          id,
          student_username,
          student_name,
          created_at,
          admission_date,
          date_of_birth,
          father_name,
          mother_name
        `
        )
        .order("id", { ascending: true });

      if (fetchError) {
        console.error("Student directory error:", fetchError);
        setError(fetchError.message);
        return;
      }

      setStudents(data || []);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Unable to load student details.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStudentName(student: Student) {
    return student.student_name?.trim() || "Unknown Student";
  }

  function getStudentId(student: Student) {
    return student.student_username?.trim() || String(student.id);
  }

  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return students;
    }

    return students.filter((student) => {
      const name = getStudentName(student).toLowerCase();
      const studentId = getStudentId(student).toLowerCase();
      const father = student.father_name?.toLowerCase() || "";
      const mother = student.mother_name?.toLowerCase() || "";

      return (
        name.includes(value) ||
        studentId.includes(value) ||
        father.includes(value) ||
        mother.includes(value)
      );
    });
  }, [students, search]);

  function exportCSV() {
    if (students.length === 0) {
      alert("There are no students to export.");
      return;
    }

    const headers = [
      "Student ID",
      "Student Name",
      "Admission Date",
      "Date of Birth",
      "Father Name",
      "Mother Name",
    ];

    const rows = students.map((student) => [
      getStudentId(student),
      getStudentName(student),
      student.admission_date
        ? formatDate(student.admission_date)
        : "",
      student.date_of_birth
        ? formatDate(student.date_of_birth)
        : "",
      student.father_name || "",
      student.mother_name || "",
    ]);

    const escapeCSV = (value: string) => {
      const stringValue = String(value ?? "");

      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    const today = new Date().toISOString().split("T")[0];

    link.download = `RACER-ACADEMY-Students-${today}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <main className="directory-page">
      <div className="page-container">
        {/* HEADER */}
        <header className="page-header">
          <div>
            <div className="breadcrumb">
              Teacher Dashboard / Student Directory
            </div>

            <h1>👨‍🎓 Student Directory</h1>

            <p>
              Complete basic details of all registered students
            </p>
          </div>

          <div className="header-actions">
            <button
              className="refresh-button"
              onClick={fetchStudents}
              disabled={loading}
            >
              🔄 Refresh
            </button>

            <button
              className="export-button"
              onClick={exportCSV}
              disabled={students.length === 0}
            >
              📥 Export CSV
            </button>
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <section className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon">👥</div>
            <div>
              <span>Total Students</span>
              <strong>{students.length}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">🔎</div>
            <div>
              <span>Showing</span>
              <strong>{filteredStudents.length}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">📅</div>
            <div>
              <span>With Admission Date</span>
              <strong>
                {
                  students.filter(
                    (student) => !!student.admission_date
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">📋</div>
            <div>
              <span>Directory Status</span>
              <strong>Live</strong>
            </div>
          </div>
        </section>

        {/* SEARCH */}
        <section className="control-card">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>

            <input
              type="text"
              placeholder="Search by student name, ID, father or mother name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="error-box">
            <strong>⚠️ Unable to load students</strong>
            <p>{error}</p>

            <button onClick={fetchStudents}>
              Try Again
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <section className="loading-card">
            <div className="loader"></div>
            <h3>Loading student directory...</h3>
            <p>Please wait while student details are loaded.</p>
          </section>
        ) : filteredStudents.length === 0 ? (
          <section className="empty-card">
            <div className="empty-icon">
              {search ? "🔍" : "👨‍🎓"}
            </div>

            <h3>
              {search
                ? "No students found"
                : "No students available"}
            </h3>

            <p>
              {search
                ? "Try searching with a different name or Student ID."
                : "Students added to the system will automatically appear here."}
            </p>
          </section>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <section className="table-card desktop-view">
              <div className="table-top">
                <div>
                  <h2>All Students</h2>
                  <p>
                    {filteredStudents.length} student
                    {filteredStudents.length !== 1 ? "s" : ""} displayed
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Admission Date</th>
                      <th>Date of Birth</th>
                      <th>Father Name</th>
                      <th>Mother Name</th>
                      <th>Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (student, index) => (
                        <tr key={student.id}>
                          <td>
                            <span className="row-number">
                              {index + 1}
                            </span>
                          </td>

                          <td>
                            <div className="student-cell">
                              <div className="student-avatar">
                                {getStudentName(student)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {getStudentName(student)}
                                </strong>
                                <small>
                                  Database ID: {student.id}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="student-id-badge">
                              {getStudentId(student)}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              student.admission_date
                            )}
                          </td>

                          <td>
                            {formatDate(
                              student.date_of_birth
                            )}
                          </td>

                          <td>
                            {student.father_name || "—"}
                          </td>

                          <td>
                            {student.mother_name || "—"}
                          </td>

                          <td>
                            <button
                              className="details-button"
                              onClick={() =>
                                setSelectedStudent(student)
                              }
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* MOBILE CARDS */}
            <section className="mobile-view mobile-list">
              {filteredStudents.map(
                (student, index) => (
                  <article
                    className="student-card"
                    key={student.id}
                  >
                    <div className="mobile-card-header">
                      <div className="student-cell">
                        <div className="student-avatar large">
                          {getStudentName(student)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {getStudentName(student)}
                          </strong>

                          <span className="student-id-badge">
                            {getStudentId(student)}
                          </span>
                        </div>
                      </div>

                      <span className="mobile-number">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="mobile-details">
                      <div>
                        <span>📅 Admission Date</span>
                        <strong>
                          {formatDate(
                            student.admission_date
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>🎂 Date of Birth</span>
                        <strong>
                          {formatDate(
                            student.date_of_birth
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>👨 Father Name</span>
                        <strong>
                          {student.father_name || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>👩 Mother Name</span>
                        <strong>
                          {student.mother_name || "—"}
                        </strong>
                      </div>
                    </div>

                    <button
                      className="mobile-details-button"
                      onClick={() =>
                        setSelectedStudent(student)
                      }
                    >
                      View Complete Details →
                    </button>
                  </article>
                )
              )}
            </section>
          </>
        )}
      </div>

      {/* DETAILS MODAL */}
      {selectedStudent && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="modal-label">
                  STUDENT PROFILE
                </span>

                <h2>
                  {getStudentName(selectedStudent)}
                </h2>

                <span className="modal-student-id">
                  {getStudentId(selectedStudent)}
                </span>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedStudent(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-avatar-section">
              <div className="modal-avatar">
                {getStudentName(selectedStudent)
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>
                  {getStudentName(selectedStudent)}
                </h3>

                <p>
                  Student ID:{" "}
                  <strong>
                    {getStudentId(selectedStudent)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>👤 Student Name</span>
                <strong>
                  {getStudentName(selectedStudent)}
                </strong>
              </div>

              <div className="detail-item">
                <span>🪪 Student ID</span>
                <strong>
                  {getStudentId(selectedStudent)}
                </strong>
              </div>

              <div className="detail-item">
                <span>📅 Admission Date</span>
                <strong>
                  {formatDate(
                    selectedStudent.admission_date
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>🎂 Date of Birth</span>
                <strong>
                  {formatDate(
                    selectedStudent.date_of_birth
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>👨 Father Name</span>
                <strong>
                  {selectedStudent.father_name || "—"}
                </strong>
              </div>

              <div className="detail-item">
                <span>👩 Mother Name</span>
                <strong>
                  {selectedStudent.mother_name || "—"}
                </strong>
              </div>

              <div className="detail-item">
                <span>🔢 Database ID</span>
                <strong>
                  {selectedStudent.id}
                </strong>
              </div>

              <div className="detail-item">
                <span>🕐 Record Created</span>
                <strong>
                  {selectedStudent.created_at
                    ? formatDate(
                        selectedStudent.created_at
                      )
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .directory-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(99, 102, 241, 0.13),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #f8fafc 0%,
              #eef2ff 50%,
              #f8fafc 100%
            );
          color: #111827;
          padding: 28px 20px 50px;
        }

        .page-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 28px;
        }

        .breadcrumb {
          color: #6366f1;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .page-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .page-header p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .header-actions button {
          border: none;
          border-radius: 12px;
          padding: 12px 17px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .header-actions button:hover {
          transform: translateY(-1px);
        }

        .header-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .refresh-button {
          background: white;
          color: #334155;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 5px 18px rgba(15, 23, 42, 0.06);
        }

        .export-button {
          background: #111827;
          color: white;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.18);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 18px;
          padding: 19px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .summary-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          font-size: 23px;
          flex-shrink: 0;
        }

        .summary-card span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .summary-card strong {
          display: block;
          font-size: 23px;
          font-weight: 900;
          color: #111827;
        }

        .control-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.04);
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          font-size: 18px;
          pointer-events: none;
        }

        .search-wrapper input {
          width: 100%;
          height: 50px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0 48px 0 48px;
          outline: none;
          font-size: 14px;
          color: #111827;
          background: #f8fafc;
          transition: 0.2s ease;
        }

        .search-wrapper input:focus {
          background: white;
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 12px;
          border: none;
          background: #e2e8f0;
          color: #475569;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
        }

        .table-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 12px 35px rgba(15, 23, 42, 0.06);
        }

        .table-top {
          padding: 20px 22px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-top h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
        }

        .table-top p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        th {
          background: #f8fafc;
          color: #475569;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 900;
          padding: 15px 14px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        td {
          padding: 15px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #334155;
          vertical-align: middle;
        }

        tbody tr {
          transition: 0.15s ease;
        }

        tbody tr:hover {
          background: #fafaff;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .row-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          background: #f1f5f9;
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .student-avatar {
          width: 39px;
          height: 39px;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #6366f1,
            #8b5cf6
          );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .student-avatar.large {
          width: 50px;
          height: 50px;
          border-radius: 15px;
          font-size: 20px;
        }

        .student-cell strong {
          display: block;
          color: #111827;
          font-size: 14px;
          font-weight: 850;
        }

        .student-cell small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 10px;
        }

        .student-id-badge {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 8px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .details-button {
          border: none;
          border-radius: 9px;
          background: #eef2ff;
          color: #4f46e5;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }

        .details-button:hover {
          background: #e0e7ff;
        }

        .mobile-view {
          display: none;
        }

        .loading-card,
        .empty-card,
        .error-box {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 55px 25px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .loading-card h3,
        .empty-card h3 {
          margin: 15px 0 7px;
          font-size: 20px;
          font-weight: 900;
        }

        .loading-card p,
        .empty-card p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .loader {
          width: 42px;
          height: 42px;
          border: 4px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 0.8s linear infinite;
        }

        .empty-icon {
          font-size: 45px;
        }

        .error-box {
          margin-bottom: 20px;
          background: #fff7f7;
          border-color: #fecaca;
        }

        .error-box strong {
          color: #b91c1c;
          font-size: 17px;
        }

        .error-box p {
          color: #7f1d1d;
          font-size: 13px;
          margin: 8px 0 15px;
          word-break: break-word;
        }

        .error-box button {
          border: none;
          background: #dc2626;
          color: white;
          border-radius: 9px;
          padding: 9px 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }

        .details-modal {
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25);
          animation: modalIn 0.22s ease;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding: 25px 25px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-label {
          display: block;
          color: #6366f1;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 7px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
        }

        .modal-student-id {
          display: inline-block;
          margin-top: 7px;
          padding: 5px 9px;
          border-radius: 7px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 900;
        }

        .modal-close {
          border: none;
          background: #f1f5f9;
          color: #475569;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 16px;
          flex-shrink: 0;
        }

        .modal-avatar-section {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 22px 25px;
          background: #f8fafc;
        }

        .modal-avatar {
          width: 62px;
          height: 62px;
          border-radius: 18px;
          background: linear-gradient(
            135deg,
            #6366f1,
            #8b5cf6
          );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 900;
        }

        .modal-avatar-section h3 {
          margin: 0 0 5px;
          font-size: 19px;
          font-weight: 900;
        }

        .modal-avatar-section p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 22px 25px;
        }

        .detail-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          padding: 14px;
        }

        .detail-item span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          margin-bottom: 6px;
        }

        .detail-item strong {
          display: block;
          color: #111827;
          font-size: 14px;
          font-weight: 850;
          word-break: break-word;
        }

        .modal-footer {
          padding: 0 25px 25px;
          display: flex;
          justify-content: flex-end;
        }

        .modal-footer button {
          border: none;
          background: #111827;
          color: white;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 800;
          cursor: pointer;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 1100px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .directory-page {
            padding: 18px 12px 35px;
          }

          .page-header {
            align-items: stretch;
            flex-direction: column;
            margin-bottom: 20px;
          }

          .page-header h1 {
            font-size: 29px;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .summary-card {
            padding: 13px;
            gap: 10px;
            border-radius: 14px;
          }

          .summary-icon {
            width: 40px;
            height: 40px;
            border-radius: 11px;
            font-size: 18px;
          }

          .summary-card strong {
            font-size: 18px;
          }

          .summary-card span {
            font-size: 10px;
          }

          .desktop-view {
            display: none;
          }

          .mobile-view {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .student-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 17px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
          }

          .mobile-card-header {
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            border-bottom: 1px solid #f1f5f9;
          }

          .mobile-number {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 900;
          }

          .mobile-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px;
            background: #e2e8f0;
          }

          .mobile-details > div {
            background: white;
            padding: 12px;
            min-width: 0;
          }

          .mobile-details span {
            display: block;
            color: #64748b;
            font-size: 10px;
            font-weight: 750;
            margin-bottom: 4px;
          }

          .mobile-details strong {
            display: block;
            color: #111827;
            font-size: 12px;
            word-break: break-word;
          }

          .mobile-details-button {
            width: 100%;
            border: none;
            border-top: 1px solid #f1f5f9;
            background: white;
            color: #4f46e5;
            padding: 13px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .detail-grid {
            grid-template-columns: 1fr;
            padding: 17px;
          }

          .modal-header {
            padding: 20px;
          }

          .modal-avatar-section {
            padding: 18px 20px;
          }

          .modal-footer {
            padding: 0 20px 20px;
          }

          .details-modal {
            border-radius: 20px;
          }
        }

        @media (max-width: 420px) {
          .summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .header-actions {
            flex-direction: column;
          }

          .header-actions button {
            width: 100%;
          }

          .mobile-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}