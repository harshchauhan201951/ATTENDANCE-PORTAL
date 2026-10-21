"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getStudentCalendarEvents, type CalendarEvent } from "../../../lib/student-calendar-events";
import { isHiddenStudentTimetableTeacher } from "../../../lib/student-timetable";
import { isOnOrAfterAdmission } from "../../../lib/admission-date";
import { filterMonthlySnapshotByAdmission } from "../../../lib/monthly-result";
import StudentBirthdayWish from "../../../components/StudentBirthdayWish";
import FestivalCelebrationSlides from "../../../components/FestivalCelebrationSlides";
import StudentRacerSaathi from "./student-racer-saathi";

type DashboardCard = {
  icon: string;
  title: string;
  description: string;
  path: string;
  className: string;
};

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
  likeCount: number;
  likedByMe: boolean;
};

type DashboardFacts = {
  attendance: string;
  extraAttendance: string;
  fees: string;
  performance: string;
  quiz: string;
  weeklyTest: string;
  timetable: string;
  calendar: string;
};

function dashboardTime(value: string | null | undefined) {
  if (!value) return "Time not set";
  const [rawHour, rawMinute] = String(value).split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function dashboardDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function attendanceStatusLabel(value: unknown) {
  const status = String(value || "Marked").trim().toLowerCase();
  if (status === "present" || status === "p") return "Present";
  if (status === "absent" || status === "a") return "Absent";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Marked";
}

export default function StudentDashboardPage() {
      const [monthlyResultPeriod,setMonthlyResultPeriod]=useState<any>(null);
      useEffect(()=>{let active=true; const loadMonthlyResultAnnouncement=async()=>{try{const r=await fetch("/api/monthly-results/publish?list=1",{cache:"no-store"}); const d=await r.json(); const periods=Array.isArray(d?.periods)?d.periods:[]; periods.sort((a:any,b:any)=>String(b?.month_key||"").localeCompare(String(a?.month_key||""))); if(active)setMonthlyResultPeriod(periods[0]||null);}catch{}}; loadMonthlyResultAnnouncement(); const timer=setInterval(loadMonthlyResultAnnouncement,30000); return()=>{active=false;clearInterval(timer)};},[]);
      
  const [accountActive, setAccountActive] = useState(true);

  // DIRECT ACCOUNT STATUS CHECK
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const username = localStorage.getItem("studentUsername") || localStorage.getItem("student_username") || "";
        const rawStudentId = localStorage.getItem("attendance_student_id") || localStorage.getItem("studentId") || localStorage.getItem("student_id") || "";
        let query = supabase.from("students").select("is_active");
        if (username) {
          query = query.eq("student_username", username);
        } else {
          const numericId = Number(rawStudentId);
          if (!Number.isInteger(numericId) || numericId <= 0) return;
          query = query.eq("id", numericId);
        }
        const { data, error } = await query.maybeSingle();
        if (!cancelled && !error && data) setAccountActive(data.is_active !== false);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);



  const router = useRouter(); const [headerTime,setHeaderTime]=useState(""); useEffect(()=>{const updateHeaderTime=()=>setHeaderTime(new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true})); updateHeaderTime(); const timer=setInterval(updateHeaderTime,1000); return ()=>clearInterval(timer);},[]);

  const [studentName, setStudentName] = useState("Student");
  const [studentDateOfBirth, setStudentDateOfBirth] = useState<string | null>(null);
  const [birthdayPreview, setBirthdayPreview] = useState(false);
  const [username, setUsername] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [activeUpdateSlide, setActiveUpdateSlide] = useState(0);
  const [upcomingCalendarEvents, setUpcomingCalendarEvents] = useState<CalendarEvent[]>([]);
  const updateSwipeStartX = useRef<number | null>(null);
  const [dashboardFacts, setDashboardFacts] = useState<DashboardFacts>({
    attendance: "Loading today's attendance…",
    extraAttendance: "Loading extra-class attendance…",
    fees: "Loading fee status…",
    performance: "Loading performance…",
    quiz: "Loading quiz result…",
    weeklyTest: "Loading Saturday test…",
    timetable: "Loading today's class schedule…",
    calendar: "Checking upcoming calendar dates…",
  });

  useEffect(() => {
    setBirthdayPreview(process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("birthdayPreview") === "1");
  }, []);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const loadFacts = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data: studentMeta } = await supabase.from("students").select("class_name,admission_date").eq("id", studentId).maybeSingle();
      const admissionDate = studentMeta?.admission_date || null;
      const [attendanceResult, extraAttendanceResult, feeResult, quizResult, weeklyRecordsResult] = await Promise.all([
        supabase.from("attendance").select("attendance_date,status").eq("student_id", studentId).order("attendance_date", { ascending: false }).order("id", { ascending: false }),
        supabase.from("extra_class_attendance").select("extra_class_date,status,subject").eq("student_id", studentId).order("extra_class_date", { ascending: false }).order("id", { ascending: false }),
        supabase.from("fees").select("month,year,amount,status").eq("student_id", studentId).order("year", { ascending: false }).order("month", { ascending: false }).limit(12),
        supabase.from("quiz_results").select("quiz_id,total_marks,obtained_marks,percentage,submitted_at,created_at").eq("student_id", studentId).not("submitted_at", "is", null).order("submitted_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(100),
        supabase.from("academy_assessments").select("id,test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("id", { ascending: false }).limit(100),
      ]);

      let birthdayEvents: CalendarEvent[] = [];
      if (username) {
        try {
          const birthdayParams = new URLSearchParams({ studentId: String(studentId), studentUsername: username });
          const birthdayResponse = await fetch(`/api/birthdays/calendar-slides?${birthdayParams.toString()}`, { cache: "no-store" });
          if (birthdayResponse.ok) {
            const birthdayResult = await birthdayResponse.json();
            birthdayEvents = Array.isArray(birthdayResult.events)
              ? birthdayResult.events.filter((event: CalendarEvent) => event.type === "birthday")
              : [];
          }
        } catch {}
      }

      const quizIds = Array.from(new Set((quizResult.data || []).map((row: any) => Number(row.quiz_id)).filter((id: number) => id > 0)));
      const { data: quizInfos } = quizIds.length ? await supabase.from("quiz_tests").select("id,title,subject,scheduled_date").in("id", quizIds) : { data: [] as any[] };
      const quizInfoById = new Map((quizInfos || []).map((item: any) => [Number(item.id), item]));
      const quiz = (quizResult.data || []).find((row: any) => isOnOrAfterAdmission(admissionDate, quizInfoById.get(Number(row.quiz_id))?.scheduled_date));

      let timetableFact = "No upcoming class is listed in your timetable.";
      let calendarFact = "No upcoming calendar event is listed.";
      let upcomingCalendarEntries: CalendarEvent[] = [];
      try {
        const className = String(studentMeta?.class_name || "").trim().toLowerCase();
        if (className) {
          const { data: timetableRows } = await supabase.from("timetables").select("day_of_week,subject,start_time,end_time,class_names,is_holiday,teacher_name");
          const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
          const orderedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const currentDayIndex = now.getDay();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const upcomingClass = (timetableRows || []).filter((entry: any) => {
            if (entry.is_holiday || isHiddenStudentTimetableTeacher(entry.teacher_name) || !Array.isArray(entry.class_names) || !entry.class_names.some((name: string) => String(name).trim().toLowerCase() === className)) return false;
            const dayIndex = orderedDays.findIndex((day) => day.toLowerCase() === String(entry.day_of_week).toLowerCase());
            if (dayIndex < 0) return false;
            const dayOffset = (dayIndex - currentDayIndex + 7) % 7;
            const [hour, minute] = String(entry.start_time || "").split(":").map(Number);
            return dayOffset > 0 || (dayOffset === 0 && Number.isFinite(hour) && hour * 60 + (minute || 0) >= currentMinutes);
          }).sort((a: any, b: any) => {
            const dayOffset = (entry: any) => (orderedDays.findIndex((day) => day.toLowerCase() === String(entry.day_of_week).toLowerCase()) - currentDayIndex + 7) % 7;
            return dayOffset(a) - dayOffset(b) || String(a.start_time || "").localeCompare(String(b.start_time || ""));
          })[0];
          if (upcomingClass) {
            const classDayIndex = orderedDays.findIndex((day) => day.toLowerCase() === String(upcomingClass.day_of_week).toLowerCase());
            const dayOffset = (classDayIndex - currentDayIndex + 7) % 7;
            const dayLabel = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : String(upcomingClass.day_of_week);
            timetableFact = `${dayLabel} · ${dashboardTime(upcomingClass.start_time)}–${dashboardTime(upcomingClass.end_time)} · ${upcomingClass.subject || "Class"}.`;
          }
        }

        for (let offset = 0; offset < 90 && upcomingCalendarEntries.length < 5; offset += 1) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const baseEvents = getStudentCalendarEvents(date);
          const extraClass = (extraAttendanceResult.data || []).find((row: any) => String(row.extra_class_date || "").slice(0, 10) === dateKey);
          const extraEvent: CalendarEvent | null = extraClass
            ? { date: dateKey, title: `Extra Class · ${attendanceStatusLabel(extraClass.status)}`, type: "class", description: `Teacher held an Extra Class; your attendance is ${attendanceStatusLabel(extraClass.status)}.` }
            : null;
          const dayEvents = extraEvent && (!baseEvents.length || baseEvents[0].title === "Monday Off")
            ? [extraEvent]
            : extraEvent ? [...baseEvents, extraEvent] : baseEvents;
          const events = dayEvents.filter((event) => !event.title.toLowerCase().includes("off"));
          for (const event of events) {
            if (!upcomingCalendarEntries.some((entry) => entry.date === event.date && entry.title === event.title)) {
              upcomingCalendarEntries.push(event);
              if (upcomingCalendarEntries.length === 5) break;
            }
          }
        }
        const birthdayTitles = new Set(birthdayEvents.map((event) => event.title.toLocaleLowerCase("en-IN")));
        const birthdayDates = new Set(birthdayEvents.map((event) => event.date));
        upcomingCalendarEntries = [
          ...birthdayEvents,
          ...upcomingCalendarEntries.filter((event) => !(event.type === "birthday" && birthdayDates.has(event.date)) && !birthdayTitles.has(event.title.toLocaleLowerCase("en-IN"))),
        ];
        if (upcomingCalendarEntries[0]) {
          const nextEvent = upcomingCalendarEntries[0];
          calendarFact = `${nextEvent.title} · ${dashboardDate(nextEvent.date)} · ${nextEvent.description}`;
        }
      } catch {}

      /* Use only the next published/scheduled class, never a class already over. */
      const attendanceRows = attendanceResult.data || [];
      const countedAttendance = attendanceRows.filter((row) => !["holiday", "off", "not applicable"].includes(String(row.status || "").trim().toLowerCase()));
      const presentCount = countedAttendance.filter((row) => String(row.status || "").trim().toLowerCase() === "present").length;
      const absentCount = countedAttendance.filter((row) => String(row.status || "").trim().toLowerCase() === "absent").length;
      const totalClasses = countedAttendance.length;
      const attendancePercentage = totalClasses ? Math.round((presentCount / totalClasses) * 100) : 0;
      const todayAttendance = attendanceRows.find((row) => row.attendance_date === today);
      const overallAttendance = `Overall ${attendancePercentage}% · ${presentCount}/${totalClasses} present · ${absentCount} absent.`;
      const extraAttendanceRows = extraAttendanceResult.data || [];
      const todayExtraAttendanceRows = extraAttendanceRows.filter((row) => row.extra_class_date === today);
      const todayExtraAttendanceFact = extraAttendanceResult.error
        ? "Extra-class status unavailable."
        : todayExtraAttendanceRows.length
          ? `Extra class: ${todayExtraAttendanceRows.map((row) => `${row.subject || "Extra Class"} — ${attendanceStatusLabel(row.status)}`).join(", ")}.`
          : "No extra class marked today.";
      const attendanceFact = `${todayAttendance ? `Today: ${attendanceStatusLabel(todayAttendance.status)}` : "Regular attendance not marked today"} · ${todayExtraAttendanceFact} · ${overallAttendance}`;
      const latestExtraAttendance = extraAttendanceRows[0];
      const extraAttendanceFact = extraAttendanceResult.error
        ? "Extra-class attendance is unavailable right now."
        : latestExtraAttendance
          ? `Latest: ${String(latestExtraAttendance.status || "Marked")} · ${latestExtraAttendance.subject || "Extra Class"} · ${dashboardDate(latestExtraAttendance.extra_class_date)}. ${extraAttendanceRows.length} extra class record${extraAttendanceRows.length === 1 ? "" : "s"} total.`
          : "No extra-class attendance has been marked yet.";

      const pendingFees = (feeResult.data || []).filter((fee: any) => String(fee.status || "").toUpperCase() === "PENDING");
      const pendingTotal = pendingFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
      const pendingPeriods = pendingFees.slice(0, 3).map((fee) => new Date(Number(fee.year), Number(fee.month) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })).join(", ");
      const feesFact = pendingFees.length
        ? `₹${pendingTotal.toLocaleString("en-IN")} pending for ${pendingPeriods}${pendingFees.length > 3 ? ` + ${pendingFees.length - 3} more month(s)` : ""}.`
        : feeResult.error ? "Fee status is unavailable right now." : "No pending fees recorded.";

      let quizTitle = "Latest quiz";
      let quizSubject = "";
      if (quiz?.quiz_id) {
        const quizInfo = quizInfoById.get(Number(quiz.quiz_id));
        quizTitle = String(quizInfo?.title || quizTitle);
        quizSubject = String(quizInfo?.subject || "").trim();
      }
      const quizFact = quiz
        ? `${quizTitle}${quizSubject ? ` · ${quizSubject}` : ""}: ${Number(quiz.obtained_marks || 0)}/${Number(quiz.total_marks || 0)} marks (${Number(quiz.percentage || 0).toFixed(0)}%) · ${dashboardDate(quiz.submitted_at)}.`
        : "No submitted quiz result yet.";

      let performanceFact = "Your latest monthly performance will appear here when a result is released.";
      let weeklyTestFact = "No Saturday test result found yet.";
      const eligibleWeeklyRecords = (weeklyRecordsResult.data || []).filter((record: any) => isOnOrAfterAdmission(admissionDate, record.test_date)).sort((a: any, b: any) => String(b.test_date || "").localeCompare(String(a.test_date || "")));
      const latestWeeklyRecord = eligibleWeeklyRecords.find((record: any) => {
        const dateParts = String(record.test_date || "").slice(0, 10).split("-").map(Number);
        const isSaturday = dateParts.length === 3 && new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).getDay() === 6;
        return isSaturday && !/maha\s*test/i.test(String(record.test_name || "")) && String(record.attendance_status || "PRESENT").toUpperCase() === "PRESENT";
      });
      if (latestWeeklyRecord) {
        const obtained = Number(latestWeeklyRecord.obtained_marks || 0);
        const total = Number(latestWeeklyRecord.total_marks || 0);
        const percentage = total > 0 ? (obtained / total) * 100 : 0;
        weeklyTestFact = `${latestWeeklyRecord.test_name || "Saturday Weekly Test"} · ${latestWeeklyRecord.subject || "Weekly test"} · ${dashboardDate(latestWeeklyRecord.test_date)} · ${obtained}/${total} (${percentage.toFixed(0)}%).`;
      }
      try {
        const periodsResponse = await fetch("/api/monthly-results/publish?list=1", { cache: "no-store" });
        const periodsData = await periodsResponse.json();
        const periods = Array.isArray(periodsData?.periods) ? [...periodsData.periods].sort((a: any, b: any) => String(b?.month_key || "").localeCompare(String(a?.month_key || ""))) : [];
        const period = periods.find((item: any) => Boolean(item.is_released) || (item.scheduled_release_at && Date.now() >= new Date(item.scheduled_release_at).getTime()));
        if (period) {
          const resultResponse = await fetch(`/api/monthly-results/publish?monthKey=${encodeURIComponent(period.month_key)}&studentId=${studentId}`, { cache: "no-store" });
          const resultData = await resultResponse.json();
          const snapshot = resultData?.results?.[0]?.snapshot;
          const eligibleSnapshot = snapshot ? filterMonthlySnapshotByAdmission(snapshot, admissionDate) : null;
          if (eligibleSnapshot?.totals) performanceFact = `${eligibleSnapshot.monthLabel || period.month_key} · ${Number(eligibleSnapshot.totals.percentage || 0).toFixed(1)}% · ${eligibleSnapshot.totals.status || "Published"} (${eligibleSnapshot.totals.grandObtained}/${eligibleSnapshot.totals.grandTotal}).`;
          const latestWeeklyTest = !latestWeeklyRecord && Array.isArray(eligibleSnapshot?.weeklyTests)
            ? [...eligibleSnapshot.weeklyTests].sort((a: any, b: any) => String(b.date || "").localeCompare(String(a.date || "")))[0]
            : null;
          if (latestWeeklyTest) weeklyTestFact = `${latestWeeklyTest.name} · ${latestWeeklyTest.subject || "Weekly test"} · ${dashboardDate(latestWeeklyTest.date)} · ${latestWeeklyTest.obtained}/${latestWeeklyTest.total} (${Number(latestWeeklyTest.percentage || 0).toFixed(0)}%).`;
        }
      } catch {}

      if (!cancelled) {
        setDashboardFacts({ attendance: attendanceFact, extraAttendance: extraAttendanceFact, fees: feesFact, performance: performanceFact, quiz: quizFact, weeklyTest: weeklyTestFact, timetable: timetableFact, calendar: calendarFact });
        setUpcomingCalendarEvents(upcomingCalendarEntries);
      }
    };
    void loadFacts();
    const refreshTimer = window.setInterval(() => void loadFacts(), 60000);
    return () => { cancelled = true; window.clearInterval(refreshTimer); };
  }, [studentId, username]);

  useEffect(() => {
    const savedStatus = localStorage.getItem("studentAccountActive");
    setAccountActive(savedStatus !== "false");


    initializeStudent();
    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedStatus = localStorage.getItem("studentAccountActive");
    setAccountActive(savedStatus !== "false");


    if (announcements.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setAnnouncements((previous) => [...previous]);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  async function initializeStudent() {
    const name =
      localStorage.getItem("studentName") ||
      localStorage.getItem("student_name") ||
      "Student";

    const savedUsername =
      localStorage.getItem("student_username") ||
      localStorage.getItem("studentUsername") ||
      "";

    const savedStudentId = localStorage.getItem("studentId");

    setStudentName(name);
    setUsername(savedUsername);

    if (savedUsername) {
      const resolvedId = await resolveStudentId(savedUsername);

      if (resolvedId !== null) {
        setStudentId(resolvedId);

        localStorage.setItem("studentId", String(resolvedId));

        await loadStudentProfile(resolvedId, savedUsername);
        await loadAnnouncements(resolvedId);
        void registerPushNotifications(resolvedId);

        return;
      }
    }

    if (savedStudentId) {
      const parsedId = Number(savedStudentId);

      if (!Number.isNaN(parsedId) && parsedId > 0) {
        setStudentId(parsedId);

        await loadStudentProfile(parsedId, savedUsername);
        await loadAnnouncements(parsedId);
        void registerPushNotifications(parsedId);

        return;
      }
    }

    setStudentId(null);
    setProfileImage(null);

    await loadAnnouncements(null);
  }

  async function resolveStudentId(
    studentUsername: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id")
        .eq("student_username", studentUsername)
        .maybeSingle();

      if (error) {
        console.error("Student ID lookup error:", error);
        return null;
      }

      if (!data?.id) {
        console.error(
          "Student ID not found for username:",
          studentUsername
        );
        return null;
      }

      return Number(data.id);
    } catch (error) {
      console.error(
        "Unexpected student ID lookup error:",
        error
      );

      return null;
    }
  }

  async function loadStudentProfile(
    currentStudentId: number,
    currentUsername: string
  ) {
    try {
      let query = supabase
        .from("students")
        .select("profile_image_url,student_name,date_of_birth");

      if (currentStudentId) {
        query = query.eq("id", currentStudentId);
      } else if (currentUsername) {
        query = query.eq(
          "student_username",
          currentUsername
        );
      } else {
        setProfileImage(null);
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error(
          "Student profile image loading error:",
          error
        );

        setProfileImage(null);
        return;
      }

      if (!data) {
        setProfileImage(null);
        return;
      }

      const imageUrl =
        typeof data.profile_image_url === "string" &&
        data.profile_image_url.trim() !== ""
          ? data.profile_image_url.trim()
          : null;

      setProfileImage(imageUrl);
      setStudentDateOfBirth(typeof data.date_of_birth === "string" ? data.date_of_birth : null);
      if (typeof data.student_name === "string" && data.student_name.trim()) setStudentName(data.student_name.trim());
    } catch (error) {
      console.error(
        "Unexpected student profile image loading error:",
        error
      );

      setProfileImage(null);
    }
  }

  async function registerPushNotifications(
    currentStudentId: number
  ) {
    try {
      if (typeof window === "undefined") {
        return;
      }

      if (!("serviceWorker" in navigator)) {
        console.warn(
          "Service Worker is not supported by this browser."
        );
        return;
      }

      if (!("PushManager" in window)) {
        console.warn(
          "Push notifications are not supported by this browser."
        );
        return;
      }

      if (!("Notification" in window)) {
        console.warn(
          "Notifications are not supported by this browser."
        );
        return;
      }

      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      const registration =
        await navigator.serviceWorker.ready;

      if (!registration.active) {
        console.warn(
          "Service Worker is still not active."
        );
        return;
      }

      let permission =
        Notification.permission;

      if (permission === "default") return;

      if (permission !== "granted") {
        console.warn(
          "Notification permission was not granted."
        );
        return;
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          console.error(
            "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing."
          );
          return;
        }

        const decodedKey =
          urlBase64ToUint8Array(
            vapidPublicKey
          );

        const applicationServerKey =
          new ArrayBuffer(
            decodedKey.byteLength
          );

        new Uint8Array(
          applicationServerKey
        ).set(decodedKey);

        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
      }

      const response = await fetch(
        "/api/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: currentStudentId,
            subscription:
              subscription.toJSON(),
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Push subscription API error:",
          errorText
        );

        return;
      }

      console.log(
        "Student push notification registration completed successfully."
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        console.warn(
          "Push subscription was aborted because the Service Worker was not ready."
        );
        return;
      }

      console.error(
        "Push notification registration error:",
        error
      );
    }
  }

  function urlBase64ToUint8Array(
    base64String: string
  ): Uint8Array {
    const padding =
      "=".repeat(
        (4 - (base64String.length % 4)) % 4
      );

    const base64 =
      (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData =
      window.atob(base64);

    const outputArray =
      new Uint8Array(rawData.length);

    for (
      let i = 0;
      i < rawData.length;
      ++i
    ) {
      outputArray[i] =
        rawData.charCodeAt(i);
    }

    return outputArray;
  }

  function updateTime() {
    setTime(
      new Date().toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }
      )
    );
  }

  async function loadAnnouncements(
    currentStudentId: number | null
  ) {
    setAnnouncementLoading(true);

    try {
      const {
        data: announcementData,
        error: announcementError,
      } = await supabase
        .from("announcements")
        .select(
          "id, title, message, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (announcementError) {
        console.error(
          "Announcements loading error:",
          announcementError
        );

        setAnnouncements([]);
        return;
      }

      const announcementRows =
        announcementData || [];

      if (announcementRows.length === 0) {
        setAnnouncements([]);
        return;
      }

      const announcementIds =
        announcementRows.map(
          (announcement) =>
            announcement.id
        );

      const {
        data: likesData,
        error: likesError,
      } = await supabase
        .from("announcement_likes")
        .select(
          "announcement_id, student_id"
        )
        .in(
          "announcement_id",
          announcementIds
        );

      if (likesError) {
        console.error(
          "Announcement likes loading error:",
          likesError
        );
      }

      const likes = likesData || [];

      const formattedAnnouncements =
        announcementRows.map(
          (announcement) => {
            const announcementLikes =
              likes.filter(
                (like) =>
                  Number(
                    like.announcement_id
                  ) ===
                  Number(
                    announcement.id
                  )
              );

            const likedByMe =
              currentStudentId !== null &&
              announcementLikes.some(
                (like) =>
                  Number(
                    like.student_id
                  ) ===
                  Number(
                    currentStudentId
                  )
              );

            return {
              id: announcement.id,
              title:
                announcement.title,
              message:
                announcement.message,
              created_at:
                announcement.created_at,
              likeCount:
                announcementLikes.length,
              likedByMe,
            };
          }
        );

      setAnnouncements(
        formattedAnnouncements
      );
    } catch (error) {
      console.error(
        "Unexpected announcements error:",
        error
      );

      setAnnouncements([]);
    } finally {
      setAnnouncementLoading(false);
    }
  }

  async function toggleLike(
    announcementId: number
  ) {
    let currentStudentId =
      studentId;

    if (
      !currentStudentId &&
      username
    ) {
      const resolvedId =
        await resolveStudentId(
          username
        );

      if (resolvedId !== null) {
        currentStudentId =
          resolvedId;

        setStudentId(
          resolvedId
        );

        localStorage.setItem(
          "studentId",
          String(resolvedId)
        );
      }
    }

    if (!currentStudentId) {
      alert(
        "Student information could not be found. Please login again."
      );

      return;
    }

    if (likingId !== null) {
      return;
    }

    const selectedAnnouncement =
      announcements.find(
        (item) =>
          item.id ===
          announcementId
      );

    if (!selectedAnnouncement) {
      return;
    }

    setLikingId(
      announcementId
    );

    try {
      if (
        selectedAnnouncement.likedByMe
      ) {
        const { error } =
          await supabase
            .from(
              "announcement_likes"
            )
            .delete()
            .eq(
              "announcement_id",
              announcementId
            )
            .eq(
              "student_id",
              currentStudentId
            );

        if (error) {
          console.error(
            "Unlike error:",
            error
          );

          alert(
            `Could not remove like: ${error.message}`
          );

          return;
        }

        setAnnouncements(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                announcementId
                  ? {
                      ...item,
                      likedByMe:
                        false,
                      likeCount:
                        Math.max(
                          0,
                          item.likeCount - 1
                        ),
                    }
                  : item
            )
        );

        return;
      }

      const { error } =
        await supabase
          .from(
            "announcement_likes"
          )
          .insert({
            announcement_id:
              announcementId,
            student_id:
              currentStudentId,
          });

      if (error) {
        console.error(
          "Like error:",
          error
        );

        if (
          error.code ===
          "23505"
        ) {
          await loadAnnouncements(
            currentStudentId
          );
        } else {
          alert(
            `Could not like announcement: ${error.message}`
          );
        }

        return;
      }

      setAnnouncements(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              announcementId
                ? {
                    ...item,
                    likedByMe:
                      true,
                    likeCount:
                      item.likeCount +
                      1,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        "Unexpected like error:",
        error
      );
    } finally {
      setLikingId(null);
    }
  }

  function logout() {
    void fetch("/api/student/session", { method: "DELETE", credentials: "same-origin", keepalive: true }).catch(() => undefined);
    localStorage.removeItem(
      "studentLoggedIn"
    );

    localStorage.removeItem(
      "student_username"
    );

    localStorage.removeItem(
      "studentUsername"
    );

    localStorage.removeItem(
      "studentName"
    );

    localStorage.removeItem(
      "student_name"
    );

    localStorage.removeItem(
      "studentId"
    );

    sessionStorage.clear();

    router.push("/");
  }

  function formatAnnouncementDate(
    date: string
  ) {
    if (!date) {
      return "";
    }

    return new Date(
      date
    ).toLocaleString(
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

  function isWithinLatest24Hours(
    createdAt: string
  ) {
    const createdTime =
      new Date(
        createdAt
      ).getTime();

    if (
      Number.isNaN(
        createdTime
      )
    ) {
      return false;
    }

    const now =
      Date.now();

    const difference =
      now -
      createdTime;

    return (
      difference >= 0 &&
      difference <
        24 *
          60 *
          60 *
          1000
    );
  }

  const latestAnnouncement =
    announcements.length > 0 &&
    isWithinLatest24Hours(
      announcements[0]
        .created_at
    )
      ? announcements[0]
      : null;
  const newAnnouncementCount = announcements.filter((announcement) =>
    isWithinLatest24Hours(announcement.created_at)
  ).length;

  const calendarSlides = upcomingCalendarEvents.map((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
    const when = daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : dashboardDate(event.date);
    const icon = event.type === "birthday" ? "🎂" : event.type === "holiday" ? "🎉" : event.type === "test" ? "📝" : "📚";
    const birthdaySlide = event.type === "birthday";
    const birthdayBlessing = "माता रानी और सभी देवी-देवताओं का आशीर्वाद सदा बना रहे। नया वर्ष खुशियों, अच्छे स्वास्थ्य और सफलता से भरा हो।";
    const birthdayDetail = daysUntil === 1
      ? `कल ${event.title} है। जन्मदिन की अग्रिम शुभकामनाएँ! ${birthdayBlessing}`
      : daysUntil === 0
        ? `आज ${event.title} है। जन्मदिन की हार्दिक शुभकामनाएँ! ${birthdayBlessing}`
        : `${dashboardDate(event.date)} · ${event.title}. ${birthdayBlessing}`;
    return {
      type: "calendar",
      eyebrow: birthdaySlide
        ? daysUntil === 1 ? "🎂 BIRTHDAY TOMORROW · जन्मदिन कल" : daysUntil === 0 ? "🎂 TODAY’S BIRTHDAY · आज जन्मदिन" : "🎂 UPCOMING BIRTHDAY · आने वाला जन्मदिन"
        : `ACADEMIC CALENDAR · ${event.type.toUpperCase()}`,
      title: event.title,
      detail: birthdaySlide ? birthdayDetail : `${when} · ${dashboardDate(event.date)} · ${event.description}`,
      icon,
      metric: dashboardDate(event.date),
      href: "/student/calendar",
    };
  });
  // Show only birthdays for today and tomorrow. Keep one slide per person so
  // multiple birthdays on the same date remain separate slides.
  const birthdaySlides = calendarSlides.filter((slide) =>
    slide.icon === "🎂" && (slide.eyebrow.includes("TODAY’S BIRTHDAY") || slide.eyebrow.includes("BIRTHDAY TOMORROW"))
  ).map((slide) => ({ ...slide, type: "birthday" }));
  const academicCalendarSlides = calendarSlides.filter((slide) => slide.icon !== "🎂");
  const todayAttendanceStatus = dashboardFacts.attendance.match(/^Today:\s*(Present|Absent)\b/i)?.[1]?.toUpperCase() || "";
  const attendanceMetric = todayAttendanceStatus ? `${todayAttendanceStatus} TODAY` : "NOT MARKED";

  const dashboardUpdates = [
    // Keep birthdays first so they are visible immediately in the rotating dashboard.
    ...birthdaySlides,
    { type: "attendance", eyebrow: "DAILY ATTENDANCE", title: "Attendance today", detail: dashboardFacts.attendance, icon: "✓", metric: attendanceMetric, href: "/student/attendance" },
    { type: "extra-attendance", eyebrow: "EXTRA CLASS ATTENDANCE", title: "Extra class attendance", detail: dashboardFacts.extraAttendance, icon: "★", metric: dashboardFacts.extraAttendance.match(/(\d+) extra class record/)?.[1] || "VIEW", href: "/student/attendance-history" },
    { type: "fees", eyebrow: "FEES", title: dashboardFacts.fees.includes("pending") ? "Fee payment pending" : "Fee status", detail: dashboardFacts.fees, icon: "₹", metric: dashboardFacts.fees.match(/₹[\d,]+/)?.[0] || (dashboardFacts.fees.includes("pending") ? "DUE" : "CLEAR"), href: "/student/fees" },
    { type: "performance", eyebrow: "MONTHLY PERFORMANCE", title: "Your latest performance", detail: dashboardFacts.performance, icon: "↗", metric: dashboardFacts.performance.match(/[\d.]+%/)?.[0] || "—", href: "/student/reports" },
    { type: "quiz", eyebrow: "LATEST QUIZ", title: "Your latest quiz result", detail: dashboardFacts.quiz, icon: "✎", metric: dashboardFacts.quiz.match(/[\d.]+%/)?.[0] || "—", href: "/student/quiz-tests" },
    { type: "weekly-test", eyebrow: "LATEST WEEKLY TEST", title: "Weekly test result", detail: dashboardFacts.weeklyTest, icon: "★", metric: dashboardFacts.weeklyTest.match(/[\d.]+%/)?.[0] || "—", href: "/student/monthly-result" },
    { type: "timetable", eyebrow: "UPCOMING TIMETABLE", title: "Your next class", detail: dashboardFacts.timetable, icon: "◷", metric: dashboardFacts.timetable.match(/\d{1,2}:\d{2} ?[AP]M/i)?.[0] || "VIEW", href: "/student/timetable" },
    ...(academicCalendarSlides.length ? academicCalendarSlides : [{ type: "calendar", eyebrow: "UPCOMING CALENDAR", title: "Next important date", detail: dashboardFacts.calendar, icon: "▦", metric: dashboardFacts.calendar.match(/\d{1,2} [A-Za-z]{3}/)?.[0] || "VIEW", href: "/student/calendar" }]),
  ];
  const updateCount = dashboardUpdates.length;
  const currentDashboardUpdate = dashboardUpdates[activeUpdateSlide % dashboardUpdates.length];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveUpdateSlide((current) => (current + 1) % updateCount);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [updateCount]);


  const firstName = studentName.trim().split(/\s+/)[0] || "Student";

  const firstLetter =
    studentName
      .charAt(0)
      .toUpperCase();

  /*
   * STUDENT DASHBOARD CARDS
   *
   * Existing 7 options are preserved.
   * QUIZ TESTS is added as option number 8.
   */
  const cards: DashboardCard[] =
    [
      {
        icon: "✓",
        title: "My Attendance",
        description:
          "View your current attendance and attendance percentage.",
        path: "/student/attendance",
        className: "blue",
      },
      {
        icon: "↺",
        title: "Attendance History",
        description:
          "Check your previous attendance records and details.",
        path: "/student/attendance-history",
        className: "purple",
      },
      {
        icon: "□",
        title: "Academic Calendar",
        description:
          "View important academic dates and calendar information.",
        path: "/student/calendar",
        className: "green",
      },
      {
        icon: "▤",
        title: "Reports",
        description:
          "View your attendance reports and performance details.",
        path: "/student/reports",
        className: "orange",
      },
      {
        icon: "₹",
        title: "Fees",
        description:
          "Check your student fee information and payment details.",
        path: "/student/fees",
        className: "pink",
      },
      {
        icon: "▣",
        title: "Homework",
        description:
          "View homework assigned to your class by your teacher.",
        path: "/student/homework",
        className: "indigo",
      },
      {
        icon: "⚙",
        title: "Settings",
        description:
          "Manage your account, name and password.",
        path: "/student/settings",
        className: "cyan",
      },
      {
         icon: "EX",
         title: "Exams",
         description: "Open quiz tests, monthly results and weekly test reports.",
         path: "/student/exams",
        className: "orange",
      },
      {
        icon: "CAL",
        title: "Timetable",
        description: "View your class timetable.",
        path: "/student/timetable",
        className: "blue",
      },
    ];

  return (
    <>
      <>{monthlyResultPeriod && ((!monthlyResultPeriod.is_released && monthlyResultPeriod.scheduled_release_at) || (monthlyResultPeriod.is_released && monthlyResultPeriod.released_at && (Date.now()-new Date(monthlyResultPeriod.released_at).getTime())<86400000)) && <div style={{margin:"0 0 14px",padding:"14px 16px",borderRadius:14,border:"1px solid #bfdbfe",background:monthlyResultPeriod.is_released?"#ecfdf5":"#eff6ff",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>{monthlyResultPeriod.is_released?<><div style={{fontWeight:800,fontSize:17,color:"#047857"}}>RESULT ANNOUNCED</div><div style={{marginTop:4,color:"#166534",fontWeight:700}}>Your monthly result has been announced. Click below to check your final result.</div><a href="/student/monthly-result" style={{display:"inline-block",marginTop:10,padding:"9px 14px",borderRadius:9,background:"#047857",color:"#fff",textDecoration:"none",fontWeight:800}}>CLICK TO CHECK RESULT</a></>:<><div style={{fontWeight:800,fontSize:17,color:"#0b57a3"}}>RESULT ANNOUNCEMENT</div><div style={{marginTop:4,color:"#124d83",fontWeight:700}}>Your result will be announced at {new Date(monthlyResultPeriod.scheduled_release_at).toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:true})}.</div></>}</div>}</>          <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .racer-student-shell .student-dashboard-page .birthday-content h2 {
          color: #fff9ed !important;
        }

        .birthday-celebration-overlay{position:fixed;z-index:9500;inset:0;overflow:hidden;pointer-events:none}
        .party-balloon{position:absolute;bottom:-70px;width:23px;height:30px;border-radius:52% 52% 48% 48%;opacity:0;background:radial-gradient(circle at 32% 27%,rgba(255,255,255,.86),transparent 19%),linear-gradient(135deg,#ff8aab,#d84291);box-shadow:inset -4px -5px 8px rgba(44,20,78,.18),0 0 16px rgba(255,180,220,.3);animation:balloon-rise 8s linear infinite}
        .party-balloon:after{position:absolute;top:28px;left:11px;width:1px;height:35px;background:rgba(255,244,210,.7);content:""}
        .party-balloon.balloon-1{background:radial-gradient(circle at 32% 27%,rgba(255,255,255,.86),transparent 19%),linear-gradient(135deg,#ffd979,#ee9c36)}
        .party-balloon.balloon-2{background:radial-gradient(circle at 32% 27%,rgba(255,255,255,.86),transparent 19%),linear-gradient(135deg,#7ee9ff,#2685ed)}
        .party-balloon.balloon-3{background:radial-gradient(circle at 32% 27%,rgba(255,255,255,.86),transparent 19%),linear-gradient(135deg,#a9f5c2,#32ae83)}
        .party-glitter{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff2a8;box-shadow:0 0 8px 3px rgba(255,224,130,.62);animation:glitter-twinkle 1.5s ease-in-out infinite alternate}
        .party-burst{position:absolute;z-index:2;width:1px;height:1px}
        .party-burst:before{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle,#fff 0 4%,#fff2a8 9%,rgba(255,207,95,.72) 25%,rgba(255,142,198,.22) 52%,transparent 72%);content:"";animation:party-flash .8s ease-out both;animation-delay:var(--burst-delay,0s)}
        .party-fragment{position:absolute;left:0;top:0;width:7px;height:11px;border-radius:2px;background:linear-gradient(180deg,#fff6be,#ff8caa);box-shadow:0 0 9px rgba(255,220,150,.8);animation:party-blast 1.45s cubic-bezier(.15,.75,.3,1) both}
        .party-fragment:nth-child(2n){background:linear-gradient(180deg,#fff,#70e6ff)}
        .party-fragment:nth-child(3n){background:linear-gradient(180deg,#fff0a8,#a78bfa)}
        .party-fragment:nth-child(4n){background:linear-gradient(180deg,#fff4bd,#ffad42)}
        .party-fragment:nth-child(5n){background:linear-gradient(180deg,#eafff4,#36bd91)}
        .party-fragment:nth-child(7n){background:linear-gradient(180deg,#fff,#f26bb2)}
        @keyframes party-flash{0%{opacity:0;transform:scale(.25)}18%{opacity:1;transform:scale(1.8)}100%{opacity:0;transform:scale(3.2)}}
        @keyframes party-blast{0%{opacity:1;transform:rotate(var(--burst-angle)) translateY(0) scale(.45)}22%{opacity:1;transform:rotate(var(--burst-angle)) translateY(-30px) scale(1.25)}100%{opacity:0;transform:rotate(var(--burst-angle)) translateY(-110px) scale(.55)}}
        @keyframes balloon-rise{0%{opacity:0;transform:translateY(0) rotate(-8deg)}12%{opacity:.82}100%{opacity:0;transform:translateY(-125vh) rotate(12deg)}}
        @keyframes glitter-twinkle{from{opacity:.12;transform:scale(.5)}to{opacity:.9;transform:scale(1.35)}}
        @media(prefers-reduced-motion:reduce){.birthday-celebration-overlay,.party-balloon,.party-glitter,.party-fragment{animation:none!important}}

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
        }

        button {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        @media (max-width: 768px) {
          main.student-dashboard-page {
            padding: 8px !important;
          }

          main.student-dashboard-page > div {
            width: 100% !important;
            max-width: 100% !important;
          }

          nav.student-navbar {
            padding: 10px !important;
            border-radius: 14px !important;
            margin-bottom: 10px !important;
            gap: 8px !important;
            flex-wrap: nowrap !important;
          }

          .student-brand-area {
            min-width: 0 !important;
            flex: 1 !important;
            gap: 7px !important;
          }

          .student-brand-icon {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            border-radius: 10px !important;
            font-size: 18px !important;
          }

          .student-brand-name {
            font-size: 10px !important;
            letter-spacing: 0.6px !important;
            white-space: nowrap !important;
          }

          .student-brand-sub {
            font-size: 7px !important;
            letter-spacing: 1.2px !important;
            margin-top: 2px !important;
          }

          .student-nav-right {
            gap: 5px !important;
            flex-wrap: nowrap !important;
          }

          .student-clock {
            padding: 7px 8px !important;
            border-radius: 8px !important;
            font-size: 8px !important;
            white-space: nowrap !important;
          }

          .student-logout {
            padding: 8px 9px !important;
            border-radius: 8px !important;
            font-size: 9px !important;
            white-space: nowrap !important;
          }

          section.student-hero {
            min-height: auto !important;
            padding: 18px !important;
            border-radius: 18px !important;
            margin-bottom: 10px !important;
            display: block !important;
          }

          .student-hero-content {
            gap: 11px !important;
            display: flex !important;
            align-items: center !important;
          }

          .student-avatar {
            width: 58px !important;
            height: 58px !important;
            min-width: 58px !important;
            border-radius: 17px !important;
            font-size: 25px !important;
          }

          .student-small-greeting {
            font-size: 7px !important;
            letter-spacing: 1.2px !important;
            margin-bottom: 4px !important;
          }

          .student-welcome-title {
            font-size: 20px !important;
            line-height: 1.15 !important;
          }

          .student-welcome-text {
            margin-top: 5px !important;
            font-size: 9px !important;
            line-height: 1.45 !important;
          }

          .student-username {
            margin-top: 7px !important;
            padding: 5px 7px !important;
            font-size: 8px !important;
            border-radius: 6px !important;
            max-width: 100% !important;
          }

          .student-hero-side {
            margin-top: 12px !important;
            min-width: 0 !important;
            width: 100% !important;
            padding: 8px 10px !important;
            border-radius: 10px !important;
          }

          .student-status-dot {
            width: 8px !important;
            height: 8px !important;
          }

          .student-online-text {
            font-size: 8px !important;
          }

          .student-online-sub {
            font-size: 8px !important;
          }

          section.student-latest-announcement {
            padding: 12px !important;
            border-radius: 15px !important;
            margin-bottom: 10px !important;
          }

          .student-latest-header {
            align-items: flex-start !important;
            margin-bottom: 9px !important;
            gap: 8px !important;
          }

          .student-latest-eyebrow {
            font-size: 7px !important;
            letter-spacing: 1.2px !important;
          }

          .student-latest-title {
            font-size: 17px !important;
          }

          .student-latest-subtitle {
            font-size: 8px !important;
            margin-top: 3px !important;
          }

          .student-latest-badge {
            padding: 6px 7px !important;
            font-size: 7px !important;
            border-radius: 6px !important;
          }

          .student-latest-card {
            padding: 10px !important;
            border-radius: 12px !important;
          }

          .student-announcement-icon {
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            border-radius: 9px !important;
            font-size: 16px !important;
          }

          .student-announcement-card-top {
            gap: 8px !important;
          }

          .student-announcement-meta {
            gap: 4px !important;
          }

          .student-teacher-badge,
          .student-time-badge {
            padding: 3px 5px !important;
            font-size: 6px !important;
          }

          .student-announcement-date {
            font-size: 7px !important;
          }

          .student-latest-card-title {
            font-size: 14px !important;
            margin-top: 5px !important;
          }

          .student-announcement-message {
            font-size: 9px !important;
            line-height: 1.5 !important;
            margin-top: 5px !important;
          }

          .student-announcement-bottom {
            margin-top: 9px !important;
            padding-top: 8px !important;
            gap: 7px !important;
          }

          .student-everyone-text {
            font-size: 7px !important;
          }

          .student-like-button {
            padding: 6px 8px !important;
            border-radius: 7px !important;
            font-size: 8px !important;
            gap: 4px !important;
          }

          .student-like-count {
            min-width: 15px !important;
            height: 15px !important;
            font-size: 7px !important;
          }

          section.student-announcement-section {
            padding: 12px !important;
            border-radius: 15px !important;
            margin-bottom: 10px !important;
          }

          .student-announcement-header {
            gap: 8px !important;
            align-items: center !important;
          }

          .student-announcement-eyebrow {
            font-size: 7px !important;
            letter-spacing: 1.2px !important;
          }

          .student-announcement-title {
            font-size: 17px !important;
          }

          .student-announcement-subtitle {
            font-size: 8px !important;
            margin-top: 3px !important;
          }

          .student-view-announcements {
            padding: 8px 9px !important;
            font-size: 8px !important;
            border-radius: 7px !important;
            white-space: nowrap !important;
          }

          section.student-notice {
            padding: 10px !important;
            border-radius: 13px !important;
            margin-bottom: 12px !important;
            gap: 8px !important;
          }

          .student-notice-icon {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            border-radius: 8px !important;
            font-size: 15px !important;
          }

          .student-notice-title {
            font-size: 9px !important;
          }

          .student-notice-text {
            font-size: 7px !important;
            line-height: 1.4 !important;
            margin-top: 2px !important;
          }

          .student-section-heading {
            margin-bottom: 8px !important;
            gap: 7px !important;
          }

          .student-section-eyebrow {
            font-size: 7px !important;
            letter-spacing: 1.2px !important;
          }

          .student-section-title {
            font-size: 18px !important;
          }

          .student-service-count {
            padding: 6px 7px !important;
            border-radius: 7px !important;
            font-size: 7px !important;
            white-space: nowrap !important;
          }

          .student-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .student-service-card {
            border-radius: 13px !important;
            min-width: 0 !important;
          }

          .student-card-top {
            padding: 9px !important;
          }

          .student-card-icon {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
            font-size: 17px !important;
          }

          .student-card-arrow {
            width: 23px !important;
            height: 23px !important;
            font-size: 12px !important;
          }

          .student-card-body {
            padding: 10px !important;
          }

          .student-card-title {
            font-size: 11px !important;
            line-height: 1.2 !important;
          }

          .student-card-description {
            margin-top: 4px !important;
            font-size: 7px !important;
            line-height: 1.4 !important;
            min-height: 30px !important;
          }

          .student-open-link {
            margin-top: 7px !important;
            font-size: 8px !important;
          }

          section.student-bottom-panel {
            margin-top: 12px !important;
            padding: 10px !important;
            border-radius: 13px !important;
            gap: 8px !important;
          }

          .student-bottom-icon {
            width: 34px !important;
            height: 34px !important;
            border-radius: 9px !important;
            font-size: 16px !important;
          }

          .student-bottom-text {
            min-width: 0 !important;
          }

          .student-bottom-title {
            font-size: 9px !important;
          }

          .student-bottom-description {
            font-size: 7px !important;
            line-height: 1.35 !important;
            margin-top: 2px !important;
          }

          .student-profile-button {
            padding: 7px 8px !important;
            border-radius: 7px !important;
            font-size: 8px !important;
            white-space: nowrap !important;
          }

          footer.student-footer {
            margin-top: 12px !important;
            padding: 10px 2px !important;
            font-size: 7px !important;
          }
        }

        @media (max-width: 380px) {
          main.student-dashboard-page {
            padding: 6px !important;
          }

          .student-brand-name {
            font-size: 9px !important;
          }

          .student-clock {
            display: none !important;
          }

          .student-welcome-title {
            font-size: 18px !important;
          }

          .student-welcome-text {
            font-size: 8px !important;
          }

          .student-card-grid {
            gap: 6px !important;
          }

          .student-card-top {
            padding: 8px !important;
          }

          .student-card-body {
            padding: 9px !important;
          }

          .student-card-title {
            font-size: 10px !important;
          }

          .student-card-description {
            font-size: 6.5px !important;
          }

          .student-view-announcements {
            font-size: 7px !important;
            padding: 7px 8px !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1050px) {
          .student-card-grid {
            grid-template-columns: repeat(
              2,
              minmax(0,1fr)
            ) !important;
          }

          .student-hero {
            padding: 25px !important;
          }

          .student-welcome-title {
            font-size: 26px !important;
          }
        }

        /* RACER STUDENT REFERENCE DASHBOARD — 2026-09-29 */
        .student-header-profile-image{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%;}

        @media (max-width: 768px){
          main.student-dashboard-page{
            padding:72px 10px 78px !important;
            background:#f4f8fc !important;
          }
          main.student-dashboard-page > div{max-width:100% !important;}

          nav.student-navbar{
            position:fixed !important;
            top:0 !important;
            left:0 !important;
            right:0 !important;
            z-index:10000 !important;
            width:100% !important;
            min-height:58px !important;
            margin:0 !important;
            padding:8px 10px !important;
            border:0 !important;
            border-radius:0 0 13px 13px !important;
            background:linear-gradient(180deg,#0d5ca9 0%,#0b4e92 100%) !important;
            box-shadow:0 4px 14px rgba(10,53,104,.22) !important;
            color:#fff !important;
          }

          .student-brand-area{gap:8px !important;min-width:0 !important;}
          .student-brand-icon{
            width:40px !important;height:40px !important;min-width:40px !important;
            border-radius:50% !important;background:#fff !important;color:#0b58a5 !important;
            overflow:hidden !important;border:1px solid rgba(255,255,255,.7) !important;
            box-shadow:0 2px 7px rgba(0,0,0,.12) !important;
            display:flex !important;align-items:center !important;justify-content:center !important;
          }
          .student-brand-name{color:#fff !important;font-size:10px !important;font-weight:900 !important;letter-spacing:.9px !important;}
          .student-brand-sub{color:#dbeafe !important;font-size:7px !important;letter-spacing:.9px !important;font-weight:800 !important;}
          .student-nav-right{gap:5px !important;}
          .student-nav-right > button:first-child{
            width:32px !important;height:32px !important;min-width:32px !important;
            border-radius:50% !important;border:0 !important;background:rgba(255,255,255,.12) !important;
            box-shadow:none !important;font-size:16px !important;
          }
          .student-clock{
            padding:7px 8px !important;border-radius:8px !important;background:#fff !important;
            color:#94a3b8 !important;border:1px solid #dbe5ef !important;font-size:7px !important;
            font-weight:800 !important;white-space:nowrap !important;
          }
          .student-logout{
            padding:8px 10px !important;border-radius:8px !important;background:#0b2346 !important;
            color:#fff !important;font-size:8px !important;font-weight:900 !important;
            border:1px solid rgba(255,255,255,.12) !important;
          }

          section.student-hero{
            min-height:156px !important;margin:0 0 10px !important;padding:15px !important;
            border-radius:14px !important;display:flex !important;align-items:center !important;
            background:linear-gradient(135deg,#23408e 0%,#2c64e8 58%,#4b46e8 100%) !important;
            box-shadow:0 10px 28px rgba(37,99,235,.18) !important;
          }
          .student-hero-content{gap:10px !important;width:100% !important;}
          .student-avatar{
            width:62px !important;height:62px !important;min-width:62px !important;border-radius:16px !important;
            background:#dbeafe !important;box-shadow:0 8px 18px rgba(0,0,0,.16) !important;font-size:24px !important;
          }
          .student-small-greeting{font-size:7px !important;letter-spacing:1.15px !important;margin-bottom:3px !important;}
          .student-welcome-title{font-size:19px !important;line-height:1.1 !important;}
          .student-welcome-text{font-size:8px !important;line-height:1.4 !important;margin-top:5px !important;max-width:205px !important;}
          .student-hero-side{display:flex !important;margin-left:auto !important;width:125px !important;min-width:125px !important;padding:9px !important;border-radius:10px !important;background:rgba(255,255,255,.12) !important;}
          .student-online-text{font-size:7px !important;letter-spacing:.7px !important;}
          .student-online-sub{font-size:6px !important;}

          section.student-latest-announcement,
          section.student-announcement-section,
          section.student-notice,
          section.student-bottom-panel{
            border-radius:14px !important;
            margin-bottom:10px !important;
            box-shadow:0 4px 13px rgba(30,70,120,.06) !important;
          }
          section.student-announcement-section{padding:12px !important;background:#fff !important;border:1px solid #d8e6f5 !important;}
          .student-announcement-eyebrow{font-size:6px !important;letter-spacing:1.3px !important;margin-bottom:2px !important;}
          .student-announcement-title{font-size:18px !important;}
          .student-announcement-subtitle{font-size:7px !important;margin-top:2px !important;}
          .student-view-announcements{padding:8px 10px !important;border-radius:8px !important;font-size:8px !important;}

          section.student-notice{padding:10px !important;background:#fff !important;border:1px solid #d8e6f5 !important;}
          .student-notice-icon{width:28px !important;height:28px !important;min-width:28px !important;border-radius:8px !important;}
          .student-notice-title{font-size:8px !important;}
          .student-notice-text{font-size:6.5px !important;line-height:1.35 !important;}

          .student-section-heading{margin:9px 1px 7px !important;}
          .student-section-eyebrow{font-size:6px !important;letter-spacing:1.5px !important;}
          .student-section-title{font-size:19px !important;}
          .student-service-count{padding:5px 7px !important;border-radius:7px !important;font-size:6px !important;}

          .student-card-grid{
            grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            gap:7px !important;
          }
          .student-service-card{
            min-width:0 !important;overflow:hidden !important;border:1px solid #dce7f3 !important;
            border-radius:10px !important;background:#fff !important;
            box-shadow:0 3px 10px rgba(22,50,80,.06) !important;text-align:left !important;
          }
          .student-card-top{min-height:52px !important;padding:8px !important;position:relative !important;}
          .student-card-icon{width:28px !important;height:28px !important;border-radius:8px !important;font-size:14px !important;}
          .student-card-body{padding:7px 8px 8px !important;}
          .student-card-title{font-size:8px !important;line-height:1.2 !important;font-weight:900 !important;}
          .student-card-description{display:block !important;font-size:6.2px !important;line-height:1.35 !important;min-height:25px !important;margin-top:3px !important;color:#66778d !important;}
          .student-open-link{margin-top:5px !important;font-size:6px !important;font-weight:900 !important;color:#2563eb !important;}

          section.student-bottom-panel{padding:10px !important;background:#fff !important;border:1px solid #d8e6f5 !important;display:flex !important;align-items:center !important;gap:8px !important;}
          .student-bottom-icon{width:30px !important;height:30px !important;min-width:30px !important;border-radius:8px !important;}
          .student-bottom-title{font-size:8px !important;}
          .student-bottom-description{font-size:6px !important;line-height:1.35 !important;}
          .student-profile-button{padding:8px 10px !important;border-radius:8px !important;font-size:7px !important;}

          .racer-student-shell .racer-bottom-nav{
            position:fixed !important;left:10px !important;right:10px !important;bottom:8px !important;z-index:9998 !important;
            width:auto !important;transform:none !important;border:1px solid #d8e6f5 !important;
            border-radius:14px !important;background:#fff !important;box-shadow:0 8px 22px rgba(10,45,90,.12) !important;
          }
        }

        @media (max-width:380px){
          .student-clock{display:none !important;}
          .student-logout{padding:8px 9px !important;}
          section.student-hero{min-height:145px !important;padding:12px !important;}
          .student-avatar{width:54px !important;height:54px !important;min-width:54px !important;}
          .student-welcome-title{font-size:17px !important;}
          .student-welcome-text{font-size:7px !important;}
          .student-hero-side{width:112px !important;min-width:112px !important;}
          .student-card-description{font-size:5.8px !important;}
        }

        @media (min-width:769px){
          main.student-dashboard-page{background:#f4f8fc !important;padding:16px !important;}
          nav.student-navbar{background:linear-gradient(180deg,#0b57a3 0%,#0a4b91 100%) !important;color:#fff !important;border:0 !important;border-radius:14px !important;box-shadow:0 5px 16px rgba(16,63,110,.14) !important;}
          .student-brand-icon{width:44px !important;height:44px !important;border-radius:50% !important;background:#fff !important;overflow:hidden !important;}
          .student-brand-name{color:#fff !important;}
          .student-brand-sub{color:#dbeafe !important;}
          .student-clock{background:#fff !important;color:#6b7a8d !important;}
          .student-logout{background:#071f43 !important;}
          .student-card-grid{grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:9px !important;}
        }

      `}</style>

      <main
        className="student-dashboard-page"
        style={styles.page}
      >
        <div style={styles.container}>
          <StudentBirthdayWish studentName={studentName} dateOfBirth={studentDateOfBirth} profileImage={profileImage} preview={birthdayPreview} />
          <FestivalCelebrationSlides audience="student" />
          <nav
            className="student-navbar"
            style={styles.navbar}
          >
            <div
              className="student-brand-area"
              style={styles.brandArea}
            >
              <div className="student-brand-icon" style={styles.brandIcon}>
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={studentName + " profile"}
                    className="student-header-profile-image"
                    onError={() => setProfileImage(null)}
                  />
                ) : (
                  <span aria-hidden="true">{firstLetter}</span>
                )}
              </div>

              <div>
                <div
                  className="student-brand-name"
                  style={styles.brandName}
                >
                  RACER ACADEMY
                </div>

                <div
                  className="student-brand-sub"
                  style={styles.brandSub}
                >
                  Hello, {firstName}
                </div>
              </div>
            </div>

            <div
              className="student-nav-right"
              style={styles.navRight}
            >
              <button
                type="button"
                onClick={() => router.push("/student/notifications")}
                aria-label="Announcements"
                style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #1e293b", background: "#1e293b", color: "#ffffff", cursor: "pointer", fontSize: "17px", boxShadow: "0 3px 8px rgba(15,23,42,0.18)" }}
              >{"\u{1F514}"}</button>
              <div
                className="student-clock"
                style={styles.clock}
              >
                {time}
              </div>

              <button
                type="button"
                onClick={logout}
                className="student-logout"
                style={styles.logoutButton}
              >
                Logout
              </button>
            </div>
          </nav><section
            className="student-hero"
            style={styles.hero}
          >
            <div style={styles.heroGlowOne} />
            <div style={styles.heroGlowTwo} />

            <div
              className="student-hero-content"
              style={styles.heroContent}
            >
              <div
                className="student-avatar"
                style={styles.avatar}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={`${studentName} profile`}
                    style={styles.profileImage}
                    onError={() =>
                      setProfileImage(null)
                    }
                  />
                ) : (
                  firstLetter
                )}
              </div>

              <div style={styles.welcomeArea}>
                <div
                  className="student-small-greeting"
                  style={styles.smallGreeting}
                >
                  STUDENT DASHBOARD
                </div>

                <h1
                  className="student-welcome-title"
                  style={styles.welcomeTitle}
                >
                  Hello, {firstName}
                </h1>

                <p
                  className="student-welcome-text"
                  style={styles.welcomeText}
                >
                  Manage your attendance,
                  academic information,
                  homework, reports, fees
                  and account settings from
                  one place.
                </p>

                {false && username && (
                  <div
                    className="student-username"
                    style={styles.usernameBadge}
                  >
                    Username: {username}
                  </div>
                )}
              </div>
            </div>

            <div
              className="student-hero-side"
              style={{...styles.heroSide,...(!accountActive?{background:"#fef2f2",border:"1px solid #fecaca",boxShadow:"0 8px 24px rgba(239,68,68,0.10)"}:{})}}
            >
              <div
                className="student-status-dot"
                style={{ ...styles.statusDot, ...(!accountActive ? { background: "#ef4444", animation: "none" } : {}) }}
              />

              <div>
                <div
                  className="student-online-text"
                  style={styles.onlineText}
                >{accountActive ? "ACCOUNT ACTIVE" : "DEACTIVATED ACCOUNT"}</div>

                <div
                  className="student-online-sub"
                  style={styles.onlineSub}
                >
                  Student Portal
                </div>
              </div>
            </div>
          </section>

          {!announcementLoading &&
            latestAnnouncement && (
              <section
                className="student-latest-announcement"
                aria-label="New announcements"
                style={{
                  ...styles.latestAnnouncementSection,
                  padding: "12px 16px",
                  marginBottom: "12px",
                }}
              >
                <div
                  className="student-latest-header"
                  style={{
                    ...styles.latestAnnouncementHeader,
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <div
                      className="student-latest-eyebrow"
                      style={{ ...styles.latestAnnouncementEyebrow, marginBottom: "2px" }}
                    >
                      NEW • {newAnnouncementCount} {newAnnouncementCount === 1 ? "ANNOUNCEMENT" : "ANNOUNCEMENTS"}
                    </div>

                    <h2
                      className="student-new-announcements-title"
                      style={{ margin: 0, color: "#0f172a", fontSize: "17px", fontWeight: 900 }}
                    >
                      New Announcements
                    </h2>
                  </div>

                  <div
                    className="student-latest-badge"
                    style={{ ...styles.latestAnnouncementBadge, padding: "6px 9px" }}
                  >
                    NEW
                  </div>
                </div>

                <button
                  type="button"
                  className="student-open-announcement-prompt"
                  onClick={() => router.push("/student/announcements")}
                  style={{
                    width: "100%",
                    minHeight: "42px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "9px 12px",
                    border: "1px solid #cbdcf2",
                    borderRadius: "10px",
                    background: "#f7fbff",
                    color: "#174a82",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  <span>📢 Open New Announcements</span>
                  <span aria-hidden="true">→</span>
                </button>
              </section>
            )}

          <section
            className="student-announcement-section"
            data-update-type={currentDashboardUpdate.type}
            data-attendance-status={currentDashboardUpdate.type === "attendance" ? todayAttendanceStatus.toLowerCase() : undefined}
            style={
              styles.announcementSection
            }
          >
            <div className="student-update-carousel" aria-live="polite" onPointerDown={(event) => { updateSwipeStartX.current = event.clientX; }} onPointerUp={(event) => { const startX = updateSwipeStartX.current; updateSwipeStartX.current = null; if (startX === null || Math.abs(event.clientX - startX) < 40) return; setActiveUpdateSlide((current) => (current + (event.clientX < startX ? 1 : -1) + updateCount) % updateCount); }} onPointerCancel={() => { updateSwipeStartX.current = null; }}>
              <span className="student-update-icon" aria-hidden="true">{currentDashboardUpdate.icon}</span>
              <div className="student-update-copy" key={activeUpdateSlide % dashboardUpdates.length}>
                <span className="student-update-eyebrow">{currentDashboardUpdate.eyebrow}</span>
                <strong className="student-update-title">{currentDashboardUpdate.title}</strong>
                <span className="student-update-detail">{currentDashboardUpdate.detail}</span>
              </div>
              <button
                type="button"
                className="student-update-open"
                aria-label={`Open ${currentDashboardUpdate.title}`}
                onClick={() => router.push(currentDashboardUpdate.href)}
              >
                <strong>{currentDashboardUpdate.metric}</strong>
                <span>OPEN</span>
              </button>
              <div className="student-update-dots" aria-label="Dashboard updates">
                {dashboardUpdates.map((update, index) => (
                  <button type="button" key={`${update.eyebrow}-${index}`} className={index === activeUpdateSlide % dashboardUpdates.length ? "active" : ""} aria-label={`Show ${update.title}`} aria-current={index === activeUpdateSlide % dashboardUpdates.length ? "true" : undefined} onClick={() => setActiveUpdateSlide(index)} />
                ))}
              </div>
            </div>
          </section>

          <section
            className="student-notice"
            style={styles.notice}
          >
            <div
              className="student-notice-icon"
              style={styles.noticeIcon}
            >
              
            </div>

            <div>
              <div
                className="student-notice-title"
                style={styles.noticeTitle}
              >
                Student Information Center
              </div>

              <p
                className="student-notice-text"
                style={styles.noticeText}
              >
                Use the options below to check
                your attendance, academic
                calendar, homework, reports,
                fees, quiz tests and account
                settings.
              </p>
            </div>
          </section>

          <section id="modules">
            <div
              className="student-section-heading" data-racer-student-modules-heading="RACER_STUDENT_MODULES_HEADING_V1"
              style={styles.sectionHeading}
            >
              <div>
                <div
                  className="student-section-eyebrow"
                  style={styles.sectionEyebrow}
                >
                  STUDENT SERVICES
                </div>

                <h2
                  className="student-section-title"
                  style={styles.sectionTitle}
                >
                  Quick Access
                </h2>
              </div>

              <div
                className="student-service-count"
                style={styles.serviceCount}
              >
                {cards.length} OPTIONS
              </div>
            </div>

            <div
              className="student-card-grid"
              style={styles.cardGrid}
            >
              {cards.map((card) => {
                const styleKey =
                  `card${card.className
                    .charAt(0)
                    .toUpperCase()}${card.className.slice(
                    1
                  )}`;

                return (
                  <button
                    key={card.path}
                    type="button"
                    onPointerEnter={() => router.prefetch(card.path)}
                    onFocus={() => router.prefetch(card.path)}
                    onClick={() =>
                      router.push(
                        card.path
                      )
                    }
                    className="student-service-card"
                    style={
                      styles.serviceCard
                    }
                  >
                    <div
                      className="student-card-top"
                      style={{
                        ...styles.cardTop,
                        ...(styles[
                          styleKey
                        ] || {}),
                      }}
                    >
                      <div
                        className="student-card-icon"
                        style={
                          styles.cardIcon
                        }
                      >{card.title === "My Attendance" ? "✅" : card.title === "Attendance History" ? "🕘" : card.title === "Academic Calendar" ? "📅" : card.title === "Reports" ? "📊" : card.title === "Fees" ? "💰" : card.title === "Homework" ? "📚" : card.title === "Settings" ? "⚙️" : card.title === "Exams" ? "📝" : card.title === "Timetable" ? "🗓️" : "⭐"}
                      </div>

                      <div
                        className="student-card-arrow"
                        style={
                          styles.arrow
                        }
                      >
                        
                      </div>
                    </div>

                    <div
                      className="student-card-body"
                      style={
                        styles.cardBody
                      }
                    >
                      <h3
                        className="student-card-title"
                        style={
                          styles.cardTitle
                        }
                      >
                        {card.title}
                      </h3>

                      <p
                        className="student-card-description"
                        style={
                          styles.cardDescription
                        }
                      >
                        {card.description}
                      </p>

                      <div
                        className="student-open-link"
                        style={
                          styles.openLink
                        }
                      >
                        

                        <span>
                          
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className="student-bottom-panel"
            style={
              styles.bottomPanel
            }
          >
            <div
              className="student-bottom-icon"
              style={
                styles.bottomIcon
              }
            >
              
            </div>

            <div
              className="student-bottom-text"
              style={
                styles.bottomText
              }
            >
              <h3
                className="student-bottom-title"
                style={
                  styles.bottomTitle
                }
              >
                Keep your profile updated
              </h3>

              <p
                className="student-bottom-description"
                style={
                  styles.bottomDescription
                }
              >
                Your personal information is
                managed through your student
                profile.
              </p>
            </div>

            <button
              type="button"
              onPointerEnter={() => router.prefetch("/student/profile")}
              onFocus={() => router.prefetch("/student/profile")}
              onClick={() =>
                router.push(
                  "/student/profile"
                )
              }
              className="student-profile-button"
              style={
                styles.profileButton
              }
            >
              View Profile 
            </button>
          </section>

          <footer
            className="student-footer"
            style={styles.footer}
          >
            <div
              style={styles.footerBrand}
            >
               Attendance Portal
            </div>

            <div>
              Student Portal  2026
            </div>
          </footer>
        </div>
      </main>
      <StudentRacerSaathi studentId={studentId} />
    </>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  navbar: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  brandIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  brandName: {
    fontSize: "13px",
    fontWeight: 1000,
    letterSpacing: "1px",
    color: "#0f172a",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "2px",
    color: "#334155",
  },

  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  clock: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "9px 12px",
    borderRadius: "9px",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 800,
  },

  logoutButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: 900,
    cursor: "pointer",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "25px",
    padding: "34px",
    minHeight: "220px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "25px",
    marginBottom: "18px",
    boxShadow:
      "0 18px 45px rgba(37,99,235,0.22)",
    boxSizing: "border-box",
  },

  heroGlowOne: {
    position: "absolute",
    width: "230px",
    height: "230px",
    borderRadius: "50%",
    background:
      "rgba(255,255,255,0.08)",
    right: "120px",
    top: "-100px",
  },

  heroGlowTwo: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background:
      "rgba(255,255,255,0.06)",
    right: "-40px",
    bottom: "-90px",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "20px",
    minWidth: 0,
  },

  avatar: {
    width: "88px",
    height: "88px",
    minWidth: "88px",
    borderRadius: "24px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    fontWeight: 1000,
    boxShadow:
      "0 12px 30px rgba(0,0,0,0.18)",
    overflow: "hidden",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  welcomeArea: {
    minWidth: 0,
  },

  smallGreeting: {
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  welcomeTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: 1000,
    wordBreak: "break-word",
  },

  welcomeText: {
    margin: "9px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: 1.6,
    maxWidth: "600px",
  },

  usernameBadge: {
    display: "inline-block",
    marginTop: "13px",
    padding: "7px 11px",
    borderRadius: "8px",
    background:
      "rgba(255,255,255,0.13)",
    border:
      "1px solid rgba(255,255,255,0.22)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 900,
    maxWidth: "100%",
    wordBreak: "break-word",
  },

  heroSide: {
    position: "relative",
    zIndex: 2,
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.2)",
    borderRadius: "14px",
    padding: "13px 15px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: "155px",
  },

  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow:
      "0 0 0 5px rgba(74,222,128,0.15)",
  },

  onlineText: {
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 1000,
    letterSpacing: "1px",
  },

  onlineSub: {
    marginTop: "3px",
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: 700,
  },

  latestAnnouncementSection: {
    background:
      "linear-gradient(135deg,#eff6ff,#ffffff)",
    border:
      "2px solid #93c5fd",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(37,99,235,0.10)",
  },

  latestAnnouncementHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },

  latestAnnouncementEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  latestAnnouncementTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: 1000,
  },

  latestAnnouncementSubtitle: {
    margin: "5px 0 0",
    color: "#334155",
    fontSize: "11px",
    fontWeight: 600,
  },

  latestAnnouncementBadge: {
    background: "#2563eb",
    color: "#ffffff",
    border:
      "1px solid #1d4ed8",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 1000,
  },

  latestAnnouncementCard: {
    background: "#ffffff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "16px",
    padding: "16px",
    boxShadow:
      "0 6px 20px rgba(37,99,235,0.07)",
  },

  latestAnnouncementIcon: {
    width: "45px",
    height: "45px",
    minWidth: "45px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#dbeafe,#bfdbfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  latestTeacherBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: 1000,
    letterSpacing: "0.7px",
  },

  latestTimeBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: 1000,
    letterSpacing: "0.5px",
  },

  latestAnnouncementCardTitle: {
    margin: "7px 0 0",
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 1000,
    wordBreak: "break-word",
  },

  announcementSection: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "25px",
    boxShadow:
      "0 8px 26px rgba(15,23,42,0.06)",
  },

  announcementHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  announcementEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  announcementTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: 1000,
  },

  announcementSubtitle: {
    margin: "5px 0 0",
    color: "#334155",
    fontSize: "11px",
    fontWeight: 600,
  },

  viewAnnouncementsButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow:
      "0 5px 15px rgba(37,99,235,0.18)",
  },

  announcementCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
  },

  announcementCardContent: {
    minWidth: 0,
    flex: 1,
  },

  announcementMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  announcementDate: {
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: 700,
  },

  announcementMessage: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.65,
    fontWeight: 600,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  announcementBottom: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  everyoneText: {
    color: "#334155",
    fontSize: "10px",
    fontWeight: 800,
  },

  likeButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: 1000,
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  likeButtonActive: {
    background: "#fff1f2",
    border:
      "1px solid #fecdd3",
    color: "#be123c",
  },

  likeCount: {
    background: "#f1f5f9",
    color: "#475569",
    minWidth: "19px",
    height: "19px",
    padding: "0 4px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: 1000,
  },

  notice: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "17px",
    padding: "15px 18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "25px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  noticeIcon: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "11px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  noticeTitle: {
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 900,
  },

  noticeText: {
    margin: "3px 0 0",
    color: "#334155",
    fontSize: "11px",
    lineHeight: 1.5,
    fontWeight: 600,
  },

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginBottom: "15px",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 1000,
    color: "#0f172a",
  },

  serviceCount: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#334155",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 900,
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "15px",
  },

  serviceCard: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "19px",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    minWidth: 0,
  },

  cardTop: {
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardBlue: {
    background:
      "linear-gradient(135deg,#dbeafe,#bfdbfe)",
  },

  cardPurple: {
    background:
      "linear-gradient(135deg,#ede9fe,#ddd6fe)",
  },

  cardGreen: {
    background:
      "linear-gradient(135deg,#dcfce7,#bbf7d0)",
  },

  cardOrange: {
    background:
      "linear-gradient(135deg,#ffedd5,#fed7aa)",
  },

  cardPink: {
    background:
      "linear-gradient(135deg,#fce7f3,#fbcfe8)",
  },

  cardIndigo: {
    background:
      "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
  },

  cardCyan: {
    background:
      "linear-gradient(135deg,#cffafe,#a5f3fc)",
  },

  /*
   * QUIZ TESTS CARD DESIGN
   */
  cardQuiz: {
    background:
      "linear-gradient(135deg,#fef9c3,#fde68a)",
  },

  cardIcon: {
    width: "47px",
    height: "47px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  arrow: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background:
      "rgba(255,255,255,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: 1000,
  },

  cardBody: {
    padding: "17px",
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "17px",
    fontWeight: 1000,
  },

  cardDescription: {
    margin: "7px 0 0",
    color: "#334155",
    fontSize: "11px",
    lineHeight: 1.6,
    minHeight: "36px",
    fontWeight: 600,
  },

  openLink: {
    marginTop: "13px",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomPanel: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#ffffff,#f8fafc)",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    flexWrap: "wrap",
  },

  bottomIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  bottomText: {
    flex: 1,
    minWidth: "200px",
  },

  bottomTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 1000,
  },

  bottomDescription: {
    margin: "4px 0 0",
    color: "#334155",
    fontSize: "11px",
    fontWeight: 600,
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: {
    marginTop: "25px",
    padding: "18px 5px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 700,
    flexWrap: "wrap",
  },

  footerBrand: {
    color: "#475569",
    fontWeight: 900,
  },
};














































