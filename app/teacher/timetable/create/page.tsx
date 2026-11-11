"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function CreateTimetableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get("id");

  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");

  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [isHoliday, setIsHoliday] = useState(false);

  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedTeacherId =
      localStorage.getItem("attendance_teacher_id") ||
      localStorage.getItem("teacher_username") ||
      localStorage.getItem("teacherUsername") ||
      "";

    const storedTeacherName =
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherName") ||
      localStorage.getItem("attendance_teacher_name") ||
      localStorage.getItem("teacher_username") ||
      localStorage.getItem("teacherUsername") ||
      "";

    setTeacherId(storedTeacherId);
    setTeacherName(storedTeacherName);

    loadData(storedTeacherId);
  }, [editId]);

  const loadData = async (currentTeacherId: string) => {
    try {
      setLoading(true);

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("class_name")
        .eq("is_active", true)
        .not("class_name", "is", null);

      if (studentError) {
        console.error("Error loading classes:", studentError);
      }

      const uniqueClasses = Array.from(
        new Set(
          (studentData || [])
            .map((student: { class_name: string | null }) =>
              student.class_name?.trim()
            )
            .filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b));

      setClasses(uniqueClasses);

      if (editId) {
        const { data, error } = await supabase
          .from("timetables")
          .select(
            "id, teacher_id, teacher_name, class_names, day_of_week, subject, start_time, end_time, is_holiday"
          )
          .eq("id", editId)
          .single();

        if (error) {
          console.error("Error loading timetable:", error);
          alert(`Unable to load timetable.\n\n${error.message}`);
          return;
        }

        const timetable = data as Timetable;

        if (
          currentTeacherId &&
          timetable.teacher_id &&
          timetable.teacher_id !== currentTeacherId
        ) {
          alert("You are not allowed to edit this timetable.");
          router.push("/teacher/timetable");
          return;
        }

        const holiday = Boolean(timetable.is_holiday);

        setDayOfWeek(timetable.day_of_week || "Monday");
        setIsHoliday(holiday);
        setSelectedClasses(timetable.class_names || []);

        setSubject(
          holiday ? "" : timetable.subject ? timetable.subject : ""
        );

        setStartTime(
          holiday
            ? ""
            : timetable.start_time
              ? timetable.start_time.slice(0, 5)
              : ""
        );

        setEndTime(
          holiday
            ? ""
            : timetable.end_time
              ? timetable.end_time.slice(0, 5)
              : ""
        );
      }
    } catch (error) {
      console.error("Unexpected loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (className: string) => {
    setSelectedClasses((previous) =>
      previous.includes(className)
        ? previous.filter((item) => item !== className)
        : [...previous, className]
    );
  };

  const selectAllClasses = () => {
    setSelectedClasses(classes);
  };

  const clearAllClasses = () => {
    setSelectedClasses([]);
  };

  const handleHolidayChange = (value: string) => {
    const holiday = value === "holiday";

    setIsHoliday(holiday);

    if (holiday) {
      setSubject("");
      setStartTime("");
      setEndTime("");
    }
  };

  const handleSave = async (classesToSave = selectedClasses) => {
    if (!teacherId) {
      alert("Teacher ID not found. Please login again.");
      return;
    }

    if (classesToSave.length === 0) {
      alert("Please select at least one class.");
      return;
    }

    // Subject and timings are required ONLY for normal class days.
    // Holiday does not require subject or timings.
    if (!isHoliday) {
      if (!subject.trim()) {
        alert("Please select a subject.");
        return;
      }

      if (!startTime || !endTime) {
        alert("Please enter both start and end time.");
        return;
      }

      if (endTime <= startTime) {
        alert("End time must be later than start time.");
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        teacher_id: teacherId,
        teacher_name: teacherName,
        class_names: classesToSave,
        day_of_week: dayOfWeek,
        is_holiday: isHoliday,

        // Holiday = NULL
        // Normal class = actual values
        subject: isHoliday ? null : subject.trim(),
        start_time: isHoliday ? null : startTime,
        end_time: isHoliday ? null : endTime,
      };

      let error = null;

      if (editId) {
        const result = await supabase
          .from("timetables")
          .update(payload)
          .eq("id", editId);

        error = result.error;
      } else {
        const result = await supabase
          .from("timetables")
          .insert(payload);

        error = result.error;
      }

      if (error) {
        console.error("Timetable save error:", error);

        alert(`Unable to save timetable.\n\n${error.message}`);
        return;
      }

      try {
        const classList = [...classesToSave].sort().join(",");
        const title = isHoliday ? `Holiday Notice · ${dayOfWeek}` : `Timetable Updated · ${subject.trim()}`;
        const message = isHoliday
          ? `There will be no classes on ${dayOfWeek}. Please check the academic calendar for details.`
          : `Your ${subject.trim()} class is scheduled on ${dayOfWeek}, ${startTime}–${endTime}.`;
        const notificationResponse = await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetClasses: classesToSave,
            category: isHoliday ? "academic_calendar" : "timetable",
            title,
            message,
            url: isHoliday ? "/student/calendar" : "/student/timetable",
            notificationKey: `timetable:${editId || "new"}:${dayOfWeek}:${classList}:${isHoliday ? "holiday" : `${subject.trim()}:${startTime}:${endTime}`}`,
            metadata: { source: "teacher_timetable_update", dayOfWeek, classNames: classesToSave, isHoliday, subject: subject.trim() || null, startTime: startTime || null, endTime: endTime || null },
          }),
        });
        if (!notificationResponse.ok) console.warn("Timetable notification failed:", await notificationResponse.json().catch(() => null));
      } catch (notificationError) {
        console.error("Timetable notification request failed:", notificationError);
      }

      alert(
        isHoliday
          ? "Holiday timetable saved successfully."
          : "Timetable saved successfully."
      );

      router.push("/teacher/timetable");
      router.refresh();
    } catch (error) {
      console.error("Unexpected save error:", error);
      alert("Unable to save timetable.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-lg font-semibold text-slate-800">
            Loading timetable...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main data-racer-timetable-create="1" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-3xl">
              {editId ? "Edit Timetable" : "Create Timetable"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Create the weekly timetable for your selected classes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/teacher/timetable")}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => router.push("/teacher")}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {/* Day */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                Day
              </label>

              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 sm:px-4 sm:py-3 sm:text-base"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Type */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                Day Type
              </label>

              <select
                value={isHoliday ? "holiday" : "class"}
                onChange={(e) => handleHolidayChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 sm:px-4 sm:py-3 sm:text-base"
              >
                <option value="class">Class Day</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>

          {/* Holiday Notice */}
          {isHoliday && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 sm:mt-5 sm:p-4">
              <div className="font-semibold text-amber-900">
                Holiday selected
              </div>
              <div className="text-sm text-amber-800 mt-1">
                Subject and class timings are not required.
              </div>
            </div>
          )}

          {/* Subject + Time */}
          {!isHoliday && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 md:grid-cols-3">
              <div className="col-span-2 md:col-span-1">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                  Subject
                </label>

                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 sm:px-4 sm:py-3 sm:text-base"
                >
                  <option value="">Select Subject</option>

                  {SUBJECTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                  Start Time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 sm:px-4 sm:py-3 sm:text-base"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                  End Time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 sm:px-4 sm:py-3 sm:text-base"
                />
              </div>
            </div>
          )}

          {/* Classes */}
          <div className="mt-5 sm:mt-6">
            <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 sm:text-sm">
                  Select Classes
                </label>

                <p className="text-xs text-slate-500 mt-1">
                  Select the classes for this timetable entry.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllClasses}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 sm:text-sm"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={clearAllClasses}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No student classes found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
                {classes.map((className) => {
                  const selected = selectedClasses.includes(className);

                  return (
                    <button
                      key={className}
                      type="button"
                      onClick={() => toggleClass(className)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:py-3 sm:text-sm ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {className}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-2 text-xs text-slate-500 sm:mt-3 sm:text-sm">
              Selected classes:{" "}
              <span className="font-semibold text-slate-800">{selectedClasses.length}</span>
            </div>
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 sm:mt-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4">
              <div>
                <p className="text-xs font-bold text-indigo-950 sm:text-sm">Apply this {isHoliday ? "holiday" : "time"} to all students</p>
                <p className="mt-1 text-xs leading-5 text-indigo-800">Save the {dayOfWeek} schedule for all {classes.length} active student classes at once.</p>
              </div>
              <button
                type="button"
                onClick={() => handleSave(classes)}
                disabled={saving || classes.length === 0}
                className="mt-2 w-full shrink-0 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:mt-0 sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
              >
                {saving ? "Applying…" : `Apply to all students · ${dayOfWeek}`}
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:mt-7 sm:flex-row sm:gap-3 sm:pt-5">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:flex-none sm:px-6 sm:py-3 ${
                saving
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving
                ? "Saving..."
                : editId
                  ? "Update Timetable"
                  : "Save Timetable"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/teacher/timetable")}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none sm:px-6 sm:py-3"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CreateTimetablePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="text-lg font-semibold text-slate-800">
              Loading...
            </div>
          </div>
        </main>
      }
    >
      <CreateTimetableContent />
    </Suspense>
  );
}
