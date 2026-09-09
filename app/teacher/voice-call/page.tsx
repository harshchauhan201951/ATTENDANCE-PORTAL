"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type StudentRecord = Record<string, unknown>;

type Student = {
  id: string;
  studentId: string;
  name: string;
  username: string;
  phone: string;
  className: string;
};

type VoiceType = "female" | "male";

type StatusType = "info" | "success" | "error";

const CONTACT_MAP: Record<string, string> = {
  "ADITYA CHAUHAN": "9927242330",
  ANMOL: "9193662005",
  CHIRAG: "+91 75004 76345",
  "DUGGU SHARMA": "9027172575",
  DUGGU: "9568087147",
  "YUG SHARMA": "9027172575",
  MANNU: "9568087147",
  "PALAK CHAUHAN": "7900928176",
  PIYUSH: "9193662005",
  PRINCE: "8865059749",
  "RAGHAV VARSHNEY": "+91 90840 51073",
  SHARVI: "8865059749",
  "ARNAV CHAUHAN": "9258167945",
  "ANANT CHAUHAN": "9258167945",
  "RAGHVENDRA CHAUHAN": "9258167945",
};

function getString(
  row: StudentRecord,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return fallback;
}

function normalizePhone(phone: string): string {
  return String(phone || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStudentName(name: string): string {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeForTel(phone: string): string {
  const value = String(phone || "").trim();

  if (!value) {
    return "";
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (value.startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export default function TeacherVoiceCallPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [recipientMode, setRecipientMode] = useState<
    "all" | "class" | "individual"
  >("all");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [message, setMessage] = useState("");
  const [voiceType, setVoiceType] =
    useState<VoiceType>("female");

  const [isPreviewPlaying, setIsPreviewPlaying] =
    useState(false);

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] =
    useState<StatusType>("info");

  const [isCalling, setIsCalling] = useState(false);

  const [callResults, setCallResults] = useState<
    Array<{
      id: string;
      name: string;
      phone: string;
      twilioPhone: string;
      success: boolean;
      callSid?: string;
      status?: string;
      error?: string;
    }>
  >([]);

  useEffect(() => {
    loadStudents();

    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function loadStudents() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error(
          "Students loading error:",
          error
        );

        setStatus(
          error.message ||
            "Unable to load students.",
          "error"
        );

        return;
      }

      const normalizedStudents: Student[] = (
        (data || []) as StudentRecord[]
      ).map((row, index) => {
        const id = getString(
          row,
          ["id"],
          String(index + 1)
        );

        const studentId = getString(
          row,
          [
            "student_id",
            "studentId",
            "student_username",
            "username",
            "id",
          ],
          id
        );

        const name = getString(
          row,
          [
            "student_name",
            "studentName",
            "name",
            "full_name",
          ],
          "Student"
        );

        const username = getString(
          row,
          [
            "username",
            "student_username",
          ],
          ""
        );

        const databasePhone = normalizePhone(
          getString(
            row,
            [
              "student_mobile",
              "phone_number",
              "phone",
              "mobile",
              "mobile_number",
              "contact_number",
              "phoneNumber",
            ],
            ""
          )
        );

        const normalizedName =
          normalizeStudentName(name);

        const fallbackPhone =
          CONTACT_MAP[normalizedName] || "";

        const phone =
          databasePhone || fallbackPhone;

        const className = getString(
          row,
          [
            "class",
            "class_name",
            "className",
            "standard",
            "section",
          ],
          "Not Assigned"
        );

        return {
          id,
          studentId,
          name,
          username,
          phone,
          className,
        };
      });

      setStudents(normalizedStudents);
    } catch (error) {
      console.error(
        "Unexpected student loading error:",
        error
      );

      setStatus(
        "Unable to load students.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function setStatus(
    messageText: string,
    type: StatusType = "info"
  ) {
    setStatusMessage(messageText);
    setStatusType(type);
  }

  const classes = useMemo(() => {
    const values = students
      .map((student) => student.className)
      .filter(
        (value) =>
          value &&
          value.trim() !== "" &&
          value !== "Not Assigned"
      );

    return Array.from(new Set(values)).sort(
      (a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true,
        })
    );
  }, [students]);

  const visibleStudents = useMemo(() => {
    if (recipientMode === "class") {
      if (!selectedClass) {
        return [];
      }

      return students.filter(
        (student) =>
          student.className === selectedClass
      );
    }

    if (recipientMode === "individual") {
      return students;
    }

    return students;
  }, [
    students,
    recipientMode,
    selectedClass,
  ]);

  const selectedStudentObjects = useMemo(() => {
    return students.filter((student) =>
      selectedStudents.includes(student.id)
    );
  }, [students, selectedStudents]);

  const selectedWithPhone = useMemo(() => {
    return selectedStudentObjects.filter(
      (student) => student.phone.trim() !== ""
    );
  }, [selectedStudentObjects]);

  const selectedWithoutPhone = useMemo(() => {
    return selectedStudentObjects.filter(
      (student) => student.phone.trim() === ""
    );
  }, [selectedStudentObjects]);

  function selectVisibleStudents() {
    const visibleIds = visibleStudents.map(
      (student) => student.id
    );

    setSelectedStudents((current) =>
      Array.from(
        new Set([...current, ...visibleIds])
      )
    );
  }

  function clearVisibleStudents() {
    const visibleIds = new Set(
      visibleStudents.map(
        (student) => student.id
      )
    );

    setSelectedStudents((current) =>
      current.filter(
        (id) => !visibleIds.has(id)
      )
    );
  }

  function selectAllStudents() {
    setSelectedStudents(
      students.map((student) => student.id)
    );
  }

  function clearAllStudents() {
    setSelectedStudents([]);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((current) => {
      if (current.includes(studentId)) {
        return current.filter(
          (id) => id !== studentId
        );
      }

      return [...current, studentId];
    });
  }

  function handleModeChange(
    mode: "all" | "class" | "individual"
  ) {
    setRecipientMode(mode);

    if (mode === "all") {
      setSelectedClass("");
      setSelectedStudents(
        students.map((student) => student.id)
      );
    }

    if (mode === "class") {
      setSelectedStudents([]);
    }

    if (mode === "individual") {
      setSelectedClass("");
      setSelectedStudents([]);
    }
  }

  function handleClassChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const value = event.target.value;

    setSelectedClass(value);

    if (!value) {
      setSelectedStudents([]);
      return;
    }

    const classStudents = students.filter(
      (student) =>
        student.className === value
    );

    setSelectedStudents(
      classStudents.map(
        (student) => student.id
      )
    );
  }

  function previewVoice() {
    if (!message.trim()) {
      setStatus(
        "Please enter a voice message first.",
        "error"
      );
      return;
    }

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setStatus(
        "Voice preview is not supported in this browser.",
        "error"
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        message.trim()
      );

    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices =
      window.speechSynthesis.getVoices();

    const preferredVoices = voices.filter(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith("en-in")
    );

    if (preferredVoices.length > 0) {
      if (voiceType === "female") {
        const femaleVoice =
          preferredVoices.find((voice) =>
            /female|woman|google/i.test(
              voice.name
            )
          );

        utterance.voice =
          femaleVoice ||
          preferredVoices[0];
      } else {
        const maleVoice =
          preferredVoices.find((voice) =>
            /male|man|google/i.test(
              voice.name
            )
          );

        utterance.voice =
          maleVoice ||
          preferredVoices[0];
      }
    }

    utterance.onstart = () => {
      setIsPreviewPlaying(true);
      setStatus(
        "Voice preview is playing...",
        "info"
      );
    };

    utterance.onend = () => {
      setIsPreviewPlaying(false);
    };

    utterance.onerror = () => {
      setIsPreviewPlaying(false);
      setStatus(
        "Unable to play voice preview.",
        "error"
      );
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  function stopPreview() {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    setIsPreviewPlaying(false);
  }

  async function makeVoiceCall() {
    if (isCalling) {
      return;
    }

    if (!message.trim()) {
      setStatus(
        "Please enter a message first.",
        "error"
      );
      return;
    }

    if (!selectedStudents.length) {
      setStatus(
        "Please select at least one student.",
        "error"
      );
      return;
    }

    if (!selectedWithPhone.length) {
      setStatus(
        "None of the selected students has a registered phone number.",
        "error"
      );
      return;
    }

    if (selectedWithoutPhone.length > 0) {
      setStatus(
        `${selectedWithPhone.length} student(s) have phone numbers, but ${selectedWithoutPhone.length} selected student(s) are missing phone numbers.`,
        "error"
      );
      return;
    }

    try {
      setIsCalling(true);
      setCallResults([]);

      setStatus(
        `Calling ${selectedWithPhone.length} student(s)... Please wait.`,
        "info"
      );

      const recipients =
        selectedWithPhone.map(
          (student) => ({
            id: student.id,
            name: student.name,
            phone: student.phone,
          })
        );

      const response = await fetch(
        "/api/voice-call",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            recipients,
            message: message.trim(),
            voiceType,
          }),
        }
      );

      let data: {
        success?: boolean;
        message?: string;
        total?: number;
        successful?: number;
        failed?: number;
        results?: Array<{
          id: string;
          name: string;
          phone: string;
          twilioPhone: string;
          success: boolean;
          callSid?: string;
          status?: string;
          error?: string;
        }>;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        setStatus(
          data.message ||
            "Unable to start voice calls.",
          "error"
        );
        return;
      }

      if (Array.isArray(data.results)) {
        setCallResults(data.results);
      }

      if (data.success) {
        const successful =
          Number(data.successful || 0);

        const failed =
          Number(data.failed || 0);

        if (failed === 0) {
          setStatus(
            `✅ ${successful} automated voice call(s) have been successfully sent to Twilio.`,
            "success"
          );
        } else {
          setStatus(
            `📞 ${successful} call(s) sent successfully. ${failed} call(s) failed. Check the result details below.`,
            "info"
          );
        }

        console.log(
          "Twilio call results:",
          data.results
        );
      } else {
        setStatus(
          data.message ||
            "Twilio could not create the calls.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Voice call request error:",
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Something went wrong while starting voice calls.",
        "error"
      );
    } finally {
      setIsCalling(false);
    }
  }

  function callStudentDirectly(
    student: Student
  ) {
    const phone =
      normalizeForTel(student.phone);

    if (!phone) {
      setStatus(
        `${student.name} does not have a phone number.`,
        "error"
      );
      return;
    }

    if (
      typeof window !== "undefined"
    ) {
      window.location.href = `tel:${phone}`;
    }
  }

  const selectedVisibleCount =
    visibleStudents.filter((student) =>
      selectedStudents.includes(student.id)
    ).length;

  const allVisibleSelected =
    visibleStudents.length > 0 &&
    selectedVisibleCount ===
      visibleStudents.length;

  const hasMessage =
    message.trim().length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                📞 Teacher Portal
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                Voice & Call
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Send an automated voice message to
                selected students using Twilio.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/teacher")
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              ← Back to Teacher Portal
            </button>
          </div>
        </div>

        {/* Status */}
        {statusMessage && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm font-semibold ${
              statusType === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : statusType === "error"
                ? "border-red-400/30 bg-red-500/10 text-red-300"
                : "border-blue-400/30 bg-blue-500/10 text-blue-300"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Students
            </div>
            <div className="mt-2 text-2xl font-black">
              {students.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected
            </div>
            <div className="mt-2 text-2xl font-black text-indigo-300">
              {selectedStudents.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phone Ready
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-300">
              {selectedWithPhone.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Missing Phone
            </div>
            <div className="mt-2 text-2xl font-black text-red-300">
              {selectedWithoutPhone.length}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Left */}
          <section className="space-y-6">
            {/* Recipient */}
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black">
                  1. Select Recipients
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose all students, a class, or
                  individual students.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    handleModeChange("all")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    recipientMode === "all"
                      ? "border-indigo-400 bg-indigo-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-xl">
                    👥
                  </div>
                  <div className="mt-2 font-bold">
                    All Students
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {students.length} students
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleModeChange("class")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    recipientMode === "class"
                      ? "border-indigo-400 bg-indigo-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-xl">
                    🏫
                  </div>
                  <div className="mt-2 font-bold">
                    By Class
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Choose a class
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      "individual"
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    recipientMode ===
                    "individual"
                      ? "border-indigo-400 bg-indigo-500/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-xl">
                    👤
                  </div>
                  <div className="mt-2 font-bold">
                    Individual
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Select manually
                  </div>
                </button>
              </div>

              {recipientMode === "class" && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    Select Class
                  </label>

                  <select
                    value={selectedClass}
                    onChange={handleClassChange}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                  >
                    <option value="">
                      -- Select Class --
                    </option>

                    {classes.map(
                      (className) => (
                        <option
                          key={className}
                          value={className}
                        >
                          {className}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    selectVisibleStudents
                  }
                  disabled={
                    visibleStudents.length ===
                    0
                  }
                  className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✓ Select Visible
                </button>

                <button
                  type="button"
                  onClick={
                    clearVisibleStudents
                  }
                  disabled={
                    visibleStudents.length ===
                    0
                  }
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear Visible
                </button>

                <button
                  type="button"
                  onClick={
                    selectAllStudents
                  }
                  disabled={
                    students.length === 0
                  }
                  className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={
                    clearAllStudents
                  }
                  disabled={
                    selectedStudents.length ===
                    0
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear All
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-xs text-slate-400">
                {selectedVisibleCount} of{" "}
                {visibleStudents.length} visible
                student(s) selected.
              </div>
            </div>

            {/* Students */}
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">
                    2. Student List
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Select students who should
                    receive the call.
                  </p>
                </div>

                <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                  {visibleStudents.length} shown
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-sm text-slate-400">
                  Loading students...
                </div>
              ) : visibleStudents.length ===
                0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-sm text-slate-400">
                  {recipientMode ===
                    "class" &&
                  !selectedClass
                    ? "Please select a class."
                    : "No students found."}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Student / Phone
                    </span>

                    {allVisibleSelected && (
                      <span className="text-xs font-bold text-emerald-300">
                        All visible selected
                      </span>
                    )}
                  </div>

                  <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {visibleStudents.map(
                      (student) => {
                        const checked =
                          selectedStudents.includes(
                            student.id
                          );

                        const hasPhone =
                          student.phone.trim() !==
                          "";

                        return (
                          <div
                            key={student.id}
                            className={`rounded-2xl border p-3 transition ${
                              checked
                                ? "border-indigo-400/50 bg-indigo-500/10"
                                : "border-white/10 bg-slate-950 hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleStudent(
                                    student.id
                                  )
                                }
                                className="h-5 w-5 cursor-pointer accent-indigo-500"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold">
                                    {student.name}
                                  </span>

                                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                    {student.studentId}
                                  </span>

                                  {student.className &&
                                    student.className !==
                                      "Not Assigned" && (
                                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                        {
                                          student.className
                                        }
                                      </span>
                                    )}
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                  {hasPhone ? (
                                    <span className="text-emerald-300">
                                      📱{" "}
                                      {
                                        student.phone
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-red-300">
                                      ⚠️ Phone number
                                      missing
                                    </span>
                                  )}
                                </div>
                              </div>

                              {hasPhone && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    callStudentDirectly(
                                      student
                                    )
                                  }
                                  title="Call from this device"
                                  className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                                >
                                  ☎
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right */}
          <section className="space-y-6">
            {/* Message */}
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black">
                  3. Voice Message
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Write the message that the student
                  will hear during the automated call.
                </p>
              </div>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value.slice(
                      0,
                      1000
                    )
                  )
                }
                maxLength={1000}
                rows={8}
                placeholder="Example: Hello, this is RACER ACADEMY. This is a reminder regarding your class..."
                className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-indigo-400"
              />

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {hasMessage
                    ? "Message ready"
                    : "Message required"}
                </span>

                <span>
                  {message.length}/1000
                </span>
              </div>
            </div>

            {/* Voice */}
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black">
                  4. Voice Type
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select the voice for the automated
                  Twilio call.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setVoiceType("female")
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    voiceType === "female"
                      ? "border-pink-400/50 bg-pink-500/10"
                      : "border-white/10 bg-slate-950 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="text-3xl">
                    👩
                  </div>

                  <div className="mt-3 font-black">
                    Female Voice
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Natural Indian English voice
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setVoiceType("male")
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    voiceType === "male"
                      ? "border-blue-400/50 bg-blue-500/10"
                      : "border-white/10 bg-slate-950 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="text-3xl">
                    👨
                  </div>

                  <div className="mt-3 font-black">
                    Male Voice
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Natural Indian English voice
                  </div>
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {!isPreviewPlaying ? (
                  <button
                    type="button"
                    onClick={previewVoice}
                    disabled={!hasMessage}
                    className="flex-1 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-sm font-black text-indigo-300 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🔊 Preview Voice
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopPreview}
                    className="flex-1 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"
                  >
                    ⏹ Stop Preview
                  </button>
                )}
              </div>
            </div>

            {/* Call */}
            <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-5 shadow-xl sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black">
                  5. Start Automated Call
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Twilio will create a real telephone
                  call for every selected student.
                </p>
              </div>

              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-xs text-slate-500">
                    Selected
                  </div>
                  <div className="mt-1 text-xl font-black">
                    {selectedStudents.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-xs text-slate-500">
                    Ready
                  </div>
                  <div className="mt-1 text-xl font-black text-emerald-300">
                    {selectedWithPhone.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-xs text-slate-500">
                    Missing
                  </div>
                  <div className="mt-1 text-xl font-black text-red-300">
                    {selectedWithoutPhone.length}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={makeVoiceCall}
                disabled={
                  isCalling ||
                  !hasMessage ||
                  selectedStudents.length === 0
                }
                className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCalling
                  ? "📞 Starting Calls..."
                  : "📞 Start Automated Voice Call"}
              </button>

              <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
                Make sure your Twilio account, caller
                number and voice configuration are
                active before starting calls.
              </p>
            </div>

            {/* Results */}
            {callResults.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-black">
                    Call Results
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Result returned by Twilio for this
                    request.
                  </p>
                </div>

                <div className="space-y-2">
                  {callResults.map(
                    (result, index) => (
                      <div
                        key={`${result.id}-${index}`}
                        className="rounded-2xl border border-white/10 bg-slate-950 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="font-bold">
                              {result.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {result.phone}
                            </div>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              result.success
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-red-500/10 text-red-300"
                            }`}
                          >
                            {result.success
                              ? `✓ ${
                                  result.status ||
                                  "Sent"
                                }`
                              : "✕ Failed"}
                          </div>
                        </div>

                        {result.callSid && (
                          <div className="mt-3 break-all rounded-xl bg-white/[0.03] p-2 text-[10px] text-slate-500">
                            Call SID:{" "}
                            {result.callSid}
                          </div>
                        )}

                        {result.error && (
                          <div className="mt-3 rounded-xl border border-red-400/10 bg-red-500/5 p-3 text-xs text-red-300">
                            {result.error}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Information */}
            <div className="rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5 sm:p-6">
              <h3 className="font-black text-amber-300">
                ⚠️ Important
              </h3>

              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                <li>
                  • Student phone numbers are taken
                  from{" "}
                  <span className="font-bold text-slate-300">
                    student_mobile
                  </span>{" "}
                  first.
                </li>

                <li>
                  • The configured contact fallback is
                  used when the database phone number
                  is empty.
                </li>

                <li>
                  • Twilio credentials are used only by
                  the server API route and should never
                  be placed in client-side code.
                </li>

                <li>
                  • Browser preview is only a local
                  preview. The automated call uses
                  Twilio.
                </li>

                <li>
                  • Actual calling depends on your Twilio
                  account, caller ID, destination-country
                  restrictions and account permissions.
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-center text-xs leading-5 text-slate-500">
          RACER ACADEMY • Teacher Voice & Call •
          Automated calling powered by your secure
          server-side voice integration.
        </div>
      </div>
    </main>
  );
}