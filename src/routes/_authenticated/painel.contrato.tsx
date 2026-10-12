import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileCheck2, Plus } from "lucide-react";
import { useState } from "react";

import { ContractText } from "@/components/site/ContractText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTACT, PLANS, customPlanTotal } from "@/lib/plans";
import { usePlanPrices } from "@/hooks/use-plan-prices";
import { CustomDays } from "@/components/site/CustomDays";
import { changeMyPlan } from "@/lib/contract.functions";
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

  // Um contrato por cliente: mostramos apenas o contrato atual (o mais recente
  // não cancelado; se todos estiverem cancelados, o mais recente).
  const currentSubscription =
    subscriptions
      .filter((sub) => sub.status !== "cancelada")
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0] ??
    [...subscriptions].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    )[0] ??
    null;

  const currentContract = currentSubscription
    ? (contracts.find((item) => item.subscription_id === currentSubscription.id) ?? null)
    : (contracts[0] ?? null);

  const hasContract = currentSubscription != null && currentSubscription.status !== "cancelada";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Meu contrato</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada cliente tem um único contrato. Para trocar de plano, fale com nossa equipe.
            </p>
          </div>
          {hasContract ? null : (
            <Button asChild variant="outline">
              <Link to="/painel/contratar">
                <Plus className="mr-2 h-4 w-4" /> Assinar contrato
              </Link>
            </Button>
          )}
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
      ) : !currentSubscription && !currentContract ? (
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
        <ContractCard
          subscription={currentSubscription}
          contract={currentContract}
          profile={profile ?? null}
        />
      )}
    </div>
  );
}

type SubscriptionLike = {
  id: string;
  plan_name: string;
  plan_slug?: string | null;
  status: string;
  contract_number: string | null;
  contract_notes: string | null;
  started_at: string | null;
  next_billing_date: string | null;
  monthly_price_cents: number | null;
  pending_plan_name?: string | null;
  pending_plan_slug?: string | null;
  pending_price_cents?: number | null;
  pending_requested_at?: string | null;
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

      {contract ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Contrato já assinado. Ele fica disponível apenas para leitura e download — não pode ser
          alterado nem aceito novamente. Para mudar alguma condição, fale com a nossa equipe.
        </p>
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

      {subscription ? <ChangePlan subscription={subscription} /> : null}

      {showContract && contractFields ? (
        <div className="mt-6 max-h-[520px] overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
          <ContractText fields={contractFields} />
        </div>
      ) : null}
    </section>
  );
}

function ChangePlan({ subscription }: { subscription: SubscriptionLike }) {
  const queryClient = useQueryClient();
  const change = useServerFn(changeMyPlan);
  const [slug, setSlug] = useState(
    PLANS.find((plan) => plan.name === subscription.plan_name)?.slug ?? PLANS[0]!.slug,
  );
  const { data: prices } = usePlanPrices();
  const [customDays, setCustomDays] = useState("");
  const isCustom = slug === "personalizado";
  const days = Number.parseInt(customDays, 10);
  const validDays = Number.isFinite(days) && days >= 1 && days <= 31 ? days : null;
  const dailyRow = prices?.find((item) => item.slug === "personalizado");
  const dailyCents = typeof dailyRow?.price_cents === "number" ? dailyRow.price_cents : null;
  const totalCents = dailyCents != null && validDays ? customPlanTotal(dailyCents, validDays) : null;
  const mutation = useMutation({
    mutationFn: () => {
      if (isCustom && !validDays) {
        throw new Error("dias");
      }
      return change({
        data: {
          subscription_id: subscription.id,
          plan_slug: slug as never,
          ...(isCustom && validDays ? { custom_days: validDays } : {}),
        },
      });
    },
    onSuccess: async () => {
      toast.success(
        "Pedido enviado. Nosso time analisa o pagamento e ativa o novo plano em seguida.",
      );
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error && error.message === "dias"
          ? "Informe quantos dias por mês você quer (1 a 31)."
          : "Não foi possível pedir a mudança de plano agora.",
      ),
  });

  const pending = subscription.pending_plan_name ?? null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">Mudar de plano</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Você continua com o plano atual até a mudança ser liberada. Escolha o novo plano, faça o
        pagamento na aba Pagamentos e nosso time ativa o plano após conferir o pagamento.
      </p>
      {pending ? (
        <p className="mt-3 rounded-lg border border-yellow-400 bg-yellow-100/60 p-3 text-xs text-foreground">
          Pedido de mudança para <strong>{pending}</strong> em análise
          {subscription.pending_price_cents != null
            ? ` — novo valor ${formatBRL(subscription.pending_price_cents)}`
            : ""}
          . Seu plano atual segue valendo até a aprovação.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS.map((plan) => (
              <SelectItem key={plan.slug} value={plan.slug}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Alterando..." : "Mudar de plano"}
        </Button>
      </div>
      {isCustom ? (
        <div className="mt-3">
          <CustomDays
            value={customDays}
            onChange={setCustomDays}
            dailyCents={dailyCents}
            totalCents={totalCents}
          />
        </div>
      ) : null}
    </div>
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
