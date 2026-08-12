import { useEffect, useState } from "react";
import { ChevronDown, History, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type VersionRow = {
  id: string;
  version: number;
  title: string | null;
  data: unknown;
  note: string | null;
  created_at: string;
  created_by: string | null;
};

export function VersionPanel({
  sectionKey,
  reloadKey,
  onRestore,
}: {
  sectionKey: string;
  reloadKey: number;
  onRestore: (v: VersionRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("homepage_section_versions")
        .select("id, version, title, data, note, created_at, created_by")
        .eq("section_key", sectionKey)
        .order("version", { ascending: false })
        .limit(20);
      setRows((data as VersionRow[]) ?? []);
      setLoading(false);
    })();
  }, [sectionKey, reloadKey]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left hover:bg-accent/50"
      >
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium text-secondary">
          Riwayat Versi ({rows.length})
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border">
          {loading ? (
            <p className="p-5 text-sm text-muted-foreground">Memuat…</p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Belum ada versi. Versi baru dibuat setiap kali di-publish.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-secondary">Version {r.version}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("id-ID")}
                      {r.note ? ` — ${r.note}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-secondary hover:bg-accent"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Restore ke Draft
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
