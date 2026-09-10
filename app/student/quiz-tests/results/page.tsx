"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type QuizTest = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  subject: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
};

type QuizResult = {
  id?: number;
  quiz_id: number;
  student_id: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  result_status: "PASS" | "FAIL" | string;
  started_at: string | null;
  submitted_at: string | null;
  submission_type: string | null;
  created_at?: string | null;
};

type ResultListItem = QuizResult & {
  quiz: QuizTest | null;
};

function normalizeClass(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/^CLASS\s+/i, "")
    .replace(/\s+/g, " ");
}

function quizMatchesStudentClass(
  quiz: QuizTest,
  studentClass: string
): boolean {
  const normalizedStudentClass =
    normalizeClass(studentClass);

  if (!normalizedStudentClass) {
    return false;
  }

  const targetClasses = Array.isArray(
    quiz.target_classes
  )
    ? quiz.target_classes
        .filter(
          (value): value is string =>
            typeof value === "string"
        )
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targetClasses.length > 0) {
    return targetClasses.includes(
      normalizedStudentClass
    );
  }

  return (
    normalizeClass(quiz.class_name) ===
    normalizedStudentClass
  );
}

function formatNumber(
  value: number | null | undefined
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

  const numericValue = Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return "0";
  }

  return Number.isInteger(
    numericValue
  )
    ? String(numericValue)
    : numericValue.toFixed(2);
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const [
    hourText,
    minute,
  ] = value.split(":");

  let hour =
    Number(hourText);

  if (
    !Number.isFinite(
      hour
    )
  ) {
    return value;
  }

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${
    minute || "00"
  } ${period}`;
}

function StudentResultsContent() {
  const searchParams =
    useSearchParams();

  const router =
    useRouter();

  const quizIdParam =
    searchParams.get(
      "quizId"
    );

  const quizId = useMemo(() => {
    const id =
      Number(quizIdParam);

    if (
      !Number.isFinite(id) ||
      id <= 0
    ) {
      return null;
    }

    return id;
  }, [quizIdParam]);

  const [quiz, setQuiz] =
    useState<QuizTest | null>(
      null
    );

  const [result, setResult] =
    useState<QuizResult | null>(
      null
    );

  const [resultList, setResultList] =
    useState<ResultListItem[]>(
      []
    );

  const [studentName, setStudentName] =
    useState("");

  const [studentClass, setStudentClass] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const listMode =
    !quizId;

  useEffect(() => {
    async function loadStudentAndResults() {
      setLoading(true);
      setError("");

      try {
        /*
         * ---------------------------------------
         * FIND LOGGED-IN STUDENT
         * ---------------------------------------
         */

        const storedName =
          localStorage.getItem(
            "attendance_student_name"
          ) ||
          localStorage.getItem(
            "studentName"
          ) ||
          localStorage.getItem(
            "student_name"
          ) ||
          "";

        const storedUsername =
          localStorage.getItem(
            "student_username"
          ) ||
          localStorage.getItem(
            "studentUsername"
          ) ||
          "";

        const storedIdRaw =
          localStorage.getItem(
            "attendance_student_id"
          ) ||
          localStorage.getItem(
            "studentId"
          ) ||
          localStorage.getItem(
            "student_id"
          );

        const parsedStoredId =
          Number(storedIdRaw);

        let currentStudentId:
          | number
          | null =
          Number.isFinite(
            parsedStoredId
          ) &&
          parsedStoredId > 0
            ? parsedStoredId
            : null;

        let currentStudentName =
          storedName;

        let currentStudentClass =
          "";

        /*
         * First try student ID.
         */

        if (
          currentStudentId
        ) {
          const {
            data: studentById,
            error:
              studentByIdError,
          } = await supabase
            .from("students")
            .select(
              "id,student_name,student_username,class_name"
            )
            .eq(
              "id",
              currentStudentId
            )
            .maybeSingle();

          if (
            studentByIdError &&
            studentByIdError.code !==
              "PGRST116"
          ) {
            console.error(
              "Student ID lookup error:",
              studentByIdError
            );
          }

          if (
            studentById
          ) {
            currentStudentId =
              Number(
                studentById.id
              );

            currentStudentName =
              studentById.student_name ||
              currentStudentName;

            currentStudentClass =
              normalizeClass(
                studentById.class_name
              );
          }
        }

        /*
         * If ID was not available,
         * try username.
         */

        if (
          !currentStudentId &&
          storedUsername
        ) {
          const {
            data:
              studentByUsername,
            error:
              studentByUsernameError,
          } = await supabase
            .from("students")
            .select(
              "id,student_name,student_username,class_name"
            )
            .eq(
              "student_username",
              storedUsername
            )
            .maybeSingle();

          if (
            studentByUsernameError
          ) {
            console.error(
              "Student username lookup error:",
              studentByUsernameError
            );
          }

          if (
            studentByUsername
          ) {
            currentStudentId =
              Number(
                studentByUsername.id
              );

            currentStudentName =
              studentByUsername.student_name ||
              currentStudentName;

            currentStudentClass =
              normalizeClass(
                studentByUsername.class_name
              );
          }
        }

        /*
         * If ID was found but class was not,
         * try username once more.
         */

        if (
          currentStudentId &&
          !currentStudentClass &&
          storedUsername
        ) {
          const {
            data:
              studentByUsername,
          } = await supabase
            .from("students")
            .select(
              "id,student_name,student_username,class_name"
            )
            .eq(
              "student_username",
              storedUsername
            )
            .maybeSingle();

          if (
            studentByUsername
          ) {
            currentStudentName =
              studentByUsername.student_name ||
              currentStudentName;

            currentStudentClass =
              normalizeClass(
                studentByUsername.class_name
              );
          }
        }

        if (
          !currentStudentId
        ) {
          throw new Error(
            "Student login information not found. Please login again."
          );
        }

        setStudentName(
          currentStudentName
        );

        setStudentClass(
          currentStudentClass
        );

        /*
         * =======================================
         * DETAILED RESULT MODE
         * /results?quizId=123
         * =======================================
         */

        if (quizId) {
          /*
           * Load quiz.
           */

          const {
            data: quizData,
            error: quizError,
          } = await supabase
            .from("quiz_tests")
            .select("*")
            .eq(
              "id",
              quizId
            )
            .maybeSingle();

          if (
            quizError
          ) {
            console.error(
              "Quiz loading error:",
              quizError
            );

            throw new Error(
              quizError.message
            );
          }

          if (!quizData) {
            throw new Error(
              "Quiz not found."
            );
          }

          setQuiz(
            quizData as QuizTest
          );

          /*
           * Load student's actual result.
           */

          let resultData:
            | QuizResult
            | null =
            null;

          const {
            data:
              databaseResult,
            error:
              resultError,
          } = await supabase
            .from("quiz_results")
            .select("*")
            .eq(
              "quiz_id",
              quizId
            )
            .eq(
              "student_id",
              currentStudentId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

          if (
            resultError
          ) {
            console.error(
              "Result loading error:",
              resultError
            );
          } else if (
            databaseResult
          ) {
            resultData =
              databaseResult as QuizResult;
          }

          /*
           * Session storage fallback.
           */

          if (!resultData) {
            try {
              const localResult =
                sessionStorage.getItem(
                  `quiz-result-${quizId}`
                );

              if (
                localResult
              ) {
                const parsedLocalResult =
                  JSON.parse(
                    localResult
                  ) as QuizResult;

                if (
                  parsedLocalResult &&
                  Number(
                    parsedLocalResult.quiz_id
                  ) === quizId &&
                  Number(
                    parsedLocalResult.student_id
                  ) ===
                    currentStudentId
                ) {
                  resultData =
                    parsedLocalResult;
                }
              }
            } catch (
              storageError
            ) {
              console.error(
                "Session result error:",
                storageError
              );
            }
          }

          if (
            !resultData
          ) {
            throw new Error(
              "Result not found. Please make sure the quiz was submitted successfully."
            );
          }

          setResult(
            resultData
          );

          return;
        }

        /*
         * =======================================
         * ALL RESULTS LIST MODE
         * /results
         * =======================================
         */

        const {
          data: studentResults,
          error:
            resultsError,
        } = await supabase
          .from("quiz_results")
          .select("*")
          .eq(
            "student_id",
            currentStudentId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (
          resultsError
        ) {
          console.error(
            "Results list loading error:",
            resultsError
          );

          throw new Error(
            resultsError.message
          );
        }

        const rawResults =
          (studentResults ||
            []) as QuizResult[];

        if (
          rawResults.length ===
          0
        ) {
          setResultList(
            []
          );

          return;
        }

        /*
         * Get all quiz IDs from student's results.
         */

        const quizIds =
          Array.from(
            new Set(
              rawResults
                .map(
                  (item) =>
                    Number(
                      item.quiz_id
                    )
                )
                .filter(
                  (id) =>
                    Number.isFinite(
                      id
                    ) &&
                    id > 0
                )
            )
          );

        if (
          quizIds.length ===
          0
        ) {
          setResultList(
            []
          );

          return;
        }

        /*
         * Load corresponding quizzes.
         */

        const {
          data: quizData,
          error:
            quizListError,
        } = await supabase
          .from("quiz_tests")
          .select("*")
          .in(
            "id",
            quizIds
          );

        if (
          quizListError
        ) {
          console.error(
            "Quiz list loading error:",
            quizListError
          );

          throw new Error(
            quizListError.message
          );
        }

        const quizMap =
          new Map<
            number,
            QuizTest
          >();

        (
          (quizData ||
            []) as QuizTest[]
        ).forEach(
          (quizItem) => {
            quizMap.set(
              Number(
                quizItem.id
              ),
              quizItem
            );
          }
        );

        /*
         * Combine results + quiz information.
         *
         * Only class-matching quizzes are displayed
         * when class information is available.
         */

        const combinedResults =
          rawResults
            .map(
              (item) => ({
                ...item,
                quiz:
                  quizMap.get(
                    Number(
                      item.quiz_id
                    )
                  ) ||
                  null,
              })
            )
            .filter(
              (item) => {
                if (
                  item.quiz &&
                  currentStudentClass
                ) {
                  return quizMatchesStudentClass(
                    item.quiz,
                    currentStudentClass
                  );
                }

                return true;
              }
            );

        setResultList(
          combinedResults
        );
      } catch (
        loadError
      ) {
        console.error(
          "Student results page error:",
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load quiz results."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudentAndResults();
  }, [quizId]);

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">

            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <h1 className="text-xl font-black">
              Loading Results...
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Please wait while we load your quiz results.
            </p>

          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================
   * ERROR
   * ==========================================
   */

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">

        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10">

          <div className="mx-auto max-w-2xl">

            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-7 text-center shadow-2xl">

              <div className="text-5xl">
                ERROR
              </div>

              <h1 className="mt-4 text-2xl font-black">
                Unable to Load Results
              </h1>

              <p className="mt-3 text-sm leading-6 text-red-200">
                {error}
              </p>

              {quizId && (
                <p className="mt-3 text-xs text-slate-400">
                  Quiz ID:{" "}
                  <strong className="text-white">
                    {quizId}
                  </strong>
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests/results"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-black transition hover:bg-white/10"
                >
                  View All Results
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests"
                    )
                  }
                  className="rounded-xl bg-indigo-600 px-6 py-3 font-black transition hover:bg-indigo-500"
                >
                  ← Quiz Tests
                </button>

              </div>

            </div>

          </div>

        </div>

      </main>
    );
  }

  /*
   * ==========================================
   * ALL RESULTS LIST
   * ==========================================
   */

  if (listMode) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">

        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

          <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">

            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">

              <div>

                <h1 className="text-lg font-black sm:text-xl">
                  RACER ACADEMY
                </h1>

                <p className="text-xs text-slate-400">
                  QUIZ RESULTS
                  {studentClass
                    ? ` • CLASS ${studentClass}`
                    : ""}
                </p>

              </div>

              <button
                onClick={() =>
                  router.push(
                    "/student/quiz-tests"
                  )
                }
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
              >
                ← Quiz Tests
              </button>

            </div>

          </header>

          <div className="mx-auto max-w-6xl px-4 py-7 sm:py-10">

            <div className="mb-7">

              <p className="text-xs font-black tracking-[0.25em] text-indigo-400">
                PERFORMANCE
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                My Quiz Results
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Results of the quizzes you have already completed.
              </p>

              {studentName && (
                <p className="mt-2 text-sm text-slate-500">
                  Student:{" "}
                  <strong className="text-slate-300">
                    {studentName}
                  </strong>
                </p>
              )}

            </div>

            {resultList.length ===
            0 ? (

              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">

                <div className="text-5xl">
                  RESULTS
                </div>

                <h3 className="mt-5 text-xl font-black">
                  No Completed Quiz Results
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
                  You have not completed any quiz yet.
                  Once you submit a quiz, your result
                  will appear here automatically.
                </p>

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests"
                    )
                  }
                  className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black transition hover:bg-indigo-500"
                >
                  ← Go to Quiz Tests
                </button>

              </div>

            ) : (

              <div className="grid gap-5 md:grid-cols-2">

                {resultList.map(
                  (
                    item,
                    index
                  ) => {

                    const itemQuiz =
                      item.quiz;

                    const passed =
                      String(
                        item.result_status
                      ).toUpperCase() ===
                      "PASS";

                    const percentage =
                      Number(
                        item.percentage ||
                          0
                      );

                    return (
                      <div
                        key={
                          item.id ??
                          `${item.quiz_id}-${index}`
                        }
                        className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl"
                      >

                        {/* RESULT TOP */}

                        <div
                          className={`p-5 ${
                            passed
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-4">

                            <div className="min-w-0">

                              <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">
                                COMPLETED QUIZ
                              </p>

                              <h3 className="mt-2 text-xl font-black">
                                {itemQuiz?.title ||
                                  `Quiz #${item.quiz_id}`}
                              </h3>

                              {itemQuiz?.subject && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {
                                    itemQuiz.subject
                                  }
                                </p>
                              )}

                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                                passed
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {passed
                                ? "PASS"
                                : "FAIL"}
                            </span>

                          </div>

                          {/* SCORE AREA */}

                          <div className="mt-5 flex items-center gap-5">

                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-indigo-500/30 bg-slate-950/70">

                              <div className="text-center">

                                <div className="text-xl font-black">
                                  {formatNumber(
                                    percentage
                                  )}
                                  %
                                </div>

                                <div className="text-[9px] font-bold text-slate-500">
                                  SCORE
                                </div>

                              </div>

                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="grid grid-cols-2 gap-2">

                                <div className="rounded-xl bg-white/5 p-3">

                                  <p className="text-[9px] font-bold text-slate-500">
                                    OBTAINED
                                  </p>

                                  <p className="mt-1 text-lg font-black">
                                    {formatNumber(
                                      item.obtained_marks
                                    )}
                                  </p>

                                </div>

                                <div className="rounded-xl bg-white/5 p-3">

                                  <p className="text-[9px] font-bold text-slate-500">
                                    TOTAL
                                  </p>

                                  <p className="mt-1 text-lg font-black">
                                    {formatNumber(
                                      item.total_marks
                                    )}
                                  </p>

                                </div>

                              </div>

                            </div>

                          </div>

                        </div>

                        {/* RESULT DETAILS */}

                        <div className="p-5">

                          <div className="grid grid-cols-3 gap-2">

                            <div className="rounded-xl bg-emerald-500/10 p-3 text-center">

                              <div className="text-lg font-black text-emerald-300">
                                {
                                  item.correct_answers
                                }
                              </div>

                              <div className="text-[9px] font-bold text-emerald-200/60">
                                CORRECT
                              </div>

                            </div>

                            <div className="rounded-xl bg-red-500/10 p-3 text-center">

                              <div className="text-lg font-black text-red-300">
                                {
                                  item.wrong_answers
                                }
                              </div>

                              <div className="text-[9px] font-bold text-red-200/60">
                                WRONG
                              </div>

                            </div>

                            <div className="rounded-xl bg-amber-500/10 p-3 text-center">

                              <div className="text-lg font-black text-amber-300">
                                {
                                  item.unanswered
                                }
                              </div>

                              <div className="text-[9px] font-bold text-amber-200/60">
                                SKIPPED
                              </div>

                            </div>

                          </div>

                          {/* SUBMITTED */}

                          <div className="mt-4 rounded-xl bg-white/5 p-3">

                            <p className="text-[9px] font-bold text-slate-500">
                              SUBMITTED
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-300">
                              {formatDateTime(
                                item.submitted_at ||
                                  item.created_at ||
                                  null
                              )}
                            </p>

                          </div>

                          {/* VIEW FULL RESULT */}

                          <button
                            onClick={() =>
                              router.push(
                                `/student/quiz-tests/results?quizId=${item.quiz_id}`
                              )
                            }
                            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-black transition hover:bg-indigo-500"
                          >
                            VIEW FULL RESULT →
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            )}

            <div className="mt-8 text-center text-xs text-slate-500">
              RACER ACADEMY • Quiz Results
            </div>

          </div>

        </div>

      </main>
    );
  }

  /*
   * ==========================================
   * DETAILED RESULT
   * ==========================================
   */

  const isPassed =
    String(
      result?.result_status ||
        ""
    ).toUpperCase() ===
    "PASS";

  const percentage =
    Number(
      result?.percentage ||
        0
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

        {/* HEADER */}

        <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">

          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">

            <div>

              <h1 className="text-lg font-black sm:text-xl">
                RACER ACADEMY
              </h1>

              <p className="text-xs text-slate-400">
                QUIZ RESULT
              </p>

            </div>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              ← All Results
            </button>

          </div>

        </header>

        <div className="mx-auto max-w-5xl px-4 py-7 sm:py-10">

          {/* HERO */}

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">

            <div
              className={`p-6 text-center sm:p-10 ${
                isPassed
                  ? "bg-emerald-500/10"
                  : "bg-red-500/10"
              }`}
            >

              <div className="text-6xl">
                RESULT
              </div>

              <p className="mt-4 text-xs font-black tracking-[0.25em] text-slate-400">
                QUIZ COMPLETED
              </p>

              <h2 className="mt-2 text-2xl font-black sm:text-4xl">
                {quiz?.title ||
                  "Quiz Result"}
              </h2>

              <div className="mt-5 flex flex-wrap justify-center gap-2">

                {quiz?.class_name && (
                  <span className="rounded-full bg-indigo-500/20 px-4 py-2 text-xs font-black text-indigo-300">
                    CLASS{" "}
                    {normalizeClass(
                      quiz.class_name
                    )}
                  </span>
                )}

                {quiz?.subject && (
                  <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-black text-blue-300">
                    {quiz.subject}
                  </span>
                )}

              </div>

              {/* BIG PERCENTAGE */}

              <div className="mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-indigo-500/30 bg-slate-950/60 shadow-xl sm:h-52 sm:w-52">

                <div>

                  <div className="text-4xl font-black sm:text-5xl">
                    {formatNumber(
                      percentage
                    )}
                    %
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-400">
                    SCORE
                  </div>

                </div>

              </div>

              {/* PASS / FAIL */}

              <div className="mt-7">

                <span
                  className={`inline-flex rounded-full px-7 py-3 text-lg font-black ${
                    isPassed
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                      : "bg-red-500/20 text-red-300 ring-1 ring-red-400/30"
                  }`}
                >
                  {isPassed
                    ? "PASSED"
                    : "FAILED"}
                </span>

              </div>

              {studentName && (
                <p className="mt-5 text-sm text-slate-400">
                  Student:{" "}
                  <strong className="text-white">
                    {studentName}
                  </strong>
                </p>
              )}

            </div>

          </section>

          {/* QUESTION SUMMARY */}

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">

              <div className="text-3xl font-black">
                {formatNumber(
                  result?.total_questions
                )}
              </div>

              <div className="mt-1 text-xs font-bold text-slate-400">
                TOTAL QUESTIONS
              </div>

            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-center">

              <div className="text-3xl font-black text-emerald-300">
                {formatNumber(
                  result?.correct_answers
                )}
              </div>

              <div className="mt-1 text-xs font-bold text-emerald-200/70">
                CORRECT
              </div>

            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-center">

              <div className="text-3xl font-black text-red-300">
                {formatNumber(
                  result?.wrong_answers
                )}
              </div>

              <div className="mt-1 text-xs font-bold text-red-200/70">
                WRONG
              </div>

            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-center">

              <div className="text-3xl font-black text-amber-300">
                {formatNumber(
                  result?.unanswered
                )}
              </div>

              <div className="mt-1 text-xs font-bold text-amber-200/70">
                UNANSWERED
              </div>

            </div>

          </section>

          {/* MARKS SUMMARY */}

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">

            <h3 className="text-xl font-black">
              Marks Summary
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl bg-slate-900/80 p-5">

                <p className="text-xs font-bold text-slate-400">
                  TOTAL MARKS
                </p>

                <p className="mt-2 text-3xl font-black">
                  {formatNumber(
                    result?.total_marks
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-indigo-500/10 p-5">

                <p className="text-xs font-bold text-indigo-300">
                  OBTAINED MARKS
                </p>

                <p className="mt-2 text-3xl font-black text-indigo-300">
                  {formatNumber(
                    result?.obtained_marks
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-5">

                <p className="text-xs font-bold text-emerald-300">
                  PERCENTAGE
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {formatNumber(
                    percentage
                  )}
                  %
                </p>

              </div>

            </div>

            {/* PERFORMANCE BAR */}

            <div className="mt-6">

              <div className="mb-2 flex justify-between text-xs font-bold">

                <span className="text-slate-400">
                  Performance
                </span>

                <span className="text-white">
                  {formatNumber(
                    percentage
                  )}
                  %
                </span>

              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-800">

                <div
                  className={`h-full rounded-full transition-all ${
                    isPassed
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        percentage
                      )
                    )}%`,
                  }}
                />

              </div>

            </div>

          </section>

          {/* QUESTION PERFORMANCE */}

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">

            <h3 className="text-xl font-black">
              Question Performance
            </h3>

            <div className="mt-5 space-y-3">

              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 p-4">

                <div>

                  <p className="font-bold text-emerald-300">
                    Correct Answers
                  </p>

                  <p className="text-xs text-slate-400">
                    Questions answered correctly
                  </p>

                </div>

                <strong className="text-2xl text-emerald-300">
                  {
                    result?.correct_answers
                  }
                </strong>

              </div>

              <div className="flex items-center justify-between rounded-2xl bg-red-500/10 p-4">

                <div>

                  <p className="font-bold text-red-300">
                    Wrong Answers
                  </p>

                  <p className="text-xs text-slate-400">
                    Questions answered incorrectly
                  </p>

                </div>

                <strong className="text-2xl text-red-300">
                  {
                    result?.wrong_answers
                  }
                </strong>

              </div>

              <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 p-4">

                <div>

                  <p className="font-bold text-amber-300">
                    Unanswered
                  </p>

                  <p className="text-xs text-slate-400">
                    Questions left unanswered
                  </p>

                </div>

                <strong className="text-2xl text-amber-300">
                  {
                    result?.unanswered
                  }
                </strong>

              </div>

            </div>

          </section>

          {/* QUIZ INFORMATION */}

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">

            <h3 className="text-xl font-black">
              Quiz Information
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  SUBJECT
                </p>

                <p className="mt-1 font-black">
                  {quiz?.subject ||
                    "—"}
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  CLASS
                </p>

                <p className="mt-1 font-black">
                  {quiz?.class_name
                    ? `Class ${normalizeClass(
                        quiz.class_name
                      )}`
                    : "—"}
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  PASS PERCENTAGE
                </p>

                <p className="mt-1 font-black">
                  {formatNumber(
                    quiz?.pass_percentage
                  )}
                  %
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  DURATION
                </p>

                <p className="mt-1 font-black">
                  {quiz?.duration_minutes ||
                    30}{" "}
                  Minutes
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  SCHEDULED DATE
                </p>

                <p className="mt-1 font-black">
                  {formatDate(
                    quiz?.scheduled_date ||
                      null
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  START TIME
                </p>

                <p className="mt-1 font-black">
                  {formatTime(
                    quiz?.scheduled_time ||
                      null
                  )}
                </p>

              </div>

            </div>

          </section>

          {/* SUBMISSION DETAILS */}

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">

            <h3 className="text-xl font-black">
              Submission Details
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  STARTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {formatDateTime(
                    result?.started_at ||
                      null
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">

                <p className="text-xs font-bold text-slate-500">
                  SUBMITTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {formatDateTime(
                    result?.submitted_at ||
                      null
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4 sm:col-span-2">

                <p className="text-xs font-bold text-slate-500">
                  SUBMISSION TYPE
                </p>

                <p className="mt-1 text-sm font-bold uppercase">
                  {result?.submission_type ||
                    "MANUAL SUBMISSION"}
                </p>

              </div>

            </div>

          </section>

          {/* BUTTONS */}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black transition hover:bg-white/10"
            >
              ← All Results
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/history"
                )
              }
              className="rounded-2xl bg-indigo-600 px-5 py-4 font-black transition hover:bg-indigo-500"
            >
              View Quiz History →
            </button>

          </div>

          <div className="py-8 text-center text-xs text-slate-500">
            RACER ACADEMY • Quiz Result
          </div>

        </div>

      </div>

    </main>
  );
}

export default function StudentQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

          <div className="text-center">

            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <p className="font-bold">
              Loading Results...
            </p>

          </div>

        </main>
      }
    >
      <StudentResultsContent />
    </Suspense>
  );
}