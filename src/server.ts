import "./lib/error-capture";

import serverEntry from "@tanstack/react-start/server-entry";

import { consumeLastCapturedError, isClientAbort } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// NOTE: this import is intentionally STATIC. A dynamic import() made the bundler
// emit the TanStack server runtime as a separate SSR chunk; on hosts that keep
// server code-splitting on (Hostinger / node-server), that chunk was emitted
// without the shared bundler runtime helpers and the process crashed on boot with
// "__exportAll is not a function" / "createMiddleware is not a function".
function getServerEntry(): ServerEntry {
  return ((serverEntry as { default?: ServerEntry })?.default ??
    serverEntry) as unknown as ServerEntry;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError();
  if (isClientAbort(captured)) return new Response(null, { status: 499 });
  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Client-abort detection lives in ./lib/error-capture so the global listeners
// and this wrapper agree on what counts as "the peer hung up".


export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      if (request.signal?.aborted) return response;
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      if (isClientAbort(error) || request.signal?.aborted) {
        // Client went away before the response finished — stay quiet.
        return new Response(null, { status: 499 });
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

