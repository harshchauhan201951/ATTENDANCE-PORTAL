import Link from "next/link";

const examOptions = [
  {
    href: "/student/quiz-tests",
    icon: "🧩",
    title: "Quiz Tests",
    description: "Attempt available quizzes or review your scores and history.",
    tone: "quiz",
    action: "Open quizzes",
  },
  {
    href: "/student/monthly-result",
    icon: "🏆",
    title: "Monthly Final Result",
    description: "View your monthly result, marks breakdown and official PDF.",
    tone: "monthly",
    action: "View final result",
  },
  {
    href: "/student/exams/weekly-tests",
    icon: "📊",
    title: "Saturday Weekly Tests",
    description: "Review the latest weekly test marks, subjects and report history.",
    tone: "weekly",
    action: "View weekly reports",
  },
];

export default function StudentExamsPage() {
  return (
    <main className="student-exams-page">
      <header className="student-exams-heading">
        <span>LEARNER ASSESSMENTS</span>
        <h1>Exams</h1>
        <p>Choose a test or result to continue.</p>
      </header>

      <section className="student-exams-grid" aria-label="Exam options">
        {examOptions.map((option) => (
          <Link key={option.href} href={option.href} className={`student-exams-card ${option.tone}`}>
            <span className="student-exams-icon" aria-hidden="true">{option.icon}</span>
            <span className="student-exams-card-copy">
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </span>
            <span className="student-exams-action">{option.action}<b aria-hidden="true">→</b></span>
          </Link>
        ))}
      </section>

      <Link className="student-exams-back" href="/student/dashboard">← Back to Dashboard</Link>
    </main>
  );
}
