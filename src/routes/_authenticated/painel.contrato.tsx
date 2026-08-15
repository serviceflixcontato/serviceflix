import { Link, createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
  useProfile,
  useSubscription,
} from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/contrato")({
  component: Contrato,
});

function Contrato() {
  const { data: profile } = useProfile();
  const { data: subscription, isLoading } = useSubscription();

  return (
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
              Você ainda não possui um contrato ativo. Escolha um plano e nossa equipe formaliza tudo
              com você.
            </p>
            <Button asChild>
              <Link to="/planos">Ver planos disponíveis</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Meus dados</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Nome" value={profile?.full_name ?? "—"} />
          <Row label="E-mail" value={profile?.email ?? "—"} />
          <Row label="Telefone" value={profile?.phone ?? "—"} />
          <Row label="Endereço" value={profile?.address ?? "—"} />
          <Row
            label="Tipo de cliente"
            value={profile?.client_type === "condominio" ? "Condomínio" : "Residência"}
          />
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Para atualizar dados cadastrais ou condições do contrato, fale com nosso time pelo WhatsApp{" "}
          {CONTACT.phoneDisplay}.
        </p>
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
