"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at: string | null;
};

export default function TeacherAnnouncementsPage() {
  const router = useRouter();

  const [announcement, setAnnouncement] =
    useState<Announcement | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadAnnouncement();
  }, []);

  async function loadAnnouncement() {
    setLoading(true);
    setError("");

    try {
      const { data, error: announcementError } =
        await supabase
          .from("announcements")
          .select(
            "id, title, message, created_at"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (announcementError) {
        console.error(
          "Announcement loading error:",
          announcementError
        );

        setError(
          `Announcement could not be loaded: ${announcementError.message}`
        );

        return;
      }

      if (data) {
        const currentAnnouncement =
          data as Announcement;

        setAnnouncement(currentAnnouncement);

        setTitle(currentAnnouncement.title);
        setMessage(currentAnnouncement.message);
      } else {
        setAnnouncement(null);
        setTitle("");
        setMessage("");
      }
    } catch (err) {
      console.error(
        "Unexpected announcement loading error:",
        err
      );

      setError(
        "Unable to load announcement."
      );
    } finally {
      setLoading(false);
    }
  }

  async function publishAnnouncement() {
    setError("");

    if (!title.trim()) {
      setError(
        "Please enter announcement title."
      );
      return;
    }

    if (!message.trim()) {
      setError(
        "Please enter announcement message."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Delete the existing announcement first.
       *
       * This keeps only ONE announcement
       * for all students.
       */
      if (announcement) {
        const { error: deleteError } =
          await supabase
            .from("announcements")
            .delete()
            .eq("id", announcement.id);

        if (deleteError) {
          console.error(
            "Old announcement delete error:",
            deleteError
          );

          setError(
            `Previous announcement could not be replaced: ${deleteError.message}`
          );

          return;
        }
      }

      /*
       * Insert the new announcement.
       */
      const { data, error: insertError } =
        await supabase
          .from("announcements")
          .insert({
            title: title.trim(),
            message: message.trim(),
          })
          .select(
            "id, title, message, created_at"
          )
          .single();

      if (insertError) {
        console.error(
          "Announcement insert error:",
          insertError
        );

        setError(
          `Announcement could not be published: ${insertError.message}`
        );

        return;
      }

      if (data) {
        setAnnouncement(
          data as Announcement
        );
      }

      alert(
        "Announcement published successfully for all students."
      );

      await loadAnnouncement();
    } catch (err) {
      console.error(
        "Unexpected announcement publish error:",
        err
      );

      setError(
        "Unable to publish announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement() {
    if (!announcement) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this announcement? It will disappear for all students."
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("announcements")
          .delete()
          .eq("id", announcement.id);

      if (deleteError) {
        console.error(
          "Announcement delete error:",
          deleteError
        );

        setError(
          `Announcement could not be deleted: ${deleteError.message}`
        );

        return;
      }

      setAnnouncement(null);
      setTitle("");
      setMessage("");

      alert(
        "Announcement deleted successfully."
      );
    } catch (err) {
      console.error(
        "Unexpected announcement delete error:",
        err
      );

      setError(
        "Unable to delete announcement."
      );
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>

            <div style={styles.logo}>
              📢
            </div>

            <div>
              <div style={styles.badge}>
                TEACHER PORTAL
              </div>

              <h1 style={styles.title}>
                Announcements
              </h1>

              <p style={styles.subtitle}>
                Create one announcement for
                all students
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/teacher/dashboard"
              )
            }
            style={styles.backButton}
          >
            ← Dashboard
          </button>
        </header>

        {/* ERROR */}

        {error && (
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>
              ⚠️
            </div>

            <div>
              <div style={styles.errorTitle}>
                Something went wrong
              </div>

              <div style={styles.errorText}>
                {error}
              </div>
            </div>
          </div>
        )}

        {/* INFORMATION */}

        <section style={styles.infoCard}>

          <div style={styles.infoIcon}>
            📢
          </div>

          <div>
            <div style={styles.infoTitle}>
              One Announcement for Everyone
            </div>

            <p style={styles.infoText}>
              The announcement you publish here
              will be visible to all students.
              There is no class-wise selection.
            </p>
          </div>

        </section>

        {/* CREATE / EDIT CARD */}

        <section style={styles.formCard}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              ✏️
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                {announcement
                  ? "Update Announcement"
                  : "Create Announcement"}
              </h2>

              <p style={styles.cardSubtitle}>
                Write an important message for
                all students.
              </p>
            </div>

          </div>

          {/* TITLE */}

          <div style={styles.field}>

            <label style={styles.label}>
              Announcement Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="e.g. Important Notice"
              style={styles.input}
              maxLength={150}
            />

            <div style={styles.characterCount}>
              {title.length}/150
            </div>

          </div>

          {/* MESSAGE */}

          <div style={styles.field}>

            <label style={styles.label}>
              Announcement Message
            </label>

            <textarea
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Write your announcement here..."
              rows={8}
              style={styles.textarea}
              maxLength={2000}
            />

            <div style={styles.characterCount}>
              {message.length}/2000
            </div>

          </div>

          {/* TARGET */}

          <div style={styles.targetCard}>

            <div style={styles.targetIcon}>
              👥
            </div>

            <div>

              <div style={styles.targetTitle}>
                Audience
              </div>

              <div style={styles.targetText}>
                All Students
              </div>

              <div style={styles.targetSubtext}>
                This announcement will be
                visible to every student.
              </div>

            </div>

          </div>

          {/* ACTIONS */}

          <div style={styles.actions}>

            {announcement && (
              <button
                type="button"
                onClick={deleteAnnouncement}
                disabled={
                  deleting || saving
                }
                style={{
                  ...styles.deleteButton,
                  opacity:
                    deleting || saving
                      ? 0.6
                      : 1,
                  cursor:
                    deleting || saving
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {deleting
                  ? "Deleting..."
                  : "🗑️ Delete"}
              </button>
            )}

            <button
              type="button"
              onClick={
                publishAnnouncement
              }
              disabled={
                saving || deleting
              }
              style={{
                ...styles.publishButton,
                opacity:
                  saving || deleting
                    ? 0.7
                    : 1,
                cursor:
                  saving || deleting
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving
                ? "Publishing..."
                : announcement
                ? "📢 Update Announcement"
                : "🚀 Publish Announcement"}
            </button>

          </div>

        </section>

        {/* CURRENT ANNOUNCEMENT */}

        <section style={styles.currentCard}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              📋
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Current Announcement
              </h2>

              <p style={styles.cardSubtitle}>
                This is the announcement currently
                visible to students.
              </p>
            </div>

          </div>

          {loading ? (
            <div style={styles.emptyBox}>

              <div style={styles.emptyIcon}>
                ⏳
              </div>

              <div style={styles.emptyTitle}>
                Loading Announcement...
              </div>

            </div>
          ) : announcement ? (
            <article
              style={styles.announcementPreview}
            >

              <div style={styles.previewTop}>

                <div style={styles.liveBadge}>
                  ● LIVE
                </div>

                <div style={styles.audienceBadge}>
                  👥 All Students
                </div>

              </div>

              <h3
                style={styles.previewTitle}
              >
                {announcement.title}
              </h3>

              <div
                style={
                  styles.previewMessageBox
                }
              >
                <div
                  style={
                    styles.previewLabel
                  }
                >
                  ANNOUNCEMENT
                </div>

                <p
                  style={
                    styles.previewMessage
                  }
                >
                  {announcement.message}
                </p>
              </div>

              <div
                style={styles.previewFooter}
              >
                <span>
                  📅 Published
                </span>

                <span>
                  {formatDate(
                    announcement.created_at
                  )}
                </span>
              </div>

            </article>
          ) : (
            <div style={styles.emptyBox}>

              <div style={styles.emptyIcon}>
                📢
              </div>

              <div style={styles.emptyTitle}>
                No Announcement Published
              </div>

              <p style={styles.emptyText}>
                Create and publish an announcement
                above. It will then become visible
                to all students.
              </p>

            </div>
          )}

        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          Attendance Portal • Teacher
          Announcements • 2026
        </footer>

      </div>
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff 0%,#f8fafc 50%,#eff6ff 100%)",
    padding: "24px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  logo: {
    width: "54px",
    height: "54px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
    boxShadow:
      "0 8px 20px rgba(37,99,235,0.18)",
  },

  badge: {
    display: "inline-block",
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "1.5px",
    marginBottom: "4px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "28px",
    fontWeight: "1000",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  backButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "10px 15px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "13px",
    padding: "13px 15px",
    marginBottom: "18px",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },

  errorIcon: {
    fontSize: "20px",
  },

  errorTitle: {
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: "1000",
  },

  errorText: {
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: "600",
    marginTop: "3px",
    wordBreak: "break-word",
  },

  infoCard: {
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border: "1px solid #bfdbfe",
    borderRadius: "16px",
    padding: "15px",
    marginBottom: "18px",
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
  },

  infoIcon: {
    width: "38px",
    height: "38px",
    minWidth: "38px",
    borderRadius: "10px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  infoTitle: {
    color: "#1e3a8a",
    fontSize: "12px",
    fontWeight: "1000",
  },

  infoText: {
    margin: "4px 0 0",
    color: "#475569",
    fontSize: "11px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  formCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    border: "2px solid #bfdbfe",
  },

  currentCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  },

  cardIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    flexShrink: 0,
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "20px",
    fontWeight: "1000",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "17px",
  },

  label: {
    color: "#334155",
    fontSize: "12px",
    fontWeight: "1000",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
    resize: "vertical",
    lineHeight: 1.6,
    minHeight: "170px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  characterCount: {
    alignSelf: "flex-end",
    color: "#94a3b8",
    fontSize: "9px",
    fontWeight: "700",
  },

  targetCard: {
    marginTop: "3px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  targetIcon: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "10px",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  targetTitle: {
    color: "#166534",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  targetText: {
    color: "#14532d",
    fontSize: "15px",
    fontWeight: "1000",
    marginTop: "2px",
  },

  targetSubtext: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "600",
    marginTop: "2px",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "9px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  publishButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    padding: "13px 20px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "1000",
  },

  deleteButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "13px 17px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "1000",
  },

  announcementPreview: {
    border: "1px solid #c7d2fe",
    borderRadius: "16px",
    padding: "18px",
    background:
      "linear-gradient(135deg,#f8faff,#ffffff)",
  },

  previewTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap",
  },

  liveBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  audienceBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  previewTitle: {
    margin: "13px 0 0",
    color: "#172554",
    fontSize: "21px",
    fontWeight: "1000",
  },

  previewMessageBox: {
    marginTop: "13px",
    padding: "14px",
    borderRadius: "11px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  previewLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.2px",
    marginBottom: "6px",
  },

  previewMessage: {
    margin: 0,
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.7,
    fontWeight: "600",
    whiteSpace: "pre-wrap",
  },

  previewFooter: {
    marginTop: "13px",
    paddingTop: "11px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
    flexWrap: "wrap",
  },

  emptyBox: {
    textAlign: "center",
    padding: "45px 20px",
    borderRadius: "15px",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
  },

  emptyIcon: {
    fontSize: "42px",
    marginBottom: "10px",
  },

  emptyTitle: {
    color: "#334155",
    fontSize: "17px",
    fontWeight: "1000",
  },

  emptyText: {
    maxWidth: "480px",
    margin: "7px auto 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    padding: "22px 10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
  },
};