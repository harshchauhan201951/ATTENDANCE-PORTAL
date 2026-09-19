"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Timetable = {
  id: number;
  teacher_id: string;
  teacher_name: string;
  class_names: string[];
  day_of_week: string;
  subject: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TeacherTimetablePage() {
  const router = useRouter();

  const [entries, setEntries] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState("All");

  const loadTimetable = useCallback(async () => {
    setLoading(true);

    try {
      const teacherId =
        localStorage.getItem("attendance_teacher_id") ||
        localStorage.getItem("teacher_username") ||
        localStorage.getItem("teacherUsername");

      if (!teacherId) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("timetables")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Timetable load error:", error);
        alert("Unable to load timetable.");
        return;
      }

      setEntries(data || []);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while loading timetable.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  async function deleteTimetable(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this timetable entry?"
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("timetables")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(error);
        alert("Unable to delete timetable entry.");
        return;
      }

      setEntries((current) => current.filter((item) => item.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const visibleEntries =
    selectedDay === "All"
      ? entries
      : entries.filter((item) => item.day_of_week === selectedDay);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* COMMON ACTION BAR */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={loadTimetable}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Refresh
          </button>

          <button
            onClick={() => router.back()}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Back
          </button>

          <button
            onClick={() => router.push("/teacher")}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              router.replace("/");
            }}
            className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-900/50"
          >
            Logout
          </button>
        </div>

        {/* HEADER */}
        <section className="mb-7 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                RACER ACADEMY
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Teacher Timetable
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Create and manage your class-wise timetable. Multiple classes
                can be assigned to the same timetable entry.
              </p>
            </div>

            <button
              onClick={() => router.push("/teacher/timetable/create")}
              className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              + Create Timetable
            </button>
          </div>
        </section>

        {/* DAY FILTER */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {["All", ...DAYS].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedDay === day
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            Loading timetable...
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/70 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-950 text-3xl">
              T
            </div>

            <h2 className="text-xl font-bold text-white">
              No timetable entries
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Create your first timetable entry and assign it to one or more
              classes.
            </p>

            <button
              onClick={() => router.push("/teacher/timetable/create")}
              className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300"
            >
              Create First Timetable
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleEntries.map((entry) => (
              <article
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
              >
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
                        {entry.day_of_week}
                      </span>

                      <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
                        {formatTime(entry.start_time)} -{" "}
                        {formatTime(entry.end_time)}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white">
                      {entry.subject}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      Teacher:{" "}
                      <span className="font-semibold text-slate-200">
                        {entry.teacher_name}
                      </span>
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.class_names.map((className) => (
                        <span
                          key={className}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200"
                        >
                          Class {className}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/teacher/timetable/create?id=${entry.id}`
                        )
                      }
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteTimetable(entry.id)}
                      disabled={deletingId === entry.id}
                      className="rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-2.5 text-sm font-bold text-red-300 hover:bg-red-950/60 disabled:opacity-50"
                    >
                      {deletingId === entry.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}