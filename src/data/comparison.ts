import type { CompetitorComparison } from "@/types";

export const comparison: CompetitorComparison[] = [
  {
    feature: "Kualitas Tulisan",
    freelancer: "Bervariasi",
    ai: "Generik",
    agency: "Bagus",
    us: "Konsisten Bagus",
  },
  {
    feature: "Optimasi SEO",
    freelancer: "Kadang",
    ai: "Terbatas",
    agency: "Ya",
    us: "Ya, mendalam",
  },
  { feature: "Ditulis Manusia", freelancer: true, ai: false, agency: true, us: true },
  {
    feature: "Kecepatan Delivery",
    freelancer: "Lambat",
    ai: "Instan",
    agency: "Sedang",
    us: "Cepat & tepat",
  },
  {
    feature: "Harga per Artikel",
    freelancer: "Murah",
    ai: "Sangat murah",
    agency: "Mahal",
    us: "Terjangkau",
  },
  { feature: "Revisi", freelancer: "Terbatas", ai: "Tidak ada", agency: "Ya", us: "Ya, fleksibel" },
  {
    feature: "Bebas Plagiarisme",
    freelancer: "Tidak pasti",
    ai: "Tidak pasti",
    agency: true,
    us: true,
  },
];
