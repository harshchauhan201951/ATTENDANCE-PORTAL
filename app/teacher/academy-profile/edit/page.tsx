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

const emptyProfile: Profile = {
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

export default function AcademyProfileEditPage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [fees, setFees] = useState<Fee[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newFee, setNewFee] = useState({
    class_name: "",
    subject_name: "",
    fee_amount: "",
    fee_period: "Monthly",
    description: "",
  });

  const [newFacility, setNewFacility] = useState({
    title: "",
    description: "",
    icon: "⭐",
  });

  const [newTiming, setNewTiming] = useState({
    title: "",
    days: "",
    start_time: "",
    end_time: "",
    description: "",
  });

  const [newFaculty, setNewFaculty] = useState({
    teacher_name: "",
    subject: "",
    qualification: "",
    experience: "",
    photo_url: "",
    description: "",
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    announcement_date: new Date().toISOString().slice(0, 10),
  });

  function getTeacherId() {
    try {
      const stored =
        localStorage.getItem("racer_academy_teacher") ||
        localStorage.getItem("teacher");

      if (!stored) return 0;

      const teacher = JSON.parse(stored);
      return Number(teacher?.id || 0);
    } catch {
      return 0;
    }
  }

  async function loadData() {
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
          .order("class_name", { ascending: true }),

        supabase
          .from("academy_facilities")
          .select("*")
          .order("display_order", { ascending: true }),

        supabase
          .from("academy_timings")
          .select("*")
          .order("display_order", { ascending: true }),

        supabase
          .from("academy_faculty")
          .select("*")
          .order("display_order", { ascending: true }),

        supabase
          .from("academy_announcements")
          .select("*")
          .order("announcement_date", { ascending: false })
          .order("display_order", { ascending: true }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (feesResult.error) throw feesResult.error;
      if (facilitiesResult.error) throw facilitiesResult.error;
      if (timingsResult.error) throw timingsResult.error;
      if (facultyResult.error) throw facultyResult.error;
      if (announcementsResult.error) throw announcementsResult.error;

      setProfile(profileResult.data || emptyProfile);
      setFees(feesResult.data || []);
      setFacilities(facilitiesResult.data || []);
      setTimings(timingsResult.data || []);
      setFaculty(facultyResult.data || []);
      setAnnouncements(announcementsResult.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load academy data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveProfile() {
    const teacherId = getTeacherId();

    if (teacherId !== 1) {
      setError("Only the main teacher can edit Academy Profile.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "academy_update_profile",
        {
          p_teacher_id: teacherId,
          p_academy_name: profile.academy_name,
          p_tagline: profile.tagline,
          p_about_text: profile.about_text,
          p_classes_text: profile.classes_text,
          p_facilities_text: profile.facilities_text,
          p_timings_text: profile.timings_text,
          p_faculty_text: profile.faculty_text,
          p_achievements_text: profile.achievements_text,
          p_why_choose_us: profile.why_choose_us,
          p_rules_text: profile.rules_text,
          p_contact_text: profile.contact_text,
          p_address: profile.address,
          p_phone: profile.phone,
          p_whatsapp: profile.whatsapp,
          p_email: profile.email,
          p_admission_text: profile.admission_text,
          p_gallery_text: profile.gallery_text,
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Academy profile saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function addFee() {
    const teacherId = getTeacherId();

    if (teacherId !== 1) {
      setError("Only the main teacher can add fees.");
      return;
    }

    if (
      !newFee.class_name.trim() ||
      !newFee.subject_name.trim() ||
      !newFee.fee_amount
    ) {
      setError("Class, subject and fee amount are required.");
      return;
    }

    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "academy_add_fee",
      {
        p_teacher_id: teacherId,
        p_class_name: newFee.class_name.trim(),
        p_subject_name: newFee.subject_name.trim(),
        p_fee_amount: Number(newFee.fee_amount),
        p_fee_period: newFee.fee_period,
        p_description: newFee.description,
        p_display_order: fees.length,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setFees((current) => [...current, data as Fee]);

    setNewFee({
      class_name: "",
      subject_name: "",
      fee_amount: "",
      fee_period: "Monthly",
      description: "",
    });

    setMessage("Fee added successfully.");
  }

  async function deleteFee(id: number) {
    const teacherId = getTeacherId();

    if (!confirm("Delete this fee entry?")) return;

    const { error: rpcError } = await supabase.rpc(
      "academy_delete_fee",
      {
        p_teacher_id: teacherId,
        p_id: id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setFees((current) => current.filter((item) => item.id !== id));
    setMessage("Fee deleted.");
  }

  async function addFacility() {
    const teacherId = getTeacherId();

    if (!newFacility.title.trim()) {
      setError("Facility title is required.");
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "academy_add_facility",
      {
        p_teacher_id: teacherId,
        p_title: newFacility.title.trim(),
        p_description: newFacility.description,
        p_icon: newFacility.icon,
        p_display_order: facilities.length,
        p_is_active: true,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setFacilities((current) => [...current, data as Facility]);

    setNewFacility({
      title: "",
      description: "",
      icon: "⭐",
    });

    setMessage("Facility added.");
  }

  async function deleteFacility(id: number) {
    const teacherId = getTeacherId();

    if (!confirm("Delete this facility?")) return;

    const { error: rpcError } = await supabase.rpc(
      "academy_delete_facility",
      {
        p_teacher_id: teacherId,
        p_id: id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setFacilities((current) => current.filter((item) => item.id !== id));
    setMessage("Facility deleted.");
  }

  async function addTiming() {
    const teacherId = getTeacherId();

    if (!newTiming.title.trim()) {
      setError("Timing title is required.");
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "academy_add_timing",
      {
        p_teacher_id: teacherId,
        p_title: newTiming.title.trim(),
        p_days: newTiming.days,
        p_start_time: newTiming.start_time,
        p_end_time: newTiming.end_time,
        p_description: newTiming.description,
        p_display_order: timings.length,
        p_is_active: true,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setTimings((current) => [...current, data as Timing]);

    setNewTiming({
      title: "",
      days: "",
      start_time: "",
      end_time: "",
      description: "",
    });

    setMessage("Batch timing added.");
  }

  async function deleteTiming(id: number) {
    const teacherId = getTeacherId();

    if (!confirm("Delete this batch timing?")) return;

    const { error: rpcError } = await supabase.rpc(
      "academy_delete_timing",
      {
        p_teacher_id: teacherId,
        p_id: id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setTimings((current) => current.filter((item) => item.id !== id));
    setMessage("Timing deleted.");
  }

  async function addFaculty() {
    const teacherId = getTeacherId();

    if (!newFaculty.teacher_name.trim()) {
      setError("Teacher name is required.");
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "academy_add_faculty",
      {
        p_teacher_id: teacherId,
        p_teacher_name: newFaculty.teacher_name.trim(),
        p_subject: newFaculty.subject,
        p_qualification: newFaculty.qualification,
        p_experience: newFaculty.experience,
        p_photo_url: newFaculty.photo_url,
        p_description: newFaculty.description,
        p_display_order: faculty.length,
        p_is_active: true,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setFaculty((current) => [...current, data as Faculty]);

    setNewFaculty({
      teacher_name: "",
      subject: "",
      qualification: "",
      experience: "",
      photo_url: "",
      description: "",
    });

    setMessage("Faculty member added.");
  }

  async function deleteFaculty(id: number) {
    const teacherId = getTeacherId();

    if (!confirm("Delete this faculty member?")) return;

    const { error: rpcError } = await supabase.rpc(
      "academy_delete_faculty",
      {
        p_teacher_id: teacherId,
        p_id: id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setFaculty((current) => current.filter((item) => item.id !== id));
    setMessage("Faculty member deleted.");
  }

  async function addAnnouncement() {
    const teacherId = getTeacherId();

    if (!newAnnouncement.title.trim()) {
      setError("Announcement title is required.");
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "academy_add_announcement",
      {
        p_teacher_id: teacherId,
        p_title: newAnnouncement.title.trim(),
        p_content: newAnnouncement.content,
        p_announcement_date: newAnnouncement.announcement_date,
        p_is_active: true,
        p_display_order: announcements.length,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setAnnouncements((current) => [
      data as Announcement,
      ...current,
    ]);

    setNewAnnouncement({
      title: "",
      content: "",
      announcement_date: new Date().toISOString().slice(0, 10),
    });

    setMessage("Announcement added.");
  }

  async function deleteAnnouncement(id: number) {
    const teacherId = getTeacherId();

    if (!confirm("Delete this announcement?")) return;

    const { error: rpcError } = await supabase.rpc(
      "academy_delete_announcement",
      {
        p_teacher_id: teacherId,
        p_id: id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setAnnouncements((current) =>
      current.filter((item) => item.id !== id)
    );

    setMessage("Announcement deleted.");
  }

  function updateProfile(
    field: keyof Profile,
    value: string
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>Loading Academy Editor...</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <button
              onClick={() =>
                (window.location.href = "/teacher/academy-profile")
              }
              style={styles.backButton}
            >
              ← Academy Profile
            </button>

            <h1 style={styles.title}>Edit Academy Profile</h1>
            <p style={styles.subtitle}>
              Manage the information displayed to students and parents.
            </p>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? "Saving..." : "💾 Save Profile"}
          </button>
        </header>

        {message && (
          <div style={styles.success}>
            ✅ {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🏫 Basic Academy Information</h2>

          <div style={styles.formGrid}>
            <Field
              label="Academy Name"
              value={profile.academy_name}
              onChange={(value) =>
                updateProfile("academy_name", value)
              }
            />

            <Field
              label="Tagline"
              value={profile.tagline}
              onChange={(value) =>
                updateProfile("tagline", value)
              }
            />
          </div>

          <TextArea
            label="About Academy"
            value={profile.about_text}
            onChange={(value) =>
              updateProfile("about_text", value)
            }
          />

          <TextArea
            label="Classes & Subjects"
            value={profile.classes_text}
            onChange={(value) =>
              updateProfile("classes_text", value)
            }
          />

          <TextArea
            label="Facilities"
            value={profile.facilities_text}
            onChange={(value) =>
              updateProfile("facilities_text", value)
            }
          />

          <TextArea
            label="Batch Timings Information"
            value={profile.timings_text}
            onChange={(value) =>
              updateProfile("timings_text", value)
            }
          />

          <TextArea
            label="Faculty Information"
            value={profile.faculty_text}
            onChange={(value) =>
              updateProfile("faculty_text", value)
            }
          />

          <TextArea
            label="Achievements"
            value={profile.achievements_text}
            onChange={(value) =>
              updateProfile("achievements_text", value)
            }
          />

          <TextArea
            label="Why Choose Us"
            value={profile.why_choose_us}
            onChange={(value) =>
              updateProfile("why_choose_us", value)
            }
          />

          <TextArea
            label="Academy Rules"
            value={profile.rules_text}
            onChange={(value) =>
              updateProfile("rules_text", value)
            }
          />

          <TextArea
            label="Admission Information"
            value={profile.admission_text}
            onChange={(value) =>
              updateProfile("admission_text", value)
            }
          />

          <TextArea
            label="Gallery Information"
            value={profile.gallery_text}
            onChange={(value) =>
              updateProfile("gallery_text", value)
            }
          />
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📞 Contact Details</h2>

          <div style={styles.formGrid}>
            <Field
              label="Phone"
              value={profile.phone}
              onChange={(value) =>
                updateProfile("phone", value)
              }
            />

            <Field
              label="WhatsApp"
              value={profile.whatsapp}
              onChange={(value) =>
                updateProfile("whatsapp", value)
              }
            />

            <Field
              label="Email"
              value={profile.email}
              onChange={(value) =>
                updateProfile("email", value)
              }
            />

            <Field
              label="Address"
              value={profile.address}
              onChange={(value) =>
                updateProfile("address", value)
              }
            />
          </div>

          <TextArea
            label="Contact Information"
            value={profile.contact_text}
            onChange={(value) =>
              updateProfile("contact_text", value)
            }
          />

          <button
            onClick={saveProfile}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? "Saving..." : "💾 Save Contact & Profile"}
          </button>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            💰 Subject-wise Fee Structure
          </h2>

          <div style={styles.addBox}>
            <div style={styles.formGrid}>
              <Field
                label="Class"
                value={newFee.class_name}
                onChange={(value) =>
                  setNewFee({
                    ...newFee,
                    class_name: value,
                  })
                }
                placeholder="Example: Class 5"
              />

              <Field
                label="Subject"
                value={newFee.subject_name}
                onChange={(value) =>
                  setNewFee({
                    ...newFee,
                    subject_name: value,
                  })
                }
                placeholder="Example: Mathematics"
              />

              <Field
                label="Fee Amount"
                value={newFee.fee_amount}
                onChange={(value) =>
                  setNewFee({
                    ...newFee,
                    fee_amount: value,
                  })
                }
                placeholder="Example: 800"
                type="number"
              />

              <Field
                label="Period"
                value={newFee.fee_period}
                onChange={(value) =>
                  setNewFee({
                    ...newFee,
                    fee_period: value,
                  })
                }
                placeholder="Monthly"
              />
            </div>

            <TextArea
              label="Description"
              value={newFee.description}
              onChange={(value) =>
                setNewFee({
                  ...newFee,
                  description: value,
                })
              }
            />

            <button onClick={addFee} style={styles.addButton}>
              + Add Fee
            </button>
          </div>

          <div style={styles.list}>
            {fees.map((fee) => (
              <div key={fee.id} style={styles.listItem}>
                <div>
                  <strong>
                    {fee.class_name} — {fee.subject_name}
                  </strong>

                  <div style={styles.smallText}>
                    ₹{Number(fee.fee_amount).toLocaleString("en-IN")} /{" "}
                    {fee.fee_period}
                  </div>

                  {fee.description && (
                    <div style={styles.smallText}>
                      {fee.description}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteFee(fee.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>✨ Facilities</h2>

          <div style={styles.addBox}>
            <div style={styles.formGrid}>
              <Field
                label="Facility Title"
                value={newFacility.title}
                onChange={(value) =>
                  setNewFacility({
                    ...newFacility,
                    title: value,
                  })
                }
                placeholder="Example: Regular Tests"
              />

              <Field
                label="Icon"
                value={newFacility.icon}
                onChange={(value) =>
                  setNewFacility({
                    ...newFacility,
                    icon: value,
                  })
                }
                placeholder="⭐"
              />
            </div>

            <TextArea
              label="Description"
              value={newFacility.description}
              onChange={(value) =>
                setNewFacility({
                  ...newFacility,
                  description: value,
                })
              }
            />

            <button
              onClick={addFacility}
              style={styles.addButton}
            >
              + Add Facility
            </button>
          </div>

          <div style={styles.list}>
            {facilities.map((facility) => (
              <div key={facility.id} style={styles.listItem}>
                <div>
                  <strong>
                    {facility.icon || "⭐"} {facility.title}
                  </strong>

                  <div style={styles.smallText}>
                    {facility.description}
                  </div>
                </div>

                <button
                  onClick={() => deleteFacility(facility.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>⏰ Batch Timings</h2>

          <div style={styles.addBox}>
            <div style={styles.formGrid}>
              <Field
                label="Batch Title"
                value={newTiming.title}
                onChange={(value) =>
                  setNewTiming({
                    ...newTiming,
                    title: value,
                  })
                }
                placeholder="Example: Class 8 Evening Batch"
              />

              <Field
                label="Days"
                value={newTiming.days}
                onChange={(value) =>
                  setNewTiming({
                    ...newTiming,
                    days: value,
                  })
                }
                placeholder="Mon - Sat"
              />

              <Field
                label="Start Time"
                value={newTiming.start_time}
                onChange={(value) =>
                  setNewTiming({
                    ...newTiming,
                    start_time: value,
                  })
                }
                placeholder="05:00 PM"
              />

              <Field
                label="End Time"
                value={newTiming.end_time}
                onChange={(value) =>
                  setNewTiming({
                    ...newTiming,
                    end_time: value,
                  })
                }
                placeholder="06:00 PM"
              />
            </div>

            <TextArea
              label="Description"
              value={newTiming.description}
              onChange={(value) =>
                setNewTiming({
                  ...newTiming,
                  description: value,
                })
              }
            />

            <button
              onClick={addTiming}
              style={styles.addButton}
            >
              + Add Timing
            </button>
          </div>

          <div style={styles.list}>
            {timings.map((timing) => (
              <div key={timing.id} style={styles.listItem}>
                <div>
                  <strong>{timing.title}</strong>

                  <div style={styles.smallText}>
                    {timing.days} • {timing.start_time} -{" "}
                    {timing.end_time}
                  </div>

                  <div style={styles.smallText}>
                    {timing.description}
                  </div>
                </div>

                <button
                  onClick={() => deleteTiming(timing.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>👨‍🏫 Teachers / Faculty</h2>

          <div style={styles.addBox}>
            <div style={styles.formGrid}>
              <Field
                label="Teacher Name"
                value={newFaculty.teacher_name}
                onChange={(value) =>
                  setNewFaculty({
                    ...newFaculty,
                    teacher_name: value,
                  })
                }
              />

              <Field
                label="Subject"
                value={newFaculty.subject}
                onChange={(value) =>
                  setNewFaculty({
                    ...newFaculty,
                    subject: value,
                  })
                }
              />

              <Field
                label="Qualification"
                value={newFaculty.qualification}
                onChange={(value) =>
                  setNewFaculty({
                    ...newFaculty,
                    qualification: value,
                  })
                }
              />

              <Field
                label="Experience"
                value={newFaculty.experience}
                onChange={(value) =>
                  setNewFaculty({
                    ...newFaculty,
                    experience: value,
                  })
                }
              />

              <Field
                label="Photo URL"
                value={newFaculty.photo_url}
                onChange={(value) =>
                  setNewFaculty({
                    ...newFaculty,
                    photo_url: value,
                  })
                }
                placeholder="Photos later"
              />
            </div>

            <TextArea
              label="Faculty Description"
              value={newFaculty.description}
              onChange={(value) =>
                setNewFaculty({
                  ...newFaculty,
                  description: value,
                })
              }
            />

            <button
              onClick={addFaculty}
              style={styles.addButton}
            >
              + Add Faculty
            </button>
          </div>

          <div style={styles.list}>
            {faculty.map((teacher) => (
              <div key={teacher.id} style={styles.listItem}>
                <div>
                  <strong>{teacher.teacher_name}</strong>

                  <div style={styles.smallText}>
                    {teacher.subject}
                  </div>

                  <div style={styles.smallText}>
                    {teacher.qualification}
                    {teacher.experience
                      ? ` • ${teacher.experience}`
                      : ""}
                  </div>
                </div>

                <button
                  onClick={() => deleteFaculty(teacher.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📢 Announcements</h2>

          <div style={styles.addBox}>
            <div style={styles.formGrid}>
              <Field
                label="Title"
                value={newAnnouncement.title}
                onChange={(value) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    title: value,
                  })
                }
              />

              <Field
                label="Date"
                value={newAnnouncement.announcement_date}
                onChange={(value) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    announcement_date: value,
                  })
                }
                type="date"
              />
            </div>

            <TextArea
              label="Announcement"
              value={newAnnouncement.content}
              onChange={(value) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  content: value,
                })
              }
            />

            <button
              onClick={addAnnouncement}
              style={styles.addButton}
            >
              + Add Announcement
            </button>
          </div>

          <div style={styles.list}>
            {announcements.map((item) => (
              <div key={item.id} style={styles.listItem}>
                <div>
                  <strong>{item.title}</strong>

                  <div style={styles.smallText}>
                    {item.announcement_date}
                  </div>

                  <div style={styles.smallText}>
                    {item.content}
                  </div>
                </div>

                <button
                  onClick={() => deleteAnnouncement(item.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <div style={styles.bottomActions}>
          <button
            onClick={saveProfile}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? "Saving..." : "💾 Save All Profile Information"}
          </button>

          <button
            onClick={() =>
              (window.location.href = "/teacher/academy-profile")
            }
            style={styles.viewButton}
          >
            👁️ View Academy Profile
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        style={styles.textarea}
      />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#172033",
    padding: "20px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#3157d5",
    padding: 0,
    cursor: "pointer",
    fontWeight: 800,
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 900,
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#69758a",
    fontSize: "14px",
  },

  section: {
    background: "#fff",
    border: "1px solid #e2e7f0",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 8px 25px rgba(25,40,75,.05)",
  },

  sectionTitle: {
    margin: "0 0 20px",
    fontSize: "20px",
    fontWeight: 900,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "15px",
  },

  label: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#354158",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d9dfeb",
    borderRadius: "10px",
    padding: "12px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d9dfeb",
    borderRadius: "10px",
    padding: "12px",
    outline: "none",
    fontSize: "14px",
    resize: "vertical",
    minHeight: "100px",
    fontFamily: "inherit",
  },

  saveButton: {
    border: "none",
    borderRadius: "11px",
    background: "#3157d5",
    color: "#fff",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  viewButton: {
    border: "1px solid #d5dce8",
    borderRadius: "11px",
    background: "#fff",
    color: "#172033",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  addBox: {
    background: "#f7f9fd",
    border: "1px solid #e1e6ef",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "16px",
  },

  addButton: {
    border: "none",
    borderRadius: "10px",
    background: "#172033",
    color: "#fff",
    padding: "11px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    border: "1px solid #e2e7ef",
    borderRadius: "12px",
    background: "#fff",
  },

  smallText: {
    marginTop: "5px",
    color: "#68738a",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  deleteButton: {
    border: "none",
    borderRadius: "8px",
    background: "#fff0f0",
    color: "#d22e2e",
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },

  success: {
    background: "#eaf8ef",
    border: "1px solid #b9e6c8",
    color: "#176b34",
    borderRadius: "12px",
    padding: "12px 15px",
    marginBottom: "16px",
    fontWeight: 700,
  },

  error: {
    background: "#fff0f0",
    border: "1px solid #f0c0c0",
    color: "#a52626",
    borderRadius: "12px",
    padding: "12px 15px",
    marginBottom: "16px",
    fontWeight: 700,
  },

  bottomActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
    padding: "20px 0 40px",
  },

  loading: {
    textAlign: "center",
    padding: "100px 20px",
    fontSize: "18px",
    fontWeight: 800,
  },
};