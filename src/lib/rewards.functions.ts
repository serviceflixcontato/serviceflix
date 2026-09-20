import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const chooseSchema = z
  .object({
    referral_id: z.string().uuid(),
    method: z.enum(["dinheiro", "voucher"]),
    pix_key: z.string().trim().max(160).optional().default(""),
    bank_details: z.string().trim().max(400).optional().default(""),
  })
  .refine(
    (value) =>
      value.method === "voucher" || Boolean(value.pix_key.trim() || value.bank_details.trim()),
    { message: "Informe a chave Pix ou os dados bancários para receber a recompensa." },
  );

/**
 * Cliente escolhe como quer resgatar a recompensa da indicação:
 * dinheiro (Pix/transferência) ou voucher de abatimento no contrato.
 * O voucher só é gerado quando a recompensa já está liberada pela equipe.
 */
export const chooseReferralReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => chooseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: referral, error } = await supabase
      .from("referrals")
      .select("id, referrer_id, status, reward_cents, reward_status, reward_method")
      .eq("id", data.referral_id)
      .maybeSingle();
    if (error) throw error;
    if (!referral || referral.referrer_id !== userId) {
      throw new Error("Indicação não encontrada.");
    }
    if (referral.reward_method) {
      return { ok: false as const, reason: "already_chosen" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updateError } = await supabaseAdmin
      .from("referrals")
      .update({
        reward_method: data.method,
        reward_pix_key: data.method === "dinheiro" ? data.pix_key.trim() || null : null,
        reward_bank_details: data.method === "dinheiro" ? data.bank_details.trim() || null : null,
        reward_chosen_at: new Date().toISOString(),
      })
      .eq("id", referral.id)
      .eq("referrer_id", userId);
    if (updateError) throw updateError;

    let voucherCode: string | null = null;
    const released = referral.reward_status === "liberada" || referral.reward_status === "paga";

    if (data.method === "voucher" && released && (referral.reward_cents ?? 0) > 0) {
      const { data: voucher, error: voucherError } = await supabaseAdmin
        .from("vouchers")
        .insert({
          user_id: userId,
          referral_id: referral.id,
          amount_cents: referral.reward_cents,
          balance_cents: referral.reward_cents,
          status: "disponivel",
          note: "Crédito de indicação Service Flix",
        })
        .select("code")
        .single();
      if (voucherError) throw voucherError;
      voucherCode = voucher.code;
    }

    return {
      ok: true as const,
      method: data.method,
      released,
      voucherCode,
    };
  });

const applySchema = z.object({
  payment_id: z.string().uuid(),
  code: z.string().trim().min(4).max(30),
});

/** Cliente usa um voucher na fatura: o crédito abate o valor e ele paga só a diferença. */
export const applyVoucherToPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: payment, error } = await supabase
      .from("payments")
      .select("id, user_id, amount_cents, voucher_discount_cents, status")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (error) throw error;
    if (!payment || payment.user_id !== userId) throw new Error("Fatura não encontrada.");
    if (payment.status === "pago") return { ok: false as const, reason: "already_paid" as const };

    const remaining = payment.amount_cents - (payment.voucher_discount_cents ?? 0);
    if (remaining <= 0) return { ok: false as const, reason: "nothing_due" as const };

    const { data: voucher, error: voucherError } = await supabase
      .from("vouchers")
      .select("id, code, balance_cents, status")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (voucherError) throw voucherError;
    if (!voucher || voucher.status !== "disponivel" || voucher.balance_cents <= 0) {
      return { ok: false as const, reason: "invalid_voucher" as const };
    }

    const applied = Math.min(voucher.balance_cents, remaining);
    const newRemaining = remaining - applied;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: payError } = await supabaseAdmin
      .from("payments")
      .update({
        voucher_id: voucher.id,
        voucher_discount_cents: (payment.voucher_discount_cents ?? 0) + applied,
        ...(newRemaining === 0
          ? { status: "pago", method: "voucher", paid_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", payment.id)
      .eq("user_id", userId);
    if (payError) throw payError;

    const { error: balanceError } = await supabaseAdmin
      .from("vouchers")
      .update({
        balance_cents: 0,
        status: "usado",
      })
      .eq("id", voucher.id);
    if (balanceError) throw balanceError;

    return {
      ok: true as const,
      applied,
      remaining: newRemaining,
      code: voucher.code,
      paid: newRemaining === 0,
    };
  });

const applyAvailableSchema = z.object({ payment_id: z.string().uuid() });

/** Aplica os vouchers disponíveis, do mais antigo ao mais novo, até quitar a fatura. */
export const applyAvailableVouchersToPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applyAvailableSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, user_id, amount_cents, voucher_discount_cents, status")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment || payment.user_id !== userId) throw new Error("Fatura não encontrada.");
    if (payment.status === "pago") return { ok: false as const, reason: "already_paid" as const };

    const initialRemaining = Math.max(
      payment.amount_cents - (payment.voucher_discount_cents ?? 0),
      0,
    );
    if (initialRemaining === 0) {
      return { ok: false as const, reason: "nothing_due" as const };
    }

    const { data: vouchers, error: voucherError } = await supabase
      .from("vouchers")
      .select("id, code, balance_cents")
      .eq("status", "disponivel")
      .gt("balance_cents", 0)
      .order("created_at", { ascending: true });
    if (voucherError) throw voucherError;
    if (!vouchers?.length) {
      return { ok: false as const, reason: "no_vouchers" as const };
    }

    let remaining = initialRemaining;
    const uses: Array<{ id: string; balance: number; applied: number }> = [];
    for (const voucher of vouchers) {
      if (remaining === 0) break;
      const applied = Math.min(voucher.balance_cents, remaining);
      if (applied > 0) {
        uses.push({ id: voucher.id, balance: voucher.balance_cents, applied });
        remaining -= applied;
      }
    }

    const appliedTotal = initialRemaining - remaining;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lastVoucher = uses.at(-1);
    if (!lastVoucher || appliedTotal <= 0) {
      return { ok: false as const, reason: "no_vouchers" as const };
    }

    const { error: updatePaymentError } = await supabaseAdmin
      .from("payments")
      .update({
        voucher_id: lastVoucher.id,
        voucher_discount_cents: (payment.voucher_discount_cents ?? 0) + appliedTotal,
        ...(remaining === 0
          ? { status: "pago", method: "voucher", paid_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", payment.id)
      .eq("user_id", userId);
    if (updatePaymentError) throw updatePaymentError;

    for (const use of uses) {
      const { error: updateVoucherError } = await supabaseAdmin
        .from("vouchers")
        .update({ balance_cents: 0, status: "usado" })
        .eq("id", use.id)
        .eq("user_id", userId);
      if (updateVoucherError) throw updateVoucherError;
    }

    return {
      ok: true as const,
      applied: appliedTotal,
      remaining,
      paid: remaining === 0,
      vouchersUsed: uses.length,
    };
  });
