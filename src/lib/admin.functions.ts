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
            "id, full_name, email, phone, address, address_number, complement, neighborhood, city_uf, cpf_cnpj, client_type, created_at, updated_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("subscriptions")
          .select(
            "id, user_id, plan_slug, plan_name, status, monthly_price_cents, started_at, next_billing_date, contract_number, contract_notes, payment_method, payment_choice, activation_requested_at, created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("payments")
          .select(
            "id, user_id, subscription_id, description, amount_cents, due_date, paid_at, status, method, reference, provider, created_at",
          )
          .order("due_date", { ascending: false }),
        supabaseAdmin
          .from("service_requests")
          .select(
            "id, user_id, request_code, title, category, urgency, status, location, description, created_at, materials_needed, scheduled_at, team_message, schedule_status, client_response_note, client_responded_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("work_orders")
          .select(
            "id, user_id, request_id, os_number, title, description, technician, scheduled_for, completed_at, hours_spent, status",
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
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Apenas administradores podem atualizar indicações.");
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
      provider: "manual",
      provider_mode: "manual",
    };

    // Sempre cria um novo contrato: um cliente pode ter mais de um plano ativo.
    const { data: created, error: createError } = await supabaseAdmin
      .from("subscriptions")
      .insert(payload)
      .select("id")
      .single();
    if (createError) throw createError;
    const subscriptionId = created.id;

    if (data.register_cash_payment && data.monthly_price_cents > 0) {
      const { error } = await supabaseAdmin.from("payments").insert({
        user_id: data.user_id,
        subscription_id: subscriptionId,
        description: `Mensalidade ${data.plan_name} (dinheiro)`,
        amount_cents: data.monthly_price_cents,
        due_date: data.started_at,
        paid_at: new Date().toISOString(),
        status: "pago",
        method: "dinheiro",
        provider: "manual",
        provider_mode: "manual",
      });
      if (error) throw error;
    }

    return { ok: true as const, subscription_id: subscriptionId };
  });

const paymentStatusSchema = z.object({
  payment_id: z.string().uuid(),
  status: z.enum(["pago", "pendente", "atrasado", "cancelada"]),
  method: z.string().trim().max(40).nullable().optional(),
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: data.status,
        method: data.method ?? (data.status === "pago" ? "dinheiro" : null),
        paid_at: data.status === "pago" ? new Date().toISOString() : null,
      })
      .eq("id", data.payment_id);
    if (error) throw error;
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
    const { error } = await supabaseAdmin
      .from("service_requests")
      .update({
        scheduled_at: new Date(data.scheduled_at).toISOString(),
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

function generateOsNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OS-${rand}`;
}

const workOrderCreateSchema = z.object({
  user_id: z.string().uuid(),
  request_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1500).optional(),
  technician: z.string().trim().max(80).optional(),
  scheduled_for: z.string().min(10).max(40).nullable().optional(),
});

/** Cria uma ordem de serviço para um cliente (com ou sem solicitação vinculada). */
export const createWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workOrderCreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("work_orders").insert({
      user_id: data.user_id,
      request_id: data.request_id ?? null,
      os_number: generateOsNumber(),
      title: data.title,
      description: data.description || null,
      technician: data.technician || null,
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
  scheduled_for: z.string().min(10).max(40).nullable().optional(),
});

/** Edita os dados de uma OS (serviço, técnico, data e hora da visita). */
export const updateWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workOrderEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { order_id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("work_orders")
      .update({
        title: rest.title,
        description: rest.description || null,
        technician: rest.technician || null,
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
