import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatBRL, usePayments } from "@/hooks/use-panel-data";
import { amountDue } from "@/lib/money";
import { simulateOnlinePayment } from "@/lib/payments.functions";

type Search = { fatura?: string };

export const Route = createFileRoute("/_authenticated/painel/pagamento-teste")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const value = search["fatura"];
    return typeof value === "string" ? { fatura: value } : {};
  },
  head: () => ({
    meta: [
      { title: "Pagamento em modo teste — Service Flix" },
      {
        name: "description",
        content: "Simulação do checkout online para conferir o fluxo de pagamento do plano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Pagamento em modo teste — Service Flix" },
      {
        property: "og:description",
        content: "Simulação do checkout online da Service Flix.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PagamentoTeste,
});

function PagamentoTeste() {
  const { fatura } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: payments = [] } = usePayments();
  const pay = useServerFn(simulateOnlinePayment);

  const invoice = payments.find((item) => item.id === fatura) ?? null;

  const mutation = useMutation({
    mutationFn: () => pay({ data: { paymentId: fatura! } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Pagamento recebido. Agora é só aguardar a liberação da nossa equipe.");
      void navigate({ to: "/painel/pagamentos" });
    },
    onError: () => toast.error("Não foi possível concluir o pagamento de teste."),
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <section className="rounded-2xl border-2 border-primary/50 bg-card p-6 shadow-card">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4" /> Modo teste — nenhuma cobrança real
        </p>
        <h1 className="mt-4 text-xl font-bold">Pagamento online</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta é uma simulação do checkout enquanto a conta de pagamento online não está ligada.
          Serve para você conferir todo o caminho: pagamento, aviso de espera e liberação pela
          equipe.
        </p>

        {invoice ? (
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cobrança</dt>
              <dd className="font-medium">{invoice.description}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Valor do plano</dt>
              <dd className="font-medium">{formatBRL(invoice.amount_cents)}</dd>
            </div>
            {invoice.voucher_discount_cents ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Crédito de indicação</dt>
                <dd className="font-medium">−{formatBRL(invoice.voucher_discount_cents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold">A pagar</dt>
              <dd className="font-bold">{formatBRL(amountDue(invoice))}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Cobrança não encontrada.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            disabled={!invoice || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Processando..." : "Simular pagamento aprovado"}
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/painel/pagamentos" })}>
            Voltar
          </Button>
        </div>
      </section>
    </div>
  );
}
