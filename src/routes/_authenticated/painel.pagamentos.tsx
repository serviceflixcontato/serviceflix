import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FlaskConical,
  Loader2,
  QrCode,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import { chooseSubscriptionPayment } from "@/lib/activation.functions";
import { createInvoiceCheckout, createSubscriptionCheckout } from "@/lib/payments.functions";
import { usePaymentConfig } from "@/hooks/use-payment-config";
import { useMyContract } from "@/hooks/use-contract";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
  formatDateTime,
  usePayments,
  useSubscription,
} from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/pagamentos")({
  component: Pagamentos,
});

function notConfiguredToast() {
  toast.info(
    "O pagamento online está sendo configurado. Enquanto isso, fale com nosso time pelo WhatsApp " +
      CONTACT.whatsappLabel + " para receber o link de cobrança.",
  );
}

const OPTIONS = [
  {
    id: "pix" as const,
    icon: QrCode,
    title: "Pix online",
    description: "Pague na hora pelo Mercado Pago e envie para análise da nossa equipe.",
  },
  {
    id: "cartao" as const,
    icon: CreditCard,
    title: "Cartão de crédito",
    description: "Pagamento online pelo Mercado Pago, com opção de mensalidade recorrente.",
  },
  {
    id: "dinheiro" as const,
    icon: Banknote,
    title: "Dinheiro (presencial)",
    description: "Combinamos a entrega do valor e a equipe confirma o recebimento no sistema.",
  },
];

function Pagamentos() {
  const queryClient = useQueryClient();
  const { data: payments = [], isLoading } = usePayments();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: contracts = [] } = useMyContracts();
  const { data: config } = usePaymentConfig();
  const open = payments.filter((payment) => payment.status !== "pago");
  const paid = payments.filter((payment) => payment.status === "pago");

  const invoiceCheckout = useServerFn(createInvoiceCheckout);
  const subscriptionCheckout = useServerFn(createSubscriptionCheckout);
  const choosePayment = useServerFn(chooseSubscriptionPayment);

  const chooseMutation = useMutation({
    mutationFn: (input: { option: "pix" | "cartao" | "dinheiro"; subscriptionId: string }) =>
      choosePayment({ data: { option: input.option, subscription_id: input.subscriptionId } }),
    onSuccess: async (result, input) => {
      if (!result.ok) {
        toast.info("Assine o contrato de um plano antes de escolher a forma de pagamento.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });

      if (input.option === "dinheiro") {
        toast.success(
          "Pagamento em dinheiro selecionado. Nossa equipe confirma o recebimento e ativa sua conta.",
        );
        return;
      }
      if (!result.paymentId) {
        toast.info("Seu plano ainda não tem valor definido. Fale com nosso time.");
        return;
      }
      const checkout = await invoiceCheckout({ data: { paymentId: result.paymentId } });
      if (checkout.ok) {
        window.location.href = checkout.checkoutUrl;
        return;
      }
      notConfiguredToast();
    },
    onError: () => toast.error("Não foi possível registrar a forma de pagamento."),
  });

  const payInvoice = useMutation({
    mutationFn: (paymentId: string) => invoiceCheckout({ data: { paymentId } }),
    onSuccess: (result) => {
      if (result.ok) {
        window.location.href = result.checkoutUrl;
        return;
      }
      notConfiguredToast();
    },
    onError: () => toast.error("Não foi possível gerar o pagamento. Tente novamente."),
  });

  const startSubscription = useMutation({
    mutationFn: () => subscriptionCheckout(),
    onSuccess: (result) => {
      if (result.ok) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.reason === "no_subscription") {
        toast.info("Você ainda não tem um plano com valor definido. Fale com nosso time.");
        return;
      }
      if (result.reason === "no_email") {
        toast.info("Cadastre seu e-mail no perfil para ativar a assinatura recorrente.");
        return;
      }
      notConfiguredToast();
    },
    onError: () => toast.error("Não foi possível iniciar a assinatura. Tente novamente."),
  });

  return (
    <div className="space-y-6">
      {config?.mode === "sandbox" ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/60 p-3 text-xs text-muted-foreground">
          <FlaskConical className="h-4 w-4 text-primary" />
          Pagamentos em <strong>modo teste</strong> do Mercado Pago — nenhuma cobrança real é feita.
        </p>
      ) : null}

      {subscriptions.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-xl font-bold">Escolha um plano para começar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Depois de escolher o plano e assinar o contrato, você volta aqui para pagar.
          </p>
          <Button asChild className="mt-4">
            <Link to="/painel/contratar">Escolher plano e assinar contrato</Link>
          </Button>
        </section>
      ) : (
        subscriptions.map((subscription) => {
          const contract = contracts.find((item) => item.subscription_id === subscription.id);
          const isActive = subscription.status === "ativa";
          return (
            <section
              key={subscription.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold">{subscription.plan_name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatBRL(subscription.monthly_price_cents)}/mês
                    {contract?.contract_code ? ` · contrato nº ${contract.contract_code}` : ""}
                  </p>
                  {contract ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contrato assinado em {formatDateTime(contract.accepted_at)}
                    </p>
                  ) : null}
                  {subscription.next_billing_date ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Próxima cobrança em {formatDate(subscription.next_billing_date)}
                    </p>
                  ) : null}
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {STATUS_LABELS[subscription.status] ?? subscription.status}
                </Badge>
              </div>

              {!isActive ? (
                <div className="mt-6 space-y-4">
                  <h2 className="text-lg font-semibold">Como você quer pagar?</h2>
                  <p className="text-sm text-muted-foreground">
                    Escolha uma opção abaixo. A liberação da conta é feita pela nossa equipe depois
                    da análise do contrato e da confirmação do pagamento.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {OPTIONS.map((option) => {
                      const selected = subscription.payment_method?.startsWith(
                        option.id === "pix"
                          ? "Pix"
                          : option.id === "cartao"
                            ? "Cartão"
                            : "Dinheiro",
                      );
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={chooseMutation.isPending}
                          onClick={() =>
                            chooseMutation.mutate({
                              option: option.id,
                              subscriptionId: subscription.id,
                            })
                          }
                          className={`rounded-xl border p-4 text-left transition-colors hover:border-primary ${
                            selected ? "border-primary bg-accent" : "border-border"
                          }`}
                        >
                          <option.icon className="h-5 w-5 text-primary" />
                          <p className="mt-2 font-semibold">{option.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {subscription.activation_requested_at ? (
                    <p className="rounded-xl border border-primary/40 bg-accent p-3 text-sm text-accent-foreground">
                      Forma escolhida: <strong>{subscription.payment_method}</strong>. Recebemos seu
                      pedido em {formatDateTime(subscription.activation_requested_at)} e sua conta
                      será ativada pela nossa equipe após a conferência do pagamento. Você poderá
                      abrir solicitações de serviço assim que a conta estiver ativa.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Débito automático mensal</p>
                    <p className="text-xs text-muted-foreground">
                      Autorize uma vez no cartão e a mensalidade é cobrada todo mês pelo Mercado
                      Pago.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={startSubscription.isPending}
                    onClick={() => startSubscription.mutate()}
                  >
                    {startSubscription.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Repeat className="mr-2 h-4 w-4" />
                    )}
                    Ativar recorrência
                  </Button>
                </div>
              )}
            </section>
          );
        })
      )}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Faturas em aberto</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : open.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Nenhuma fatura pendente.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {open.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-semibold">{payment.description}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Vence em {formatDate(payment.due_date)} ·{" "}
                    {STATUS_LABELS[payment.status] ?? payment.status}
                    {payment.method === "dinheiro" ? " · aguardando confirmação da equipe" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{formatBRL(payment.amount_cents)}</span>
                  {payment.method === "dinheiro" ? null : (
                    <Button
                      size="sm"
                      disabled={payInvoice.isPending}
                      onClick={() => payInvoice.mutate(payment.id)}
                    >
                      {payInvoice.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Pagar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Histórico de pagamentos</h2>
        {paid.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Seus pagamentos confirmados aparecerão aqui.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Fatura</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Pago em</th>
                  <th className="pb-3">Forma</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="py-3 font-medium">{payment.description}</td>
                    <td className="py-3">{formatBRL(payment.amount_cents)}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(payment.paid_at)}</td>
                    <td className="py-3 text-muted-foreground">{payment.method ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
