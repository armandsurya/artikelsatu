import type { HeroData } from "@/types";

export function HeroIllustration({ data }: { data: HeroData }) {
  return (
    <div className="flex justify-center md:justify-end">
      <img
        src={data.image}
        alt={data.imageAlt}
        width={data.imageWidth}
        height={data.imageHeight}
        loading="lazy"
        decoding="async"
        className="h-auto w-full max-w-[500px] md:max-w-[560px]"
      />
    </div>
  );
}
