import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activateSubscriptionFromContract } from "@/lib/activation.functions";
import {
  deleteContractAcceptance,
  updateContractAcceptance,
} from "@/lib/admin.functions";

export type AdminContract = {
  id: string;
  plan_name: string;
  monthly_price_cents: number | null;
  periodicity: string;
  payment_method: string;
  service_address: string;
};

/** Ativar, editar ou excluir um contrato assinado. */
export function ContractRowActions({
  contract,
  subscriptionId,
}: {
  contract: AdminContract;
  subscriptionId: string | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const activate = useServerFn(activateSubscriptionFromContract);
  const edit = useServerFn(updateContractAcceptance);
  const remove = useServerFn(deleteContractAcceptance);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  const [planName, setPlanName] = useState(contract.plan_name);
  const [price, setPrice] = useState(
    ((contract.monthly_price_cents ?? 0) / 100).toFixed(2).replace(".", ","),
  );
  const [periodicity, setPeriodicity] = useState(contract.periodicity);
  const [paymentMethod, setPaymentMethod] = useState(contract.payment_method);
  const [address, setAddress] = useState(contract.service_address);

  const activateMutation = useMutation({
    mutationFn: () => activate({ data: { subscription_id: subscriptionId! } as never }),
    onSuccess: () => {
      toast.success("Contrato ativado. O cliente já pode abrir solicitações.");
      void refresh();
    },
    onError: () => toast.error("Não foi possível ativar o contrato."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { contract_id: contract.id } as never }),
    onSuccess: () => {
      toast.success("Contrato excluído.");
      void refresh();
    },
    onError: () => toast.error("Não foi possível excluir o contrato."),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const cents = Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100);
      if (!Number.isFinite(cents) || cents < 0) throw new Error("Informe um valor válido.");
      return edit({
        data: {
          contract_id: contract.id,
          plan_name: planName,
          monthly_price_cents: cents,
          periodicity,
          payment_method: paymentMethod,
          service_address: address,
        } as never,
      });
    },
    onSuccess: () => {
      toast.success("Contrato atualizado.");
      setEditing(false);
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });

  return (
    <div className="w-full space-y-3 sm:w-auto">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!subscriptionId || activateMutation.isPending}
          onClick={() => activateMutation.mutate()}
        >
          Ativar contrato
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
          {editing ? "Fechar" : "Editar"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm("Excluir este contrato assinado?")) deleteMutation.mutate();
          }}
        >
          Excluir
        </Button>
      </div>

      {editing ? (
        <form
          className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div>
            <Label>Plano</Label>
            <Input className="mt-1" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input className="mt-1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Periodicidade</Label>
            <Input className="mt-1" value={periodicity} onChange={(e) => setPeriodicity(e.target.value)} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Input className="mt-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço de atendimento</Label>
            <Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
