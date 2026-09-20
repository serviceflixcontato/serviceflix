import type { ContractFields } from "@/lib/contract";
import { CONTRACT_CLOSING, CONTRACT_TITLE, renderContract } from "@/lib/contract";

/** Contrato completo já preenchido com os dados do cliente e do plano. */
export function ContractText({ fields }: { fields: Partial<ContractFields> }) {
  const sections = renderContract(fields);

  return (
    <article className="space-y-5 text-sm leading-relaxed">
      <h3 className="text-base font-bold uppercase">{CONTRACT_TITLE}</h3>
      {sections.map((section, index) => (
        <section key={section.heading ?? index} className="space-y-2">
          {section.heading ? (
            <h4 className="font-semibold text-foreground">{section.heading}</h4>
          ) : null}
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <p className="font-semibold">{CONTRACT_CLOSING}</p>
    </article>
  );
}
