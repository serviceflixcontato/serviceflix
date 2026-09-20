import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ProfileInput = {
  full_name: string;
  cpf_cnpj: string;
  email: string;
  phone: string;
  address: string;
  address_number: string;
  complement: string | null;
  neighborhood: string;
  city_uf: string;
  client_type: "condominio" | "residencia";
};

/** Salva os dados cadastrais completos do cliente (usados depois no contrato). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada.");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...input }, { onConflict: "id" });
      if (error) throw error;
      return { ok: true as const };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
