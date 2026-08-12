import { api } from "@/integrations/api/browser";

export type RedirectRow = {
  id: string;
  source: string;
  destination: string;
  code: 301 | 302;
  active: boolean;
  hits: number;
  last_hit_at: string | null;
  notes: string | null;
  preserve_query: boolean;
  created_at: string;
  updated_at: string;
};

export const REDIRECTS_QUERY_KEY = ["published", "redirects"] as const;
export const ADMIN_REDIRECTS_QUERY_KEY = ["admin", "redirects"] as const;

/** Normalize a path for lookup: lowercase, ensure leading slash, strip trailing slash (except root), strip hash. */
export function normalizePath(input: string): string {
  if (!input) return "/";
  let p = input.trim();
  // strip origin if given
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname + (new URL(p).search || "");
  } catch {
    /* ignore */
  }
  // remove hash
  const hashIdx = p.indexOf("#");
  if (hashIdx >= 0) p = p.slice(0, hashIdx);
  if (!p.startsWith("/")) p = "/" + p;
  // collapse duplicate slashes
  p = p.replace(/\/{2,}/g, "/");
  // remove trailing slash except root
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p.toLowerCase();
}

/** Split a full URL/path into pathname + search string. */
export function splitPathAndSearch(input: string): { path: string; search: string } {
  let raw = input || "/";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      raw = u.pathname + u.search;
    } catch {
      /* ignore */
    }
  }
  const q = raw.indexOf("?");
  if (q < 0) return { path: raw, search: "" };
  return { path: raw.slice(0, q), search: raw.slice(q) };
}

export async function fetchActiveRedirects(): Promise<RedirectRow[]> {
  const { data, error } = await supabase
    .from("redirects")
    .select(
      "id, source, destination, code, active, hits, last_hit_at, notes, preserve_query, created_at, updated_at",
    )
    .eq("active", true);
  if (error) return [];
  return (data ?? []) as RedirectRow[];
}

export async function fetchAllRedirects(): Promise<RedirectRow[]> {
  const { data, error } = await supabase
    .from("redirects")
    .select(
      "id, source, destination, code, active, hits, last_hit_at, notes, preserve_query, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RedirectRow[];
}

/** Look up a redirect for the given request path. Returns the resolved destination URL or null. */
export function resolveRedirect(
  currentPath: string,
  rows: RedirectRow[],
): { row: RedirectRow; destination: string } | null {
  const { path, search } = splitPathAndSearch(currentPath);
  const norm = normalizePath(path);
  const row = rows.find((r) => normalizePath(r.source) === norm);
  if (!row) return null;
  let dest = row.destination.trim();
  if (row.preserve_query && search) {
    // Only append if destination has no query of its own
    if (!dest.includes("?")) dest = dest + search;
  }
  return { row, destination: dest };
}

/** Fire-and-forget hit increment. */
export function recordRedirectHit(source: string): void {
  if (typeof window === "undefined") return;
  void api.rpc("increment_redirect_hit", { _source: source });
}

// ---------------- Validation ----------------

export type RedirectValidationInput = {
  source: string;
  destination: string;
  id?: string; // exclude self on edit
};

export function validateRedirect(
  input: RedirectValidationInput,
  existing: RedirectRow[],
): string | null {
  const src = (input.source || "").trim();
  const dst = (input.destination || "").trim();
  if (!src) return "Source URL wajib diisi.";
  if (!dst) return "Destination URL wajib diisi.";
  if (!src.startsWith("/") && !/^https?:\/\//i.test(src)) {
    return "Source harus diawali '/' atau berupa URL http(s).";
  }
  if (!dst.startsWith("/") && !/^https?:\/\//i.test(dst)) {
    return "Destination harus diawali '/' atau berupa URL http(s).";
  }
  const nSrc = normalizePath(src);
  const nDst = normalizePath(dst);
  if (nSrc === nDst) return "Source dan destination tidak boleh sama (self-redirect).";

  // Duplicate source
  const dup = existing.find((r) => r.id !== input.id && normalizePath(r.source) === nSrc);
  if (dup) return `Source '${src}' sudah dipakai oleh redirect lain.`;

  // Loop detection (walk the chain from destination)
  const map = new Map<string, RedirectRow>();
  for (const r of existing) {
    if (r.id === input.id) continue;
    map.set(normalizePath(r.source), r);
  }
  // include the new/edited redirect
  map.set(nSrc, { ...(input as unknown as RedirectRow), source: src, destination: dst });

  let cur = nDst;
  const seen = new Set<string>([nSrc]);
  for (let i = 0; i < 20; i++) {
    const hit = map.get(cur);
    if (!hit) break;
    if (seen.has(cur)) return "Redirect membentuk loop (siklus).";
    seen.add(cur);
    cur = normalizePath(hit.destination);
  }
  return null;
}
