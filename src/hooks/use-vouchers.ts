import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { applyVoucherToPayment, chooseReferralReward } from "@/lib/rewards.functions";

export function useMyVouchers() {
  return useQuery({
    queryKey: ["vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChooseReferralReward() {
  const queryClient = useQueryClient();
  const choose = useServerFn(chooseReferralReward);
  return useMutation({
    mutationFn: (input: {
      referral_id: string;
      method: "dinheiro" | "voucher";
      pix_key?: string;
      bank_details?: string;
    }) => choose({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["referrals"] });
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

export function useApplyVoucher() {
  const queryClient = useQueryClient();
  const apply = useServerFn(applyVoucherToPayment);
  return useMutation({
    mutationFn: (input: { payment_id: string; code: string }) => apply({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });
}

export const VOUCHER_STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível para abatimento",
  usado: "Utilizado",
  cancelado: "Cancelado",
};

export const REWARD_METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro (Pix ou transferência)",
  voucher: "Voucher de abatimento no contrato",
};
