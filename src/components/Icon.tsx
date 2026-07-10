import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (icons as unknown as Record<string, LucideIcon>)[name] ?? icons.Circle;
  return <Cmp className={className} aria-hidden="true" />;
}
