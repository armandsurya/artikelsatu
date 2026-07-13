/**
 * Maps DB payloads (form-shaped, as stored by the CMS) → frontend prop shapes.
 * Falls back to static defaults if a section row is missing or contains an
 * empty object. Returns a per-section "source" tag for the debug badge.
 */
import type { SectionKey } from "@/data/homepageDefaults";
import { DEFAULTS, SECTION_META_DEFAULTS } from "@/data/homepageDefaults";
import { splitMeta, DEFAULT_META, type SectionMeta } from "@/lib/admin/sectionMeta";
import type {
  HeroFormData, StatItem, ProblemItem, SolutionRow, WorkflowItem, AdvantageItem,
  ServiceItem, PortfolioItem, PricingItem, ComparisonRow, FAQItem, BlogPreviewData, CTAData,
} from "@/components/admin/homepage/forms";
import type {
  HeroData, Statistic, ProblemItem as ProblemT, ComparisonItem, WorkflowStep,
  Advantage, Service, Portfolio, PricingPackage, CompetitorComparison,
  FAQItem as FAQT, BlogPost, CTASectionData, NavItem, FooterData,
} from "@/types";
import type { PublishedSectionRow, PublishedBlogPostRow, PublishedCategoryRow, SiteSettingsBlob } from "@/lib/publishedContent";
import { footer as staticFooter } from "@/data/footer";
import { settings as staticSettings } from "@/data/settings";
import { mainNav as staticMainNav } from "@/data/navigation";

export type SectionSource = "database" | "fallback";

/** Per-section meta after merging DB values with SECTION_META_DEFAULTS. */
export type ResolvedMeta = {
  eyebrow: string;    // meta.badge → SectionHeader eyebrow
  subtitle: string;   // meta.subtitle → SectionHeader description
  bgColor: string;
  bgImage: string;
  paddingTop: number;
  paddingBottom: number;
};

type MappedBase = { source: SectionSource; title?: string; meta: ResolvedMeta; lastPublishedAt?: string | null };

export type MappedSection =
  | ({ type: "hero"; data: HeroData } & MappedBase)
  | ({ type: "stats"; data: Statistic[] } & MappedBase)
  | ({ type: "problems"; data: ProblemT[] } & MappedBase)
  | ({ type: "solutions"; data: ComparisonItem[] } & MappedBase)
  | ({ type: "workflow"; data: WorkflowStep[] } & MappedBase)
  | ({ type: "advantages"; data: Advantage[] } & MappedBase)
  | ({ type: "services"; data: Service[] } & MappedBase)
  | ({ type: "portfolio"; data: Portfolio[] } & MappedBase)
  | ({ type: "pricing"; data: PricingPackage[] } & MappedBase)
  | ({ type: "comparison"; data: CompetitorComparison[] } & MappedBase)
  | ({ type: "faq"; data: FAQT[] } & MappedBase)
  | ({ type: "blogPreview"; count: number; category: string; data: BlogPost[] } & MappedBase)
  | ({ type: "cta"; data: CTASectionData } & MappedBase);

const isEmpty = (v: unknown) =>
  !v || typeof v !== "object" || Array.isArray(v) || Object.keys(v as object).length === 0;

/** Merge stored meta with per-section defaults so empty badge/subtitle falls back to frontend literals. */
export function resolveMeta(key: SectionKey, m: SectionMeta | null | undefined): ResolvedMeta {
  const src = { ...DEFAULT_META, ...(m ?? {}) };
  const d = SECTION_META_DEFAULTS[key];
  return {
    eyebrow: (src.badge && src.badge.trim()) || d.badge,
    subtitle: (src.subtitle && src.subtitle.trim()) || d.subtitle,
    bgColor: src.bgColor || "",
    bgImage: src.bgImage || "",
    paddingTop: Number.isFinite(src.paddingTop) ? src.paddingTop : 96,
    paddingBottom: Number.isFinite(src.paddingBottom) ? src.paddingBottom : 96,
  };
}

/** Pick DB content or static default (returns source + content + raw meta). */
function pickContent<T>(key: SectionKey, dbData: Record<string, unknown> | null): { source: SectionSource; content: T; meta: SectionMeta } {
  if (dbData && !isEmpty(dbData)) {
    const { content, meta } = splitMeta<T>(dbData);
    if (!isEmpty(content as unknown)) return { source: "database", content, meta };
  }
  const { content, meta } = splitMeta<T>(DEFAULTS[key]);
  return { source: "fallback", content, meta };
}

/* ---------------- Section mappers ---------------- */

function mapHero(v: HeroFormData): HeroData {
  const secondary = v.secondaryButtonTarget === "custom" && v.secondaryButtonCustomUrl
    ? v.secondaryButtonCustomUrl
    : v.secondaryButtonTarget;
  // Hero is edited exclusively through "Konten Section" fields.
  // Section-level meta (badge/subtitle) is NOT bound to the frontend for hero.
  const badge = (v.badge || "").trim() || undefined;
  const description = (v.description || "").trim();
  return {
    badge,
    title: v.title,
    description,
    primaryButtonText: v.primaryButtonText,
    primaryButtonLink: v.primaryButtonLink,
    secondaryButtonText: v.secondaryButtonText,
    secondaryButtonTarget: secondary,
    image: v.image,
    imageAlt: v.imageAlt,
    imageWidth: v.imageWidth,
    imageHeight: v.imageHeight,
    isVisible: true,
  };
}

const mapStats = (v: { items: StatItem[] }): Statistic[] =>
  (v.items ?? []).filter((s) => s.isVisible !== false)
    .map((s, i) => ({ id: `stat-${i}`, title: s.title, value: s.value, icon: s.icon }));

const mapProblems = (v: { items: ProblemItem[] }): ProblemT[] =>
  (v.items ?? []).filter((p) => p.isVisible !== false)
    .map((p, i) => ({ id: `problem-${i}`, title: p.title, description: p.description, icon: p.icon }));

const mapSolutions = (v: { items: SolutionRow[] }): ComparisonItem[] =>
  (v.items ?? []).filter((s) => s.isVisible !== false)
    .map((s, i) => ({ id: `sol-${i}`, label: s.label, regular: s.regular, seo: s.seo }));

const mapWorkflow = (v: { items: WorkflowItem[] }): WorkflowStep[] =>
  (v.items ?? []).filter((w) => w.isVisible !== false)
    .map((w, i) => ({ id: `wf-${i}`, stepNumber: w.stepNumber, title: w.title, description: w.description }));

const mapAdvantages = (v: { items: AdvantageItem[] }): Advantage[] =>
  (v.items ?? []).map((a, i) => ({ id: `adv-${i}`, title: a.title, description: a.description, icon: a.icon }));

const mapServices = (v: { items: ServiceItem[] }): Service[] =>
  (v.items ?? []).map((s, i) => ({ id: s.slug || `svc-${i}`, title: s.name, description: s.description, icon: s.icon }));

const mapPortfolio = (v: { items: PortfolioItem[] }): Portfolio[] =>
  (v.items ?? []).filter((p) => p.isVisible !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((p, i) => ({
      id: `pf-${i}`,
      category: p.category,
      title: p.title,
      excerpt: (p.excerpt ?? "").trim() || undefined,
      keyword: p.keyword,
      wordCount: p.wordCount,
      labels: (p.labels ?? []).map((l) => l.text).filter(Boolean).slice(0, 3),
      ctaLabel: (p.ctaLabel ?? "").trim() || "Lihat Preview",
      ctaUrl: (p.ctaUrl ?? "").trim() || "#",
    }));

const mapPricing = (v: { items: PricingItem[] }): PricingPackage[] =>
  (v.items ?? []).filter((p) => p.isVisible !== false).map((p, i) => ({
    id: `pk-${i}`,
    packageName: p.packageName,
    price: p.price,
    priceNote: p.priceNote || undefined,
    description: p.badge || "",
    features: (p.features ?? []).map((f) => f.text).filter(Boolean),
    isPopular: !!p.isPopular,
    cta: { label: p.ctaLabel || "Pesan Sekarang" },
  }));

const boolFromText = (v: string): string | boolean => {
  const t = v.trim().toLowerCase();
  if (t === "ya" || t === "yes" || t === "true") return true;
  if (t === "tidak" || t === "no" || t === "false") return false;
  return v;
};

const mapComparison = (v: { rows: ComparisonRow[] }): CompetitorComparison[] =>
  (v.rows ?? []).map((r) => ({
    feature: r.feature,
    freelancer: boolFromText(r.freelancer),
    ai: boolFromText(r.ai),
    agency: boolFromText(r.agency),
    us: boolFromText(r.us),
  }));

const mapFaq = (v: { items: FAQItem[] }): FAQT[] =>
  (v.items ?? []).filter((f) => f.isVisible !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((f, i) => ({ id: `faq-${i}`, question: f.question, answer: f.answer }));

const mapCta = (v: CTAData): CTASectionData => ({
  title: v.title,
  subtitle: v.subtitle,
  cta: { label: v.buttonLabel || "Konsultasi Gratis" },
});

/* ---------------- Blog mapping ---------------- */

export function mapBlogPosts(rows: PublishedBlogPostRow[], cats: PublishedCategoryRow[]): BlogPost[] {
  const catMap = new Map(cats.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? "",
    featuredImage: r.featured_image ?? "",
    category: (r.category_id && catMap.get(r.category_id)) || "Umum",
    author: "Tim ArtikelPro",
    publishedDate: r.published_at ?? new Date().toISOString(),
    readTime: r.read_time ?? 5,
    tags: r.tags ?? [],
    status: "published",
    metaTitle: r.meta_title ?? undefined,
    metaDescription: r.meta_description ?? undefined,
  }));
}

/* ---------------- Sections list assembly ---------------- */

export type SectionArrangement = { key: SectionKey; title: string | null; sortOrder: number; isVisible: boolean };

const DEFAULT_ORDER: SectionArrangement[] = [
  { key: "hero", title: null, sortOrder: 1, isVisible: true },
  { key: "stats", title: null, sortOrder: 2, isVisible: true },
  { key: "problems", title: "Masalah yang Sering Dialami", sortOrder: 3, isVisible: true },
  { key: "solutions", title: "Solusi Kami", sortOrder: 4, isVisible: true },
  { key: "workflow", title: "Cara Kerja Kami", sortOrder: 5, isVisible: true },
  { key: "advantages", title: "Keunggulan Kami", sortOrder: 6, isVisible: true },
  { key: "services", title: "Layanan Kami", sortOrder: 7, isVisible: true },
  { key: "portfolio", title: "Contoh Hasil Artikel", sortOrder: 8, isVisible: true },
  { key: "pricing", title: "Paket Harga", sortOrder: 9, isVisible: true },
  { key: "comparison", title: "Kenapa Memilih Kami", sortOrder: 10, isVisible: true },
  { key: "faq", title: "Pertanyaan yang Sering Diajukan", sortOrder: 11, isVisible: true },
  { key: "blogPreview", title: "Artikel Terbaru", sortOrder: 12, isVisible: true },
  { key: "cta", title: null, sortOrder: 13, isVisible: true },
];

export function buildHomepageArrangement(rows: PublishedSectionRow[] | undefined): SectionArrangement[] {
  if (!rows || rows.length === 0) return DEFAULT_ORDER;
  const byKey = new Map(rows.map((r) => [r.section_key, r]));
  return DEFAULT_ORDER.map((d) => {
    const r = byKey.get(d.key);
    if (!r) return d;
    return { key: d.key, title: r.title ?? d.title, sortOrder: r.sort_order ?? d.sortOrder, isVisible: r.is_visible !== false };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapPublishedSection(
  key: SectionKey,
  dbData: Record<string, unknown> | null,
  title: string | null,
  blogPosts: BlogPost[],
  lastPublishedAt?: string | null,
): MappedSection {
  const base = (source: SectionSource, m: SectionMeta) => ({
    source,
    meta: resolveMeta(key, m),
    lastPublishedAt: lastPublishedAt ?? null,
  });
  switch (key) {
    case "hero": {
      const { source, content, meta } = pickContent<HeroFormData>("hero", dbData);
      const b = base(source, meta);
      return { type: "hero", ...b, data: mapHero(content) };
    }
    case "stats": {
      const { source, content, meta } = pickContent<{ items: StatItem[] }>("stats", dbData);
      return { type: "stats", ...base(source, meta), data: mapStats(content) };
    }
    case "problems": {
      const { source, content, meta } = pickContent<{ items: ProblemItem[] }>("problems", dbData);
      return { type: "problems", ...base(source, meta), title: title ?? undefined, data: mapProblems(content) };
    }
    case "solutions": {
      const { source, content, meta } = pickContent<{ items: SolutionRow[] }>("solutions", dbData);
      return { type: "solutions", ...base(source, meta), title: title ?? undefined, data: mapSolutions(content) };
    }
    case "workflow": {
      const { source, content, meta } = pickContent<{ items: WorkflowItem[] }>("workflow", dbData);
      return { type: "workflow", ...base(source, meta), title: title ?? undefined, data: mapWorkflow(content) };
    }
    case "advantages": {
      const { source, content, meta } = pickContent<{ items: AdvantageItem[] }>("advantages", dbData);
      return { type: "advantages", ...base(source, meta), title: title ?? undefined, data: mapAdvantages(content) };
    }
    case "services": {
      const { source, content, meta } = pickContent<{ items: ServiceItem[] }>("services", dbData);
      return { type: "services", ...base(source, meta), title: title ?? undefined, data: mapServices(content) };
    }
    case "portfolio": {
      const { source, content, meta } = pickContent<{ items: PortfolioItem[] }>("portfolio", dbData);
      return { type: "portfolio", ...base(source, meta), title: title ?? undefined, data: mapPortfolio(content) };
    }
    case "pricing": {
      const { source, content, meta } = pickContent<{ items: PricingItem[] }>("pricing", dbData);
      return { type: "pricing", ...base(source, meta), title: title ?? undefined, data: mapPricing(content) };
    }
    case "comparison": {
      const { source, content, meta } = pickContent<{ rows: ComparisonRow[] }>("comparison", dbData);
      return { type: "comparison", ...base(source, meta), title: title ?? undefined, data: mapComparison(content) };
    }
    case "faq": {
      const { source, content, meta } = pickContent<{ items: FAQItem[] }>("faq", dbData);
      return { type: "faq", ...base(source, meta), title: title ?? undefined, data: mapFaq(content) };
    }
    case "blogPreview": {
      const { source, content, meta } = pickContent<BlogPreviewData>("blogPreview", dbData);
      const count = Math.max(1, Number(content.count) || 3);
      const cat = content.category || "auto";
      const filtered = cat === "auto" || !cat ? blogPosts : blogPosts.filter((p) => p.category === cat);
      return {
        type: "blogPreview",
        ...base(source, meta),
        title: title ?? content.sectionTitle ?? "Artikel Terbaru",
        count,
        category: cat,
        data: filtered.slice(0, count),
      };
    }
    case "cta": {
      const { source, content, meta } = pickContent<CTAData>("cta", dbData);
      return { type: "cta", ...base(source, meta), data: mapCta(content) };
    }
  }
}

/* ---------------- Header / Footer / Settings ---------------- */

export type HeaderProps = {
  source: SectionSource;
  logo: string;
  menu: { label: string; href: string; target: "_self" | "_blank" }[];
  ctaLabel: string;
  ctaUrl: string;
  ctaVisible: boolean;
};

export function mapHeader(settings: SiteSettingsBlob | undefined): HeaderProps {
  const raw = (settings?.header as Partial<HeaderProps> | undefined) ?? undefined;
  // Pengaturan Umum (top-level) menjadi sumber utama untuk identitas.
  const globalLogo = (settings?.logo as string | undefined) || (settings?.siteName as string | undefined);
  const globalWa = (settings?.whatsapp as string | undefined) || staticSettings.whatsapp;

  if (raw && (raw.logo || globalLogo)) {
    return {
      source: "database",
      logo: globalLogo || raw.logo || staticSettings.logo,
      menu: (raw.menu?.length ? raw.menu : defaultMenu()) as HeaderProps["menu"],
      ctaLabel: raw.ctaLabel ?? "Konsultasi Gratis",
      ctaUrl: raw.ctaUrl ?? `https://wa.me/${globalWa}`,
      ctaVisible: raw.ctaVisible !== false,
    };
  }
  if (globalLogo) {
    return {
      source: "database",
      logo: globalLogo,
      menu: defaultMenu(),
      ctaLabel: "Konsultasi Gratis",
      ctaUrl: `https://wa.me/${globalWa}`,
      ctaVisible: true,
    };
  }
  return {
    source: "fallback",
    logo: staticSettings.logo,
    menu: defaultMenu(),
    ctaLabel: "Konsultasi Gratis",
    ctaUrl: `https://wa.me/${staticSettings.whatsapp}`,
    ctaVisible: true,
  };
}

function defaultMenu(): HeaderProps["menu"] {
  return staticMainNav.map((m: NavItem) => ({ label: m.label, href: m.href, target: "_self" as const }));
}

export type FooterProps = {
  source: SectionSource;
  logo: string;
  description: string;
  copyright: string;
  contact: { whatsapp: string; email: string; address: string };
  social: { label: string; url: string }[];
  columns: FooterData["columns"];
};

export function mapFooter(settings: SiteSettingsBlob | undefined): FooterProps {
  const raw = (settings?.footer as {
    description?: string; copyright?: string;
    contact?: Partial<FooterProps["contact"]>;
    social?: FooterProps["social"];
    columns?: FooterData["columns"];
  } | undefined) ?? undefined;

  const globalLogo = (settings?.logo as string | undefined)
    || (settings?.siteName as string | undefined)
    || (settings?.header as { logo?: string } | undefined)?.logo
    || staticSettings.logo;
  const globalWa = (settings?.whatsapp as string | undefined) || staticSettings.whatsapp;
  const globalEmail = (settings?.email as string | undefined) || staticSettings.email;
  const globalAddress = (settings?.address as string | undefined) || staticSettings.address;
  const globalSocial = (settings?.social as FooterProps["social"] | undefined);
  const hasGlobal = !!(settings?.logo || settings?.siteName || settings?.whatsapp || settings?.email);

  if (raw && raw.description) {
    return {
      source: "database",
      logo: globalLogo,
      description: raw.description,
      copyright: raw.copyright ?? staticSettings.copyright,
      contact: {
        whatsapp: raw.contact?.whatsapp || globalWa,
        email: raw.contact?.email || globalEmail,
        address: raw.contact?.address || globalAddress,
      },
      social: (globalSocial?.length ? globalSocial : raw.social?.length ? raw.social : staticSettings.social),
      columns: raw.columns?.length ? raw.columns : staticFooter.columns,
    };
  }
  return {
    source: hasGlobal ? "database" : "fallback",
    logo: globalLogo,
    description: staticFooter.description,
    copyright: staticSettings.copyright,
    contact: { whatsapp: globalWa, email: globalEmail, address: globalAddress },
    social: globalSocial?.length ? globalSocial : staticSettings.social,
    columns: staticFooter.columns,
  };
}
