import { HeroSection } from "./sections/HeroSection";
import { StatsSection } from "./sections/StatsSection";
import { ProblemsSection } from "./sections/ProblemsSection";
import { SolutionsSection } from "./sections/SolutionsSection";
import { WorkflowSection } from "./sections/WorkflowSection";
import { AdvantagesSection } from "./sections/AdvantagesSection";
import { ServicesSection } from "./sections/ServicesSection";
import { PortfolioSection } from "./sections/PortfolioSection";
import { PricingSection } from "./sections/PricingSection";
import { ComparisonSection } from "./sections/ComparisonSection";
import { FAQSection } from "./sections/FAQSection";
import { BlogPreviewSection } from "./sections/BlogPreviewSection";
import { CTASection } from "./sections/CTASection";
import { DebugSource } from "./DebugSource";
import type { SectionArrangement, MappedSection } from "@/lib/mapPublished";
import type { SectionKey } from "@/data/homepageDefaults";

export function SectionRenderer({
  arrangement,
  payload,
}: {
  arrangement: SectionArrangement[];
  payload: Record<SectionKey, MappedSection>;
}) {
  const visible = arrangement.filter((s) => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <>
      {visible.map((s) => {
        const p = payload[s.key];
        if (!p) return null;
        return (
          <div key={s.key} className="relative">
            <DebugSource label={s.key} source={p.source} />
            {renderOne(p)}
          </div>
        );
      })}
    </>
  );
}

function renderOne(p: MappedSection) {
  switch (p.type) {
    case "hero": return <HeroSection data={p.data} />;
    case "stats": return <StatsSection data={p.data} />;
    case "problems": return <ProblemsSection title={p.title} data={p.data} />;
    case "solutions": return <SolutionsSection title={p.title} data={p.data} />;
    case "workflow": return <WorkflowSection title={p.title} data={p.data} />;
    case "advantages": return <AdvantagesSection title={p.title} data={p.data} />;
    case "services": return <ServicesSection title={p.title} data={p.data} />;
    case "portfolio": return <PortfolioSection title={p.title} data={p.data} />;
    case "pricing": return <PricingSection title={p.title} data={p.data} />;
    case "comparison": return <ComparisonSection title={p.title} data={p.data} />;
    case "faq": return <FAQSection title={p.title} data={p.data} />;
    case "blogPreview": return <BlogPreviewSection title={p.title} data={p.data} />;
    case "cta": return <CTASection data={p.data} />;
  }
}
