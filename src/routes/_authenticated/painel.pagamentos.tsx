import { useState } from "react";
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
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import { chooseSubscriptionPayment } from "@/lib/activation.functions";
import {
  createInvoiceCheckout,
  createSubscriptionCheckout,
  createUpcomingInvoice,
} from "@/lib/payments.functions";
import { dueLabel, isDueSoon, monthLabel } from "@/lib/billing";
import { usePaymentConfig } from "@/hooks/use-payment-config";
import { useMyContracts } from "@/hooks/use-contract";
import { useApplyAvailableVouchers, useApplyVoucher, useMyVouchers } from "@/hooks/use-vouchers";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
  formatDateTime,
  usePayments,
  useSubscriptions,
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

type OptionId = "pix" | "cartao" | "dinheiro";

function currentOption(method: string | null | undefined): OptionId | null {
  if (!method) return null;
  if (method.startsWith("Pix")) return "pix";
  if (method.startsWith("Cartão")) return "cartao";
  if (method.startsWith("Dinheiro")) return "dinheiro";
  return null;
}

function Pagamentos() {
  const queryClient = useQueryClient();
  const { data: payments = [], isLoading } = usePayments();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: contracts = [] } = useMyContracts();
  const { data: config } = usePaymentConfig();
  const [selectedOption, setSelectedOption] = useState<Record<string, OptionId>>({});
  const open = payments.filter((payment) => payment.status !== "pago");
  const paid = payments.filter((payment) => payment.status === "pago");

  const { data: vouchers = [] } = useMyVouchers();
  const availableVouchers = vouchers.filter(
    (voucher) => voucher.status === "disponivel" && voucher.balance_cents > 0,
  );
  const applyVoucher = useApplyVoucher();
  const applyAvailableVouchers = useApplyAvailableVouchers();
  const availableVoucherTotal = availableVouchers.reduce(
    (total, voucher) => total + voucher.balance_cents,
    0,
  );

  const invoiceCheckout = useServerFn(createInvoiceCheckout);
  const subscriptionCheckout = useServerFn(createSubscriptionCheckout);
  const choosePayment = useServerFn(chooseSubscriptionPayment);

  const chooseMutation = useMutation({
    mutationFn: (input: { option: OptionId; subscriptionId: string }) =>
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
          "Pedido finalizado! Aguarde nossa equipe aprovar e ativar o seu contrato. Quando estiver ativo, aparecerá na sua área de cliente.",
        );
        return;
      }
      if (!result.paymentId) {
        toast.info("Seu plano ainda não tem valor definido. Fale com nosso time.");
        return;
      }
      toast.success(
        "Pagamento preparado. Agora aplique seu voucher e confira a diferença antes de pagar online.",
      );
      window.setTimeout(() => {
        document.getElementById("faturas-em-aberto")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
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

  const upcomingInvoice = useServerFn(createUpcomingInvoice);
  const advanceMutation = useMutation({
    mutationFn: (input: { subscription_id: string; due_date: string }) =>
      upcomingInvoice({ data: input }),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.info("Seu plano ainda não tem valor definido. Fale com nosso time.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success(
        "Mensalidade liberada para pagamento. Aplique seu voucher e pague pelo meio que preferir.",
      );
      window.setTimeout(() => {
        document.getElementById("faturas-em-aberto")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    onError: () => toast.error("Não foi possível liberar a mensalidade."),
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
      <section className="rounded-2xl border border-primary/40 bg-accent p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <Ticket className="h-4 w-4 text-primary" /> Saldo disponível em vouchers
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              O crédito é acumulativo e pode abater parte ou todo o valor das suas faturas.
            </p>
          </div>
          <strong className="text-2xl text-primary">{formatBRL(availableVoucherTotal)}</strong>
        </div>
      </section>

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
                    Escolha uma opção e clique em finalizar. A liberação da conta é feita pela nossa
                    equipe depois da análise do contrato e da confirmação do pagamento.
                  </p>
                   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {OPTIONS.map((option) => {
                      const selected = (selectedOption[subscription.id] ??
                        currentOption(subscription.payment_method)) === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setSelectedOption((prev) => ({
                              ...prev,
                              [subscription.id]: option.id,
                            }))
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

                  {(() => {
                    const chosen =
                      selectedOption[subscription.id] ?? currentOption(subscription.payment_method);
                    const pending =
                      chooseMutation.isPending &&
                      chooseMutation.variables?.subscriptionId === subscription.id;
                    const planValue = subscription.monthly_price_cents ?? 0;
                    const estimatedDifference = Math.max(planValue - availableVoucherTotal, 0);
                    return (
                      <div className="space-y-3">
                        {chosen === "pix" || chosen === "cartao" ? (
                          <div className="rounded-xl border border-primary/40 bg-accent p-4">
                            <p className="text-sm font-semibold text-accent-foreground">
                              Resumo antes do pagamento online
                            </p>
                            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                              <div>
                                <span className="block text-xs text-muted-foreground">Valor do plano</span>
                                <strong className="text-lg">{formatBRL(planValue)}</strong>
                              </div>
                              <div>
                                <span className="block text-xs text-muted-foreground">Vouchers disponíveis</span>
                                <strong className="text-lg text-primary">{formatBRL(availableVoucherTotal)}</strong>
                              </div>
                              <div>
                                <span className="block text-xs text-muted-foreground">Diferença estimada</span>
                                <strong className="text-lg">{formatBRL(estimatedDifference)}</strong>
                              </div>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                              Na próxima etapa, aplique o voucher. O pagamento online será criado
                              somente com o saldo restante.
                            </p>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3">
                        <Button
                          disabled={!chosen || pending}
                          onClick={() =>
                            chosen &&
                            chooseMutation.mutate({
                              option: chosen,
                              subscriptionId: subscription.id,
                            })
                          }
                        >
                          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {chosen === "dinheiro"
                            ? "Finalizar e aguardar aprovação"
                            : chosen === "pix"
                              ? "Continuar com Pix"
                              : chosen === "cartao"
                                ? "Continuar com cartão"
                                : "Finalizar pedido"}
                        </Button>
                        {!chosen ? (
                          <span className="text-xs text-muted-foreground">
                            Selecione uma forma de pagamento acima.
                          </span>
                        ) : null}
                        </div>
                      </div>
                    );
                  })()}

                  {subscription.activation_requested_at ? (
                    <p className="rounded-xl border border-primary/40 bg-accent p-3 text-sm text-accent-foreground">
                      Pedido finalizado em {formatDateTime(subscription.activation_requested_at)} ·
                      forma escolhida: <strong>{subscription.payment_method}</strong>.
                      {subscription.payment_method?.startsWith("Dinheiro")
                        ? " Aguarde: nossa equipe vai conferir o pagamento e ativar o seu contrato. Quando estiver ativo, sua área de cliente já mostra as solicitações e ordens de serviço."
                        : " Assim que o pagamento for confirmado, nossa equipe ativa o seu contrato e as solicitações de serviço aparecem na sua área de cliente."}
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

      <section id="faturas-em-aberto" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Faturas em aberto</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : open.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Nenhuma fatura pendente.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {open.map((payment) => {
              const discount = payment.voucher_discount_cents ?? 0;
              const due = Math.max(payment.amount_cents - discount, 0);
              return (
                <li key={payment.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{payment.description}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Vence em {formatDate(payment.due_date)} ·{" "}
                        {STATUS_LABELS[payment.status] ?? payment.status}
                        {payment.method === "dinheiro" ? " · aguardando confirmação da equipe" : ""}
                      </p>
                      <div className="mt-2 grid gap-1 text-xs">
                        <p>Valor do plano: <strong>{formatBRL(payment.amount_cents)}</strong></p>
                        <p className="text-primary">
                          Crédito utilizado: <strong>-{formatBRL(discount)}</strong>
                        </p>
                        <p>Saldo a pagar: <strong>{formatBRL(due)}</strong></p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">Total no pagamento online</span>
                      <span className="text-2xl font-bold">{formatBRL(due)}</span>
                      {payment.method === "dinheiro" ? null : (
                        <Button
                          size="sm"
                          disabled={payInvoice.isPending}
                          onClick={() => payInvoice.mutate(payment.id)}
                        >
                          {payInvoice.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {discount > 0
                            ? `Pagar diferença de ${formatBRL(due)} online`
                            : `Pagar ${formatBRL(due)} online`}
                        </Button>
                      )}
                    </div>
                  </div>

                  {due > 0 && availableVouchers.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/50 p-3">
                      <p className="flex items-center gap-2 text-xs font-semibold">
                        <Ticket className="h-3.5 w-3.5 text-primary" /> Usar voucher de indicação
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Clique em um voucher ou use o saldo acumulado. Depois do uso, ele não poderá
                        ser utilizado novamente.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {availableVouchers.map((voucher) => (
                          <Button
                            key={voucher.id}
                            variant="outline"
                            size="sm"
                            disabled={applyVoucher.isPending || applyAvailableVouchers.isPending}
                            onClick={() =>
                              applyVoucher.mutate(
                                { payment_id: payment.id, code: voucher.code },
                                {
                                  onSuccess: (result) => {
                                    if (!result.ok) {
                                      toast.error("Voucher inválido, já utilizado ou sem saldo.");
                                      return;
                                    }
                                    toast.success(
                                      result.paid
                                        ? `Crédito de ${formatBRL(result.applied)} aplicado. A fatura foi quitada!`
                                        : `Crédito aplicado. Falta pagar ${formatBRL(result.remaining)}.`,
                                    );
                                  },
                                  onError: () => toast.error("Não foi possível aplicar o voucher."),
                                },
                              )
                            }
                          >
                            <Ticket className="mr-2 h-4 w-4" />
                            {voucher.code} · {formatBRL(voucher.balance_cents)}
                          </Button>
                        ))}
                        {availableVouchers.length > 1 ? (
                          <Button
                            size="sm"
                            disabled={applyVoucher.isPending || applyAvailableVouchers.isPending}
                            onClick={() =>
                              applyAvailableVouchers.mutate(
                                { payment_id: payment.id },
                                {
                                  onSuccess: (result) => {
                                    if (!result.ok) {
                                      toast.error("Não há crédito disponível para esta fatura.");
                                      return;
                                    }
                                    toast.success(
                                      result.paid
                                        ? `${formatBRL(result.applied)} em vouchers aplicados. Fatura quitada!`
                                        : `${formatBRL(result.applied)} em vouchers aplicados. Falta pagar ${formatBRL(result.remaining)}.`,
                                    );
                                  },
                                  onError: () => toast.error("Não foi possível aplicar os vouchers."),
                                },
                              )
                            }
                          >
                            {applyAvailableVouchers.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Usar saldo acumulado · {formatBRL(Math.min(availableVoucherTotal, due))}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {availableVouchers.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Ticket className="h-5 w-5 text-primary" /> Meus vouchers de indicação
          </h2>
          <ul className="mt-4 space-y-3">
            {availableVouchers.map((voucher) => (
              <li
                key={voucher.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-semibold">{voucher.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disponível para abatimento · crédito original {formatBRL(voucher.amount_cents)}
                  </p>
                </div>
                <span className="text-lg font-semibold">{formatBRL(voucher.balance_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
