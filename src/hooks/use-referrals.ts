import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type NewReferral = {
  contact_name: string;
  property_name: string;
  property_type: string;
  address: string;
  cnpj: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
};

export function useMyReferrals() {
  return useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewReferral) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Faça login para enviar indicações.");
      const { error } = await supabase.from("referrals").insert({
        ...values,
        referrer_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
  });
}
