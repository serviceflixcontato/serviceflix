import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONTRACT_VERSION } from "@/lib/contract";

const acceptSchema = z.object({
  plan_slug: z.enum(["basico", "master", "premium", "personalizado", "solar"]),
  plan_name: z.string().trim().min(1).max(80),
  monthly_price_cents: z.number().int().min(0).max(100_000_000).nullable(),
  monthly_price_label: z.string().trim().min(1).max(60),
  periodicity: z.string().trim().min(1).max(40),
  payment_method: z.string().trim().min(1).max(60),
  full_name: z.string().trim().min(3).max(120),
  cpf_cnpj: z.string().trim().min(11).max(25),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(8).max(30),
  address: z.string().trim().min(3).max(160),
  address_number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(60).optional().default(""),
  neighborhood: z.string().trim().min(2).max(80),
  city_uf: z.string().trim().min(2).max(80),
  client_type: z.preprocess(
    (value) => (value === "condominio" ? "condominio" : "residencia"),
    z.enum(["condominio", "residencia"]),
  ),
  fields: z.record(z.string(), z.string()),
  accepted_all: z.literal(true),
  custom_days: z.number().int().min(1).max(31).optional(),
  solar_panels: z.number().int().min(1).max(1000).optional(),
  solar_cleanings: z.number().int().min(1).max(12).optional(),
});

/** Plano personalizado: valor = diária (definida no administrativo) × dias por mês. */
async function resolveCustomPlan(
  supabase: { from: (t: "plan_prices") => any },
  days: number | undefined,
) {
  if (!days) throw new Error("Informe a quantidade de dias do plano personalizado.");
  const { data: price } = await supabase
    .from("plan_prices")
    .select("price_cents")
    .eq("slug", "personalizado")
    .maybeSingle();
  const { customPlanName, customPlanTotal } = await import("@/lib/plans");
  const daily = typeof price?.price_cents === "number" ? price.price_cents : null;
  return {
    name: customPlanName(days),
    amount: daily == null ? null : customPlanTotal(daily, days),
  };
}

/** Flix Solar: mensalidade = (valor por painel × painéis × limpezas/ano) ÷ 12. */
async function resolveSolarPlan(
  supabase: { from: (t: "plan_prices") => any },
  panels: number | undefined,
  cleanings: number | undefined,
) {
  if (!panels || !cleanings) {
    throw new Error("Informe a quantidade de painéis e de limpezas por ano do Flix Solar.");
  }
  const { data: price } = await supabase
    .from("plan_prices")
    .select("price_cents")
    .eq("slug", "solar")
    .maybeSingle();
  const { solarPlanName, solarMonthlyTotal, solarAdesao } = await import("@/lib/plans");
  const perPanel = typeof price?.price_cents === "number" ? price.price_cents : null;
  return {
    name: solarPlanName(panels, cleanings),
    amount: perPanel == null ? null : solarMonthlyTotal(perPanel, panels, cleanings),
    per_panel_cents: perPanel,
    adesao_cents: perPanel == null ? null : solarAdesao(perPanel),
  };
}

/** Aceite do contrato registrado com data, hora, IP e versão. */
export const acceptContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => acceptSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.plan_slug === "personalizado") {
      const custom = await resolveCustomPlan(supabase as never, data.custom_days);
      data.plan_name = custom.name;
      data.monthly_price_cents = custom.amount;
    }
    let solarPerPanelCents: number | null = null;
    let solarAdesaoCents: number | null = null;
    if (data.plan_slug === "solar") {
      const solar = await resolveSolarPlan(supabase as never, data.solar_panels, data.solar_cleanings);
      data.plan_name = solar.name;
      data.monthly_price_cents = solar.amount;
      solarPerPanelCents = solar.per_panel_cents;
      solarAdesaoCents = solar.adesao_cents;
    }
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    const ip =
      forwarded.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const serviceAddress = [
      [data.address, data.address_number].filter(Boolean).join(", "),
      data.complement,
      data.neighborhood,
      data.city_uf,
    ]
      .filter((part) => part && part.trim())
      .join(" – ");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        cpf_cnpj: data.cpf_cnpj,
        email: data.email,
        phone: data.phone,
        address: data.address,
        address_number: data.address_number,
        complement: data.complement || null,
        neighborhood: data.neighborhood,
        city_uf: data.city_uf,
        client_type: data.client_type,
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    // Regra: um contrato por cliente. Só é possível assinar outro se o anterior foi cancelado.
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .neq("status", "cancelada")
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      throw new Error(
        "Você já possui um contrato ativo. Cada cliente pode ter apenas um contrato.",
      );
    }

    const subscriptionPayload = {
      user_id: userId,
      plan_slug: data.plan_slug,
      plan_name: data.plan_name,
      status: "pendente",
      monthly_price_cents: data.monthly_price_cents,
      contract_notes: `Contrato aceito eletronicamente (versão ${CONTRACT_VERSION}).`,
    };

    // Cada aceite gera uma assinatura própria: o cliente pode ter mais de um contrato.
    const { data: created, error: createError } = await supabase
      .from("subscriptions")
      .insert(subscriptionPayload)
      .select("id")
      .single();
    if (createError) throw createError;
    const subscriptionId = created.id;

    const { data: acceptance, error } = await supabase
      .from("contract_acceptances")
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        contract_version: CONTRACT_VERSION,
        plan_slug: data.plan_slug,
        plan_name: data.plan_name,
        monthly_price_cents: data.monthly_price_cents,
        periodicity: data.periodicity,
        payment_method: data.payment_method,
        service_address: serviceAddress,
        full_name: data.full_name,
        cpf_cnpj: data.cpf_cnpj,
        email: data.email,
        phone: data.phone,
        accept_ip: ip,
        user_agent: userAgent,
        fields: {
          ...data.fields,
          ip_aceite: ip ?? "",
          ...(data.plan_slug === "solar"
            ? {
                quantidade_paineis: String(data.solar_panels ?? ""),
                limpezas_ano: String(data.solar_cleanings ?? ""),
                valor_por_painel:
                  solarPerPanelCents != null
                    ? (solarPerPanelCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "",
              }
            : {}),
        },
      })
      .select("id, accepted_at, accept_ip, contract_version")
      .single();
    if (error) throw error;

    const { logClientEvent } = await import("./history.server");
    await logClientEvent({
      user_id: userId,
      subscription_id: subscriptionId,
      kind: "contrato",
      title: `Contrato assinado — plano ${data.plan_name}`,
      detail: `Assinatura eletrônica do contrato (versão ${CONTRACT_VERSION}).`,
      amount_cents: data.monthly_price_cents,
      created_by: userId,
    });

    return { ok: true as const, acceptance };
  });

const changePlanSchema = z.object({
  subscription_id: z.string().uuid(),
  plan_slug: z.enum(["basico", "master", "premium", "personalizado", "solar"]),
  custom_days: z.number().int().min(1).max(31).optional(),
  solar_panels: z.number().int().min(1).max(1000).optional(),
  solar_cleanings: z.number().int().min(1).max(12).optional(),
});

/**
 * Pedido de troca de plano.
 * O plano atual continua valendo e visível. A troca só entra em vigor quando a
 * nossa equipe analisa o pagamento e aprova o contrato no painel administrativo.
 */
export const changeMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => changePlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, plan_slug, plan_name, monthly_price_cents")
      .eq("id", data.subscription_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (subError) throw subError;
    if (!subscription) throw new Error("Contrato não encontrado.");
    if (subscription.plan_slug === data.plan_slug && data.plan_slug !== "personalizado" && data.plan_slug !== "solar") {
      return { ok: true as const, unchanged: true as const };
    }

    const { data: price } = await supabase
      .from("plan_prices")
      .select("price_cents")
      .eq("slug", data.plan_slug)
      .maybeSingle();

    const { PLANS } = await import("@/lib/plans");
    let planName = PLANS.find((plan) => plan.slug === data.plan_slug)?.name ?? data.plan_slug;
    let amount = price?.price_cents ?? null;
    if (data.plan_slug === "personalizado") {
      const custom = await resolveCustomPlan(supabase as never, data.custom_days);
      planName = custom.name;
      amount = custom.amount;
    }
    if (data.plan_slug === "solar") {
      const solar = await resolveSolarPlan(supabase as never, data.solar_panels, data.solar_cleanings);
      planName = solar.name;
      amount = solar.amount;
    }

    // Guarda o pedido; o plano em vigor não muda agora.
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        pending_plan_slug: data.plan_slug,
        pending_plan_name: planName,
        pending_price_cents: amount,
        pending_requested_at: new Date().toISOString(),
        approval_status: "em_analise",
        activation_requested_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);
    if (updateError) throw updateError;

    const { logClientEvent } = await import("./history.server");
    await logClientEvent({
      user_id: userId,
      subscription_id: subscription.id,
      kind: "plano",
      title: `Pedido de troca de plano: ${subscription.plan_name} → ${planName}`,
      detail: "Aguardando análise do pagamento e aprovação da equipe.",
      amount_cents: amount,
      created_by: userId,
    });

    return { ok: true as const, plan_name: planName, amount_cents: amount, pending: true as const };
  });
