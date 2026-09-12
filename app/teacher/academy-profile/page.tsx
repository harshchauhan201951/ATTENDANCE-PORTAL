"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Profile = {
  id: number;
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

type Fee = {
  id: number;
  class_name: string;
  subject_name: string;
  fee_amount: number;
  fee_period: string;
  description: string;
  display_order: number;
};

type Facility = {
  id: number;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
};

type Timing = {
  id: number;
  title: string;
  days: string;
  start_time: string;
  end_time: string;
  description: string;
  display_order: number;
  is_active: boolean;
};

type Faculty = {
  id: number;
  teacher_name: string;
  subject: string;
  qualification: string;
  experience: string;
  photo_url: string;
  description: string;
  display_order: number;
  is_active: boolean;
};

type Announcement = {
  id: number;
  title: string;
  content: string;
  announcement_date: string;
  is_active: boolean;
  display_order: number;
};

const defaultProfile: Profile = {
  id: 1,
  academy_name: "RACER ACADEMY",
  tagline: "Learn • Grow • Achieve",
  about_text:
    "RACER ACADEMY is a child-focused tuition academy for students from Nursery to Class 10. We focus on strong concepts, regular practice, personal attention and continuous academic improvement.",
  classes_text:
    "Nursery to Class 10\nHindi Medium & English Medium\nHindi • English • Mathematics • Science • Social Science • General Knowledge",
  facilities_text:
    "Personal attention • Regular tests • Doubt solving • Concept-based teaching • Homework support • Performance monitoring • Quiet study environment • Parent communication",
  timings_text:
    "Evening tuition batches are available from 5:00 PM to 8:00 PM.\nStudents can choose suitable one-hour study slots according to batch availability.",
  faculty_text:
    "Our faculty is supportive, experienced and focused on making concepts easy to understand for children of different age groups.",
  achievements_text:
    "Students at RACER ACADEMY have shown improvement in their school performance, concepts, confidence and regular test results. We believe every student's progress is an achievement.",
  why_choose_us:
    "We do not run after fees. We run after the child and their learning.\n\nOur priority is to teach the child properly, clear every doubt, build strong concepts and help the student improve step by step.",
  rules_text:
    "Every student has the right to ask questions freely and without hesitation.\n\nStudents are expected to study without unnecessary noise or disturbance, respect teachers and classmates, attend regularly and complete assigned work on time.",
  contact_text:
    "For admission, batch availability, subjects and fee information, contact RACER ACADEMY through the phone, WhatsApp or email details provided below.",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  admission_text:
    "Admissions are open for Nursery to Class 10. Hindi Medium and English Medium options are available subject to batch availability.",
  gallery_text:
    "Photos of the academy, classrooms, students learning and academic activities can be added from the Edit Academy section.",
};

function getOneAndHalfHourFee(amount: number) {
  return Math.round(amount * 1.5);
}

function getMediumFromClass(className: string) {
  if (className.toLowerCase().includes("english medium")) {
    return "English Medium";
  }

  if (className.toLowerCase().includes("hindi medium")) {
    return "Hindi Medium";
  }

  return "";
}

function getCleanClassName(className: string) {
  return className
    .replace(/^English Medium\s*-\s*/i, "")
    .replace(/^Hindi Medium\s*-\s*/i, "");
}

export default function AcademyProfilePage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [fees, setFees] =
    useState<Fee[]>([]);

  const [facilities, setFacilities] =
    useState<Facility[]>([]);

  const [timings, setTimings] =
    useState<Timing[]>([]);

  const [faculty, setFaculty] =
    useState<Faculty[]>([]);

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadAcademyProfile() {
    setLoading(true);
    setError("");

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
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("academy_subject_fees")
          .select("*")
          .order("display_order", {
            ascending: true,
          })
          .order("class_name", {
            ascending: true,
          })
          .order("subject_name", {
            ascending: true,
          }),

        supabase
          .from("academy_facilities")
          .select("*")
          .eq("is_active", true)
          .order("display_order", {
            ascending: true,
          }),

        supabase
          .from("academy_timings")
          .select("*")
          .eq("is_active", true)
          .order("display_order", {
            ascending: true,
          }),

        supabase
          .from("academy_faculty")
          .select("*")
          .eq("is_active", true)
          .order("display_order", {
            ascending: true,
          }),

        supabase
          .from("academy_announcements")
          .select("*")
          .eq("is_active", true)
          .order("announcement_date", {
            ascending: false,
          })
          .order("display_order", {
            ascending: true,
          }),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (feesResult.error) {
        throw feesResult.error;
      }

      if (facilitiesResult.error) {
        throw facilitiesResult.error;
      }

      if (timingsResult.error) {
        throw timingsResult.error;
      }

      if (facultyResult.error) {
        throw facultyResult.error;
      }

      if (announcementsResult.error) {
        throw announcementsResult.error;
      }

      setProfile({
        ...defaultProfile,
        ...(profileResult.data || {}),
      });

      setFees(feesResult.data || []);
      setFacilities(facilitiesResult.data || []);
      setTimings(timingsResult.data || []);
      setFaculty(facultyResult.data || []);
      setAnnouncements(
        announcementsResult.data || []
      );
    } catch (err: any) {
      console.error(
        "Academy profile load error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load academy profile."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAcademyProfile();
  }, []);

  function goBack() {
    window.location.href = "/teacher";
  }

  function goEdit() {
    window.location.href =
      "/teacher/academy-profile/edit";
  }

  function formatText(text: string) {
    if (!text) return null;

    const lines = text.split("\n");

    return lines.map((line, index) => (
      <span key={index}>
        {line}
        {index < lines.length - 1 && (
          <br />
        )}
      </span>
    ));
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            🏫
          </div>

          <h2>
            Loading Academy Profile...
          </h2>

          <p>Please wait.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <h2>
            Unable to load Academy Profile
          </h2>

          <p>{error}</p>

          <button
            onClick={loadAcademyProfile}
            style={styles.primaryButton}
          >
            Try Again
          </button>

          <button
            onClick={goBack}
            style={styles.secondaryButton}
          >
            ← Back
          </button>
        </div>
      </main>
    );
  }

  const academy =
    profile || defaultProfile;

  const groupedFees = fees.reduce(
    (groups, fee) => {
      const key = fee.class_name;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(fee);

      return groups;
    },
    {} as Record<string, Fee[]>
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <button
              onClick={goBack}
              style={styles.backButton}
            >
              ← Back
            </button>

            <div style={styles.brandRow}>
              <div style={styles.logo}>
                RA
              </div>

              <div>
                <h1 style={styles.title}>
                  {academy.academy_name}
                </h1>

                <p style={styles.tagline}>
                  {academy.tagline}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={goEdit}
            style={styles.editButton}
          >
            ✏️ Edit Academy
          </button>
        </header>

        <section style={styles.banner}>
          <div style={styles.bannerOverlay}>
            <div style={styles.bannerContent}>
              <div style={styles.bannerBadge}>
                🎓 NURSERY TO CLASS 10
              </div>

              <h2 style={styles.bannerTitle}>
                {academy.academy_name}
              </h2>

              <p style={styles.bannerTagline}>
                Learn • Grow • Achieve
              </p>

              <p style={styles.bannerText}>
                A friendly learning environment
                where children learn with
                confidence, ask questions freely
                and build strong academic
                foundations.
              </p>

              <div style={styles.bannerPills}>
                <span>📚 Hindi Medium</span>
                <span>🌎 English Medium</span>
                <span>👨‍🏫 Personal Attention</span>
                <span>📝 Regular Tests</span>
              </div>
            </div>

            <div style={styles.bannerIllustration}>
              <div style={styles.childEmoji}>
                👧
              </div>

              <div style={styles.childEmoji}>
                👦
              </div>

              <div style={styles.bookEmoji}>
                📚
              </div>
            </div>
          </div>
        </section>

        {announcements.length > 0 && (
          <section style={styles.section}>
            <SectionTitle
              icon="📢"
              title="Latest Updates"
            />

            <div
              style={styles.announcementGrid}
            >
              {announcements.map(
                (item) => (
                  <div
                    key={item.id}
                    style={
                      styles.announcementCard
                    }
                  >
                    <div
                      style={
                        styles.announcementDate
                      }
                    >
                      {item.announcement_date}
                    </div>

                    <h3
                      style={
                        styles.cardTitle
                      }
                    >
                      {item.title}
                    </h3>

                    <p
                      style={
                        styles.cardText
                      }
                    >
                      {item.content ||
                        "No additional details."}
                    </p>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        <section style={styles.heroSection}>
          <div style={styles.heroBadge}>
            🏫
          </div>

          <div>
            <div style={styles.heroSmall}>
              WELCOME TO
            </div>

            <h2 style={styles.heroTitle}>
              {academy.academy_name}
            </h2>

            <p style={styles.heroText}>
              {academy.about_text}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="📚"
            title="About Academy"
          />

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.about_text
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="🎓"
            title="Classes & Subjects"
          />

          <div style={styles.mediumGrid}>
            <div style={styles.mediumCard}>
              <div style={styles.mediumIcon}>
                🪔
              </div>

              <h3
                style={styles.mediumTitle}
              >
                Hindi Medium
              </h3>

              <p style={styles.cardText}>
                Nursery to Class 10
              </p>

              <p style={styles.subjectList}>
                Hindi • English • Mathematics
                • Science • Social Science •
                General Knowledge
              </p>
            </div>

            <div style={styles.mediumCard}>
              <div style={styles.mediumIcon}>
                🌎
              </div>

              <h3
                style={styles.mediumTitle}
              >
                English Medium
              </h3>

              <p style={styles.cardText}>
                Nursery to Class 10
              </p>

              <p style={styles.subjectList}>
                English • Mathematics •
                Science • Social Science •
                General Knowledge
              </p>
            </div>
          </div>

          <div
            style={{
              ...styles.textCard,
              marginTop: "16px",
            }}
          >
            <p>
              {formatText(
                academy.classes_text
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="💰"
            title="Monthly Subject-wise Fee Structure"
          />

          <div style={styles.feeNotice}>
            <strong>
              💡 Fee Information
            </strong>

            <span>
              All fees are monthly and
              calculated per subject for a
              1-hour class.
            </span>

            <span>
              A 1.5-hour class is automatically
              calculated at 50% extra.
            </span>
          </div>

          {fees.length === 0 ? (
            <EmptyCard text="Fee structure will be updated soon." />
          ) : (
            <div style={styles.feeGroups}>
              {Object.entries(
                groupedFees
              ).map(
                ([className, classFees]) => {
                  const medium =
                    getMediumFromClass(
                      className
                    );

                  const cleanClass =
                    getCleanClassName(
                      className
                    );

                  return (
                    <div
                      key={className}
                      style={
                        styles.feeGroup
                      }
                    >
                      <div
                        style={
                          styles.feeGroupHeader
                        }
                      >
                        <div>
                          <div
                            style={
                              styles.feeClass
                            }
                          >
                            {cleanClass}
                          </div>

                          {medium && (
                            <div
                              style={
                                styles.feeMedium
                              }
                            >
                              {medium}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        style={
                          styles.feeTableWrapper
                        }
                      >
                        <table
                          style={
                            styles.table
                          }
                        >
                          <thead>
                            <tr>
                              <th
                                style={
                                  styles.th
                                }
                              >
                                Subject
                              </th>

                              <th
                                style={
                                  styles.th
                                }
                              >
                                1 Hour
                              </th>

                              <th
                                style={
                                  styles.th
                                }
                              >
                                1.5 Hours
                              </th>

                              <th
                                style={
                                  styles.th
                                }
                              >
                                Monthly
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {classFees.map(
                              (fee) => (
                                <tr
                                  key={
                                    fee.id
                                  }
                                >
                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <strong>
                                      {
                                        fee.subject_name
                                      }
                                    </strong>
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <span
                                      style={
                                        styles.price
                                      }
                                    >
                                      ₹
                                      {Number(
                                        fee.fee_amount
                                      ).toLocaleString(
                                        "en-IN"
                                      )}
                                    </span>
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <span
                                      style={
                                        styles.priceOneHalf
                                      }
                                    >
                                      ₹
                                      {getOneAndHalfHourFee(
                                        Number(
                                          fee.fee_amount
                                        )
                                      ).toLocaleString(
                                        "en-IN"
                                      )}
                                    </span>
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    {
                                      fee.fee_period
                                    }
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="⏰"
            title="Batch Timings"
          />

          <div style={styles.timingBanner}>
            <div
              style={styles.timingBig}
            >
              5:00 PM – 8:00 PM
            </div>

            <div
              style={styles.timingSmall}
            >
              Evening Tuition Hours
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: "#475569",
              }}
            >
              One-hour batches can be arranged
              within the available evening
              schedule.
            </p>
          </div>

          {timings.length > 0 && (
            <div style={styles.grid}>
              {timings.map(
                (timing) => (
                  <div
                    key={timing.id}
                    style={styles.infoCard}
                  >
                    <div
                      style={styles.infoIcon}
                    >
                      ⏰
                    </div>

                    <h3
                      style={
                        styles.cardTitle
                      }
                    >
                      {timing.title}
                    </h3>

                    <div
                      style={
                        styles.highlight
                      }
                    >
                      {timing.start_time} -{" "}
                      {timing.end_time}
                    </div>

                    <p
                      style={
                        styles.cardText
                      }
                    >
                      {timing.days}
                    </p>

                    {timing.description && (
                      <p
                        style={
                          styles.cardText
                        }
                      >
                        {timing.description}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.timings_text
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="✨"
            title="Facilities"
          />

          {facilities.length > 0 ? (
            <div style={styles.grid}>
              {facilities.map(
                (facility) => (
                  <div
                    key={facility.id}
                    style={styles.infoCard}
                  >
                    <div
                      style={
                        styles.infoIcon
                      }
                    >
                      {facility.icon ||
                        "⭐"}
                    </div>

                    <h3
                      style={
                        styles.cardTitle
                      }
                    >
                      {facility.title}
                    </h3>

                    <p
                      style={
                        styles.cardText
                      }
                    >
                      {facility.description}
                    </p>
                  </div>
                )
              )}
            </div>
          ) : (
            <div style={styles.facilityDefaultGrid}>
              {[
                [
                  "📚",
                  "Concept Based Teaching",
                  "Simple and clear explanation of concepts.",
                ],
                [
                  "👨‍🏫",
                  "Personal Attention",
                  "Individual attention according to the child's needs.",
                ],
                [
                  "📝",
                  "Regular Tests",
                  "Regular practice and academic assessment.",
                ],
                [
                  "❓",
                  "Doubt Solving",
                  "Students can freely ask questions.",
                ],
                [
                  "📈",
                  "Progress Monitoring",
                  "Continuous focus on academic improvement.",
                ],
                [
                  "🤫",
                  "Quiet Study Environment",
                  "Focused learning without unnecessary disturbance.",
                ],
              ].map(
                ([icon, title, description]) => (
                  <div
                    key={title}
                    style={styles.infoCard}
                  >
                    <div
                      style={
                        styles.infoIcon
                      }
                    >
                      {icon}
                    </div>

                    <h3
                      style={
                        styles.cardTitle
                      }
                    >
                      {title}
                    </h3>

                    <p
                      style={
                        styles.cardText
                      }
                    >
                      {description}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="👨‍🏫"
            title="Teachers & Faculty"
          />

          {faculty.length > 0 ? (
            <div style={styles.grid}>
              {faculty.map(
                (teacher) => (
                  <div
                    key={teacher.id}
                    style={
                      styles.facultyCard
                    }
                  >
                    <div
                      style={styles.avatar}
                    >
                      {teacher.photo_url ? (
                        <img
                          src={
                            teacher.photo_url
                          }
                          alt={
                            teacher.teacher_name
                          }
                          style={
                            styles.avatarImage
                          }
                        />
                      ) : (
                        "👨‍🏫"
                      )}
                    </div>

                    <h3
                      style={
                        styles.cardTitle
                      }
                    >
                      {
                        teacher.teacher_name
                      }
                    </h3>

                    {teacher.subject && (
                      <div
                        style={
                          styles.subject
                        }
                      >
                        {teacher.subject}
                      </div>
                    )}

                    {teacher.qualification && (
                      <p
                        style={
                          styles.cardText
                        }
                      >
                        <strong>
                          Qualification:
                        </strong>{" "}
                        {
                          teacher.qualification
                        }
                      </p>
                    )}

                    {teacher.experience && (
                      <p
                        style={
                          styles.cardText
                        }
                      >
                        <strong>
                          Experience:
                        </strong>{" "}
                        {
                          teacher.experience
                        }
                      </p>
                    )}

                    {teacher.description && (
                      <p
                        style={
                          styles.cardText
                        }
                      >
                        {
                          teacher.description
                        }
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div style={styles.facultyDefault}>
              <div
                style={
                  styles.facultyDefaultIcon
                }
              >
                👨‍🏫 👩‍🏫
              </div>

              <h3>
                Supportive & Dedicated
                Faculty
              </h3>

              <p>
                {academy.faculty_text}
              </p>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="🏆"
            title="Achievements"
          />

          <div
            style={
              styles.achievementCard
            }
          >
            <div
              style={
                styles.achievementIcon
              }
            >
              🏆
            </div>

            <p>
              {formatText(
                academy.achievements_text
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="⭐"
            title="Why Choose RACER ACADEMY?"
          />

          <div style={styles.whyCard}>
            <div
              style={styles.whyQuote}
            >
              “
            </div>

            <p>
              {formatText(
                academy.why_choose_us
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="📜"
            title="Academy Rules"
          />

          <div style={styles.rulesCard}>
            <div style={styles.ruleItem}>
              <span>❓</span>
              <strong>
                Feel free to ask questions.
              </strong>
            </div>

            <div style={styles.ruleItem}>
              <span>🤫</span>
              <strong>
                Study without unnecessary
                noise or disturbance.
              </strong>
            </div>

            <div style={styles.ruleItem}>
              <span>🤝</span>
              <strong>
                Respect teachers and
                classmates.
              </strong>
            </div>

            <div style={styles.ruleItem}>
              <span>📚</span>
              <strong>
                Attend regularly and complete
                assigned work.
              </strong>
            </div>

            <p
              style={{
                marginBottom: 0,
                color: "#475569",
                lineHeight: 1.7,
              }}
            >
              {formatText(
                academy.rules_text
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="📝"
            title="Admissions"
          />

          <div style={styles.admissionCard}>
            <div
              style={
                styles.admissionIcon
              }
            >
              🎓
            </div>

            <div>
              <h3
                style={
                  styles.admissionTitle
                }
              >
                Admissions Open
              </h3>

              <p style={styles.cardText}>
                {academy.admission_text}
              </p>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle
            icon="🖼️"
            title="Academy Gallery"
          />

          <div style={styles.galleryGrid}>
            <GalleryImage
              src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80"
              title="Learning Environment"
            />

            <GalleryImage
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80"
              title="Students Learning"
            />

            <GalleryImage
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=80"
              title="Academic Learning"
            />

            <GalleryImage
              src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1000&q=80"
              title="Child-Friendly Environment"
            />
          </div>

          <div
            style={{
              ...styles.textCard,
              marginTop: "15px",
            }}
          >
            <p>
              {academy.gallery_text}
            </p>
          </div>
        </section>

        <section style={styles.contactSection}>
          <SectionTitle
            icon="📞"
            title="Contact & Admission"
          />

          <div style={styles.contactGrid}>
            <ContactItem
              icon="📍"
              title="Address"
              value={
                academy.address ||
                "Address will be updated."
              }
            />

            <ContactItem
              icon="📱"
              title="Phone"
              value={
                academy.phone ||
                "Phone will be updated."
              }
              link={
                academy.phone
                  ? `tel:${academy.phone}`
                  : undefined
              }
            />

            <ContactItem
              icon="💬"
              title="WhatsApp"
              value={
                academy.whatsapp ||
                "WhatsApp will be updated."
              }
              link={
                academy.whatsapp
                  ? academy.whatsapp.startsWith(
                      "http"
                    )
                    ? academy.whatsapp
                    : `https://wa.me/${academy.whatsapp.replace(
                        /\D/g,
                        ""
                      )}`
                  : undefined
              }
            />

            <ContactItem
              icon="✉️"
              title="Email"
              value={
                academy.email ||
                "Email will be updated."
              }
              link={
                academy.email
                  ? `mailto:${academy.email}`
                  : undefined
              }
            />
          </div>

          {academy.contact_text && (
            <div
              style={
                styles.contactNote
              }
            >
              {formatText(
                academy.contact_text
              )}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <strong>
            {academy.academy_name}
          </strong>

          <span>
            {academy.tagline}
          </span>
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div style={styles.sectionTitle}>
      <span
        style={styles.sectionIcon}
      >
        {icon}
      </span>

      <h2>{title}</h2>
    </div>
  );
}

function EmptyCard({
  text,
}: {
  text: string;
}) {
  return (
    <div style={styles.emptyCard}>
      <div style={styles.emptyIcon}>
        📋
      </div>

      <p>{text}</p>
    </div>
  );
}

function ContactItem({
  icon,
  title,
  value,
  link,
}: {
  icon: string;
  title: string;
  value: string;
  link?: string;
}) {
  return (
    <div style={styles.contactCard}>
      <div style={styles.contactIcon}>
        {icon}
      </div>

      <div>
        <div
          style={styles.contactTitle}
        >
          {title}
        </div>

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={
              styles.contactLink
            }
          >
            {value}
          </a>
        ) : (
          <div
            style={
              styles.contactValue
            }
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryImage({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  return (
    <div style={styles.galleryItem}>
      <img
        src={src}
        alt={title}
        style={styles.galleryImage}
      />

      <div style={styles.galleryCaption}>
        {title}
      </div>
    </div>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef4ff 0%,#f8fbff 45%,#ffffff 100%)",
    color: "#172033",
    padding: "20px",
    fontFamily:
      "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#3157d5",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    padding: "4px 0",
    marginBottom: "10px",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  logo: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg,#3157d5,#6a45d9)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "19px",
    boxShadow:
      "0 12px 28px rgba(49,87,213,.25)",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 900,
  },

  tagline: {
    margin: "5px 0 0",
    color: "#68738a",
    fontSize: "14px",
  },

  editButton: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "#172033",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  banner: {
    minHeight: "330px",
    borderRadius: "28px",
    overflow: "hidden",
    marginBottom: "30px",
    position: "relative",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed 55%,#ec4899)",
    boxShadow:
      "0 25px 55px rgba(37,99,235,.22)",
  },

  bannerOverlay: {
    minHeight: "330px",
    padding: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "30px",
    color: "#fff",
    background:
      "radial-gradient(circle at 85% 20%,rgba(255,255,255,.22),transparent 25%),radial-gradient(circle at 10% 90%,rgba(255,255,255,.12),transparent 30%)",
  },

  bannerContent: {
    maxWidth: "720px",
  },

  bannerBadge: {
    display: "inline-block",
    background:
      "rgba(255,255,255,.16)",
    border:
      "1px solid rgba(255,255,255,.22)",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 900,
    marginBottom: "14px",
  },

  bannerTitle: {
    margin: "0 0 7px",
    fontSize:
      "clamp(32px,5vw,55px)",
    lineHeight: 1,
    fontWeight: 950,
  },

  bannerTagline: {
    margin: "0 0 12px",
    fontSize: "21px",
    fontWeight: 800,
    color: "#fef3c7",
  },

  bannerText: {
    margin: 0,
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#f1f5ff",
  },

  bannerPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
    marginTop: "20px",
  },

  bannerIllustration: {
    minWidth: "250px",
    minHeight: "220px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    position: "relative",
  },

  childEmoji: {
    fontSize: "92px",
    filter:
      "drop-shadow(0 12px 15px rgba(0,0,0,.18))",
  },

  bookEmoji: {
    position: "absolute",
    bottom: "8px",
    fontSize: "62px",
  },

  section: {
    marginBottom: "30px",
  },

  heroSection: {
    background:
      "linear-gradient(135deg,#3157d5,#6a45d9)",
    color: "#fff",
    borderRadius: "24px",
    padding: "34px",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    boxShadow:
      "0 20px 45px rgba(49,87,213,.22)",
    marginBottom: "30px",
  },

  heroBadge: {
    width: "76px",
    height: "76px",
    minWidth: "76px",
    borderRadius: "22px",
    background:
      "rgba(255,255,255,.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
  },

  heroSmall: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "2px",
    opacity: 0.8,
  },

  heroTitle: {
    margin: "5px 0 10px",
    fontSize: "34px",
    fontWeight: 900,
  },

  heroText: {
    margin: 0,
    lineHeight: 1.7,
    fontSize: "15px",
    maxWidth: "850px",
  },

  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },

  sectionIcon: {
    fontSize: "24px",
  },

  textCard: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "16px",
    padding: "20px",
    boxShadow:
      "0 8px 24px rgba(30,45,80,.05)",
  },

  mediumGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "16px",
  },

  mediumCard: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "20px",
    padding: "24px",
    boxShadow:
      "0 8px 24px rgba(30,45,80,.05)",
  },

  mediumIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  mediumTitle: {
    margin: "0 0 8px",
    fontSize: "21px",
    fontWeight: 900,
  },

  subjectList: {
    margin: "10px 0 0",
    color: "#475569",
    lineHeight: 1.7,
    fontSize: "14px",
  },

  feeNotice: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "16px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg,#eff6ff,#f5f3ff)",
    border:
      "1px solid #dbeafe",
    marginBottom: "18px",
    color: "#475569",
    fontSize: "14px",
  },

  feeGroups: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  feeGroup: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow:
      "0 8px 24px rgba(30,45,80,.05)",
  },

  feeGroupHeader: {
    padding: "15px 18px",
    background: "#f2f5fb",
    borderBottom:
      "1px solid #e2e7f0",
  },

  feeClass: {
    fontWeight: 900,
    fontSize: "17px",
  },

  feeMedium: {
    marginTop: "4px",
    color: "#3157d5",
    fontWeight: 800,
    fontSize: "13px",
  },

  feeTableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "620px",
  },

  th: {
    background: "#f8fafc",
    padding: "12px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 900,
    borderBottom:
      "1px solid #e2e7f0",
  },

  td: {
    padding: "12px",
    borderBottom:
      "1px solid #edf0f5",
    fontSize: "13px",
  },

  price: {
    color: "#047857",
    fontWeight: 900,
  },

  priceOneHalf: {
    color: "#7c3aed",
    fontWeight: 900,
  },

  timingBanner: {
    background:
      "linear-gradient(135deg,#ecfdf5,#eff6ff)",
    border:
      "1px solid #ccefe0",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "16px",
  },

  timingBig: {
    fontSize: "32px",
    fontWeight: 950,
    color: "#047857",
  },

  timingSmall: {
    color: "#475569",
    fontWeight: 800,
    marginTop: "5px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: "16px",
  },

  facilityDefaultGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: "16px",
  },

  infoCard: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "18px",
    padding: "20px",
    boxShadow:
      "0 8px 24px rgba(30,45,80,.05)",
  },

  infoIcon: {
    fontSize: "28px",
    marginBottom: "12px",
  },

  cardTitle: {
    margin: "0 0 8px",
    fontSize: "17px",
    fontWeight: 800,
  },

  cardText: {
    margin: "6px 0",
    color: "#657086",
    lineHeight: 1.65,
    fontSize: "14px",
  },

  highlight: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "8px",
    background: "#eef3ff",
    color: "#3157d5",
    fontWeight: 800,
    fontSize: "13px",
    marginBottom: "7px",
  },

  facultyCard: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "18px",
    padding: "20px",
    boxShadow:
      "0 8px 24px rgba(30,45,80,.05)",
  },

  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "#eef3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    overflow: "hidden",
    marginBottom: "14px",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  subject: {
    display: "inline-block",
    background: "#eef3ff",
    color: "#3157d5",
    borderRadius: "8px",
    padding: "6px 9px",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "8px",
  },

  facultyDefault: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "18px",
    padding: "30px",
    textAlign: "center",
  },

  facultyDefaultIcon: {
    fontSize: "45px",
    marginBottom: "12px",
  },

  achievementCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#fffbeb)",
    border:
      "1px solid #fed7aa",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    gap: "18px",
    alignItems: "flex-start",
  },

  achievementIcon: {
    fontSize: "45px",
  },

  whyCard: {
    background:
      "linear-gradient(135deg,#ecfdf5,#eff6ff)",
    border:
      "1px solid #ccefe0",
    borderRadius: "20px",
    padding: "26px",
    display: "flex",
    gap: "16px",
  },

  whyQuote: {
    fontSize: "60px",
    lineHeight: 0.8,
    color: "#10b981",
    fontWeight: 900,
  },

  rulesCard: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "20px",
    padding: "22px",
  },

  ruleItem: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    padding: "12px",
    marginBottom: "8px",
    background: "#f8fafc",
    borderRadius: "12px",
    color: "#334155",
  },

  admissionCard: {
    background:
      "linear-gradient(135deg,#fff7e8,#fff)",
    border:
      "1px solid #f0dfba",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    gap: "18px",
    alignItems: "center",
  },

  admissionIcon: {
    fontSize: "45px",
  },

  admissionTitle: {
    margin: "0 0 8px",
    fontSize: "21px",
    fontWeight: 900,
  },

  galleryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "15px",
  },

  galleryItem: {
    position: "relative",
    height: "220px",
    borderRadius: "18px",
    overflow: "hidden",
    background: "#e2e8f0",
  },

  galleryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  galleryCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding:
      "35px 14px 12px",
    color: "#fff",
    fontWeight: 900,
    background:
      "linear-gradient(transparent,rgba(0,0,0,.75))",
  },

  contactSection: {
    marginBottom: "30px",
    background: "#172033",
    color: "#fff",
    borderRadius: "24px",
    padding: "28px",
  },

  contactGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "14px",
  },

  contactCard: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "16px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,.08)",
  },

  contactIcon: {
    fontSize: "22px",
  },

  contactTitle: {
    fontSize: "12px",
    opacity: 0.65,
    fontWeight: 800,
    marginBottom: "4px",
  },

  contactValue: {
    fontSize: "14px",
    lineHeight: 1.5,
  },

  contactLink: {
    color: "#bfdbfe",
    fontSize: "14px",
    lineHeight: 1.5,
    fontWeight: 700,
    textDecoration: "none",
  },

  contactNote: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop:
      "1px solid rgba(255,255,255,.12)",
    fontSize: "14px",
    lineHeight: 1.7,
    opacity: 0.85,
  },

  footer: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
    color: "#68738a",
    fontSize: "13px",
    padding: "20px",
  },

  announcementGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "16px",
  },

  announcementCard: {
    background: "#fff",
    border:
      "1px solid #e4e9f2",
    borderRadius: "16px",
    padding: "18px",
    boxShadow:
      "0 8px 24px rgba(30,45,80,.05)",
  },

  announcementDate: {
    fontSize: "11px",
    color: "#3157d5",
    fontWeight: 800,
    marginBottom: "8px",
  },

  emptyCard: {
    background: "#fff",
    border:
      "1px dashed #ccd4e3",
    borderRadius: "16px",
    padding: "28px",
    textAlign: "center",
    color: "#68738a",
  },

  emptyIcon: {
    fontSize: "28px",
    marginBottom: "8px",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "100px auto",
    background: "#fff",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
    boxShadow:
      "0 15px 40px rgba(30,45,80,.08)",
  },

  loadingIcon: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  errorCard: {
    maxWidth: "600px",
    margin: "100px auto",
    background: "#fff",
    borderRadius: "20px",
    padding: "35px",
    textAlign: "center",
    boxShadow:
      "0 15px 40px rgba(30,45,80,.08)",
  },

  primaryButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 17px",
    background: "#3157d5",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    margin: "8px",
  },

  secondaryButton: {
    border:
      "1px solid #d8deea",
    borderRadius: "10px",
    padding: "11px 17px",
    background: "#fff",
    color: "#172033",
    fontWeight: 800,
    cursor: "pointer",
    margin: "8px",
  },
};