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

    const [profiles, subscriptions, payments, requests, orders, referrals, leads] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, phone, address, client_type, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("subscriptions")
          .select(
            "id, user_id, plan_slug, plan_name, status, monthly_price_cents, started_at, next_billing_date, contract_number",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("payments")
          .select("id, user_id, description, amount_cents, due_date, paid_at, status, method")
          .order("due_date", { ascending: false }),
        supabaseAdmin
          .from("service_requests")
          .select("id, user_id, title, category, urgency, status, location, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("work_orders")
          .select(
            "id, user_id, os_number, title, technician, scheduled_for, completed_at, hours_spent, status",
          )
          .order("scheduled_for", { ascending: false }),
        supabaseAdmin.from("referrals").select("*").order("created_at", { ascending: false }),
        supabaseAdmin
          .from("contact_leads")
          .select("id, name, email, phone, property_type, plan_interest, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    return {
      ok: true as const,
      profiles: profiles.data ?? [],
      subscriptions: subscriptions.data ?? [],
      payments: payments.data ?? [],
      requests: requests.data ?? [],
      orders: orders.data ?? [],
      referrals: referrals.data ?? [],
      leads: leads.data ?? [],
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

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let subscriptionId = existing?.id ?? null;
    if (subscriptionId) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update(payload)
        .eq("id", subscriptionId);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("subscriptions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      subscriptionId = created.id;
    }

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
