import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/plans";
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

function Pagamentos() {
  const { data: payments = [], isLoading } = usePayments();
  const { data: subscription } = useSubscription();
  const open = payments.filter((payment) => payment.status !== "pago");
  const paid = payments.filter((payment) => payment.status === "pago");

  function handlePay() {
    toast.info(
      "O pagamento online está sendo ativado. Enquanto isso, fale com nosso time pelo WhatsApp " +
        CONTACT.whatsappLabel + " para receber o link de cobrança.",
    );
  }

  return (
    <div className="space-y-6">
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
