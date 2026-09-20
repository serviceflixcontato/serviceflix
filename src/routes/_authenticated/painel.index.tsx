import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, ClipboardList, CreditCard, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isProfileComplete } from "@/lib/profile";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
  formatDateTime,
  usePayments,
  useProfile,
  useServiceRequests,
  useSubscription,
  useWorkOrders,
} from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/")({
  component: PainelHome,
});

function PainelHome() {
  const { data: profile } = useProfile();
  const { data: subscription, isLoading: loadingSub } = useSubscription();
  const { data: requests = [] } = useServiceRequests();
  const { data: orders = [] } = useWorkOrders();
  const { data: payments = [] } = usePayments();

  const openRequests = requests.filter((r) => r.status !== "concluida" && r.status !== "cancelada");
  const nextOrder = [...orders]
    .filter((o) => o.scheduled_for && !o.completed_at)
    .sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""))[0];
  const openPayment = payments.find((p) => p.status !== "pago");

  const firstName = (profile?.full_name ?? "").split(" ")[0];

  const profileComplete = isProfileComplete(profile ?? null);
  const isActive = subscription?.status === "ativa";

  return (
    <div className="space-y-6">
      {!profileComplete ? (
        <section className="rounded-2xl border border-primary/50 bg-accent p-5 text-accent-foreground shadow-card">
          <h2 className="font-semibold">Complete seu cadastro</h2>
          <p className="mt-1 text-sm">
            Faltam alguns dados (CPF/CNPJ e endereço completo). Ao preencher agora, o contrato já sai
            pronto quando você escolher um plano.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/painel/cadastro">Completar cadastro</Link>
          </Button>
        </section>
      ) : null}

      {!isActive ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold">Ativação da conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscription
              ? "Seu contrato está registrado. Escolha a forma de pagamento e aguarde a ativação pela nossa equipe para abrir solicitações."
              : "Escolha um plano, assine o contrato e realize o pagamento. Após a ativação pela nossa equipe você poderá abrir solicitações."}
          </p>
          <Button asChild size="sm" variant="secondary" className="mt-3">
            <Link to={subscription ? "/painel/pagamentos" : "/painel/contratar"}>
              {subscription ? "Escolher forma de pagamento" : "Escolher plano"}
            </Link>
          </Button>
        </section>
      ) : null}

      <div className="rounded-2xl bg-brand-gradient p-6 text-primary-foreground shadow-elevated">
        <h1 className="text-2xl font-bold">
          Olá{firstName ? `, ${firstName}` : ""}! Bem-vindo à sua área exclusiva
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/90">
          Aqui você acompanha o plano contratado, abre novas solicitações de manutenção e controla
          seus pagamentos.
        </p>
        <Button asChild className="mt-5" variant="secondary">
          <Link to="/painel/solicitacoes">
            Abrir nova solicitação <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Plano contratado
            </h2>
            <p className="mt-2 text-2xl font-bold">
              {loadingSub ? "Carregando..." : (subscription?.plan_name ?? "Nenhum plano ativo")}
            </p>
            {subscription ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Início em {formatDate(subscription.started_at)} · Próxima cobrança em{" "}
                {formatDate(subscription.next_billing_date)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que seu contrato for ativado pela nossa equipe, os dados aparecem aqui.
              </p>
            )}
          </div>
          {subscription ? (
            <div className="text-right">
              <Badge variant={subscription.status === "ativa" ? "default" : "secondary"}>
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </Badge>
              <p className="mt-2 text-lg font-semibold">
                {formatBRL(subscription.monthly_price_cents)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </div>
          ) : (
            <Button asChild variant="secondary">
              <Link to="/planos">Ver planos</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Solicitações abertas"
          value={String(openRequests.length)}
          to="/painel/solicitacoes"
        />
        <StatCard
          icon={Wrench}
          label="OS registradas"
          value={String(orders.length)}
          to="/painel/ordens"
        />
        <StatCard
          icon={CalendarCheck}
          label="Próximo atendimento"
          value={nextOrder ? formatDateTime(nextOrder.scheduled_for) : "—"}
          to="/painel/ordens"
        />
        <StatCard
          icon={CreditCard}
          label="Pagamento em aberto"
          value={openPayment ? formatBRL(openPayment.amount_cents) : "Em dia"}
          to="/painel/pagamentos"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Últimas solicitações</h2>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Você ainda não abriu solicitações de manutenção.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.slice(0, 4).map((request) => (
                <li key={request.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-muted-foreground">{formatDate(request.created_at)}</p>
                  </div>
                  <Badge variant="secondary">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Últimas ordens de serviço</h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma OS registrada até o momento.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.slice(0, 4).map((order) => (
                <li key={order.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {order.os_number} · {order.title}
                    </p>
                    <p className="text-muted-foreground">{formatDateTime(order.scheduled_for)}</p>
                  </div>
                  <Badge variant="secondary">{STATUS_LABELS[order.status] ?? order.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  to: "/painel/solicitacoes" | "/painel/ordens" | "/painel/pagamentos";
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Link>
  );
}
