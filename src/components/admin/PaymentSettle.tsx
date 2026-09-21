import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { setPaymentStatusManually } from "@/lib/admin.functions";

export const MANUAL_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência bancária" },
  { value: "voucher", label: "Voucher de indicação" },
] as const;

type SettlePayment = {
  id: string;
  method: string | null;
  status: string;
  reference?: string | null;
};

/**
 * Baixa manual de uma fatura: a equipe escolhe o meio (Pix, dinheiro, etc.),
 * a data em que o valor entrou e uma observação, e confirma o recebimento.
 */
export function PaymentSettle({ payment }: { payment: SettlePayment }) {
  const queryClient = useQueryClient();
  const update = useServerFn(setPaymentStatusManually);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(payment.method ?? "pix");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState(payment.reference ?? "");

  const mutation = useMutation({
    mutationFn: (input: { status: string; withDetails?: boolean }) =>
      update({
        data: {
          payment_id: payment.id,
          status: input.status,
          method: input.status === "pago" ? method : null,
          paid_on: input.status === "pago" ? paidOn : null,
          reference: input.withDetails ? reference : undefined,
        } as never,
      }),
    onSuccess: (_result, input) => {
      toast.success(
        input.status === "pago"
          ? "Pagamento baixado como recebido."
          : input.status === "cancelada"
            ? "Fatura cancelada."
            : "Fatura voltou para em aberto.",
      );
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Não foi possível atualizar o pagamento."),
  });

  const settled = payment.status === "pago";

  if (settled) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({ status: "pendente" })}
      >
        Desfazer baixa
      </Button>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)}>
          {open ? "Fechar" : "Dar baixa (recebido)"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => {
            if (window.confirm("Cancelar esta fatura?")) mutation.mutate({ status: "cancelada" });
          }}
        >
          Cancelar fatura
        </Button>
      </div>

      {open ? (
        <form
          className="mt-3 grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ status: "pago", withDetails: true });
          }}
        >
          <div className="space-y-1.5">
            <Label>Meio de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_METHODS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data do recebimento</Label>
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex.: comprovante Pix recebido"
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar recebimento
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
