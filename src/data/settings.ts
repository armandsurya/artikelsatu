import type { GlobalSettings } from "@/types";

export const settings: GlobalSettings = {
  siteName: "ArtikelPro",
  logo: "ArtikelPro",
  whatsapp: "6282214949685",
  email: "halo@artikelpro.id",
  address: "Jakarta, Indonesia",
  social: [
    { label: "Instagram", url: "https://instagram.com" },
    { label: "LinkedIn", url: "https://linkedin.com" },
  ],
  defaultCta: {
    label: "Konsultasi Gratis",
    message: "Halo, saya ingin konsultasi mengenai jasa pembuatan artikel SEO.",
  },
  copyright: `© ${new Date().getFullYear()} ArtikelPro. Semua hak dilindungi.`,
  seo: {
    title: "ArtikelPro — Jasa Pembuatan Artikel SEO Berkualitas",
    description:
      "Jasa penulisan artikel SEO berbahasa Indonesia yang membantu website Anda naik peringkat di Google dengan konten berkualitas dan sesuai kaidah SEO on-page.",
  },
};

export const DEFAULT_WA_MESSAGE = settings.defaultCta.message;
