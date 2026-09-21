/**
 * Ponto único das contas do dinheiro.
 *
 * Toda a área financeira (cliente e administrativo) usa estas funções para
 * chegar sempre ao mesmo número: valor da fatura, crédito de voucher aplicado,
 * saldo a pagar e situação (paga, a vencer, atrasada ou cancelada).
 */

export { daysUntilDue, dueLabel, isDueSoon, monthLabel, nextMonthOf, DUE_SOON_DAYS } from "./billing";
export { METHOD_LABELS, methodLabel, PAYMENT_CATEGORY_LABELS, receivedByMethod } from "./finance";
export {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_OPTIONS,
  type ApprovalStatus,
} from "./finance";

import { daysUntilDue } from "./billing";

export type Invoice = {
  id: string;
  user_id?: string;
  subscription_id: string | null;
  description: string;
  amount_cents: number;
  voucher_discount_cents: number | null;
  due_date: string;
  paid_at: string | null;
  status: string;
  method: string | null;
  category?: string | null;
  provider?: string | null;
  reference?: string | null;
  checkout_url?: string | null;
};

export type InvoiceState = "paga" | "cancelada" | "atrasada" | "a_vencer";

/** Valor cheio, crédito aplicado e quanto ainda falta pagar. */
export function invoiceTotals(invoice: Pick<Invoice, "amount_cents" | "voucher_discount_cents">) {
  const gross = invoice.amount_cents ?? 0;
  const discount = Math.min(Math.max(invoice.voucher_discount_cents ?? 0, 0), gross);
  return { gross, discount, due: Math.max(gross - discount, 0) };
}

/** Quanto falta pagar nesta fatura (já descontando o voucher). */
export function amountDue(invoice: Pick<Invoice, "amount_cents" | "voucher_discount_cents">) {
  return invoiceTotals(invoice).due;
}

export function invoiceState(invoice: Pick<Invoice, "status" | "due_date">): InvoiceState {
  if (invoice.status === "pago") return "paga";
  if (invoice.status === "cancelada") return "cancelada";
  const days = daysUntilDue(invoice.due_date);
  return days !== null && days < 0 ? "atrasada" : "a_vencer";
}

export const INVOICE_STATE_LABELS: Record<InvoiceState, string> = {
  paga: "Paga",
  cancelada: "Cancelada",
  atrasada: "Atrasada",
  a_vencer: "A vencer",
};

/** Separa as faturas nos três grupos que aparecem nas telas. */
export function groupInvoices<T extends Invoice>(invoices: T[]) {
  const paid: T[] = [];
  const overdue: T[] = [];
  const upcoming: T[] = [];
  const canceled: T[] = [];
  for (const invoice of invoices) {
    const state = invoiceState(invoice);
    if (state === "paga") paid.push(invoice);
    else if (state === "cancelada") canceled.push(invoice);
    else if (state === "atrasada") overdue.push(invoice);
    else upcoming.push(invoice);
  }
  const byDue = (a: T, b: T) => a.due_date.localeCompare(b.due_date);
  return {
    paid: paid.sort((a, b) => (b.paid_at ?? b.due_date).localeCompare(a.paid_at ?? a.due_date)),
    overdue: overdue.sort(byDue),
    upcoming: upcoming.sort(byDue),
    canceled,
    open: [...overdue, ...upcoming].sort(byDue),
  };
}

/** Soma o que falta pagar (ou o que entrou, no caso de faturas pagas). */
export function sumDue(invoices: Array<Pick<Invoice, "amount_cents" | "voucher_discount_cents">>) {
  return invoices.reduce((total, invoice) => total + amountDue(invoice), 0);
}

/** Crédito disponível em vouchers de indicação. */
export function creditBalance(
  vouchers: Array<{ status: string; balance_cents: number }>,
) {
  return vouchers
    .filter((voucher) => voucher.status === "disponivel" && voucher.balance_cents > 0)
    .reduce((total, voucher) => total + voucher.balance_cents, 0);
}

/** A adesão: o primeiro pagamento quitado do contrato. */
export function adhesionOf<T extends Invoice>(invoices: T[], subscriptionId: string): T | null {
  const paid = invoices
    .filter((invoice) => invoice.subscription_id === subscriptionId && invoice.status === "pago")
    .sort((a, b) => (a.paid_at ?? a.due_date).localeCompare(b.paid_at ?? b.due_date));
  return paid[0] ?? null;
}

/** O contrato só libera ordens de serviço depois da aprovação da equipe. */
export function isApproved(subscription: { approval_status?: string | null; status?: string } | null) {
  if (!subscription) return false;
  return (subscription.approval_status ?? "") === "aprovado";
}
