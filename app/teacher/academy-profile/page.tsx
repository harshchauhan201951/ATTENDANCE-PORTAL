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

export default function AcademyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          .order("display_order", { ascending: true })
          .order("class_name", { ascending: true })
          .order("subject_name", { ascending: true }),

        supabase
          .from("academy_facilities")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),

        supabase
          .from("academy_timings")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),

        supabase
          .from("academy_faculty")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),

        supabase
          .from("academy_announcements")
          .select("*")
          .eq("is_active", true)
          .order("announcement_date", { ascending: false })
          .order("display_order", { ascending: true }),
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

      setProfile(profileResult.data);
      setFees(feesResult.data || []);
      setFacilities(facilitiesResult.data || []);
      setTimings(timingsResult.data || []);
      setFaculty(facultyResult.data || []);
      setAnnouncements(announcementsResult.data || []);
    } catch (err: any) {
      console.error("Academy profile load error:", err);
      setError(err?.message || "Unable to load academy profile.");
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
    window.location.href = "/teacher/academy-profile/edit";
  }

  function formatText(text: string) {
    if (!text) return null;

    return text.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split("\n").length - 1 && <br />}
      </span>
    ));
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>🏫</div>
          <h2>Loading Academy Profile...</h2>
          <p>Please wait.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <h2>Unable to load Academy Profile</h2>
          <p>{error}</p>
          <button onClick={loadAcademyProfile} style={styles.primaryButton}>
            Try Again
          </button>
          <button onClick={goBack} style={styles.secondaryButton}>
            ← Back
          </button>
        </div>
      </main>
    );
  }

  const academy = profile || {
    id: 1,
    academy_name: "RACER ACADEMY",
    tagline: "Learn • Grow • Achieve",
    about_text: "",
    classes_text: "",
    facilities_text: "",
    timings_text: "",
    faculty_text: "",
    achievements_text: "",
    why_choose_us: "",
    rules_text: "",
    contact_text: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    admission_text: "",
    gallery_text: "",
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <button onClick={goBack} style={styles.backButton}>
              ← Back
            </button>

            <div style={styles.brandRow}>
              <div style={styles.logo}>RA</div>

              <div>
                <h1 style={styles.title}>{academy.academy_name}</h1>
                <p style={styles.tagline}>
                  {academy.tagline || "Learn • Grow • Achieve"}
                </p>
              </div>
            </div>
          </div>

          <button onClick={goEdit} style={styles.editButton}>
            ✏️ Edit Academy
          </button>
        </header>

        {announcements.length > 0 && (
          <section style={styles.section}>
            <SectionTitle icon="📢" title="Latest Updates" />

            <div style={styles.announcementGrid}>
              {announcements.map((item) => (
                <div key={item.id} style={styles.announcementCard}>
                  <div style={styles.announcementDate}>
                    {item.announcement_date}
                  </div>

                  <h3 style={styles.cardTitle}>{item.title}</h3>

                  <p style={styles.cardText}>
                    {item.content || "No additional details."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={styles.heroSection}>
          <div style={styles.heroBadge}>🏫</div>

          <div>
            <div style={styles.heroSmall}>WELCOME TO</div>

            <h2 style={styles.heroTitle}>{academy.academy_name}</h2>

            <p style={styles.heroText}>
              {academy.about_text ||
                "Welcome to RACER ACADEMY. We provide focused academic support and tuition for students from Nursery to Class 10."}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="📚" title="About Academy" />

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.about_text ||
                  "RACER ACADEMY is dedicated to helping students build strong academic foundations, improve their concepts, and achieve their educational goals."
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="🎓" title="Classes & Subjects" />

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.classes_text ||
                  "Nursery to Class 10\nHindi • English • Mathematics • Science • Social Science • General Knowledge"
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="💰" title="Subject-wise Fee Structure" />

          {fees.length === 0 ? (
            <EmptyCard text="Fee structure will be updated soon." />
          ) : (
            <div style={styles.feeTableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Fee</th>
                    <th style={styles.th}>Period</th>
                    <th style={styles.th}>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id}>
                      <td style={styles.td}>{fee.class_name}</td>
                      <td style={styles.td}>{fee.subject_name}</td>
                      <td style={styles.td}>
                        ₹{Number(fee.fee_amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={styles.td}>{fee.fee_period}</td>
                      <td style={styles.td}>
                        {fee.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle icon="⏰" title="Batch Timings" />

          {timings.length === 0 ? (
            <EmptyCard text="Batch timings will be updated soon." />
          ) : (
            <div style={styles.grid}>
              {timings.map((timing) => (
                <div key={timing.id} style={styles.infoCard}>
                  <div style={styles.infoIcon}>⏰</div>

                  <h3 style={styles.cardTitle}>{timing.title}</h3>

                  <div style={styles.highlight}>
                    {timing.start_time} - {timing.end_time}
                  </div>

                  <p style={styles.cardText}>{timing.days}</p>

                  {timing.description && (
                    <p style={styles.cardText}>{timing.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {academy.timings_text && (
            <div style={styles.textCard}>
              <p>{formatText(academy.timings_text)}</p>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle icon="✨" title="Facilities" />

          {facilities.length > 0 ? (
            <div style={styles.grid}>
              {facilities.map((facility) => (
                <div key={facility.id} style={styles.infoCard}>
                  <div style={styles.infoIcon}>
                    {facility.icon || "⭐"}
                  </div>

                  <h3 style={styles.cardTitle}>{facility.title}</h3>

                  <p style={styles.cardText}>
                    {facility.description || "Quality learning facility."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.textCard}>
              <p>
                {academy.facilities_text ||
                  "Quality learning environment and focused academic support."}
              </p>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle icon="👨‍🏫" title="Teachers & Faculty" />

          {faculty.length > 0 ? (
            <div style={styles.grid}>
              {faculty.map((teacher) => (
                <div key={teacher.id} style={styles.facultyCard}>
                  <div style={styles.avatar}>
                    {teacher.photo_url ? (
                      <img
                        src={teacher.photo_url}
                        alt={teacher.teacher_name}
                        style={styles.avatarImage}
                      />
                    ) : (
                      "👨‍🏫"
                    )}
                  </div>

                  <h3 style={styles.cardTitle}>{teacher.teacher_name}</h3>

                  {teacher.subject && (
                    <div style={styles.subject}>{teacher.subject}</div>
                  )}

                  {teacher.qualification && (
                    <p style={styles.cardText}>
                      <strong>Qualification:</strong>{" "}
                      {teacher.qualification}
                    </p>
                  )}

                  {teacher.experience && (
                    <p style={styles.cardText}>
                      <strong>Experience:</strong> {teacher.experience}
                    </p>
                  )}

                  {teacher.description && (
                    <p style={styles.cardText}>{teacher.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.textCard}>
              <p>
                {academy.faculty_text ||
                  "Our faculty information will be updated soon."}
              </p>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <SectionTitle icon="🏆" title="Achievements" />

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.achievements_text ||
                  "Academy achievements and student success stories will be displayed here."
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="⭐" title="Why Choose RACER ACADEMY?" />

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.why_choose_us ||
                  "Focused learning • Regular practice • Tests and assessments • Personal attention • Student progress monitoring"
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="📜" title="Academy Rules" />

          <div style={styles.textCard}>
            <p>
              {formatText(
                academy.rules_text ||
                  "Students should attend classes regularly, complete assigned work on time, maintain discipline, and respect teachers and fellow students."
              )}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="📝" title="Admissions" />

          <div style={styles.admissionCard}>
            <h3 style={styles.admissionTitle}>Admissions Open</h3>

            <p style={styles.cardText}>
              {academy.admission_text ||
                "For admission details, available batches, subjects, and fee information, please contact RACER ACADEMY."}
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <SectionTitle icon="🖼️" title="Gallery" />

          <div style={styles.galleryPlaceholder}>
            <div style={styles.galleryIcon}>🖼️</div>

            <h3 style={styles.cardTitle}>Academy Gallery</h3>

            <p style={styles.cardText}>
              {academy.gallery_text ||
                "Academy photos and student activity images will be added here soon."}
            </p>
          </div>
        </section>

        <section style={styles.contactSection}>
          <SectionTitle icon="📞" title="Contact & Admission" />

          <div style={styles.contactGrid}>
            <ContactItem
              icon="📍"
              title="Address"
              value={academy.address || "Address will be updated soon."}
            />

            <ContactItem
              icon="📱"
              title="Phone"
              value={academy.phone || "Phone number will be updated soon."}
            />

            <ContactItem
              icon="💬"
              title="WhatsApp"
              value={academy.whatsapp || "WhatsApp number will be updated soon."}
            />

            <ContactItem
              icon="✉️"
              title="Email"
              value={academy.email || "Email will be updated soon."}
            />
          </div>

          {academy.contact_text && (
            <div style={styles.contactNote}>
              {formatText(academy.contact_text)}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <strong>{academy.academy_name}</strong>
          <span>{academy.tagline || "Learn • Grow • Achieve"}</span>
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
      <span style={styles.sectionIcon}>{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div style={styles.emptyCard}>
      <div style={styles.emptyIcon}>📋</div>
      <p>{text}</p>
    </div>
  );
}

function ContactItem({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div style={styles.contactCard}>
      <div style={styles.contactIcon}>{icon}</div>
      <div>
        <div style={styles.contactTitle}>{title}</div>
        <div style={styles.contactValue}>{value}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef4ff 0%, #f8fbff 45%, #ffffff 100%)",
    color: "#172033",
    padding: "20px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
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
    background: "linear-gradient(135deg, #3157d5, #6a45d9)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "19px",
    boxShadow: "0 12px 28px rgba(49,87,213,.25)",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 900,
    letterSpacing: "-0.5px",
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

  heroSection: {
    background: "linear-gradient(135deg, #3157d5, #6a45d9)",
    color: "#fff",
    borderRadius: "24px",
    padding: "34px",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    boxShadow: "0 20px 45px rgba(49,87,213,.22)",
    marginBottom: "30px",
  },

  heroBadge: {
    width: "76px",
    height: "76px",
    minWidth: "76px",
    borderRadius: "22px",
    background: "rgba(255,255,255,.16)",
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

  section: {
    marginBottom: "30px",
  },

  contactSection: {
    marginBottom: "30px",
    background: "#172033",
    color: "#fff",
    borderRadius: "24px",
    padding: "28px",
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

  sectionTitleText: {},

  textCard: {
    background: "#fff",
    border: "1px solid #e4e9f2",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(30,45,80,.05)",
  },

  textCardParagraph: {},

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },

  infoCard: {
    background: "#fff",
    border: "1px solid #e4e9f2",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(30,45,80,.05)",
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

  feeTableWrapper: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: "18px",
    border: "1px solid #e4e9f2",
    boxShadow: "0 8px 24px rgba(30,45,80,.05)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },

  th: {
    background: "#f2f5fb",
    padding: "14px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 800,
    borderBottom: "1px solid #e2e7f0",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #edf0f5",
    fontSize: "14px",
  },

  facultyCard: {
    background: "#fff",
    border: "1px solid #e4e9f2",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(30,45,80,.05)",
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

  admissionCard: {
    background: "linear-gradient(135deg, #fff7e8, #fff)",
    border: "1px solid #f0dfba",
    borderRadius: "18px",
    padding: "22px",
  },

  admissionTitle: {
    margin: "0 0 8px",
    fontSize: "19px",
    fontWeight: 900,
  },

  galleryPlaceholder: {
    background: "#fff",
    border: "2px dashed #d8dfec",
    borderRadius: "20px",
    padding: "38px 20px",
    textAlign: "center",
  },

  galleryIcon: {
    fontSize: "42px",
    marginBottom: "10px",
  },

  contactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },

  contactCard: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "16px",
    borderRadius: "14px",
    background: "rgba(255,255,255,.08)",
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

  contactNote: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1px solid rgba(255,255,255,.12)",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },

  announcementCard: {
    background: "#fff",
    border: "1px solid #e4e9f2",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 24px rgba(30,45,80,.05)",
  },

  announcementDate: {
    fontSize: "11px",
    color: "#3157d5",
    fontWeight: 800,
    marginBottom: "8px",
  },

  emptyCard: {
    background: "#fff",
    border: "1px dashed #ccd4e3",
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
    boxShadow: "0 15px 40px rgba(30,45,80,.08)",
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
    boxShadow: "0 15px 40px rgba(30,45,80,.08)",
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
    border: "1px solid #d8deea",
    borderRadius: "10px",
    padding: "11px 17px",
    background: "#fff",
    color: "#172033",
    fontWeight: 800,
    cursor: "pointer",
    margin: "8px",
  },
};