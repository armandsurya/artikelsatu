import type { HeroData } from "@/types";
import { HeroContent } from "./hero/HeroContent";
import { HeroIllustration } from "./hero/HeroIllustration";

export function HeroSection({ data }: { data: HeroData }) {
  if (!data.isVisible) return null;

  return (
    <section id="hero" className="bg-background">
      <div className="container-narrow py-[90px] md:py-[110px]">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
          <HeroContent data={data} />
          <HeroIllustration data={data} />
        </div>
      </div>
    </section>
  );
}
