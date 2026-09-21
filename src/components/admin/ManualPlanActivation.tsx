import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
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
import { usePlanPrices } from "@/hooks/use-plan-prices";
import { activatePlanManually } from "@/lib/admin.functions";
import { PLANS } from "@/lib/plans";

type Client = { id: string; full_name: string | null; email: string | null };

const STATUS_OPTIONS = [
  { value: "ativa", label: "Ativa" },
  { value: "pendente", label: "Pendente" },
  { value: "suspensa", label: "Suspensa" },
  { value: "cancelada", label: "Cancelada" },
] as const;

const METHOD_OPTIONS = [
  { value: "online", label: "Pagamento online — Mercado Pago (pela plataforma)" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusOneMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

/** Ativação manual do plano de um cliente (contratação fechada fora do site / pagamento em dinheiro). */
export function ManualPlanActivation({ clients }: { clients: Client[] }) {
  const queryClient = useQueryClient();
  const { data: prices = [] } = usePlanPrices();
  const activate = useServerFn(activatePlanManually);

  const [userId, setUserId] = useState("");
  const [planSlug, setPlanSlug] = useState("basico");
  const [status, setStatus] = useState<string>("ativa");
  const [priceReais, setPriceReais] = useState("");
  const [startedAt, setStartedAt] = useState(today());
  const [nextBilling, setNextBilling] = useState(plusOneMonth());
  const [contract, setContract] = useState("");
  const [notes, setNotes] = useState("");
  const [cash, setCash] = useState(true);
  const [method, setMethod] = useState<string>("online");

  useEffect(() => {
    const price = prices.find((item) => item.slug === planSlug);
    if (typeof price?.price_cents === "number") {
      setPriceReais((price.price_cents / 100).toFixed(2).replace(".", ","));
    }
  }, [planSlug, prices]);

  const mutation = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(priceReais.replace(/\./g, "").replace(",", ".")) * 100);
      if (!userId) throw new Error("Selecione o cliente.");
      if (!Number.isFinite(cents) || cents < 0) throw new Error("Informe um valor válido.");
      return activate({
        data: {
          user_id: userId,
          plan_slug: planSlug,
          plan_name: PLANS.find((plan) => plan.slug === planSlug)?.name ?? planSlug,
          monthly_price_cents: cents,
          status,
          started_at: startedAt,
          next_billing_date: nextBilling || null,
          contract_number: contract || null,
          contract_notes: notes || null,
          register_cash_payment: cash,
          payment_method: method,
        } as never,
      });
    },
    onSuccess: () => {
      toast.success("Plano ativado para o cliente.");
      setContract("");
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Não foi possível ativar o plano."),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BadgeCheck className="h-4 w-4 text-primary" /> Ativar plano manualmente
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use quando o cliente fechar o contrato fora do site ou pagar em dinheiro. O plano aparece na
        hora no painel do cliente.
      </p>

      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="md:col-span-2">
          <Label>Cliente</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione o cliente cadastrado" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name ?? client.email ?? "Cliente"}
                  {client.email ? ` · ${client.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          <Label htmlFor="valor-plano">Mensalidade (R$)</Label>
          <Input
            id="valor-plano"
            className="mt-1"
            inputMode="decimal"
            value={priceReais}
            onChange={(event) => setPriceReais(event.target.value)}
            placeholder="1800,00"
          />
        </div>

        <div>
          <Label>Forma de pagamento</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contrato">Nº do contrato (opcional)</Label>
          <Input
            id="contrato"
            className="mt-1"
            value={contract}
            onChange={(event) => setContract(event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="inicio">Início do plano</Label>
          <Input
            id="inicio"
            type="date"
            className="mt-1"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="proxima">Próxima cobrança</Label>
          <Input
            id="proxima"
            type="date"
            className="mt-1"
            value={nextBilling}
            onChange={(event) => setNextBilling(event.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="obs-contrato">Observações do contrato (opcional)</Label>
          <Textarea
            id="obs-contrato"
            className="mt-1"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: pagamento em dinheiro todo dia 10, combinado por WhatsApp."
          />
        </div>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={cash}
            onChange={(event) => setCash(event.target.checked)}
          />
          Registrar já a mensalidade deste mês como recebida (na forma de pagamento escolhida acima)
        </label>

        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Ativando..." : "Ativar plano do cliente"}
          </Button>
        </div>
      </form>
    </section>
  );
}
