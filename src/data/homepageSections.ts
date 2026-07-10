import type { HomepageSection } from "@/types";

export const homepageSections: HomepageSection[] = [
  { id: "hero", type: "hero", isVisible: true, sortOrder: 1 },
  { id: "stats", type: "stats", isVisible: true, sortOrder: 2 },
  { id: "problems", type: "problems", title: "Masalah yang Sering Dialami", isVisible: true, sortOrder: 3 },
  { id: "solutions", type: "solutions", title: "Solusi Kami", isVisible: true, sortOrder: 4 },
  { id: "workflow", type: "workflow", title: "Cara Kerja Kami", isVisible: true, sortOrder: 5 },
  { id: "advantages", type: "advantages", title: "Keunggulan Kami", isVisible: true, sortOrder: 6 },
  { id: "services", type: "services", title: "Layanan Kami", isVisible: true, sortOrder: 7 },
  { id: "portfolio", type: "portfolio", title: "Contoh Hasil Artikel", isVisible: true, sortOrder: 8 },
  { id: "pricing", type: "pricing", title: "Paket Harga", isVisible: true, sortOrder: 9 },
  { id: "comparison", type: "comparison", title: "Kenapa Memilih Kami", isVisible: true, sortOrder: 10 },
  { id: "faq", type: "faq", title: "Pertanyaan yang Sering Diajukan", isVisible: true, sortOrder: 11 },
  { id: "blogPreview", type: "blogPreview", title: "Artikel Terbaru", isVisible: true, sortOrder: 12 },
  { id: "cta", type: "cta", isVisible: true, sortOrder: 13 },
];
