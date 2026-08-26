"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoginType = "student" | "teacher";

const slides = [
  {
    title: "LEARN. GROW. RACE AHEAD.",
    subtitle: "Welcome to Racer Academy",
    icon: "🏁",
  },
  {
    title: "YOUR ATTENDANCE. YOUR PROGRESS.",
    subtitle: "Track your academic journey with ease.",
    icon: "📊",
  },
  {
    title: "SMART ACADEMY. SMART FUTURE.",
    subtitle: "Everything you need in one place.",
    icon: "🚀",
  },
  {
    title: "DISCIPLINE CREATES SUCCESS.",
    subtitle: "Stay consistent. Keep moving forward.",
    icon: "⚡",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [slide, setSlide] = useState(0);
  const [loginType, setLoginType] = useState<LoginType>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * Replace these routes only if your existing project
       * uses different dashboard routes.
       */

      if (loginType === "student") {
        const response = await fetch("/api/student-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        });

        if (!response.ok) {
          throw new Error("Invalid username or password.");
        }

        router.push("/students");
      } else {
        const response = await fetch("/api/teacher-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        });

        if (!response.ok) {
          throw new Error("Invalid username or password.");
        }

        router.push("/teacher");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="background-grid" />

      <div className="floating-orb orb-one" />
      <div className="floating-orb orb-two" />
      <div className="floating-orb orb-three" />

      <section className="login-wrapper">
        {/* LEFT SIDE */}
        <div className="showcase">
          <div className="showcase-top">
            <div className="academy-mark">
              <span>RA</span>
            </div>

            <div>
              <div className="academy-name">RACER ACADEMY</div>
              <div className="academy-tag">EDUCATION • DISCIPLINE • SUCCESS</div>
            </div>
          </div>

          <div className="hero-content">
            <div className="slide-number">
              0{slide + 1} / 0{slides.length}
            </div>

            <div className="hero-icon" key={slide}>
              {slides[slide].icon}
            </div>

            <h1 key={`title-${slide}`}>{slides[slide].title}</h1>

            <p key={`subtitle-${slide}`}>{slides[slide].subtitle}</p>

            <div className="race-line">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="slider-controls">
            <button
              className="arrow-btn"
              onClick={() =>
                setSlide((prev) => (prev - 1 + slides.length) % slides.length)
              }
              aria-label="Previous slide"
            >
              ←
            </button>

            <div className="dots">
              {slides.map((_, index) => (
                <button
                  key={index}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`dot ${slide === index ? "active" : ""}`}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>

            <button
              className="arrow-btn"
              onClick={() => setSlide((prev) => (prev + 1) % slides.length)}
              aria-label="Next slide"
            >
              →
            </button>
          </div>

          <div className="showcase-footer">
            <span>RACER ACADEMY</span>
            <span>•</span>
            <span>2026</span>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-panel">
          <div className="mobile-logo">
            <div className="academy-mark small">
              <span>RA</span>
            </div>
            <div>
              <strong>RACER ACADEMY</strong>
              <small>SMART LEARNING PORTAL</small>
            </div>
          </div>

          <div className="login-heading">
            <span className="welcome">WELCOME BACK</span>
            <h2>Sign in to continue</h2>
            <p>Access your academy dashboard</p>
          </div>

          {/* LOGIN TYPE */}
          <div className="login-switch">
            <button
              type="button"
              className={loginType === "student" ? "selected" : ""}
              onClick={() => {
                setLoginType("student");
                setError("");
              }}
            >
              <span className="switch-icon">🎓</span>
              <span>
                <strong>Student</strong>
                <small>Student Portal</small>
              </span>
            </button>

            <button
              type="button"
              className={loginType === "teacher" ? "selected" : ""}
              onClick={() => {
                setLoginType("teacher");
                setError("");
              }}
            >
              <span className="switch-icon">👨‍🏫</span>
              <span>
                <strong>Teacher</strong>
                <small>Teacher Portal</small>
              </span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>USERNAME</label>

              <div className="input-wrapper">
                <span className="input-icon">👤</span>

                <input
                  type="text"
                  placeholder={
                    loginType === "student"
                      ? "Enter your username"
                      : "Enter teacher username"
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label>PASSWORD</label>

              <div className="input-wrapper">
                <span className="input-icon">🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span>!</span>
                {error}
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              <span>
                {loading ? "SIGNING IN..." : "SIGN IN"}
              </span>

              {!loading && <strong>→</strong>}
            </button>
          </form>

          <div className="security-note">
            <span>🔐</span>
            <div>
              <strong>Secure Login</strong>
              <small>Your account information is protected.</small>
            </div>
          </div>

          <div className="login-footer">
            <span>© 2026 Racer Academy</span>
            <span>•</span>
            <span>All Rights Reserved</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          background:
            radial-gradient(
              circle at 10% 20%,
              rgba(37, 99, 235, 0.2),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 80%,
              rgba(124, 58, 237, 0.18),
              transparent 30%
            ),
            #050816;
          color: white;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .background-grid {
          position: absolute;
          inset: 0;
          opacity: 0.18;
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.06) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.06) 1px,
              transparent 1px
            );
          background-size: 45px 45px;
          mask-image: linear-gradient(to bottom, black, transparent);
        }

        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
          animation: float 8s ease-in-out infinite;
          pointer-events: none;
        }

        .orb-one {
          width: 280px;
          height: 280px;
          background: rgba(37, 99, 235, 0.08);
          top: -100px;
          left: -80px;
        }

        .orb-two {
          width: 220px;
          height: 220px;
          background: rgba(168, 85, 247, 0.08);
          right: 5%;
          top: 10%;
          animation-delay: 2s;
        }

        .orb-three {
          width: 180px;
          height: 180px;
          background: rgba(14, 165, 233, 0.08);
          bottom: -70px;
          left: 30%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }

          50% {
            transform: translateY(-25px) translateX(15px);
          }
        }

        .login-wrapper {
          position: relative;
          z-index: 2;
          width: min(1180px, 100%);
          min-height: 690px;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          background: rgba(10, 15, 32, 0.82);
          box-shadow:
            0 40px 100px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(25px);
        }

        /* SHOWCASE */

        .showcase {
          position: relative;
          min-height: 690px;
          padding: 42px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              rgba(37, 99, 235, 0.2),
              rgba(15, 23, 42, 0.3)
            ),
            radial-gradient(
              circle at 70% 45%,
              rgba(59, 130, 246, 0.22),
              transparent 35%
            );
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .showcase::before {
          content: "";
          position: absolute;
          width: 500px;
          height: 500px;
          right: -250px;
          bottom: -200px;
          border: 1px solid rgba(96, 165, 250, 0.16);
          border-radius: 50%;
          box-shadow:
            0 0 0 60px rgba(96, 165, 250, 0.03),
            0 0 0 120px rgba(96, 165, 250, 0.02);
        }

        .showcase::after {
          content: "";
          position: absolute;
          left: -20%;
          bottom: 100px;
          width: 140%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(96, 165, 250, 0.3),
            transparent
          );
          transform: rotate(-15deg);
        }

        .showcase-top {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .academy-mark {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          box-shadow:
            0 10px 30px rgba(37, 99, 235, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transform: rotate(-3deg);
        }

        .academy-mark span {
          font-weight: 950;
          font-size: 18px;
          letter-spacing: -1px;
          transform: rotate(3deg);
        }

        .academy-name {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .academy-tag {
          margin-top: 4px;
          font-size: 9px;
          letter-spacing: 2px;
          color: #93c5fd;
          font-weight: 700;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 560px;
        }

        .slide-number {
          margin-bottom: 18px;
          color: #60a5fa;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 4px;
        }

        .hero-icon {
          font-size: 68px;
          margin-bottom: 18px;
          animation: iconIn 0.6s ease;
          filter: drop-shadow(0 15px 25px rgba(59, 130, 246, 0.2));
        }

        @keyframes iconIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hero-content h1 {
          margin: 0;
          max-width: 600px;
          font-size: clamp(38px, 4vw, 62px);
          line-height: 0.98;
          letter-spacing: -3px;
          font-weight: 950;
          animation: textIn 0.65s ease;
        }

        .hero-content p {
          margin: 24px 0 0;
          color: #94a3b8;
          font-size: 17px;
          line-height: 1.6;
          animation: textIn 0.8s ease;
        }

        @keyframes textIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .race-line {
          display: flex;
          gap: 6px;
          margin-top: 30px;
        }

        .race-line span {
          height: 3px;
          border-radius: 99px;
          background: #3b82f6;
        }

        .race-line span:nth-child(1) {
          width: 55px;
        }

        .race-line span:nth-child(2) {
          width: 20px;
          opacity: 0.5;
        }

        .race-line span:nth-child(3) {
          width: 8px;
          opacity: 0.25;
        }

        .slider-controls {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .arrow-btn {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          color: white;
          cursor: pointer;
          transition: 0.25s;
          font-size: 18px;
        }

        .arrow-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(96, 165, 250, 0.4);
          transform: scale(1.08);
        }

        .dots {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .dot {
          width: 7px;
          height: 7px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: #475569;
          cursor: pointer;
          transition: 0.3s;
        }

        .dot.active {
          width: 27px;
          border-radius: 20px;
          background: #60a5fa;
        }

        .showcase-footer {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 10px;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        /* LOGIN PANEL */

        .login-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 55px 58px;
          background: rgba(5, 8, 22, 0.55);
        }

        .mobile-logo {
          display: none;
        }

        .login-heading {
          margin-bottom: 28px;
        }

        .welcome {
          color: #60a5fa;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .login-heading h2 {
          margin: 8px 0 7px;
          font-size: 34px;
          letter-spacing: -1.5px;
          font-weight: 900;
        }

        .login-heading p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .login-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 25px;
        }

        .login-switch button {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.025);
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .login-switch button:hover {
          border-color: rgba(96, 165, 250, 0.3);
          background: rgba(59, 130, 246, 0.06);
        }

        .login-switch button.selected {
          border-color: rgba(96, 165, 250, 0.55);
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.16),
            rgba(124, 58, 237, 0.08)
          );
          box-shadow: inset 0 0 25px rgba(37, 99, 235, 0.05);
        }

        .switch-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 18px;
        }

        .login-switch strong,
        .login-switch small {
          display: block;
        }

        .login-switch strong {
          font-size: 12px;
          font-weight: 800;
        }

        .login-switch small {
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .input-group label {
          display: block;
          margin-bottom: 8px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .input-wrapper {
          height: 54px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
          transition: 0.25s;
        }

        .input-wrapper:focus-within {
          border-color: rgba(96, 165, 250, 0.7);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.07);
          background: rgba(59, 130, 246, 0.035);
        }

        .input-icon {
          opacity: 0.6;
          font-size: 15px;
        }

        .input-wrapper input {
          width: 100%;
          height: 100%;
          outline: none;
          border: none;
          background: transparent;
          color: white;
          font-size: 14px;
        }

        .input-wrapper input::placeholder {
          color: #475569;
        }

        .eye-button {
          flex-shrink: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 15px;
          opacity: 0.65;
        }

        .eye-button:hover {
          opacity: 1;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 13px;
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          font-size: 12px;
        }

        .error-message span {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          font-weight: 900;
        }

        .login-button {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(100deg, #2563eb, #4f46e5);
          color: white;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          cursor: pointer;
          box-shadow: 0 15px 30px rgba(37, 99, 235, 0.2);
          transition: 0.25s;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 38px rgba(37, 99, 235, 0.3);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-button strong {
          font-size: 20px;
          font-weight: 400;
        }

        .security-note {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 25px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
        }

        .security-note > span {
          font-size: 16px;
        }

        .security-note strong,
        .security-note small {
          display: block;
        }

        .security-note strong {
          font-size: 10px;
          color: #cbd5e1;
        }

        .security-note small {
          margin-top: 2px;
          color: #475569;
          font-size: 9px;
        }

        .login-footer {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 27px;
          color: #334155;
          font-size: 9px;
        }

        @media (max-width: 900px) {
          .login-page {
            padding: 15px;
          }

          .login-wrapper {
            grid-template-columns: 1fr;
            min-height: auto;
            max-width: 520px;
          }

          .showcase {
            display: none;
          }

          .login-panel {
            min-height: 680px;
            padding: 38px 28px;
          }

          .mobile-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 55px;
          }

          .mobile-logo strong,
          .mobile-logo small {
            display: block;
          }

          .mobile-logo strong {
            font-size: 15px;
            letter-spacing: 2px;
          }

          .mobile-logo small {
            margin-top: 3px;
            color: #60a5fa;
            font-size: 8px;
            letter-spacing: 1px;
          }

          .academy-mark.small {
            width: 45px;
            height: 45px;
            border-radius: 13px;
          }
        }

        @media (max-width: 430px) {
          .login-page {
            padding: 0;
          }

          .login-wrapper {
            width: 100%;
            min-height: 100vh;
            border: none;
            border-radius: 0;
          }

          .login-panel {
            min-height: 100vh;
            padding: 28px 20px;
          }

          .mobile-logo {
            margin-bottom: 45px;
          }

          .login-heading h2 {
            font-size: 29px;
          }

          .login-switch {
            gap: 7px;
          }

          .login-switch button {
            min-height: 67px;
            padding: 9px;
          }

          .switch-icon {
            width: 34px;
            height: 34px;
            font-size: 15px;
          }

          .login-switch strong {
            font-size: 11px;
          }

          .login-switch small {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}