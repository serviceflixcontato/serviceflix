import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(72),
});

const referralUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pendente", "em_negociacao", "contratado", "nao_convertido"]),
  reward_status: z.enum(["aguardando", "liberada", "paga"]),
});

/**
 * Login administrativo da equipe Service Flix (usuário + senha fixos).
 * A conta de acesso é criada/atualizada no primeiro login e recebe o papel de admin.
 */
export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, adminAuthEmail, adminAuthPassword } = await import(
      "./admin.server"
    );

    if (
      data.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase() ||
      data.password !== ADMIN_PASSWORD
    ) {
      return { ok: false as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = adminAuthEmail();
    const password = adminAuthPassword();

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((user) => user.email?.toLowerCase() === email);

    let userId = existing?.id ?? null;
    if (userId) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Equipe Service Flix" },
      });
      if (error || !created.user) throw new Error("Não foi possível preparar o acesso admin.");
      userId = created.user.id;
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    return { ok: true as const, email, authPassword: password };
  });

/** Painel administrativo: clientes, assinaturas, faturas, OS e indicações. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, subscriptions, payments, requests, orders, referrals, leads, contracts] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "id, full_name, email, phone, address, address_number, complement, neighborhood, city_uf, cpf_cnpj, client_type, registration_status, registration_activated_at, created_at, updated_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("subscriptions")
          .select(
            "id, user_id, plan_slug, plan_name, status, approval_status, approved_at, approval_notes, monthly_price_cents, started_at, next_billing_date, contract_number, contract_notes, payment_method, payment_choice, activation_requested_at, created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("payments")
          .select(
            "id, user_id, subscription_id, description, amount_cents, voucher_discount_cents, due_date, paid_at, status, method, category, reference, provider, created_at",
          )

          .order("due_date", { ascending: false }),
        supabaseAdmin
          .from("service_requests")
          .select(
            "id, user_id, request_code, title, category, urgency, status, location, description, created_at, materials_needed, scheduled_at, scheduled_technician, provider_id, provider_name, provider_role, provider_photo_url, team_message, schedule_status, client_response_note, client_responded_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("work_orders")
          .select(
            "id, user_id, request_id, os_number, title, description, technician, provider_id, provider_name, provider_role, provider_photo_url, scheduled_for, completed_at, hours_spent, status",
          )
          .order("scheduled_for", { ascending: false }),
        supabaseAdmin.from("referrals").select("*").order("created_at", { ascending: false }),
        supabaseAdmin
          .from("contact_leads")
          .select("id, name, email, phone, property_type, plan_interest, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("contract_acceptances")
          .select(
            "id, user_id, subscription_id, contract_code, full_name, cpf_cnpj, email, phone, plan_name, plan_slug, monthly_price_cents, periodicity, payment_method, service_address, contract_version, accepted_at, accept_ip, fields",
          )
          .order("accepted_at", { ascending: false }),
      ]);

    const events = await supabaseAdmin
      .from("client_events")
      .select("id, user_id, subscription_id, kind, title, detail, amount_cents, method, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    // Só a conta técnica de acesso administrativo fica fora da relação de clientes.
    const clientProfiles = (profiles.data ?? []).filter(
      (profile) => !(profile.email ?? "").toLowerCase().endsWith("@admin.serviceflix.local"),
    );

    return {
      ok: true as const,
      profiles: clientProfiles,
      subscriptions: subscriptions.data ?? [],
      payments: payments.data ?? [],
      requests: requests.data ?? [],
      orders: orders.data ?? [],
      referrals: referrals.data ?? [],
      leads: leads.data ?? [],
      contracts: contracts.data ?? [],
      events: events.data ?? [],
    };
  });

/** Atualiza a situação de uma indicação e da recompensa. */
export const updateReferralStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => referralUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("referrals")
      .update({ status: data.status, reward_status: data.reward_status })
      .eq("id", data.id)
      .select("id, referrer_id, reward_cents, reward_method")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Apenas administradores podem atualizar indicações.");

    // Recompensa liberada + cliente escolheu voucher => gera o crédito automaticamente.
    if (
      updated.reward_method === "voucher" &&
      (data.reward_status === "liberada" || data.reward_status === "paga") &&
      (updated.reward_cents ?? 0) > 0
    ) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: existing } = await supabaseAdmin
        .from("vouchers")
        .select("id")
        .eq("referral_id", updated.id)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("vouchers").insert({
          user_id: updated.referrer_id,
          referral_id: updated.id,
          amount_cents: updated.reward_cents,
          balance_cents: updated.reward_cents,
          status: "disponivel",
          note: "Crédito de indicação Service Flix",
        });
      }
    }

    return { ok: true as const };
  });

const manualPlanSchema = z.object({
  user_id: z.string().uuid(),
  plan_slug: z.enum(["basico", "master", "premium", "personalizado"]),
  plan_name: z.string().trim().min(1).max(80),
  monthly_price_cents: z.number().int().min(0).max(100_000_000),
  status: z.enum(["ativa", "pendente", "suspensa", "cancelada"]).default("ativa"),
  started_at: z.string().min(8).max(10),
  next_billing_date: z.string().min(8).max(10).nullable().optional(),
  contract_number: z.string().trim().max(60).nullable().optional(),
  contract_notes: z.string().trim().max(500).nullable().optional(),
  register_cash_payment: z.boolean().default(false),
  payment_method: z.enum(["online", "dinheiro", "pix"]).default("dinheiro"),
});

/** Ativa (ou atualiza) manualmente o plano de um cliente — inclui pagamento em dinheiro. */
export const activatePlanManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => manualPlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem ativar planos.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const METHOD_LABELS: Record<string, string> = {
      online: "Online — Mercado Pago",
      dinheiro: "Dinheiro",
      pix: "Pix",
    };

    const contractMethod = METHOD_CONTRACT_LABELS[data.payment_method] ?? data.payment_method;
    const isActive = data.status === "ativa";

    const payload = {
      user_id: data.user_id,
      plan_slug: data.plan_slug,
      plan_name: data.plan_name,
      status: data.status,
      monthly_price_cents: data.monthly_price_cents,
      started_at: data.started_at,
      next_billing_date: data.next_billing_date ?? null,
      contract_number: data.contract_number ?? null,
      contract_notes: data.contract_notes ?? null,
      payment_method: contractMethod,
      provider: data.payment_method === "online" ? "mercado_pago" : "manual",
      provider_mode: data.payment_method === "online" ? "online" : "manual",
      // Ativação manual já vale como análise financeira concluída pela equipe:
      // libera as ordens de serviço na área do cliente.
      approval_status: isActive ? "aprovado" : "aguardando_pagamento",
      approved_at: isActive ? new Date().toISOString() : null,
    };

    // Um contrato por cliente: se já existir um contrato não cancelado, ele é
    // atualizado com o novo plano em vez de criar outro.
    const { data: current } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan_name")
      .eq("user_id", data.user_id)
      .neq("status", "cancelada")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let subscriptionId: string;
    if (current) {
      const { error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          ...payload,
          pending_plan_slug: null,
          pending_plan_name: null,
          pending_price_cents: null,
          pending_requested_at: null,
        })
        .eq("id", current.id);
      if (updateError) throw updateError;
      subscriptionId = current.id;
    } else {
      const { data: created, error: createError } = await supabaseAdmin
        .from("subscriptions")
        .insert(payload)
        .select("id")
        .single();
      if (createError) throw createError;
      subscriptionId = created.id;
    }

    if (data.register_cash_payment && data.monthly_price_cents > 0) {
      const { error } = await supabaseAdmin.from("payments").insert({
        user_id: data.user_id,
        subscription_id: subscriptionId,
        description: `Mensalidade ${data.plan_name} (${METHOD_LABELS[data.payment_method]})`,
        amount_cents: data.monthly_price_cents,
        due_date: data.started_at,
        paid_at: new Date().toISOString(),
        status: "pago",
        method: data.payment_method,
        provider: data.payment_method === "online" ? "mercado_pago" : "manual",
        provider_mode: data.payment_method === "online" ? "online" : "manual",
      });
      if (error) throw error;

      // Mês já recebido não volta a aparecer para pagamento do cliente.
      const { syncNextBilling } = await import("./billing.server");
      await syncNextBilling(subscriptionId);
    }

    // Vincula o contrato assinado (se ainda estiver solto) e registra nele a
    // forma de pagamento usada, para aparecer na área do cliente e no caixa.
    const { data: contract } = await supabaseAdmin
      .from("contract_acceptances")
      .select("id")
      .eq("user_id", data.user_id)
      .is("subscription_id", null)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contract) {
      await supabaseAdmin
        .from("contract_acceptances")
        .update({ subscription_id: subscriptionId, payment_method: contractMethod })
        .eq("id", contract.id);
    }

    const { logClientEvent } = await import("./history.server");
    await logClientEvent({
      user_id: data.user_id,
      subscription_id: subscriptionId,
      kind: "plano",
      title: `Plano ${data.plan_name} ativado pela equipe`,
      detail: data.register_cash_payment
        ? `Pagamento registrado como ${METHOD_LABELS[data.payment_method]}.`
        : "Ativação manual sem registro de pagamento.",
      amount_cents: data.monthly_price_cents,
      method: data.payment_method,
      created_by: context.userId,
    });

    return { ok: true as const, subscription_id: subscriptionId };
  });

const paymentStatusSchema = z.object({
  payment_id: z.string().uuid(),
  status: z.enum(["pago", "pendente", "atrasado", "cancelada"]),
  method: z.string().trim().max(40).nullable().optional(),
  /** Data em que o dinheiro/Pix entrou (AAAA-MM-DD). Vazio = agora. */
  paid_on: z.string().trim().min(8).max(10).nullable().optional(),
  /** Observação da baixa: comprovante, quem recebeu etc. */
  reference: z.string().trim().max(200).nullable().optional(),
});

/** Marca uma fatura como paga (ex.: recebida em dinheiro) ou volta para pendente. */
export const setPaymentStatusManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem alterar pagamentos.");

    const paidAt =
      data.status === "pago"
        ? data.paid_on
          ? new Date(`${data.paid_on}T12:00:00`).toISOString()
          : new Date().toISOString()
        : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: data.status,
        method: data.method ?? (data.status === "pago" ? "dinheiro" : null),
        paid_at: paidAt,
        ...(data.reference !== undefined ? { reference: data.reference || null } : {}),
      })
      .eq("id", data.payment_id);
    if (error) throw error;

    // Mês pago (inclusive adiantado) não volta a aparecer para pagamento.
    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("subscription_id, user_id, description, amount_cents")
      .eq("id", data.payment_id)
      .maybeSingle();
    const { syncNextBilling } = await import("./billing.server");
    await syncNextBilling(row?.subscription_id ?? null);

    if (row?.user_id) {
      const { logClientEvent } = await import("./history.server");
      await logClientEvent({
        user_id: row.user_id,
        subscription_id: row.subscription_id,
        kind: "pagamento",
        title:
          data.status === "pago"
            ? `Pagamento recebido — ${row.description}`
            : `Fatura marcada como ${data.status} — ${row.description}`,
        detail: data.reference || null,
        amount_cents: row.amount_cents,
        method: data.method ?? (data.status === "pago" ? "dinheiro" : null),
        created_by: context.userId,
      });
    }


    return { ok: true as const };
  });


const subscriptionStatusSchema = z.object({
  subscription_id: z.string().uuid(),
  status: z.enum(["ativa", "pendente", "suspensa", "cancelada"]),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Apenas administradores podem fazer esta alteração.");
}

/** Ativa ou desativa (suspende/cancela) a assinatura de um cliente manualmente. */
export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscriptionStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date();
    const next = new Date(today);
    next.setMonth(next.getMonth() + 1);

    const patch =
      data.status === "ativa"
        ? {
            status: data.status,
            started_at: today.toISOString().slice(0, 10),
            next_billing_date: next.toISOString().slice(0, 10),
          }
        : { status: data.status };

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(patch)
      .eq("id", data.subscription_id);
    if (error) throw error;
    return { ok: true as const };
  });

const subscriptionEditSchema = z.object({
  subscription_id: z.string().uuid(),
  plan_slug: z.enum(["basico", "master", "premium", "personalizado"]),
  plan_name: z.string().trim().min(1).max(80),
  monthly_price_cents: z.number().int().min(0).max(100_000_000),
  status: z.enum(["ativa", "pendente", "suspensa", "cancelada"]),
  started_at: z.string().min(8).max(10).nullable().optional(),
  next_billing_date: z.string().min(8).max(10).nullable().optional(),
  contract_number: z.string().trim().max(60).nullable().optional(),
  contract_notes: z.string().trim().max(500).nullable().optional(),
});

/** Edita os dados da assinatura/contrato de um cliente. */
export const updateSubscriptionDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscriptionEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { subscription_id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        ...rest,
        started_at: rest.started_at || null,
        next_billing_date: rest.next_billing_date || null,
        contract_number: rest.contract_number || null,
        contract_notes: rest.contract_notes || null,
      })
      .eq("id", subscription_id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Exclui a assinatura de um cliente (e as faturas ligadas a ela). */
export const deleteSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subscription_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").delete().eq("subscription_id", data.subscription_id);
    await supabaseAdmin
      .from("contract_acceptances")
      .update({ subscription_id: null })
      .eq("subscription_id", data.subscription_id);
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("id", data.subscription_id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Exclui um contrato assinado do histórico. */
export const deleteContractAcceptance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ contract_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("contract_acceptances")
      .delete()
      .eq("id", data.contract_id);
    if (error) throw error;
    return { ok: true as const };
  });

const contractEditSchema = z.object({
  contract_id: z.string().uuid(),
  plan_name: z.string().trim().min(1).max(80),
  monthly_price_cents: z.number().int().min(0).max(100_000_000),
  periodicity: z.string().trim().min(1).max(40),
  payment_method: z.string().trim().min(1).max(60),
  service_address: z.string().trim().min(1).max(300),
});

/** Corrige dados de um contrato assinado (plano, valor, periodicidade, pagamento, endereço). */
export const updateContractAcceptance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => contractEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { contract_id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("contract_acceptances")
      .update(rest)
      .eq("id", contract_id);
    if (error) throw error;
    return { ok: true as const };
  });

const scheduleSchema = z.object({
  request_id: z.string().uuid(),
  scheduled_at: z.string().min(10).max(40),
  scheduled_technician: z.string().trim().max(120).optional(),
  provider_id: z.string().uuid().nullable().optional(),
  materials_needed: z.string().trim().max(1500).optional(),
  team_message: z.string().trim().max(1500).optional(),
});

/**
 * Equipe responde a solicitação do cliente: descreve o material necessário,
 * marca dia e hora da visita e envia a confirmação para a área do cliente.
 */
export const scheduleServiceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Guarda foto, nome e função do profissional na própria solicitação,
    // para o cliente ver quem vai atender.
    const provider = await providerSnapshot(data.provider_id);
    const { error } = await supabaseAdmin
      .from("service_requests")
      .update({
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        scheduled_technician: provider.provider_name ?? data.scheduled_technician ?? null,
        ...provider,
        materials_needed: data.materials_needed || null,
        team_message: data.team_message || null,
        schedule_status: "aguardando_confirmacao",
        status: "agendada",
        client_response_note: null,
        client_responded_at: null,
      })
      .eq("id", data.request_id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Código no padrão OS123456SF. */
function generateOsNumber() {
  const digits = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  return `OS${digits}SF`;
}

const workOrderCreateSchema = z.object({
  user_id: z.string().uuid(),
  request_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1500).optional(),
  technician: z.string().trim().max(80).optional(),
  provider_id: z.string().uuid().nullable().optional(),
  scheduled_for: z.string().min(10).max(40).nullable().optional(),
});

/** Dados públicos do prestador que ficam guardados na OS (o cliente vê isso). */
async function providerSnapshot(providerId: string | null | undefined) {
  if (!providerId) {
    return { provider_id: null, provider_name: null, provider_role: null, provider_photo_url: null };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("service_providers")
    .select("id, full_name, role, photo_url")
    .eq("id", providerId)
    .maybeSingle();
  if (!data) {
    return { provider_id: null, provider_name: null, provider_role: null, provider_photo_url: null };
  }
  return {
    provider_id: data.id,
    provider_name: data.full_name,
    provider_role: data.role,
    provider_photo_url: data.photo_url,
  };
}

/** Cria uma ordem de serviço para um cliente (com ou sem solicitação vinculada). */
export const createWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workOrderCreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Quando a OS nasce de uma solicitação do cliente, ela herda o código
    // gerado na solicitação (OS123456SF) para os dois lados ficarem ligados.
    let osNumber = generateOsNumber();
    let inheritedProviderId: string | null = null;
    if (data.request_id) {
      const { data: request } = await supabaseAdmin
        .from("service_requests")
        .select("request_code, provider_id")
        .eq("id", data.request_id)
        .maybeSingle();
      if (request?.request_code) osNumber = request.request_code;
      inheritedProviderId = request?.provider_id ?? null;
    }

    // Se a OS não indicar profissional, usa o que já foi escolhido na solicitação.
    const provider = await providerSnapshot(data.provider_id ?? inheritedProviderId);

    const { error } = await supabaseAdmin.from("work_orders").insert({
      user_id: data.user_id,
      request_id: data.request_id ?? null,
      os_number: osNumber,
      title: data.title,
      description: data.description || null,
      technician: provider.provider_name ?? data.technician ?? null,
      ...provider,
      scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString() : null,
      status: "agendada",
    });
    if (error) throw error;
    return { ok: true as const };
  });

const workOrderEditSchema = z.object({
  order_id: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1500).optional(),
  technician: z.string().trim().max(80).optional(),
  provider_id: z.string().uuid().nullable().optional(),
  scheduled_for: z.string().min(10).max(40).nullable().optional(),
});

/** Edita os dados de uma OS (serviço, profissional, data e hora da visita). */
export const updateWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workOrderEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { order_id, ...rest } = data;
    const provider = await providerSnapshot(rest.provider_id);
    const { error } = await supabaseAdmin
      .from("work_orders")
      .update({
        title: rest.title,
        description: rest.description || null,
        technician: provider.provider_name ?? rest.technician ?? null,
        ...provider,
        scheduled_for: rest.scheduled_for ? new Date(rest.scheduled_for).toISOString() : null,
      })
      .eq("id", order_id);
    if (error) throw error;
    return { ok: true as const };
  });

const workOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["agendada", "em_andamento", "concluida", "cancelada"]),
  hours_spent: z.number().min(0).max(1000).nullable().optional(),
});

/** Muda a situação da OS; ao concluir, registra data/hora e horas trabalhadas. */
export const setWorkOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workOrderStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("work_orders")
      .update({
        status: data.status,
        completed_at: data.status === "concluida" ? new Date().toISOString() : null,
        hours_spent:
          data.status === "concluida" ? (data.hours_spent ?? null) : null,
      })
      .eq("id", data.order_id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Exclui uma OS registrada por engano. */
export const deleteWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("work_orders").delete().eq("id", data.order_id);
    if (error) throw error;
    return { ok: true as const };
  });

const requestStatusSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["aberta", "em_analise", "agendada", "em_andamento", "concluida", "cancelada"]),
});

/** Atualiza a situação de uma solicitação (em análise, em andamento, concluída...). */
export const setServiceRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => requestStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("service_requests")
      .update({ status: data.status })
      .eq("id", data.request_id);
    if (error) throw error;
    return { ok: true as const };
  });

const referralReceiptSchema = z.object({
  id: z.string().uuid(),
  storage_path: z.string().trim().min(3).max(400),
  note: z.string().trim().max(400).optional().default(""),
});

/** Registra o comprovante de pagamento da recompensa e marca a recompensa como paga. */
export const saveReferralReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => referralReceiptSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("referrals")
      .update({
        reward_receipt_path: data.storage_path,
        reward_receipt_note: data.note.trim() || null,
        reward_paid_at: new Date().toISOString(),
        reward_status: "paga",
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

// ===========================================================================
// Ecossistema financeiro: ativação do cadastro x aprovação do contrato
// ===========================================================================

const approvalSchema = z.object({
  subscription_id: z.string().uuid(),
  approval_status: z.enum(["aguardando_pagamento", "em_analise", "aprovado", "cancelado"]),
  approval_notes: z.string().trim().max(500).nullable().optional(),
  /** Meio realmente usado no pagamento da adesão, informado pela equipe na ativação. */
  payment_method: z
    .enum(["pix", "dinheiro", "cartao", "transferencia", "voucher", "online"])
    .nullable()
    .optional(),
  /** Data em que o valor entrou (AAAA-MM-DD). */
  paid_on: z.string().trim().min(8).max(10).nullable().optional(),
});

const METHOD_CONTRACT_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro (presencial)",
  cartao: "Cartão de crédito",
  transferencia: "Transferência bancária",
  voucher: "Voucher de indicação",
  online: "Pagamento online (Mercado Pago)",
};

/**
 * Análise financeira do contrato feita pela equipe.
 * "aprovado" é o único estado que ativa o contrato e libera as ordens de serviço.
 */
export const setSubscriptionApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => approvalSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date();
    const next = new Date(today);
    next.setMonth(next.getMonth() + 1);

    const patch: {
      approval_status: string;
      approval_notes: string | null;
      status?: string;
      approved_at?: string | null;
      started_at?: string;
      next_billing_date?: string;
      plan_slug?: string;
      plan_name?: string;
      monthly_price_cents?: number | null;
      pending_plan_slug?: string | null;
      pending_plan_name?: string | null;
      pending_price_cents?: number | null;
      pending_requested_at?: string | null;
    } = {
      approval_status: data.approval_status,
      approval_notes: data.approval_notes ?? null,
    };

    // Troca de plano pedida pelo cliente: só entra em vigor com a aprovação.
    const { data: pendingRow } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan_name, pending_plan_slug, pending_plan_name, pending_price_cents")
      .eq("id", data.subscription_id)
      .maybeSingle();
    const hasPendingPlan = Boolean(pendingRow?.pending_plan_slug);

    if (data.approval_status === "aprovado" && hasPendingPlan) {
      patch.plan_slug = pendingRow!.pending_plan_slug!;
      patch.plan_name = pendingRow!.pending_plan_name ?? pendingRow!.pending_plan_slug!;
      patch.monthly_price_cents = pendingRow!.pending_price_cents ?? null;
      patch.pending_plan_slug = null;
      patch.pending_plan_name = null;
      patch.pending_price_cents = null;
      patch.pending_requested_at = null;
    }
    if (data.approval_status === "cancelado" && hasPendingPlan) {
      patch.pending_plan_slug = null;
      patch.pending_plan_name = null;
      patch.pending_price_cents = null;
      patch.pending_requested_at = null;
    }

    if (data.approval_status === "aprovado") {
      patch.status = "ativa";
      patch.approved_at = new Date().toISOString();
      patch.started_at = today.toISOString().slice(0, 10);
      patch.next_billing_date = next.toISOString().slice(0, 10);
    } else if (data.approval_status === "cancelado") {
      patch.status = "cancelada";
      patch.approved_at = null;
    } else {
      patch.status = "pendente";
      patch.approved_at = null;
    }

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(patch)
      .eq("id", data.subscription_id);
    if (error) throw error;

    const { logClientEvent } = await import("./history.server");
    if (pendingRow?.user_id) {
      const statusTitle: Record<string, string> = {
        aprovado: "Contrato aprovado e ativo",
        cancelado: "Contrato cancelado",
        em_analise: "Contrato em análise financeira",
        aguardando_pagamento: "Contrato aguardando pagamento",
      };
      await logClientEvent({
        user_id: pendingRow.user_id,
        subscription_id: data.subscription_id,
        kind: "contrato",
        title: statusTitle[data.approval_status] ?? data.approval_status,
        detail: data.approval_notes ?? null,
        method: data.payment_method ?? null,
        created_by: context.userId,
      });

      if (data.approval_status === "aprovado" && hasPendingPlan) {
        const newName = patch.plan_name ?? "";
        await logClientEvent({
          user_id: pendingRow.user_id,
          subscription_id: data.subscription_id,
          kind: "plano",
          title: `Plano alterado: ${pendingRow.plan_name} → ${newName}`,
          detail: "Troca aprovada pela equipe após a análise do pagamento.",
          amount_cents: patch.monthly_price_cents ?? null,
          created_by: context.userId,
        });

        // A próxima fatura em aberto passa a ter o valor do novo plano.
        if ((patch.monthly_price_cents ?? 0) > 0) {
          const { data: open } = await supabaseAdmin
            .from("payments")
            .select("id")
            .eq("subscription_id", data.subscription_id)
            .neq("status", "pago")
            .neq("status", "cancelada")
            .order("due_date", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (open?.id) {
            await supabaseAdmin
              .from("payments")
              .update({
                amount_cents: patch.monthly_price_cents!,
                description: `Mensalidade ${newName}`,
              })
              .eq("id", open.id);
          }
        }
      }
    }


    // Aprovação só acontece depois do pagamento confirmado: a fatura da adesão
    // (primeira mensalidade em aberto) passa a constar como paga no caixa e no
    // histórico de faturas pagas do cliente.
    if (data.approval_status === "aprovado") {
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, payment_method")
        .eq("id", data.subscription_id)
        .maybeSingle();

      const { data: openInvoice } = await supabaseAdmin
        .from("payments")
        .select("id, method")
        .eq("subscription_id", data.subscription_id)
        .eq("category", "mensalidade")
        .neq("status", "pago")
        .neq("status", "cancelada")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      const chosen = data.payment_method ?? null;
      const paidAt = data.paid_on
        ? new Date(`${data.paid_on}T12:00:00`).toISOString()
        : new Date().toISOString();

      const fallback =
        chosen ??
        (subscription?.payment_method?.startsWith("Pix")
          ? "pix"
          : subscription?.payment_method?.startsWith("Cartão")
            ? "cartao"
            : subscription?.payment_method?.startsWith("Dinheiro")
              ? "dinheiro"
              : null);

      // O meio informado na ativação fica registrado no contrato do cliente.
      if (chosen) {
        await supabaseAdmin
          .from("subscriptions")
          .update({ payment_method: METHOD_CONTRACT_LABELS[chosen] ?? chosen })
          .eq("id", data.subscription_id);
        await supabaseAdmin
          .from("contract_acceptances")
          .update({ payment_method: METHOD_CONTRACT_LABELS[chosen] ?? chosen })
          .eq("subscription_id", data.subscription_id);
      }

      if (openInvoice) {
        const { error: payError } = await supabaseAdmin
          .from("payments")
          .update({
            status: "pago",
            paid_at: paidAt,
            method: chosen ?? openInvoice.method ?? fallback,
          })
          .eq("id", openInvoice.id);
        if (payError) throw payError;
        const { syncNextBilling } = await import("./billing.server");
        await syncNextBilling(data.subscription_id);
      } else if (subscription?.user_id) {
        // Nenhuma fatura em aberto: registra a adesão (primeira mensalidade) já
        // como paga — mas só se ainda não houver pagamento registrado (evita
        // duplicar o valor quando o cliente já pagou online).
        const { data: alreadyPaid } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("subscription_id", data.subscription_id)
          .eq("status", "pago")
          .limit(1)
          .maybeSingle();
        if (alreadyPaid) {
          const { syncNextBilling } = await import("./billing.server");
          await syncNextBilling(data.subscription_id);
          return { ok: true as const };
        }
        const { data: plan } = await supabaseAdmin
          .from("subscriptions")
          .select("plan_name, monthly_price_cents")
          .eq("id", data.subscription_id)
          .maybeSingle();
        const { error: insertError } = await supabaseAdmin.from("payments").insert({
          user_id: subscription.user_id,
          subscription_id: data.subscription_id,
          description: `Primeira mensalidade ${plan?.plan_name ?? ""}`.trim(),
          amount_cents: plan?.monthly_price_cents ?? 0,
          due_date: new Date().toISOString().slice(0, 10),
          status: "pago",
          paid_at: paidAt,
          method: fallback ?? "dinheiro",
        });
        if (insertError) throw insertError;
        const { syncNextBilling } = await import("./billing.server");
        await syncNextBilling(data.subscription_id);
      }
    }

    return { ok: true as const };
  });

const registrationSchema = z.object({
  user_id: z.string().uuid(),
  registration_status: z.enum(["pendente", "ativo"]),
});

/** Ativação do CADASTRO do cliente (dados conferidos) — não libera serviços sozinha. */
export const setRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registrationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        registration_status: data.registration_status,
        registration_activated_at:
          data.registration_status === "ativo" ? new Date().toISOString() : null,
      })
      .eq("id", data.user_id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Exclui definitivamente o cadastro do cliente e todos os registros vinculados. */
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("A conta administrativa não pode ser excluída por esta tela.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: photos, error: photosError }, { data: referrals, error: referralsError }] =
      await Promise.all([
        supabaseAdmin.from("service_photos").select("storage_path").eq("user_id", data.user_id),
        supabaseAdmin
          .from("referrals")
          .select("reward_receipt_path")
          .eq("referrer_id", data.user_id),
      ]);
    if (photosError) throw photosError;
    if (referralsError) throw referralsError;

    const storagePaths = [
      ...(photos ?? []).map((photo) => photo.storage_path),
      ...(referrals ?? [])
        .map((referral) => referral.reward_receipt_path)
        .filter((path): path is string => Boolean(path)),
    ];
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("service-photos")
        .remove(storagePaths);
      if (storageError) throw storageError;
    }

    const deleteRows = async (table: string, column: string) => {
      const { error } = await supabaseAdmin.from(table as never).delete().eq(column, data.user_id);
      if (error) throw error;
    };

    await deleteRows("service_photos", "user_id");
    await deleteRows("work_orders", "user_id");
    await deleteRows("service_requests", "user_id");
    await deleteRows("payments", "user_id");
    await deleteRows("contract_acceptances", "user_id");
    await deleteRows("subscriptions", "user_id");
    await deleteRows("vouchers", "user_id");
    await deleteRows("referrals", "referrer_id");
    await deleteRows("user_roles", "user_id");
    await deleteRows("profiles", "id");

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (authError) throw authError;
    return { ok: true as const };
  });

const chargeSchema = z.object({
  user_id: z.string().uuid(),
  subscription_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(2).max(140),
  amount_cents: z.number().int().min(1).max(100_000_000),
  due_date: z.string().min(8).max(10),
  category: z.enum(["mensalidade", "servico_adicional", "outro"]).default("servico_adicional"),
  status: z.enum(["pendente", "pago"]).default("pendente"),
  method: z.string().trim().max(40).nullable().optional(),
});

/** Lança no caixa uma cobrança avulsa (serviço adicional, material, taxa etc.). */
export const createFinanceCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => chargeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: data.user_id,
      subscription_id: data.subscription_id ?? null,
      description: data.description,
      amount_cents: data.amount_cents,
      due_date: data.due_date,
      category: data.category,
      status: data.status,
      method: data.method || (data.status === "pago" ? "dinheiro" : null),
      paid_at: data.status === "pago" ? new Date().toISOString() : null,
      provider: "manual",
      provider_mode: "manual",
    });
    if (error) throw error;
    return { ok: true as const };
  });
