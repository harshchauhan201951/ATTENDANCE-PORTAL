"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type TeacherData = {
  id?: number | string;
  teacher_username?: string;
  teacher_name?: string;
  username?: string;
  name?: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function TeacherProfilePage() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherUsername, setTeacherUsername] =
    useState("");
  const [profileImage, setProfileImage] =
    useState<string | null>(null);

  const [usernameInput, setUsernameInput] =
    useState("");
  const [usernameSaved, setUsernameSaved] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState<
      "profile" | "security" | "preferences"
    >("profile");

  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordMessageType, setPasswordMessageType] =
    useState<"success" | "error" | "">("");

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [compactMode, setCompactMode] =
    useState(false);

  const [profileSaved, setProfileSaved] =
    useState(false);

  useEffect(() => {
    try {
      const savedName =
        localStorage.getItem("teacherName") ||
        localStorage.getItem("teacher_name") ||
        "";

      const savedTeacher =
        localStorage.getItem("teacher");

      let username = "";
      let id = "";

      if (savedTeacher) {
        try {
          const parsed: TeacherData =
            JSON.parse(savedTeacher);

          username =
            parsed.teacher_username ||
            parsed.username ||
            "";

          if (
            parsed.id !== undefined &&
            parsed.id !== null
          ) {
            id = String(parsed.id);
          }

          const possibleName =
            parsed.teacher_name ||
            parsed.name ||
            "";

          if (possibleName && !savedName) {
            setTeacherName(possibleName);
          }
        } catch {
          username = savedTeacher;
        }
      }

      username =
        username ||
        localStorage.getItem("teacherUsername") ||
        localStorage.getItem("teacher_username") ||
        localStorage.getItem("username") ||
        "";

      id =
        id ||
        localStorage.getItem("teacher_id") ||
        localStorage.getItem("teacherId") ||
        "";

      /*
       * The custom saved profile username always gets
       * priority over the original login username.
       */
      const savedProfileUsername =
        localStorage.getItem(
          "teacherProfileUsername"
        );

      if (savedProfileUsername?.trim()) {
        username = savedProfileUsername.trim();
      }

      let cleanName = savedName;

      if (cleanName) {
        try {
          const parsed: TeacherData =
            JSON.parse(cleanName);

          cleanName =
            parsed.teacher_name ||
            parsed.name ||
            "";

          username =
            username ||
            parsed.teacher_username ||
            parsed.username ||
            "";

          if (
            !id &&
            parsed.id !== undefined &&
            parsed.id !== null
          ) {
            id = String(parsed.id);
          }
        } catch {
          // Normal name.
        }
      }

      const finalUsername =
        username || "Teacher Account";

      setTeacherId(id);

      setTeacherName(
        cleanName ||
          finalUsername ||
          "Teacher"
      );

      setTeacherUsername(finalUsername);
      setUsernameInput(
        finalUsername === "Teacher Account"
          ? ""
          : finalUsername
      );

      const savedImage =
        localStorage.getItem(
          "teacherProfileImage"
        );

      if (savedImage) {
        setProfileImage(savedImage);
      }

      const savedNotifications =
        localStorage.getItem(
          "teacherNotifications"
        );

      if (savedNotifications !== null) {
        setNotificationsEnabled(
          savedNotifications === "true"
        );
      }

      const savedCompactMode =
        localStorage.getItem(
          "teacherCompactMode"
        );

      if (savedCompactMode !== null) {
        setCompactMode(
          savedCompactMode === "true"
        );
      }
    } catch {
      setTeacherName("Teacher");
      setTeacherUsername("Teacher Account");
      setUsernameInput("");
    }
  }, []);

  const showSavedMessage = () => {
    setProfileSaved(true);

    window.setTimeout(() => {
      setProfileSaved(false);
    }, 2500);
  };

  const handleUsernameSave = () => {
    const cleanedUsername =
      usernameInput.trim();

    if (!cleanedUsername) {
      alert(
        "Please enter a teacher username."
      );
      return;
    }

    if (cleanedUsername.length < 2) {
      alert(
        "Teacher username must contain at least 2 characters."
      );
      return;
    }

    try {
      /*
       * Store the profile/display username.
       *
       * Existing authentication username remains untouched.
       * This value is specifically used for the teacher profile
       * and dashboard welcome message.
       */
      localStorage.setItem(
        "teacherProfileUsername",
        cleanedUsername
      );

      /*
       * Also update the existing local teacher display keys
       * so older pages that read teacherName/teacherUsername
       * continue to work.
       */
      localStorage.setItem(
        "teacherName",
        cleanedUsername
      );

      localStorage.setItem(
        "teacher_name",
        cleanedUsername
      );

      localStorage.setItem(
        "teacherUsername",
        cleanedUsername
      );

      localStorage.setItem(
        "teacher_username",
        cleanedUsername
      );

      setTeacherUsername(cleanedUsername);
      setTeacherName(cleanedUsername);
      setUsernameInput(cleanedUsername);

      setUsernameSaved(true);
      showSavedMessage();

      window.setTimeout(() => {
        setUsernameSaved(false);
      }, 2500);
    } catch {
      alert(
        "Unable to save teacher username on this device."
      );
    }
  };

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result === "string"
      ) {
        try {
          setProfileImage(reader.result);

          localStorage.setItem(
            "teacherProfileImage",
            reader.result
          );

          setProfileSaved(true);

          window.setTimeout(() => {
            setProfileSaved(false);
          }, 2500);
        } catch {
          alert(
            "Unable to save the profile picture. The image may be too large for browser storage."
          );
        }
      }
    };

    reader.onerror = () => {
      alert("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  const removeImage = () => {
    setProfileImage(null);

    try {
      localStorage.removeItem(
        "teacherProfileImage"
      );

      setProfileSaved(true);

      window.setTimeout(() => {
        setProfileSaved(false);
      }, 2500);
    } catch {
      // Ignore storage errors.
    }
  };

  const handlePasswordChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordMessage("");
    setPasswordMessageType("");
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordMessageType("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordMessage(
        "Please fill all password fields."
      );

      setPasswordMessageType("error");
      return;
    }

    if (
      passwordForm.newPassword.length < 6
    ) {
      setPasswordMessage(
        "New password must contain at least 6 characters."
      );

      setPasswordMessageType("error");
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordMessage(
        "New password and confirm password do not match."
      );

      setPasswordMessageType("error");
      return;
    }

    if (
      passwordForm.currentPassword ===
      passwordForm.newPassword
    ) {
      setPasswordMessage(
        "New password must be different from your current password."
      );

      setPasswordMessageType("error");
      return;
    }

    setSavingPassword(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    setPasswordMessage(
      "Password form is ready. Connect it to your existing teacher password-update API/RPC to save the new password."
    );

    setPasswordMessageType("error");
    setSavingPassword(false);
  };

  const toggleNotifications = () => {
    const nextValue =
      !notificationsEnabled;

    setNotificationsEnabled(nextValue);

    try {
      localStorage.setItem(
        "teacherNotifications",
        String(nextValue)
      );
    } catch {
      // Ignore.
    }
  };

  const toggleCompactMode = () => {
    const nextValue = !compactMode;

    setCompactMode(nextValue);

    try {
      localStorage.setItem(
        "teacherCompactMode",
        String(nextValue)
      );
    } catch {
      // Ignore.
    }
  };

  const displayName =
    teacherUsername &&
    teacherUsername !== "Teacher Account"
      ? teacherUsername
      : teacherName &&
        teacherName !== "Teacher"
      ? teacherName
      : "Teacher";

  const avatarLetter =
    displayName.charAt(0).toUpperCase();

  const accountInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) =>
        name.charAt(0).toUpperCase()
      )
      .join("") || "T";

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
            onClick={() =>
              router.push("/teacher")
            }
          >
            ← Back
          </button>

          <div className="top-title">
            <span>TEACHER</span>
            <strong>PROFILE</strong>
          </div>

          <div className="top-status">
            <span className="status-dot" />
            ACCOUNT ACTIVE
          </div>
        </header>

        {/* PROFILE HERO */}

        <section className="profile-hero">
          <div className="hero-glow" />

          <div className="hero-avatar">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Teacher profile"
              />
            ) : (
              <span>{accountInitials}</span>
            )}

            <div className="online-indicator" />
          </div>

          <div className="hero-info">
            <div className="hero-kicker">
              TEACHER ACCOUNT
            </div>

            <h1>{displayName}</h1>

            <p>
              Manage your profile, account security
              and teacher preferences from one place.
            </p>

            <div className="hero-meta">
              <span>
                <b>USERNAME</b>
                {teacherUsername}
              </span>

              <span>
                <b>TEACHER ID</b>
                {teacherId || "Not available"}
              </span>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              onClick={() =>
                setActiveSection("profile")
              }
            >
              👤 Profile
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveSection("security")
              }
            >
              🔐 Security
            </button>
          </div>
        </section>

        {/* NAVIGATION */}

        <nav className="section-nav">
          <button
            type="button"
            className={
              activeSection === "profile"
                ? "nav-item nav-active"
                : "nav-item"
            }
            onClick={() =>
              setActiveSection("profile")
            }
          >
            <span>👤</span>
            <div>
              <strong>Profile</strong>
              <small>
                Picture & account details
              </small>
            </div>
          </button>

          <button
            type="button"
            className={
              activeSection === "security"
                ? "nav-item nav-active"
                : "nav-item"
            }
            onClick={() =>
              setActiveSection("security")
            }
          >
            <span>🔐</span>
            <div>
              <strong>Security</strong>
              <small>
                Change password & safety
              </small>
            </div>
          </button>

          <button
            type="button"
            className={
              activeSection === "preferences"
                ? "nav-item nav-active"
                : "nav-item"
            }
            onClick={() =>
              setActiveSection("preferences")
            }
          >
            <span>⚙️</span>
            <div>
              <strong>Preferences</strong>
              <small>
                Personal portal settings
              </small>
            </div>
          </button>
        </nav>

        {/* PROFILE SECTION */}

        {activeSection === "profile" && (
          <section className="main-card">
            <div className="section-heading">
              <div>
                <span className="section-label">
                  PROFILE MANAGEMENT
                </span>

                <h2>
                  Your Teacher Profile
                </h2>

                <p>
                  Set your teacher username and
                  manage your profile picture.
                </p>
              </div>

              {profileSaved && (
                <div className="saved-pill">
                  ✓ SAVED
                </div>
              )}
            </div>

            <div className="profile-layout">
              <div className="image-panel">
                <div className="panel-label">
                  PROFILE PICTURE
                </div>

                <div className="large-avatar">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Teacher profile"
                    />
                  ) : (
                    <span>
                      {avatarLetter}
                    </span>
                  )}
                </div>

                <h3>{displayName}</h3>

                <p>
                  Your profile picture is stored
                  on this device and shown on the
                  Teacher Dashboard.
                </p>

                <div className="image-actions">
                  <label className="primary-button">
                    <span>📷</span>
                    <span>
                      {profileImage
                        ? "Change Picture"
                        : "Upload Picture"}
                    </span>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={
                        handleImageChange
                      }
                    />
                  </label>

                  {profileImage && (
                    <button
                      type="button"
                      className="secondary-danger-button"
                      onClick={removeImage}
                    >
                      Remove Picture
                    </button>
                  )}
                </div>

                <div className="requirement-box">
                  <span>ⓘ</span>

                  <div>
                    <strong>
                      Picture requirements
                    </strong>

                    <p>
                      JPG, PNG or WEBP • Maximum
                      5 MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="details-panel">
                <div className="panel-label">
                  ACCOUNT INFORMATION
                </div>

                {/* USERNAME EDIT */}

                <div className="username-editor">
                  <label>
                    TEACHER USERNAME
                  </label>

                  <div className="username-input-row">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(event) =>
                        setUsernameInput(
                          event.target.value
                        )
                      }
                      placeholder="Enter teacher username"
                      maxLength={50}
                    />

                    <button
                      type="button"
                      onClick={
                        handleUsernameSave
                      }
                    >
                      {usernameSaved
                        ? "✓ Saved"
                        : "Save"}
                    </button>
                  </div>

                  <p>
                    This username will be shown
                    beside “Welcome” on the
                    Teacher Dashboard.
                  </p>
                </div>

                <div className="detail-list">
                  <div className="detail-row">
                    <span>
                      <i>👤</i>
                      Teacher Name
                    </span>

                    <strong>
                      {displayName}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      <i>🔑</i>
                      Username
                    </span>

                    <strong>
                      {teacherUsername}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      <i>🆔</i>
                      Teacher ID
                    </span>

                    <strong>
                      {teacherId ||
                        "Not available"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      <i>🛡️</i>
                      Account Status
                    </span>

                    <strong className="active-text">
                      Active
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      <i>🌐</i>
                      Portal Access
                    </span>

                    <strong>
                      Teacher Control Centre
                    </strong>
                  </div>
                </div>

                <div className="info-notice">
                  <div className="notice-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Profile connected to dashboard
                    </strong>

                    <p>
                      Your saved username and
                      profile picture are used
                      automatically on the Teacher
                      Control Centre.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="quick-section">
              <div className="panel-label">
                QUICK ACTIONS
              </div>

              <div className="quick-grid">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/students"
                    )
                  }
                >
                  <span>👨‍🎓</span>
                  <div>
                    <strong>
                      Students
                    </strong>
                    <small>
                      Manage student records
                    </small>
                  </div>
                  <b>→</b>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/attendance"
                    )
                  }
                >
                  <span>📅</span>
                  <div>
                    <strong>
                      Attendance
                    </strong>
                    <small>
                      Mark and manage attendance
                    </small>
                  </div>
                  <b>→</b>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/extra-class"
                    )
                  }
                >
                  <span>⭐</span>
                  <div>
                    <strong>
                      Extra Classes
                    </strong>
                    <small>
                      Manage extra class records
                    </small>
                  </div>
                  <b>→</b>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/settings"
                    )
                  }
                >
                  <span>⚙️</span>
                  <div>
                    <strong>
                      Settings
                    </strong>
                    <small>
                      Open teacher settings
                    </small>
                  </div>
                  <b>→</b>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SECURITY SECTION */}

        {activeSection === "security" && (
          <section className="main-card">
            <div className="section-heading">
              <div>
                <span className="section-label security-label">
                  ACCOUNT SECURITY
                </span>

                <h2>
                  Change Password
                </h2>

                <p>
                  Keep your Teacher Portal account
                  protected with a strong password.
                </p>
              </div>

              <div className="security-status">
                <span />
                SECURITY
              </div>
            </div>

            <form
              className="password-form"
              onSubmit={
                handlePasswordSubmit
              }
            >
              <div className="security-warning">
                <div>🔐</div>

                <div>
                  <strong>
                    Password security
                  </strong>

                  <p>
                    Use a password that is at
                    least 6 characters long and
                    different from your previous
                    password.
                  </p>
                </div>
              </div>

              <div className="password-grid">
                <div className="input-group">
                  <label>
                    CURRENT PASSWORD
                  </label>

                  <div className="password-input">
                    <input
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      name="currentPassword"
                      value={
                        passwordForm.currentPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(
                          !showCurrentPassword
                        )
                      }
                    >
                      {showCurrentPassword
                        ? "🙈"
                        : "👁️"}
                    </button>
                  </div>
                </div>

                <div />

                <div className="input-group">
                  <label>
                    NEW PASSWORD
                  </label>

                  <div className="password-input">
                    <input
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      name="newPassword"
                      value={
                        passwordForm.newPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword(
                          !showNewPassword
                        )
                      }
                    >
                      {showNewPassword
                        ? "🙈"
                        : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    CONFIRM NEW PASSWORD
                  </label>

                  <div className="password-input">
                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="confirmPassword"
                      value={
                        passwordForm.confirmPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                    >
                      {showConfirmPassword
                        ? "🙈"
                        : "👁️"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="password-rules">
                <div>
                  <span>
                    {passwordForm.newPassword.length >=
                    6
                      ? "✓"
                      : "•"}
                  </span>
                  At least 6 characters
                </div>

                <div>
                  <span>
                    {passwordForm.newPassword &&
                    passwordForm.newPassword ===
                      passwordForm.confirmPassword
                      ? "✓"
                      : "•"}
                  </span>
                  Passwords match
                </div>

                <div>
                  <span>
                    {passwordForm.newPassword &&
                    passwordForm.newPassword !==
                      passwordForm.currentPassword
                      ? "✓"
                      : "•"}
                  </span>
                  Different from current password
                </div>
              </div>

              {passwordMessage && (
                <div
                  className={
                    passwordMessageType ===
                    "success"
                      ? "form-message form-success"
                      : "form-message form-error"
                  }
                >
                  {passwordMessageType ===
                  "success"
                    ? "✓"
                    : "⚠️"}{" "}
                  {passwordMessage}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setPasswordForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });

                    setPasswordMessage("");
                    setPasswordMessageType("");
                  }}
                >
                  Clear
                </button>

                <button
                  type="submit"
                  className="change-password-button"
                  disabled={savingPassword}
                >
                  {savingPassword
                    ? "Checking..."
                    : "🔐 Change Password"}
                </button>
              </div>
            </form>

            <div className="security-cards">
              <div>
                <span>🛡️</span>

                <div>
                  <strong>
                    Secure Account
                  </strong>

                  <p>
                    Protect your teacher account
                    with a unique password.
                  </p>
                </div>
              </div>

              <div>
                <span>📱</span>

                <div>
                  <strong>
                    Personal Device
                  </strong>

                  <p>
                    Avoid saving your password on
                    shared computers.
                  </p>
                </div>
              </div>

              <div>
                <span>🚪</span>

                <div>
                  <strong>
                    Logout After Use
                  </strong>

                  <p>
                    Always logout from shared
                    devices.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PREFERENCES SECTION */}

        {activeSection === "preferences" && (
          <section className="main-card">
            <div className="section-heading">
              <div>
                <span className="section-label">
                  TEACHER PREFERENCES
                </span>

                <h2>
                  Portal Preferences
                </h2>

                <p>
                  Customize how your Teacher Portal
                  behaves on this device.
                </p>
              </div>
            </div>

            <div className="preference-list">
              <div className="preference-item">
                <div className="preference-icon blue">
                  🔔
                </div>

                <div className="preference-text">
                  <strong>
                    Teacher Notifications
                  </strong>

                  <span>
                    Keep teacher-side notification
                    preferences enabled.
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    notificationsEnabled
                      ? "switch switch-on"
                      : "switch"
                  }
                  onClick={
                    toggleNotifications
                  }
                  aria-label="Toggle notifications"
                >
                  <span />
                </button>
              </div>

              <div className="preference-item">
                <div className="preference-icon purple">
                  ⚡
                </div>

                <div className="preference-text">
                  <strong>
                    Compact Portal Layout
                  </strong>

                  <span>
                    Remember your compact-layout
                    preference on this device.
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    compactMode
                      ? "switch switch-on"
                      : "switch"
                  }
                  onClick={
                    toggleCompactMode
                  }
                  aria-label="Toggle compact mode"
                >
                  <span />
                </button>
              </div>

              <div className="preference-item">
                <div className="preference-icon green">
                  🔒
                </div>

                <div className="preference-text">
                  <strong>
                    Local Profile Storage
                  </strong>

                  <span>
                    Username and profile picture
                    are stored on this device.
                  </span>
                </div>

                <span className="enabled-badge">
                  ACTIVE
                </span>
              </div>

              <div className="preference-item">
                <div className="preference-icon orange">
                  🌐
                </div>

                <div className="preference-text">
                  <strong>
                    Teacher Portal
                  </strong>

                  <span>
                    RACER ACADEMY Teacher Control
                    Centre
                  </span>
                </div>

                <button
                  type="button"
                  className="open-small-button"
                  onClick={() =>
                    router.push(
                      "/teacher"
                    )
                  }
                >
                  Open
                </button>
              </div>
            </div>

            <div className="preference-note">
              <strong>
                ⚙️ Preferences are device-specific
              </strong>

              <p>
                These options are saved locally on
                this browser/device and do not change
                your teacher authentication password.
              </p>
            </div>
          </section>
        )}

        {/* BOTTOM ACTIONS */}

        <section className="bottom-actions">
          <button
            type="button"
            onClick={() =>
              router.push("/teacher")
            }
          >
            ← Teacher Control Centre
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveSection("security")
            }
          >
            🔐 Security Settings
          </button>

          <button
            type="button"
            onClick={() => {
              router.push("/teacher");
            }}
          >
            ↗ Exit Profile
          </button>
        </section>

        {/* FOOTER */}

        <footer>
          <span>
            RACER ACADEMY
          </span>

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
          color: #172033;

          background:
            radial-gradient(
              circle at 8% 8%,
              rgba(59, 130, 246, 0.13),
              transparent 27%
            ),
            radial-gradient(
              circle at 92% 18%,
              rgba(99, 102, 241, 0.10),
              transparent 25%
            ),
            radial-gradient(
              circle at 85% 90%,
              rgba(14, 165, 233, 0.08),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #f8fbff 0%,
              #f1f5f9 45%,
              #eef4ff 100%
            );

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          padding-bottom: 25px;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;

          background-image:
            linear-gradient(
              rgba(71, 85, 105, 0.045) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(71, 85, 105, 0.045) 1px,
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
          opacity: 0.10;
          pointer-events: none;
        }

        .ambient-one {
          background: #60a5fa;
          left: -150px;
          top: 20%;
        }

        .ambient-two {
          background: #818cf8;
          right: -150px;
          bottom: 10%;
        }

        .profile-shell {
          width: min(
            calc(100% - 36px),
            1120px
          );
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .topbar {
          min-height: 88px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid
            rgba(71, 85, 105, 0.10);
        }

        .back-button {
          border: 1px solid
            rgba(100, 116, 139, 0.20);

          background:
            rgba(255, 255, 255, 0.70);

          color: #475569;
          padding: 10px 15px;
          border-radius: 11px;
          cursor: pointer;
          transition: 0.25s ease;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }

        .back-button:hover {
          border-color:
            rgba(59, 130, 246, 0.35);

          color: #2563eb;
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
          color: #94a3b8;
        }

        .top-title strong {
          color: #334155;
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
            0 0 10px
            rgba(34, 197, 94, 0.45);
        }

        .profile-hero {
          position: relative;
          overflow: hidden;

          margin-top: 28px;
          padding: 30px;

          border-radius: 25px;

          border: 1px solid
            rgba(59, 130, 246, 0.18);

          background:
            linear-gradient(
              135deg,
              #173f73 0%,
              #2563eb 55%,
              #4f46e5 100%
            );

          box-shadow:
            0 20px 55px
              rgba(37, 99, 235, 0.16),
            inset 0 1px
              rgba(255, 255, 255, 0.08);

          display: flex;
          align-items: center;
          gap: 22px;
        }

        .hero-glow {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          right: -120px;
          top: -130px;
          background: #93c5fd;
          filter: blur(95px);
          opacity: 0.16;
          pointer-events: none;
        }

        .hero-avatar {
          position: relative;
          width: 100px;
          height: 100px;
          min-width: 100px;
          border-radius: 50%;
          overflow: hidden;

          display: grid;
          place-items: center;

          background:
            linear-gradient(
              145deg,
              #dbeafe,
              #eef2ff
            );

          border: 2px solid
            rgba(255, 255, 255, 0.55);

          box-shadow:
            0 0 35px
              rgba(15, 23, 42, 0.15);
        }

        .hero-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-avatar span {
          font-size: 34px;
          font-weight: 900;
          color: #315aa8;
        }

        .online-indicator {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          right: 7px;
          bottom: 7px;
          background: #22c55e;
          border: 3px solid #2563eb;
          box-shadow:
            0 0 10px
              rgba(34, 197, 94, 0.45);
        }

        .hero-info {
          position: relative;
          min-width: 0;
          flex: 1;
        }

        .hero-kicker {
          color: #bfdbfe;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.7px;
        }

        .hero-info h1 {
          margin: 5px 0;
          color: white;
          font-size: 30px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .hero-info > p {
          margin: 6px 0 0;
          color: #dbeafe;
          font-size: 12px;
          line-height: 1.6;
          max-width: 650px;
        }

        .hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .hero-meta span {
          display: flex;
          flex-direction: column;
          gap: 3px;

          padding: 8px 11px;
          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.10);

          border: 1px solid
            rgba(255, 255, 255, 0.14);

          color: white;
          font-size: 10px;
          backdrop-filter: blur(8px);
        }

        .hero-meta b {
          color: #bfdbfe;
          font-size: 7px;
          letter-spacing: 1px;
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hero-actions button {
          border: 1px solid
            rgba(255, 255, 255, 0.16);

          background:
            rgba(255, 255, 255, 0.09);

          color: #eff6ff;

          border-radius: 10px;
          padding: 10px 13px;

          cursor: pointer;
          font-size: 10px;
          font-weight: 800;

          transition: 0.2s ease;
        }

        .hero-actions button:hover {
          color: white;
          border-color:
            rgba(255, 255, 255, 0.30);
        }

        .section-nav {
          margin-top: 18px;

          display: grid;
          grid-template-columns:
            repeat(3, 1fr);

          gap: 9px;
        }

        .nav-item {
          min-width: 0;

          border: 1px solid
            rgba(148, 163, 184, 0.18);

          border-radius: 14px;

          background:
            rgba(255, 255, 255, 0.80);

          color: #64748b;

          padding: 13px;

          display: flex;
          align-items: center;
          gap: 10px;

          text-align: left;
          cursor: pointer;

          transition: 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .nav-item:hover {
          border-color:
            rgba(59, 130, 246, 0.28);
          color: #334155;
        }

        .nav-item > span {
          width: 38px;
          height: 38px;
          min-width: 38px;

          display: grid;
          place-items: center;

          border-radius: 11px;

          background:
            #eef4ff;

          font-size: 18px;
        }

        .nav-item strong {
          display: block;
          color: #334155;
          font-size: 11px;
        }

        .nav-item small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 8px;
          line-height: 1.4;
        }

        .nav-active {
          border-color:
            rgba(59, 130, 246, 0.30);

          background:
            linear-gradient(
              135deg,
              rgba(239, 246, 255, 0.98),
              rgba(245, 243, 255, 0.98)
            );
        }

        .nav-active > span {
          background:
            #e0ebff;
        }

        .main-card {
          margin-top: 18px;
          padding: 28px;

          border-radius: 22px;

          border: 1px solid
            rgba(148, 163, 184, 0.18);

          background:
            rgba(255, 255, 255, 0.88);

          box-shadow:
            0 18px 50px
              rgba(15, 23, 42, 0.08);

          backdrop-filter: blur(14px);
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .section-label {
          color: #2563eb;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .section-heading h2 {
          margin: 5px 0 0;
          color: #172033;
          font-size: 24px;
        }

        .section-heading p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .saved-pill {
          padding: 7px 10px;
          border-radius: 999px;
          color: #15803d;
          background:
            #f0fdf4;
          border:
            1px solid #bbf7d0;
          font-size: 8px;
          font-weight: 900;
        }

        .security-status {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .security-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 9px
              rgba(34, 197, 94, 0.45);
        }

        .profile-layout {
          margin-top: 25px;

          display: grid;
          grid-template-columns:
            0.85fr 1.15fr;

          gap: 15px;
        }

        .image-panel,
        .details-panel {
          border: 1px solid
            rgba(148, 163, 184, 0.16);

          border-radius: 17px;

          background:
            rgba(248, 250, 252, 0.78);

          padding: 20px;
        }

        .panel-label {
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }

        .large-avatar {
          width: 150px;
          height: 150px;
          margin: 0 auto;

          border-radius: 50%;
          overflow: hidden;

          display: grid;
          place-items: center;

          background:
            linear-gradient(
              145deg,
              #dbeafe,
              #ede9fe
            );

          border: 2px solid
            #bfdbfe;

          box-shadow:
            0 12px 30px
              rgba(37, 99, 235, 0.10);
        }

        .large-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .large-avatar span {
          font-size: 58px;
          font-weight: 900;
          color: #315aa8;
        }

        .image-panel h3 {
          margin: 15px 0 5px;
          color: #172033;
          font-size: 18px;
          text-align: center;
          overflow-wrap: anywhere;
        }

        .image-panel > p {
          margin: 0 auto;
          max-width: 300px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
          text-align: center;
        }

        .image-actions {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .primary-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          padding: 12px;

          border-radius: 10px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );

          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .primary-button input {
          display: none;
        }

        .secondary-danger-button {
          border: 1px solid
            #fecaca;

          background:
            #fff5f5;

          color: #b91c1c;

          padding: 11px;
          border-radius: 10px;

          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .requirement-box {
          margin-top: 14px;

          display: flex;
          gap: 9px;

          padding: 11px;

          border-radius: 11px;

          background:
            #f0f9ff;

          border: 1px solid
            #dbeafe;
        }

        .requirement-box > span {
          width: 21px;
          height: 21px;

          min-width: 21px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background:
            #e0f2fe;

          color: #0369a1;

          font-size: 10px;
        }

        .requirement-box strong {
          color: #334155;
          font-size: 9px;
        }

        .requirement-box p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 8px;
        }

        /* USERNAME EDITOR */

        .username-editor {
          padding: 14px;
          margin-bottom: 12px;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #f5f3ff
            );

          border: 1px solid
            #dbeafe;
        }

        .username-editor label {
          display: block;
          margin-bottom: 7px;

          color: #475569;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .username-input-row {
          display: flex;
          gap: 8px;
        }

        .username-input-row input {
          flex: 1;
          min-width: 0;

          height: 42px;
          border-radius: 10px;

          border: 1px solid #cbd5e1;
          outline: none;

          padding: 0 12px;

          background: #ffffff;
          color: #172033;

          font-size: 11px;
          font-weight: 700;
        }

        .username-input-row input:focus {
          border-color: #93c5fd;

          box-shadow:
            0 0 0 3px
              rgba(59, 130, 246, 0.08);
        }

        .username-input-row button {
          border: 0;

          height: 42px;
          min-width: 82px;

          padding: 0 14px;

          border-radius: 10px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );

          cursor: pointer;

          font-size: 10px;
          font-weight: 900;
        }

        .username-editor > p {
          margin: 7px 0 0;

          color: #64748b;
          font-size: 8px;
          line-height: 1.5;
        }

        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-row {
          min-width: 0;

          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;

          padding: 12px;

          border-radius: 11px;

          background:
            rgba(255, 255, 255, 0.86);

          border: 1px solid
            rgba(148, 163, 184, 0.14);
        }

        .detail-row > span {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #64748b;
          font-size: 9px;
          font-weight: 800;
        }

        .detail-row i {
          font-style: normal;
        }

        .detail-row strong {
          color: #334155;
          font-size: 10px;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .active-text {
          color: #15803d !important;
        }

        .info-notice {
          margin-top: 12px;

          display: flex;
          gap: 10px;

          padding: 13px;

          border-radius: 12px;

          background:
            #f0fdf4;

          border: 1px solid
            #dcfce7;
        }

        .notice-icon {
          width: 24px;
          height: 24px;
          min-width: 24px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color: #15803d;
          background:
            #dcfce7;

          font-size: 10px;
          font-weight: 900;
        }

        .info-notice strong {
          color: #334155;
          font-size: 10px;
        }

        .info-notice p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 8px;
          line-height: 1.6;
        }

        .quick-section {
          margin-top: 20px;
          padding-top: 20px;

          border-top: 1px solid
            rgba(148, 163, 184, 0.14);
        }

        .quick-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 8px;
        }

        .quick-grid button {
          min-width: 0;

          display: flex;
          align-items: center;
          gap: 9px;

          text-align: left;

          padding: 12px;

          border-radius: 12px;

          border: 1px solid
            rgba(148, 163, 184, 0.14);

          background:
            rgba(255, 255, 255, 0.78);

          color: #334155;

          cursor: pointer;
          transition: 0.2s ease;
        }

        .quick-grid button:hover {
          transform: translateY(-2px);

          border-color:
            rgba(59, 130, 246, 0.28);

          background:
            #ffffff;
        }

        .quick-grid button > span {
          width: 32px;
          height: 32px;
          min-width: 32px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background:
            #eef4ff;
        }

        .quick-grid button div {
          min-width: 0;
          flex: 1;
        }

        .quick-grid button strong {
          display: block;
          font-size: 9px;
        }

        .quick-grid button small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 7px;
          line-height: 1.3;
        }

        .quick-grid button b {
          color: #2563eb;
          font-size: 13px;
        }

        .password-form {
          margin-top: 22px;
        }

        .security-warning {
          display: flex;
          gap: 11px;

          padding: 14px;

          border-radius: 13px;

          background:
            #fffbeb;

          border: 1px solid
            #fde68a;
        }

        .security-warning > div:first-child {
          font-size: 21px;
        }

        .security-warning strong {
          color: #92400e;
          font-size: 10px;
        }

        .security-warning p {
          margin: 4px 0 0;
          color: #78716c;
          font-size: 9px;
          line-height: 1.6;
        }

        .password-grid {
          margin-top: 18px;

          display: grid;
          grid-template-columns:
            repeat(2, 1fr);

          gap: 13px;
        }

        .input-group label {
          display: block;
          margin-bottom: 6px;

          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .password-input {
          display: flex;
          align-items: center;

          overflow: hidden;

          border-radius: 11px;

          border: 1px solid
            #d5dde8;

          background:
            #ffffff;
        }

        .password-input:focus-within {
          border-color:
            #93c5fd;

          box-shadow:
            0 0 0 3px
            rgba(59, 130, 246, 0.08);
        }

        .password-input input {
          flex: 1;
          min-width: 0;

          border: 0;
          outline: 0;

          background: transparent;

          color: #172033;

          padding: 12px;

          font-size: 11px;
        }

        .password-input input::placeholder {
          color: #94a3b8;
        }

        .password-input button {
          width: 40px;
          height: 40px;

          border: 0;
          background: transparent;

          color: #64748b;

          cursor: pointer;
        }

        .password-rules {
          margin-top: 14px;

          display: flex;
          flex-wrap: wrap;

          gap: 8px;
        }

        .password-rules div {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 7px 9px;

          border-radius: 8px;

          background:
            #f8fafc;

          border: 1px solid
            #e2e8f0;

          color: #64748b;

          font-size: 8px;
          font-weight: 700;
        }

        .password-rules span {
          color: #22c55e;
          font-weight: 900;
        }

        .form-message {
          margin-top: 13px;

          padding: 11px 13px;

          border-radius: 10px;

          font-size: 9px;
          line-height: 1.5;
        }

        .form-error {
          color: #b91c1c;

          background:
            #fff5f5;

          border: 1px solid
            #fecaca;
        }

        .form-success {
          color: #15803d;

          background:
            #f0fdf4;

          border: 1px solid
            #bbf7d0;
        }

        .form-actions {
          margin-top: 15px;

          display: flex;
          justify-content: flex-end;

          gap: 8px;
        }

        .cancel-button,
        .change-password-button {
          border-radius: 10px;
          padding: 11px 14px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        .cancel-button {
          border: 1px solid
            #d7dee8;

          color: #475569;

          background:
            #ffffff;
        }

        .change-password-button {
          border: 0;

          color: white;

          background:
            linear-gradient(
              135deg,
              #6366f1,
              #2563eb
            );
        }

        .change-password-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .security-cards {
          margin-top: 20px;

          display: grid;
          grid-template-columns:
            repeat(3, 1fr);

          gap: 9px;
        }

        .security-cards > div {
          display: flex;
          gap: 9px;

          padding: 12px;

          border-radius: 12px;

          background:
            rgba(248, 250, 252, 0.82);

          border: 1px solid
            rgba(148, 163, 184, 0.12);
        }

        .security-cards > div > span {
          font-size: 18px;
        }

        .security-cards strong {
          display: block;
          color: #334155;
          font-size: 9px;
        }

        .security-cards p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 8px;
          line-height: 1.5;
        }

        .preference-list {
          margin-top: 22px;

          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .preference-item {
          display: flex;
          align-items: center;
          gap: 12px;

          padding: 14px;

          border-radius: 13px;

          background:
            rgba(248, 250, 252, 0.82);

          border: 1px solid
            rgba(148, 163, 184, 0.13);
        }

        .preference-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;

          display: grid;
          place-items: center;

          border-radius: 11px;

          font-size: 18px;
        }

        .blue {
          background:
            #eff6ff;
        }

        .purple {
          background:
            #f5f3ff;
        }

        .green {
          background:
            #f0fdf4;
        }

        .orange {
          background:
            #fff7ed;
        }

        .preference-text {
          flex: 1;
          min-width: 0;
        }

        .preference-text strong {
          display: block;
          color: #334155;
          font-size: 10px;
        }

        .preference-text span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 8px;
          line-height: 1.4;
        }

        .switch {
          width: 46px;
          height: 25px;

          padding: 3px;

          border: 0;
          border-radius: 999px;

          background: #cbd5e1;

          cursor: pointer;

          transition: 0.2s ease;
        }

        .switch span {
          display: block;

          width: 19px;
          height: 19px;

          border-radius: 50%;

          background: #ffffff;

          transition: 0.2s ease;
          box-shadow: 0 1px 4px
            rgba(15, 23, 42, 0.18);
        }

        .switch-on {
          background: #4f46e5;
        }

        .switch-on span {
          transform: translateX(21px);
          background: white;
        }

        .enabled-badge {
          color: #15803d !important;
          background:
            #f0fdf4;
          border:
            1px solid #bbf7d0;

          padding: 6px 8px;

          border-radius: 999px;

          font-size: 7px !important;
          font-weight: 900;
        }

        .open-small-button {
          border: 1px solid
            #c7d2fe;

          background:
            #eef2ff;

          color: #4f46e5;

          padding: 7px 10px;

          border-radius: 8px;

          cursor: pointer;

          font-size: 8px;
          font-weight: 800;
        }

        .preference-note {
          margin-top: 15px;

          padding: 13px;

          border-radius: 12px;

          background:
            #f0f9ff;

          border: 1px solid
            #dbeafe;
        }

        .preference-note strong {
          color: #0369a1;
          font-size: 9px;
        }

        .preference-note p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 8px;
          line-height: 1.5;
        }

        .bottom-actions {
          margin-top: 18px;

          display: grid;
          grid-template-columns:
            repeat(3, 1fr);

          gap: 9px;
        }

        .bottom-actions button {
          padding: 12px;

          border-radius: 11px;

          border: 1px solid
            rgba(148, 163, 184, 0.16);

          background:
            rgba(255, 255, 255, 0.78);

          color: #64748b;

          cursor: pointer;

          font-size: 9px;
          font-weight: 800;
        }

        .bottom-actions button:hover {
          color: #334155;

          border-color:
            rgba(59, 130, 246, 0.25);
        }

        footer {
          min-height: 75px;

          border-top: 1px solid
            rgba(148, 163, 184, 0.14);

          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-top: 18px;

          color: #94a3b8;
          font-size: 9px;
          letter-spacing: 0.7px;
        }

        footer span:first-child {
          color: #64748b;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .profile-hero {
            flex-wrap: wrap;
          }

          .hero-actions {
            flex-direction: row;
            width: 100%;
          }

          .hero-actions button {
            flex: 1;
          }

          .profile-layout {
            grid-template-columns: 1fr;
          }

          .quick-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .security-cards {
            grid-template-columns:
              1fr;
          }
        }

        @media (max-width: 700px) {
          .profile-shell {
            width: min(
              calc(100% - 24px),
              650px
            );
          }

          .topbar {
            min-height: 74px;
          }

          .top-title {
            display: none;
          }

          .profile-hero {
            padding: 20px;
          }

          .hero-avatar {
            width: 78px;
            height: 78px;
            min-width: 78px;
          }

          .hero-info h1 {
            font-size: 23px;
          }

          .section-nav {
            grid-template-columns: 1fr;
          }

          .main-card {
            padding: 18px;
          }

          .section-heading h2 {
            font-size: 21px;
          }

          .password-grid {
            grid-template-columns: 1fr;
          }

          .quick-grid {
            grid-template-columns: 1fr;
          }

          .bottom-actions {
            grid-template-columns: 1fr;
          }

          footer {
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            padding: 20px 0;
            text-align: center;
          }

          .username-input-row {
            flex-direction: column;
          }

          .username-input-row button {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .profile-shell {
            width: min(
              calc(100% - 14px),
              500px
            );
          }

          .profile-hero {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .hero-avatar {
            margin: 0 auto;
          }

          .hero-meta {
            justify-content: center;
          }

          .hero-actions {
            flex-direction: column;
          }

          .profile-layout {
            gap: 10px;
          }

          .image-panel,
          .details-panel {
            padding: 15px;
          }

          .large-avatar {
            width: 120px;
            height: 120px;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .detail-row strong {
            text-align: left;
          }

          .preference-item {
            align-items: flex-start;
          }

          .switch {
            flex-shrink: 0;
          }

          .section-heading {
            flex-direction: column;
          }

          .security-status {
            align-self: flex-start;
          }

          .form-actions {
            flex-direction: column;
          }

          .cancel-button,
          .change-password-button {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .main-card {
            padding: 14px;
          }

          .profile-hero {
            padding: 15px;
          }

          .top-status {
            font-size: 7px;
          }

          .hero-info h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}