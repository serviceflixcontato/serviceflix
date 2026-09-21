import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  Loader2,
  PiggyBank,
  Plus,
  Receipt,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApprovalBadge, ContractApproval } from "@/components/admin/ContractApproval";
import { PaymentSettle } from "@/components/admin/PaymentSettle";
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
import { formatBRL, formatDate, formatDateTime } from "@/hooks/use-panel-data";
import { createFinanceCharge } from "@/lib/finance.functions";
import {
  groupInvoices,
  invoiceTotals,
  methodLabel,
  receivedByMethod,
  sumDue,
  type Invoice,
} from "@/lib/money";

type Payment = Invoice & { user_id: string };

type Subscription = {
  id: string;
  user_id: string;
  plan_name: string;
  status: string;
  approval_status: string | null;
  approved_at: string | null;
  monthly_price_cents: number | null;
  payment_method: string | null;
  contract_number: string | null;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; email: string | null };

const VIEWS = [
  { id: "aprovar", label: "Aprovar contratos" },
  { id: "baixa", label: "Dar baixa" },
  { id: "caixa", label: "Caixa" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

/** Caixa da Service Flix: aprovar contratos, dar baixa e ver o dinheiro. */
export function FinanceTab({
  profiles,
  subscriptions,
  payments,
}: {
  profiles: Profile[];
  subscriptions: Subscription[];
  payments: Payment[];
}) {
  const [view, setView] = useState<ViewId>("aprovar");

  const nameById = new Map(
    profiles.map((profile) => [profile.id, profile.full_name ?? profile.email ?? "Cliente"]),
  );

  const groups = groupInvoices(payments);
  const month = new Date().toISOString().slice(0, 7);
  const paidThisMonth = groups.paid.filter((p) => (p.paid_at ?? "").slice(0, 7) === month);
  const voucherTotal = payments
    .filter((p) => p.status !== "cancelada")
    .reduce((total, p) => total + (p.voucher_discount_cents ?? 0), 0);

  const waiting = subscriptions.filter(
    (sub) => (sub.approval_status ?? "aguardando_pagamento") !== "aprovado",
  );
  const needsAnalysis = (sub: Subscription) =>
    (sub.approval_status ?? "aguardando_pagamento") === "em_analise";
  const alerts = waiting.filter(needsAnalysis);

  const entries = receivedByMethod(payments);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Money
          icon={PiggyBank}
          label="Recebido neste mês"
          value={formatBRL(sumDue(paidThisMonth))}
          hint={`${paidThisMonth.length} pagamento(s)`}
        />
        <Money
          icon={Receipt}
          label="A receber"
          value={formatBRL(sumDue(groups.upcoming))}
          hint={`${groups.upcoming.length} fatura(s)`}
        />
        <Money
          icon={AlertTriangle}
          label="Atrasado"
          value={formatBRL(sumDue(groups.overdue))}
          hint={`${groups.overdue.length} fatura(s)`}
        />
        <Money
          icon={Ticket}
          label="Crédito de indicação usado"
          value={formatBRL(voucherTotal)}
          hint="abatido em faturas"
        />
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-card">
        {VIEWS.map((item) => {
          const blink = item.id === "aprovar" && alerts.length > 0 && view !== item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === item.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${blink ? "blink-alert text-foreground" : ""}`}
            >
              {item.label}
              {item.id === "aprovar" && alerts.length > 0 ? ` (${alerts.length})` : ""}
            </button>
          );
        })}
      </nav>

      {view === "aprovar" ? (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BadgeCheck className="h-5 w-5 text-primary" /> Contratos para aprovar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confira se o pagamento entrou e ative o contrato informando como o dinheiro chegou. Só
            depois de ativar o cliente pode pedir ordens de serviço.
          </p>
          {waiting.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum contrato aguardando aprovação.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {waiting.map((sub) => {
                const subPayments = payments.filter((p) => p.subscription_id === sub.id);
                const subGroups = groupInvoices(subPayments);
                return (
                  <li
                    key={sub.id}
                    className={`rounded-xl border p-4 ${
                      needsAnalysis(sub) ? "blink-alert" : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {nameById.get(sub.user_id) ?? "Cliente"} · {sub.plan_name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatBRL(sub.monthly_price_cents)}/mês · contrato{" "}
                          {sub.contract_number ?? "sem número"} · aberto em{" "}
                          {formatDateTime(sub.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Já recebido {formatBRL(sumDue(subGroups.paid))} · em aberto{" "}
                          {formatBRL(sumDue(subGroups.open))}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ApprovalBadge status={sub.approval_status} />
                        <ContractApproval subscriptionId={sub.id} status={sub.approval_status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {view === "baixa" ? (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Faturas em aberto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando o cliente pagar por Pix, dinheiro ou online, dê a baixa aqui. O valor entra no
            caixa na hora.
          </p>
          {groups.open.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma fatura em aberto.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {groups.open.map((payment) => (
                <li key={payment.id} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {nameById.get((payment as Payment).user_id) ?? "Cliente"} ·{" "}
                        {payment.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vencimento {formatDate(payment.due_date)}
                        {invoiceTotals(payment).discount > 0
                          ? ` · crédito aplicado −${formatBRL(invoiceTotals(payment).discount)}`
                          : ""}
                      </p>
                      {payment.reference ? (
                        <p className="mt-1 text-xs text-muted-foreground">{payment.reference}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold">
                        {formatBRL(invoiceTotals(payment).due)}
                      </span>
                      <Badge variant="outline">Em aberto</Badge>
                    </div>
                  </div>
                  <PaymentSettle payment={payment} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {view === "caixa" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Como o dinheiro entrou</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Soma de tudo que já foi recebido em cada forma de pagamento.
            </p>
            {entries.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum valor recebido ainda.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entries.map((entry) => (
                  <li key={entry.method} className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {entry.label}
                    </p>
                    <p className="mt-1 text-xl font-bold">{formatBRL(entry.cents)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.count} lançamento(s)
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Pagamentos recebidos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Total: <strong>{formatBRL(sumDue(groups.paid))}</strong> em {groups.paid.length}{" "}
              pagamento(s).
            </p>
            {groups.paid.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nada recebido ainda.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {groups.paid.map((payment) => (
                  <li key={payment.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {nameById.get((payment as Payment).user_id) ?? "Cliente"} ·{" "}
                          {payment.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recebido em {formatDateTime(payment.paid_at)}
                          {payment.method ? ` · ${methodLabel(payment.method)}` : ""}
                        </p>
                      </div>
                      <span className="text-base font-semibold">
                        {formatBRL(invoiceTotals(payment).gross)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <NewCharge profiles={profiles} subscriptions={subscriptions} />
        </div>
      ) : null}
    </div>
  );
}

function Money({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Lançamento avulso no caixa (serviço adicional, material, taxa). */
function NewCharge({
  profiles,
  subscriptions,
}: {
  profiles: Profile[];
  subscriptions: Subscription[];
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"pendente" | "pago">("pendente");
  const [method, setMethod] = useState("pix");

  const queryClient = useQueryClient();
  const create = useServerFn(createFinanceCharge);
  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          user_id: userId,
          subscription_id:
            subscriptions.find((sub) => sub.user_id === userId && sub.status === "ativa")?.id ??
            null,
          description,
          amount_cents: Math.round(Number(amount.replace(",", ".")) * 100),
          due_date: dueDate,
          category: "servico_adicional",
          status,
          method: status === "pago" ? method : null,
        },
      }),
    onSuccess: () => {
      toast.success("Lançamento registrado no caixa.");
      setDescription("");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Não foi possível registrar o lançamento."),
  });

  const valid = userId && description.trim().length > 1 && Number(amount.replace(",", ".")) > 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5 text-primary" /> Lançar serviço adicional
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o cliente" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name ?? profile.email ?? "Cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: troca de registro (material)"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="350,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as "pendente" | "pago")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">A receber</SelectItem>
                <SelectItem value="pago">Já recebido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "pago" ? (
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Pagamento online (Mercado Pago)</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar lançamento
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
