import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const modeSchema = z.object({ mode: z.enum(["sandbox", "live"]) });

function requestOrigin() {
  const url = new URL(getRequest().url);
  return `${url.protocol}//${url.host}`;
}

/** Modo atual (teste/produção) + quais Access Tokens já estão configurados. */
export const getPaymentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { tokenStatus } = await import("./mercadopago.server");
    const { data, error } = await context.supabase
      .from("payment_settings")
      .select("provider, mode, updated_at")
      .eq("provider", "mercado_pago")
      .maybeSingle();
    if (error) throw error;

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const status = tokenStatus();
    const mode = (data?.mode ?? "sandbox") as "sandbox" | "live";

    return {
      provider: "mercado_pago" as const,
      mode,
      updatedAt: data?.updated_at ?? null,
      isAdmin: Boolean(isAdmin),
      sandboxConfigured: status.sandboxConfigured,
      liveConfigured: status.liveConfigured,
      ready: mode === "live" ? status.liveConfigured : status.sandboxConfigured,
    };
  });

/** Alterna entre teste e produção (somente administradores; RLS garante). */
export const setPaymentMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => modeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("payment_settings")
      .update({ mode: data.mode })
      .eq("provider", "mercado_pago")
      .select("mode")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Apenas administradores podem alterar o modo de pagamento.");
    return { mode: updated.mode as "sandbox" | "live" };
  });

async function loadContext(supabase: {
  from: (table: string) => any;
  rpc?: unknown;
}) {
  const { data } = await supabase
    .from("payment_settings")
    .select("mode")
    .eq("provider", "mercado_pago")
    .maybeSingle();
  return (data?.mode ?? "sandbox") as "sandbox" | "live";
}

/** Gera o link de pagamento avulso (Pix, boleto ou cartão) de uma fatura. */
export const createInvoiceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getAccessToken, createPreference } = await import("./mercadopago.server");

    const mode = await loadContext(context.supabase as never);
    const token = getAccessToken(mode);
    // Sem credenciais em modo teste, o site abre um checkout simulado para
    // conferir todo o fluxo sem cobrar nada de verdade.
    if (!token && mode === "live") {
      return {
        ok: false as const,
        reason: "not_configured" as const,
        mode,
      };
    }

    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, description, amount_cents, voucher_discount_cents, status")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw error;
    if (!payment) throw new Error("Fatura não encontrada.");
    if (payment.status === "pago") throw new Error("Esta fatura já está paga.");

    // O crédito do voucher já abatido não vai para o checkout: o cliente paga só a diferença.
    const dueCents = Math.max(payment.amount_cents - (payment.voucher_discount_cents ?? 0), 0);
    if (dueCents <= 0) return { ok: false as const, reason: "nothing_due" as const, mode };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const origin = requestOrigin();

    if (!token) {
      const simulatedUrl = `${origin}/painel/pagamento-teste?fatura=${payment.id}`;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("payments")
        .update({
          provider: "mercado_pago",
          provider_mode: "simulado",
          checkout_url: simulatedUrl,
        })
        .eq("id", payment.id)
        .eq("user_id", context.userId);
      return { ok: true as const, mode, simulated: true as const, checkoutUrl: simulatedUrl };
    }

    const preference = await createPreference(mode, token, {
      title: payment.description ?? "Mensalidade Service Flix",
      amountCents: dueCents,
      externalReference: payment.id,
      payerEmail: profile?.email ?? null,
      origin,
      notificationUrl: `${origin}/api/public/mercadopago-webhook`,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("payments")
      .update({
        provider: "mercado_pago",
        provider_mode: mode,
        checkout_url: preference.checkoutUrl,
        reference: preference.id,
      })
      .eq("id", payment.id)
      .eq("user_id", context.userId);

    return { ok: true as const, mode, checkoutUrl: preference.checkoutUrl };
  });

/** Gera o link da assinatura recorrente mensal do plano contratado. */
export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccessToken, createPreapproval } = await import("./mercadopago.server");

    const mode = await loadContext(context.supabase as never);
    const token = getAccessToken(mode);
    if (!token) return { ok: false as const, reason: "not_configured" as const, mode };

    const { data: subscription, error } = await context.supabase
      .from("subscriptions")
      .select("id, plan_name, monthly_price_cents")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!subscription?.monthly_price_cents) {
      return { ok: false as const, reason: "no_subscription" as const, mode };
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.email) return { ok: false as const, reason: "no_email" as const, mode };

    const result = await createPreapproval(mode, token, {
      reason: `${subscription.plan_name} · Service Flix`,
      amountCents: subscription.monthly_price_cents,
      externalReference: subscription.id,
      payerEmail: profile.email,
      origin: requestOrigin(),
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({
        provider: "mercado_pago",
        provider_mode: mode,
        provider_subscription_id: result.id,
      })
      .eq("id", subscription.id)
      .eq("user_id", context.userId);

    return { ok: true as const, mode, checkoutUrl: result.checkoutUrl };
  });

/**
 * Gera (ou reaproveita) a fatura da mensalidade que está para vencer, para o
 * cliente adiantar o pagamento e/ou abater com voucher.
 */
export const createUpcomingInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subscription_id: z.string().uuid(), due_date: z.string().min(8) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: subscription, error } = await context.supabase
      .from("subscriptions")
      .select("id, plan_name, monthly_price_cents, status")
      .eq("id", data.subscription_id)
      .maybeSingle();
    if (error) throw error;
    if (!subscription) throw new Error("Assinatura não encontrada.");
    if (!subscription.monthly_price_cents) {
      return { ok: false as const, reason: "no_price" as const };
    }

    const dueDate = data.due_date.slice(0, 10);

    const { data: existing } = await context.supabase
      .from("payments")
      .select("id, status")
      .eq("subscription_id", subscription.id)
      .eq("due_date", dueDate)
      .maybeSingle();
    if (existing) {
      return { ok: true as const, paymentId: existing.id, created: false, status: existing.status };
    }

    const month = dueDate.slice(0, 7).split("-").reverse().join("/");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: context.userId,
        subscription_id: subscription.id,
        description: `Mensalidade ${month} · ${subscription.plan_name}`,
        amount_cents: subscription.monthly_price_cents,
        due_date: dueDate,
        status: "pendente",
      })
      .select("id, status")
      .single();
    if (insertError) throw insertError;

    return { ok: true as const, paymentId: created.id, created: true, status: created.status };
  });

const declareSchema = z.object({
  payment_id: z.string().uuid(),
  method: z.enum(["pix", "dinheiro", "transferencia"]),
  note: z.string().trim().max(200).optional(),
});

/**
 * Cliente avisa que pagou fora do site (Pix, dinheiro ou transferência).
 * A fatura continua em aberto até a equipe dar baixa no painel administrativo.
 */
export const declareOfflinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => declareSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: invoice, error: findError } = await context.supabase
      .from("payments")
      .select("id, status")
      .eq("id", data.payment_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (findError) throw findError;
    if (!invoice) return { ok: false as const, reason: "not_found" as const };
    if (invoice.status === "pago") return { ok: false as const, reason: "already_paid" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        method: data.method,
        reference: data.note
          ? `Cliente informou pagamento (${data.method}): ${data.note}`
          : `Cliente informou pagamento por ${data.method}`,
      })
      .eq("id", data.payment_id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true as const };
  });


/**
 * Checkout simulado: usado só enquanto o Mercado Pago não está configurado.
 * Marca a fatura como recebida e deixa o contrato aguardando a aprovação da equipe,
 * exatamente como acontece com um pagamento online real.
 */
export const simulateOnlinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getAccessToken } = await import("./mercadopago.server");
    const mode = await loadContext(context.supabase as never);
    if (getAccessToken(mode)) {
      throw new Error("O Mercado Pago está configurado: o pagamento simulado está desativado.");
    }

    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, subscription_id, status, amount_cents, voucher_discount_cents")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!payment) throw new Error("Fatura não encontrada.");
    if (payment.status === "pago") return { ok: true as const, already: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: payError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
        method: "online",
        provider: "mercado_pago",
        provider_mode: "simulado",
        provider_payment_id: `SIMULADO-${payment.id.slice(0, 8)}`,
      })
      .eq("id", payment.id);
    if (payError) throw payError;

    if (payment.subscription_id) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          approval_status: "em_analise",
          payment_method: "Pagamento online (Mercado Pago)",
          payment_choice: "online",
          activation_requested_at: new Date().toISOString(),
        })
        .eq("id", payment.subscription_id);

      const { syncNextBilling } = await import("./billing.server");
      await syncNextBilling(payment.subscription_id);
    }

    return { ok: true as const };
  });
