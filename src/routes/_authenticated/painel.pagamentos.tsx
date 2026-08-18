import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, FlaskConical, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
import { createInvoiceCheckout, createSubscriptionCheckout } from "@/lib/payments.functions";
import { usePaymentConfig } from "@/hooks/use-payment-config";
import {
  STATUS_LABELS,
  formatBRL,
  formatDate,
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

function Pagamentos() {
  const { data: payments = [], isLoading } = usePayments();
  const { data: subscription } = useSubscription();
  const { data: config } = usePaymentConfig();
  const open = payments.filter((payment) => payment.status !== "pago");
  const paid = payments.filter((payment) => payment.status === "pago");

  const invoiceCheckout = useServerFn(createInvoiceCheckout);
  const subscriptionCheckout = useServerFn(createSubscriptionCheckout);

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

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Situação da assinatura</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {subscription
                ? `${subscription.plan_name} · ${formatBRL(subscription.monthly_price_cents)}/mês`
                : "Nenhuma assinatura ativa."}
            </p>
            {subscription?.next_billing_date ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Próxima cobrança em {formatDate(subscription.next_billing_date)}
              </p>
            ) : null}
          </div>
          <Badge variant={open.length === 0 ? "default" : "secondary"}>
            {open.length === 0 ? "Pagamentos em dia" : `${open.length} em aberto`}
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">Débito automático mensal</p>
            <p className="text-xs text-muted-foreground">
              Autorize uma vez no cartão e a mensalidade é cobrada todo mês pelo Mercado Pago.
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
      </section>

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
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{formatBRL(payment.amount_cents)}</span>
                  <Button size="sm" onClick={handlePay}>
                    Pagar
                  </Button>
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
