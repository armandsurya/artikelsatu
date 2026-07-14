import type { WorkflowStep } from "@/types";

export const workflow: WorkflowStep[] = [
  {
    id: "w1",
    stepNumber: 1,
    title: "Brief & Konsultasi",
    description: "Diskusi kebutuhan, target pembaca, dan tujuan konten Anda.",
  },
  {
    id: "w2",
    stepNumber: 2,
    title: "Riset Kata Kunci",
    description: "Menentukan keyword utama dan turunan yang relevan.",
  },
  {
    id: "w3",
    stepNumber: 3,
    title: "Penulisan Artikel",
    description: "Ditulis oleh penulis berpengalaman sesuai kaidah SEO.",
  },
  {
    id: "w4",
    stepNumber: 4,
    title: "Editing & QC",
    description: "Diperiksa editor untuk memastikan kualitas dan keakuratan.",
  },
  {
    id: "w5",
    stepNumber: 5,
    title: "Pengiriman",
    description: "Artikel dikirim siap publish beserta laporan.",
  },
];
