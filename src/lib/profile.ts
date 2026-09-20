export type ProfileLike = {
  full_name?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  address_number?: string | null;
  neighborhood?: string | null;
  city_uf?: string | null;
} | null;

/** Campos exigidos pelo contrato de assinatura. */
export const REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "cpf_cnpj",
  "email",
  "phone",
  "address",
  "address_number",
  "neighborhood",
  "city_uf",
] as const;

export function missingProfileFields(profile: ProfileLike) {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  return REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = profile[field];
    return !value || String(value).trim().length < 2;
  });
}

export function isProfileComplete(profile: ProfileLike) {
  return missingProfileFields(profile).length === 0;
}
