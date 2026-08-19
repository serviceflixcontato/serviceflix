export const REFERRAL_REWARD_CENTS = 50_000; // R$ 500,00 por indicação convertida

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
