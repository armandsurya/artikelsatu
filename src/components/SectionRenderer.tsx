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
import type { SectionArrangement, MappedSection, ResolvedMeta } from "@/lib/mapPublished";
import type { SectionKey } from "@/data/homepageDefaults";
import type { CSSProperties } from "react";

/** Build inline style overrides from meta (bgColor, bgImage, padding). */
function styleFromMeta(m: ResolvedMeta): CSSProperties | undefined {
  const s: CSSProperties = {};
  if (m.bgColor) s.backgroundColor = m.bgColor;
  if (m.bgImage) {
    s.backgroundImage = `url(${m.bgImage})`;
    s.backgroundSize = "cover";
    s.backgroundPosition = "center";
  }
  if (m.paddingTop !== 96) s.paddingTop = `${m.paddingTop}px`;
  if (m.paddingBottom !== 96) s.paddingBottom = `${m.paddingBottom}px`;
  return Object.keys(s).length ? s : undefined;
}

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
        const style = styleFromMeta(p.meta);
        return (
          <div key={s.key} className="relative" style={style}>
            <DebugSource
              label={s.key}
              source={p.source}
              lastPublishedAt={p.lastPublishedAt ?? null}
            />
            {renderOne(p)}
          </div>
        );
      })}
    </>
  );
}

function renderOne(p: MappedSection) {
  switch (p.type) {
    case "hero":
      return <HeroSection data={p.data} />;
    case "stats":
      return <StatsSection data={p.data} />;
    case "problems":
      return (
        <ProblemsSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "solutions":
      return (
        <SolutionsSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "workflow":
      return (
        <WorkflowSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "advantages":
      return (
        <AdvantagesSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "services":
      return (
        <ServicesSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "portfolio":
      return (
        <PortfolioSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "pricing":
      return (
        <PricingSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "comparison":
      return (
        <ComparisonSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "faq":
      return (
        <FAQSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "blogPreview":
      return (
        <BlogPreviewSection
          eyebrow={p.meta.eyebrow}
          subtitle={p.meta.subtitle}
          title={p.title}
          data={p.data}
        />
      );
    case "cta":
      return <CTASection data={p.data} />;
  }
}
