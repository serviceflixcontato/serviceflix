import { jsPDF } from "jspdf";

import {
  ACCEPT_ITEMS,
  CONTRACT_CLOSING,
  CONTRACT_TITLE,
  type ContractFields,
  renderContract,
} from "@/lib/contract";

/** Gera e baixa o contrato preenchido em PDF. */
export function downloadContractPdf(fields: Partial<ContractFields>, fileName?: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  let y = marginTop;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  function write(text: string, options: { bold?: boolean; size?: number; gap?: number } = {}) {
    const size = options.size ?? 10;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    }
    y += options.gap ?? 4;
  }

  write(CONTRACT_TITLE, { bold: true, size: 13, gap: 10 });

  for (const section of renderContract(fields)) {
    if (section.heading) {
      ensureSpace(24);
      y += 6;
      write(section.heading, { bold: true, size: 11, gap: 4 });
    }
    for (const paragraph of section.paragraphs) write(paragraph);
  }

  y += 6;
  write("DECLARAÇÕES DE ACEITE", { bold: true, size: 11 });
  for (const item of ACCEPT_ITEMS) write(`[X] ${item}`);

  y += 6;
  write(`Aceite eletrônico em ${fields.data_hora_aceite ?? "—"} — IP ${fields.ip_aceite ?? "—"}`);
  write(`Versão do contrato: ${fields.versao_contrato ?? "—"}`);
  write(`Identificação da contratação: ${fields.id_contratacao ?? "—"}`);
  y += 6;
  write(CONTRACT_CLOSING, { bold: true });

  doc.save(fileName ?? "contrato-serviceflix.pdf");
}
