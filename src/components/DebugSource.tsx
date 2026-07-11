import type { SectionSource } from "@/lib/mapPublished";

/**
 * Dev-only badge showing whether a section is being rendered from the database
 * or from a static fallback, plus the last-published timestamp. Hidden in prod.
 */
export function DebugSource({
  label,
  source,
  lastPublishedAt,
}: {
  label: string;
  source: SectionSource;
  lastPublishedAt?: string | null;
}) {
  if (!import.meta.env.DEV) return null;
  const isDb = source === "database";
  const ts = lastPublishedAt ? new Date(lastPublishedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "—";
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-10 select-none">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${
          isDb ? "bg-emerald-600 text-white" : "bg-amber-500 text-black"
        }`}
        title={`Section: ${label}\nSource: ${isDb ? "Database (Published)" : "Static fallback"}\nLast Updated: ${ts}`}
      >
        {isDb ? "DB" : "FALLBACK"} · {label} · {ts}
      </span>
    </div>
  );
}
