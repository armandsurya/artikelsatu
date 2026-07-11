import type { SectionSource } from "@/lib/mapPublished";

/**
 * Small dev-only badge showing whether a section is being rendered from
 * the database or from the static fallback. Hidden in production builds.
 */
export function DebugSource({ label, source }: { label: string; source: SectionSource }) {
  if (!import.meta.env.DEV) return null;
  const isDb = source === "database";
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-10 select-none">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${
          isDb ? "bg-emerald-600 text-white" : "bg-amber-500 text-black"
        }`}
        title={`${label}: ${isDb ? "Data dari database (Published)" : "Data fallback statis (belum di-publish)"}`}
      >
        {isDb ? "DB" : "FALLBACK"} · {label}
      </span>
    </div>
  );
}
