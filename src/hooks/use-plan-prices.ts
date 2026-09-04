import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type PlanPrice = {
  slug: string;
  price_cents: number | null;
  price_note: string | null;
};

/** Preços dos planos (leitura pública). */
export function usePlanPrices() {
  return useQuery({
    queryKey: ["plan-prices"],
    queryFn: async (): Promise<PlanPrice[]> => {
      const { data, error } = await supabase
        .from("plan_prices")
        .select("slug, price_cents, price_note");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

/** Atualiza o valor de um plano (somente administradores). */
export function useUpdatePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanPrice) => {
      const { data, error } = await supabase
        .from("plan_prices")
        .update({ price_cents: input.price_cents, price_note: input.price_note })
        .eq("slug", input.slug)
        .select("slug")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Sem permissão para alterar os valores.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plan-prices"] });
    },
  });
}

/** Formata centavos em reais (pt-BR). */
export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function planPriceLabel(price?: PlanPrice) {
  if (!price) return null;
  if (typeof price.price_cents === "number") return formatBRL(price.price_cents);
  return price.price_note ?? null;
}
