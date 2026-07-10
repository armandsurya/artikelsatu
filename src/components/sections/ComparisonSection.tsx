import { Check, X } from "lucide-react";
import type { CompetitorComparison } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value
      ? <Check className="mx-auto h-4 w-4 text-primary" />
      : <X className="mx-auto h-4 w-4 text-muted-foreground" />;
  }
  return <span className="text-sm text-secondary">{value}</span>;
}

export function ComparisonSection({ title, data }: { title?: string; data: CompetitorComparison[] }) {
  return (
    <section id="comparison" className="bg-accent/40 border-y border-border">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow="Perbandingan"
          title={title ?? "Bandingkan dengan Alternatif Lain"}
          description="Lihat perbandingan antara freelancer, AI, agency, dan layanan kami."
        />

        <div className="mx-auto mt-12 max-w-5xl overflow-x-auto rounded-[16px] border border-border bg-card">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-secondary">
                <th className="p-4 text-left font-semibold">Fitur</th>
                <th className="p-4 text-center font-semibold">Freelancer</th>
                <th className="p-4 text-center font-semibold">AI</th>
                <th className="p-4 text-center font-semibold">Agency</th>
                <th className="p-4 text-center font-semibold bg-accent text-primary">Kami</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.feature} className={i !== data.length - 1 ? "border-b border-border" : ""}>
                  <td className="p-4 font-medium text-secondary">{row.feature}</td>
                  <td className="p-4 text-center text-muted-foreground"><Cell value={row.freelancer} /></td>
                  <td className="p-4 text-center text-muted-foreground"><Cell value={row.ai} /></td>
                  <td className="p-4 text-center text-muted-foreground"><Cell value={row.agency} /></td>
                  <td className="p-4 text-center bg-accent/60"><Cell value={row.us} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
