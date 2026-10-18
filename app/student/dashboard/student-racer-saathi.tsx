"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isFeePeriodOnOrAfterAdmission, isOnOrAfterAdmission } from "../../../lib/admission-date";
import { getStudentCalendarEvent } from "../../../lib/student-calendar-events";
import { filterMonthlySnapshotByAdmission } from "../../../lib/monthly-result";

type Student = { id: number; student_name: string | null; class_name: string | null; admission_date: string | null };
type MenuOption = { id: string; label: string; icon?: string };
type ChatRow = { label: string; value: string };
type Message = { from: "bot" | "student"; text: string; rows?: ChatRow[]; createdAt: number };
type Category = "study" | "attendance" | "fees" | "quiz" | "weekly" | "monthly" | "timetable" | "homework" | "calendar";

const categories: Array<MenuOption & { category: Category }> = [
  { id: "study", category: "study", label: "AI से पढ़ाई", icon: "✨" },
  { id: "attendance", category: "attendance", label: "अटेंडेंस", icon: "✅" },
  { id: "fees", category: "fees", label: "फीस", icon: "💳" },
  { id: "quiz", category: "quiz", label: "क्विज़ रिज़ल्ट", icon: "✏️" },
  { id: "weekly", category: "weekly", label: "सैटरडे टेस्ट", icon: "📝" },
  { id: "monthly", category: "monthly", label: "मंथली रिज़ल्ट", icon: "🏆" },
  { id: "timetable", category: "timetable", label: "टाइमटेबल", icon: "🗓️" },
  { id: "homework", category: "homework", label: "होमवर्क", icon: "📚" },
  { id: "calendar", category: "calendar", label: "छुट्टी सूचना", icon: "🌤️" },
];
const mainOptions: MenuOption[] = [...categories, { id: "other", label: "कुछ और पूछें", icon: "💬" }];
const studyActions = [
  { id: "study:maths", label: "गणित अभ्यास", icon: "➗", prompt: "Help me practise maths at my class level. Ask me one question at a time and wait for my answer." },
  { id: "study:english", label: "English grammar", icon: "🔤", prompt: "Help me practise English grammar with one short question at a time. Wait for my answer before continuing." },
  { id: "study:science", label: "विज्ञान समझें", icon: "🔬", prompt: "Help me understand a science topic using a simple example. Ask which topic only if I have not named one." },
  { id: "study:quiz", label: "Quiz practice", icon: "📝", prompt: "Help me practise with a short quiz. Ask which subject or topic if I have not named one, then ask one question at a time." },
  { id: "study:homework", label: "Homework help", icon: "📚", prompt: "Help me understand my homework step by step. Ask me to share the question if I have not included it." },
  { id: "study:plan", label: "Study plan", icon: "📅", prompt: "Help me make a simple, encouraging study plan. Ask one short question at a time for the details you need." },
  { id: "study:motivation", label: "Motivation", icon: "🌟", prompt: "I would like a kind, child-friendly bit of motivation for studying. Keep it warm and brief." },
];

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const monthKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(date);
const addIstDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};
const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" });
};
const monthLabel = (value: string) => {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("hi-IN", { month: "long", year: "numeric" });
};
const money = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const localDay = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
const monthOf = (value: string | null | undefined) => String(value || "").slice(0, 7);

function RACreature({ compact = false }: { compact?: boolean }) {
  return <img className={`racer-mascot${compact ? " compact" : ""}`} src="/racer-saathi-mascot.png" alt="RACER साथी smiling robot" />;
}

export default function StudentRacerSaathi({ studentId }: { studentId: number | null }) {
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<"date" | "month" | null>(null);
  const [pickerValue, setPickerValue] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [tutorMode, setTutorMode] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "ready" | "setup" | "login" | "offline">("checking");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [toolShelfOpen, setToolShelfOpen] = useState(false);
  const [voice, setVoice] = useState("shimmer");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voicePreferencesReady, setVoicePreferencesReady] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<string[]>([]);
  const [historyReadyFor, setHistoryReadyFor] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const voiceSettingsRef = useRef<HTMLDivElement>(null);
  const voiceSettingsToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading, options.length]);

  useEffect(() => () => {
    aiAbortRef.current?.abort();
    speechAbortRef.current?.abort();
    audioRef.current?.pause();
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("racer-saathi-saved-answers") || "[]");
      if (Array.isArray(saved)) setSavedAnswers(saved.filter((item): item is string => typeof item === "string").slice(0, 50));
    } catch { localStorage.removeItem("racer-saathi-saved-answers"); }
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("racer-saathi-voice-preferences") || "null") as { voice?: unknown; speed?: unknown; autoSpeak?: unknown } | null;
      if (saved && typeof saved === "object") {
        if (typeof saved.voice === "string" && ["shimmer", "coral", "marin", "cedar"].includes(saved.voice)) setVoice(saved.voice);
        if (typeof saved.speed === "number" && Number.isFinite(saved.speed)) setVoiceSpeed(Math.max(0.75, Math.min(1.25, saved.speed)));
        if (typeof saved.autoSpeak === "boolean") setAutoSpeak(saved.autoSpeak);
      }
    } catch { localStorage.removeItem("racer-saathi-voice-preferences"); }
    setVoicePreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!voiceSettingsOpen) return;
    const dismissOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (voiceSettingsRef.current?.contains(target) || voiceSettingsToggleRef.current?.contains(target)) return;
      setVoiceSettingsOpen(false);
    };
    document.addEventListener("pointerdown", dismissOnOutsidePress);
    return () => document.removeEventListener("pointerdown", dismissOnOutsidePress);
  }, [voiceSettingsOpen]);

  useEffect(() => {
    if (!voicePreferencesReady) return;
    localStorage.setItem("racer-saathi-voice-preferences", JSON.stringify({ voice, speed: voiceSpeed, autoSpeak }));
  }, [voice, voiceSpeed, autoSpeak, voicePreferencesReady]);

  useEffect(() => {
    if (!open || !studentId) return;
    let active = true;
    setServiceStatus("checking");
    void fetch("/api/student/saathi/status", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!active) return;
        if (response.status === 401) setServiceStatus("login");
        else if (response.ok && result?.aiAvailable) setServiceStatus("ready");
        else if (response.ok) setServiceStatus("setup");
        else setServiceStatus("offline");
      })
      .catch(() => { if (active) setServiceStatus("offline"); });
    return () => { active = false; };
  }, [open, studentId]);

  useEffect(() => {
    if (!open || !studentId) return;
    const key = `racer-saathi-history:${studentId}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "[]") as Message[];
      const recent = saved.filter((message) => Number(message.createdAt) >= Date.now() - 30 * 60 * 1000);
      if (recent.length) setMessages(recent);
      else sessionStorage.removeItem(key);
    } catch { sessionStorage.removeItem(key); }
    setHistoryReadyFor(studentId);
  }, [open, studentId]);

  useEffect(() => {
    if (!studentId || historyReadyFor !== studentId || typeof window === "undefined") return;
    const key = `racer-saathi-history:${studentId}`;
    if (messages.length) sessionStorage.setItem(key, JSON.stringify(messages));
    else sessionStorage.removeItem(key);
  }, [messages, studentId, historyReadyFor]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 30 * 60 * 1000;
      setMessages((old) => old.filter((message) => message.createdAt >= cutoff));
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open || messages.length) return;
    setCategory(null);
    setOptions([]);
    setPicker(null);
    setToolShelfOpen(false);
  }, [open, messages.length]);

  useEffect(() => {
    if (!open || !studentId) return;
    let active = true;
    void supabase.from("students").select("id,student_name,class_name,admission_date").eq("id", studentId).maybeSingle().then(({ data }) => {
      if (active && data) setStudent(data as Student);
    });
    return () => { active = false; };
  }, [open, studentId]);

  const bot = (text: string, rows?: ChatRow[]) => setMessages((old) => [...old, { from: "bot", text, rows, createdAt: Date.now() }]);
  const studentSaid = (text: string) => setMessages((old) => [...old, { from: "student", text, createdAt: Date.now() }]);
  const menu = (items: MenuOption[], prompt?: string) => {
    if (prompt) bot(prompt);
    setOptions(items);
    setPicker(null);
    setPickerValue("");
  };
  const mainMenu = () => { setCategory(null); menu([], "किस जानकारी में मदद करूँ? नीचे से एक विकल्प चुनें।"); };
  const withMainMenu = (items: MenuOption[]) => [...items, { id: "main", label: "मुख्य मेनू", icon: "⌂" }];

  const stopSpeech = () => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      if (audio.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    setSpeaking(false);
  };

  const playAnswer = async (text: string) => {
    if (!text.trim()) return;
    stopSpeech();
    setVoiceNotice("");
    const controller = new AbortController();
    speechAbortRef.current = controller;
    setSpeaking(true);
    try {
      const response = await fetch("/api/student/saathi/speech", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed: voiceSpeed }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Voice playback is unavailable right now.");
      }
      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audioRef.current = audio;
      audio.playbackRate = voiceSpeed;
      audio.onended = () => { if (audioRef.current === audio) audioRef.current = null; URL.revokeObjectURL(audio.src); setSpeaking(false); };
      audio.onerror = () => { URL.revokeObjectURL(audio.src); setSpeaking(false); setVoiceNotice("आवाज़ नहीं चल पाई—फिर से दबाएँ।"); };
      await audio.play();
    } catch (error) {
      if (controller.signal.aborted) return;
      setSpeaking(false);
      setVoiceNotice(error instanceof Error ? error.message : "Voice playback failed.");
    } finally {
      if (speechAbortRef.current === controller) speechAbortRef.current = null;
    }
  };

  const askAi = async (question: string, shownText = question) => {
    const cleanQuestion = question.trim().slice(0, 1_500);
    if (!cleanQuestion || loading) return;
    aiAbortRef.current?.abort();
    stopSpeech();
    setVoiceNotice("");
    setTutorMode(true);
    setCategory(null);
    setOptions([]);
    setPicker(null);
    const conversation = messages.filter((message) => !message.rows && message.text.trim())
      .slice(-10).map((message) => ({ role: message.from === "bot" ? "assistant" as const : "user" as const, content: message.text }));
    const requestMessages = [...conversation, { role: "user" as const, content: cleanQuestion }].slice(-12);
    const studentMessageId = Date.now();
    const assistantMessageId = studentMessageId + 1;
    setMessages((old) => [...old,
      { from: "student", text: shownText, createdAt: studentMessageId },
      { from: "bot", text: "", createdAt: assistantMessageId },
    ]);
    setLoading(true);
    const controller = new AbortController();
    aiAbortRef.current = controller;
    let answer = "";
    try {
      const response = await fetch("/api/student/saathi/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "RACER साथी could not answer right now.");
      }
      if (!response.body) throw new Error("Streaming replies are unavailable in this browser.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        for (const frame of frames) {
          const payload = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
          if (!payload || payload === "[DONE]") continue;
          const event = JSON.parse(payload) as { delta?: string; error?: string };
          if (event.error) throw new Error(event.error);
          if (event.delta) {
            answer += event.delta;
            setMessages((old) => old.map((message) => message.createdAt === assistantMessageId ? { ...message, text: answer } : message));
          }
        }
        if (done) break;
      }
      if (!answer.trim()) throw new Error("अभी जवाब नहीं आया। सवाल को थोड़ा बदलकर पूछें।");
      if (autoSpeak) void playAnswer(answer);
    } catch (error) {
      if (controller.signal.aborted) return;
      const errorMessage = error instanceof Error ? error.message : "RACER साथी could not answer right now.";
      setMessages((old) => old.map((message) => message.createdAt === assistantMessageId ? { ...message, text: errorMessage } : message));
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      setLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (serviceStatus !== "ready") {
      setVoiceNotice(serviceStatus === "login" ? "सुरक्षित voice chat के लिए sign out करके फिर sign in करें।" : "AI voice अभी setup नहीं है। Admin setup के बाद mic चालू होगा।");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceNotice("इस browser या Android WebView में voice input उपलब्ध नहीं है। आप सवाल टाइप कर सकते हैं।");
      return;
    }
    setVoiceNotice("रिकॉर्डिंग शुरू करने पर आपका सवाल transcription के लिए AI provider को भेजा जाएगा; audio यहाँ save नहीं होगा।");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        microphoneStreamRef.current = null;
        recorderRef.current = null;
        if (!chunks.length) { setVoiceNotice("आवाज़ रिकॉर्ड नहीं हुई। फिर से कोशिश करें।"); return; }
        setTranscribing(true);
        try {
          const audio = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const form = new FormData();
          form.set("audio", audio, "saathi-question.webm");
          const response = await fetch("/api/student/saathi/transcribe", { method: "POST", credentials: "same-origin", body: form });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.success) throw new Error(result?.error || "आवाज़ समझ नहीं आई।");
          const transcript = String(result.text || "").trim();
          if (!transcript) throw new Error("आवाज़ समझ नहीं आई। एक बार फिर कोशिश करें।");
          if (autoSpeak) {
            setVoiceNotice("साथी जवाब दे रहा है… आपकी recording save नहीं हुई।");
            void askAi(transcript, transcript);
          } else {
            setTypedQuestion(transcript);
            setVoiceNotice("सवाल लिख दिया है—जाँचकर भेजें, या Voice replies चालू करें। आपकी recording save नहीं हुई।");
            questionInputRef.current?.focus();
          }
        } catch (error) {
          setVoiceNotice(error instanceof Error ? error.message : "Voice transcription failed.");
        } finally { setTranscribing(false); }
      };
      recorder.onerror = () => setVoiceNotice("Recording में समस्या हुई। फिर कोशिश करें।");
      recorderRef.current = recorder;
      recorder.start();
      setVoiceNotice("साथी सुन रहा है… रोकने के लिए mic फिर दबाएँ।");
      setRecording(true);
    } catch {
      setVoiceNotice("Mic permission नहीं मिली। Android prompt में microphone allow करें, या सवाल टाइप करें।");
    }
  };

  const clearChat = () => {
    aiAbortRef.current?.abort();
    stopSpeech();
    if (recording) recorderRef.current?.stop();
    sessionStorage.removeItem(`racer-saathi-history:${studentId}`);
    setMessages([{ from: "bot", text: "नमस्ते! मैं RACER साथी हूँ—एक AI learning companion. आज किस विषय में मदद चाहिए? मैं एक बार में एक कदम लेकर समझाऊँगा।", createdAt: Date.now() }]);
    setTutorMode(false);
    setCategory(null);
    setToolShelfOpen(false);
    setOptions(mainOptions);
    setTypedQuestion("");
  };

  const toggleSavedAnswer = (text: string) => {
    const next = savedAnswers.includes(text) ? savedAnswers.filter((item) => item !== text) : [text, ...savedAnswers].slice(0, 50);
    setSavedAnswers(next);
    localStorage.setItem("racer-saathi-saved-answers", JSON.stringify(next));
    setVoiceNotice(next.includes(text) ? "उत्तर इस device पर save हो गया।" : "Saved answer हटा दिया गया।");
  };

  const clearSavedAnswers = () => {
    setSavedAnswers([]);
    localStorage.removeItem("racer-saathi-saved-answers");
    setVoiceNotice("इस device पर save किए answers हटा दिए।");
  };

  const askCategory = (item: typeof categories[number], alreadySaid = false) => {
    if (!alreadySaid) studentSaid(`${item.icon}  ${item.label}`);
    setToolShelfOpen(false);
    setCategory(item.category);
    if (item.category !== "study") setTutorMode(false);
    if (item.category === "study") menu(studyActions.map(({ id, label, icon }) => ({ id, label, icon })), "किस तरह की पढ़ाई में मदद चाहिए? मैं एक सवाल एक बार में पूछूँगा।");
    else if (item.category === "attendance") menu(withMainMenu([
      { id: "today", label: "आज की अटेंडेंस", icon: "☀" },
      { id: "month", label: "इस महीने का हिसाब", icon: "▦" },
      { id: "all", label: "अब तक का कुल रिकॉर्ड", icon: "Σ" },
      { id: "date", label: "किसी तारीख की जानकारी", icon: "⌕" },
    ]), "अटेंडेंस किस अवधि की देखनी है?");
    else if (item.category === "fees") menu(withMainMenu([
      { id: "paid", label: "कुल जमा फीस", icon: "✓" },
      { id: "due_all", label: "कुल बकाया फीस", icon: "!" },
      { id: "due_month", label: "इस महीने का बकाया", icon: "◷" },
      { id: "month", label: "किसी महीने का फीस हिसाब", icon: "⌕" },
    ]), "फीस में कौन-सा हिसाब चाहिए?");
    else if (item.category === "quiz") menu(withMainMenu([
      { id: "quiz_month", label: "महीने के हिसाब से क्विज़", icon: "▦" },
      { id: "quiz_latest", label: "सबसे नए क्विज़", icon: "↗" },
      { id: "quiz_custom", label: "अपना महीना चुनें", icon: "⌕" },
    ]), "किस महीने या किस नए क्विज़ का रिज़ल्ट चाहिए?");
    else if (item.category === "weekly") void prepareWeeklyOptions();
    else if (item.category === "monthly") void prepareMonthlyOptions();
    else if (item.category === "timetable") menu(withMainMenu([
      { id: "today", label: "आज का टाइमटेबल", icon: "☀" },
      { id: "tomorrow", label: "कल का टाइमटेबल", icon: "↗" },
      { id: "week", label: "पूरे सप्ताह का टाइमटेबल", icon: "▦" },
      { id: "date", label: "किसी दिन का टाइमटेबल", icon: "⌕" },
    ]), "किस दिन की क्लास देखनी है?");
    else if (item.category === "homework") menu(withMainMenu([
      { id: "today", label: "आज का होमवर्क", icon: "☀" },
      { id: "recent", label: "पिछले 7 दिनों का", icon: "↶" },
      { id: "all", label: "सारा उपलब्ध होमवर्क", icon: "▤" },
      { id: "date", label: "किसी तारीख का होमवर्क", icon: "⌕" },
    ]), "होमवर्क किस दिन का देखना है?");
    else menu(withMainMenu([
      { id: "holidays", label: "आने वाली छुट्टियाँ", icon: "☼" },
      { id: "tests", label: "आने वाले टेस्ट", icon: "✎" },
      { id: "events", label: "सभी अकादमिक इवेंट", icon: "◇" },
      { id: "date", label: "किसी तारीख का इवेंट", icon: "⌕" },
    ]), "कैलेंडर में क्या देखना चाहेंगे?");
  };

  const showDatePicker = (mode: "date" | "month", prompt: string) => {
    studentSaid(mode === "month" ? "महीना चुनें" : "तारीख चुनें");
    setPicker(mode);
    setPickerValue(mode === "month" ? monthKey() : todayKey());
    bot(prompt);
  };

  const attendanceAnswer = async (period: string, exactDate?: string) => {
    if (!studentId) throw new Error("Student session not found.");
    const [regular, extra] = await Promise.all([
      supabase.from("attendance").select("attendance_date,status").eq("student_id", studentId),
      supabase.from("extra_class_attendance").select("extra_class_date,status").eq("student_id", studentId),
    ]);
    if (regular.error) throw regular.error;
    const rows = [
      ...(regular.data || []).map((row) => ({ date: row.attendance_date, status: row.status })),
      ...(extra.data || []).map((row) => ({ date: row.extra_class_date, status: row.status })),
    ].filter((row) => isOnOrAfterAdmission(student?.admission_date, row.date))
      .filter((row) => period === "today" ? row.date === todayKey() : period === "month" ? monthOf(row.date) === monthKey() : period === "date" ? row.date === exactDate : true);
    const present = rows.filter((row) => String(row.status || "").toLowerCase() === "present").length;
    const absent = rows.filter((row) => String(row.status || "").toLowerCase() === "absent").length;
    const recorded = present + absent;
    const percent = recorded ? `${Math.round((present / recorded) * 100)}%` : "—";
    bot("आपका अटेंडेंस कार्ड तैयार है ✨", [
      { label: "कुल दर्ज क्लास", value: String(recorded) },
      { label: "उपस्थित", value: `${present} दिन  ›` },
      { label: "अनुपस्थित", value: `${absent} दिन  ›` },
      { label: "उपस्थिति प्रतिशत", value: percent },
      { label: "अवधि", value: period === "today" ? "आज" : period === "month" ? monthLabel(monthKey()) : period === "date" ? dateLabel(exactDate) : "Admission से अब तक" },
    ]);
  };

  const feesAnswer = async (kind: string, selectedMonth?: string) => {
    if (!studentId) throw new Error("Student session not found.");
    const { data, error } = await supabase.from("fees").select("month,year,amount,status").eq("student_id", studentId).order("year", { ascending: false }).order("month", { ascending: false }).limit(100);
    if (error) throw error;
    const rows = (data || []).filter((row) => isFeePeriodOnOrAfterAdmission(student?.admission_date, Number(row.year), Number(row.month)));
    const paidRows = rows.filter((row) => ["paid", "paid online", "submitted", "complete", "completed"].includes(String(row.status || "").toLowerCase()));
    const dueRows = rows.filter((row) => String(row.status || "").toLowerCase() === "pending");
    const amount = (values: typeof rows) => values.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (kind === "paid") bot("आपकी जमा फीस का सारांश 💙", [
      { label: "अब तक कुल जमा", value: money(amount(paidRows)) },
      { label: "जमा महीनों की संख्या", value: String(paidRows.length) },
      { label: "हाल की जमा फीस", value: paidRows[0] ? `${money(Number(paidRows[0].amount))}  ›` : "अभी कोई जमा रिकॉर्ड नहीं" },
    ]);
    else if (kind === "due_month" || kind === "due_selected") {
      const targetMonth = selectedMonth || monthKey();
      const filtered = dueRows.filter((row) => `${row.year}-${String(row.month).padStart(2, "0")}` === targetMonth);
      bot(`${monthLabel(targetMonth)} की फीस स्थिति`, [
        { label: "इस महीने का बकाया", value: money(amount(filtered)) },
        { label: "रिकॉर्ड", value: filtered.length ? `${filtered.length} शुल्क रिकॉर्ड` : "कोई बकाया रिकॉर्ड नहीं" },
        ...filtered.slice(0, 4).map((row) => ({ label: `${row.month}/${row.year} • ${row.status || "स्थिति"}`, value: `${money(Number(row.amount))}  ›` })),
      ]);
    } else if (kind === "month") {
      const filtered = rows.filter((row) => `${row.year}-${String(row.month).padStart(2, "0")}` === selectedMonth);
      bot(`${monthLabel(selectedMonth || "")} का फीस स्टेटमेंट`, filtered.length ? filtered.map((row) => ({ label: `${row.month}/${row.year} • ${row.status || "स्थिति"}`, value: `${money(Number(row.amount))}  ›` })) : [{ label: "इस महीने का रिकॉर्ड", value: "उपलब्ध नहीं" }]);
    } else bot("आपकी कुल फीस का सारांश 💳", [
      { label: "कुल जमा फीस", value: money(amount(paidRows)) },
      { label: "कुल बकाया फीस", value: money(amount(dueRows)) },
      { label: "बकाया महीनों की संख्या", value: String(dueRows.length) },
    ]);
  };

  const quizRows = async () => {
    if (!studentId) throw new Error("Student session not found.");
    const { data, error } = await supabase.from("quiz_results").select("quiz_id,obtained_marks,total_marks,percentage,submitted_at,created_at").eq("student_id", studentId).not("submitted_at", "is", null).order("submitted_at", { ascending: false, nullsFirst: false }).limit(100);
    if (error) throw error;
    const ids = [...new Set((data || []).map((row) => Number(row.quiz_id)).filter(Boolean))];
    const { data: quizzes, error: quizError } = ids.length ? await supabase.from("quiz_tests").select("id,title,subject,scheduled_date").in("id", ids) : { data: [] as any[], error: null };
    if (quizError) throw quizError;
    const quizById = new Map((quizzes || []).map((quiz: any) => [Number(quiz.id), quiz]));
    return (data || []).map((result) => ({ result, quiz: quizById.get(Number(result.quiz_id)) }))
      .filter((item) => isOnOrAfterAdmission(student?.admission_date, item.quiz?.scheduled_date));
  };

  const prepareWeeklyOptions = async () => {
    setCategory("weekly"); setLoading(true);
    try {
      const { data, error } = await supabase.from("academy_assessments").select("id,test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("test_date", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []).filter((row) => isOnOrAfterAdmission(student?.admission_date, row.test_date) && /weekly|saturday|saturday test/i.test(`${row.test_name || ""} ${row.subject || ""}`));
      studentSaid("सैटरडे टेस्ट");
      menu(withMainMenu(rows.slice(0, 8).map((row) => ({ id: `weekly:${row.id}`, label: `${dateLabel(row.test_date)} • ${row.test_name || "सैटरडे टेस्ट"}`, icon: "▤" })).concat([{ id: "weekly:all", label: "सभी सैटरडे टेस्ट", icon: "↗" }])), rows.length ? "कौन-सा शनिवार वाला टेस्ट देखना है? सबसे नया टेस्ट सबसे ऊपर है।" : "अभी सैटरडे टेस्ट का कोई रिज़ल्ट नहीं मिला।");
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const prepareMonthlyOptions = async () => {
    setCategory("monthly"); setLoading(true);
    try {
      const response = await fetch("/api/monthly-results/publish?list=1", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Monthly results could not be loaded.");
      const periods = (payload.periods || []).filter((item: any) => Boolean(item.is_released) || (item.scheduled_release_at && Date.now() >= new Date(item.scheduled_release_at).getTime()));
      studentSaid("मंथली रिज़ल्ट");
      menu(withMainMenu(periods.slice(0, 8).map((item: any) => ({ id: `monthly:${item.month_key}`, label: monthLabel(item.month_key), icon: "★" }))), periods.length ? "किस महीने का रिज़ल्ट खोलना है? सबसे नया महीना ऊपर है।" : "अभी कोई मंथली रिज़ल्ट जारी नहीं हुआ है।");
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const reportError = (error: unknown) => {
    console.error("Racer Saathi could not load student data:", error);
    bot("अभी जानकारी नहीं मिल पाई। एक बार फिर कोशिश करें या नीचे मुख्य मेनू चुनें।");
    setOptions(withMainMenu([]));
  };

  const detail = async (id: string) => {
    if (!category) return;
    if (id === "main") { mainMenu(); return; }
    if (category === "study") {
      const action = studyActions.find((item) => item.id === id);
      if (action) void askAi(action.prompt, action.label);
      return;
    }
    studentSaid(options.find((item) => item.id === id)?.label || "जानकारी चुनें");
    setLoading(true);
    try {
      if (category === "attendance") {
        if (id === "date") { showDatePicker("date", "कैलेंडर से तारीख चुनें, मैं उसी दिन की अटेंडेंस देखूँगा।"); return; }
        await attendanceAnswer(id);
      } else if (category === "fees") {
        if (id === "month") { showDatePicker("month", "किस महीने का फीस हिसाब चाहिए? महीना चुनें।"); return; }
        if (id === "due_month") { await feesAnswer("due_month"); }
        else if (id === "due_all") await feesAnswer("due_all");
        else await feesAnswer(id);
      } else if (category === "quiz") {
        if (id === "quiz_custom" || id === "quiz_month") { showDatePicker("month", "क्विज़ किस महीने के हैं? महीना चुनें, फिर उस महीने के क्विज़ में से चुनेंगे।"); return; }
        const rows = await quizRows();
        const selected = id.startsWith("quiz:") ? rows.filter((item) => String(item.quiz?.id) === id.split(":")[1]) : rows.slice(0, 5);
        if (id === "quiz_latest") {
          const quizzes = Array.from(new Map(selected.map((item) => [item.quiz?.id, item])).values());
          menu(withMainMenu(quizzes.map((item) => ({ id: `quiz:${item.quiz?.id}`, label: `${item.quiz?.title || "क्विज़"} • ${dateLabel(item.quiz?.scheduled_date)}`, icon: "✎" }))), quizzes.length ? "कौन-सा क्विज़ रिज़ल्ट खोलना है?" : "अभी कोई नया सबमिट किया हुआ क्विज़ नहीं है।");
        } else if (!selected.length) bot("इस चयन के लिए कोई क्विज़ रिज़ल्ट नहीं मिला।");
        else bot("आपका चुना हुआ क्विज़ रिज़ल्ट 📘", selected.map((item) => ({ label: `${item.quiz?.title || "क्विज़"}${item.quiz?.subject ? ` • ${item.quiz.subject}` : ""}`, value: `${item.result.percentage != null ? `${Math.round(Number(item.result.percentage))}%` : `${item.result.obtained_marks ?? 0}/${item.result.total_marks ?? 0}`}  ›  ${dateLabel(item.quiz?.scheduled_date)}` })));
      } else if (category === "weekly") {
        const { data, error } = await supabase.from("academy_assessments").select("id,test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("test_date", { ascending: false }).limit(100);
        if (error) throw error;
        let rows = (data || []).filter((row) => isOnOrAfterAdmission(student?.admission_date, row.test_date) && /weekly|saturday|saturday test/i.test(`${row.test_name || ""} ${row.subject || ""}`));
        if (id.startsWith("weekly:" ) && id !== "weekly:all") rows = rows.filter((row) => String(row.id) === id.split(":")[1]);
        rows = id === "weekly:all" ? rows.slice(0, 12) : rows.slice(0, 1);
        bot(rows.length ? "आपकी Saturday Test रिपोर्ट 🏁" : "इस टेस्ट का रिज़ल्ट अभी उपलब्ध नहीं है।", rows.map((row) => ({ label: `${row.test_name || "Saturday Test"}${row.subject ? ` • ${row.subject}` : ""}`, value: `${row.obtained_marks ?? 0}/${row.total_marks ?? 0}  ›  ${dateLabel(row.test_date)}` })));
      } else if (category === "monthly") {
        const key = id.replace("monthly:", "");
        const response = await fetch(`/api/monthly-results/publish?monthKey=${encodeURIComponent(key)}&studentId=${studentId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "Monthly result could not be loaded.");
        const raw = payload.results?.[0]?.snapshot;
        const snapshot = raw ? filterMonthlySnapshotByAdmission(raw, student?.admission_date) : null;
        bot(snapshot?.totals?.grandTotal ? `✨ ${monthLabel(key)} — मंथली रिपोर्ट` : "इस महीने की रिपोर्ट अभी उपलब्ध नहीं है।", snapshot?.totals?.grandTotal ? [
          { label: "क्विज़ में अंक", value: `${snapshot.totals.quizObtained}/${snapshot.totals.quizTotal}` },
          { label: "सैटरडे टेस्ट अंक", value: `${snapshot.totals.weeklyObtained}/${snapshot.totals.weeklyTotal}` },
          { label: "महा टेस्ट अंक", value: `${snapshot.totals.mahaObtained}/${snapshot.totals.mahaTotal}` },
          { label: "कुल प्रतिशत", value: `${Math.round(snapshot.totals.percentage)}%  ›` },
        ] : undefined);
      } else if (category === "timetable") {
        if (id === "date") { showDatePicker("date", "जिस तारीख का टाइमटेबल चाहिए, वह चुनें। उस तारीख के weekday की क्लासें दिखेंगी।"); return; }
        const targetDate = id === "tomorrow" ? addIstDays(todayKey(), 1) : todayKey();
        if (id === "week") {
          const { data, error } = await supabase.from("timetables").select("teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
          if (error) throw error;
          const rows = matchingTimetable(data || [], student?.class_name).filter((row) => !row.is_holiday);
          bot(rows.length ? "आपका पूरे सप्ताह का क्लास ट्रैकर 🗓️" : "इस सप्ताह का टाइमटेबल नहीं मिला।", rows.slice(0, 12).map((row) => ({ label: `${row.day_of_week} • ${row.subject || "क्लास"}`, value: `${row.start_time || "समय नहीं"}${row.end_time ? `–${row.end_time}` : ""}${row.teacher_name ? ` › ${row.teacher_name}` : ""}` })));
        } else await timetableAnswer(targetDate);
      } else if (category === "homework") {
        if (id === "date") { showDatePicker("date", "होमवर्क की तारीख चुनें। मैं उसी दिन पोस्ट हुआ काम ढूँढूँगा।"); return; }
        await homeworkAnswer(id);
      } else if (category === "calendar") {
        if (id === "date") { showDatePicker("date", "किस तारीख का कैलेंडर देखना है? तारीख चुनें।"); return; }
        await calendarAnswer(id);
      }
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const matchingTimetable = (rows: any[], className: string | null | undefined) => {
    const normalized = className?.trim().toLowerCase();
    return rows.filter((row) => Array.isArray(row.class_names) && row.class_names.some((name: string) => name.trim().toLowerCase() === normalized));
  };

  const timetableAnswer = async (date: string) => {
    const { data, error } = await supabase.from("timetables").select("teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
    if (error) throw error;
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T12:00:00+05:30`));
    const rows = matchingTimetable(data || [], student?.class_name).filter((row) => String(row.day_of_week).toLowerCase() === day.toLowerCase());
    bot(`${dateLabel(date)} का टाइमटेबल (${day})`, rows.length ? rows.map((row) => ({ label: row.is_holiday ? "छुट्टी" : row.subject || "क्लास", value: row.is_holiday ? "आज क्लास नहीं है" : `${row.start_time || "समय नहीं"}${row.end_time ? `–${row.end_time}` : ""}${row.teacher_name ? `  ›  ${row.teacher_name}` : ""}` })) : [{ label: "इस दिन की क्लास", value: "टाइमटेबल में नहीं मिली" }]);
  };

  const homeworkAnswer = async (period: string, exactDate?: string) => {
    const { data, error } = await supabase.from("homework").select("title,subject,description,due_date,class_name,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const cls = student?.class_name?.trim().toLowerCase() || "";
    const now = new Date(`${todayKey()}T00:00:00`).getTime();
    let rows = (data || []).filter((row) => {
      const classes = String(row.class_name || "").split(/[,;|]/).map((value) => value.trim().toLowerCase());
      return classes.includes(cls) && isOnOrAfterAdmission(student?.admission_date, row.created_at);
    });
    if (period === "today") rows = rows.filter((row) => String(row.created_at || "").slice(0, 10) === todayKey() || row.due_date === todayKey());
    if (period === "recent") rows = rows.filter((row) => { const posted = new Date(String(row.created_at || "").slice(0, 10)).getTime(); return posted <= now && posted >= now - 7 * 86400000; });
    if (period === "date") rows = rows.filter((row) => String(row.created_at || "").slice(0, 10) === exactDate || row.due_date === exactDate);
    bot(rows.length ? "आपकी क्लास का होमवर्क बोर्ड 📚" : "इस अवधि में आपकी क्लास के लिए होमवर्क नहीं मिला।", rows.slice(0, 8).map((row) => ({ label: `${row.title || row.subject || "होमवर्क"}${row.subject ? ` • ${row.subject}` : ""}`, value: `${row.due_date ? `जमा: ${dateLabel(row.due_date)}` : "जमा तारीख नहीं"}${row.description ? `  ›  ${row.description.slice(0, 70)}` : ""}` })));
  };

  const calendarAnswer = async (kind: string, exactDate?: string) => {
    const dates = kind === "date" && exactDate ? [new Date(`${exactDate}T12:00:00`)] : Array.from({ length: 120 }, (_, offset) => new Date(`${addIstDays(todayKey(), offset)}T12:00:00`));
    const events = dates.map((date) => getStudentCalendarEvent(date)).filter((event) => event && isOnOrAfterAdmission(student?.admission_date, event.date));
    const upcoming = events.filter((event) => event!.date >= todayKey());
    const match = upcoming.filter((event) => kind === "holidays" ? event!.type === "holiday" : kind === "tests" ? event!.type === "test" : true).slice(0, 10);
    bot(kind === "holidays" ? "आने वाली छुट्टियों की झलक 🌤" : kind === "tests" ? "आने वाले टेस्ट का ट्रैकर ✏️" : "अकादमिक कैलेंडर इवेंट ◇", match.length ? match.map((event) => ({ label: event!.title, value: `${dateLabel(event!.date)}  ›  ${event!.description}` })) : [{ label: "आगे का कैलेंडर", value: "इस चयन में कोई इवेंट नहीं है" }]);
  };

  const submitPicker = async () => {
    if (!category || !picker || !pickerValue) return;
    const value = pickerValue;
    studentSaid(picker === "month" ? monthLabel(value) : dateLabel(value));
    setPicker(null); setLoading(true);
    try {
      if (category === "attendance") await attendanceAnswer("date", value);
      else if (category === "fees") await feesAnswer("month", value);
      else if (category === "quiz") {
        const rows = (await quizRows()).filter((item) => monthOf(item.quiz?.scheduled_date) === value);
        const unique = Array.from(new Map(rows.map((item) => [item.quiz?.id, item])).values());
        if (!unique.length) bot(`${monthLabel(value)} में कोई क्विज़ रिज़ल्ट नहीं मिला।`);
        else menu(withMainMenu(unique.map((item) => ({ id: `quiz:${item.quiz?.id}`, label: `${item.quiz?.title || "क्विज़"}${item.quiz?.subject ? ` • ${item.quiz.subject}` : ""}`, icon: "✎" }))), `${monthLabel(value)} के कौन-से क्विज़ का रिज़ल्ट देखना है?`);
      } else if (category === "timetable") await timetableAnswer(value);
      else if (category === "homework") await homeworkAnswer("date", value);
      else if (category === "calendar") await calendarAnswer("date", value);
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const start = () => {
    setOpen(true);
    if (!messages.length) {
      bot("नमस्ते! मैं RACER साथी हूँ—एक AI learning companion. आज किस विषय में मदद चाहिए? मैं एक बार में एक कदम लेकर समझाऊँगा।");
      setOptions(mainOptions);
    }
  };

  const submitTypedQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = typedQuestion.trim();
    if (!text || loading) return;
    setTypedQuestion("");
    const normalized = text.toLowerCase();
    const aliases: Array<[Category, string[]]> = [
      ["attendance", ["attendance", "अटेंडेंस", "उपस्थिति", "हाजिरी"]],
      ["fees", ["fees", "fee", "फीस", "भुगतान"]],
      ["quiz", ["quiz", "क्विज़", "क्विज", "क्विज़"]],
      ["weekly", ["weekly", "सैटरडे", "शनिवार", "वीकली", "weekly test"]],
      ["monthly", ["monthly", "मंथली", "मासिक", "महा टेस्ट"]],
      ["timetable", ["timetable", "time table", "टाइमटेबल", "समय सारणी"]],
      ["homework", ["homework", "होमवर्क", "गृहकार्य"]],
      ["calendar", ["calendar", "कैलेंडर", "छुट्टी", "holiday", "इवेंट", "कार्यक्रम"]],
    ];
    const match = tutorMode ? null : aliases.find(([, words]) => words.some((word) => normalized.includes(word)));
    const selected = match ? categories.find((item) => item.category === match[0]) : undefined;
    if (match && selected) { studentSaid(text); askCategory(selected, true); }
    else void askAi(text);
  };

  return <>
    <button type="button" className="racer-saathi-launcher" onClick={() => open ? setOpen(false) : start()} aria-label="RACER साथी AI खोलें">
      <span className="racer-saathi-launcher-face"><RACreature compact /></span>
      <span><strong>RACER साथी</strong><small>आपका AI learning partner</small></span><span className="racer-saathi-launcher-dot" />
    </button>
    {open && <section className="racer-saathi-panel" aria-label="रेसर साथी AI chat">
      <header className="racer-saathi-header"><span className="racer-saathi-header-mascot"><RACreature compact /></span><div><strong>RACER साथी</strong><small>Your AI study companion</small></div><span className={`racer-saathi-online ${serviceStatus}`}><i />{serviceStatus === "ready" ? "Ready" : serviceStatus === "checking" ? "Connecting" : serviceStatus === "login" ? "Sign-in needed" : serviceStatus === "setup" ? "Setup needed" : "Offline"}</span><button type="button" onClick={clearChat} aria-label="नई chat शुरू करें" title="नई chat">＋</button><button type="button" className={`racer-saathi-voice-mode ${autoSpeak ? "voice-enabled" : ""}`} onClick={() => speaking ? stopSpeech() : setAutoSpeak((enabled) => !enabled)} aria-label={speaking ? "आवाज़ रोकें" : autoSpeak ? "Voice conversation बंद करें" : "Voice conversation चालू करें"} title="Voice on करें, फिर mic से बोलें—साथी जवाब बोलकर सुनाए">{speaking ? "■" : "◖))"}<span>{autoSpeak ? "Voice on" : "Voice"}</span></button><button ref={voiceSettingsToggleRef} type="button" onClick={() => setVoiceSettingsOpen((value) => !value)} aria-expanded={voiceSettingsOpen} aria-label="Voice settings" title="Voice settings">⚙</button><button type="button" onClick={() => setOpen(false)} aria-label="बंद करें">×</button></header>
      {serviceStatus === "setup" && <div className="racer-saathi-setup-note">AI setup pending. The school information menu works; free-form AI and voice need the academy’s provider key.</div>}
      {serviceStatus === "login" && <div className="racer-saathi-setup-note">सुरक्षित AI chat के लिए sign out करके दोबारा sign in करें।</div>}
      {serviceStatus === "offline" && <div className="racer-saathi-setup-note">AI service से संपर्क नहीं हो पाया। Internet जाँचें; चाहें तो school information menu इस्तेमाल करें।</div>}
      <div className="racer-saathi-chat-scroll">
      <div className="racer-saathi-messages" aria-live="polite">
        {messages.length === 1 && messages[0].from === "bot" && <div className="racer-saathi-welcome-card"><img className="racer-saathi-welcome-mascot" src="/racer-saathi-mascot.png" alt="RACER साथी का supplied smiling robot mascot" /><div className="racer-saathi-welcome-copy"><span className="racer-saathi-eyebrow">YOUR LEARNING COMPANION</span><strong>नमस्ते{student?.student_name ? `, ${student.student_name.split(" ")[0]}` : ""}! आज क्या सीखना है?</strong><small>कुछ भी पूछें—मैं आसान भाषा में समझाऊँगा।</small><span className="racer-saathi-languages">Hindi <i /> Hinglish <i /> English</span></div></div>}
        {messages.map((message, index) => <div key={`${index}-${message.from}`} className={`racer-saathi-message ${message.from}`}>
          {message.from === "bot" && <span className="racer-saathi-message-avatar"><RACreature compact /></span>}
          <div className="racer-saathi-message-content"><div className="racer-saathi-message-text">{message.text}</div>
            {message.rows?.length ? <div className="racer-saathi-answer-card"><div className="racer-saathi-answer-cap"><span>RACER ACADEMY • STUDENT REPORT</span><span>↗</span></div>{message.rows.map((row, rowIndex) => <div className="racer-saathi-answer-row" key={`${row.label}-${rowIndex}`}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div> : null}
            {message.from === "bot" && message.text && !message.rows?.length && <div className="racer-saathi-message-actions"><button type="button" onClick={() => void playAnswer(message.text)} aria-label="उत्तर फिर से सुनें" title="उत्तर सुनें">🔊 सुनें</button><button type="button" onClick={() => { void navigator.clipboard?.writeText(message.text).then(() => setVoiceNotice("उत्तर copy हो गया।")).catch(() => setVoiceNotice("इस browser में copy उपलब्ध नहीं है।")); }} aria-label="उत्तर copy करें">Copy</button><button type="button" onClick={() => toggleSavedAnswer(message.text)} aria-label={savedAnswers.includes(message.text) ? "Saved answer हटाएँ" : "उत्तर save करें"}>{savedAnswers.includes(message.text) ? "★ Saved" : "☆ Save"}</button></div>}
          </div>
        </div>)}
        {loading && (messages.at(-1)?.from !== "bot" || !messages.at(-1)?.text) && <div className="racer-saathi-message bot"><span className="racer-saathi-message-avatar"><RACreature compact /></span><div className="racer-saathi-message-content"><div className="racer-saathi-message-text">साथी सोच रहा है <span className="saathi-typing">•••</span></div></div></div>}
        <div ref={messagesEndRef} />
      </div>
      {messages.length === 1 && <div className="racer-saathi-suggestions"><span>शुरू करने के लिए चुनें</span><div><button type="button" onClick={() => void askAi("Help me learn a topic step by step. Ask me what subject and topic I want to study.", "मुझे पढ़ाई में मदद करें")}>✨ <span>पढ़ाई में मदद</span></button><button type="button" onClick={() => void askAi("Give me a short class-level practice quiz. First ask which subject I want.", "एक quiz शुरू करें")}>📝 <span>Quiz practice</span></button><button type="button" onClick={() => { setToolShelfOpen(true); setOptions(mainOptions); }}>📚 <span>मेरी school info</span></button></div></div>}
      {picker && <div className="racer-saathi-picker"><label>{picker === "month" ? "महीना चुनें" : "तारीख चुनें"}<input type={picker} value={pickerValue} onChange={(event) => setPickerValue(event.target.value)} /></label><button type="button" onClick={() => void submitPicker()} disabled={loading || !pickerValue}>दिखाएँ <span>→</span></button></div>}
      {(category || toolShelfOpen) && <div className="racer-saathi-tool-shelf"><div className="racer-saathi-tool-heading"><strong>{category ? "अपनी school information चुनें" : "आप किस बारे में पूछना चाहते हैं?"}</strong><button type="button" onClick={() => { setToolShelfOpen(false); setCategory(null); setOptions([]); }} aria-label="सवालों का मेनू बंद करें">×</button></div>
      {!category && <div className="racer-saathi-menu">{mainOptions.filter((option) => option.id !== "other").map((option) => <button key={option.id} type="button" onClick={() => { const selected = categories.find((item) => item.id === option.id); if (selected) askCategory(selected); }} disabled={loading}><span>{option.icon || "›"}</span>{option.label}<b>→</b></button>)}</div>}
      {category && <div className="racer-saathi-menu">{options.map((option) => <button key={option.id} type="button" onClick={() => {
        if (option.id === "main") { studentSaid(option.label); mainMenu(); return; }
        void detail(option.id);
      }} disabled={loading}><span>{option.icon || "›"}</span>{option.label}<b>→</b></button>)}</div>}
      </div>}
      </div>
      <div className="racer-saathi-compose-area">
      {voiceNotice && <div className={`racer-saathi-voice-notice ${recording ? "listening" : speaking ? "speaking" : ""}`} role="status">{recording && <span className="racer-saathi-live-wave"><i/><i/><i/><i/><i/></span>}{voiceNotice}</div>}
      {voiceSettingsOpen && <div className="racer-saathi-voice-settings-inline" ref={voiceSettingsRef}><div className="racer-saathi-settings-heading"><strong>Voice settings</strong><button type="button" onClick={() => setVoiceSettingsOpen(false)} aria-label="Close voice settings">×</button></div><label>AI voice<select value={voice} onChange={(event) => setVoice(event.target.value)}><option value="shimmer">Shimmer · default</option><option value="coral">Coral</option><option value="marin">Marin</option><option value="cedar">Cedar</option></select></label><label>Speed <strong>{voiceSpeed.toFixed(2)}×</strong><input type="range" min="0.75" max="1.25" step="0.05" value={voiceSpeed} onChange={(event) => setVoiceSpeed(Number(event.target.value))} /></label><span>Voice replies {autoSpeak ? "on" : "off"} · {savedAnswers.length} saved answers on this device.</span><div className="racer-saathi-settings-actions"><button type="button" className="racer-saathi-settings-save" onClick={() => { localStorage.setItem("racer-saathi-voice-preferences", JSON.stringify({ voice, speed: voiceSpeed, autoSpeak })); setVoiceSettingsOpen(false); }}>Save changes</button><button type="button" onClick={clearSavedAnswers} disabled={!savedAnswers.length}>Clear saved answers</button></div></div>}
      <form className="racer-saathi-composer" onSubmit={submitTypedQuestion}>
        <button type="button" className="racer-saathi-tools-toggle" onClick={() => { setToolShelfOpen((shown) => !shown); setCategory(null); setOptions(mainOptions); }} aria-expanded={toolShelfOpen || Boolean(category)} aria-label="School information and study tools" title="School information and study tools">＋</button>
        <textarea ref={questionInputRef} value={typedQuestion} onChange={(event) => { setTypedQuestion(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 150)}px`; }} placeholder={recording ? "साथी सुन रहा है… mic रोकने के लिए फिर दबाएँ" : "साथी से कुछ भी पूछें"} aria-label="रेसर साथी से सवाल पूछें" rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
        <button type="button" className={`racer-saathi-mic ${recording ? "recording" : ""}`} onClick={() => void toggleRecording()} disabled={loading || transcribing || serviceStatus !== "ready"} aria-label={recording ? "Recording रोकें" : transcribing ? "Voice transcription चल रही है" : "अपना सवाल बोलें"} title={recording ? "रोकें" : "बोलकर सवाल पूछें"}>{recording ? "■" : transcribing ? "…" : "🎙"}</button>
        <button type="submit" className="racer-saathi-send" aria-label="सवाल भेजें" disabled={!typedQuestion.trim() || loading}>{loading ? "…" : "↑"}</button>
      </form>
      <div className="racer-saathi-compose-hint">Enter से भेजें <i /> AI गलतियाँ कर सकता है—ज़रूरी जानकारी जाँचें</div>
      </div>
    </section>}
    <style jsx>{`
      .racer-mascot{width:64px;height:64px;display:block;object-fit:contain;filter:drop-shadow(0 5px 6px #0a285b30)}.racer-mascot.compact{width:46px;height:46px}
      .racer-saathi-launcher{position:fixed;z-index:1200;right:24px;bottom:24px;display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border:1px solid #c9e3ff;border-radius:999px;background:linear-gradient(120deg,#fff,#eef7ff);box-shadow:0 12px 35px #173c6a30;color:#173d72;cursor:pointer;text-align:left;animation:saathi-float 3s ease-in-out infinite}.racer-saathi-launcher-face{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#e3f5ff}.racer-saathi-launcher strong,.racer-saathi-launcher small{display:block}.racer-saathi-launcher strong{font-size:13px;font-weight:900}.racer-saathi-launcher small{font-size:10px;color:#6b7f9e;margin-top:2px}.racer-saathi-launcher-dot{width:9px;height:9px;background:#27be82;border:2px solid white;border-radius:50%;position:absolute;left:45px;top:7px}
      .racer-saathi-panel{position:fixed;z-index:1201;right:24px;bottom:82px;width:min(410px,calc(100vw - 28px));height:min(680px,calc(100dvh - 125px));min-height:390px;background:#f4f8ff;border:1px solid #d8e5f5;border-radius:24px;box-shadow:0 24px 75px #122f5840;display:flex;flex-direction:column;overflow:hidden;color:#17365d}.racer-saathi-header{padding:12px 15px;display:flex;align-items:center;gap:11px;color:white;background:linear-gradient(115deg,#103c87,#2577d5)}.racer-saathi-header-mascot{width:50px;height:50px;border-radius:16px;background:#ffffff20;display:grid;place-items:center}.racer-saathi-header>div{flex:1;min-width:0}.racer-saathi-header strong,.racer-saathi-header small{display:block}.racer-saathi-header strong{font-size:15px;font-weight:900}.racer-saathi-header small{font-size:10px;opacity:.85;margin-top:3px}.racer-saathi-header button{width:33px;height:33px;border:0;border-radius:50%;background:#ffffff24;color:white;font-size:24px;cursor:pointer}
      .racer-saathi-messages{flex:1;overflow:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}.racer-saathi-message{max-width:96%;white-space:pre-line;animation:saathi-pop .2s ease-out}.racer-saathi-message.bot{align-self:flex-start}.racer-saathi-message.student{align-self:flex-end;max-width:88%}.racer-saathi-message-text{padding:10px 12px;border-radius:15px;font-size:12px;line-height:1.5;box-shadow:0 3px 10px #274d7710}.racer-saathi-message.bot .racer-saathi-message-text{border:1px solid #e2ebf7;background:white;border-bottom-left-radius:5px}.racer-saathi-message.student .racer-saathi-message-text{background:linear-gradient(120deg,#e2efff,#e9e8ff);color:#174d91;border-bottom-right-radius:5px;font-weight:750}
      .racer-saathi-answer-card{margin-top:7px;padding:9px 11px;border:1px solid #d9e6f6;border-radius:14px;background:white;box-shadow:0 7px 18px #17457610}.racer-saathi-answer-cap{display:flex;justify-content:space-between;align-items:center;padding:0 0 6px;color:#7290b3;font-size:8px;letter-spacing:1.1px;font-weight:900;border-bottom:1px solid #eaf0f7}.racer-saathi-answer-cap span:last-child{font-size:13px;color:#2877d4}.racer-saathi-answer-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:7px 1px;border-bottom:1px dashed #e8eef6;font-size:10px}.racer-saathi-answer-row:last-child{border-bottom:0}.racer-saathi-answer-row>span{color:#7889a3}.racer-saathi-answer-row strong{color:#193e72;font-size:11px;text-align:right;max-width:190px;overflow-wrap:anywhere}
      .racer-saathi-menu-label,.racer-saathi-shortcuts-label{font-size:9px;letter-spacing:.6px;font-weight:900;color:#7b8ca6;padding:7px 13px}.racer-saathi-shortcuts-label{display:flex;justify-content:space-between;align-items:center;padding:6px 13px 4px}.racer-saathi-shortcuts-label span{font-size:8px;letter-spacing:0;font-weight:700;color:#9ba8ba}.racer-saathi-menu{max-height:118px;overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 11px 6px}.racer-saathi-menu button{min-width:0;display:grid;grid-template-columns:22px 1fr 13px;align-items:center;gap:6px;padding:7px;border:1px solid #dce7f5;border-radius:12px;background:white;color:#23456f;font-size:9px;font-weight:800;text-align:left;cursor:pointer;box-shadow:0 3px 9px #23456f08;transition:transform .16s,border-color .16s,box-shadow .16s}.racer-saathi-menu button:hover{transform:translateY(-1px);border-color:#7cb6ff;box-shadow:0 6px 13px #23456f14}.racer-saathi-menu button span{width:22px;height:22px;border-radius:8px;display:grid;place-items:center;background:#e9f3ff;color:#256ad0;font-size:13px}.racer-saathi-menu button b{color:#3a81d4;font-size:12px;text-align:right}.racer-saathi-menu button:disabled{opacity:.55;cursor:wait}
      .racer-saathi-shortcuts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:0 10px 7px}.racer-saathi-shortcuts button{min-width:0;min-height:46px;padding:5px 3px;border:1px solid #dce7f5;border-radius:11px;background:#fff;color:#285081;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.racer-saathi-shortcuts button span{font-size:14px;color:#2673ce;font-weight:900}.racer-saathi-shortcuts button small{font-size:7px;line-height:1.1;text-align:center;font-weight:850}.racer-saathi-shortcuts button:disabled{opacity:.55}.racer-saathi-composer{display:flex;align-items:center;gap:7px;padding:7px 10px 10px;border-top:1px solid #e6edf6;background:#fff}.racer-saathi-composer input{flex:1;min-width:0;height:37px;padding:0 12px;border:1px solid #d7e3f2;border-radius:999px;outline:none;color:#173d72;font-size:11px}.racer-saathi-composer input:focus{border-color:#5da1ec;box-shadow:0 0 0 3px #2d83df18}.racer-saathi-composer button{width:37px;height:37px;border:0;border-radius:50%;background:#2673d0;color:white;font-size:17px;cursor:pointer}.racer-saathi-composer button:disabled{opacity:.45}
      .racer-saathi-picker{display:flex;gap:8px;align-items:end;padding:4px 12px 8px}.racer-saathi-picker label{display:flex;flex:1;flex-direction:column;gap:4px;color:#7284a0;font-size:9px;font-weight:850}.racer-saathi-picker input{min-width:0;width:100%;height:36px;padding:0 8px;border:1px solid #cbdcf2;border-radius:10px;background:white;color:#193e72;font:inherit;font-size:12px}.racer-saathi-picker>button{height:36px;padding:0 12px;border:0;border-radius:10px;background:#226bd0;color:white;font-size:10px;font-weight:900;cursor:pointer}.racer-saathi-picker>button span{margin-left:6px}.racer-saathi-picker>button:disabled{opacity:.55}.saathi-typing{display:inline-block;letter-spacing:2px;color:#3987df;animation:saathi-dots .8s infinite alternate}
      @keyframes saathi-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes saathi-pop{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes saathi-dots{to{opacity:.25;transform:translateY(-2px)}}
      @media(max-width:600px){.racer-saathi-launcher{right:12px;bottom:82px;padding:6px 12px 6px 6px}.racer-saathi-launcher-face{width:44px;height:44px}.racer-saathi-launcher strong{font-size:12px}.racer-saathi-panel{right:8px;bottom:130px;width:calc(100vw - 16px);height:min(720px,calc(100dvh - 155px));min-height:350px;border-radius:20px}.racer-saathi-menu{max-height:110px;gap:5px}.racer-saathi-menu button{padding:6px;font-size:8px}.racer-saathi-shortcuts button{min-height:42px}.racer-saathi-shortcuts button small{font-size:6.5px}.racer-saathi-answer-row{font-size:9px}}
      @media(prefers-reduced-motion:reduce){.racer-saathi-launcher,.saathi-typing{animation:none}.racer-saathi-menu button{transition:none}}
      .racer-saathi-panel{box-sizing:border-box;right:18px;bottom:18px;width:min(455px,calc(100vw - 36px));height:min(820px,calc(100dvh - 36px));min-height:460px;border-radius:26px;background:#f7faff;box-shadow:0 22px 75px #102f5a44}
      .racer-saathi-header{min-height:68px;padding:9px 13px;background:linear-gradient(110deg,#063b7d,#0865bd);box-shadow:0 4px 16px #00356b25}
      .racer-saathi-header-mascot{width:48px;height:48px;border:1px solid #ffffff35;border-radius:50%;background:#ffffff16}
      .racer-saathi-header strong{font-size:13px;letter-spacing:.3px}.racer-saathi-header small{font-size:11px;font-weight:800}.racer-saathi-online{display:flex;align-items:center;gap:5px;font-size:9px;font-weight:800;opacity:.95}.racer-saathi-online i{width:8px;height:8px;border-radius:50%;background:#33e69b;box-shadow:0 0 0 3px #33e69b24}.racer-saathi-header button{border:1px solid #ffffff40;background:#ffffff16}
      .racer-saathi-messages{min-height:0;padding:13px 11px 10px;background:linear-gradient(180deg,#fff,#f4f9ff)}
      .racer-saathi-welcome-card{position:relative;display:flex;align-items:center;gap:11px;margin:1px 1px 4px;padding:9px 12px;border:1px solid #d9ecff;border-radius:18px;background:radial-gradient(circle at 14% 35%,#fff 0,#edf8ff 62%,#f4f6ff 100%);overflow:hidden}
      .racer-saathi-welcome-card:after{content:"✦  ✧  ✦";position:absolute;right:12px;top:7px;color:#75b9f6;font-size:12px;letter-spacing:7px}
      .racer-saathi-buddy{width:86px;height:96px;flex:none;position:relative;display:flex;align-items:center;flex-direction:column;justify-content:flex-end;animation:buddy-bob 2.8s ease-in-out infinite}
      .racer-saathi-buddy-head{position:absolute;z-index:1;top:0;left:14px;width:60px;height:57px;border-radius:22px;background:#dff5ff;display:grid;place-items:center;box-shadow:0 4px 12px #1a60a526}
      .racer-saathi-buddy-head .racer-mascot{width:63px;height:63px}
      .racer-saathi-buddy-body{width:62px;height:43px;margin-bottom:0;border:2px solid #c4e9ff;border-radius:20px 20px 12px 12px;background:linear-gradient(145deg,#fff,#d9f0ff);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#164787;box-shadow:0 5px 12px #1a60a51c}
      .racer-saathi-buddy-body strong{font-size:9px;letter-spacing:1px}.racer-saathi-buddy-body small{font-size:6px;letter-spacing:1.6px;font-weight:900}
      .racer-saathi-wave-arm{position:absolute;z-index:2;right:-1px;top:39px;font-size:21px;transform-origin:bottom center;animation:buddy-wave 1.6s ease-in-out infinite}
      .racer-saathi-welcome-copy{display:flex;flex-direction:column;gap:5px;padding-top:9px}.racer-saathi-welcome-copy strong{font-size:13px;color:#1462b4}.racer-saathi-welcome-copy span{font-size:10px;color:#527294}
      .racer-saathi-message{display:flex;align-items:flex-end;gap:6px;max-width:100%;white-space:normal}
      .racer-saathi-message.bot{align-self:flex-start;width:100%}.racer-saathi-message.student{align-self:flex-end;max-width:84%;width:max-content}
      .racer-saathi-message-avatar{width:29px;height:29px;flex:none;border-radius:50%;display:grid;place-items:center;background:#e4f5ff;border:1px solid #cae8ff;box-shadow:0 2px 5px #1c4e7b14}.racer-saathi-message-avatar .racer-mascot{width:32px;height:32px}
      .racer-saathi-message-content{min-width:0;max-width:calc(100% - 35px);}.racer-saathi-message.student .racer-saathi-message-content{max-width:100%}
      .racer-saathi-message-text{font-size:11px;line-height:1.55;padding:10px 12px}.racer-saathi-message.bot .racer-saathi-message-text{border:1px solid #d6e8f8;background:#edf6ff;border-radius:15px 15px 15px 5px;color:#18385f}.racer-saathi-message.student .racer-saathi-message-text{border-radius:15px 15px 5px 15px;background:linear-gradient(115deg,#0876f3,#218cff);color:#fff;box-shadow:0 5px 13px #1674df35}
      .racer-saathi-answer-card{border:1px solid #cae2f8;border-radius:13px;background:#fff}.racer-saathi-answer-cap{font-size:7px;letter-spacing:.8px}.racer-saathi-answer-row{font-size:9px;padding:6px 1px}.racer-saathi-answer-row strong{font-size:10px}
      .racer-saathi-menu-label{padding:6px 12px 5px;color:#416589;font-size:9px;letter-spacing:.4px}
      .racer-saathi-menu{max-height:114px;padding:0 10px 6px;gap:6px}.racer-saathi-menu button{min-height:37px;padding:6px 8px;border-color:#cfe2f5;border-radius:11px;background:#fff;font-size:9px}.racer-saathi-menu button span{background:#eaf5ff;color:#1472d2}.racer-saathi-menu button b{color:#1378e8}
      .racer-saathi-shortcuts-label{padding:6px 12px 5px;color:#416589;font-size:9px}
      .racer-saathi-shortcuts{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:0 10px 8px}
      .racer-saathi-shortcuts button{min-height:56px;border-color:#cfe2f5;border-radius:13px;background:#fff;box-shadow:0 3px 8px #125ca010;transition:transform .16s,border-color .16s,box-shadow .16s}
      .racer-saathi-shortcuts button:hover{transform:translateY(-2px);border-color:#71b6f6;box-shadow:0 7px 15px #125ca018}
      .racer-saathi-shortcuts button span{width:27px;height:27px;border-radius:9px;background:#eef7ff;display:grid;place-items:center;font-size:17px}
      .racer-saathi-shortcuts button small{font-size:8px;color:#173d72}
      .racer-saathi-picker{background:#fff;border-top:1px solid #e3edf8;padding:8px 12px}.racer-saathi-picker label{font-size:9px}.racer-saathi-picker input{height:38px;border-color:#cbdff4}.racer-saathi-picker>button{height:38px;background:linear-gradient(110deg,#0876f3,#218cff)}
      .racer-saathi-composer{padding:8px 10px max(10px,env(safe-area-inset-bottom));border-top:1px solid #dce9f6;background:#fff}.racer-saathi-composer input{height:40px;background:#f8fbff;border-color:#d5e5f6;font-size:10px}.racer-saathi-composer input::placeholder{color:#93a8c0}.racer-saathi-composer button{width:40px;height:40px;background:linear-gradient(120deg,#0876f3,#1375e8);box-shadow:0 5px 12px #1874dd35}
      .racer-saathi-header{gap:7px}.racer-saathi-header>div{flex:1}.racer-saathi-header button{flex:none;width:31px;height:31px;padding:0;display:grid;place-items:center;font-size:16px}.racer-saathi-header button.voice-enabled{background:#ffffff34;color:#fff1a8}
      .racer-saathi-online{white-space:nowrap;font-size:8px}.racer-saathi-online.setup i,.racer-saathi-online.login i,.racer-saathi-online.offline i{background:#ffd36c;box-shadow:0 0 0 3px #ffd36c24}.racer-saathi-online.login i,.racer-saathi-online.offline i{background:#ff8b91;box-shadow:0 0 0 3px #ff8b9124}
      .racer-saathi-welcome-card{min-height:124px}.racer-saathi-welcome-mascot{position:relative;z-index:1;width:104px;height:126px;flex:none;object-fit:contain;filter:drop-shadow(0 7px 8px #1162a522)}.racer-saathi-welcome-copy{position:relative;z-index:1;gap:6px}.racer-saathi-welcome-copy strong{font-size:14px}.racer-saathi-welcome-copy small{font-size:9px;line-height:1.5;color:#70849e}
      .racer-saathi-setup-note{padding:8px 12px;background:#fff8df;color:#735510;border-bottom:1px solid #f1e4b8;font-size:9px;line-height:1.5;font-weight:700}
      .racer-saathi-message-actions{display:flex;gap:6px;padding:4px 3px 0}.racer-saathi-message-actions button{border:0;background:transparent;color:#47749f;font:inherit;font-size:9px;font-weight:800;cursor:pointer}.racer-saathi-message-actions button:hover{color:#0876d8}
      .racer-saathi-voice-settings-inline{display:grid;grid-template-columns:1fr 1.2fr;gap:8px 12px;padding:9px 12px;background:#eef7ff;border-top:1px solid #d5e8fa;color:#476789;font-size:9px}.racer-saathi-voice-settings-inline label{display:flex;align-items:center;gap:5px;font-weight:800}.racer-saathi-voice-settings-inline select{max-width:120px;border:1px solid #cadff4;border-radius:8px;padding:5px;background:white;color:#1b4f88;font-size:9px}.racer-saathi-voice-settings-inline input{width:86px;accent-color:#1685ee}.racer-saathi-voice-settings-inline>span{grid-column:1/-1;color:#70869d;font-size:8px;line-height:1.4}
      .racer-saathi-settings-heading{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;color:#173d72;font-size:11px;font-weight:900}.racer-saathi-settings-heading button{width:28px;height:28px;border:1px solid #d5e4f2;border-radius:9px;background:#fff;color:#526b86;font-size:19px;line-height:1;cursor:pointer}.racer-saathi-settings-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:7px}.racer-saathi-settings-actions button{min-height:34px;padding:0 11px;border:1px solid #cadff4;border-radius:9px;background:#fff;color:#285081;font-size:9px;font-weight:850;cursor:pointer}.racer-saathi-settings-actions button:disabled{opacity:.5;cursor:not-allowed}.racer-saathi-settings-actions .racer-saathi-settings-save{border-color:#1768c1;background:#1768c1;color:#fff}
      .racer-saathi-voice-notice{padding:5px 12px;background:#f0f8ff;color:#386894;font-size:8px;line-height:1.4}.racer-saathi-voice-notice.listening{background:#e9f9ff;color:#0873ae}.racer-saathi-voice-notice.speaking{background:#f0f1ff;color:#5058a9}
      .racer-saathi-composer .racer-saathi-mic{flex:none;font-size:16px;background:#eaf5ff;color:#126bd0;box-shadow:none;border:1px solid #c9e1f8}.racer-saathi-composer .racer-saathi-mic.recording{background:#fff0f0;color:#bd2636;border-color:#ffc4c7;animation:mic-pulse .9s infinite alternate}.racer-saathi-composer .racer-saathi-mic:disabled{background:#edf1f6;color:#a2afbf;box-shadow:none}
      @keyframes mic-pulse{to{box-shadow:0 0 0 5px #ff5d6b24}}
      @keyframes buddy-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes buddy-wave{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(17deg)}}
      @media(max-width:600px){.racer-saathi-panel{inset:0;width:100vw;height:100dvh;min-height:0;right:auto;bottom:auto;border:0;border-radius:0;box-shadow:none;padding-top:env(safe-area-inset-top)}.racer-saathi-header{min-height:72px;padding:8px 9px;gap:5px}.racer-saathi-header-mascot{width:40px;height:40px;flex:none}.racer-saathi-header-mascot .racer-mascot{width:38px;height:38px}.racer-saathi-header button{width:28px;height:30px;font-size:14px}.racer-saathi-online{font-size:7px}.racer-saathi-messages{padding:12px 10px 8px}.racer-saathi-welcome-card{min-height:118px;padding:7px 9px}.racer-saathi-welcome-mascot{width:91px;height:112px}.racer-saathi-shortcuts{gap:5px;padding:0 9px 7px}.racer-saathi-shortcuts button{min-height:52px}.racer-saathi-menu{max-height:103px}.racer-saathi-panel .racer-saathi-menu-label{padding-top:5px}.racer-saathi-composer{padding-bottom:max(12px,env(safe-area-inset-bottom))}.racer-saathi-voice-settings-inline{grid-template-columns:1fr;gap:7px}.racer-saathi-voice-settings-inline>span{grid-column:auto}}
      @media(prefers-reduced-motion:reduce){.racer-saathi-buddy,.racer-saathi-wave-arm{animation:none}}
      .racer-saathi-panel{z-index:10050;inset:50% auto auto 50%;right:auto;bottom:auto;transform:translate(-50%,-50%);width:min(880px,calc(100vw - 48px));height:min(900px,calc(100dvh - 48px));min-height:560px;border:1px solid #dce8f6;border-radius:24px;background:#fff;box-shadow:0 30px 100px #0a214255}
      .racer-saathi-header{min-height:76px;padding:12px 20px;gap:12px;background:#fff;color:#14243b;border-bottom:1px solid #e9edf3;box-shadow:none}
      .racer-saathi-header-mascot{width:46px;height:46px;background:#edf7ff;border:1px solid #dbeeff}
      .racer-saathi-header>div{flex:1}.racer-saathi-header strong{font-size:15px;color:#14243b}.racer-saathi-header small{color:#7b8798;opacity:1;font-size:11px}.racer-saathi-header button{width:38px;height:38px;border:1px solid #e5eaf0;background:#fff;color:#475569;font-size:18px;border-radius:12px}.racer-saathi-header button:hover{background:#f3f7fb}.racer-saathi-header button.voice-enabled{background:#e9f6ff;border-color:#b9e3ff;color:#0878d1}
      .racer-saathi-header .racer-saathi-voice-mode{width:auto;min-width:78px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:15px}.racer-saathi-voice-mode span{font-size:10px;font-weight:850}
      .racer-saathi-online{color:#66758a;font-size:10px}.racer-saathi-online i{background:#23b578;box-shadow:0 0 0 3px #23b57819}.racer-saathi-online.setup i,.racer-saathi-online.login i,.racer-saathi-online.offline i{background:#efa92e;box-shadow:0 0 0 3px #efa92e22}
      .racer-saathi-chat-scroll{min-height:0;flex:1;display:flex;flex-direction:column;overflow:auto;background:#fff;scrollbar-color:#cbd5e1 transparent;scrollbar-width:thin}
      .racer-saathi-messages{width:min(100%,760px);margin:0 auto;flex:1 0 auto;overflow:visible;padding:30px 24px 16px;gap:22px;background:#fff}
      .racer-saathi-welcome-card{margin:0 auto 18px;width:min(100%,660px);min-height:144px;padding:14px 20px;border:0;border-radius:20px;background:linear-gradient(115deg,#f3f9ff,#f7f7ff)}.racer-saathi-welcome-card:after{display:none}.racer-saathi-welcome-mascot{width:110px;height:126px}.racer-saathi-welcome-copy{gap:7px;padding:0}.racer-saathi-welcome-copy .racer-saathi-eyebrow{font-size:9px;letter-spacing:1.3px;font-weight:900;color:#73839a}.racer-saathi-welcome-copy strong{font-size:19px;color:#172e4d}.racer-saathi-welcome-copy small{font-size:12px;color:#63748a}.racer-saathi-welcome-copy .racer-saathi-languages{display:flex;align-items:center;gap:8px;font-size:10px;color:#64748b}.racer-saathi-languages i{width:3px;height:3px;border-radius:50%;background:#94a3b8}
      .racer-saathi-message{gap:11px}.racer-saathi-message.bot{width:100%}.racer-saathi-message.student{max-width:78%}.racer-saathi-message-avatar{width:34px;height:34px;margin-bottom:20px}.racer-saathi-message-content{max-width:calc(100% - 46px)}.racer-saathi-message-text{font-size:14px;line-height:1.72;padding:14px 17px;border-radius:18px!important;box-shadow:none}.racer-saathi-message.bot .racer-saathi-message-text{border:0;background:#f5f7fa;color:#1f2937}.racer-saathi-message.student .racer-saathi-message-text{background:#e8f3ff;color:#164e87;box-shadow:none}.racer-saathi-message-actions{gap:10px;padding:8px 4px 0}.racer-saathi-message-actions button{padding:4px 7px;border-radius:7px;font-size:11px;color:#69788c}.racer-saathi-message-actions button:hover{background:#f1f5f9}
      .racer-saathi-suggestions{width:min(100%,660px);margin:0 auto 24px;padding:0 0 12px}.racer-saathi-suggestions>span{display:block;margin-bottom:10px;color:#7b8798;font-size:11px;font-weight:700}.racer-saathi-suggestions>div{display:flex;flex-wrap:wrap;gap:9px}.racer-saathi-suggestions button{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid #e1e8f0;border-radius:14px;background:#fff;color:#355270;font-size:13px;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}.racer-saathi-suggestions button:hover{background:#f4f9ff;border-color:#a8d5fb;transform:translateY(-1px)}
      .racer-saathi-tool-shelf{width:min(100%,700px);margin:0 auto 18px;padding:14px;border:1px solid #e5ebf2;border-radius:18px;background:#fbfcfe}.racer-saathi-tool-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;color:#30425a;font-size:12px}.racer-saathi-tool-heading button{border:0;background:transparent;color:#64748b;font-size:20px;cursor:pointer}.racer-saathi-menu{max-height:190px;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0}.racer-saathi-menu button{grid-template-columns:26px 1fr 13px;padding:9px 10px;border-radius:12px;font-size:11px;box-shadow:none}
      .racer-saathi-picker{width:min(100%,700px);margin:0 auto;padding:8px 14px 16px}.racer-saathi-setup-note{padding:10px 20px;font-size:11px}.racer-saathi-compose-area{flex:none;padding:14px 20px 10px;border-top:1px solid #edf0f4;background:#fff}.racer-saathi-composer{width:min(100%,760px);margin:0 auto;padding:8px 9px;border:1px solid #d8e0ea;border-radius:20px;gap:9px;background:#fff;box-shadow:0 3px 12px #1a2a3b0a}.racer-saathi-composer textarea{flex:1;min-width:0;min-height:42px;max-height:150px;resize:none;overflow-y:auto;padding:11px 8px;border:0;outline:none;background:transparent;color:#172b45;font:inherit;font-size:14px;line-height:1.45}.racer-saathi-composer textarea:focus{box-shadow:none}.racer-saathi-composer button{width:40px;height:40px;flex:none}.racer-saathi-composer .racer-saathi-tools-toggle{border:0;background:#f2f5f8;color:#475569;font-size:22px}.racer-saathi-composer .racer-saathi-mic{border:0;background:#f2f5f8;color:#475569;font-size:17px}.racer-saathi-composer .racer-saathi-mic.recording{background:#fff0f0;color:#c62838;border:0}.racer-saathi-composer .racer-saathi-send{background:#164e87;color:#fff;font-size:22px;font-weight:800}.racer-saathi-compose-hint{width:min(100%,760px);margin:7px auto 0;text-align:center;color:#98a3b2;font-size:9px}.racer-saathi-compose-hint i{display:inline-block;width:3px;height:3px;margin:0 6px 2px;border-radius:50%;background:#aab4c0}
      .racer-saathi-voice-settings-inline{width:min(100%,760px);margin:0 auto 10px;padding:12px 14px;border:1px solid #e4eaf1;border-radius:14px;background:#f8fafc;font-size:11px}.racer-saathi-voice-settings-inline>span{font-size:10px}.racer-saathi-voice-notice{display:flex;align-items:center;justify-content:center;gap:9px;width:min(100%,760px);margin:0 auto 8px;padding:8px 12px;border-radius:10px;font-size:10px}.racer-saathi-live-wave{height:15px;display:flex;align-items:center;gap:2px}.racer-saathi-live-wave i{display:block;width:3px;height:5px;border-radius:4px;background:#1685ee;animation:saathi-wave .8s ease-in-out infinite alternate}.racer-saathi-live-wave i:nth-child(2),.racer-saathi-live-wave i:nth-child(4){animation-delay:.2s}.racer-saathi-live-wave i:nth-child(3){animation-delay:.4s}.racer-saathi-compose-area .racer-saathi-voice-notice+.racer-saathi-voice-settings-inline{margin-top:0}
      @keyframes saathi-wave{to{height:14px}}@media(max-width:600px){.racer-saathi-panel{inset:0;width:100vw;height:100dvh;min-height:0;transform:none;border:0;border-radius:0;padding-top:env(safe-area-inset-top)}.racer-saathi-header{min-height:64px;padding:8px 10px;gap:6px}.racer-saathi-header-mascot{width:38px;height:38px}.racer-saathi-header-mascot .racer-mascot{width:36px;height:36px}.racer-saathi-header strong{font-size:13px}.racer-saathi-header small{font-size:9px}.racer-saathi-header button{width:32px;height:32px;border-radius:10px;font-size:15px}.racer-saathi-header .racer-saathi-voice-mode{width:auto;min-width:65px;padding:0 6px;gap:3px}.racer-saathi-voice-mode span{font-size:8px}.racer-saathi-online{font-size:8px}.racer-saathi-messages{width:100%;padding:18px 14px 12px;gap:18px}.racer-saathi-welcome-card{min-height:112px;padding:8px 10px;margin-bottom:8px}.racer-saathi-welcome-mascot{width:82px;height:100px}.racer-saathi-welcome-copy strong{font-size:15px}.racer-saathi-welcome-copy small{font-size:10px}.racer-saathi-message-text{font-size:13px;padding:12px 14px}.racer-saathi-message.student{max-width:88%}.racer-saathi-suggestions{padding:0 14px;margin-bottom:18px}.racer-saathi-suggestions>div{gap:7px}.racer-saathi-suggestions button{padding:8px 10px;font-size:11px}.racer-saathi-tool-shelf{width:calc(100% - 20px);padding:10px}.racer-saathi-menu{grid-template-columns:repeat(2,minmax(0,1fr));max-height:30dvh;overflow:auto}.racer-saathi-menu button{font-size:10px}.racer-saathi-compose-area{padding:9px 10px max(9px,env(safe-area-inset-bottom))}.racer-saathi-composer{padding:5px;gap:5px;border-radius:18px}.racer-saathi-composer textarea{font-size:13px;min-height:39px;padding:10px 5px}.racer-saathi-composer button{width:36px;height:36px}.racer-saathi-compose-hint{font-size:8px}.racer-saathi-voice-settings-inline{grid-template-columns:1fr;gap:8px}.racer-saathi-voice-settings-inline>span{grid-column:auto}}
    `}</style>
  </>;
}
