import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  CircleSlash,
  Loader2,
  PiggyBank,
  Plus,
  Receipt,
  Wallet,
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
import { createFinanceCharge } from "@/lib/admin.functions";
import {
  PAYMENT_CATEGORY_LABELS,
  isOverdue,
  methodLabel,
  netAmount,
  paymentMethodsLabel,
} from "@/lib/finance";

type Payment = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  description: string;
  amount_cents: number;
  voucher_discount_cents: number | null;
  due_date: string;
  paid_at: string | null;
  status: string;
  method: string | null;
  category: string | null;
  provider: string | null;
  reference?: string | null;
};

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
  { id: "baixa", label: "Dar baixa em pagamentos" },
  { id: "contratos", label: "Contratos" },
  { id: "recebidos", label: "Recebidos" },
  { id: "areceber", label: "A receber" },
  { id: "atrasados", label: "Atrasados" },
  { id: "adicionais", label: "Serviços adicionais" },
  { id: "cancelados", label: "Cancelados" },
] as const;


type ViewId = (typeof VIEWS)[number]["id"];

/** Caixa da Service Flix: tudo que entrou, vai entrar e foi cancelado. */
export function FinanceTab({
  profiles,
  subscriptions,
  payments,
}: {
  profiles: Profile[];
  subscriptions: Subscription[];
  payments: Payment[];
}) {
  const [view, setView] = useState<ViewId>("baixa");

  const nameById = new Map(
    profiles.map((profile) => [profile.id, profile.full_name ?? profile.email ?? "Cliente"]),
  );

  const paid = payments.filter((p) => p.status === "pago");
  const canceled = payments.filter((p) => p.status === "cancelada");
  const open = payments.filter((p) => p.status !== "pago" && p.status !== "cancelada");
  const overdue = open.filter(isOverdue);
  const upcoming = open.filter((p) => !isOverdue(p));
  const extras = payments.filter((p) => (p.category ?? "mensalidade") === "servico_adicional");

  const sum = (list: Payment[]) => list.reduce((total, item) => total + netAmount(item), 0);
  const month = new Date().toISOString().slice(0, 7);
  const paidThisMonth = paid.filter((p) => (p.paid_at ?? "").slice(0, 7) === month);
  const voucherTotal = payments.reduce((t, p) => t + (p.voucher_discount_cents ?? 0), 0);

  const waitingAnalysis = subscriptions.filter(
    (sub) => (sub.approval_status ?? "aguardando_pagamento") === "em_analise",
  );

  const listFor: Record<ViewId, Payment[]> = {
    baixa: [...overdue, ...upcoming],
    contratos: [],
    recebidos: paid,
    areceber: upcoming,
    atrasados: overdue,
    adicionais: extras,
    cancelados: canceled,
  };


  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Money icon={PiggyBank} label="Recebido no total" value={formatBRL(sum(paid))} hint={`${paid.length} lançamento(s)`} />
        <Money icon={Wallet} label="Recebido neste mês" value={formatBRL(sum(paidThisMonth))} hint={`${paidThisMonth.length} lançamento(s)`} />
        <Money icon={Receipt} label="A receber" value={formatBRL(sum(upcoming))} hint={`${upcoming.length} fatura(s)`} />
        <Money icon={AlertTriangle} label="Atrasado" value={formatBRL(sum(overdue))} hint={`${overdue.length} fatura(s)`} />
        <Money icon={BadgeCheck} label="Contratos aprovados" value={String(subscriptions.filter((s) => s.approval_status === "aprovado").length)} hint={`${subscriptions.length} no total`} />
        <Money icon={Loader2} label="Em análise financeira" value={String(waitingAnalysis.length)} hint="aguardando aprovação da equipe" />
        <Money icon={CircleSlash} label="Cancelado" value={formatBRL(sum(canceled))} hint={`${subscriptions.filter((s) => s.approval_status === "cancelado").length} contrato(s)`} />
        <Money icon={Receipt} label="Descontos em voucher" value={formatBRL(voucherTotal)} hint="abatimentos por indicação" />
      </div>

      <NewCharge profiles={profiles} subscriptions={subscriptions} />

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-card">
        {VIEWS.map((item) => {
          const blink = item.id === "contratos" && waitingAnalysis.length > 0 && view !== item.id;
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
            </button>
          );
        })}
      </nav>

      {view === "contratos" ? (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Contratos e situação financeira</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada contrato mostra os meios de pagamento usados (inclusive combinações como cartão +
            voucher) e a situação da análise. Só o contrato aprovado libera as ordens de serviço.
          </p>
          {subscriptions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum contrato registrado.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {subscriptions.map((sub) => {
                const subPayments = payments.filter(
                  (p) => p.subscription_id === sub.id || (!p.subscription_id && p.user_id === sub.user_id),
                );
                const subPaid = subPayments.filter((p) => p.status === "pago");
                const subOpen = subPayments.filter(
                  (p) => p.status !== "pago" && p.status !== "cancelada",
                );
                const needsAnalysis =
                  (sub.approval_status ?? "aguardando_pagamento") === "em_analise";
                return (
                  <li
                    key={sub.id}
                    className={`rounded-xl border p-4 ${
                      needsAnalysis ? "blink-alert" : "border-border"
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
                        <p className="mt-1 text-sm">
                          <strong>Meio de pagamento:</strong> {paymentMethodsLabel(subPayments)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recebido {formatBRL(sum(subPaid))} · em aberto {formatBRL(sum(subOpen))}
                          {sub.approved_at ? ` · aprovado em ${formatDateTime(sub.approved_at)}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ApprovalBadge status={sub.approval_status} />
                        <ContractApproval subscriptionId={sub.id} status={sub.approval_status} />
                      </div>
                    </div>

                    {subOpen.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {subOpen.map((payment) => (
                          <li
                            key={payment.id}
                            className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm"
                          >
                            <p>
                              {payment.description} · {formatBRL(netAmount(payment))} · vence{" "}
                              {formatDate(payment.due_date)}
                              {payment.method ? ` · ${methodLabel(payment.method)}` : ""}
                            </p>
                            <PaymentSettle payment={payment} />
                          </li>
                        ))}
                      </ul>
                    ) : null}

                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">
            {VIEWS.find((item) => item.id === view)?.label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total: <strong>{formatBRL(sum(listFor[view]))}</strong> em {listFor[view].length}{" "}
            lançamento(s).
          </p>
          {listFor[view].length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nada por aqui ainda.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {listFor[view].map((payment) => (
                <li
                  key={payment.id}
                  className="space-y-3 rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {nameById.get(payment.user_id) ?? "Cliente"} · {payment.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {PAYMENT_CATEGORY_LABELS[payment.category ?? "mensalidade"]} ·{" "}
                        {payment.method ? methodLabel(payment.method) : "meio não informado"} ·
                        vencimento {formatDate(payment.due_date)}
                        {payment.paid_at ? ` · pago em ${formatDateTime(payment.paid_at)}` : ""}
                      </p>
                      {payment.reference ? (
                        <p className="mt-1 text-xs text-muted-foreground">{payment.reference}</p>
                      ) : null}
                      {(payment.voucher_discount_cents ?? 0) > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Desconto em voucher: -{formatBRL(payment.voucher_discount_cents)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold">{formatBRL(netAmount(payment))}</span>
                      <Badge
                        variant={
                          payment.status === "pago"
                            ? "default"
                            : payment.status === "cancelada"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {payment.status === "pago"
                          ? "Recebido"
                          : payment.status === "cancelada"
                            ? "Cancelado"
                            : "Em aberto"}
                      </Badge>
                    </div>
                  </div>
                  {payment.status !== "cancelada" ? <PaymentSettle payment={payment} /> : null}
                </li>

              ))}
            </ul>
          )}
        </section>
      )}
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
  const [method, setMethod] = useState("dinheiro");

  const queryClient = useQueryClient();
  const create = useServerFn(createFinanceCharge);
  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          user_id: userId,
          subscription_id:
            subscriptions.find((sub) => sub.user_id === userId && sub.status === "ativa")?.id ?? null,
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
          <Plus className="h-5 w-5 text-primary" /> Lançar serviço adicional no caixa
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
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="350,00" />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
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
              <Label>Meio de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="voucher">Voucher</SelectItem>
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
