import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Sparkles,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import {
  chooseSubscriptionPayment,
  createInvoiceCheckout,
  createUpcomingInvoice,
} from "@/lib/finance.functions";
import {
  adhesionOf,
  creditBalance,
  dueLabel,
  groupInvoices,
  invoiceTotals,
  isApproved,
  isDueSoon,
  methodLabel,
  monthLabel,
  sumDue,
  type Invoice,
} from "@/lib/money";
import { useApplyAvailableVouchers, useMyVouchers } from "@/hooks/use-vouchers";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  usePayments,
  useSubscriptions,
} from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/pagamentos")({
  component: Pagamentos,
});

const TABS = [
  { id: "a_vencer" as const, label: "A vencer" },
  { id: "atrasadas" as const, label: "Atrasadas" },
  { id: "pagas" as const, label: "Pagas" },
];

type TabId = (typeof TABS)[number]["id"];

function notConfiguredToast() {
  toast.info(
    "O pagamento online está sendo finalizado. Fale com nosso time pelo WhatsApp " +
      CONTACT.whatsappLabel +
      " para receber o link de cobrança.",
  );
}

function Pagamentos() {
  const queryClient = useQueryClient();
  const { data: payments = [], isLoading } = usePayments();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: vouchers = [] } = useMyVouchers();
  const [tab, setTab] = useState<TabId>("a_vencer");

  const invoices = payments as unknown as Invoice[];
  const groups = groupInvoices(invoices);
  const credit = creditBalance(vouchers);

  const subscription =
    subscriptions.find((item) => item.status === "ativa") ?? subscriptions[0] ?? null;
  const approved = isApproved(subscription);
  const nextInvoice = groups.open[0] ?? null;
  const adhesion = subscription ? adhesionOf(invoices, subscription.id) : null;

  const checkout = useServerFn(createInvoiceCheckout);
  const upcoming = useServerFn(createUpcomingInvoice);
  const choosePayment = useServerFn(chooseSubscriptionPayment);
  const applyCredit = useApplyAvailableVouchers();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["payments"] });
    void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
  };

  const payOnline = useMutation({
    mutationFn: (paymentId: string) => checkout({ data: { paymentId } }),
    onSuccess: (result) => {
      if (result.ok && result.checkoutUrl) {
        const simulated = "simulated" in result && result.simulated;
        if (simulated) {
          void navigate({ to: "/painel/pagamento-teste", search: { fatura: result.checkoutUrl.split("fatura=")[1] ?? "" } });
          toast.info("Modo teste: simulação do pagamento online, sem cobrança real.");
          refresh();
          return;
        }
        window.open(result.checkoutUrl, "_blank", "noopener");
        toast.success("Abrimos o pagamento online em outra aba.");
        refresh();
        return;
      }
      if (result.reason === "nothing_due") {
        toast.success("Esta fatura já está quitada com o seu crédito.");
        refresh();
        return;
      }
      notConfiguredToast();
    },
    onError: () => toast.error("Não foi possível abrir o pagamento online."),
  });

  const generateInvoice = useMutation({
    mutationFn: async () => {
      if (!subscription) return null;
      if (subscription.next_billing_date) {
        return upcoming({
          data: {
            subscription_id: subscription.id,
            due_date: subscription.next_billing_date.slice(0, 10),
          },
        });
      }
      return choosePayment({ data: { option: "online", subscription_id: subscription.id } });
    },
    onSuccess: () => {
      toast.success("Cobrança gerada. Agora é só pagar online.");
      refresh();
    },
    onError: () => toast.error("Não foi possível gerar a cobrança agora."),
  });

  const useCredit = (paymentId: string) =>
    applyCredit.mutate(
      { payment_id: paymentId },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            toast.info("Não há crédito disponível para usar nesta fatura.");
            return;
          }
          toast.success(
            result.paid
              ? "Seu crédito cobriu o valor inteiro. Fatura quitada!"
              : `Crédito de ${formatBRL(result.applied)} aplicado. Pague só a diferença.`,
          );
          refresh();
        },
        onError: () => toast.error("Não foi possível usar o crédito agora."),
      },
    );

  const listFor: Record<TabId, Invoice[]> = {
    a_vencer: groups.upcoming,
    atrasadas: groups.overdue,
    pagas: groups.paid,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo pagamento é feito online, com segurança. A liberação das ordens de serviço é feita
          pela nossa equipe assim que o pagamento é conferido.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando seus pagamentos…</p>
      ) : null}

      {/* Bloco principal: o que precisa ser pago agora */}
      <section
        className={`rounded-2xl border bg-card p-6 shadow-card ${
          nextInvoice && isDueSoon(nextInvoice) ? "blink-alert" : "border-border"
        }`}
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="h-5 w-5 text-primary" /> Pagamento atual
        </h2>

        {nextInvoice ? (
          <NextInvoiceCard
            invoice={nextInvoice}
            credit={credit}
            paying={payOnline.isPending}
            applying={applyCredit.isPending}
            onPay={() => payOnline.mutate(nextInvoice.id)}
            onUseCredit={() => useCredit(nextInvoice.id)}
          />
        ) : (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Você está em dia. Nenhum valor em
              aberto.
            </p>
            {subscription ? (
              <p>
                Próximo vencimento:{" "}
                <strong className="text-foreground">
                  {formatDate(subscription.next_billing_date)}
                </strong>
                {subscription.monthly_price_cents
                  ? ` · ${formatBRL(subscription.monthly_price_cents)}`
                  : ""}
              </p>
            ) : (
              <p>Escolha um plano para começar.</p>
            )}
            {subscription ? (
              <Button
                variant="outline"
                disabled={generateInvoice.isPending}
                onClick={() => generateInvoice.mutate()}
              >
                {generateInvoice.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Adiantar o próximo mês
              </Button>
            ) : null}
          </div>
        )}

        {credit > 0 ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-sm">
            <Ticket className="h-4 w-4 text-primary" />
            Você tem <strong>{formatBRL(credit)}</strong> de crédito de indicação para usar nas
            suas faturas.
          </p>
        ) : null}
      </section>

      {/* Aviso de liberação */}
      {subscription && !approved ? (
        <section className="rounded-2xl border border-primary/50 bg-primary/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Aguardando a liberação da nossa equipe
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {groups.paid.length > 0
              ? "Recebemos o seu pagamento. Assim que conferirmos, o plano fica ativo e as ordens de serviço são liberadas."
              : "Depois do pagamento, nossa equipe confere e ativa o seu plano. Só então as ordens de serviço ficam liberadas."}
          </p>
        </section>
      ) : null}

      {/* Adesão (primeiro pagamento) */}
      {adhesion ? (
        <section className="rounded-2xl border-2 border-primary bg-primary/10 p-5 text-foreground">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" /> Adesão paga · {formatBRL(invoiceTotals(adhesion).gross)}
          </p>
          <p className="mt-2 text-sm">
            Início em {formatDate(adhesion.paid_at ?? adhesion.due_date)} ·{" "}
            {adhesion.method ? methodLabel(adhesion.method) : "pagamento confirmado"}
            {subscription?.next_billing_date
              ? ` · próximo vencimento em ${formatDate(subscription.next_billing_date)}`
              : ""}
          </p>
        </section>
      ) : null}

      {/* Listas */}
      <nav className="flex gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label} ({listFor[item.id].length})
          </button>
        ))}
      </nav>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">
          Total: <strong className="text-foreground">{formatBRL(sumDue(listFor[tab]))}</strong>
        </p>
        {listFor[tab].length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nada por aqui.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {listFor[tab].map((invoice) => {
              const totals = invoiceTotals(invoice);
              const paid = invoice.status === "pago";
              return (
                <li key={invoice.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{invoice.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {paid
                          ? `Pago em ${formatDateTime(invoice.paid_at)}${
                              invoice.method ? ` · ${methodLabel(invoice.method)}` : ""
                            }`
                          : `Vencimento ${formatDate(invoice.due_date)} · ${dueLabel(invoice.due_date)}`}
                      </p>
                      {totals.discount > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Crédito de indicação aplicado: −{formatBRL(totals.discount)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold">
                        {formatBRL(paid ? totals.gross : totals.due)}
                      </span>
                      <Badge variant={paid ? "default" : "outline"}>
                        {paid ? "Paga" : monthLabel(invoice.due_date) || "Em aberto"}
                      </Badge>
                    </div>
                  </div>

                  {!paid ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={payOnline.isPending}
                        onClick={() => payOnline.mutate(invoice.id)}
                      >
                        {payOnline.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Pagar online {formatBRL(totals.due)}
                      </Button>
                      {credit > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={applyCredit.isPending}
                          onClick={() => useCredit(invoice.id)}
                        >
                          Usar meu crédito
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Conta na tela: valor do plano − crédito = a pagar. */
function NextInvoiceCard({
  invoice,
  credit,
  paying,
  applying,
  onPay,
  onUseCredit,
}: {
  invoice: Invoice;
  credit: number;
  paying: boolean;
  applying: boolean;
  onPay: () => void;
  onUseCredit: () => void;
}) {
  const totals = invoiceTotals(invoice);
  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="font-semibold">{invoice.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vencimento {formatDate(invoice.due_date)} · {dueLabel(invoice.due_date)}
        </p>
      </div>

      <dl className="space-y-2 rounded-xl border border-border bg-background p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Valor do plano</dt>
          <dd className="font-medium">{formatBRL(totals.gross)}</dd>
        </div>
        {totals.discount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Crédito de indicação</dt>
            <dd className="font-medium">− {formatBRL(totals.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <dt className="font-semibold">A pagar</dt>
          <dd className="font-bold text-primary">{formatBRL(totals.due)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {totals.due > 0 ? (
          <Button disabled={paying} onClick={onPay}>
            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pagar online {formatBRL(totals.due)}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Fatura quitada com o seu crédito.
          </p>
        )}
        {credit > 0 && totals.due > 0 ? (
          <Button variant="outline" disabled={applying} onClick={onUseCredit}>
            {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Usar meu crédito ({formatBRL(credit)})
          </Button>
        ) : null}
      </div>

      {invoice.status !== "pago" ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-primary" />
          Pagamentos em dinheiro ou Pix feitos presencialmente são registrados pela nossa equipe no
          sistema.
        </p>
      ) : null}
    </div>
  );
}
