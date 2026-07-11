import type { FAQItem } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQSection({ eyebrow, subtitle, title, data }: { eyebrow?: string; subtitle?: string; title?: string; data: FAQItem[] }) {
  return (
    <section id="faq" className="bg-background">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow={eyebrow ?? "FAQ"}
          title={title ?? "Pertanyaan yang Sering Diajukan"}
          description={subtitle ?? "Jawaban atas pertanyaan yang paling sering ditanyakan calon klien."}
        />

        <div className="mx-auto mt-12 max-w-3xl rounded-[16px] border border-border bg-card">
          <Accordion type="single" collapsible className="w-full">
            {data.map((item, i) => (
              <AccordionItem key={item.id} value={item.id} className={i === data.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="px-6 text-left text-base font-medium text-secondary hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
