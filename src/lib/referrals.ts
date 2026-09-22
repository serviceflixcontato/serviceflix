export const REFERRAL_REWARD_CENTS = 50_000; // valor inicial; o valor real vem do painel administrativo

/** Formata a recompensa de forma curta (R$ 500 / R$ 500,50) para textos do site. */
export function formatRewardShort(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  pendente: "Aguardando contato",
  em_negociacao: "Em negociação",
  contratado: "Contratou o plano",
  nao_convertido: "Não convertido",
};

export const REWARD_STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando contratação",
  liberada: "Recompensa liberada",
  paga: "Recompensa paga",
};

export const REFERRAL_STATUS_OPTIONS = Object.keys(REFERRAL_STATUS_LABELS);
export const REWARD_STATUS_OPTIONS = Object.keys(REWARD_STATUS_LABELS);
