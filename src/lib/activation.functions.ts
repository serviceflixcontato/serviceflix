import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAYMENT_CHOICES = {
  pix: { choice: "online", label: "Pix (Mercado Pago)" },
  cartao: { choice: "online", label: "Cartão de crédito (Mercado Pago)" },
  dinheiro: { choice: "dinheiro", label: "Dinheiro (presencial)" },
} as const;

const chooseSchema = z.object({
  option: z.enum(["pix", "cartao", "dinheiro"]),
  subscription_id: z.string().uuid().optional(),
});

/**
 * Cliente escolhe como quer pagar a primeira mensalidade.
 * A assinatura continua pendente: a ativação é sempre feita pela equipe no painel administrativo.
 */
export const chooseSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => chooseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const selected = PAYMENT_CHOICES[data.option];

    let subQuery = supabase
      .from("subscriptions")
      .select("id, plan_name, monthly_price_cents, status")
      .eq("user_id", userId);
    if (data.subscription_id) subQuery = subQuery.eq("id", data.subscription_id);

    const { data: subscription, error: subError } = await subQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError) throw subError;
    if (!subscription) return { ok: false as const, reason: "no_subscription" as const };

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        payment_method: selected.label,
        payment_choice: selected.choice,
        approval_status: "em_analise",
        activation_requested_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);
    if (updateError) throw updateError;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: openPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("user_id", userId)
      .eq("subscription_id", subscription.id)
      .neq("status", "pago")
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    let paymentId = openPayment?.id ?? null;
    const amount = subscription.monthly_price_cents ?? 0;

    if (!paymentId && amount > 0) {
      const { data: created, error } = await supabaseAdmin
        .from("payments")
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          description: `Primeira mensalidade ${subscription.plan_name}`,
          amount_cents: amount,
          due_date: new Date().toISOString().slice(0, 10),
          status: "pendente",
          method: selected.choice === "online" ? null : selected.choice,
        })
        .select("id")
        .single();
      if (error) throw error;
      paymentId = created.id;
    } else if (paymentId) {
      await supabaseAdmin
        .from("payments")
        .update({ method: selected.choice === "online" ? null : selected.choice })
        .eq("id", paymentId);
    }

    return {
      ok: true as const,
      choice: selected.choice,
      label: selected.label,
      paymentId,
    };
  });

const activateSchema = z.object({
  subscription_id: z.string().uuid(),
  next_billing_date: z.string().min(8).max(10).nullable().optional(),
  contract_number: z.string().trim().max(60).nullable().optional(),
});

/** Equipe ativa a conta do cliente depois de analisar o contrato assinado e o pagamento. */
export const activateSubscriptionFromContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem ativar contas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date();
    const next = new Date(today);
    next.setMonth(next.getMonth() + 1);

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "ativa",
        approval_status: "aprovado",
        approved_at: new Date().toISOString(),
        started_at: today.toISOString().slice(0, 10),
        next_billing_date: data.next_billing_date ?? next.toISOString().slice(0, 10),
        ...(data.contract_number ? { contract_number: data.contract_number } : {}),
      })
      .eq("id", data.subscription_id);
    if (error) throw error;

    return { ok: true as const };
  });
