"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cleanTeacherModuleHeader } from "./teacherHeaderClean";

// Page load / data aane ke baad bhi chalta rehta hai (pages async render hote hain).
export default function TeacherModuleHeaderCleaner() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".racer-shared-teacher-module-content");
    if (!root) return;

    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => cleanTeacherModuleHeader(root));
    };

    run();
    const observer = new MutationObserver(run); // sirf childList: apne attribute changes se loop nahi banta
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
