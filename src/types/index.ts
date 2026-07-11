export interface GlobalSettings {
  siteName: string;
  logo: string;
  whatsapp: string;
  email: string;
  address: string;
  social: { label: string; url: string }[];
  defaultCta: { label: string; message: string };
  copyright: string;
  seo: {
    title: string;
    description: string;
    ogImage?: string;
  };
}

export interface CtaLink {
  label: string;
  message?: string;
  variant?: "primary" | "secondary" | "ghost";
}

export interface HeroData {
  badge?: string;
  title: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  primaryButtonMessage?: string;
  secondaryButtonText: string;
  secondaryButtonTarget: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  isVisible: boolean;
}

export interface Statistic {
  id: string;
  title: string;
  value: string;
  icon: string;
}

export interface ProblemItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ComparisonItem {
  id: string;
  label: string;
  regular: string;
  seo: string;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
}

export interface Advantage {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Portfolio {
  id: string;
  category: string;
  title: string;
  excerpt?: string;
  keyword: string;
  wordCount: number;
  labels?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface PricingPackage {
  id: string;
  packageName: string;
  price: string;
  priceNote?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  cta: CtaLink;
}

export interface CompetitorComparison {
  feature: string;
  freelancer: string | boolean;
  ai: string | boolean;
  agency: string | boolean;
  us: string | boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  featuredImage: string;
  category: string;
  metaTitle?: string;
  metaDescription?: string;
  author: string;
  publishedDate: string;
  readTime: number;
  tags: string[];
  status: "published" | "draft";
}

export interface CTASectionData {
  title: string;
  subtitle: string;
  cta: CtaLink;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterData {
  description: string;
  columns: { title: string; links: NavItem[] }[];
}

export type SectionType =
  | "hero"
  | "stats"
  | "problems"
  | "solutions"
  | "workflow"
  | "advantages"
  | "services"
  | "portfolio"
  | "pricing"
  | "comparison"
  | "faq"
  | "blogPreview"
  | "cta";

export interface HomepageSection {
  id: string;
  type: SectionType;
  title?: string;
  isVisible: boolean;
  sortOrder: number;
}
