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

const defaultAcademyProfile: AcademyProfile = {
  academy_name: "RACER ACADEMY",
  tagline: "Learn • Grow • Achieve",
  about_text:
    "RACER ACADEMY provides focused academic support and tuition for students from Nursery to Class 10.",
  classes_text:
    "Nursery to Class 10 | Strong foundation | School support | Regular tests",
  facilities_text:
    "Dedicated classrooms, regular tests, doubt support, study guidance and individual attention.",
  timings_text:
    "Flexible batches for school-going students with dedicated study and test sessions.",
  faculty_text:
    "Experienced and supportive teachers focused on concept clarity and student progress.",
  achievements_text:
    "Regular academic tests, performance tracking and continuous student improvement.",
  why_choose_us:
    "Personal attention, regular assessment, disciplined learning environment and parent-friendly communication.",
  rules_text:
    "Students should maintain discipline, attend classes regularly and complete assigned work on time.",
  contact_text:
    "Contact RACER ACADEMY for admissions, batch details and academic guidance.",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  admission_text:
    "Admissions are open. Contact RACER ACADEMY for available batches and admission details.",
  gallery_text:
    "Academy classrooms, learning activities and student-focused academic environment.",
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

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [academyLoading, setAcademyLoading] =
    useState(true);

  const [academy, setAcademy] =
    useState<AcademyProfile>(
      defaultAcademyProfile
    );

  const [fees, setFees] =
    useState<AcademyFee[]>([]);

  const [facilities, setFacilities] =
    useState<AcademyFacility[]>([]);

  const [timings, setTimings] =
    useState<AcademyTiming[]>([]);

  const [faculty, setFaculty] =
    useState<AcademyFaculty[]>([]);

  const [announcements, setAnnouncements] =
    useState<AcademyAnnouncement[]>([]);

  useEffect(() => {
    async function loadAcademyData() {
      try {
        setAcademyLoading(true);

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
            .select(
              "id,title,description,icon"
            )
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

        if (
          feesResult.data &&
          !feesResult.error
        ) {
          setFees(feesResult.data);
        }

        if (
          facilitiesResult.data &&
          !facilitiesResult.error
        ) {
          setFacilities(
            facilitiesResult.data
          );
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
      } finally {
        setAcademyLoading(false);
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

      console.log(
        "LOGIN TYPE:",
        loginType
      );

      console.log(
        "FUNCTION:",
        functionName
      );

      console.log(
        "USERNAME:",
        username.trim()
      );

      const { data, error: loginError } =
        await supabase.rpc(
          functionName,
          {
            p_username: username.trim(),
            p_password: password,
          }
        );

      console.log(
        "SUPABASE DATA:",
        data
      );

      console.log(
        "SUPABASE ERROR:",
        loginError
      );

      if (loginError) {
        console.error(
          "LOGIN ERROR:",
          loginError
        );

        if (loginType === "student") {
          setError(
            `Student Login Error: ${loginError.message} | Code: ${
              loginError.code || "N/A"
            }`
          );
        } else {
          setError(
            `Teacher Login Error: ${loginError.message} | Code: ${
              loginError.code || "N/A"
            }`
          );
        }

        return;
      }

      if (
        !data ||
        (Array.isArray(data) &&
          data.length === 0)
      ) {
        console.error(
          "EMPTY LOGIN RESPONSE:",
          data
        );

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

      console.log(
        "USER DATA:",
        userData
      );

      // ==========================================
      // STUDENT LOGIN
      // ==========================================

      if (loginType === "student") {
        const currentStudentId =
          Number(userData.id);

        if (
          Number.isInteger(
            currentStudentId
          ) &&
          currentStudentId > 0
        ) {
          const {
            error: activityError,
          } = await supabase
            .from(
              "student_login_activity"
            )
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
          } else {
            console.log(
              "Student login activity saved successfully:",
              currentStudentId
            );
          }
        } else {
          console.error(
            "Invalid student ID. Login activity was not saved:",
            userData.id
          );
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

      // ==========================================
      // TEACHER LOGIN
      // ==========================================

      localStorage.setItem(
        "racer_academy_teacher",
        JSON.stringify(userData)
      );

      localStorage.setItem(
        "teacher",
        JSON.stringify(userData)
      );

      router.push("/teacher");
    } catch (err) {
      console.error(
        "UNEXPECTED ERROR:",
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

  return (
    <main className="racer-login-page">
      {/* ==========================================
          BACKGROUND
      ========================================== */}

      <div className="racer-orb racer-orb-one" />
      <div className="racer-orb racer-orb-two" />
      <div className="racer-grid" />

      {/* ==========================================
          ACADEMY HERO
      ========================================== */}

      <section
        style={{
          width: "100%",
          maxWidth: "1250px",
          margin: "0 auto 28px",
          position: "relative",
          zIndex: 2,
          padding: "0 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #312e81 100%)",
            borderRadius: "28px",
            padding: "38px",
            color: "#ffffff",
            boxShadow:
              "0 20px 60px rgba(15,23,42,0.22)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "260px",
              height: "260px",
              borderRadius: "50%",
              background:
                "rgba(255,255,255,0.07)",
              right: "-80px",
              top: "-100px",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background:
                "rgba(255,255,255,0.06)",
              left: "-70px",
              bottom: "-100px",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
              gap: "30px",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "7px 14px",
                  borderRadius: "999px",
                  background:
                    "rgba(255,255,255,0.14)",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  marginBottom: "14px",
                }}
              >
                WELCOME TO
              </div>

              <h1
                style={{
                  margin: "0 0 10px",
                  fontSize:
                    "clamp(32px, 5vw, 58px)",
                  lineHeight: 1.05,
                  fontWeight: 900,
                  letterSpacing: "-1px",
                }}
              >
                {academy.academy_name ||
                  "RACER ACADEMY"}
              </h1>

              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#bfdbfe",
                }}
              >
                {academy.tagline ||
                  "Learn • Grow • Achieve"}
              </p>

              <p
                style={{
                  margin: 0,
                  maxWidth: "720px",
                  color: "#dbeafe",
                  fontSize: "16px",
                  lineHeight: 1.7,
                }}
              >
                {academy.about_text ||
                  defaultAcademyProfile.about_text}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              {[
                ["🎓", "Nursery – 10"],
                ["📚", "Regular Tests"],
                ["👨‍🏫", "Expert Guidance"],
                ["📈", "Performance Tracking"],
              ].map(
                ([icon, text]) => (
                  <div
                    key={text}
                    style={{
                      background:
                        "rgba(255,255,255,0.10)",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "18px",
                      padding: "18px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "28px",
                        marginBottom: "8px",
                      }}
                    >
                      {icon}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "#ffffff",
                      }}
                    >
                      {text}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          MAIN CONTENT
      ========================================== */}

      <section
        style={{
          width: "100%",
          maxWidth: "1250px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
          padding: "0 16px 30px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.6fr) minmax(330px, 0.75fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ======================================
              ACADEMY INFORMATION
          ====================================== */}

          <div>
            {/* ABOUT */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#4f46e5",
                  letterSpacing: "1px",
                  marginBottom: "7px",
                }}
              >
                ABOUT THE ACADEMY
              </div>

              <h2
                style={{
                  margin: "0 0 12px",
                  color: "#0f172a",
                  fontSize: "28px",
                }}
              >
                Why Choose RACER ACADEMY?
              </h2>

              <p
                style={{
                  margin: "0 0 15px",
                  color: "#475569",
                  lineHeight: 1.7,
                }}
              >
                {academy.about_text}
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  lineHeight: 1.7,
                }}
              >
                {academy.why_choose_us}
              </p>
            </section>

            {/* CLASSES */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 14px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                📚 Classes & Subjects
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  whiteSpace: "pre-line",
                  lineHeight: 1.7,
                }}
              >
                {academy.classes_text}
              </p>
            </section>

            {/* FEES */}

            {fees.length > 0 && (
              <section
                style={{
                  background: "#ffffff",
                  borderRadius: "22px",
                  padding: "26px",
                  marginBottom: "20px",
                  boxShadow:
                    "0 8px 30px rgba(0,0,0,0.07)",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 18px",
                    color: "#0f172a",
                    fontSize: "24px",
                  }}
                >
                  💰 Subject-wise Fee Structure
                </h2>

                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: "600px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "#f1f5f9",
                        }}
                      >
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#334155",
                          }}
                        >
                          Class
                        </th>

                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#334155",
                          }}
                        >
                          Subject
                        </th>

                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#334155",
                          }}
                        >
                          Fee
                        </th>

                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#334155",
                          }}
                        >
                          Period
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {fees.map(
                        (fee) => (
                          <tr
                            key={fee.id}
                            style={{
                              borderBottom:
                                "1px solid #e2e8f0",
                            }}
                          >
                            <td
                              style={{
                                padding: "12px",
                                color:
                                  "#0f172a",
                                fontWeight: 700,
                              }}
                            >
                              {fee.class_name}
                            </td>

                            <td
                              style={{
                                padding: "12px",
                                color:
                                  "#475569",
                              }}
                            >
                              {fee.subject_name}
                            </td>

                            <td
                              style={{
                                padding: "12px",
                                color:
                                  "#047857",
                                fontWeight: 800,
                              }}
                            >
                              ₹
                              {Number(
                                fee.fee_amount
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </td>

                            <td
                              style={{
                                padding: "12px",
                                color:
                                  "#475569",
                              }}
                            >
                              {fee.fee_period}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* TIMINGS */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 18px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                🕒 Batch Timings
              </h2>

              {timings.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {timings.map(
                    (timing) => (
                      <div
                        key={timing.id}
                        style={{
                          background:
                            "#f8fafc",
                          borderRadius:
                            "16px",
                          padding: "18px",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <h3
                          style={{
                            margin:
                              "0 0 8px",
                            color:
                              "#0f172a",
                            fontSize:
                              "17px",
                          }}
                        >
                          {timing.title}
                        </h3>

                        <div
                          style={{
                            color:
                              "#4f46e5",
                            fontWeight: 800,
                            marginBottom:
                              "6px",
                          }}
                        >
                          {timing.start_time} –{" "}
                          {timing.end_time}
                        </div>

                        <div
                          style={{
                            color:
                              "#64748b",
                            fontSize:
                              "14px",
                            marginBottom:
                              "8px",
                          }}
                        >
                          {timing.days}
                        </div>

                        <p
                          style={{
                            margin: 0,
                            color:
                              "#475569",
                            fontSize:
                              "14px",
                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            timing.description
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    whiteSpace:
                      "pre-line",
                  }}
                >
                  {academy.timings_text}
                </p>
              )}
            </section>

            {/* FACILITIES */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 18px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                🏆 Facilities
              </h2>

              {facilities.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {facilities.map(
                    (facility) => (
                      <div
                        key={
                          facility.id
                        }
                        style={{
                          padding: "18px",
                          borderRadius:
                            "16px",
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "30px",
                            marginBottom:
                              "8px",
                          }}
                        >
                          {facility.icon ||
                            "⭐"}
                        </div>

                        <h3
                          style={{
                            margin:
                              "0 0 7px",
                            color:
                              "#0f172a",
                            fontSize:
                              "17px",
                          }}
                        >
                          {
                            facility.title
                          }
                        </h3>

                        <p
                          style={{
                            margin: 0,
                            color:
                              "#64748b",
                            fontSize:
                              "14px",
                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            facility.description
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    whiteSpace:
                      "pre-line",
                    lineHeight: 1.7,
                  }}
                >
                  {
                    academy.facilities_text
                  }
                </p>
              )}
            </section>

            {/* FACULTY */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 18px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                👨‍🏫 Our Faculty
              </h2>

              {faculty.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {faculty.map(
                    (teacher) => (
                      <div
                        key={
                          teacher.id
                        }
                        style={{
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "18px",
                          overflow:
                            "hidden",
                          background:
                            "#f8fafc",
                        }}
                      >
                        {teacher.photo_url ? (
                          <img
                            src={
                              teacher.photo_url
                            }
                            alt={
                              teacher.teacher_name
                            }
                            style={{
                              width:
                                "100%",
                              height:
                                "190px",
                              objectFit:
                                "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              height:
                                "190px",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize:
                                "70px",
                              background:
                                "linear-gradient(135deg,#dbeafe,#ede9fe)",
                            }}
                          >
                            👨‍🏫
                          </div>
                        )}

                        <div
                          style={{
                            padding:
                              "16px",
                          }}
                        >
                          <h3
                            style={{
                              margin:
                                "0 0 6px",
                              color:
                                "#0f172a",
                              fontSize:
                                "18px",
                            }}
                          >
                            {
                              teacher.teacher_name
                            }
                          </h3>

                          <div
                            style={{
                              color:
                                "#4f46e5",
                              fontWeight:
                                800,
                              fontSize:
                                "14px",
                            }}
                          >
                            {
                              teacher.subject
                            }
                          </div>

                          <p
                            style={{
                              margin:
                                "8px 0 0",
                              color:
                                "#64748b",
                              fontSize:
                                "13px",
                              lineHeight:
                                1.5,
                            }}
                          >
                            {
                              teacher.qualification
                            }
                            {teacher.experience
                              ? ` • ${teacher.experience}`
                              : ""}
                          </p>

                          {teacher.description && (
                            <p
                              style={{
                                margin:
                                  "8px 0 0",
                                color:
                                  "#475569",
                                fontSize:
                                  "13px",
                                lineHeight:
                                  1.5,
                              }}
                            >
                              {
                                teacher.description
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    whiteSpace:
                      "pre-line",
                    lineHeight: 1.7,
                  }}
                >
                  {academy.faculty_text}
                </p>
              )}
            </section>

            {/* WHY CHOOSE US */}

            <section
              style={{
                background:
                  "linear-gradient(135deg,#ecfdf5,#eff6ff)",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 12px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                ⭐ Why Choose Us
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#334155",
                  whiteSpace:
                    "pre-line",
                  lineHeight: 1.7,
                }}
              >
                {academy.why_choose_us}
              </p>
            </section>

            {/* ACHIEVEMENTS */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 12px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                🏅 Achievements
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  whiteSpace:
                    "pre-line",
                  lineHeight: 1.7,
                }}
              >
                {
                  academy.achievements_text
                }
              </p>
            </section>

            {/* RULES */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 12px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                📋 Academy Rules
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  whiteSpace:
                    "pre-line",
                  lineHeight: 1.7,
                }}
              >
                {academy.rules_text}
              </p>
            </section>

            {/* GALLERY */}

            <section
              style={{
                background: "#ffffff",
                borderRadius: "22px",
                padding: "26px",
                marginBottom: "20px",
                boxShadow:
                  "0 8px 30px rgba(0,0,0,0.07)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 18px",
                  color: "#0f172a",
                  fontSize: "24px",
                }}
              >
                📸 Academy Gallery
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                }}
              >
                {defaultGalleryImages.map(
                  (image) => (
                    <div
                      key={image.src}
                      style={{
                        position:
                          "relative",
                        overflow:
                          "hidden",
                        borderRadius:
                          "18px",
                        height: "180px",
                      }}
                    >
                      <img
                        src={image.src}
                        alt={image.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "cover",
                        }}
                      />

                      <div
                        style={{
                          position:
                            "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          padding:
                            "30px 14px 12px",
                          color:
                            "#ffffff",
                          fontWeight:
                            800,
                          background:
                            "linear-gradient(transparent,rgba(0,0,0,0.75))",
                        }}
                      >
                        {image.title}
                      </div>
                    </div>
                  )
                )}
              </div>

              <p
                style={{
                  margin:
                    "14px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                {academy.gallery_text}
              </p>
            </section>

            {/* ANNOUNCEMENTS */}

            {announcements.length > 0 && (
              <section
                style={{
                  background:
                    "#ffffff",
                  borderRadius:
                    "22px",
                  padding: "26px",
                  marginBottom:
                    "20px",
                  boxShadow:
                    "0 8px 30px rgba(0,0,0,0.07)",
                }}
              >
                <h2
                  style={{
                    margin:
                      "0 0 18px",
                    color:
                      "#0f172a",
                    fontSize:
                      "24px",
                  }}
                >
                  📢 Latest Updates
                </h2>

                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px",
                  }}
                >
                  {announcements.map(
                    (
                      announcement
                    ) => (
                      <div
                        key={
                          announcement.id
                        }
                        style={{
                          padding:
                            "16px",
                          background:
                            "#f8fafc",
                          borderRadius:
                            "14px",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <h3
                          style={{
                            margin:
                              "0 0 6px",
                            color:
                              "#0f172a",
                            fontSize:
                              "17px",
                          }}
                        >
                          {
                            announcement.title
                          }
                        </h3>

                        <p
                          style={{
                            margin: 0,
                            color:
                              "#64748b",
                            lineHeight:
                              1.5,
                            whiteSpace:
                              "pre-line",
                          }}
                        >
                          {
                            announcement.content
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ======================================
              LOGIN CARD
          ====================================== */}

          <div
            style={{
              position:
                "sticky",
              top: "20px",
            }}
          >
            <section className="racer-login-card">
              {/* LOGO */}

              <div className="racer-logo-area">
                <div className="racer-logo">
                  🎓
                </div>

                <h1>
                  RACER
                  <span>ACADEMY</span>
                </h1>

                <p>
                  Smart Education &
                  Student Management
                </p>
              </div>

              {/* LOGIN SWITCH */}

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
                  <span className="switch-icon">
                    🎓
                  </span>

                  <span>
                    Student
                  </span>
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
                  <span className="switch-icon">
                    👨‍🏫
                  </span>

                  <span>
                    Teacher
                  </span>
                </button>
              </div>

              {/* HEADING */}

              <div className="racer-heading">
                <div className="portal-badge">
                  {loginType ===
                  "student"
                    ? "STUDENT PORTAL"
                    : "TEACHER PORTAL"}
                </div>

                <h2>
                  Welcome Back{" "}
                  <span>👋</span>
                </h2>

                <p>
                  {loginType ===
                  "student"
                    ? "Login to access your student dashboard."
                    : "Login to access your teacher dashboard."}
                </p>
              </div>

              {/* LOGIN FORM */}

              <form
                onSubmit={
                  handleLogin
                }
                className="racer-form"
              >
                {/* USERNAME */}

                <div className="racer-input-group">
                  <label htmlFor="username">
                    Username
                  </label>

                  <div className="racer-input">
                    <span className="field-icon">
                      👤
                    </span>

                    <input
                      id="username"
                      type="text"
                      value={
                        username
                      }
                      onChange={(
                        e
                      ) =>
                        setUsername(
                          e.target
                            .value
                        )
                      }
                      placeholder={
                        loginType ===
                        "student"
                          ? "Enter student username"
                          : "Enter teacher username"
                      }
                      autoComplete="username"
                      disabled={
                        loading
                      }
                    />
                  </div>
                </div>

                {/* PASSWORD */}

                <div className="racer-input-group">
                  <label htmlFor="password">
                    Password
                  </label>

                  <div className="racer-input">
                    <span className="field-icon">
                      🔒
                    </span>

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        e
                      ) =>
                        setPassword(
                          e.target
                            .value
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={
                        loading
                      }
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (
                            previous
                          ) =>
                            !previous
                        )
                      }
                      disabled={
                        loading
                      }
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

                {/* ERROR */}

                {error && (
                  <div className="racer-error">
                    <span>
                      ⚠️
                    </span>

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  className="racer-login-button"
                  disabled={
                    loading
                  }
                >
                  {loading ? (
                    <>
                      <span className="racer-spinner" />

                      <span>
                        Signing
                        in...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Login as{" "}
                        {loginType ===
                        "student"
                          ? "Student"
                          : "Teacher"}
                      </span>

                      <span className="login-arrow">
                        →
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* FOOTER */}

              <div className="racer-footer">
                <div className="security-line">
                  <span>
                    🔒
                  </span>
                  Secure Login
                </div>

                <span className="footer-dot">
                  •
                </span>

                <div className="security-line">
                  <span>
                    ⚡
                  </span>
                  Fast & Reliable
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* ==========================================
          CONTACT / ADMISSION
      ========================================== */}

      <section
        style={{
          width: "100%",
          maxWidth: "1250px",
          margin: "0 auto",
          padding: "0 16px 25px",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "26px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.07)",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "28px",
                marginBottom: "8px",
              }}
            >
              📍
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                color: "#0f172a",
              }}
            >
              Address
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {academy.address ||
                "RACER ACADEMY"}
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: "28px",
                marginBottom: "8px",
              }}
            >
              📞
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                color: "#0f172a",
              }}
            >
              Contact
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              {academy.phone ||
                "Contact academy"}
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: "28px",
                marginBottom: "8px",
              }}
            >
              💬
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                color: "#0f172a",
              }}
            >
              WhatsApp
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              {academy.whatsapp ||
                "Available on request"}
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: "28px",
                marginBottom: "8px",
              }}
            >
              🎓
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                color: "#0f172a",
              }}
            >
              Admissions
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {academy.admission_text}
            </p>
          </div>
        </div>
      </section>

      {/* BOTTOM BRAND */}

      <div className="racer-bottom-brand">
        RACER ACADEMY
      </div>

      {/* RESPONSIVE OVERRIDES */}

      <style jsx>{`
        @media (max-width: 900px) {
          section[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="position: sticky"] {
            position: static !important;
          }
        }

        @media (max-width: 640px) {
          .racer-login-page {
            padding: 14px !important;
          }

          .racer-login-card {
            padding: 20px !important;
          }

          section[style*="padding: 38px"] {
            padding: 25px !important;
          }
        }
      `}</style>
    </main>
  );
}