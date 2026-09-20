import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, FileCheck2, Plus } from "lucide-react";
import { useState } from "react";

import { ContractText } from "@/components/site/ContractText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import { buildContractFields } from "@/lib/contract-fields";
import { downloadContractPdf } from "@/lib/contract-pdf";
import { useMyContracts, type ContractAcceptanceRow } from "@/hooks/use-contract";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
  formatDateTime,
  useProfile,
  useSubscriptions,
} from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/contrato")({
  component: Contrato,
});

function Contrato() {
  const { data: profile } = useProfile();
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: contracts = [] } = useMyContracts();

  const orphanContracts = contracts.filter(
    (contract) => !subscriptions.some((sub) => sub.id === contract.subscription_id),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Meus contratos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Você pode ter mais de um contrato ao mesmo tempo — por exemplo, um para o condomínio e
              outro para a residência.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/painel/contratar">
              <Plus className="mr-2 h-4 w-4" /> Novo contrato
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Meus dados</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : subscriptions.length === 0 && orphanContracts.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-sm text-muted-foreground">
            Você ainda não possui um contrato. Escolha um plano, leia o contrato e assine aqui mesmo
            pelo painel.
          </p>
          <Button asChild className="mt-4">
            <Link to="/painel/contratar">Contratar plano</Link>
          </Button>
        </section>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((sub) => (
            <ContractCard
              key={sub.id}
              subscription={sub}
              contract={contracts.find((item) => item.subscription_id === sub.id) ?? null}
              profile={profile ?? null}
            />
          ))}
          {orphanContracts.map((contract) => (
            <ContractCard key={contract.id} subscription={null} contract={contract} profile={profile ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

type SubscriptionLike = {
  id: string;
  plan_name: string;
  status: string;
  contract_number: string | null;
  contract_notes: string | null;
  started_at: string | null;
  next_billing_date: string | null;
  monthly_price_cents: number | null;
};

function ContractCard({
  subscription,
  contract,
  profile,
}: {
  subscription: SubscriptionLike | null;
  contract: ContractAcceptanceRow | null;
  profile: Record<string, unknown> | null;
}) {
  const [showContract, setShowContract] = useState(false);
  const p = (profile ?? {}) as Record<string, string | null>;

  const contractFields = contract
    ? buildContractFields(
        {
          full_name: contract.full_name,
          cpf_cnpj: contract.cpf_cnpj,
          email: contract.email,
          phone: contract.phone,
          address: p["address"] ?? null,
          address_number: p["address_number"] ?? null,
          complement: p["complement"] ?? null,
          neighborhood: p["neighborhood"] ?? null,
          city_uf: p["city_uf"] ?? null,
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

  const title = subscription?.plan_name ?? contract?.plan_name ?? "Contrato";
  const code = contract?.contract_code ?? subscription?.contract_number ?? null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <FileCheck2 className="h-5 w-5 text-primary" /> {title}
          </h2>
          {code ? <p className="mt-1 text-sm text-primary">Contrato nº {code}</p> : null}
          {contract ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Assinado em {formatDateTime(contract.accepted_at)} · versão{" "}
              {contract.contract_version}
              {contract.accept_ip ? ` · IP ${contract.accept_ip}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Contrato ainda não assinado.</p>
          )}
        </div>
        {subscription ? (
          <Badge variant={subscription.status === "ativa" ? "default" : "secondary"}>
            {STATUS_LABELS[subscription.status] ?? subscription.status}
          </Badge>
        ) : null}
      </div>

      {subscription ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Início" value={formatDate(subscription.started_at)} />
          <Row label="Próxima cobrança" value={formatDate(subscription.next_billing_date)} />
          <Row label="Mensalidade" value={formatBRL(subscription.monthly_price_cents)} />
          {subscription.contract_notes ? (
            <Row label="Observações" value={subscription.contract_notes} />
          ) : null}
        </dl>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {contract && contractFields ? (
          <>
            <Button variant="outline" onClick={() => setShowContract((value) => !value)}>
              {showContract ? "Ocultar contrato" : "Ler contrato"}
            </Button>
            <Button
              onClick={() =>
                downloadContractPdf(
                  contractFields,
                  `contrato-serviceflix-${code ?? contract.id}.pdf`,
                )
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

      {showContract && contractFields ? (
        <div className="mt-6 max-h-[520px] overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
          <ContractText fields={contractFields} />
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
