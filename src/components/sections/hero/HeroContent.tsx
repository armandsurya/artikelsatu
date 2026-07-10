import type { HeroData } from "@/types";
import { HeroBadge } from "./HeroBadge";
import { HeroButtons } from "./HeroButtons";

export function HeroContent({ data }: { data: HeroData }) {
  const primaryHref = data.primaryButtonMessage
    ? `${data.primaryButtonLink}?text=${encodeURIComponent(data.primaryButtonMessage)}`
    : data.primaryButtonLink;

  return (
    <div className="flex flex-col items-center text-center md:items-start md:text-left">
      {data.badge && <HeroBadge label={data.badge} />}

      <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-secondary sm:text-5xl md:text-6xl lg:text-[72px]">
        {data.title}
      </h1>

      <p className="mt-8 max-w-[620px] text-lg font-medium leading-relaxed text-muted-foreground md:text-[22px]">
        {data.description}
      </p>

      <div className="mt-10 w-full sm:w-auto">
        <HeroButtons
          primaryText={data.primaryButtonText}
          primaryHref={primaryHref}
          secondaryText={data.secondaryButtonText}
          secondaryTarget={data.secondaryButtonTarget}
        />
      </div>
    </div>
  );
}
