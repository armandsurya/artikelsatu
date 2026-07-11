/**
 * Lightweight validators for section payloads. Returns a list of error
 * messages; empty array = valid.
 */
export type ValidateResult = string[];

function isUrl(v: string): boolean {
  if (!v) return true;
  if (v.startsWith("/") || v.startsWith("#")) return true;
  try { new URL(v); return true; } catch { return false; }
}

export function validateTitle(title: string): ValidateResult {
  const errs: string[] = [];
  if (!title || !title.trim()) errs.push("Section Title wajib diisi.");
  if (title && title.length > 120) errs.push("Section Title maksimal 120 karakter.");
  return errs;
}

export function validateMeta(meta: { subtitle?: string; bgImage?: string }): ValidateResult {
  const errs: string[] = [];
  if (meta.subtitle && meta.subtitle.length > 280) errs.push("Section Subtitle maksimal 280 karakter.");
  if (meta.bgImage && !isUrl(meta.bgImage)) errs.push("Background Image URL tidak valid.");
  return errs;
}

/** Validates a content payload by section key. */
export function validateContent(sectionKey: string, content: unknown): ValidateResult {
  const errs: string[] = [];
  const c = content as Record<string, unknown>;

  if (sectionKey === "hero") {
    const h = c as { title?: string; image?: string; imageAlt?: string; primaryButtonLink?: string };
    if (!h.title?.trim()) errs.push("Hero: Headline wajib diisi.");
    if (h.image && !isUrl(h.image)) errs.push("Hero: URL gambar tidak valid.");
    if (h.image && !h.imageAlt?.trim()) errs.push("Hero: ALT text wajib jika ada gambar.");
    if (h.primaryButtonLink && !isUrl(h.primaryButtonLink)) errs.push("Hero: URL tombol utama tidak valid.");
  }

  if (sectionKey === "pricing") {
    const items = (c.items as Array<{ packageName?: string; price?: string | number; ctaUrl?: string }>) ?? [];
    items.forEach((p, i) => {
      if (!p.packageName?.trim()) errs.push(`Pricing #${i + 1}: nama paket wajib.`);
      if (p.price !== undefined && p.price !== "" && p.price !== null) {
        const n = Number(String(p.price).replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(n)) errs.push(`Pricing #${i + 1}: harga harus angka.`);
      }
      if (p.ctaUrl && !isUrl(p.ctaUrl)) errs.push(`Pricing #${i + 1}: URL CTA tidak valid.`);
    });
  }

  if (sectionKey === "cta") {
    const d = c as { title?: string; buttonUrl?: string; backgroundImage?: string };
    if (!d.title?.trim()) errs.push("CTA: judul wajib.");
    if (d.buttonUrl && !isUrl(d.buttonUrl)) errs.push("CTA: URL tombol tidak valid.");
    if (d.backgroundImage && !isUrl(d.backgroundImage)) errs.push("CTA: URL background image tidak valid.");
  }

  return errs;
}
