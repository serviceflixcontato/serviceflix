/**
 * Ecossistema financeiro Service Flix.
 *
 * Duas ativações diferentes convivem no sistema:
 * 1. Ativação do CADASTRO — os dados do cliente estão completos e conferidos.
 * 2. Ativação do CONTRATO — só acontece depois que a equipe analisa o pagamento
 *    (cartão, Pix, dinheiro, voucher ou uma combinação deles) e aprova.
 * Só o contrato aprovado libera a abertura de ordens de serviço.
 */

export const APPROVAL_STATUS_OPTIONS = [
  "aguardando_pagamento",
  "em_analise",
  "aprovado",
  "cancelado",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS_OPTIONS)[number];

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  em_analise: "Em análise financeira",
  aprovado: "Aprovado e ativo",
  cancelado: "Cancelado",
};

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pendente: "Cadastro pendente",
  ativo: "Cadastro ativo",
};

export const PAYMENT_CATEGORY_LABELS: Record<string, string> = {
  mensalidade: "Mensalidade do plano",
  servico_adicional: "Serviço adicional",
  outro: "Outro lançamento",
};

export const METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  voucher: "Voucher de indicação",
  online: "Pagamento online",
  boleto: "Boleto",
};

export function methodLabel(method: string) {
  return METHOD_LABELS[method] ?? method;
}

type PaymentLike = {
  method?: string | null;
  provider?: string | null;
  voucher_discount_cents?: number | null;
  amount_cents: number;
  status: string;
};

/**
 * Descobre os meios de pagamento realmente usados num contrato.
 * Um mesmo contrato pode combinar meios (ex.: cartão + voucher).
 */
export function paymentMethodsOf(payments: PaymentLike[]): string[] {
  const used = new Set<string>();
  for (const payment of payments) {
    if ((payment.voucher_discount_cents ?? 0) > 0) used.add("voucher");
    const stillDue =
      payment.amount_cents - (payment.voucher_discount_cents ?? 0) > 0 || payment.status === "pago";
    if (!stillDue) continue;
    if (payment.method && payment.method !== "voucher") used.add(payment.method);
    else if (!payment.method && payment.provider === "mercado_pago") used.add("online");
  }
  return [...used];
}

/** Rótulo pronto: "Cartão + Voucher de indicação". */
export function paymentMethodsLabel(payments: PaymentLike[]) {
  const methods = paymentMethodsOf(payments);
  if (methods.length === 0) return "Sem pagamento registrado";
  return methods.map(methodLabel).join(" + ");
}

export function netAmount(payment: { amount_cents: number; voucher_discount_cents?: number | null }) {
  return Math.max(payment.amount_cents - (payment.voucher_discount_cents ?? 0), 0);
}

export function isOverdue(payment: { status: string; due_date: string }) {
  if (payment.status === "pago" || payment.status === "cancelada") return false;
  return new Date(payment.due_date) < new Date(new Date().toISOString().slice(0, 10));
}
