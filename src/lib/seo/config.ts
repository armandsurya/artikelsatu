/**
 * Server-safe helpers to build head meta + analytics scripts from SEO config in site_settings.
 * Used by __root.tsx head() and shared between routes that need SEO-driven meta.
 */
import type { SiteSettingsBlob } from "@/lib/publishedContent";

export type SeoConfig = {
  // General
  homepageTitle?: string; homepageDescription?: string;
  blogTitle?: string; blogDescription?: string;
  defaultKeywords?: string;
  robots?: string;          // meta robots default e.g. "index,follow"
  canonicalBase?: string;   // absolute base URL used for canonical/og:url
  favicon?: string;

  // Open Graph
  ogTitle?: string; ogDescription?: string; ogImage?: string;
  ogType?: string; ogLocale?: string; ogSiteName?: string;

  // Twitter
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterSite?: string; twitterCreator?: string; twitterImage?: string;

  // Analytics
  ga4Id?: string; gtmId?: string; clarityId?: string; metaPixelId?: string;
  // Legacy (Modul 1 migration): analyticsId & searchConsoleId
  analyticsId?: string; searchConsoleId?: string;

  // Verification
  googleVerification?: string; bingVerification?: string;
  yandexVerification?: string; facebookVerification?: string;
  pinterestVerification?: string;

  // Schema
  schema?: string;          // raw JSON-LD blob
  schemaImage?: string;
  organizationName?: string; organizationLogo?: string; organizationUrl?: string;

  // Robots & sitemap
  robotsTxt?: string; sitemapUrl?: string;
};

export function getSeoConfig(settings: SiteSettingsBlob | null | undefined): SeoConfig {
  const s = (settings ?? {}) as Record<string, unknown>;
  const seo = ((s.seo as Record<string, unknown>) ?? {}) as SeoConfig;
  // Backward-compat: legacy analyticsId may live inside seo (already migrated in Modul 1).
  if (!seo.ga4Id && seo.analyticsId) seo.ga4Id = seo.analyticsId;
  if (!seo.googleVerification && seo.searchConsoleId) seo.googleVerification = seo.searchConsoleId;
  return seo;
}

type Meta = Record<string, string>;
type Script = { type?: string; src?: string; async?: boolean; defer?: boolean; children?: string };

/** Validate common IDs — returns true if the value plausibly matches the required format. */
export const VALIDATORS = {
  ga4: (v: string) => /^G-[A-Z0-9]{6,}$/i.test(v.trim()),
  gtm: (v: string) => /^GTM-[A-Z0-9]{5,}$/i.test(v.trim()),
  clarity: (v: string) => /^[a-z0-9]{5,20}$/i.test(v.trim()),
  metaPixel: (v: string) => /^\d{8,20}$/.test(v.trim()),
} as const;

/**
 * Build meta tag entries derived from SEO config for the ROOT route only.
 * Page-specific title/description live in each route's head().
 */
export function buildRootMeta(seo: SeoConfig, siteName: string): Meta[] {
  const meta: Meta[] = [];
  const title = seo.homepageTitle?.trim();
  const desc = seo.homepageDescription?.trim();
  const ogTitle = seo.ogTitle?.trim() || title;
  const ogDesc = seo.ogDescription?.trim() || desc;
  const twCard = seo.twitterCard || "summary_large_image";

  if (title) meta.push({ title });
  if (desc) meta.push({ name: "description", content: desc });
  if (seo.defaultKeywords?.trim()) meta.push({ name: "keywords", content: seo.defaultKeywords.trim() });
  if (seo.robots?.trim()) meta.push({ name: "robots", content: seo.robots.trim() });

  meta.push({ property: "og:site_name", content: seo.ogSiteName?.trim() || siteName });
  meta.push({ property: "og:type", content: seo.ogType?.trim() || "website" });
  if (seo.ogLocale?.trim()) meta.push({ property: "og:locale", content: seo.ogLocale.trim() });
  if (ogTitle) meta.push({ property: "og:title", content: ogTitle });
  if (ogDesc) meta.push({ property: "og:description", content: ogDesc });

  meta.push({ name: "twitter:card", content: twCard });
  if (seo.twitterSite?.trim()) meta.push({ name: "twitter:site", content: seo.twitterSite.trim() });
  if (seo.twitterCreator?.trim()) meta.push({ name: "twitter:creator", content: seo.twitterCreator.trim() });
  if (ogTitle) meta.push({ name: "twitter:title", content: ogTitle });
  if (ogDesc) meta.push({ name: "twitter:description", content: ogDesc });

  // Verification
  if (seo.googleVerification?.trim()) meta.push({ name: "google-site-verification", content: seo.googleVerification.trim() });
  if (seo.bingVerification?.trim()) meta.push({ name: "msvalidate.01", content: seo.bingVerification.trim() });
  if (seo.yandexVerification?.trim()) meta.push({ name: "yandex-verification", content: seo.yandexVerification.trim() });
  if (seo.facebookVerification?.trim()) meta.push({ name: "facebook-domain-verification", content: seo.facebookVerification.trim() });
  if (seo.pinterestVerification?.trim()) meta.push({ name: "p:domain_verify", content: seo.pinterestVerification.trim() });

  return meta;
}

/** Build script entries for analytics & JSON-LD schema. Only emitted when configured. */
export function buildAnalyticsScripts(seo: SeoConfig): Script[] {
  const out: Script[] = [];

  // Google Analytics 4
  if (seo.ga4Id && VALIDATORS.ga4(seo.ga4Id)) {
    const id = seo.ga4Id.trim();
    out.push({ src: `https://www.googletagmanager.com/gtag/js?id=${id}`, async: true });
    out.push({
      children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
    });
  }

  // Google Tag Manager
  if (seo.gtmId && VALIDATORS.gtm(seo.gtmId)) {
    const id = seo.gtmId.trim();
    out.push({
      children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
    });
  }

  // Microsoft Clarity
  if (seo.clarityId && VALIDATORS.clarity(seo.clarityId)) {
    const id = seo.clarityId.trim();
    out.push({
      children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`,
    });
  }

  // Meta Pixel
  if (seo.metaPixelId && VALIDATORS.metaPixel(seo.metaPixelId)) {
    const id = seo.metaPixelId.trim();
    out.push({
      children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`,
    });
  }

  return out;
}

/** Try to parse user-provided JSON-LD; fall back to Organization schema. */
export function buildOrganizationSchema(seo: SeoConfig, siteName: string, email?: string, address?: string): string {
  if (seo.schema?.trim()) {
    try { JSON.parse(seo.schema); return seo.schema; } catch { /* fall through */ }
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seo.organizationName?.trim() || siteName,
    url: seo.organizationUrl?.trim() || "/",
    logo: seo.organizationLogo?.trim() || undefined,
    image: seo.schemaImage?.trim() || undefined,
    email,
    address,
  });
}
