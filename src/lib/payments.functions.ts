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
    if (!token) {
      return {
        ok: false as const,
        reason: "not_configured" as const,
        mode,
      };
    }

    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, description, amount_cents, status")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw error;
    if (!payment) throw new Error("Fatura não encontrada.");
    if (payment.status === "pago") throw new Error("Esta fatura já está paga.");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const origin = requestOrigin();
    const preference = await createPreference(mode, token, {
      title: payment.description ?? "Mensalidade Service Flix",
      amountCents: payment.amount_cents,
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
