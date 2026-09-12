"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LoginType = "student" | "teacher";

type AcademyProfile = {
  academy_name: string;
  tagline: string;
  about_text: string;
  classes_text: string;
  facilities_text: string;
  timings_text: string;
  faculty_text: string;
  achievements_text: string;
  why_choose_us: string;
  rules_text: string;
  contact_text: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  admission_text: string;
  gallery_text: string;
};

type AcademyFee = {
  id: number;
  class_name: string;
  subject_name: string;
  fee_amount: number;
  fee_period: string;
  description: string;
};

type AcademyFacility = {
  id: number;
  title: string;
  description: string;
  icon: string;
};

type AcademyTiming = {
  id: number;
  title: string;
  days: string;
  start_time: string;
  end_time: string;
  description: string;
};

type AcademyFaculty = {
  id: number;
  teacher_name: string;
  subject: string;
  qualification: string;
  experience: string;
  photo_url: string;
  description: string;
};

type AcademyAnnouncement = {
  id: number;
  title: string;
  content: string;
  announcement_date: string;
};

type InfoModal =
  | "fees"
  | "classes"
  | "timings"
  | "facilities"
  | "faculty"
  | "achievements"
  | "rules"
  | "gallery"
  | "contact"
  | "about"
  | null;

const defaultAcademyProfile: AcademyProfile = {
  academy_name: "RACER ACADEMY",
  tagline: "Learn • Grow • Achieve",
  about_text:
    "Welcome to RACER ACADEMY. We provide focused academic support and tuition for students from Nursery to Class 10. We focus on concept clarity, regular practice, doubt solving, discipline and individual attention.",
  classes_text:
    "Nursery to Class 10\nHindi Medium • English Medium\nSubjects: Hindi, English, Mathematics, Science, Social Science and General Knowledge.",
  facilities_text:
    "Child-friendly learning environment, individual attention, regular tests, revision, doubt solving, homework guidance and progress monitoring.",
  timings_text:
    "Monday-Saturday\nHindi: 04:00 PM - 05:00 PM\nEnglish: 05:00 PM - 06:00 PM\nMathematics: 06:00 PM - 07:00 PM",
  faculty_text:
    "Dedicated, experienced and supportive faculty focused on concept clarity, regular practice, student confidence and individual progress.",
  achievements_text:
    "Our students have achieved good academic improvement and strong results after studying at RACER ACADEMY.",
  why_choose_us:
    "We do not run after fees or profit; we run after the child and the child's learning. Our focus is teaching, concept clarity, personal attention and real academic improvement.",
  rules_text:
    "Every student has the right to ask questions freely and without hesitation. Classes are conducted in a quiet and disciplined environment without unnecessary noise or activities.",
  contact_text:
    "Contact RACER ACADEMY for admissions, batch details and academic guidance.",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  admission_text:
    "Admissions are open for Nursery to Class 10. Contact the academy for available batches, subjects, medium and fee details.",
  gallery_text:
    "Child-friendly academy environment, classroom learning, practice sessions and academic growth moments.",
};

const defaultGalleryImages = [
  {
    src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    title: "Learning Environment",
  },
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    title: "Students Learning",
  },
  {
    src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=80",
    title: "Academic Growth",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [loginType, setLoginType] =
    useState<LoginType>("student");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [academy, setAcademy] =
    useState<AcademyProfile>(defaultAcademyProfile);

  const [fees, setFees] = useState<AcademyFee[]>([]);
  const [facilities, setFacilities] =
    useState<AcademyFacility[]>([]);
  const [timings, setTimings] =
    useState<AcademyTiming[]>([]);
  const [faculty, setFaculty] =
    useState<AcademyFaculty[]>([]);
  const [announcements, setAnnouncements] =
    useState<AcademyAnnouncement[]>([]);

  const [activeModal, setActiveModal] =
    useState<InfoModal>(null);

  useEffect(() => {
    async function loadAcademyData() {
      try {
        const [
          profileResult,
          feesResult,
          facilitiesResult,
          timingsResult,
          facultyResult,
          announcementsResult,
        ] = await Promise.all([
          supabase
            .from("academy_profile")
            .select("*")
            .limit(1)
            .maybeSingle(),

          supabase
            .from("academy_subject_fees")
            .select(
              "id,class_name,subject_name,fee_amount,fee_period,description"
            )
            .order("display_order", {
              ascending: true,
            }),

          supabase
            .from("academy_facilities")
            .select("id,title,description,icon")
            .eq("is_active", true)
            .order("display_order", {
              ascending: true,
            }),

          supabase
            .from("academy_timings")
            .select(
              "id,title,days,start_time,end_time,description"
            )
            .eq("is_active", true)
            .order("display_order", {
              ascending: true,
            }),

          supabase
            .from("academy_faculty")
            .select(
              "id,teacher_name,subject,qualification,experience,photo_url,description"
            )
            .eq("is_active", true)
            .order("display_order", {
              ascending: true,
            }),

          supabase
            .from("academy_announcements")
            .select(
              "id,title,content,announcement_date"
            )
            .eq("is_active", true)
            .order("display_order", {
              ascending: true,
            }),
        ]);

        if (
          profileResult.data &&
          !profileResult.error
        ) {
          setAcademy({
            ...defaultAcademyProfile,
            ...profileResult.data,
          });
        }

        if (feesResult.data && !feesResult.error) {
          setFees(feesResult.data);
        }

        if (
          facilitiesResult.data &&
          !facilitiesResult.error
        ) {
          setFacilities(facilitiesResult.data);
        }

        if (
          timingsResult.data &&
          !timingsResult.error
        ) {
          setTimings(timingsResult.data);
        }

        if (
          facultyResult.data &&
          !facultyResult.error
        ) {
          setFaculty(facultyResult.data);
        }

        if (
          announcementsResult.data &&
          !announcementsResult.error
        ) {
          setAnnouncements(
            announcementsResult.data
          );
        }
      } catch (err) {
        console.error(
          "Academy profile loading error:",
          err
        );
      }
    }

    loadAcademyData();
  }, []);

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (
      !username.trim() ||
      !password.trim()
    ) {
      setError(
        "Please enter username and password."
      );
      return;
    }

    try {
      setLoading(true);

      const functionName =
        loginType === "student"
          ? "student_login"
          : "teacher_login";

      const { data, error: loginError } =
        await supabase.rpc(functionName, {
          p_username: username.trim(),
          p_password: password,
        });

      if (loginError) {
        setError(
          `${
            loginType === "student"
              ? "Student"
              : "Teacher"
          } Login Error: ${loginError.message}`
        );
        return;
      }

      if (
        !data ||
        (Array.isArray(data) &&
          data.length === 0)
      ) {
        setError(
          loginType === "student"
            ? "Student Login Error: Login function returned no student data."
            : "Teacher Login Error: Login function returned no teacher data."
        );
        return;
      }

      const userData = Array.isArray(data)
        ? data[0]
        : data;

      if (loginType === "student") {
        const currentStudentId =
          Number(userData.id);

        if (
          Number.isInteger(
            currentStudentId
          ) &&
          currentStudentId > 0
        ) {
          const { error: activityError } =
            await supabase
              .from("student_login_activity")
              .insert({
                student_id:
                  currentStudentId,
                login_at:
                  new Date().toISOString(),
              });

          if (activityError) {
            console.error(
              "Student login activity error:",
              activityError
            );
          }
        }

        localStorage.setItem(
          "racer_academy_student",
          JSON.stringify(userData)
        );

        localStorage.setItem(
          "student",
          JSON.stringify(userData)
        );

        localStorage.setItem(
          "studentLoggedIn",
          "true"
        );

        localStorage.setItem(
          "studentId",
          String(userData.id || "")
        );

        localStorage.setItem(
          "studentName",
          userData.student_name ||
            "Student"
        );

        localStorage.setItem(
          "student_name",
          userData.student_name ||
            "Student"
        );

        localStorage.setItem(
          "student_username",
          userData.student_username ||
            ""
        );

        localStorage.setItem(
          "studentUsername",
          userData.student_username ||
            ""
        );

        router.push(
          "/student/dashboard"
        );

        return;
      }

      localStorage.setItem(
        "racer_academy_teacher",
        JSON.stringify(userData)
      );

      localStorage.setItem(
        "teacher",
        JSON.stringify(userData)
      );

      localStorage.setItem(
        "teacherLoggedIn",
        "true"
      );

      localStorage.setItem(
        "teacherUsername",
        userData.teacher_username ||
          ""
      );

      localStorage.setItem(
        "teacher_username",
        userData.teacher_username ||
          ""
      );

      localStorage.setItem(
        "teacherName",
        userData.teacher_username ||
          "Teacher"
      );

      localStorage.setItem(
        "teacher_name",
        userData.teacher_username ||
          "Teacher"
      );

      localStorage.setItem(
        "attendance_role",
        "teacher"
      );

      localStorage.setItem(
        "attendance_username",
        userData.teacher_username ||
          ""
      );

      localStorage.setItem(
        "attendance_teacher_id",
        String(userData.id || "")
      );

      router.push("/teacher");
    } catch (err) {
      console.error(
        "UNEXPECTED LOGIN ERROR:",
        err
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : String(err);

      setError(
        `${
          loginType === "student"
            ? "Student"
            : "Teacher"
        } Login Error: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  const switchLoginType = (
    type: LoginType
  ) => {
    setLoginType(type);
    setUsername("");
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const openModal = (
    modal: InfoModal
  ) => {
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const getModalTitle = () => {
    switch (activeModal) {
      case "fees":
        return "Fee Structure";
      case "classes":
        return "Classes & Subjects";
      case "timings":
        return "Batch Timings";
      case "facilities":
        return "Our Facilities";
      case "faculty":
        return "Our Faculty";
      case "achievements":
        return "Achievements";
      case "rules":
        return "Academy Rules";
      case "gallery":
        return "Academy Gallery";
      case "contact":
        return "Contact & Admissions";
      case "about":
        return "About RACER ACADEMY";
      default:
        return "";
    }
  };

  const modalContent = () => {
    if (activeModal === "fees") {
      if (fees.length === 0) {
        return (
          <div className="empty-modal">
            <div className="empty-icon">
              💰
            </div>
            <h3>Fee details coming soon</h3>
            <p>
              Please contact RACER ACADEMY for
              current fee information.
            </p>
          </div>
        );
      }

      return (
        <div className="modal-fees">
          <div className="fee-note">
            <strong>Monthly Fee • Per Subject</strong>
            <span>
              Standard session: 1 hour
            </span>
            <span>
              1.5 hour session = 50% additional
            </span>
            <span>
              No admission fee • No yearly charge
            </span>
          </div>

          <div className="fee-table-wrap">
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Class / Medium</th>
                  <th>Subject</th>
                  <th>1 Hour</th>
                  <th>1.5 Hour</th>
                  <th>Period</th>
                </tr>
              </thead>

              <tbody>
                {fees.map((fee) => {
                  const amount =
                    Number(
                      fee.fee_amount
                    ) || 0;

                  return (
                    <tr key={fee.id}>
                      <td>
                        <strong>
                          {fee.class_name}
                        </strong>
                      </td>

                      <td>
                        {fee.subject_name}
                      </td>

                      <td className="fee-green">
                        ₹
                        {amount.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td className="fee-purple">
                        ₹
                        {(
                          amount * 1.5
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        {fee.fee_period ||
                          "Monthly"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeModal === "classes") {
      return (
        <div className="modal-section">
          <div className="big-info-icon">
            📚
          </div>

          <h3>Nursery to Class 10</h3>

          <p className="modal-main-text">
            Hindi Medium and English Medium
          </p>

          <div className="subject-grid">
            {[
              "Hindi",
              "English",
              "Mathematics",
              "Science",
              "Social Science",
              "General Knowledge",
            ].map((subject) => (
              <div
                className="subject-pill"
                key={subject}
              >
                <span>✓</span>
                {subject}
              </div>
            ))}
          </div>

          <div className="modal-text-box">
            {academy.classes_text}
          </div>
        </div>
      );
    }

    if (activeModal === "timings") {
      return (
        <div className="timing-modal-grid">
          {timings.length > 0 ? (
            timings.map((timing) => (
              <div
                className="timing-modal-card"
                key={timing.id}
              >
                <div className="timing-icon">
                  🕒
                </div>

                <h3>{timing.title}</h3>

                <div className="timing-time">
                  {timing.start_time} –{" "}
                  {timing.end_time}
                </div>

                <div className="timing-days">
                  {timing.days}
                </div>

                {timing.description && (
                  <p>
                    {timing.description}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="modal-text-box">
              {academy.timings_text}
            </div>
          )}
        </div>
      );
    }

    if (activeModal === "facilities") {
      return (
        <div className="modal-card-grid">
          {facilities.length > 0 ? (
            facilities.map((facility) => (
              <div
                className="info-modal-card"
                key={facility.id}
              >
                <div className="info-card-icon">
                  {facility.icon || "⭐"}
                </div>

                <h3>
                  {facility.title}
                </h3>

                <p>
                  {facility.description}
                </p>
              </div>
            ))
          ) : (
            <div className="modal-text-box">
              {academy.facilities_text}
            </div>
          )}
        </div>
      );
    }

    if (activeModal === "faculty") {
      return (
        <div className="faculty-modal-grid">
          {faculty.length > 0 ? (
            faculty.map((teacher) => (
              <div
                className="faculty-modal-card"
                key={teacher.id}
              >
                {teacher.photo_url ? (
                  <img
                    src={teacher.photo_url}
                    alt={teacher.teacher_name}
                  />
                ) : (
                  <div className="faculty-placeholder">
                    👨‍🏫
                  </div>
                )}

                <div className="faculty-modal-body">
                  <h3>
                    {teacher.teacher_name}
                  </h3>

                  <strong>
                    {teacher.subject}
                  </strong>

                  {teacher.qualification && (
                    <p>
                      {teacher.qualification}
                    </p>
                  )}

                  {teacher.experience && (
                    <p>
                      {teacher.experience}
                    </p>
                  )}

                  {teacher.description && (
                    <p>
                      {teacher.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="modal-text-box">
              {academy.faculty_text}
            </div>
          )}
        </div>
      );
    }

    if (activeModal === "achievements") {
      return (
        <div className="simple-detail-modal achievement-modal">
          <div className="large-detail-icon">
            🏅
          </div>

          <h3>
            Academic Growth & Achievement
          </h3>

          <p>
            {academy.achievements_text}
          </p>

          <div className="achievement-points">
            <div>
              <span>✓</span>
              Regular academic practice
            </div>
            <div>
              <span>✓</span>
              Tests and revision
            </div>
            <div>
              <span>✓</span>
              Individual progress
            </div>
            <div>
              <span>✓</span>
              Confidence and concept building
            </div>
          </div>
        </div>
      );
    }

    if (activeModal === "rules") {
      return (
        <div className="simple-detail-modal">
          <div className="large-detail-icon">
            📋
          </div>

          <h3>
            A child should always feel free to ask.
          </h3>

          <p>
            {academy.rules_text}
          </p>

          <div className="rule-highlight">
            <strong>
              “Free to Ask”
            </strong>
            <span>
              Every student can ask questions
              without hesitation.
            </span>
          </div>
        </div>
      );
    }

    if (activeModal === "gallery") {
      return (
        <div className="gallery-modal-grid">
          {defaultGalleryImages.map(
            (image) => (
              <div
                className="gallery-modal-card"
                key={image.src}
              >
                <img
                  src={image.src}
                  alt={image.title}
                />

                <div>
                  {image.title}
                </div>
              </div>
            )
          )}

          <p className="gallery-description">
            {academy.gallery_text}
          </p>
        </div>
      );
    }

    if (activeModal === "contact") {
      const cleanWhatsapp =
        academy.whatsapp.replace(
          /[^0-9]/g,
          ""
        );

      return (
        <div className="contact-modal-grid">
          <div className="contact-detail-card">
            <span>📍</span>
            <h3>Address</h3>
            <p>
              {academy.address ||
                "RACER ACADEMY"}
            </p>
          </div>

          <div className="contact-detail-card">
            <span>📞</span>
            <h3>Phone</h3>

            {academy.phone ? (
              <a
                href={`tel:${academy.phone}`}
              >
                {academy.phone}
              </a>
            ) : (
              <p>Contact academy</p>
            )}
          </div>

          <div className="contact-detail-card">
            <span>💬</span>
            <h3>WhatsApp</h3>

            {academy.whatsapp ? (
              <a
                href={
                  academy.whatsapp.startsWith(
                    "http"
                  )
                    ? academy.whatsapp
                    : `https://wa.me/${cleanWhatsapp}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {academy.whatsapp}
              </a>
            ) : (
              <p>Available on request</p>
            )}
          </div>

          <div className="contact-detail-card">
            <span>✉️</span>
            <h3>Email</h3>

            {academy.email ? (
              <a
                href={`mailto:${academy.email}`}
              >
                {academy.email}
              </a>
            ) : (
              <p>Email coming soon</p>
            )}
          </div>

          <div className="contact-admission-box">
            <strong>
              🎓 Admissions
            </strong>

            <p>
              {academy.admission_text}
            </p>
          </div>
        </div>
      );
    }

    if (activeModal === "about") {
      return (
        <div className="simple-detail-modal">
          <div className="about-modal-image">
            <img
              src={defaultGalleryImages[0].src}
              alt="RACER ACADEMY"
            />
          </div>

          <h3>
            {academy.academy_name}
          </h3>

          <p className="about-tagline">
            {academy.tagline}
          </p>

          <p>
            {academy.about_text}
          </p>

          <div className="why-box">
            <strong>
              Why RACER ACADEMY?
            </strong>

            <span>
              {academy.why_choose_us}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <main className="racer-login-page">
        <div className="background-orb orb-one" />
        <div className="background-orb orb-two" />
        <div className="background-grid" />

        <div className="page-shell">
          {/* =====================================
              TOP BRAND
          ===================================== */}

          <header className="top-brand">
            <div className="brand-mark">
              🎓
            </div>

            <div>
              <div className="brand-name">
                {academy.academy_name ||
                  "RACER ACADEMY"}
              </div>

              <div className="brand-tagline">
                {academy.tagline ||
                  "Learn • Grow • Achieve"}
              </div>
            </div>
          </header>

          {/* =====================================
              MAIN TWO COLUMN AREA
          ===================================== */}

          <section className="main-layout">
            {/* ===================================
                ACADEMY SIDE
            =================================== */}

            <div className="academy-side">
              <div className="academy-hero">
                <div className="hero-glow hero-glow-one" />
                <div className="hero-glow hero-glow-two" />

                <div className="hero-content">
                  <div className="welcome-pill">
                    WELCOME TO RACER ACADEMY
                  </div>

                  <h1>
                    Learn.
                    <br />
                    Grow.
                    <br />
                    <span>Achieve.</span>
                  </h1>

                  <p className="hero-description">
                    {academy.about_text ||
                      defaultAcademyProfile.about_text}
                  </p>

                  <div className="hero-mini-stats">
                    <div>
                      <strong>
                        Nursery–10
                      </strong>
                      <span>Classes</span>
                    </div>

                    <div>
                      <strong>
                        2
                      </strong>
                      <span>Mediums</span>
                    </div>

                    <div>
                      <strong>
                        6+
                      </strong>
                      <span>Subjects</span>
                    </div>
                  </div>
                </div>

                <div className="hero-image-wrap">
                  <img
                    src={
                      defaultGalleryImages[0].src
                    }
                    alt="RACER ACADEMY learning environment"
                  />

                  <div className="image-badge">
                    <span>⭐</span>
                    Child-Friendly Learning
                  </div>
                </div>
              </div>

              {/* BASIC INFO */}

              <div className="basic-info-card">
                <div className="section-small-title">
                  ACADEMY AT A GLANCE
                </div>

                <h2>
                  Everything you need,
                  <br />
                  <span>in one place.</span>
                </h2>

                <p>
                  {academy.about_text}
                </p>

                <div className="option-grid">
                  <button
                    type="button"
                    onClick={() =>
                      openModal("about")
                    }
                    className="option-card option-blue"
                  >
                    <span className="option-icon">
                      🏫
                    </span>

                    <span>
                      <strong>
                        About Academy
                      </strong>
                      <small>
                        Know more about us
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal("classes")
                    }
                    className="option-card option-purple"
                  >
                    <span className="option-icon">
                      📚
                    </span>

                    <span>
                      <strong>
                        Classes & Subjects
                      </strong>
                      <small>
                        Nursery to Class 10
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal("fees")
                    }
                    className="option-card option-green"
                  >
                    <span className="option-icon">
                      💰
                    </span>

                    <span>
                      <strong>
                        Fee Structure
                      </strong>
                      <small>
                        Monthly • Per Subject
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal("timings")
                    }
                    className="option-card option-orange"
                  >
                    <span className="option-icon">
                      🕒
                    </span>

                    <span>
                      <strong>
                        Batch Timings
                      </strong>
                      <small>
                        Monday–Saturday
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal("facilities")
                    }
                    className="option-card option-pink"
                  >
                    <span className="option-icon">
                      ⭐
                    </span>

                    <span>
                      <strong>
                        Facilities
                      </strong>
                      <small>
                        Student-focused support
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal("faculty")
                    }
                    className="option-card option-indigo"
                  >
                    <span className="option-icon">
                      👨‍🏫
                    </span>

                    <span>
                      <strong>
                        Our Faculty
                      </strong>
                      <small>
                        Experienced guidance
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal(
                        "achievements"
                      )
                    }
                    className="option-card option-yellow"
                  >
                    <span className="option-icon">
                      🏅
                    </span>

                    <span>
                      <strong>
                        Achievements
                      </strong>
                      <small>
                        Student progress
                      </small>
                    </span>

                    <b>→</b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openModal("rules")
                    }
                    className="option-card option-cyan"
                  >
                    <span className="option-icon">
                      📋
                    </span>

                    <span>
                      <strong>
                        Academy Rules
                      </strong>
                      <small>
                        Learn with discipline
                      </small>
                    </span>

                    <b>→</b>
                  </button>
                </div>
              </div>

              {/* SHORT HIGHLIGHTS */}

              <div className="highlight-strip">
                <div>
                  <span>🎓</span>
                  <strong>
                    Nursery – Class 10
                  </strong>
                </div>

                <div>
                  <span>🗣️</span>
                  <strong>
                    Free to Ask
                  </strong>
                </div>

                <div>
                  <span>📈</span>
                  <strong>
                    Progress Focused
                  </strong>
                </div>
              </div>

              <div className="bottom-options">
                <button
                  type="button"
                  onClick={() =>
                    openModal("gallery")
                  }
                >
                  📸 Gallery
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openModal("contact")
                  }
                >
                  📞 Contact & Admission
                </button>
              </div>
            </div>

            {/* ===================================
                LOGIN SIDE
            =================================== */}

            <aside className="login-side">
              <section className="racer-login-card">
                <div className="login-top-decoration" />

                <div className="login-logo">
                  <div className="login-logo-icon">
                    🎓
                  </div>

                  <div>
                    <div className="login-brand">
                      RACER
                      <span>
                        ACADEMY
                      </span>
                    </div>

                    <div className="login-subtitle">
                      Student & Teacher Portal
                    </div>
                  </div>
                </div>

                <div className="login-switch">
                  <button
                    type="button"
                    className={
                      loginType ===
                      "student"
                        ? "switch-button active"
                        : "switch-button"
                    }
                    onClick={() =>
                      switchLoginType(
                        "student"
                      )
                    }
                    disabled={loading}
                  >
                    <span>🎓</span>
                    Student
                  </button>

                  <button
                    type="button"
                    className={
                      loginType ===
                      "teacher"
                        ? "switch-button active"
                        : "switch-button"
                    }
                    onClick={() =>
                      switchLoginType(
                        "teacher"
                      )
                    }
                    disabled={loading}
                  >
                    <span>👨‍🏫</span>
                    Teacher
                  </button>
                </div>

                <div className="login-heading">
                  <div className="portal-badge">
                    {loginType ===
                    "student"
                      ? "STUDENT PORTAL"
                      : "TEACHER PORTAL"}
                  </div>

                  <h2>
                    Welcome Back 👋
                  </h2>

                  <p>
                    {loginType ===
                    "student"
                      ? "Login to continue to your student dashboard."
                      : "Login to continue to your teacher dashboard."}
                  </p>
                </div>

                <form
                  onSubmit={handleLogin}
                  className="racer-form"
                >
                  <div className="input-group">
                    <label htmlFor="username">
                      Username
                    </label>

                    <div className="input-box">
                      <span>
                        👤
                      </span>

                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) =>
                          setUsername(
                            e.target.value
                          )
                        }
                        placeholder={
                          loginType ===
                          "student"
                            ? "Enter student username"
                            : "Enter teacher username"
                        }
                        autoComplete="username"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="password">
                      Password
                    </label>

                    <div className="input-box">
                      <span>
                        🔒
                      </span>

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword(
                            (previous) =>
                              !previous
                          )
                        }
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword
                          ? "🙈"
                          : "👁️"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="login-error">
                      <span>⚠️</span>
                      <span>
                        {error}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="login-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Login as{" "}
                        {loginType ===
                        "student"
                          ? "Student"
                          : "Teacher"}
                        <span>
                          →
                        </span>
                      </>
                    )}
                  </button>
                </form>

                <div className="secure-footer">
                  <span>
                    🔒 Secure Login
                  </span>

                  <span className="footer-separator">
                    •
                  </span>

                  <span>
                    ⚡ Fast & Reliable
                  </span>
                </div>

                <div className="login-help">
                  {loginType ===
                  "student"
                    ? "Students: use the username and password provided by RACER ACADEMY."
                    : "Teachers: use your academy teacher credentials."}
                </div>
              </section>

              {announcements.length >
                0 && (
                <div className="announcement-mini">
                  <span>📢</span>

                  <div>
                    <strong>
                      Latest Update
                    </strong>

                    <p>
                      {
                        announcements[0]
                          .title
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openModal(
                        "contact"
                      )
                    }
                  >
                    →
                  </button>
                </div>
              )}
            </aside>
          </section>

          <footer className="page-footer">
            <span>
              © {new Date().getFullYear()}{" "}
              RACER ACADEMY
            </span>

            <span>
              Learn • Grow • Achieve
            </span>
          </footer>
        </div>
      </main>

      {/* =========================================
          DETAILS MODAL
      ========================================= */}

      {activeModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="details-modal">
            <div className="modal-header">
              <div>
                <div className="modal-small-title">
                  RACER ACADEMY
                </div>

                <h2>
                  {getModalTitle()}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {modalContent()}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .racer-login-page {
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(99, 102, 241, 0.16),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(14, 165, 233, 0.13),
              transparent 28%
            ),
            #f8fafc;
          position: relative;
          padding: 18px;
          color: #0f172a;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.35;
          background-image:
            linear-gradient(
              rgba(15, 23, 42, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(15, 23, 42, 0.025) 1px,
              transparent 1px
            );
          background-size: 32px 32px;
        }

        .background-orb {
          position: fixed;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          filter: blur(3px);
          pointer-events: none;
          opacity: 0.45;
        }

        .orb-one {
          background: #c7d2fe;
          top: -150px;
          left: -100px;
        }

        .orb-two {
          background: #bae6fd;
          bottom: -150px;
          right: -100px;
        }

        .page-shell {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
        }

        .top-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 auto 18px;
          max-width: 1380px;
        }

        .brand-mark {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #4f46e5,
            #7c3aed
          );
          color: white;
          font-size: 24px;
          box-shadow:
            0 10px 25px rgba(79, 70, 229, 0.25);
        }

        .brand-name {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.4px;
          color: #0f172a;
        }

        .brand-tagline {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .main-layout {
          width: 100%;
          display: grid;
          grid-template-columns:
            minmax(0, 1.45fr)
            minmax(390px, 0.72fr);
          gap: 22px;
          align-items: start;
        }

        .academy-side {
          min-width: 0;
        }

        .academy-hero {
          min-height: 365px;
          border-radius: 30px;
          overflow: hidden;
          position: relative;
          display: grid;
          grid-template-columns:
            minmax(0, 1.05fr)
            minmax(280px, 0.75fr);
          background:
            linear-gradient(
              135deg,
              #0f172a 0%,
              #1e3a8a 55%,
              #312e81 100%
            );
          color: white;
          box-shadow:
            0 22px 60px rgba(15, 23, 42, 0.18);
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .hero-glow-one {
          width: 340px;
          height: 340px;
          background: rgba(255, 255, 255, 0.07);
          right: -130px;
          top: -150px;
        }

        .hero-glow-two {
          width: 220px;
          height: 220px;
          background: rgba(125, 211, 252, 0.1);
          left: -100px;
          bottom: -130px;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          padding: 38px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .welcome-pill {
          align-self: flex-start;
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 18px;
        }

        .hero-content h1 {
          margin: 0;
          font-size: clamp(
            40px,
            5vw,
            68px
          );
          line-height: 0.96;
          letter-spacing: -2.5px;
          font-weight: 950;
        }

        .hero-content h1 span {
          color: #93c5fd;
        }

        .hero-description {
          max-width: 620px;
          margin: 20px 0 0;
          color: #dbeafe;
          font-size: 15px;
          line-height: 1.7;
        }

        .hero-mini-stats {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 25px;
          max-width: 540px;
        }

        .hero-mini-stats div {
          padding: 12px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hero-mini-stats strong,
        .hero-mini-stats span {
          display: block;
        }

        .hero-mini-stats strong {
          font-size: 16px;
          color: white;
        }

        .hero-mini-stats span {
          margin-top: 3px;
          color: #bfdbfe;
          font-size: 11px;
        }

        .hero-image-wrap {
          min-height: 365px;
          position: relative;
          overflow: hidden;
        }

        .hero-image-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              #1e3a8a 0%,
              rgba(30, 58, 138, 0.25) 28%,
              transparent 65%
            );
        }

        .hero-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .image-badge {
          position: absolute;
          z-index: 3;
          left: 22px;
          bottom: 22px;
          right: 22px;
          padding: 11px 14px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.76);
          backdrop-filter: blur(12px);
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .image-badge span {
          margin-right: 6px;
        }

        .basic-info-card {
          margin-top: 18px;
          padding: 25px;
          border-radius: 24px;
          background: white;
          border: 1px solid #e2e8f0;
          box-shadow:
            0 10px 35px rgba(15, 23, 42, 0.07);
        }

        .section-small-title {
          color: #4f46e5;
          font-size: 10px;
          letter-spacing: 1.3px;
          font-weight: 950;
          margin-bottom: 6px;
        }

        .basic-info-card h2 {
          margin: 0;
          font-size: 27px;
          line-height: 1.15;
          letter-spacing: -0.7px;
        }

        .basic-info-card h2 span {
          color: #4f46e5;
        }

        .basic-info-card > p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          max-width: 850px;
          margin: 10px 0 20px;
        }

        .option-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .option-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 13px;
          background: #fff;
          display: grid;
          grid-template-columns:
            42px minmax(0, 1fr) 20px;
          align-items: center;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .option-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 9px 22px rgba(15, 23, 42, 0.08);
          border-color: #c7d2fe;
        }

        .option-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
        }

        .option-card strong,
        .option-card small {
          display: block;
        }

        .option-card strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
        }

        .option-card small {
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }

        .option-card b {
          color: #64748b;
          font-size: 18px;
        }

        .option-blue .option-icon {
          background: #dbeafe;
        }

        .option-purple .option-icon {
          background: #ede9fe;
        }

        .option-green .option-icon {
          background: #dcfce7;
        }

        .option-orange .option-icon {
          background: #ffedd5;
        }

        .option-pink .option-icon {
          background: #fce7f3;
        }

        .option-indigo .option-icon {
          background: #e0e7ff;
        }

        .option-yellow .option-icon {
          background: #fef3c7;
        }

        .option-cyan .option-icon {
          background: #cffafe;
        }

        .highlight-strip {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .highlight-strip div {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 13px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 12px;
        }

        .highlight-strip span {
          font-size: 20px;
        }

        .bottom-options {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .bottom-options button {
          flex: 1;
          border: 1px solid #dbe3ef;
          background: white;
          border-radius: 14px;
          padding: 12px;
          cursor: pointer;
          color: #334155;
          font-weight: 800;
          font-size: 12px;
        }

        .bottom-options button:hover {
          background: #f8fafc;
        }

        .login-side {
          position: sticky;
          top: 18px;
          min-width: 0;
        }

        .racer-login-card {
          position: relative;
          overflow: hidden;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 27px;
          padding: 27px;
          box-shadow:
            0 20px 55px rgba(15, 23, 42, 0.12);
        }

        .login-top-decoration {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 5px;
          background: linear-gradient(
            90deg,
            #4f46e5,
            #7c3aed,
            #0ea5e9
          );
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .login-logo-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #7c3aed
            );
          font-size: 23px;
          box-shadow:
            0 8px 20px rgba(79, 70, 229, 0.22);
        }

        .login-brand {
          font-size: 21px;
          line-height: 1;
          font-weight: 950;
          color: #0f172a;
        }

        .login-brand span {
          display: block;
          color: #4f46e5;
          font-size: 13px;
          letter-spacing: 2px;
          margin-top: 4px;
        }

        .login-subtitle {
          margin-top: 5px;
          font-size: 10px;
          color: #94a3b8;
          font-weight: 700;
        }

        .login-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 4px;
          border-radius: 14px;
          background: #f1f5f9;
          gap: 4px;
        }

        .switch-button {
          border: 0;
          background: transparent;
          color: #64748b;
          padding: 11px 8px;
          border-radius: 11px;
          font-weight: 850;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .switch-button.active {
          background: white;
          color: #4f46e5;
          box-shadow:
            0 4px 12px rgba(15, 23, 42, 0.08);
        }

        .login-heading {
          margin: 24px 0 19px;
        }

        .portal-badge {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 8px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .login-heading h2 {
          margin: 10px 0 5px;
          font-size: 25px;
          letter-spacing: -0.6px;
        }

        .login-heading p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .racer-form {
          display: grid;
          gap: 15px;
        }

        .input-group label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 11px;
          font-weight: 850;
        }

        .input-box {
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #dbe3ef;
          border-radius: 13px;
          background: #f8fafc;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .input-box:focus-within {
          border-color: #818cf8;
          background: white;
          box-shadow:
            0 0 0 3px
              rgba(99, 102, 241, 0.1);
        }

        .input-box > span {
          font-size: 17px;
        }

        .input-box input {
          flex: 1;
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font-size: 13px;
        }

        .input-box input::placeholder {
          color: #94a3b8;
        }

        .password-toggle {
          border: 0;
          background: transparent;
          cursor: pointer;
          padding: 4px;
          font-size: 15px;
        }

        .login-error {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          padding: 10px 11px;
          border-radius: 11px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 11px;
          line-height: 1.45;
          word-break: break-word;
        }

        .login-button {
          min-height: 50px;
          border: 0;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #7c3aed
            );
          color: white;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow:
            0 10px 24px
              rgba(79, 70, 229, 0.22);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 13px 28px
              rgba(79, 70, 229, 0.28);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid
            rgba(255, 255, 255, 0.35);
          border-top-color: white;
          border-radius: 50%;
          animation:
            racer-spin 0.7s linear infinite;
        }

        @keyframes racer-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .secure-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 17px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .footer-separator {
          color: #cbd5e1;
        }

        .login-help {
          margin-top: 14px;
          padding-top: 13px;
          border-top: 1px solid #eef2f7;
          text-align: center;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.5;
        }

        .announcement-mini {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 30px;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border-radius: 15px;
          background: white;
          border: 1px solid #e2e8f0;
        }

        .announcement-mini > span {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fef3c7;
        }

        .announcement-mini strong {
          display: block;
          font-size: 10px;
          color: #4f46e5;
        }

        .announcement-mini p {
          margin: 2px 0 0;
          font-size: 11px;
          font-weight: 800;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .announcement-mini button {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 9px;
          background: #eef2ff;
          color: #4f46e5;
          cursor: pointer;
          font-weight: 900;
        }

        .page-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 4px 5px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }

        /* =========================================
           MODAL
        ========================================= */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.68);
          backdrop-filter: blur(7px);
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .details-modal {
          width: 100%;
          max-width: 1050px;
          max-height: 90vh;
          overflow: hidden;
          border-radius: 25px;
          background: white;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          flex-shrink: 0;
          padding: 20px 22px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .modal-small-title {
          color: #4f46e5;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.2px;
        }

        .modal-header h2 {
          margin: 3px 0 0;
          font-size: 23px;
          color: #0f172a;
        }

        .modal-close {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 11px;
          background: #f1f5f9;
          color: #334155;
          font-size: 25px;
          cursor: pointer;
        }

        .modal-close:hover {
          background: #e2e8f0;
        }

        .modal-body {
          overflow-y: auto;
          padding: 22px;
        }

        .modal-footer {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
          padding: 13px 20px;
          border-top: 1px solid #e2e8f0;
        }

        .modal-footer button {
          border: 0;
          border-radius: 10px;
          background: #0f172a;
          color: white;
          padding: 9px 18px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .fee-note {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 13px;
          margin-bottom: 15px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 11px;
        }

        .fee-note strong {
          color: #047857;
        }

        .fee-note span:not(:last-child)::after {
          content: "•";
          margin-left: 8px;
          color: #cbd5e1;
        }

        .fee-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }

        .fee-table {
          width: 100%;
          min-width: 680px;
          border-collapse: collapse;
        }

        .fee-table th {
          background: #f1f5f9;
          color: #334155;
          font-size: 11px;
          text-align: left;
          padding: 11px;
          white-space: nowrap;
        }

        .fee-table td {
          padding: 10px 11px;
          border-top: 1px solid #e2e8f0;
          color: #475569;
          font-size: 11px;
        }

        .fee-green {
          color: #047857 !important;
          font-weight: 900;
        }

        .fee-purple {
          color: #7c3aed !important;
          font-weight: 900;
        }

        .modal-section {
          text-align: center;
        }

        .big-info-icon,
        .large-detail-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          background: #eef2ff;
          font-size: 29px;
        }

        .modal-section h3,
        .simple-detail-modal h3 {
          margin: 0 0 6px;
          font-size: 20px;
          color: #0f172a;
        }

        .modal-main-text {
          color: #4f46e5;
          font-weight: 850;
          margin: 0;
        }

        .subject-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 20px 0;
        }

        .subject-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }

        .subject-pill span {
          color: #16a34a;
        }

        .modal-text-box {
          padding: 15px;
          border-radius: 13px;
          background: #f8fafc;
          color: #475569;
          line-height: 1.7;
          white-space: pre-line;
          text-align: left;
          font-size: 13px;
        }

        .timing-modal-grid,
        .modal-card-grid,
        .faculty-modal-grid,
        .contact-modal-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .timing-modal-card,
        .info-modal-card,
        .contact-detail-card {
          padding: 17px;
          border-radius: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .timing-icon,
        .info-card-icon {
          font-size: 25px;
          margin-bottom: 7px;
        }

        .timing-modal-card h3,
        .info-modal-card h3,
        .contact-detail-card h3 {
          margin: 0 0 6px;
          font-size: 15px;
          color: #0f172a;
        }

        .timing-time {
          color: #4f46e5;
          font-weight: 900;
          font-size: 14px;
        }

        .timing-days {
          color: #64748b;
          font-size: 11px;
          margin-top: 3px;
        }

        .timing-modal-card p,
        .info-modal-card p,
        .contact-detail-card p {
          margin: 8px 0 0;
          color: #64748b;
          line-height: 1.5;
          font-size: 12px;
        }

        .faculty-modal-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
        }

        .faculty-modal-card img,
        .faculty-placeholder {
          width: 100%;
          height: 170px;
          object-fit: cover;
          display: block;
        }

        .faculty-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          background:
            linear-gradient(
              135deg,
              #dbeafe,
              #ede9fe
            );
        }

        .faculty-modal-body {
          padding: 14px;
        }

        .faculty-modal-body h3 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .faculty-modal-body strong {
          color: #4f46e5;
          font-size: 12px;
        }

        .faculty-modal-body p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.45;
        }

        .simple-detail-modal {
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
        }

        .simple-detail-modal > p {
          color: #475569;
          line-height: 1.7;
          white-space: pre-line;
          font-size: 13px;
        }

        .achievement-points {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 10px;
          margin-top: 18px;
          text-align: left;
        }

        .achievement-points div {
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
        }

        .achievement-points span {
          color: #16a34a;
          margin-right: 7px;
        }

        .rule-highlight,
        .why-box {
          margin-top: 18px;
          padding: 15px;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #eef2ff,
              #ecfdf5
            );
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .rule-highlight strong,
        .why-box strong {
          color: #4f46e5;
        }

        .rule-highlight span,
        .why-box span {
          color: #475569;
          font-size: 12px;
          line-height: 1.5;
        }

        .gallery-modal-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 13px;
        }

        .gallery-modal-card {
          position: relative;
          height: 210px;
          overflow: hidden;
          border-radius: 15px;
        }

        .gallery-modal-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gallery-modal-card div {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 30px 12px 11px;
          color: white;
          font-size: 12px;
          font-weight: 900;
          background:
            linear-gradient(
              transparent,
              rgba(0, 0, 0, 0.75)
            );
        }

        .gallery-description {
          grid-column: 1 / -1;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .contact-detail-card span {
          font-size: 25px;
        }

        .contact-detail-card a {
          display: block;
          margin-top: 8px;
          color: #4f46e5;
          font-size: 12px;
          font-weight: 800;
          word-break: break-word;
          text-decoration: none;
        }

        .contact-detail-card a:hover {
          text-decoration: underline;
        }

        .contact-admission-box {
          grid-column: 1 / -1;
          padding: 16px;
          border-radius: 15px;
          background:
            linear-gradient(
              135deg,
              #eef2ff,
              #ecfdf5
            );
        }

        .contact-admission-box strong {
          color: #4f46e5;
          font-size: 14px;
        }

        .contact-admission-box p {
          margin: 7px 0 0;
          color: #475569;
          line-height: 1.6;
          font-size: 12px;
        }

        .about-modal-image {
          width: 100%;
          height: 190px;
          overflow: hidden;
          border-radius: 16px;
          margin-bottom: 16px;
        }

        .about-modal-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .about-tagline {
          color: #4f46e5 !important;
          font-weight: 850;
        }

        .empty-modal {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 45px;
          margin-bottom: 10px;
        }

        .empty-modal h3 {
          margin: 0 0 5px;
        }

        .empty-modal p {
          color: #64748b;
          font-size: 13px;
        }

        @media (max-width: 1120px) {
          .main-layout {
            grid-template-columns:
              minmax(0, 1.25fr)
              minmax(350px, 0.75fr);
          }

          .academy-hero {
            grid-template-columns: 1fr;
          }

          .hero-image-wrap {
            display: none;
          }

          .hero-content {
            min-height: 365px;
          }
        }

        @media (max-width: 900px) {
          .racer-login-page {
            padding: 12px;
          }

          .main-layout {
            grid-template-columns: 1fr;
          }

          .login-side {
            position: static;
          }

          .academy-hero {
            min-height: auto;
          }

          .hero-content {
            min-height: auto;
            padding: 32px;
          }

          .option-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .racer-login-page {
            padding: 8px;
          }

          .top-brand {
            margin-bottom: 10px;
          }

          .brand-mark {
            width: 42px;
            height: 42px;
            font-size: 20px;
          }

          .brand-name {
            font-size: 15px;
          }

          .academy-hero {
            border-radius: 22px;
          }

          .hero-content {
            padding: 25px 20px;
          }

          .hero-content h1 {
            font-size: 45px;
          }

          .hero-description {
            font-size: 13px;
          }

          .hero-mini-stats {
            gap: 7px;
          }

          .hero-mini-stats div {
            padding: 9px;
          }

          .hero-mini-stats strong {
            font-size: 12px;
          }

          .hero-mini-stats span {
            font-size: 9px;
          }

          .basic-info-card {
            padding: 17px;
            border-radius: 19px;
          }

          .basic-info-card h2 {
            font-size: 23px;
          }

          .option-grid {
            grid-template-columns: 1fr;
          }

          .highlight-strip {
            grid-template-columns: 1fr;
          }

          .bottom-options {
            flex-direction: column;
          }

          .racer-login-card {
            padding: 20px 16px;
            border-radius: 21px;
          }

          .login-heading h2 {
            font-size: 22px;
          }

          .page-footer {
            flex-direction: column;
            text-align: center;
          }

          .modal-overlay {
            padding: 8px;
          }

          .details-modal {
            max-height: 94vh;
            border-radius: 20px;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-body {
            padding: 15px;
          }

          .subject-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .timing-modal-grid,
          .modal-card-grid,
          .faculty-modal-grid,
          .contact-modal-grid {
            grid-template-columns: 1fr;
          }

          .achievement-points {
            grid-template-columns: 1fr;
          }

          .gallery-modal-grid {
            grid-template-columns: 1fr;
          }

          .gallery-modal-card {
            height: 190px;
          }

          .contact-admission-box {
            grid-column: auto;
          }
        }

        @media (max-width: 390px) {
          .login-switch {
            grid-template-columns: 1fr;
          }

          .hero-mini-stats {
            grid-template-columns: 1fr;
          }

          .hero-content h1 {
            font-size: 39px;
          }

          .secure-footer {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}