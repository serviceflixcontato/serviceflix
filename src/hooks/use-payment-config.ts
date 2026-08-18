import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getPaymentConfig, setPaymentMode } from "@/lib/payments.functions";

export function usePaymentConfig() {
  const fetchConfig = useServerFn(getPaymentConfig);
  return useQuery({
    queryKey: ["payment-config"],
    queryFn: () => fetchConfig(),
  });
}

export function useSetPaymentMode() {
  const queryClient = useQueryClient();
  const mutate = useServerFn(setPaymentMode);
  return useMutation({
    mutationFn: (mode: "sandbox" | "live") => mutate({ data: { mode } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payment-config"] });
    },
  });
}

export const MODE_LABELS: Record<string, string> = {
  sandbox: "Teste (sandbox)",
  live: "Produção (pagamentos reais)",
};
