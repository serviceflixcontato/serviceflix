import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, formatBRL, formatDate, formatDateTime } from "@/hooks/use-panel-data";
import {
  getAdminOverview,
  setPaymentStatusManually,
  updateReferralStatus,
} from "@/lib/admin.functions";
import { ManualPlanActivation } from "@/components/admin/ManualPlanActivation";
import { SubscriptionRowActions } from "@/components/admin/SubscriptionRowActions";
import { ContractRowActions } from "@/components/admin/ContractRowActions";
import { ServiceRequestActions } from "@/components/admin/ServiceRequestActions";
import { WorkOrderManager } from "@/components/admin/WorkOrderManager";
import { activateSubscriptionFromContract } from "@/lib/activation.functions";
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_OPTIONS,
  REWARD_STATUS_LABELS,
  REWARD_STATUS_OPTIONS,
} from "@/lib/referrals";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoGrid } from "@/components/site/PhotoGrid";
import { groupPhotos, useServicePhotos } from "@/hooks/use-service-photos";
import { uploadServicePhotos } from "@/lib/service-photos";
import { supabase } from "@/integrations/supabase/client";
import { buildContractFields } from "@/lib/contract-fields";
import { downloadContractPdf } from "@/lib/contract-pdf";


const TABS = [
  { id: "clientes", label: "Clientes" },
  { id: "assinaturas", label: "Assinaturas e pagamentos" },
  { id: "servicos", label: "Solicitações e OS" },
  { id: "contratos", label: "Contratos assinados" },
  { id: "indicacoes", label: "Indicações" },
  { id: "leads", label: "Contatos do site" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">{children}</section>
  );
}

export function AdminOverview() {
  const fetchOverview = useServerFn(getAdminOverview);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("clientes");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
  });

  const { data: photos = [] } = useServicePhotos();
  const photosByRequest = groupPhotos(photos).byRequest;

  const setPaymentStatus = useServerFn(setPaymentStatusManually);
  const paymentMutation = useMutation({
    mutationFn: (input: { payment_id: string; status: string; method?: string }) =>
      setPaymentStatus({ data: input as never }),
    onSuccess: () => {
      toast.success("Pagamento atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Não foi possível atualizar o pagamento."),
  });

  const activateSubscription = useServerFn(activateSubscriptionFromContract);
  const activationMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      activateSubscription({ data: { subscription_id: subscriptionId } }),
    onSuccess: () => {
      toast.success("Conta ativada! O cliente já pode abrir solicitações.");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Não foi possível ativar a conta."),
  });

  const updateReferral = useServerFn(updateReferralStatus);
  const referralMutation = useMutation({
    mutationFn: (input: { id: string; status: string; reward_status: string }) =>
      updateReferral({ data: input as never }),
    onSuccess: () => {
      toast.success("Indicação atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Não foi possível atualizar a indicação."),
  });

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    if (data?.ok) {
      for (const profile of data.profiles) {
        map.set(profile.id, profile.full_name ?? profile.email ?? "Cliente");
      }
    }
    return map;
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando dados administrativos...</p>;
  }

  if (!data?.ok) {
    return (
      <Card>
        <h1 className="text-xl font-bold">Painel administrativo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é restrita à equipe Service Flix.
        </p>
      </Card>
    );
  }

  const { profiles, subscriptions, payments, requests, orders, referrals, leads, contracts } = data;
  const paid = payments.filter((p) => p.status === "pago");
  const unpaid = payments.filter((p) => p.status !== "pago");
  const totalPaid = paid.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const totalOpen = unpaid.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const activeSubs = subscriptions.filter((s) => s.status === "ativa");
  const convertedReferrals = referrals.filter((r) => r.status === "contratado");

  const pendingActivation = subscriptions
    .filter((sub) => sub.status !== "ativa" && sub.status !== "cancelada")
    .map((sub) => {
      const contract = contracts.find((item) => item.user_id === sub.user_id);
      const subPayments = payments.filter((p) => p.user_id === sub.user_id);
      const paidPayment = subPayments.find((p) => p.status === "pago");
      const openPayment = subPayments.find((p) => p.status !== "pago");
      return { sub, contract, paidPayment, openPayment };
    })
    .filter((item) => Boolean(item.contract) || Boolean(item.sub.activation_requested_at))
    .sort((a, b) => (a.paidPayment ? -1 : 0) - (b.paidPayment ? -1 : 0));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-brand-gradient p-6 text-primary-foreground shadow-elevated">
        <h1 className="text-2xl font-bold">Painel administrativo</h1>
        <p className="mt-2 text-sm text-primary-foreground/90">
          Clientes, assinaturas, pagamentos, ordens de serviço e indicações da Service Flix.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Clientes cadastrados" value={String(profiles.length)} />
        <Stat
          icon={CheckCircle2}
          label="Assinaturas ativas"
          value={`${activeSubs.length} de ${subscriptions.length}`}
        />
        <Stat icon={AlertTriangle} label="Em aberto" value={formatBRL(totalOpen)} hint={`${unpaid.length} fatura(s)`} />
        <Stat icon={Gift} label="Indicações convertidas" value={`${convertedReferrals.length} de ${referrals.length}`} />
      </div>

      {pendingActivation.length > 0 ? (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BellRing className="h-5 w-5 text-primary" /> Contratos aguardando ativação
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Contratos assinados pelo cliente. Os destacados em amarelo piscante já têm pagamento
            confirmado e estão esperando a sua ativação.
          </p>
          <ul className="mt-4 space-y-3">
            {pendingActivation.map(({ sub, contract, paidPayment, openPayment }) => (
              <li
                key={sub.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                  paidPayment ? "blink-pending" : "border-border"
                }`}
              >
                <div>
                  <p className="font-semibold">
                    {nameById.get(sub.user_id) ?? contract?.full_name ?? "Cliente"} · {sub.plan_name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBRL(sub.monthly_price_cents)}/mês ·{" "}
                    {sub.payment_method ?? "forma de pagamento não escolhida"}
                    {contract ? ` · contrato assinado em ${formatDateTime(contract.accepted_at)}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-medium">
                    {paidPayment
                      ? "Pagamento confirmado — pronto para ativar"
                      : openPayment
                        ? `Pagamento pendente (${openPayment.method ?? "online"}) — ${formatBRL(openPayment.amount_cents)}`
                        : "Sem fatura registrada"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {openPayment ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paymentMutation.isPending}
                      onClick={() =>
                        paymentMutation.mutate({
                          payment_id: openPayment.id,
                          status: "pago",
                          method: openPayment.method ?? "dinheiro",
                        })
                      }
                    >
                      Confirmar pagamento
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    disabled={activationMutation.isPending}
                    onClick={() => activationMutation.mutate(sub.id)}
                  >
                    {activationMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Ativar conta
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-card">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "clientes" ? (
        <Card>
          <h2 className="text-lg font-semibold">Clientes cadastrados no site</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos os cadastros feitos pela área do cliente, com os dados completos usados no
            contrato.
          </p>
          {profiles.length === 0 ? (
            <Empty text="Nenhum cliente cadastrado ainda." />
          ) : (
            <ul className="mt-4 space-y-3">
              {profiles.map((profile) => {
                const clientSubs = subscriptions.filter((s) => s.user_id === profile.id);
                const clientPayments = payments.filter((p) => p.user_id === profile.id);
                const clientPaid = clientPayments.filter((p) => p.status === "pago");
                const clientContracts = contracts.filter((c) => c.user_id === profile.id);
                const fullAddress = [
                  profile.address,
                  profile.address_number,
                  profile.complement,
                  profile.neighborhood,
                  profile.city_uf,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <li key={profile.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {profile.full_name ?? profile.email ?? "Cliente"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {profile.email ?? "—"} · {profile.phone ?? "sem telefone"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          CPF/CNPJ: {profile.cpf_cnpj ?? "não informado"} ·{" "}
                          {profile.client_type === "condominio" ? "Condomínio" : "Residência"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Endereço: {fullAddress || "não informado"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cadastro em {formatDateTime(profile.created_at)} ·{" "}
                          {clientSubs.length === 1
                            ? "1 contrato"
                            : `${clientSubs.length} contratos`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            clientSubs.some((s) => s.status === "ativa") ? "default" : "secondary"
                          }
                        >
                          {clientSubs.some((s) => s.status === "ativa")
                            ? "Cliente ativo"
                            : clientSubs.length > 0
                              ? "Aguardando ativação"
                              : "Sem plano"}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Pago até hoje:{" "}
                          {formatBRL(clientPaid.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0))}
                        </p>
                      </div>
                    </div>

                    {clientSubs.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum contrato registrado para este cliente.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {clientSubs.map((sub) => {
                          const subContract = clientContracts.find(
                            (c) => c.subscription_id === sub.id,
                          );
                          const subPayments = clientPayments.filter(
                            (p) => p.subscription_id === sub.id,
                          );
                          return (
                            <li key={sub.id} className="rounded-lg border border-border/70 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold">{sub.plan_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBRL(sub.monthly_price_cents)}/mês · início{" "}
                                    {formatDate(sub.started_at)} · próxima cobrança{" "}
                                    {formatDate(sub.next_billing_date)}
                                  </p>
                                  <p className="text-xs text-primary">
                                    {subContract?.contract_code
                                      ? `Contrato nº ${subContract.contract_code}`
                                      : sub.contract_number
                                        ? `Contrato ${sub.contract_number}`
                                        : "Contrato sem número"}
                                  </p>
                                </div>
                                <Badge variant={sub.status === "ativa" ? "default" : "secondary"}>
                                  {STATUS_LABELS[sub.status] ?? sub.status}
                                </Badge>
                              </div>

                              {subPayments.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  {subPayments.map((payment) => (
                                    <li key={payment.id}>
                                      {formatBRL(payment.amount_cents)} · {payment.description} ·{" "}
                                      {STATUS_LABELS[payment.status] ?? payment.status} ·{" "}
                                      {payment.paid_at
                                        ? `pago em ${formatDateTime(payment.paid_at)}`
                                        : `vence em ${formatDate(payment.due_date)}`}
                                      {payment.method ? ` · ${payment.method}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}

                              <div className="mt-3">
                                <SubscriptionRowActions sub={sub} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "assinaturas" ? (
        <div className="space-y-6">
          <ManualPlanActivation clients={profiles} />
          <Card>
            <h2 className="text-lg font-semibold">Assinaturas</h2>
            {subscriptions.length === 0 ? (
              <Empty text="Nenhuma assinatura registrada." />
            ) : (
              <ul className="mt-4 space-y-3">
                {subscriptions.map((sub) => (
                  <li key={sub.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {nameById.get(sub.user_id) ?? "Cliente"} · {sub.plan_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatBRL(sub.monthly_price_cents)}/mês ·{" "}
                          {sub.payment_method ?? "forma de pagamento não escolhida"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Início {formatDate(sub.started_at)} · próxima cobrança{" "}
                          {formatDate(sub.next_billing_date)} · contrato{" "}
                          {sub.contract_number ?? "—"}
                        </p>
                      </div>
                      <Badge variant={sub.status === "ativa" ? "default" : "secondary"}>
                        {STATUS_LABELS[sub.status] ?? sub.status}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <SubscriptionRowActions sub={sub} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Pagamentos</h2>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">Recebido: {formatBRL(totalPaid)}</Badge>
                <Badge variant="outline">Em aberto: {formatBRL(totalOpen)}</Badge>
              </div>
            </div>
            {payments.length === 0 ? (
              <Empty text="Nenhuma fatura registrada." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <Head
                    cells={[
                      "Cliente",
                      "Descrição",
                      "Valor",
                      "Vencimento",
                      "Situação",
                      "Pago em",
                      "Ação",
                    ]}
                  />
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium">
                          {nameById.get(payment.user_id) ?? "Cliente"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{payment.description}</td>
                        <td className="py-3 pr-4">{formatBRL(payment.amount_cents)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={payment.status === "pago" ? "default" : "outline"}>
                            {STATUS_LABELS[payment.status] ?? payment.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {payment.paid_at ? formatDateTime(payment.paid_at) : "—"}
                          {payment.method ? ` · ${payment.method}` : ""}
                        </td>
                        <td className="py-3">
                          {payment.status === "pago" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={paymentMutation.isPending}
                              onClick={() =>
                                paymentMutation.mutate({
                                  payment_id: payment.id,
                                  status: "pendente",
                                })
                              }
                            >
                              Voltar p/ pendente
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={paymentMutation.isPending}
                              onClick={() =>
                                paymentMutation.mutate({
                                  payment_id: payment.id,
                                  status: "pago",
                                  method: "dinheiro",
                                })
                              }
                            >
                              Recebi em dinheiro
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "servicos" ? (
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold">Solicitações recebidas</h2>
            {requests.length === 0 ? (
              <Empty text="Nenhuma solicitação enviada pelos clientes." />
            ) : (
              <ul className="mt-4 space-y-3">
                {requests.map((request) => (
                  <li key={request.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">
                        {request.request_code ? `${request.request_code} · ` : ""}
                        {request.title}
                      </p>
                      <Badge variant="secondary">
                        {STATUS_LABELS[request.status] ?? request.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {nameById.get(request.user_id) ?? "Cliente"} · {request.category} · urgência{" "}
                      {request.urgency} · {formatDateTime(request.created_at)}
                    </p>
                    {request.location ? (
                      <p className="mt-1 text-sm text-muted-foreground">Local: {request.location}</p>
                    ) : null}
                    {request.description ? (
                      <p className="mt-2 text-sm">{request.description}</p>
                    ) : null}
                    {request.scheduled_at ? (
                      <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm">
                        <p>
                          <strong>Visita agendada:</strong> {formatDateTime(request.scheduled_at)}
                        </p>
                        {request.materials_needed ? (
                          <p className="mt-1 text-muted-foreground">
                            Material: {request.materials_needed}
                          </p>
                        ) : null}
                        <div className="mt-1">
                          {request.schedule_status === "confirmado" ? (
                            <Badge>Cliente confirmou</Badge>
                          ) : request.schedule_status === "reagendamento_solicitado" ? (
                            <Badge variant="destructive">Cliente pediu reagendamento</Badge>
                          ) : (
                            <Badge variant="outline">Aguardando confirmação do cliente</Badge>
                          )}
                        </div>
                        {request.client_response_note ? (
                          <p className="mt-2 text-muted-foreground">
                            Motivo informado pelo cliente: {request.client_response_note}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <ServiceRequestActions request={request} />
                    <PhotoGrid
                      photos={(photosByRequest.get(request.id) ?? []).filter(
                        (photo) => photo.kind === "cliente",
                      )}
                      title="Fotos enviadas pelo cliente"
                    />
                    <PhotoGrid
                      photos={(photosByRequest.get(request.id) ?? []).filter(
                        (photo) => photo.kind === "conclusao",
                      )}
                      title="Fotos do serviço finalizado"
                    />
                    <FinishedPhotoUpload requestId={request.id} clientId={request.user_id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Wrench className="h-4 w-4 text-primary" /> Ordens de serviço
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie a OS para o cliente, mude a data, conclua com as horas trabalhadas ou exclua.
              Tudo aparece na área do cliente na hora.
            </p>
            <div className="mt-4">
              <WorkOrderManager
                orders={orders}
                clients={profiles}
                requests={requests}
                nameById={nameById}
              />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "indicacoes" ? (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Gift className="h-4 w-4 text-primary" /> Indicações dos clientes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Marque como <strong>Contratou o plano</strong> e libere a recompensa quando o indicado
            fechar contrato.
          </p>
          {referrals.length === 0 ? (
            <Empty text="Nenhuma indicação recebida ainda." />
          ) : (
            <ul className="mt-4 space-y-4">
              {referrals.map((referral) => (
                <li key={referral.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{referral.property_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Responsável: {referral.contact_name}
                        {referral.cnpj ? ` · CNPJ ${referral.cnpj}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">{referral.address}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Indicado por {nameById.get(referral.referrer_id) ?? "cliente"} em{" "}
                        {formatDateTime(referral.created_at)}
                      </p>
                      {referral.contact_phone || referral.contact_email ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Contato: {referral.contact_phone ?? "—"} · {referral.contact_email ?? "—"}
                        </p>
                      ) : null}
                      {referral.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">{referral.notes}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      Recompensa {formatBRL(referral.reward_cents)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Situação da indicação
                      </p>
                      <Select
                        value={referral.status}
                        onValueChange={(value) =>
                          referralMutation.mutate({
                            id: referral.id,
                            status: value,
                            reward_status: referral.reward_status,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REFERRAL_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {REFERRAL_STATUS_LABELS[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Recompensa</p>
                      <Select
                        value={referral.reward_status}
                        onValueChange={(value) =>
                          referralMutation.mutate({
                            id: referral.id,
                            status: referral.status,
                            reward_status: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REWARD_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {REWARD_STATUS_LABELS[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "leads" ? (
        <Card>
          <h2 className="text-lg font-semibold">Contatos recebidos pelo site</h2>
          {leads.length === 0 ? (
            <Empty text="Nenhuma solicitação de contato ainda." />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <Head cells={["Nome", "Contato", "Imóvel", "Plano", "Recebido"]} />
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{lead.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lead.email}
                        <br />
                        {lead.phone}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lead.property_type === "condominio" ? "Condomínio" : "Residência"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lead.plan_interest ?? "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatDateTime(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === "contratos" ? (
        <Card>
          <h2 className="text-lg font-semibold">Contratos assinados pelos clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada aceite guarda data, hora, IP e a versão do contrato, além dos dados informados pelo
            cliente.
          </p>
          {contracts.length === 0 ? (
            <Empty text="Nenhum contrato assinado ainda." />
          ) : (
            <ul className="mt-4 space-y-3">
              {contracts.map((contract) => {
                const contractFields = buildContractFields(
                  {
                    full_name: contract.full_name,
                    cpf_cnpj: contract.cpf_cnpj,
                    email: contract.email,
                    phone: contract.phone,
                    address: contract.service_address,
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
                  },
                );
                const extra =
                  contract.fields && typeof contract.fields === "object" && !Array.isArray(contract.fields)
                    ? (contract.fields as Record<string, string>)
                    : {};
                const merged = { ...contractFields, ...extra };
                return (
                  <li key={contract.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {contract.full_name ?? nameById.get(contract.user_id) ?? "Cliente"}
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          Contrato nº {contract.contract_code ?? "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {contract.plan_name} · {formatBRL(contract.monthly_price_cents)} ·{" "}
                          {contract.periodicity} · {contract.payment_method}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          CPF/CNPJ {contract.cpf_cnpj ?? "—"} · {contract.email ?? "—"} ·{" "}
                          {contract.phone ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Endereço de atendimento: {contract.service_address ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Aceite em {formatDateTime(contract.accepted_at)} · versão{" "}
                          {contract.contract_version}
                          {contract.accept_ip ? ` · IP ${contract.accept_ip}` : ""}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadContractPdf(
                              merged,
                              `contrato-serviceflix-${contract.contract_code ?? contract.id}.pdf`,
                            )
                          }
                        >
                          Baixar PDF
                        </Button>
                        <ContractRowActions
                          contract={contract}
                          subscriptionId={
                            subscriptions.find((s) => s.user_id === contract.user_id)?.id ?? null
                          }
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Head({ cells }: { cells: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
        {cells.map((cell) => (
          <th key={cell} className="pb-2 pr-4 font-medium">
            {cell}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" /> {text}
    </p>
  );
}

/** Envio de fotos do serviço concluído para o cliente ver no painel dele. */
function FinishedPhotoUpload({ requestId, clientId }: { requestId: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (files.length === 0) {
      toast.error("Selecione ao menos uma foto.");
      return;
    }
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) throw new Error("Sessão expirada. Entre novamente.");
      await uploadServicePhotos({
        files,
        ownerId: clientId,
        uploadedBy: adminId,
        kind: "conclusao",
        requestId,
        caption: caption.trim() || null,
      });
      toast.success("Fotos enviadas ao cliente.");
      setFiles([]);
      setCaption("");
      void queryClient.invalidateQueries({ queryKey: ["service_photos"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar as fotos.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Enviar fotos do serviço finalizado
      </Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <Input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Observação do serviço executado (opcional)"
          maxLength={200}
        />
        <Button type="button" onClick={handleSend} disabled={sending}>
          {sending ? "Enviando..." : "Enviar ao cliente"}
        </Button>
      </div>
    </div>
  );
}
