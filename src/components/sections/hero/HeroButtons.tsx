import { MessageCircle, ArrowRight } from "lucide-react";
import type { MouseEvent } from "react";

interface HeroButtonsProps {
  primaryText: string;
  primaryHref: string;
  secondaryText: string;
  secondaryTarget: string;
}

export function HeroButtons({
  primaryText,
  primaryHref,
  secondaryText,
  secondaryTarget,
}: HeroButtonsProps) {
  const handleSecondary = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!secondaryTarget.startsWith("#")) return;
    const el = document.querySelector(secondaryTarget);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href={primaryHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-blue-700 sm:w-auto"
      >
        <MessageCircle className="h-4 w-4" /> {primaryText}
      </a>
      <a
        href={secondaryTarget}
        onClick={handleSecondary}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-background px-6 py-3 text-sm font-semibold text-secondary hover:bg-accent sm:w-auto"
      >
        {secondaryText} <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
