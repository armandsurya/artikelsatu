import DOMPurify from "dompurify";

/**
 * Sanitize HTML from CKEditor before storing/rendering.
 * Allows the tags CKEditor produces plus image/table/figure elements and
 * a safe set of attributes (including class/style so alignment survives).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    // SSR: skip; server only renders trusted, already-sanitized DB content
    return html;
  }
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel", "loading", "referrerpolicy", "style", "class"],
    FORBID_TAGS: ["script", "style", "iframe"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}

/** Plain-text extraction for word counts and excerpts. */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Accurate word count for Indonesian/English mixed content. */
export function countWords(html: string): number {
  const text = htmlToText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** Reading time (rounded up), 200 words per minute default. */
export function readingMinutes(html: string, wpm = 200): number {
  const w = countWords(html);
  if (w === 0) return 0;
  return Math.max(1, Math.ceil(w / wpm));
}

/** Content statistics for the editor footer + SEO panel. */
export function contentStats(html: string) {
  const text = htmlToText(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  const doc = typeof window !== "undefined"
    ? new DOMParser().parseFromString(html || "<div/>", "text/html")
    : null;
  const count = (sel: string) => (doc ? doc.querySelectorAll(sel).length : 0);
  const links = doc ? Array.from(doc.querySelectorAll("a[href]")) : [];
  const internal = links.filter((a) => {
    const href = (a as HTMLAnchorElement).getAttribute("href") || "";
    return href.startsWith("/") || href.startsWith("#") || (typeof location !== "undefined" && href.includes(location.host));
  }).length;
  return {
    words,
    chars,
    minutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 200)),
    h1: count("h1"),
    h2: count("h2"),
    h3: count("h3"),
    paragraphs: count("p"),
    images: count("img"),
    tables: count("table"),
    links: links.length,
    internalLinks: internal,
    externalLinks: links.length - internal,
  };
}

/** Keyword density (0..1) — simple case-insensitive match. */
export function keywordDensity(html: string, keyword: string): number {
  const text = htmlToText(html).toLowerCase();
  const k = keyword.trim().toLowerCase();
  if (!k || !text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  const hits = (text.match(re) ?? []).length;
  return hits / words.length;
}
