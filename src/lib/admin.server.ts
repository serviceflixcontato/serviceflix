/** Credenciais do acesso administrativo da equipe Service Flix. */
export const ADMIN_USERNAME = "Serviceflix";
export const ADMIN_PASSWORD = "1234";

/** E-mail interno usado pela conta administrativa (o login continua sendo o usuário acima). */
export function adminAuthEmail() {
  return `${ADMIN_USERNAME.toLowerCase()}@admin.serviceflix.local`;
}

/**
 * Senha real da conta de autenticação — derivada da senha do painel para
 * atender ao mínimo de caracteres exigido pelo provedor de autenticação.
 */
export function adminAuthPassword() {
  return `sf-admin-${ADMIN_PASSWORD}-key`;
}
