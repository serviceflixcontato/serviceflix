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
import { setSubscriptionApproval } from "@/lib/admin.functions";
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_OPTIONS,
  type ApprovalStatus,
} from "@/lib/finance";

export function ApprovalBadge({ status }: { status?: string | null }) {
  const value = status ?? "aguardando_pagamento";
  const variant =
    value === "aprovado"
      ? "default"
      : value === "cancelado"
        ? "destructive"
        : value === "em_analise"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{APPROVAL_STATUS_LABELS[value] ?? value}</Badge>;
}

/**
 * Análise financeira do contrato. Só "Aprovado e ativo" libera os benefícios
 * (abertura de ordens de serviço) na área do cliente.
 */
export function ContractApproval({
  subscriptionId,
  status,
}: {
  subscriptionId: string;
  status?: string | null;
}) {
  const queryClient = useQueryClient();
  const approve = useServerFn(setSubscriptionApproval);

  const mutation = useMutation({
    mutationFn: (approval_status: ApprovalStatus) =>
      approve({ data: { subscription_id: subscriptionId, approval_status } }),
    onSuccess: (_result, approval_status) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(
        approval_status === "aprovado"
          ? "Contrato aprovado e ativo. O cliente já pode abrir ordens de serviço."
          : `Contrato marcado como "${APPROVAL_STATUS_LABELS[approval_status]}".`,
      );
    },
    onError: () => toast.error("Não foi possível atualizar a situação do contrato."),
  });

  return (
    <div className="flex items-center gap-2">
      {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
      <Select
        value={status ?? "aguardando_pagamento"}
        onValueChange={(value) => mutation.mutate(value as ApprovalStatus)}
      >
        <SelectTrigger className="h-9 w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPROVAL_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {APPROVAL_STATUS_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
