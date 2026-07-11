/**
 * Homepage defaults derived from the current frontend data files.
 * Used to seed each CMS section so the admin sees exactly what is
 * currently rendered on the site.
 */
import { hero } from "./hero";
import { stats } from "./stats";
import { problems } from "./problems";
import { solutions } from "./solutions";
import { workflow } from "./workflow";
import { advantages } from "./advantages";
import { services } from "./services";
import { portfolio } from "./portfolio";
import { pricing } from "./pricing";
import { comparison } from "./comparison";
import { faq } from "./faq";
import { ctaSection } from "./cta";
import type {
  HeroFormData, StatItem, ProblemItem, SolutionRow, WorkflowItem, AdvantageItem,
  ServiceItem, PortfolioItem, PricingItem, ComparisonRow, FAQItem, BlogPreviewData, CTAData,
} from "@/components/admin/homepage/forms";

const boolToText = (v: string | boolean) => (typeof v === "boolean" ? (v ? "Ya" : "Tidak") : v);

export type SectionKey =
  | "hero" | "stats" | "problems" | "solutions" | "workflow" | "advantages"
  | "services" | "portfolio" | "pricing" | "comparison" | "faq" | "blogPreview" | "cta";

export const SECTION_META: Record<SectionKey, { title: string; description: string; sortOrder: number }> = {
  hero:        { title: "Hero",         description: "Bagian pertama halaman: badge, headline, tombol utama, dan gambar.", sortOrder: 1 },
  stats:       { title: "Statistik",    description: "Angka pencapaian yang tampil di bawah hero.",                        sortOrder: 2 },
  problems:    { title: "Masalah",      description: "Kartu masalah yang sering dialami calon klien.",                     sortOrder: 3 },
  solutions:   { title: "Solusi",       description: "Perbandingan artikel biasa vs artikel SEO.",                          sortOrder: 4 },
  workflow:    { title: "Workflow",     description: "Langkah kerja layanan Anda.",                                        sortOrder: 5 },
  advantages:  { title: "Keunggulan",   description: "Kartu keunggulan yang ditawarkan.",                                  sortOrder: 6 },
  services:    { title: "Layanan",      description: "Daftar layanan penulisan yang tersedia.",                            sortOrder: 7 },
  portfolio:   { title: "Portfolio",    description: "Contoh artikel yang pernah dikerjakan.",                             sortOrder: 8 },
  pricing:     { title: "Harga",        description: "Paket harga layanan.",                                                sortOrder: 9 },
  comparison:  { title: "Perbandingan", description: "Tabel perbandingan dengan kompetitor.",                              sortOrder: 10 },
  faq:         { title: "FAQ",          description: "Pertanyaan yang sering diajukan.",                                   sortOrder: 11 },
  blogPreview: { title: "Blog Preview", description: "Preview artikel terbaru di homepage.",                               sortOrder: 12 },
  cta:         { title: "CTA",          description: "Panggilan aksi di akhir homepage.",                                  sortOrder: 13 },
};

export const SECTION_KEYS = Object.keys(SECTION_META) as SectionKey[];

/**
 * Per-section default meta (badge/subtitle) matching what the frontend
 * currently renders via hardcoded literals inside each Section component.
 * These are used to (1) seed the CMS editor so admin sees the CURRENT
 * frontend text, and (2) act as fallback on the frontend when the admin
 * leaves them blank.
 */
export const SECTION_META_DEFAULTS: Record<SectionKey, { badge: string; subtitle: string }> = {
  hero:        { badge: hero.badge ?? "", subtitle: hero.description ?? "" },
  stats:       { badge: "",             subtitle: "" }, // stats has no header
  problems:    { badge: "Masalah",      subtitle: "Apakah salah satu situasi berikut ini terdengar familier untuk Anda?" },
  solutions:   { badge: "Solusi",       subtitle: "Perbedaan mendasar antara artikel yang ditulis tanpa strategi dengan artikel yang dioptimasi untuk SEO." },
  workflow:    { badge: "Cara Kerja",   subtitle: "Proses yang transparan dari brief hingga artikel siap publish." },
  advantages:  { badge: "Keunggulan",   subtitle: "Kami tidak hanya menulis. Kami memastikan setiap artikel bekerja untuk bisnis Anda." },
  services:    { badge: "Layanan",      subtitle: "Berbagai jenis konten untuk mendukung strategi digital bisnis Anda." },
  portfolio:   { badge: "Portofolio",   subtitle: "Beberapa contoh artikel yang telah kami produksi untuk berbagai niche." },
  pricing:     { badge: "Harga",        subtitle: "Pilih paket yang sesuai dengan skala kebutuhan konten Anda. Harga transparan tanpa biaya tersembunyi." },
  comparison:  { badge: "Perbandingan", subtitle: "Lihat perbandingan antara freelancer, AI, agency, dan layanan kami." },
  faq:         { badge: "FAQ",          subtitle: "Jawaban atas pertanyaan yang paling sering ditanyakan calon klien." },
  blogPreview: { badge: "Blog",         subtitle: "Insight seputar SEO, content marketing, dan copywriting." },
  cta:         { badge: "",             subtitle: "" }, // CTA has its own layout
};

/* ------------ per-section defaults matching the forms.tsx shapes ------------ */

export const heroDefault: HeroFormData = {
  badge: hero.badge ?? "",
  title: hero.title,
  description: hero.description,
  primaryButtonText: hero.primaryButtonText,
  primaryButtonLink: hero.primaryButtonLink,
  secondaryButtonText: hero.secondaryButtonText,
  secondaryButtonTarget: hero.secondaryButtonTarget,
  secondaryButtonCustomUrl: "",
  image: hero.image,
  imageAlt: hero.imageAlt,
  imageWidth: hero.imageWidth,
  imageHeight: hero.imageHeight,
};

export const statsDefault: { items: StatItem[] } = {
  items: stats.map((s, i) => ({
    icon: s.icon, title: s.title, value: s.value, description: "",
    sortOrder: i + 1, isVisible: true,
  })),
};

export const problemsDefault: { items: ProblemItem[] } = {
  items: problems.map((p) => ({ icon: p.icon, title: p.title, description: p.description, isVisible: true })),
};

export const solutionsDefault: { items: SolutionRow[] } = {
  items: solutions.map((s) => ({ label: s.label, regular: s.regular, seo: s.seo, isVisible: true })),
};

export const workflowDefault: { items: WorkflowItem[] } = {
  items: workflow.map((w) => ({
    stepNumber: w.stepNumber, title: w.title, description: w.description,
    icon: "CheckCircle2", isVisible: true,
  })),
};

export const advantagesDefault: { items: AdvantageItem[] } = {
  items: advantages.map((a) => ({ icon: a.icon, title: a.title, description: a.description })),
};

export const servicesDefault: { items: ServiceItem[] } = {
  items: services.map((s) => ({
    icon: s.icon, name: s.title, slug: s.id, description: s.description,
    ctaLabel: "Selengkapnya", ctaUrl: "#cta",
  })),
};

export const portfolioDefault: { items: PortfolioItem[] } = {
  items: portfolio.map((p, i) => ({
    title: p.title, category: p.category, excerpt: p.excerpt ?? "",
    keyword: p.keyword, wordCount: p.wordCount,
    labels: (p.labels ?? ["SEO Optimized", "Human Written"]).map((t) => ({ text: t })),
    ctaLabel: p.ctaLabel ?? "Lihat Preview", ctaUrl: p.ctaUrl ?? "#",
    sortOrder: i + 1, isVisible: true,
  })),
};

export const pricingDefault: { items: PricingItem[] } = {
  items: pricing.map((p) => ({
    packageName: p.packageName,
    price: p.price,
    priceNote: p.priceNote ?? "",
    badge: p.isPopular ? "Terpopuler" : "",
    isPopular: !!p.isPopular,
    features: p.features.map((f) => ({ text: f })),
    ctaLabel: p.cta.label,
    ctaUrl: "",
    isVisible: true,
  })),
};

export const comparisonDefault: { rows: ComparisonRow[] } = {
  rows: comparison.map((r) => ({
    feature: r.feature,
    freelancer: String(boolToText(r.freelancer)),
    ai: String(boolToText(r.ai)),
    agency: String(boolToText(r.agency)),
    us: String(boolToText(r.us)),
  })),
};

export const faqDefault: { items: FAQItem[] } = {
  items: faq.map((f, i) => ({ question: f.question, answer: f.answer, sortOrder: i + 1, isVisible: true })),
};

export const blogPreviewDefault: BlogPreviewData = {
  sectionTitle: "Artikel Terbaru",
  count: "3",
  category: "auto",
};

export const ctaDefault: CTAData = {
  title: ctaSection.title,
  subtitle: ctaSection.subtitle,
  buttonLabel: ctaSection.cta.label,
  buttonUrl: "",
  backgroundImage: "",
};

export const DEFAULTS: Record<SectionKey, unknown> = {
  hero: heroDefault,
  stats: statsDefault,
  problems: problemsDefault,
  solutions: solutionsDefault,
  workflow: workflowDefault,
  advantages: advantagesDefault,
  services: servicesDefault,
  portfolio: portfolioDefault,
  pricing: pricingDefault,
  comparison: comparisonDefault,
  faq: faqDefault,
  blogPreview: blogPreviewDefault,
  cta: ctaDefault,
};
