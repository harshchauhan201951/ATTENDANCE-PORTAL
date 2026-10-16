"use client";

import { useRouter } from "next/navigation";

type RacerPageActionsProps = {
  dashboardPath: string;
};

export default function RacerPageActions({
  dashboardPath,
}: RacerPageActionsProps) {
  const router = useRouter();

  const handleBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      router.back();
    } else {
      router.push(dashboardPath);
    }
  };

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="racer-page-actions" aria-label="Page controls">
      <div className="racer-page-actions-inner">
        <button
          type="button"
          onClick={handleBack}
          className="racer-page-action-back"
        >
          ‹ <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="racer-page-action-refresh"
          aria-label="Refresh this dashboard"
        >
          ↻ <span>Refresh</span>
        </button>

        <button
          type="button"
          onClick={() => router.push(dashboardPath)}
          className="racer-page-action-dashboard"
        >
          ⌂ <span>Dashboard</span>
        </button>
      </div>
    </div>
  );
}

