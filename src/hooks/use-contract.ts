import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { acceptContract } from "@/lib/contract.functions";

export type ContractAcceptance = {
  id: string;
  contract_version: string;
  plan_slug: string;
  plan_name: string;
  monthly_price_cents: number | null;
  periodicity: string;
  payment_method: string;
  service_address: string | null;
  full_name: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  accepted_at: string;
  accept_ip: string | null;
  fields: Record<string, string> | null;
};

export type ContractAcceptanceRow = ContractAcceptance & {
  subscription_id: string | null;
  contract_code?: string | null;
};

/** Todos os contratos assinados pelo cliente logado (ele pode ter mais de um). */
export function useMyContracts() {
  return useQuery({
    queryKey: ["contract-acceptances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_acceptances")
        .select("*")
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractAcceptanceRow[];
    },
  });
}

/** Último aceite de contrato do cliente logado. */
export function useMyContract() {
  const query = useMyContracts();
  const main = query.data?.[0] ?? null;
  return { ...query, data: main } as typeof query & { data: ContractAcceptanceRow | null };
}

/** Registra o aceite eletrônico do contrato e vincula o plano escolhido. */
export function useAcceptContract() {
  const queryClient = useQueryClient();
  const accept = useServerFn(acceptContract);
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => accept({ data: input as never }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contract-acceptance"] });
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
