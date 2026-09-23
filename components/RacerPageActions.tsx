"use client";

import { useRouter } from "next/navigation";

type RacerPageActionsProps = {
  dashboardPath: string;
  logoutKeys: string[];
};

export default function RacerPageActions({
  dashboardPath,
  logoutKeys,
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

  const handleLogout = () => {
    try {
      logoutKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch {
      // ignore
    }

    router.replace("/");
  };

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:px-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-slate-50"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={() => router.push(dashboardPath)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          Dashboard
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border-bottom-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
