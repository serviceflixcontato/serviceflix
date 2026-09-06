import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { signPhotoUrls } from "@/lib/service-photos";

export type ServicePhoto = {
  id: string;
  user_id: string;
  request_id: string | null;
  work_order_id: string | null;
  kind: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  url: string | null;
};

/**
 * Fotos dos atendimentos visíveis para quem está logado.
 * Cliente vê as suas; a equipe administrativa vê de todos (regras no banco).
 */
export function useServicePhotos() {
  return useQuery({
    queryKey: ["service_photos"],
    queryFn: async (): Promise<ServicePhoto[]> => {
      const { data, error } = await supabase
        .from("service_photos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const urls = await signPhotoUrls(rows.map((row) => row.storage_path));
      return rows.map((row) => ({ ...row, url: urls.get(row.storage_path) ?? null }));
    },
  });
}

export function groupPhotos(photos: ServicePhoto[]) {
  const byRequest = new Map<string, ServicePhoto[]>();
  const byUser = new Map<string, ServicePhoto[]>();
  for (const photo of photos) {
    if (photo.request_id) {
      const list = byRequest.get(photo.request_id) ?? [];
      list.push(photo);
      byRequest.set(photo.request_id, list);
    }
    const userList = byUser.get(photo.user_id) ?? [];
    userList.push(photo);
    byUser.set(photo.user_id, userList);
  }
  return { byRequest, byUser };
}
