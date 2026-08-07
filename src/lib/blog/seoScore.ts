// Lightweight SEO scorer for blog posts. Not a validator — a helper.
// Every check reads the ACTUAL article data / WYSIWYG HTML. A check is only
// "pass" (green) when its requirement is genuinely met; missing data is
// "neutral", partial/incorrect data is "warn". Only "pass" earns points.

export type SeoStatus = "pass" | "warn" | "neutral";

export type SeoCheck = {
  key: string;
  label: string;
  status: SeoStatus;
  /** convenience alias: true only when status === "pass" */
  ok: boolean;
  weight: number;
  message: string;
};

export type SeoReport = {
  score: number;
  band: "red" | "yellow" | "green";
  checks: SeoCheck[];
  stats: {
    words: number;
    h1: number;
    h2: number;
    images: number;
    imagesMissingAlt: number;
    internalLinks: number;
    externalLinks: number;
    metaTitleLen: number;
    metaDescLen: number;
  };
};

export type SeoInput = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  contentHtml: string;
  /** Focus keywords already parsed (comma-split, trimmed, non-empty). */
  focusKeywords?: string[];
  /** Origin of this site, used to classify absolute links as internal. */
  siteOrigin?: string;
};

/** Strip tags, scripts/styles and HTML entities → plain visible text. */
export function htmlToText(html: string): string {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html: string): number {
  const text = htmlToText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function countTag(html: string, tag: string): number {
  const re = new RegExp(`<${tag}(?=[\\s/>])`, "gi");
  return (html.match(re) ?? []).length;
}

export type LinkStats = { internal: number; external: number; ignored: number };

const IGNORED_SCHEMES = /^(#|javascript:|mailto:|tel:|data:|sms:)/i;

function hostOf(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Classify only real <a href="..."> anchors present in the article HTML. */
export function analyzeLinks(html: string, siteOrigin?: string): LinkStats {
  const stats: LinkStats = { internal: 0, external: 0, ignored: 0 };
  const selfHost = hostOf(siteOrigin);
  const anchorRe = /<a\b[^>]*>/gi;
  const hrefRe = /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/i;
  for (const tag of html.match(anchorRe) ?? []) {
    const m = tag.match(hrefRe);
    const raw = (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
    if (!raw || IGNORED_SCHEMES.test(raw)) {
      stats.ignored++;
      continue;
    }
    if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw)) {
      const host = hostOf(raw.startsWith("//") ? `https:${raw}` : raw);
      if (!host) {
        stats.ignored++;
        continue;
      }
      if (selfHost && host === selfHost) stats.internal++;
      else stats.external++;
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      stats.ignored++;
      continue;
    }
    // relative path (/foo, foo, ./foo, ../foo) → internal
    stats.internal++;
  }
  return stats;
}

function mk(
  key: string,
  label: string,
  weight: number,
  status: SeoStatus,
  message: string,
): SeoCheck {
  return { key, label, weight, status, ok: status === "pass", message };
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const doc = input.contentHtml || "";
  const text = htmlToText(doc);
  const words = countWords(doc);
  const h1 = countTag(doc, "h1");
  const h2 = countTag(doc, "h2");
  const imgTags = doc.match(/<img\b[^>]*>/gi) ?? [];
  const images = imgTags.length;
  const imagesMissingAlt = imgTags.filter((t) => {
    const m = t.match(/\salt\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/i);
    const alt = (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
    return !m || alt.length === 0;
  }).length;
  const links = analyzeLinks(doc, input.siteOrigin);

  const keywords = (input.focusKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  const titleLc = (input.title || "").trim().toLowerCase();
  const textLc = text.toLowerCase();
  const kwInTitle = keywords.some((k) => titleLc.includes(k.toLowerCase()));
  const kwInBody = keywords.some((k) => textLc.includes(k.toLowerCase()));

  const metaTitleLen = (input.metaTitle || "").trim().length;
  const metaDescLen = (input.metaDescription || "").trim().length;

  const checks: SeoCheck[] = [
    mk(
      "title-length",
      "Panjang Meta Title (50–60)",
      12,
      metaTitleLen === 0 ? "neutral" : metaTitleLen >= 50 && metaTitleLen <= 60 ? "pass" : "warn",
      `${metaTitleLen} karakter`,
    ),
    mk(
      "meta-desc",
      "Meta Description (120–160)",
      12,
      metaDescLen === 0 ? "neutral" : metaDescLen >= 120 && metaDescLen <= 160 ? "pass" : "warn",
      `${metaDescLen} karakter`,
    ),
    mk(
      "word-count",
      "Panjang Konten ≥ 600 kata",
      15,
      words === 0 ? "neutral" : words >= 600 ? "pass" : "warn",
      `${words} kata`,
    ),
    mk(
      "h1",
      "Struktur H1 tepat 1",
      8,
      h1 === 1 ? "pass" : h1 === 0 ? "neutral" : "warn",
      `${h1} H1 dalam konten`,
    ),
    mk("h2", "Ada minimal 2 heading H2", 10, h2 >= 2 ? "pass" : h2 === 0 ? "neutral" : "warn", `${h2} H2`),
    mk(
      "internal-link",
      "Minimal 1 internal link",
      8,
      links.internal >= 1 ? "pass" : "neutral",
      `${links.internal} internal`,
    ),
    mk(
      "external-link",
      "Minimal 1 external link",
      5,
      links.external >= 1 ? "pass" : "neutral",
      `${links.external} external`,
    ),
    mk(
      "alt-image",
      "Semua gambar punya alt text",
      10,
      images === 0 ? "neutral" : imagesMissingAlt === 0 ? "pass" : "warn",
      images === 0 ? "belum ada gambar" : `${images - imagesMissingAlt}/${images} punya alt`,
    ),
    mk(
      "kw-title",
      "Focus Keyword muncul di Judul",
      10,
      keywords.length === 0 || !titleLc ? "neutral" : kwInTitle ? "pass" : "warn",
      keywords.length === 0
        ? "focus keyword kosong"
        : !titleLc
          ? "judul kosong"
          : kwInTitle
            ? "ada"
            : "tidak ada",
    ),
    mk(
      "kw-body",
      "Focus Keyword muncul di Konten",
      10,
      keywords.length === 0 || !textLc ? "neutral" : kwInBody ? "pass" : "warn",
      keywords.length === 0
        ? "focus keyword kosong"
        : !textLc
          ? "konten kosong"
          : kwInBody
            ? "ada"
            : "tidak ada",
    ),
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : 0), 0);
  const score = Math.round((earned / total) * 100);
  const band: SeoReport["band"] = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";

  return {
    score,
    band,
    checks,
    stats: {
      words,
      h1,
      h2,
      images,
      imagesMissingAlt,
      internalLinks: links.internal,
      externalLinks: links.external,
      metaTitleLen,
      metaDescLen,
    },
  };
}
