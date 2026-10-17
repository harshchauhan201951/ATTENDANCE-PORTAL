"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cleanTeacherModuleHeader } from "./teacherHeaderClean";

// Page load / data aane ke baad bhi chalta rehta hai (pages async render hote hain).
export default function TeacherModuleHeaderCleaner() {
  const pathname = usePathname();

  useEffect(() => {
    // The layout content node is reused while routes change. Never clean the
    // dashboard's own header when a queued MutationObserver callback races
    // with navigation away from a module.
    if (pathname === "/teacher" || pathname === "/teacher/dashboard" || !pathname.startsWith("/teacher/")) {
      return;
    }

    const root = document.querySelector<HTMLElement>(".racer-shared-teacher-module-content");
    if (!root) return;

    let active = true;
    let frame = 0;
    const canClean = () =>
      active &&
      root.isConnected &&
      root.classList.contains("racer-shared-teacher-module-content");

    const run = () => {
      if (!canClean()) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (canClean()) cleanTeacherModuleHeader(root);
      });
    };

    run();
    const observer = new MutationObserver(run); // sirf childList: apne attribute changes se loop nahi banta
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame);

      // Remove attributes left on the old module DOM. The content wrapper can
      // be reused for the dashboard before the next route's effect runs.
      root.querySelectorAll("[data-rtd-hide]").forEach((element) => {
        element.removeAttribute("data-rtd-hide");
      });
      root.querySelectorAll("header[data-rtd-slim]").forEach((header) => {
        header.removeAttribute("data-rtd-slim");
      });
    };
  }, [pathname]);

  return null;
}
