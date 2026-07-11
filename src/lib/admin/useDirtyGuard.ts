import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";

/**
 * Warns before navigation (in-app and browser) when there are unsaved changes.
 * Returns TanStack blocker state so we can render our own dialog.
 */
export function useDirtyGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return useBlocker({ shouldBlockFn: () => isDirty, withResolver: true });
}
