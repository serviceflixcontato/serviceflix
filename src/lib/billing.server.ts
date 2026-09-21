/**
 * Controle de vencimento das mensalidades (uso somente no servidor).
 *
 * Regra combinada com o cliente: mês pago é mês que não volta a aparecer para
 * pagamento. Sempre que uma mensalidade é quitada (online, voucher ou baixa
 * manual), a próxima cobrança do contrato passa para o mês seguinte ao mês pago.
 */

/** Soma um mês a uma data AAAA-MM-DD, mantendo o dia quando possível. */
export function addOneMonth(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return date.slice(0, 10);
  const base = new Date(Date.UTC(year, month - 1, 1));
  base.setUTCMonth(base.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
  ).getUTCDate();
  base.setUTCDate(Math.min(day, lastDay));
  return base.toISOString().slice(0, 10);
}

/**
 * Empurra a próxima cobrança do contrato para depois da última mensalidade paga.
 * Assim o mês que o cliente adiantou não aparece novamente para pagamento.
 */
export async function syncNextBilling(subscriptionId: string | null | undefined) {
  if (!subscriptionId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: lastPaid } = await supabaseAdmin
    .from("payments")
    .select("due_date")
    .eq("subscription_id", subscriptionId)
    .eq("category", "mensalidade")
    .eq("status", "pago")
    .order("due_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastDue = lastPaid?.due_date?.slice(0, 10);
  if (!lastDue) return;

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("next_billing_date")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!subscription) return;

  const current = subscription.next_billing_date?.slice(0, 10) ?? null;
  if (current && current > lastDue) return;

  await supabaseAdmin
    .from("subscriptions")
    .update({ next_billing_date: addOneMonth(lastDue) })
    .eq("id", subscriptionId);
}
