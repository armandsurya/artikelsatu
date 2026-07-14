import { createFileRoute, notFound } from "@tanstack/react-router";
import { SectionEditor } from "@/components/admin/homepage/SectionEditor";
import {
  HeroForm,
  StatsForm,
  ProblemsForm,
  SolutionsForm,
  WorkflowForm,
  AdvantagesForm,
  ServicesForm,
  PortfolioForm,
  PricingForm,
  ComparisonForm,
  FAQForm,
  BlogPreviewForm,
  CTAForm,
  type HeroFormData,
  type StatItem,
  type ProblemItem,
  type SolutionRow,
  type WorkflowItem,
  type AdvantageItem,
  type ServiceItem,
  type PortfolioItem,
  type PricingItem,
  type ComparisonRow,
  type FAQItem,
  type BlogPreviewData,
  type CTAData,
} from "@/components/admin/homepage/forms";
import { SECTION_META, type SectionKey } from "@/data/homepageDefaults";

const VALID = new Set<string>(Object.keys(SECTION_META));

export const Route = createFileRoute("/_authenticated/admin/website/homepage/$section")({
  head: ({ params }) => ({
    meta: [{ title: `${SECTION_META[params.section as SectionKey]?.title ?? "Section"} — Admin` }],
  }),
  beforeLoad: ({ params }) => {
    if (!VALID.has(params.section)) throw notFound();
  },
  notFoundComponent: () => (
    <div className="text-sm text-muted-foreground">Section tidak ditemukan.</div>
  ),
  errorComponent: ({ error }) => <div className="text-sm text-red-600">{error.message}</div>,
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const key = section as SectionKey;
  const previewHash = key === "hero" ? "" : `#${key === "blogPreview" ? "blog" : key}`;

  switch (key) {
    case "hero":
      return (
        <SectionEditor<HeroFormData>
          sectionKey="hero"
          previewHash={previewHash}
          render={(v, on) => <HeroForm value={v} onChange={on} />}
        />
      );
    case "stats":
      return (
        <SectionEditor<{ items: StatItem[] }>
          sectionKey="stats"
          previewHash={previewHash}
          render={(v, on) => <StatsForm value={v} onChange={on} />}
        />
      );
    case "problems":
      return (
        <SectionEditor<{ items: ProblemItem[] }>
          sectionKey="problems"
          previewHash={previewHash}
          render={(v, on) => <ProblemsForm value={v} onChange={on} />}
        />
      );
    case "solutions":
      return (
        <SectionEditor<{ items: SolutionRow[] }>
          sectionKey="solutions"
          previewHash={previewHash}
          render={(v, on) => <SolutionsForm value={v} onChange={on} />}
        />
      );
    case "workflow":
      return (
        <SectionEditor<{ items: WorkflowItem[] }>
          sectionKey="workflow"
          previewHash={previewHash}
          render={(v, on) => <WorkflowForm value={v} onChange={on} />}
        />
      );
    case "advantages":
      return (
        <SectionEditor<{ items: AdvantageItem[] }>
          sectionKey="advantages"
          previewHash={previewHash}
          render={(v, on) => <AdvantagesForm value={v} onChange={on} />}
        />
      );
    case "services":
      return (
        <SectionEditor<{ items: ServiceItem[] }>
          sectionKey="services"
          previewHash={previewHash}
          render={(v, on) => <ServicesForm value={v} onChange={on} />}
        />
      );
    case "portfolio":
      return (
        <SectionEditor<{ items: PortfolioItem[] }>
          sectionKey="portfolio"
          previewHash={previewHash}
          render={(v, on) => <PortfolioForm value={v} onChange={on} />}
        />
      );
    case "pricing":
      return (
        <SectionEditor<{ items: PricingItem[] }>
          sectionKey="pricing"
          previewHash={previewHash}
          render={(v, on) => <PricingForm value={v} onChange={on} />}
        />
      );
    case "comparison":
      return (
        <SectionEditor<{ rows: ComparisonRow[] }>
          sectionKey="comparison"
          previewHash={previewHash}
          render={(v, on) => <ComparisonForm value={v} onChange={on} />}
        />
      );
    case "faq":
      return (
        <SectionEditor<{ items: FAQItem[] }>
          sectionKey="faq"
          previewHash={previewHash}
          render={(v, on) => <FAQForm value={v} onChange={on} />}
        />
      );
    case "blogPreview":
      return (
        <SectionEditor<BlogPreviewData>
          sectionKey="blogPreview"
          previewHash={previewHash}
          render={(v, on) => <BlogPreviewForm value={v} onChange={on} />}
        />
      );
    case "cta":
      return (
        <SectionEditor<CTAData>
          sectionKey="cta"
          previewHash={previewHash}
          render={(v, on) => <CTAForm value={v} onChange={on} />}
        />
      );
  }
}
