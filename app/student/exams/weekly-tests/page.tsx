"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { isOnOrAfterAdmission } from "../../../../lib/admission-date";

type WeeklyRecord = {
  id: number;
  test_name: string;
  test_date: string;
  total_marks: number;
  obtained_marks: number;
  subject: string | null;
  remarks: string | null;
};

function formatWeeklyDate(value: string) {
  const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudentWeeklyTestsPage() {
  const [studentName, setStudentName] = useState("Student");
  const [tests, setTests] = useState<WeeklyRecord[]>([]);
  const [subject, setSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadWeeklyTests = async () => {
      setLoading(true);
      setError("");
      try {
        const username = localStorage.getItem("studentUsername") || localStorage.getItem("student_username") || "";
        const rawId = localStorage.getItem("studentId") || localStorage.getItem("attendance_student_id") || localStorage.getItem("student_id") || "";
        let studentQuery = supabase.from("students").select("id,student_name,student_username,admission_date");
        if (username) studentQuery = studentQuery.eq("student_username", username);
        else if (Number(rawId) > 0) studentQuery = studentQuery.eq("id", Number(rawId));
        else throw new Error("Student login information not found. Please log in again.");

        const { data: student, error: studentError } = await studentQuery.maybeSingle();
        if (studentError) throw studentError;
        if (!student?.id) throw new Error("Student account not found.");

        const { data, error: assessmentError } = await supabase
          .from("academy_assessments")
          .select("id,test_name,test_date,total_marks,obtained_marks,subject,remarks,attendance_status")
          .eq("student_id", student.id)
          .order("id", { ascending: false })
          .limit(200);
        if (assessmentError) throw assessmentError;

        const weeklyRecords = (data || []).filter((record: any) => {
          const [year, month, day] = String(record.test_date || "").slice(0, 10).split("-").map(Number);
          const saturday = year && month && day && new Date(year, month - 1, day).getDay() === 6;
          const attended = String(record.attendance_status || "PRESENT").trim().toUpperCase();
          return saturday && attended === "PRESENT" && !/maha\s*test/i.test(String(record.test_name || "")) && isOnOrAfterAdmission(student.admission_date, record.test_date);
        }) as WeeklyRecord[];

        if (active) {
          setStudentName(student.student_name || student.student_username || "Student");
          setTests(weeklyRecords);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Weekly test reports could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadWeeklyTests();
    return () => { active = false; };
  }, []);

  const subjects = useMemo(() => Array.from(new Set(tests.map((test) => String(test.subject || "").trim()).filter(Boolean))).sort(), [tests]);
  const visibleTests = useMemo(() => subject === "All" ? tests : tests.filter((test) => test.subject === subject), [subject, tests]);
  const totalObtained = visibleTests.reduce((sum, test) => sum + Number(test.obtained_marks || 0), 0);
  const totalMarks = visibleTests.reduce((sum, test) => sum + Number(test.total_marks || 0), 0);
  const average = totalMarks ? Math.round((totalObtained / totalMarks) * 100) : 0;
  const latestTest = visibleTests[0];

  return (
    <main className="student-weekly-report">
      <header className="student-weekly-report-hero">
        <span>EXAMS · SATURDAY TESTS</span>
        <h1>Weekly Test Reports</h1>
        <p>{studentName} · Your newest saved weekly test appears first.</p>
      </header>

      {error && <div className="student-weekly-report-error" role="alert">{error}</div>}

      <section className="student-weekly-report-stats" aria-label="Weekly test summary">
        <article><span>WEEKLY TESTS</span><strong>{loading ? "—" : visibleTests.length}</strong></article>
        <article><span>AVERAGE</span><strong>{loading ? "—" : `${average}%`}</strong></article>
        <article><span>TOTAL MARKS</span><strong>{loading ? "—" : `${totalObtained}/${totalMarks}`}</strong></article>
      </section>

      <section className="student-weekly-report-panel">
        <div className="student-weekly-report-panel-head">
          <div><span>YOUR SATURDAY RESULTS</span><h2>Weekly tests</h2></div>
          <label>Subject
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="All">All subjects</option>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        {!loading && !error && !visibleTests.length ? (
          <div className="student-weekly-report-empty"><span>📝</span><strong>No weekly test reports yet</strong><p>Your Saturday test results will show up here once they are saved.</p></div>
        ) : (
          <div className="student-weekly-report-list">
            {visibleTests.map((test, index) => {
              const percentage = Number(test.total_marks) > 0 ? (Number(test.obtained_marks) / Number(test.total_marks)) * 100 : 0;
              return (
                <article key={test.id} className={index === 0 ? "latest" : ""}>
                  <span className="student-weekly-report-number">{index === 0 ? "LATEST" : `#${index + 1}`}</span>
                  <div className="student-weekly-report-test-copy">
                    <strong>{test.test_name || "Saturday Weekly Test"}</strong>
                    <span>{test.subject || "Subject not specified"} · {formatWeeklyDate(test.test_date)}</span>
                    {test.remarks && <p>{test.remarks}</p>}
                  </div>
                  <div className="student-weekly-report-score"><strong>{test.obtained_marks}/{test.total_marks}</strong><span>{percentage.toFixed(0)}%</span></div>
                </article>
              );
            })}
            {loading && <div className="student-weekly-report-loading">Loading weekly test reports…</div>}
          </div>
        )}
      </section>

      {latestTest && !loading && <p className="student-weekly-report-latest-note">Latest saved result: {latestTest.test_name} · {formatWeeklyDate(latestTest.test_date)}.</p>}
      <Link className="student-weekly-report-back" href="/student/exams">← Back to Exams</Link>
    </main>
  );
}
