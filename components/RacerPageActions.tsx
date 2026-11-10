"use client";

import usePortalBack from "./usePortalBack";

type RacerPageActionsProps = { dashboardPath: string };

export default function RacerPageActions({ dashboardPath }: RacerPageActionsProps) {
  const { canGoBack, goBack } = usePortalBack("student");

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
          onClick={goBack}
          disabled={!canGoBack}
          title={canGoBack ? "Go back one page" : "No previous page in this session"}
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

