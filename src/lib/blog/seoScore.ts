// Lightweight SEO scorer for blog posts. Not a validator — a helper.
// Returns { score: 0..100, checks: [{key,label,ok,weight,message}] }

export type SeoCheck = {
  key: string;
  label: string;
  ok: boolean;
  weight: number;
  message: string;
};

export type SeoReport = {
  score: number;
  band: "red" | "yellow" | "green";
  checks: SeoCheck[];
};

export type SeoInput = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  contentHtml: string;
  focusKeyword?: string;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const text = stripHtml(input.contentHtml || "");
  const words = text ? text.split(" ").filter(Boolean).length : 0;
  const doc = input.contentHtml || "";
  const h1Count = (doc.match(/<h1[\s>]/gi) ?? []).length;
  const h2Count = (doc.match(/<h2[\s>]/gi) ?? []).length;
  const imgs = doc.match(/<img[^>]*>/gi) ?? [];
  const imgsMissingAlt = imgs.filter((t) => !/\balt=/.test(t) || /\balt=["']\s*["']/i.test(t)).length;
  const anchors = doc.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) ?? [];
  const internal = anchors.filter((a) => {
    const m = a.match(/href=["']([^"']+)["']/i);
    const href = m?.[1] ?? "";
    return href.startsWith("/") || href.startsWith("#");
  }).length;
  const external = anchors.length - internal;
  const kw = (input.focusKeyword ?? "").trim().toLowerCase();
  const kwInTitle = kw ? input.title.toLowerCase().includes(kw) : true;
  const kwInBody = kw ? text.toLowerCase().includes(kw) : true;
  const metaTitleLen = (input.metaTitle || input.title || "").length;
  const metaDescLen = (input.metaDescription || "").length;

  const checks: SeoCheck[] = [
    {
      key: "title-length",
      label: "Panjang Meta Title (50–60)",
      weight: 12,
      ok: metaTitleLen >= 40 && metaTitleLen <= 65,
      message: `${metaTitleLen} karakter`,
    },
    {
      key: "meta-desc",
      label: "Meta Description (120–160)",
      weight: 12,
      ok: metaDescLen >= 120 && metaDescLen <= 160,
      message: `${metaDescLen} karakter`,
    },
    {
      key: "word-count",
      label: "Panjang Konten ≥ 600 kata",
      weight: 15,
      ok: words >= 600,
      message: `${words} kata`,
    },
    {
      key: "h1",
      label: "Struktur H1 tepat 1",
      weight: 8,
      ok: h1Count <= 1, // TSS renders h1 from title
      message: `${h1Count} H1 dalam konten`,
    },
    {
      key: "h2",
      label: "Ada minimal 2 heading H2",
      weight: 10,
      ok: h2Count >= 2,
      message: `${h2Count} H2`,
    },
    {
      key: "internal-link",
      label: "Minimal 1 internal link",
      weight: 8,
      ok: internal >= 1,
      message: `${internal} internal`,
    },
    {
      key: "external-link",
      label: "Minimal 1 external link",
      weight: 5,
      ok: external >= 1,
      message: `${external} external`,
    },
    {
      key: "alt-image",
      label: "Semua gambar punya alt text",
      weight: 10,
      ok: imgs.length === 0 || imgsMissingAlt === 0,
      message: imgs.length ? `${imgs.length - imgsMissingAlt}/${imgs.length}` : "tidak ada gambar",
    },
    {
      key: "kw-title",
      label: "Focus Keyword muncul di Judul",
      weight: 10,
      ok: kwInTitle,
      message: kw ? (kwInTitle ? "ada" : "tidak ada") : "opsional",
    },
    {
      key: "kw-body",
      label: "Focus Keyword muncul di Konten",
      weight: 10,
      ok: kwInBody,
      message: kw ? (kwInBody ? "ada" : "tidak ada") : "opsional",
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / total) * 100);
  const band: SeoReport["band"] = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
  return { score, band, checks };
}
