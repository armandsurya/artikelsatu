import type { PricingPackage } from "@/types";

export const pricing: PricingPackage[] = [
  {
    id: "pk1",
    packageName: "Basic",
    price: "Rp 35rb",
    priceNote: "/artikel",
    description: "Cocok untuk memulai blog personal atau UMKM.",
    features: ["500 kata", "1 keyword utama", "Riset dasar", "1x revisi", "Human written"],
    cta: { label: "Pesan Sekarang" },
  },
  {
    id: "pk2",
    packageName: "Standard",
    price: "Rp 75rb",
    priceNote: "/artikel",
    description: "Paling populer untuk blog bisnis yang ingin naik ranking.",
    features: ["1000 kata", "1 keyword + LSI", "Riset kompetitor", "2x revisi", "Meta title & description", "Internal link"],
    isPopular: true,
    cta: { label: "Pesan Sekarang" },
  },
  {
    id: "pk3",
    packageName: "Premium",
    price: "Rp 150rb",
    priceNote: "/artikel",
    description: "Untuk konten pilar yang menargetkan keyword kompetitif.",
    features: ["1500–2000 kata", "Multi keyword", "Riset mendalam", "3x revisi", "Optimasi on-page lengkap", "Featured image"],
    cta: { label: "Pesan Sekarang" },
  },
  {
    id: "pk4",
    packageName: "Enterprise",
    price: "Custom",
    description: "Kebutuhan konten skala besar dengan tim dedicated.",
    features: ["Volume besar", "Tim dedicated", "Content strategy", "Laporan bulanan", "SLA prioritas", "Manager akun"],
    cta: { label: "Minta Penawaran", message: "Halo, saya ingin diskusi paket Enterprise untuk kebutuhan artikel SEO." },
  },
];
