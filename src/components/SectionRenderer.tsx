import type { HomepageSection } from "@/types";
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

import { hero } from "@/data/hero";
import { stats } from "@/data/stats";
import { problems } from "@/data/problems";
import { solutions } from "@/data/solutions";
import { workflow } from "@/data/workflow";
import { advantages } from "@/data/advantages";
import { services } from "@/data/services";
import { portfolio } from "@/data/portfolio";
import { pricing } from "@/data/pricing";
import { comparison } from "@/data/comparison";
import { faq } from "@/data/faq";
import { blogPosts } from "@/data/blog";
import { ctaSection } from "@/data/cta";

export function SectionRenderer({ sections }: { sections: HomepageSection[] }) {
  const visible = [...sections].filter((s) => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <>
      {visible.map((s) => {
        switch (s.type) {
          case "hero": return <HeroSection key={s.id} data={hero} />;
          case "stats": return <StatsSection key={s.id} data={stats} />;
          case "problems": return <ProblemsSection key={s.id} title={s.title} data={problems} />;
          case "solutions": return <SolutionsSection key={s.id} title={s.title} data={solutions} />;
          case "workflow": return <WorkflowSection key={s.id} title={s.title} data={workflow} />;
          case "advantages": return <AdvantagesSection key={s.id} title={s.title} data={advantages} />;
          case "services": return <ServicesSection key={s.id} title={s.title} data={services} />;
          case "portfolio": return <PortfolioSection key={s.id} title={s.title} data={portfolio} />;
          case "pricing": return <PricingSection key={s.id} title={s.title} data={pricing} />;
          case "comparison": return <ComparisonSection key={s.id} title={s.title} data={comparison} />;
          case "faq": return <FAQSection key={s.id} title={s.title} data={faq} />;
          case "blogPreview": return <BlogPreviewSection key={s.id} title={s.title} data={blogPosts} />;
          case "cta": return <CTASection key={s.id} data={ctaSection} />;
          default: return null;
        }
      })}
    </>
  );
}
