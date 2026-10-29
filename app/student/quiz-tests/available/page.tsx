"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { isStudentEligibleForDate } from "../../../../lib/admission-date";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
  access_mode: "scheduled" | "any_time" | null;
};

type StudentCycle = { id: number; class_name: string | null; admission_date?: string | null; admission_history?: { date?: string | null; type?: string | null }[] | null; is_active?: boolean | null };

function normalizeClass(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(
      /^CLASS\s+/i,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

function quizBelongsToStudent(
  quiz: Quiz,
  studentClass: string
) {
  const normalizedStudentClass =
    normalizeClass(
      studentClass
    );

  if (
    !normalizedStudentClass
  ) {
    return false;
  }

  const targetClasses =
    Array.isArray(
      quiz.target_classes
    )
      ? quiz.target_classes
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
              "string"
          )
          .map(
            normalizeClass
          )
          .filter(Boolean)
      : [];

  if (
    targetClasses.length > 0
  ) {
    return targetClasses.includes(
      normalizedStudentClass
    );
  }

  return (
    normalizeClass(
      quiz.class_name
    ) ===
    normalizedStudentClass
  );
}

/*
 * ---------------------------------------------------------
 * INDIA / IST DATE-TIME HELPERS
 * ---------------------------------------------------------
 *
 * Normal quiz window:
 *
 * 05:00 AM IST
 * to
 * 09:00 PM IST
 *
 * Teacher-authorized re-attempts are handled separately
 * and can override this normal time-window restriction.
 */

function getISTDateTime() {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }
  ).formatToParts(
    new Date()
  );

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !== "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(
      values.hour
    ),
    minute: Number(
      values.minute
    ),
    second: Number(
      values.second
    ),
  };
}

function getQuizStatus(quiz: Quiz) {
  const ist = getISTDateTime();
  if (ist.date < quiz.scheduled_date) return "UPCOMING";
  if (ist.date > quiz.scheduled_date) return "ENDED";

  const currentMinutes = ist.hour * 60 + ist.minute;
  if (currentMinutes < 5 * 60) return "UPCOMING";
  if (currentMinutes >= 21 * 60) return "ENDED";
  return "LIVE";
}

function formatDate(
  value: string
) {
  const date = new Date(
    `${value}T12:00:00+05:30`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      timeZone:
        "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function StudentAvailableQuizzesPage() {
  const router =
    useRouter();

  const [
    quizzes,
    setQuizzes,
  ] = useState<Quiz[]>(
    []
  );

  const [
    attemptedQuizIds,
    setAttemptedQuizIds,
  ] = useState<
    Set<number>
  >(new Set());

  const [
    reattemptQuizIds,
    setReattemptQuizIds,
  ] = useState<
    Set<number>
  >(new Set());

  const [
    studentClass,
    setStudentClass,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [, setClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        let studentId:
          | number
          | null = null;

        /*
         * -----------------------------------------------------
         * FIND STUDENT ID
         * -----------------------------------------------------
         */

        const storedIdKeys = [
          "attendance_student_id",
          "studentId",
          "student_id",
        ];

        for (
          const key of
            storedIdKeys
        ) {
          const raw =
            localStorage.getItem(
              key
            );

          const id =
            Number(raw);

          if (
            Number.isInteger(
              id
            ) &&
            id > 0
          ) {
            studentId = id;
            break;
          }
        }

        const username =
          localStorage.getItem(
            "student_username"
          );

        let student: StudentCycle | null = null;

        /*
         * -----------------------------------------------------
         * LOAD BY USERNAME
         * -----------------------------------------------------
         */

        if (username) {
          const {
            data,
            error:
              usernameError,
          } =
            await supabase
              .from(
                "students"
              )
              .select(
                "id,class_name,admission_date,admission_history,is_active"
              )
              .eq(
                "student_username",
                username
              )
              .maybeSingle();

          if (
            usernameError
          ) {
            throw new Error(
              usernameError.message
            );
          }

          if (data) {
            student =
              data;

            studentId =
              Number(
                data.id
              );
          }
        }

        /*
         * -----------------------------------------------------
         * FALLBACK: LOAD BY STUDENT ID
         * -----------------------------------------------------
         */

        if (
          !student &&
          studentId
        ) {
          const {
            data,
            error:
              studentError,
          } =
            await supabase
              .from(
                "students"
              )
              .select(
                "id,class_name,admission_date,admission_history,is_active"
              )
              .eq(
                "id",
                studentId
              )
              .maybeSingle();

          if (
            studentError
          ) {
            throw new Error(
              studentError.message
            );
          }

          student =
            data;
        }

        if (!student) {
          throw new Error(
            "Student login information not found."
          );
        }

        setStudentClass(
          student.class_name ||
            ""
        );

        /*
         * -----------------------------------------------------
         * LOAD ONLY PUBLISHED QUIZZES
         * -----------------------------------------------------
         */

        const {
          data: quizData,
          error: quizError,
        } =
          await supabase
            .from(
              "quiz_tests"
            )
            .select("*")
            .eq(
              "is_published",
              true
            )
            .order(
              "scheduled_date",
              {
                ascending:
                  true,
              }
            )
            .order(
              "scheduled_time",
              {
                ascending:
                  true,
              }
            );

        if (
          quizError
        ) {
          throw new Error(
            quizError.message
          );
        }

        /*
         * -----------------------------------------------------
         * FILTER BY STUDENT CLASS
         * -----------------------------------------------------
         */

        const matchingQuizzes =
          (
            (quizData || []) as Quiz[]
          ).filter(
            (quiz) =>
              quizBelongsToStudent(
                quiz,
                student.class_name ||
                  ""
              ) && student.is_active !== false && isStudentEligibleForDate(student.admission_date, student.admission_history, quiz.scheduled_date, student.is_active)
          );


        let visibleQuizzes = matchingQuizzes;

        setQuizzes(visibleQuizzes);



        /*
         * -----------------------------------------------------
         * LOAD STUDENT ATTEMPTS
         * -----------------------------------------------------
         */

        if (studentId) {
          const {
            data: results,
            error:
              resultsError,
          } =
            await supabase
              .from(
                "quiz_results"
              )
              .select(
                "quiz_id,result_status,submitted_at"
              )
              .eq(
                "student_id",
                studentId
              );

          if (
            resultsError
          ) {
            throw new Error(
              resultsError.message
            );
          }

          setAttemptedQuizIds(
            new Set(
              (
                results ||
                []
              )
                .filter((row) => {
                  const status = String(row.result_status || "").trim().toUpperCase();
                  return Boolean(row.submitted_at) || ["PASS", "PASSED", "FAIL", "FAILED", "SUBMITTED", "COMPLETED"].includes(status);
                })
                .map(
                  (row) => Number(row.quiz_id)
              )
            )
          );

          /*
           * ---------------------------------------------------
           * LOAD TEACHER-AUTHORIZED RE-ATTEMPTS
           * ---------------------------------------------------
           *
           * Active unused permissions returned by the API
           * are stored in reattemptQuizIds.
           *
           * These permissions intentionally override the
           * normal quiz date/time availability on this page.
           */

          try {
            const response =
              await fetch(
                `/api/quiz-tests/reattempt?studentId=${studentId}`,
                {
                  method:
                    "GET",
                  cache:
                    "no-store",
                }
              );

            if (
              response.ok
            ) {
              const data =
                await response.json();

              const ids =
                Array.isArray(
                  data?.quizIds
                )
                  ? data.quizIds
                      .map(
                        (
                          id: unknown
                        ) =>
                          Number(
                            id
                          )
                      )
                      .filter(
                        (
                          id: number
                        ) =>
                          Number.isInteger(
                            id
                          ) &&
                          id > 0
                      )
                  : [];

              const permissionIds = new Set<number>(ids);
              setReattemptQuizIds(permissionIds);

              if (ids.length > 0) {
                const { data: authorizedQuizRows, error: authorizedQuizError } =
                  await supabase
                    .from("quiz_tests")
                    .select("*")
                    .in("id", ids);

                if (!authorizedQuizError && authorizedQuizRows) {
                  const byId = new Map<number, Quiz>();
                  visibleQuizzes.forEach((quiz) => byId.set(Number(quiz.id), quiz));
                  (authorizedQuizRows as Quiz[])
                    .filter((quiz) => quiz.is_published && student.is_active !== false && isStudentEligibleForDate(student.admission_date, student.admission_history, quiz.scheduled_date, student.is_active))
                    .forEach((quiz) => byId.set(Number(quiz.id), quiz));
                  visibleQuizzes = Array.from(byId.values());
                  setQuizzes(visibleQuizzes);
                }
              }
            } else {
              console.error(
                "Unable to load re-attempt permissions."
              );

              setReattemptQuizIds(
                new Set()
              );
            }
          } catch (
            permissionError
          ) {
            console.error(
              "Unable to load re-attempt permissions:",
              permissionError
            );

            setReattemptQuizIds(
              new Set()
            );
          }
        }
      } catch (
        loadError
      ) {
        console.error(
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load quizzes."
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    load();
  }, []);

  const pendingQuizzes = quizzes.filter((quiz) => {
    const status = getQuizStatus(quiz);
    const attempted = attemptedQuizIds.has(quiz.id);
    const reattempt = reattemptQuizIds.has(quiz.id);
    return reattempt || (!attempted && status === "LIVE");
  });

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <main className="student-available-page">
        <div className="available-loading-state">
          <div className="available-loading-spinner" />
          <p>Preparing your quiz list…</p>
        </div>
        <AvailableQuizStyles />
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <main className="student-available-page">
        <div className="available-error-card">
          <div className="available-error-icon">!</div>
          <p className="available-eyebrow">RACER ACADEMY · QUIZ CENTER</p>
          <h1>We couldn’t load your quizzes</h1>
          <p className="available-error-copy">{error}</p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/quiz-tests"
              )
            }
            className="available-secondary-button"
          >
            <span aria-hidden="true">←</span> Back to dashboard
          </button>
        </div>
        <AvailableQuizStyles />
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <main className="student-available-page">
      <div className="available-shell">
        <header className="available-topbar">
          <div className="available-brand">
            <span className="available-brand-mark" aria-hidden="true">R</span>
            <span><strong>RACER</strong><small>ACADEMY</small></span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/student/quiz-tests")}
            className="available-back-button"
          >
            <span aria-hidden="true">←</span> Dashboard
          </button>
        </header>

        <section className="available-hero">
          <div className="available-hero-copy">
            <p className="available-eyebrow"><span /> YOUR QUIZ CENTER</p>
            <h1>Available quizzes</h1>
            <p className="available-hero-subtitle">Your next challenge is ready. Pick a quiz and give it your best.</p>
          </div>
          <div className="available-hero-count">
            <strong>{String(pendingQuizzes.length).padStart(2, "0")}</strong>
            <span>READY<br />TO ATTEMPT</span>
          </div>
          <div className="available-hero-orbit available-hero-orbit-one" aria-hidden="true" />
          <div className="available-hero-orbit available-hero-orbit-two" aria-hidden="true" />
        </section>

        <div className="available-context-row">
          <div className="available-class-chip">
            <span className="available-context-icon" aria-hidden="true">⌂</span>
            <span><small>YOUR CLASS</small><strong>Class {normalizeClass(studentClass) || "—"}</strong></span>
          </div>
          <div className="available-live-summary">
            <span className="available-live-dot" />
            {pendingQuizzes.length} {pendingQuizzes.length === 1 ? "quiz" : "quizzes"} available now
          </div>
        </div>

        {pendingQuizzes.length === 0 ? (
          <section className="available-empty-state">
            <div className="available-empty-art" aria-hidden="true"><span>✓</span></div>
            <p className="available-eyebrow">YOU’RE ALL CAUGHT UP</p>
            <h2>No quizzes to take right now</h2>
            <p>New quizzes and teacher-approved re-attempts will appear here as soon as they’re ready.</p>
            <button type="button" className="available-secondary-button" onClick={() => router.push("/student/quiz-tests")}>
              Back to quiz dashboard <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : (
          <section className="available-quiz-grid" aria-label="Quizzes ready to attempt">
            {pendingQuizzes.map((quiz) => {
              const attempted = attemptedQuizIds.has(quiz.id);
              const hasReattemptPermission = reattemptQuizIds.has(quiz.id);
              const status = getQuizStatus(quiz);

              return (
                <article key={quiz.id} className="available-quiz-card">
                  <div className="available-card-topline">
                    <span className={`available-quiz-icon ${hasReattemptPermission ? "is-retry" : ""}`} aria-hidden="true">
                      {hasReattemptPermission ? "↻" : "✦"}
                    </span>
                    <span className={`available-status ${hasReattemptPermission ? "is-retry" : "is-live"}`}>
                      <span />{hasReattemptPermission ? "TEACHER RE-ATTEMPT" : status === "LIVE" ? "LIVE NOW" : status}
                    </span>
                  </div>

                  <h2>{quiz.title}</h2>
                  {quiz.description && <p className="available-quiz-description">{quiz.description}</p>}

                  <div className="available-quiz-meta">
                    <div><small>DATE</small><strong>{formatDate(quiz.scheduled_date)}</strong></div>
                    <div><small>AVAILABLE</small><strong>5:00 AM – 9:00 PM IST</strong></div>
                    <div><small>DURATION</small><strong>{quiz.duration_minutes} min</strong></div>
                    <div><small>PASS MARK</small><strong>{quiz.pass_percentage}%</strong></div>
                  </div>

                  <div className="available-card-actions">
                    {hasReattemptPermission && attempted && (
                      <button type="button" className="available-result-button" onClick={() => router.push(`/student/quiz-tests/results?quizId=${quiz.id}`)}>
                        View result
                      </button>
                    )}
                    <button
                      type="button"
                      className="available-start-button"
                      onClick={() => router.push(`/student/quiz-tests/attempt?quizId=${quiz.id}${hasReattemptPermission ? "&reattempt=true" : ""}`)}
                    >
                      {hasReattemptPermission ? "Start re-attempt" : "Start quiz"}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
      <AvailableQuizStyles />
    </main>
  );
}

function AvailableQuizStyles() {
  return (
    <style jsx global>{`
      .student-available-page {
        min-height: calc(100vh - 80px);
        width: 100%;
        padding: clamp(16px, 3vw, 34px);
        box-sizing: border-box;
        background: radial-gradient(ellipse at 8% 3%, #e6f1ff 0, transparent 28%), radial-gradient(ellipse at 92% 14%, #e9fbf5 0, transparent 23%), #f4f7fb;
        color: #142d4e;
        font-family: Arial, Helvetica, sans-serif;
      }
      .available-shell { width: 100%; max-width: 1240px; margin: 0 auto; }
      .available-topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; }
      .available-brand { display: flex; align-items: center; gap: 10px; color: #183b65; }
      .available-brand-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 13px; background: linear-gradient(145deg, #1876d2, #0f4e91); color: white; font-size: 18px; font-weight: 950; box-shadow: 0 6px 14px rgba(20,89,154,.2); }
      .available-brand strong, .available-brand small { display: block; letter-spacing: .14em; }
      .available-brand strong { font-size: 12px; font-weight: 950; }
      .available-brand small { margin-top: 2px; color: #8294aa; font-size: 8px; font-weight: 900; }
      .available-back-button, .available-secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 42px; padding: 0 15px; border: 1px solid #d9e4f0; border-radius: 12px; background: #fff; color: #315274; font-size: 12px; font-weight: 850; cursor: pointer; box-shadow: 0 4px 12px rgba(28,54,91,.04); transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
      .available-back-button:hover, .available-secondary-button:hover { transform: translateY(-1px); border-color: #a9c7e8; box-shadow: 0 7px 18px rgba(28,54,91,.08); }
      .available-hero { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 210px; padding: clamp(24px, 4vw, 42px); border: 1px solid #d7e7f5; border-radius: 27px; background: linear-gradient(112deg, #fff 4%, #f1f8ff 61%, #eaf6ff 100%); box-shadow: 0 15px 42px rgba(31,77,122,.08); }
      .available-hero-copy, .available-hero-count { position: relative; z-index: 1; }
      .available-eyebrow { display: flex; align-items: center; gap: 8px; margin: 0; color: #4580b9; font-size: 9px; font-weight: 950; letter-spacing: .17em; }
      .available-eyebrow > span { width: 7px; height: 7px; border-radius: 50%; background: #20b981; box-shadow: 0 0 0 4px rgba(32,185,129,.13); }
      .available-hero h1 { margin: 13px 0 0; color: #17365f; font-size: clamp(30px, 4.2vw, 46px); line-height: 1.04; font-weight: 950; letter-spacing: -.045em; }
      .available-hero-subtitle { max-width: 540px; margin: 10px 0 0; color: #667b94; font-size: 14px; line-height: 1.6; }
      .available-hero-count { display: flex; align-items: center; gap: 12px; padding: 14px 17px; border: 1px solid #d5e8f8; border-radius: 19px; background: rgba(255,255,255,.82); box-shadow: 0 8px 20px rgba(40,93,144,.07); }
      .available-hero-count strong { color: #1670c2; font-size: 43px; line-height: 1; font-weight: 950; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
      .available-hero-count span { color: #63809c; font-size: 8px; line-height: 1.45; font-weight: 950; letter-spacing: .13em; }
      .available-hero-orbit { position: absolute; right: 20%; top: -94px; width: 290px; height: 290px; border: 1px solid rgba(90,157,209,.13); border-radius: 50%; }
      .available-hero-orbit-two { right: 14%; top: -62px; width: 225px; height: 225px; border-color: rgba(90,157,209,.12); }
      .available-context-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 19px 2px 15px; }
      .available-class-chip { display: flex; align-items: center; gap: 10px; }
      .available-context-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: #e5effa; color: #3479b8; font-size: 16px; font-weight: 900; }
      .available-class-chip small, .available-class-chip strong { display: block; }
      .available-class-chip small { color: #8495a9; font-size: 8px; font-weight: 900; letter-spacing: .12em; }
      .available-class-chip strong { margin-top: 2px; color: #34516f; font-size: 12px; font-weight: 900; }
      .available-live-summary { display: flex; align-items: center; gap: 8px; color: #44715f; font-size: 11px; font-weight: 850; }
      .available-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #19b980; box-shadow: 0 0 0 4px rgba(25,185,128,.12); }
      .available-quiz-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .available-quiz-card { display: flex; flex-direction: column; min-width: 0; padding: 21px; border: 1px solid #e0e8f0; border-radius: 21px; background: linear-gradient(180deg, #fff, #fcfdff); box-shadow: 0 8px 23px rgba(27,56,91,.055); transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
      .available-quiz-card:hover { transform: translateY(-3px); border-color: #bcd6ee; box-shadow: 0 15px 30px rgba(27,76,125,.1); }
      .available-card-topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .available-quiz-icon { display: grid; place-items: center; width: 41px; height: 41px; border-radius: 13px; background: linear-gradient(145deg, #eaf4ff, #dcecff); color: #2475c1; font-size: 21px; font-weight: 900; }
      .available-quiz-icon.is-retry { background: linear-gradient(145deg, #f5ecff, #e9ddff); color: #7648c7; }
      .available-status { display: inline-flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid #d3f3e4; border-radius: 999px; background: #effbf5; color: #138258; font-size: 8px; font-weight: 950; letter-spacing: .07em; white-space: nowrap; }
      .available-status > span { width: 6px; height: 6px; border-radius: 50%; background: #18ad76; }
      .available-status.is-retry { border-color: #e7dcff; background: #f7f2ff; color: #7042b4; }
      .available-status.is-retry > span { background: #8657ce; }
      .available-quiz-card h2 { margin: 17px 0 0; color: #183654; font-size: 18px; line-height: 1.28; font-weight: 950; letter-spacing: -.02em; overflow-wrap: anywhere; }
      .available-quiz-description { display: -webkit-box; overflow: hidden; min-height: 40px; margin: 7px 0 0; color: #718198; font-size: 11px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
      .available-quiz-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 17px; }
      .available-quiz-meta > div { min-width: 0; padding: 10px 11px; border: 1px solid #edf1f6; border-radius: 12px; background: #f8fafd; }
      .available-quiz-meta small { display: block; color: #8999ac; font-size: 7px; font-weight: 900; letter-spacing: .1em; }
      .available-quiz-meta strong { display: block; overflow: hidden; margin-top: 4px; color: #385775; font-size: 10px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
      .available-card-actions { display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding-top: 17px; }
      .available-start-button, .available-result-button { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-height: 45px; padding: 0 14px; border: 0; border-radius: 12px; color: #fff; font-size: 11px; font-weight: 900; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
      .available-start-button { background: linear-gradient(100deg, #176bc0, #2385d5); box-shadow: 0 7px 16px rgba(35,111,184,.18); }
      .available-start-button:hover, .available-result-button:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(35,111,184,.24); }
      .available-start-button span { font-size: 17px; }
      .available-result-button { min-height: 38px; background: #eaf7f0; color: #188157; }
      .available-empty-state, .available-error-card { max-width: 680px; margin: 28px auto; padding: 40px 26px; border: 1px solid #e0e9f2; border-radius: 24px; background: #fff; text-align: center; box-shadow: 0 12px 30px rgba(28,54,91,.06); }
      .available-empty-art { display: grid; place-items: center; width: 74px; height: 74px; margin: 0 auto 19px; border-radius: 24px; background: linear-gradient(145deg, #e7f7ee, #e3f0ff); color: #28936b; font-size: 30px; font-weight: 900; }
      .available-empty-state .available-eyebrow, .available-error-card .available-eyebrow { justify-content: center; }
      .available-empty-state h2, .available-error-card h1 { margin: 10px 0 0; color: #183654; font-size: 23px; font-weight: 950; }
      .available-empty-state > p:not(.available-eyebrow), .available-error-copy { max-width: 450px; margin: 9px auto 19px; color: #708198; font-size: 12px; line-height: 1.65; }
      .available-empty-state .available-secondary-button { margin-top: 8px; }
      .available-error-icon { display: grid; place-items: center; width: 42px; height: 42px; margin: 0 auto 15px; border-radius: 14px; background: #fff1f0; color: #c14747; font-size: 21px; font-weight: 950; }
      .available-loading-state { display: grid; min-height: 55vh; place-content: center; justify-items: center; gap: 14px; color: #49637d; font-size: 12px; font-weight: 850; }
      .available-loading-spinner { width: 36px; height: 36px; border: 3px solid #dce8f3; border-top-color: #2377c6; border-radius: 50%; animation: availableSpin .8s linear infinite; }
      @keyframes availableSpin { to { transform: rotate(360deg); } }
      @media (max-width: 1050px) { .available-quiz-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 640px) {
        .student-available-page { padding: 14px 12px 24px; }
        .available-topbar { margin-bottom: 14px; }
        .available-brand-mark { width: 34px; height: 34px; }
        .available-back-button { min-height: 38px; padding: 0 11px; font-size: 10px; }
        .available-hero { min-height: auto; align-items: flex-start; padding: 22px 18px; border-radius: 21px; }
        .available-hero h1 { font-size: 31px; }
        .available-hero-subtitle { max-width: 270px; font-size: 11px; }
        .available-hero-count { flex-direction: column; gap: 5px; padding: 10px 12px; border-radius: 15px; }
        .available-hero-count strong { font-size: 30px; }
        .available-hero-count span { text-align: center; font-size: 7px; }
        .available-hero-orbit { right: -95px; top: -90px; }
        .available-hero-orbit-two { right: -57px; top: -55px; }
        .available-context-row { align-items: flex-start; margin: 15px 1px 12px; }
        .available-live-summary { justify-content: flex-end; padding-top: 8px; font-size: 9px; text-align: right; }
        .available-quiz-grid { grid-template-columns: minmax(0, 1fr); gap: 11px; }
        .available-quiz-card { padding: 17px; border-radius: 18px; }
        .available-quiz-card h2 { margin-top: 13px; font-size: 17px; }
        .available-quiz-description { min-height: 0; }
        .available-empty-state, .available-error-card { margin: 18px 0; padding: 31px 19px; border-radius: 20px; }
      }
      @media (prefers-reduced-motion: reduce) { .student-available-page *, .student-available-page *::before, .student-available-page *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
    `}</style>
  );
}





