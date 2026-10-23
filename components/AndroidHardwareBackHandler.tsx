"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Keep Android hardware Back inside the signed-in portal instead of exiting the WebView. */
export default function AndroidHardwareBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void App.addListener("backButton", () => {
      const currentPath = pathnameRef.current || window.location.pathname;
      const role = currentPath.startsWith("/teacher") ? "teacher" : currentPath.startsWith("/student") ? "student" : null;
      if (!role) return;

      const openDialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (openDialog) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      const dashboardPath = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
      if (currentPath !== dashboardPath && currentPath !== `/${role}`) {
        router.replace(dashboardPath);
      }
      // On the dashboard, consume Back and leave the app open there.
    }).then((listener) => {
      if (disposed) void listener.remove();
      else removeListener = () => listener.remove();
    }).catch((error) => console.warn("Unable to register Android Back handler:", error));

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [router]);

  return null;
}
