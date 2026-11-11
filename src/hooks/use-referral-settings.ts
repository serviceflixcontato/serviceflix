import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { REFERRAL_REWARD_CENTS } from "@/lib/referrals";

/** Valor da recompensa por indicação. Nunca bloqueia a página: em qualquer falha usa o padrão. */
export function useReferralReward() {
  const hydrated = useHydrated();
  const query = useQuery({
    queryKey: ["referral-settings"],
    enabled: hydrated,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("referral_settings")
          .select("reward_cents")
          .eq("id", "default")
          .maybeSingle();
        if (error) throw error;
        return data?.reward_cents ?? REFERRAL_REWARD_CENTS;
      } catch (err) {
        console.error("Falha ao carregar configuração de indicação", err);
        return REFERRAL_REWARD_CENTS;
      }
    },
  });

  return { rewardCents: query.data ?? REFERRAL_REWARD_CENTS, isLoading: query.isLoading };
}
