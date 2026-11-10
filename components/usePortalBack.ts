"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type PortalScope = "teacher" | "student";

function readStack(key: string): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((path): path is string => typeof path === "string" && path.startsWith("/")) : [];
  } catch {
    return [];
  }
}

export default function usePortalBack(scope: PortalScope) {
  const pathname = usePathname();
  const router = useRouter();
  const key = `racer-${scope}-navigation-history-v1`;
  const initialized = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    if (!initialized.current) {
      try {
        sessionStorage.setItem(key, JSON.stringify([pathname]));
      } catch {
        // Navigation still works through the browser history if storage is unavailable.
      }
      initialized.current = true;
      setCanGoBack(false);
      return;
    }

    const stack = readStack(key);
    if (stack[stack.length - 1] !== pathname) stack.push(pathname);
    const trimmed = stack.slice(-40);
    try {
      sessionStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
      // Keep the current page usable when browser storage is unavailable.
    }
    setCanGoBack(trimmed.length > 1);
  }, [key, pathname]);

  const goBack = useCallback(() => {
    const stack = readStack(key);
    if (pathname && stack[stack.length - 1] !== pathname) stack.push(pathname);
    if (stack.length <= 1) return;
    stack.pop();
    const previousPath = stack[stack.length - 1];
    try {
      sessionStorage.setItem(key, JSON.stringify(stack));
    } catch {
      // Replace navigation below does not depend on storage succeeding.
    }
    setCanGoBack(stack.length > 1);
    router.replace(previousPath);
  }, [key, pathname, router]);

  return { canGoBack, goBack };
}
