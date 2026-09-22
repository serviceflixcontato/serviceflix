import { supabase } from "@/integrations/supabase/client";

export const PROVIDER_BUCKET = "provider-photos";

/** Funções disponíveis para o prestador de serviço. */
export const PROVIDER_ROLES = [
  { value: "encanador", label: "Encanador" },
  { value: "eletricista", label: "Eletricista" },
  { value: "pedreiro", label: "Pedreiro" },
  { value: "pintor", label: "Pintor" },
  { value: "jardineiro", label: "Jardineiro" },
  { value: "mestre_faz_tudo", label: "Mestre/Faz tudo" },
] as const;

export function providerRoleLabel(value: string | null | undefined) {
  if (!value) return "Profissional";
  return PROVIDER_ROLES.find((role) => role.value === value)?.label ?? value;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
}

/** Envia a foto do prestador e devolve o caminho guardado. */
export async function uploadProviderPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem (JPG, PNG ou WEBP).");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("A foto deve ter no máximo 10 MB.");
  }
  const path = `prestadores/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(
    file.name || "foto.jpg",
  )}`;
  const { error } = await supabase.storage
    .from(PROVIDER_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Links temporários para exibir as fotos dos prestadores. */
export async function signProviderPhotos(paths: string[]) {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await supabase.storage
    .from(PROVIDER_BUCKET)
    .createSignedUrls(unique, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}
