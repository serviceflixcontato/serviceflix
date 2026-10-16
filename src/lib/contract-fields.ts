import { CONTRACT_VERSION, type ContractFields } from "@/lib/contract";
import { PLANS } from "@/lib/plans";

export type ContractProfileData = {
  full_name?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  address_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city_uf?: string | null;
};

export type ContractPlanData = {
  plan_slug: string;
  plan_name: string;
  monthly_price_label: string;
  periodicity: string;
  payment_method: string;
};

export type ContractAcceptanceData = {
  accepted_at?: string | null;
  accept_ip?: string | null;
  id?: string | null;
  contract_version?: string | null;
  started_at?: string | null;
};

/** Dados específicos do Flix Solar (limpeza de painéis). */
export type ContractSolarData = {
  panels?: number | null;
  cleanings?: number | null;
  per_panel_label?: string | null;
  adesao_label?: string | null;
};

function formatDateTimeBR(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Endereço completo de atendimento em uma linha. */
export function serviceAddress(profile: ContractProfileData) {
  const parts = [
    [profile.address, profile.address_number].filter(Boolean).join(", "),
    profile.complement,
    profile.neighborhood,
    profile.city_uf,
  ].filter((part) => part && String(part).trim());
  return parts.join(" – ");
}

/** Monta todos os campos {{ }} do contrato a partir do cadastro, do plano e do aceite. */
export function buildContractFields(
  profile: ContractProfileData,
  plan: ContractPlanData,
  acceptance: ContractAcceptanceData = {},
  solar: ContractSolarData = {},
): ContractFields {
  const planDetails = PLANS.find((item) => item.slug === plan.plan_slug);

  return {
    nome_cliente: profile.full_name ?? "",
    cpf_cnpj: profile.cpf_cnpj ?? "",
    email: profile.email ?? "",
    telefone: profile.phone ?? "",
    endereco: profile.address ?? "",
    numero: profile.address_number ?? "",
    complemento: profile.complement ?? "",
    bairro: profile.neighborhood ?? "",
    cidade_uf: profile.city_uf ?? "",
    nome_plano: plan.plan_name,
    periodicidade: plan.periodicity,
    valor_assinatura: plan.monthly_price_label,
    forma_pagamento: plan.payment_method,
    limite_atendimentos: planDetails
      ? `${planDetails.frequency} — ${planDetails.hours} (${planDetails.monthlyHours})`
      : "",
    servicos_inclusos: planDetails ? planDetails.features.join("; ") : "",
    endereco_atendimento: serviceAddress(profile),
    data_contratacao: formatDateBR(acceptance.accepted_at ?? new Date().toISOString()),
    data_inicio: formatDateBR(acceptance.started_at) || "A definir com a equipe",
    data_hora_aceite: formatDateTimeBR(acceptance.accepted_at),
    ip_aceite: acceptance.accept_ip ?? "",
    id_contratacao: acceptance.id ?? "",
    versao_contrato: acceptance.contract_version ?? CONTRACT_VERSION,
    quantidade_paineis: solar.panels ? String(solar.panels) : "",
    limpezas_ano: solar.cleanings ? String(solar.cleanings) : "",
    valor_por_painel: solar.per_panel_label ?? "",
    valor_adesao: solar.adesao_label ?? "",
  };
}
