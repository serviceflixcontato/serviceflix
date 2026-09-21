/**
 * Histórico do cliente: cada coisa importante que acontece na conta dele
 * (contrato assinado, pedido de troca de plano, aprovação, pagamento, valor
 * adicional) vira uma linha simples, em português, visível no painel.
 */

export type ClientEventInput = {
  user_id: string;
  subscription_id?: string | null;
  kind?: string;
  title: string;
  detail?: string | null;
  amount_cents?: number | null;
  method?: string | null;
  created_by?: string | null;
};

export async function logClientEvent(event: ClientEventInput) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("client_events").insert({
      user_id: event.user_id,
      subscription_id: event.subscription_id ?? null,
      kind: event.kind ?? "geral",
      title: event.title,
      detail: event.detail ?? null,
      amount_cents: event.amount_cents ?? null,
      method: event.method ?? null,
      created_by: event.created_by ?? null,
    });
  } catch {
    // O histórico nunca pode impedir a operação principal.
  }
}
