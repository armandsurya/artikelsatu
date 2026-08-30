// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

// A client that navigates away / reloads mid-SSR aborts the socket. Node surfaces
// this as `Error: aborted` (ECONNRESET / ABORT_ERR) — it is not an application
// error and must never be recorded or reported as one.
export function isClientAbort(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const err = current as { code?: unknown; name?: unknown; message?: unknown; cause?: unknown };
    if (
      err.code === "ECONNRESET" ||
      err.code === "ABORT_ERR" ||
      err.name === "AbortError" ||
      err.message === "aborted" ||
      (typeof err.message === "string" && /\baborted\b/i.test(err.message))
    ) {
      return true;
    }
    current = err.cause;
  }
  return false;
}

function record(error: unknown) {
  if (isClientAbort(error)) return;
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    const err = (event as ErrorEvent).error ?? event;
    if (isClientAbort(err)) {
      // Swallow: the peer hung up, nothing to fix.
      (event as ErrorEvent).preventDefault?.();
      return;
    }
    record(err);
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    if (isClientAbort(reason)) {
      (event as PromiseRejectionEvent).preventDefault?.();
      return;
    }
    record(reason);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
