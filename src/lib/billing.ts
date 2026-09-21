/** Aviso de vencimento: uma semana antes a mensalidade começa a piscar em amarelo. */
export const DUE_SOON_DAYS = 7;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Dias restantes até o vencimento (negativo quando já venceu). */
export function daysUntilDue(dueDate: string | null | undefined) {
  if (!dueDate) return null;
  const parts = dueDate.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return null;
  const due = startOfDay(new Date(parts[0]!, (parts[1]! ?? 1) - 1, parts[2]!));
  const today = startOfDay(new Date());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** Vence em até uma semana (ou já venceu) e ainda não foi pago. */
export function isDueSoon(payment: { due_date: string | null; status: string }) {
  if (payment.status === "pago") return false;
  const days = daysUntilDue(payment.due_date);
  return days !== null && days <= DUE_SOON_DAYS;
}

export function dueLabel(dueDate: string | null | undefined) {
  const days = daysUntilDue(dueDate);
  if (days === null) return "sem data de vencimento";
  if (days < 0) return `vencida há ${Math.abs(days)} dia(s)`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `vence em ${days} dias`;
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Nome do mês da mensalidade, ex.: "outubro de 2026". */
export function monthLabel(dueDate: string | null | undefined) {
  if (!dueDate) return "";
  const parts = dueDate.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3) return "";
  return `${MONTHS[(parts[1]! ?? 1) - 1]} de ${parts[0]}`;
}

/**
 * Adesão: o primeiro pagamento do contrato (a primeira mensalidade quitada).
 * Ela aparece destacada em amarelo na área do cliente.
 */
export function adhesionPaymentOf<
  T extends { subscription_id: string | null; status: string; due_date: string; paid_at: string | null },
>(payments: T[], subscriptionId: string): T | null {
  const paid = payments
    .filter((payment) => payment.subscription_id === subscriptionId && payment.status === "pago")
    .sort((a, b) => (a.paid_at ?? a.due_date).localeCompare(b.paid_at ?? b.due_date));
  return paid[0] ?? null;
}

/** Vencimento seguinte a uma data AAAA-MM-DD (mesmo dia do mês que vem). */
export function nextMonthOf(date: string | null | undefined) {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const base = new Date(Date.UTC(year, month - 1, 1));
  base.setUTCMonth(base.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, lastDay));
  return base.toISOString().slice(0, 10);
}
