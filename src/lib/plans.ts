export type Plan = {
  slug: string;
  name: string;
  tagline: string;
  frequency: string;
  hours: string;
  monthlyHours: string;
  highlight?: boolean;
  features: string[];
  bestFor: string;
};

export const PLANS: Plan[] = [
  {
    slug: "basico",
    name: "Plano Básico",
    tagline: "Para quem precisa de manutenção preventiva constante.",
    frequency: "1 dia por semana",
    hours: "4 horas por atendimento",
    monthlyHours: "≈ 16 h/mês",
    bestFor: "Residências e prédios pequenos",
    features: [
      "1 atendimento semanal de 4 horas",
      "Serviços gerais de manutenção predial",
      "Abertura de OS pelo painel do cliente",
      "Relatório de cada atendimento",
    ],
  },
  {
    slug: "master",
    name: "Plano Master",
    tagline: "Equilíbrio entre custo e presença frequente da equipe.",
    frequency: "2 dias por semana",
    hours: "4 horas por dia",
    monthlyHours: "≈ 32 h/mês",
    highlight: true,
    bestFor: "Condomínios de médio porte",
    features: [
      "2 atendimentos semanais de 4 horas",
      "Plano de manutenção preventiva mensal",
      "Prioridade no atendimento de urgências",
      "Histórico completo de OS e serviços",
    ],
  },
  {
    slug: "premium",
    name: "Plano Premium",
    tagline: "Cobertura ampla para operações que não podem parar.",
    frequency: "4 dias por semana",
    hours: "4 horas por dia",
    monthlyHours: "≈ 64 h/mês",
    bestFor: "Condomínios grandes",
    features: [
      "4 atendimentos semanais de 4 horas",
      "Cronograma preventivo e corretivo",
      "Atendimento prioritário de urgências",
      "Acompanhamento técnico dedicado",
    ],
  },
  {
    slug: "personalizado",
    name: "Plano Personalizado",
    tagline: "Condições e quantidade de atendimentos sob medida.",
    frequency: "Definido com você",
    hours: "Carga horária flexível",
    monthlyHours: "Sob medida",
    bestFor: "Necessidades específicas",
    features: [
      "Quantidade de dias e horas negociada",
      "Escopo de serviços personalizado",
      "Equipe dimensionada para a demanda",
      "Contrato ajustado ao seu orçamento",
    ],
  },
];

export const CONTACT = {
  whatsapp: "5511999999999",
  whatsappLabel: "(11) 99999-9999",
  email: "contato@serviceflix.com.br",
};

export function whatsappLink(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function planName(slug: string) {
  return PLANS.find((plan) => plan.slug === slug)?.name ?? slug;
}
