import { settings, DEFAULT_WA_MESSAGE } from "@/data/settings";

export function waLink(message?: string): string {
  const text = encodeURIComponent(message ?? DEFAULT_WA_MESSAGE);
  return `https://wa.me/${settings.whatsapp}?text=${text}`;
}
