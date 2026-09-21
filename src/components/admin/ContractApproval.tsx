import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setSubscriptionApproval } from "@/lib/finance.functions";
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_OPTIONS,
  type ApprovalStatus,
} from "@/lib/money";

export function ApprovalBadge({
  status,
  isPlanChange = false,
}: {
  status?: string | null;
  isPlanChange?: boolean;
}) {
  const value = status ?? "aguardando_pagamento";
  const variant =
    value === "aprovado"
      ? "default"
      : value === "cancelado"
        ? "destructive"
        : value === "em_analise"
          ? "outline"
          : "secondary";
  const label =
    isPlanChange && value === "em_analise"
      ? "Mudança em análise"
      : isPlanChange && value === "aguardando_pagamento"
        ? "Mudança aguardando pagamento"
        : APPROVAL_STATUS_LABELS[value] ?? value;
  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * Análise financeira do contrato. Só "Aprovado e ativo" libera os benefícios
 * (abertura de ordens de serviço) na área do cliente.
 */
export function ContractApproval({
  subscriptionId,
  status,
  isPlanChange = false,
  requestedPlanName,
}: {
  subscriptionId: string;
  status?: string | null;
  isPlanChange?: boolean;
  requestedPlanName?: string | null;
}) {
  const queryClient = useQueryClient();
  const approve = useServerFn(setSubscriptionApproval);
  const [confirming, setConfirming] = useState(false);
  const [method, setMethod] = useState("pix");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: (input: {
      approval_status: ApprovalStatus;
      payment_method?: string | null;
      paid_on?: string | null;
    }) => approve({ data: { subscription_id: subscriptionId, ...input } as never }),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setConfirming(false);
      toast.success(
        input.approval_status === "aprovado"
          ? isPlanChange
            ? `Mudança para ${requestedPlanName ?? "o novo plano"} aprovada e aplicada.`
            : "Contrato ativo. Pagamento registrado no caixa e o cliente já pode abrir ordens de serviço."
          : isPlanChange && input.approval_status === "cancelado"
            ? "Pedido de mudança recusado. O plano atual continua ativo."
          : `Contrato marcado como "${APPROVAL_STATUS_LABELS[input.approval_status]}".`,
      );
    },
    onError: () => toast.error("Não foi possível atualizar a situação do contrato."),
  });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
        <Select
          value={status ?? "aguardando_pagamento"}
          onValueChange={(value) => {
            if (value === "aprovado") {
              setConfirming(true);
              return;
            }
            setConfirming(false);
            mutation.mutate({ approval_status: value as ApprovalStatus });
          }}
        >
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPROVAL_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {isPlanChange && option === "aprovado"
                  ? "Aprovar mudança"
                  : isPlanChange && option === "cancelado"
                    ? "Recusar mudança"
                    : isPlanChange && option === "em_analise"
                      ? "Mudança em análise"
                      : APPROVAL_STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {confirming ? (
        <div className="w-full max-w-sm space-y-3 rounded-xl border border-primary/50 bg-background p-3 text-left">
          <p className="text-xs text-muted-foreground">
            {isPlanChange
              ? "Confirme o pagamento do novo plano. Após a aprovação, a mudança será aplicada automaticamente."
              : "Como o cliente pagou? O meio escolhido fica registrado no contrato e entra no caixa."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Meio de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="online">Online — Mercado Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data em que o valor entrou</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  approval_status: "aprovado",
                  payment_method: method,
                  paid_on: paidOn,
                })
              }
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPlanChange ? "Aprovar mudança" : "Ativar contrato"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
