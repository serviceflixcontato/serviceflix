import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "service-photos";

export type PhotoKind = "cliente" | "conclusao";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
}

/** Envia as fotos ao armazenamento e registra cada uma na tabela de fotos. */
export async function uploadServicePhotos(input: {
  files: File[];
  ownerId: string;
  uploadedBy: string;
  kind: PhotoKind;
  requestId?: string | null;
  workOrderId?: string | null;
  caption?: string | null;
}) {
  for (const file of input.files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Envie apenas arquivos de imagem (JPG, PNG ou WEBP).");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error("Cada foto deve ter no máximo 10 MB.");
    }

    const path = `${input.ownerId}/${input.kind}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName(file.name || "foto.jpg")}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from("service_photos").insert({
      user_id: input.ownerId,
      uploaded_by: input.uploadedBy,
      kind: input.kind,
      storage_path: path,
      caption: input.caption ?? null,
      request_id: input.requestId ?? null,
      work_order_id: input.workOrderId ?? null,
    });
    if (insertError) throw insertError;
  }
}

/** Gera links temporários para exibir as fotos. */
export async function signPhotoUrls(paths: string[]) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/** Envia a imagem do comprovante de pagamento da recompensa e devolve o caminho salvo. */
export async function uploadRewardReceipt(input: { file: File; ownerId: string }) {
  if (!input.file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem (JPG, PNG ou WEBP) do comprovante.");
  }
  if (input.file.size > MAX_PHOTO_BYTES) {
    throw new Error("O comprovante deve ter no máximo 10 MB.");
  }
  const path = `${input.ownerId}/recompensa/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName(input.file.name || "comprovante.jpg")}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (error) throw error;
  return path;
}
