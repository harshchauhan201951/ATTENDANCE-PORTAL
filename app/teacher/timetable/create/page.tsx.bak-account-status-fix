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

  const handleSave = async () => {
    if (!teacherId) {
      alert("Teacher ID not found. Please login again.");
      return;
    }

    if (selectedClasses.length === 0) {
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
        class_names: selectedClasses,
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
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {editId ? "Edit Timetable" : "Create Timetable"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create the weekly timetable for your selected classes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              Refresh
            </button>

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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Day */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Day
              </label>

              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Day Type
              </label>

              <select
                value={isHoliday ? "holiday" : "class"}
                onChange={(e) => handleHolidayChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="class">Class Day</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>

          {/* Holiday Notice */}
          {isHoliday && (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Subject
                </label>

                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Start Time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  End Time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Classes */}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
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
                  className="px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={clearAllClasses}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {classes.map((className) => {
                  const selected = selectedClasses.includes(className);

                  return (
                    <button
                      key={className}
                      type="button"
                      onClick={() => toggleClass(className)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
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

            <div className="mt-3 text-sm text-slate-500">
              Selected classes:{" "}
              <span className="font-semibold text-slate-800">
                {selectedClasses.length}
              </span>
            </div>
          </div>

          {/* Save */}
          <div className="mt-7 pt-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-white font-semibold ${
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
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
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