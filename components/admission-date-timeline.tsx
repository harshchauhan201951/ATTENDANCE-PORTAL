type AdmissionHistoryEntry = {
  date: string;
  type?: string;
};

type AdmissionDateTimelineProps = {
  currentDate: string | null;
  history?: AdmissionHistoryEntry[] | null;
  isActive: boolean;
};

export function AdmissionDateTimeline({ currentDate, history, isActive }: AdmissionDateTimelineProps) {
  const historicalDates = (Array.isArray(history) ? history : [])
    .filter((entry) => entry && typeof entry.date === "string" && entry.date.trim())
    .map((entry) => ({ date: entry.date.slice(0, 10), type: entry.type || "Admission" }));
  const current = currentDate?.slice(0, 10) || "";

  // History can contain entries added after the current date was edited or
  // restored. The student's actual admission_date is authoritative: show its
  // entry last and reserve ACTIVE/INACTIVE for that date only.
  const currentEntry = current
    ? historicalDates.find((entry) => entry.date === current)
    : undefined;
  const dates = historicalDates
    .filter((entry) => entry.date !== current)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (current) {
    dates.push(currentEntry || {
      date: current,
      type: dates.length ? "Re-admission" : "First admission",
    });
  }

  if (dates.length === 0) return <span className="admission-timeline-empty">Not set</span>;

  return (
    <ol className="admission-timeline" aria-label="All admission dates">
      {dates.map((entry, index) => {
        const activeAdmission = index === dates.length - 1;
        const status = activeAdmission ? (isActive ? "ACTIVE" : "DEACTIVATED") : "DONE";
        return (
          <li className={activeAdmission ? "is-current" : "is-done"} key={`${entry.date}-${entry.type}-${index}`}>
            <span className="admission-timeline-marker" aria-hidden="true">{activeAdmission ? "●" : "✓"}</span>
            <span className="admission-timeline-copy">
              <strong>{entry.date}</strong>
              <small>{entry.type === "Initial admission" ? "First admission" : entry.type}</small>
            </span>
            <span className="admission-timeline-status">{status}</span>
          </li>
        );
      })}
    </ol>
  );
}
