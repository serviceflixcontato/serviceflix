import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSubscription,
  setSubscriptionStatus,
  updateSubscriptionDetails,
} from "@/lib/admin.functions";
import { PLANS } from "@/lib/plans";

export type AdminSubscription = {
  id: string;
  plan_slug: string;
  plan_name: string;
  status: string;
  monthly_price_cents: number | null;
  started_at: string | null;
  next_billing_date: string | null;
  contract_number: string | null;
  contract_notes: string | null;
};

const STATUS_OPTIONS = [
  { value: "ativa", label: "Ativa" },
  { value: "pendente", label: "Pendente" },
  { value: "suspensa", label: "Suspensa (desativada)" },
  { value: "cancelada", label: "Cancelada" },
] as const;

/** Ativar/desativar, editar e excluir a assinatura de um cliente. */
export function SubscriptionRowActions({ sub }: { sub: AdminSubscription }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const changeStatus = useServerFn(setSubscriptionStatus);
  const editSub = useServerFn(updateSubscriptionDetails);
  const removeSub = useServerFn(deleteSubscription);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      changeStatus({ data: { subscription_id: sub.id, status } as never }),
    onSuccess: () => {
      toast.success("Situação da assinatura atualizada.");
      void refresh();
    },
    onError: () => toast.error("Não foi possível atualizar a assinatura."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeSub({ data: { subscription_id: sub.id } as never }),
    onSuccess: () => {
      toast.success("Assinatura excluída.");
      void refresh();
    },
    onError: () => toast.error("Não foi possível excluir a assinatura."),
  });

  const [planSlug, setPlanSlug] = useState(sub.plan_slug);
  const [price, setPrice] = useState(((sub.monthly_price_cents ?? 0) / 100).toFixed(2).replace(".", ","));
  const [status, setStatus] = useState(sub.status);
  const [startedAt, setStartedAt] = useState(sub.started_at ?? "");
  const [nextBilling, setNextBilling] = useState(sub.next_billing_date ?? "");
  const [contractNumber, setContractNumber] = useState(sub.contract_number ?? "");
  const [notes, setNotes] = useState(sub.contract_notes ?? "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const cents = Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100);
      if (!Number.isFinite(cents) || cents < 0) throw new Error("Informe um valor válido.");
      return editSub({
        data: {
          subscription_id: sub.id,
          plan_slug: planSlug,
          plan_name: PLANS.find((plan) => plan.slug === planSlug)?.name ?? planSlug,
          monthly_price_cents: cents,
          status,
          started_at: startedAt || null,
          next_billing_date: nextBilling || null,
          contract_number: contractNumber || null,
          contract_notes: notes || null,
        } as never,
      });
    },
    onSuccess: () => {
      toast.success("Contrato do cliente atualizado.");
      setEditing(false);
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sub.status} onValueChange={(value) => statusMutation.mutate(value)}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sub.status === "ativa" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate("suspensa")}
          >
            Desativar
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate("ativa")}
          >
            Ativar
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
          {editing ? "Fechar" : "Editar"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm("Excluir esta assinatura e as faturas dela?")) {
              deleteMutation.mutate();
            }
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
            <Select value={planSlug} onValueChange={setPlanSlug}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((plan) => (
                  <SelectItem key={plan.slug} value={plan.slug}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Situação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mensalidade (R$)</Label>
            <Input className="mt-1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Nº do contrato</Label>
            <Input className="mt-1" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
          </div>
          <div>
            <Label>Início</Label>
            <Input className="mt-1" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div>
            <Label>Próxima cobrança</Label>
            <Input className="mt-1" type="date" value={nextBilling} onChange={(e) => setNextBilling(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
