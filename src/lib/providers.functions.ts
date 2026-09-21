import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Apenas a equipe administrativa pode fazer isso.");
}

const providerSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(["encanador", "eletricista", "pedreiro", "pintor", "jardineiro"]),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  cpf: z.string().trim().max(30).optional().nullable(),
  document_notes: z.string().trim().max(1000).optional().nullable(),
  photo_url: z.string().trim().max(400).optional().nullable(),
  active: z.boolean().default(true),
});

/** Lista os prestadores cadastrados (uso interno da equipe). */
export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("service_providers")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return { ok: true as const, providers: data ?? [] };
  });

/** Cria ou atualiza o cadastro de um prestador de serviço. */
export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...fields } = data;
    const values = {
      full_name: fields.full_name,
      role: fields.role,
      phone: fields.phone || null,
      email: fields.email || null,
      address: fields.address || null,
      cpf: fields.cpf || null,
      document_notes: fields.document_notes || null,
      photo_url: fields.photo_url || null,
      active: fields.active,
    };

    if (id) {
      const { error } = await supabaseAdmin.from("service_providers").update(values).eq("id", id);
      if (error) throw error;
      // Mantém as OS já criadas com o nome/foto atualizados.
      await supabaseAdmin
        .from("work_orders")
        .update({
          provider_name: values.full_name,
          provider_role: values.role,
          provider_photo_url: values.photo_url,
          technician: values.full_name,
        })
        .eq("provider_id", id);
      return { ok: true as const, id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("service_providers")
      .insert(values)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: created.id };
  });

/** Remove um prestador do cadastro. */
export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("service_providers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
