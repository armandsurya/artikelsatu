import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Rocket, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { api } from "@/integrations/api/browser";
import { PageHeader, Card, Field, inputCls, btnPrimary, btnGhost } from "@/components/admin/ui";
import {
  loadSiteSettings,
  patchSiteSettings,
  invalidateSiteSettings,
} from "@/lib/admin/siteSettings";
import { logActivity } from "@/lib/admin/log";

export const Route = createFileRoute("/_authenticated/admin/blog/hero")({
  head: () => ({ meta: [{ title: "Hero Blog — Admin" }] }),
  component: BlogHeroEditor,
});

type HeroContent = { title: string; description: string };
type BlogHeroBlob = {
  published?: HeroContent;
  draft?: HeroContent;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  publishedAt?: string;
};

const DEFAULTS: HeroContent = {
  title: "Blog ArtikelPro",
  description:
    "Kumpulan artikel dan panduan seputar SEO, penulisan konten, dan strategi digital untuk membantu bisnis Anda bertumbuh.",
};

const TITLE_MAX = 80;
const DESC_MAX = 240;

function validate(v: HeroContent): string | null {
  if (!v.title.trim()) return "Judul Halaman Blog wajib diisi.";
  if (v.title.length > TITLE_MAX) return `Judul maksimal ${TITLE_MAX} karakter.`;
  if (!v.description.trim()) return "Deskripsi Halaman Blog wajib diisi.";
  if (v.description.length > DESC_MAX) return `Deskripsi maksimal ${DESC_MAX} karakter.`;
  return null;
}

function BlogHeroEditor() {
  const qc = useQueryClient();
  const [value, setValue] = useState<HeroContent>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "saving" | "publishing" | "success" | "error">(
    "idle",
  );
  const snapshotRef = useRef<string>("");
  const [meta, setMeta] = useState<BlogHeroBlob>({});

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings-full"],
    queryFn: () => loadSiteSettings<Record<string, unknown>>(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    const blob = ((data.blogHero as BlogHeroBlob | undefined) ?? {}) as BlogHeroBlob;
    // draft is the editable snapshot; falls back to published, then defaults.
    const initial: HeroContent = {
      title: blob.draft?.title ?? blob.published?.title ?? DEFAULTS.title,
      description: blob.draft?.description ?? blob.published?.description ?? DEFAULTS.description,
    };
    setValue(initial);
    setMeta(blob);
    snapshotRef.current = JSON.stringify(initial);
  }, [data]);

  const dirty = useMemo(() => JSON.stringify(value) !== snapshotRef.current, [value]);
  const publishedSame = useMemo(() => {
    const p = meta.published;
    return !!p && p.title === value.title && p.description === value.description;
  }, [meta, value]);

  const badge = !meta.published
    ? { label: "Draft", cls: "bg-amber-100 text-amber-800" }
    : publishedSame && !dirty
      ? { label: "Published", cls: "bg-emerald-100 text-emerald-800" }
      : { label: "Modified", cls: "bg-blue-100 text-blue-800" };

  async function persist(patch: BlogHeroBlob, action: "draft" | "publish") {
    const err = validate(value);
    if (err) {
      toast.error("Gagal menyimpan", { description: err });
      return;
    }
    setStatus(action === "publish" ? "publishing" : "saving");
    const { data: userData } = await api.auth.getUser();
    const user = userData.user;
    const nowIso = new Date().toISOString();
    let byName: string | undefined;
    if (user) {
      const { data: prof } = await api
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      byName = (prof as { full_name?: string } | null)?.full_name ?? user.email ?? undefined;
    }
    const nextBlob: BlogHeroBlob = {
      ...meta,
      ...patch,
      updatedAt: nowIso,
      updatedBy: user?.id,
      updatedByName: byName,
      ...(action === "publish" ? { publishedAt: nowIso } : {}),
    };
    const { error } = await patchSiteSettings({ blogHero: nextBlob });
    if (error) {
      setStatus("error");
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    setMeta(nextBlob);
    snapshotRef.current = JSON.stringify(value);
    setStatus("success");
    invalidateSiteSettings(qc);
    await logActivity(
      action === "publish" ? "blog_hero_published" : "blog_hero_draft_saved",
      "site_settings",
      undefined,
      { title: value.title },
    );
    toast.success(action === "publish" ? "Hero Blog dipublikasikan" : "Draft tersimpan");
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function saveDraft() {
    await persist({ draft: value }, "draft");
  }
  async function publish() {
    await persist({ draft: value, published: value }, "publish");
  }
  function resetToPublished() {
    if (!meta.published) return;
    setValue({ ...meta.published });
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const lastUpdated = meta.updatedAt
    ? new Date(meta.updatedAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      <PageHeader
        title="Hero Blog"
        description="Kelola judul dan deskripsi header pada halaman /blog."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            {meta.published && dirty && (
              <button
                type="button"
                onClick={resetToPublished}
                className={btnGhost}
                disabled={status === "saving" || status === "publishing"}
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              className={btnGhost}
              disabled={!dirty || status === "saving" || status === "publishing"}
            >
              {status === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </button>
            <button
              type="button"
              onClick={publish}
              className={btnPrimary}
              disabled={status === "saving" || status === "publishing"}
            >
              {status === "publishing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Publish
            </button>
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data…
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <div className="space-y-5">
                <Field
                  label="Judul Halaman Blog"
                  hint={`${value.title.length}/${TITLE_MAX} karakter`}
                >
                  <input
                    type="text"
                    value={value.title}
                    maxLength={TITLE_MAX}
                    onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))}
                    className={inputCls}
                    placeholder="Blog ArtikelPro"
                  />
                </Field>
                <Field
                  label="Deskripsi Halaman Blog"
                  hint={`${value.description.length}/${DESC_MAX} karakter`}
                >
                  <textarea
                    value={value.description}
                    maxLength={DESC_MAX}
                    onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))}
                    rows={4}
                    className={`${inputCls} min-h-[110px] resize-y`}
                    placeholder="Deskripsi singkat untuk header halaman blog."
                  />
                </Field>

                {status === "success" && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Perubahan tersimpan.
                  </div>
                )}
                {status === "error" && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    <AlertCircle className="h-4 w-4" /> Terjadi kesalahan saat menyimpan.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-secondary">Preview</h3>
              <div className="mt-3 rounded-lg border border-border bg-accent/30 p-4">
                <p className="text-lg font-bold leading-tight text-secondary">
                  {value.title || "Judul kosong"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {value.description || "Deskripsi kosong"}
                </p>
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-secondary">Metadata</h3>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium text-secondary">{badge.label}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Terakhir diubah</dt>
                  <dd className="font-medium text-secondary">{lastUpdated ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Oleh</dt>
                  <dd className="font-medium text-secondary">{meta.updatedByName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Publish terakhir</dt>
                  <dd className="font-medium text-secondary">
                    {meta.publishedAt
                      ? new Date(meta.publishedAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
