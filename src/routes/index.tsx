import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import { SectionRenderer } from "@/components/SectionRenderer";
import { homepageSections } from "@/data/homepageSections";
import { settings } from "@/data/settings";
import { faq } from "@/data/faq";
import { services } from "@/data/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: settings.seo.title },
      { name: "description", content: settings.seo.description },
      { property: "og:title", content: settings.seo.title },
      { property: "og:description", content: settings.seo.description },
      { property: "og:url", content: "/" },
    ],
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
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      <SectionRenderer sections={homepageSections} />
    </SiteLayout>
  );
}
