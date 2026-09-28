"use client";

import { useEffect } from "react";

export default function TeacherUIBootstrap() {
  useEffect(() => {
    const isTeacher = window.location.pathname === "/teacher" || window.location.pathname.startsWith("/teacher/");
    document.body.classList.toggle("teacher-portal", isTeacher);

    return () => {
      document.body.classList.remove("teacher-portal");
    };
  }, []);

  return null;
}
