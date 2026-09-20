import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONTRACT_VERSION } from "@/lib/contract";

const acceptSchema = z.object({
  plan_slug: z.enum(["basico", "master", "premium", "personalizado"]),
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
  client_type: z.enum(["condominio", "residencia"]),
  fields: z.record(z.string(), z.string()),
  accepted_all: z.literal(true),
});

/** Aceite do contrato registrado com data, hora, IP e versão. */
export const acceptContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => acceptSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
        fields: { ...data.fields, ip_aceite: ip ?? "" },
      })
      .select("id, accepted_at, accept_ip, contract_version")
      .single();
    if (error) throw error;

    return { ok: true as const, acceptance };
  });
