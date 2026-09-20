import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, FileCheck2 } from "lucide-react";
import { useState } from "react";

import { ContractText } from "@/components/site/ContractText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import { buildContractFields } from "@/lib/contract-fields";
import { downloadContractPdf } from "@/lib/contract-pdf";
import { useMyContract } from "@/hooks/use-contract";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
  formatDateTime,
  useProfile,
  useSubscription,
} from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/contrato")({
  component: Contrato,
});

function Contrato() {
  const { data: profile } = useProfile();
  const { data: subscription, isLoading } = useSubscription();
  const { data: contract } = useMyContract();
  const [showContract, setShowContract] = useState(false);

  const contractFields = contract
    ? buildContractFields(
        {
          full_name: contract.full_name,
          cpf_cnpj: contract.cpf_cnpj,
          email: contract.email,
          phone: contract.phone,
          address: profile?.address ?? null,
          address_number: profile?.address_number ?? null,
          complement: profile?.complement ?? null,
          neighborhood: profile?.neighborhood ?? null,
          city_uf: profile?.city_uf ?? null,
        },
        {
          plan_slug: contract.plan_slug,
          plan_name: contract.plan_name,
          monthly_price_label: formatBRL(contract.monthly_price_cents),
          periodicity: contract.periodicity,
          payment_method: contract.payment_method,
        },
        {
          accepted_at: contract.accepted_at,
          accept_ip: contract.accept_ip,
          id: contract.id,
          contract_version: contract.contract_version,
          started_at: subscription?.started_at ?? null,
        },
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-xl font-bold">Informações do contrato</h1>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
          ) : subscription ? (
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Contrato" value={subscription.contract_number ?? "—"} />
              <Row label="Plano" value={subscription.plan_name} />
              <Row
                label="Situação"
                value={
                  <Badge variant={subscription.status === "ativa" ? "default" : "secondary"}>
                    {STATUS_LABELS[subscription.status] ?? subscription.status}
                  </Badge>
                }
              />
              <Row label="Início" value={formatDate(subscription.started_at)} />
              <Row label="Próxima cobrança" value={formatDate(subscription.next_billing_date)} />
              <Row label="Mensalidade" value={formatBRL(subscription.monthly_price_cents)} />
              {subscription.contract_notes ? (
                <Row label="Observações" value={subscription.contract_notes} />
              ) : null}
            </dl>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Você ainda não possui um contrato ativo. Escolha um plano, leia o contrato e assine
                aqui mesmo pelo painel.
              </p>
              <Button asChild>
                <Link to="/painel/contratar">Contratar plano</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-xl font-bold">Meus dados</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Nome" value={profile?.full_name ?? "—"} />
            <Row label="CPF/CNPJ" value={profile?.cpf_cnpj ?? "—"} />
            <Row label="E-mail" value={profile?.email ?? "—"} />
            <Row label="Telefone" value={profile?.phone ?? "—"} />
            <Row
              label="Endereço"
              value={
                [profile?.address, profile?.address_number, profile?.neighborhood, profile?.city_uf]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
            <Row
              label="Tipo de cliente"
              value={profile?.client_type === "condominio" ? "Condomínio" : "Residência"}
            />
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            Para atualizar dados cadastrais ou condições do contrato, fale com nosso time pelo
            WhatsApp {CONTACT.whatsappLabel}.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FileCheck2 className="h-5 w-5 text-primary" /> Contrato assinado
            </h2>
            {contract ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Aceito em {formatDateTime(contract.accepted_at)} · versão {contract.contract_version}
                {contract.accept_ip ? ` · IP ${contract.accept_ip}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Você ainda não assinou o contrato de assinatura.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {contract && contractFields ? (
              <>
                <Button variant="outline" onClick={() => setShowContract((value) => !value)}>
                  {showContract ? "Ocultar contrato" : "Ler contrato"}
                </Button>
                <Button
                  onClick={() =>
                    downloadContractPdf(contractFields, `contrato-serviceflix-${contract.id}.pdf`)
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Baixar em PDF
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/painel/contratar">Ler e assinar contrato</Link>
              </Button>
            )}
          </div>
        </div>

        {showContract && contractFields ? (
          <div className="mt-6 max-h-[520px] overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
            <ContractText fields={contractFields} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
