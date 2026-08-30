"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TeacherData = {
  id?: number | string;
  teacher_username?: string;
  teacher_name?: string;
  username?: string;
  name?: string;
};

export default function TeacherProfilePage() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    try {
      /*
       * Get teacher name
       */
      const savedName =
        localStorage.getItem("teacherName") ||
        localStorage.getItem("teacher_name") ||
        "";

      /*
       * Get teacher username.
       *
       * The old code could receive a JSON object like:
       * {"id":1,"teacher_username":"HARSH201951"}
       *
       * This code safely extracts only teacher_username.
       */
      const savedTeacher = localStorage.getItem("teacher");

      let username = "";

      if (savedTeacher) {
        try {
          const parsed: TeacherData = JSON.parse(savedTeacher);

          username =
            parsed.teacher_username ||
            parsed.username ||
            "";
        } catch {
          /*
           * If "teacher" is just a normal string,
           * use it as username.
           */
          username = savedTeacher;
        }
      }

      /*
       * Also check separate username storage keys.
       */
      username =
        username ||
        localStorage.getItem("teacherUsername") ||
        localStorage.getItem("teacher_username") ||
        localStorage.getItem("username") ||
        "";

      /*
       * If teacherName itself contains JSON,
       * extract the actual name/username instead of
       * displaying the complete JSON object.
       */
      let cleanName = savedName;

      if (cleanName) {
        try {
          const parsed: TeacherData = JSON.parse(cleanName);

          cleanName =
            parsed.teacher_name ||
            parsed.name ||
            "";
          
          username =
            username ||
            parsed.teacher_username ||
            parsed.username ||
            "";
        } catch {
          // Normal text, no JSON parsing required.
        }
      }

      /*
       * Final fallback.
       */
      setTeacherName(cleanName || "Teacher");
      setTeacherUsername(username || "Teacher Account");

      /*
       * Load profile picture.
       */
      const savedImage =
        localStorage.getItem("teacherProfileImage");

      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch {
      setTeacherName("Teacher");
      setTeacherUsername("Teacher Account");
    }
  }, []);

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        setProfileImage(result);

        try {
          localStorage.setItem(
            "teacherProfileImage",
            result
          );
        } catch {
          alert("Unable to save the profile picture.");
        }
      }
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setProfileImage(null);

    try {
      localStorage.removeItem("teacherProfileImage");
    } catch {
      // Ignore storage errors
    }
  };

  const displayName =
    teacherName &&
    teacherName !== "Teacher"
      ? teacherName
      : teacherUsername !== "Teacher Account"
      ? teacherUsername
      : "Teacher";

  const avatarLetter =
    displayName.charAt(0).toUpperCase();

  return (
    <main className="profile-page">
      <div className="background-grid" />

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="profile-shell">

        {/* TOP BAR */}
        <header className="topbar">
          <button
            type="button"
            className="back-button"
            onClick={() => router.push("/teacher")}
          >
            ← Back
          </button>

          <div className="top-title">
            <span>TEACHER</span>
            <strong>PROFILE</strong>
          </div>

          <div className="top-status">
            <span className="status-dot" />
            PROFILE
          </div>
        </header>

        {/* PROFILE CARD */}
        <section className="profile-card">
          <div className="card-glow" />

          <div className="section-label">
            <span />
            TEACHER PROFILE
          </div>

          <h1>Profile Picture</h1>

          <p className="description">
            Add or change your teacher profile picture.
            This picture is stored on this device and can
            be updated anytime.
          </p>

          {/* PROFILE IMAGE */}
          <div className="avatar-section">
            <div className="avatar">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Teacher profile"
                />
              ) : (
                <span>{avatarLetter}</span>
              )}
            </div>

            <div className="teacher-info">
              <h2>{displayName}</h2>

              <p>Teacher Account</p>

              {/* USERNAME */}
              <div className="username-box">
                <span className="username-label">
                  USERNAME
                </span>

                <strong>
                  {teacherUsername}
                </strong>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="actions">
            <label className="upload-button">
              <span>📷</span>

              <span>
                {profileImage
                  ? "Change Picture"
                  : "Upload Picture"}
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageChange}
              />
            </label>

            {profileImage && (
              <button
                type="button"
                className="remove-button"
                onClick={removeImage}
              >
                Remove Picture
              </button>
            )}
          </div>

          {/* INFO */}
          <div className="info-box">
            <div className="info-icon">
              i
            </div>

            <div>
              <strong>
                Profile picture requirements
              </strong>

              <p>
                JPG, PNG or WEBP • Maximum size 5 MB
              </p>
            </div>
          </div>

          {/* RETURN BUTTON */}
          <button
            type="button"
            className="dashboard-button"
            onClick={() => router.push("/teacher")}
          >
            ← Return to Teacher Control Centre
          </button>
        </section>

        {/* FOOTER */}
        <footer>
          <span>RACER ACADEMY</span>

          <span>
            Teacher Management Portal
          </span>

          <span>
            Secure • Private • Connected
          </span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .profile-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #f8fafc;

          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(99, 102, 241, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(14, 165, 233, 0.13),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #060914 0%,
              #0b1020 50%,
              #070b16 100%
            );

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.2;

          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            );

          background-size: 45px 45px;
        }

        .ambient {
          position: fixed;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.14;
          pointer-events: none;
        }

        .ambient-one {
          background: #6366f1;
          left: -150px;
          top: 20%;
        }

        .ambient-two {
          background: #0ea5e9;
          right: -150px;
          bottom: 10%;
        }

        .profile-shell {
          width: min(100% - 36px, 1050px);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .topbar {
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid
            rgba(148, 163, 184, 0.1);
        }

        .back-button {
          border: 1px solid
            rgba(148, 163, 184, 0.13);

          background:
            rgba(15, 23, 42, 0.65);

          color: #cbd5e1;
          padding: 10px 15px;
          border-radius: 11px;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .back-button:hover {
          border-color:
            rgba(129, 140, 248, 0.45);

          color: #a5b4fc;
          transform: translateX(-2px);
        }

        .top-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          letter-spacing: 1.8px;
        }

        .top-title span {
          color: #64748b;
        }

        .top-title strong {
          color: #cbd5e1;
        }

        .top-status {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;

          display: flex;
          align-items: center;
          gap: 7px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;

          box-shadow:
            0 0 14px
            rgba(34, 197, 94, 0.8);
        }

        .profile-card {
          position: relative;
          overflow: hidden;

          margin: 55px auto 80px;
          max-width: 720px;

          padding: 48px;
          border-radius: 28px;

          border: 1px solid
            rgba(148, 163, 184, 0.12);

          background:
            linear-gradient(
              145deg,
              rgba(22, 30, 55, 0.95),
              rgba(10, 16, 31, 0.94)
            );

          box-shadow:
            0 30px 80px
              rgba(0, 0, 0, 0.35),
            inset 0 1px
              rgba(255, 255, 255, 0.04);
        }

        .card-glow {
          position: absolute;
          width: 250px;
          height: 250px;
          border-radius: 50%;

          right: -130px;
          top: -130px;

          background: #6366f1;
          filter: blur(100px);
          opacity: 0.13;
          pointer-events: none;
        }

        .section-label {
          position: relative;

          display: flex;
          align-items: center;
          gap: 9px;

          color: #818cf8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;

          margin-bottom: 13px;
        }

        .section-label span {
          width: 27px;
          height: 1px;
          background: #818cf8;
        }

        h1 {
          position: relative;
          margin: 0;
          font-size: 42px;
          letter-spacing: -1.8px;
        }

        .description {
          position: relative;
          max-width: 560px;

          margin: 13px 0 35px;

          color: #94a3b8;
          font-size: 13px;
          line-height: 1.75;
        }

        .avatar-section {
          position: relative;

          display: flex;
          align-items: center;
          gap: 25px;

          padding: 25px;
          border-radius: 20px;

          border: 1px solid
            rgba(148, 163, 184, 0.1);

          background:
            rgba(15, 23, 42, 0.48);
        }

        .avatar {
          width: 125px;
          height: 125px;
          flex-shrink: 0;

          border-radius: 50%;
          overflow: hidden;

          display: grid;
          place-items: center;

          background:
            linear-gradient(
              145deg,
              rgba(129, 140, 248, 0.35),
              rgba(56, 189, 248, 0.18)
            );

          border: 2px solid
            rgba(129, 140, 248, 0.35);

          box-shadow:
            0 0 45px
              rgba(99, 102, 241, 0.15),
            inset 0 0 25px
              rgba(255, 255, 255, 0.05);
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar span {
          font-size: 52px;
          font-weight: 900;
          color: #c7d2fe;
        }

        .teacher-info {
          min-width: 0;
        }

        .teacher-info h2 {
          margin: 0 0 7px;
          font-size: 25px;
          word-break: break-word;
        }

        .teacher-info p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          letter-spacing: 0.8px;
        }

        .username-box {
          display: flex;
          flex-direction: column;
          gap: 5px;

          margin-top: 14px;
          padding: 10px 12px;

          border-radius: 10px;

          background:
            rgba(99, 102, 241, 0.08);

          border: 1px solid
            rgba(129, 140, 248, 0.13);
        }

        .username-label {
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .username-box strong {
          color: #a5b4fc;
          font-size: 12px;
          letter-spacing: 0.6px;
          word-break: break-all;
        }

        .actions {
          position: relative;

          display: flex;
          gap: 12px;

          margin-top: 25px;
          flex-wrap: wrap;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          gap: 9px;

          padding: 13px 19px;
          border-radius: 12px;

          cursor: pointer;
          color: white;

          font-size: 12px;
          font-weight: 800;

          background:
            linear-gradient(
              135deg,
              #6366f1,
              #4f46e5
            );

          box-shadow:
            0 10px 30px
              rgba(79, 70, 229, 0.25);

          transition: 0.25s ease;
        }

        .upload-button:hover {
          transform: translateY(-2px);

          box-shadow:
            0 15px 35px
              rgba(79, 70, 229, 0.35);
        }

        .upload-button input {
          display: none;
        }

        .remove-button {
          padding: 13px 19px;
          border-radius: 12px;

          cursor: pointer;

          color: #fca5a5;

          background:
            rgba(127, 29, 29, 0.18);

          border: 1px solid
            rgba(248, 113, 113, 0.2);

          font-size: 12px;
          font-weight: 700;

          transition: 0.25s ease;
        }

        .remove-button:hover {
          background:
            rgba(127, 29, 29, 0.3);

          border-color:
            rgba(248, 113, 113, 0.4);
        }

        .info-box {
          position: relative;

          display: flex;
          gap: 12px;
          align-items: flex-start;

          margin-top: 25px;
          padding: 15px;

          border-radius: 14px;

          background:
            rgba(56, 189, 248, 0.05);

          border: 1px solid
            rgba(56, 189, 248, 0.1);
        }

        .info-icon {
          width: 23px;
          height: 23px;

          display: grid;
          place-items: center;

          flex-shrink: 0;

          border-radius: 50%;

          background:
            rgba(56, 189, 248, 0.12);

          color: #67e8f9;

          font-size: 12px;
          font-weight: 900;
        }

        .info-box strong {
          color: #cbd5e1;
          font-size: 11px;
        }

        .info-box p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 10px;
        }

        .dashboard-button {
          width: 100%;

          margin-top: 28px;
          padding: 14px;

          border-radius: 13px;

          border: 1px solid
            rgba(148, 163, 184, 0.12);

          background:
            rgba(15, 23, 42, 0.7);

          color: #94a3b8;

          cursor: pointer;

          font-size: 11px;
          font-weight: 800;

          transition: 0.25s ease;
        }

        .dashboard-button:hover {
          color: #a5b4fc;

          border-color:
            rgba(129, 140, 248, 0.3);
        }

        footer {
          min-height: 75px;

          border-top: 1px solid
            rgba(148, 163, 184, 0.09);

          display: flex;
          align-items: center;
          justify-content: space-between;

          color: #475569;
          font-size: 9px;
          letter-spacing: 0.7px;
        }

        footer span:first-child {
          color: #64748b;
          font-weight: 900;
        }

        @media (max-width: 650px) {
          .profile-shell {
            width: min(
              100% - 24px,
              600px
            );
          }

          .topbar {
            height: 74px;
          }

          .top-title {
            display: none;
          }

          .profile-card {
            margin-top: 35px;
            padding: 28px 20px;
            border-radius: 22px;
          }

          h1 {
            font-size: 34px;
          }

          .avatar-section {
            flex-direction: column;
            text-align: center;
          }

          .teacher-info {
            width: 100%;
          }

          .teacher-info h2 {
            font-size: 21px;
          }

          .actions {
            flex-direction: column;
          }

          .upload-button,
          .remove-button {
            justify-content: center;
            width: 100%;
          }

          footer {
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            padding: 20px 0;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}