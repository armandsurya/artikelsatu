import type { FooterData } from "@/types";

export const footer: FooterData = {
  description: "Jasa pembuatan artikel SEO berbahasa Indonesia untuk bisnis yang ingin bertumbuh di mesin pencari.",
  columns: [
    {
      title: "Navigasi",
      links: [
        { label: "Beranda", href: "/" },
        { label: "Blog", href: "/blog" },
        { label: "Harga", href: "/#pricing" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      title: "Layanan",
      links: [
        { label: "Artikel SEO", href: "/#services" },
        { label: "Artikel Blog", href: "/#services" },
        { label: "Landing Page", href: "/#services" },
        { label: "Copywriting", href: "/#services" },
      ],
    },
  ],
};
