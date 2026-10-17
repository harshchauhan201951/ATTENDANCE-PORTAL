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
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  is_holiday: boolean;
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
  "Sunday",
];

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

function formatTime(time: string | null) {
  if (!time) return "-";

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

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
  const [searchText, setSearchText] = useState("");

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
        .eq("teacher_id", teacherId);

      if (error) {
        console.error("Timetable load error:", error);
        alert("Unable to load timetable.");
        return;
      }

      const sortedEntries = ((data || []) as Timetable[]).sort(
        (a, b) => {
          const dayDifference =
            (DAY_ORDER[a.day_of_week] || 99) -
            (DAY_ORDER[b.day_of_week] || 99);

          if (dayDifference !== 0) {
            return dayDifference;
          }

          if (a.is_holiday && !b.is_holiday) return -1;
          if (!a.is_holiday && b.is_holiday) return 1;

          return (a.start_time || "").localeCompare(
            b.start_time || ""
          );
        }
      );

      setEntries(sortedEntries);
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

      setEntries((current) =>
        current.filter((item) => item.id !== id)
      );
    } finally {
      setDeletingId(null);
    }
  }

  const todayName = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(new Date());
  const visibleEntries = entries.filter((entry) => {
    const matchesDay = selectedDay === "All" || entry.day_of_week === selectedDay;
    const search = searchText.trim().toLowerCase();
    const searchableText = [
      entry.subject,
      entry.teacher_name,
      entry.day_of_week,
      ...(entry.class_names || []).map((name) => `class ${name}`),
      ...(entry.class_names || []),
      entry.is_holiday ? "holiday" : "",
    ].join(" ").toLowerCase();
    return matchesDay && (!search || searchableText.includes(search));
  });
  const getDayCount = (day: string) => day === "All"
    ? entries.length
    : entries.filter((entry) => entry.day_of_week === day).length;
  const activeDayCount = new Set(
    entries.filter((entry) => !entry.is_holiday).map((entry) => entry.day_of_week)
  ).size;
  const holidayCount = entries.filter((entry) => entry.is_holiday).length;

  return (
    <main data-racer-vip-module="timetable" className="min-h-screen bg-[#f5f7fc] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-28 -top-36 h-96 w-96 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Racer Academy · Academics</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Your weekly teaching plan</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadTimetable}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            ↻ Refresh
          </button>

          <button
            onClick={() => router.push("/teacher")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            ← Dashboard
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              router.replace("/");
            }}
            className="rounded-xl border border-rose-100 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-50"
          >
            Logout
          </button>
          </div>
        </div>

        <section className="relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-[0_24px_60px_rgba(79,70,229,0.22)] sm:p-8">
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[34px] border-white/10" />
          <div className="absolute right-36 top-24 h-20 w-20 rounded-full bg-cyan-300/20 blur-xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-50">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                {todayName === "Sunday" ? "Weekend overview" : `Today · ${todayName}`}
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Teacher Timetable</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
                Your classes, subjects and teaching hours—organized in one easy weekly view.
              </p>
            </div>
            <button
              onClick={() => router.push("/teacher/timetable/create")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              <span className="text-xl leading-none">+</span> Create timetable
            </button>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Scheduled classes", value: entries.length - holidayCount, icon: "▦", tint: "bg-indigo-50 text-indigo-600", accent: "bg-indigo-500" },
            { label: "Teaching days", value: activeDayCount, icon: "◷", tint: "bg-cyan-50 text-cyan-700", accent: "bg-cyan-500" },
            { label: "Holiday entries", value: holidayCount, icon: "☼", tint: "bg-amber-50 text-amber-600", accent: "bg-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
              <span className={`absolute inset-y-0 left-0 w-1 ${stat.accent}`} />
              <div className="flex items-center justify-between gap-3 pl-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{loading ? "—" : stat.value}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black ${stat.tint}`}>{stat.icon}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Find a class</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Search by subject, teacher or class, or filter by day</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 sm:w-72 sm:flex-none">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-slate-400" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Subject, class, teacher…"
                  aria-label="Search timetable"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400"
                />
                {searchText && (
                  <button type="button" onClick={() => setSearchText("")} aria-label="Clear search" className="rounded-md px-1 text-lg leading-none text-slate-400 hover:bg-slate-200 hover:text-slate-700">×</button>
                )}
              </label>
              {(selectedDay !== "All" || searchText) && (
                <button type="button" onClick={() => { setSelectedDay("All"); setSearchText(""); }} className="shrink-0 rounded-xl px-3 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-50">Reset</button>
              )}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-1">
          {["All", ...DAYS].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              aria-pressed={selectedDay === day}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                selectedDay === day
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <span>{day}</span>
              {day === todayName && day !== "All" && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${selectedDay === day ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"}`}>Today</span>}
              <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${selectedDay === day ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{getDayCount(day)}</span>
            </button>
          ))}
        </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 px-1 pt-3">
            <span className="text-xs font-medium text-slate-500">{selectedDay === "All" ? "All days" : selectedDay}{searchText.trim() ? ` · “${searchText.trim()}”` : ""}</span>
            <span className="text-xs font-extrabold text-slate-700">{visibleEntries.length} {visibleEntries.length === 1 ? "class" : "classes"}</span>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="text-sm font-bold text-slate-600">Loading your weekly plan…</p>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/85 px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 text-3xl text-indigo-600">
              ▦
            </div>

            <h2 className="text-xl font-black text-slate-900">
              {searchText.trim() ? "No matching timetable entries" : entries.length === 0 ? "Your timetable is ready for its first entry" : `No classes on ${selectedDay}`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {searchText.trim() ? "Try a different search or reset filters to see the full timetable." : entries.length === 0 ? "Add a subject, time and class to build your weekly teaching plan." : "Try another day or add a timetable entry for this day."}
            </p>

            <button
              onClick={() => searchText.trim() || selectedDay !== "All" ? (setSearchText(""), setSelectedDay("All")) : router.push("/teacher/timetable/create")}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              {searchText.trim() || selectedDay !== "All" ? "Reset filters" : "+ Create timetable"}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleEntries.map((entry, index) => (
              <article
                key={entry.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_36px_rgba(79,70,229,0.10)]"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${entry.is_holiday ? "bg-amber-400" : index % 2 === 0 ? "bg-indigo-500" : "bg-cyan-500"}`} />
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="flex min-w-0 gap-4">
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${entry.is_holiday ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>
                      <span className="text-[10px] font-black uppercase tracking-wide">{entry.day_of_week.slice(0, 3)}</span>
                      <span className="mt-0.5 text-lg font-black leading-none">{entry.is_holiday ? "☼" : "◷"}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${entry.is_holiday ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {entry.is_holiday ? "Holiday" : "Class session"}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{entry.day_of_week}</span>
                      </div>
                      <h2 className="mt-2 truncate text-lg font-black text-slate-900 sm:text-xl">
                        {entry.is_holiday ? "Holiday" : entry.subject || "Subject"}
                      </h2>
                      {!entry.is_holiday && (
                        <p className="mt-1 text-sm font-bold text-indigo-700">
                          {formatTime(entry.start_time)} <span className="px-1 text-slate-300">→</span> {formatTime(entry.end_time)}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        Teacher <span className="font-bold text-slate-700">{entry.teacher_name}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(entry.class_names || []).map((className) => (
                          <span key={className} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            Class {className}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:pt-1">
                    <button
                      onClick={() =>
                        router.push(
                          `/teacher/timetable/create?id=${entry.id}`
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteTimetable(entry.id)
                      }
                      disabled={deletingId === entry.id}
                      className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingId === entry.id
                        ? "Deleting..."
                        : "Delete"}
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
