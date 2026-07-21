import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import { SectionRenderer } from "@/components/SectionRenderer";
import {
  usePublishedSections,
  usePublishedBlogPosts,
  usePublishedBlogCategories,
  publishedSectionsQueryOptions,
  publishedBlogPostsQueryOptions,
  blogCategoriesQueryOptions,
} from "@/lib/publishedContent";
import {
  buildHomepageArrangement,
  mapPublishedSection,
  mapBlogPosts,
  type MappedSection,
} from "@/lib/mapPublished";
import { SECTION_KEYS, type SectionKey } from "@/data/homepageDefaults";
import { settings } from "@/data/settings";
import { faq } from "@/data/faq";
import { services } from "@/data/services";

export const Route = createFileRoute("/")({
  // Note: title/description/OG/Twitter untuk homepage sudah di-set di __root
  // dari seo.homepageTitle / seo.homepageDescription (dibaca dari DB).
  // Di sini hanya menambahkan canonical + og:url + JSON-LD spesifik halaman.
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.fetchQuery(publishedSectionsQueryOptions()),
      context.queryClient.fetchQuery(publishedBlogPostsQueryOptions()),
      context.queryClient.fetchQuery(blogCategoriesQueryOptions()),
    ]);
  },
  // Note: title/description/OG/Twitter untuk homepage sudah di-set di __root
  // dari seo.homepageTitle / seo.homepageDescription (dibaca dari DB).
  // Di sini hanya menambahkan canonical + og:url + JSON-LD spesifik halaman.
  head: () => ({
    meta: [{ property: "og:url", content: "/" }],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Jasa Pembuatan Artikel SEO",
          provider: { "@type": "Organization", name: settings.siteName },
          areaServed: "ID",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Layanan Konten",
            itemListElement: services.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s.title, description: s.description },
            })),
          },
        }),
      },
    ],
  }),
  pendingComponent: HomePending,
  component: HomePage,
});

function HomePending() {
  return (
    <SiteLayout>
      <div className="container-narrow py-14">
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[12px] bg-muted" />
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}

function HomePage() {
  const sectionsQ = usePublishedSections();
  const postsQ = usePublishedBlogPosts();
  const catsQ = usePublishedBlogCategories();

  const arrangement = useMemo(() => buildHomepageArrangement(sectionsQ.data), [sectionsQ.data]);

  const blogPosts = useMemo(
    () => mapBlogPosts(postsQ.data ?? [], catsQ.data ?? []),
    [postsQ.data, catsQ.data],
  );

  const payload = useMemo(() => {
    const byKey = new Map((sectionsQ.data ?? []).map((r) => [r.section_key, r]));
    const out = {} as Record<SectionKey, MappedSection>;
    for (const key of SECTION_KEYS) {
      const row = byKey.get(key);
      out[key] = mapPublishedSection(
        key,
        row?.data ?? null,
        row?.title ?? null,
        blogPosts,
        row?.last_published_at ?? null,
      );
    }
    return out;
  }, [sectionsQ.data, blogPosts]);

  return (
    <SiteLayout>
      <SectionRenderer arrangement={arrangement} payload={payload} />
    </SiteLayout>
  );
}
