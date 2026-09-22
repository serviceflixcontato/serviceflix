import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { REFERRAL_REWARD_CENTS } from "@/lib/referrals";

/** Valor padrão da recompensa por indicação, configurado no painel administrativo. */
export function useReferralReward() {
  const query = useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_settings")
        .select("reward_cents")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data?.reward_cents ?? REFERRAL_REWARD_CENTS;
    },
  });

  return { rewardCents: query.data ?? REFERRAL_REWARD_CENTS, isLoading: query.isLoading };
}
