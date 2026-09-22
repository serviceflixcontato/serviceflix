import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Gift, Loader2, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useReferralReward } from "@/hooks/use-referral-settings";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { RewardReceiptView } from "@/components/site/RewardReceiptView";
import { formatBRL, formatDateTime } from "@/hooks/use-panel-data";
import { useCreateReferral, useMyReferrals } from "@/hooks/use-referrals";
import {
  REWARD_METHOD_LABELS,
  useChooseReferralReward,
} from "@/hooks/use-vouchers";
import {
  REFERRAL_STATUS_LABELS,
  REWARD_STATUS_LABELS,
} from "@/lib/referrals";

export const Route = createFileRoute("/_authenticated/painel/indicacoes")({
  component: Indicacoes,
});

const schema = z.object({
  contact_name: z.string().trim().min(3, "Informe o nome do síndico ou proprietário").max(120),
  property_name: z.string().trim().min(2, "Informe o nome do condomínio ou residência").max(160),
  address: z.string().trim().min(5, "Informe o endereço completo").max(240),
  cnpj: z.string().trim().max(30).optional(),
  contact_phone: z.string().trim().max(30).optional(),
  contact_email: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(600).optional(),
});

function Indicacoes() {
  const { data: referrals = [], isLoading } = useMyReferrals();
  const { rewardCents } = useReferralReward();
  const create = useCreateReferral();
  const [propertyType, setPropertyType] = useState("condominio");
  const [formKey, setFormKey] = useState(0);

  const earned = referrals
    .filter((referral) => referral.status === "contratado")
    .reduce((sum, referral) => sum + (referral.reward_cents ?? 0), 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      contact_name: form.get("contact_name"),
      property_name: form.get("property_name"),
      address: form.get("address"),
      cnpj: form.get("cnpj"),
      contact_phone: form.get("contact_phone"),
      contact_email: form.get("contact_email"),
      notes: form.get("notes"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados.");
      return;
    }
    create.mutate(
      {
        contact_name: parsed.data.contact_name,
        property_name: parsed.data.property_name,
        property_type: propertyType,
        address: parsed.data.address,
        cnpj: parsed.data.cnpj || null,
        contact_phone: parsed.data.contact_phone || null,
        contact_email: parsed.data.contact_email || null,
        notes: parsed.data.notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Indicação enviada! Nossa equipe entra em contato com o indicado.");
          setFormKey((key) => key + 1);
        },
        onError: () => toast.error("Não foi possível enviar a indicação. Tente novamente."),
      },
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-gradient p-6 text-primary-foreground shadow-elevated">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          <Gift className="h-3.5 w-3.5" /> Indique e ganhe
        </span>
        <h1 className="mt-4 text-2xl font-bold">
          Ganhe {formatBRL(rewardCents)} por indicação que fechar contrato
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/90">
          Indique um condomínio ou uma residência. Quando o indicado contratar um plano Service
          Flix, a recompensa é liberada para você.
        </p>
        {earned > 0 ? (
          <p className="mt-4 text-sm font-semibold">
            Recompensas conquistadas até agora: {formatBRL(earned)}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Nova indicação</h2>
        <form key={formKey} onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nome do síndico ou proprietário</Label>
              <Input id="contact_name" name="contact_name" required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Tipo de imóvel</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="property_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="condominio">Condomínio</SelectItem>
                  <SelectItem value="residencia">Residência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_name">Nome do condomínio ou residência</Label>
            <Input id="property_name" name="property_name" required maxLength={160} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              required
              maxLength={240}
              placeholder="Rua, número, bairro e cidade"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" maxLength={30} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Telefone do indicado</Label>
              <Input id="contact_phone" name="contact_phone" maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">E-mail do indicado</Label>
              <Input id="contact_email" name="contact_email" maxLength={255} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" name="notes" rows={3} maxLength={600} />
          </div>

          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar indicação
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Minhas indicações</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : referrals.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Você ainda não fez indicações. Envie a primeira acima.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {referrals.map((referral) => (
              <li key={referral.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{referral.property_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {referral.contact_name} · {referral.address}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enviada em {formatDateTime(referral.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={referral.status === "contratado" ? "default" : "secondary"}>
                      {REFERRAL_STATUS_LABELS[referral.status] ?? referral.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {REWARD_STATUS_LABELS[referral.reward_status] ?? referral.reward_status} ·{" "}
                      {formatBRL(referral.reward_cents)}
                    </span>
                  </div>
                </div>
                <RewardChoice referral={referral} />
                {referral.reward_receipt_path ? (
                  <RewardReceiptView
                    receiptPath={referral.reward_receipt_path}
                    receiptNote={referral.reward_receipt_note ?? null}
                    paidAt={referral.reward_paid_at ?? null}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type ReferralRow = {
  id: string;
  status: string;
  reward_cents: number;
  reward_status: string;
  reward_method: string | null;
  reward_pix_key: string | null;
  reward_bank_details: string | null;
  reward_receipt_path?: string | null;
  reward_receipt_note?: string | null;
  reward_paid_at?: string | null;
};

/** Escolha do resgate da recompensa: dinheiro (Pix/transferência) ou voucher de abatimento. */
function RewardChoice({ referral }: { referral: ReferralRow }) {
  const choose = useChooseReferralReward();
  const [method, setMethod] = useState<"dinheiro" | "voucher" | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (referral.reward_method) {
    const chosenMoney = referral.reward_method === "dinheiro";
    return (
      <div className="mt-4 rounded-xl border border-primary/40 bg-accent p-3 text-sm text-accent-foreground">
        <p className="font-semibold">
          {REWARD_METHOD_LABELS[referral.reward_method] ?? referral.reward_method}
        </p>
        <p className="mt-1 text-xs">
          {chosenMoney
            ? "Aguarde a transferência: nossa equipe envia o valor para os dados informados assim que a recompensa for liberada."
            : "Você tem um crédito para abatimento: o valor ficará disponível para abatimento no seu contrato, na aba Pagamentos."}
        </p>
        {chosenMoney && (referral.reward_pix_key || referral.reward_bank_details) ? (
          <p className="mt-1 text-xs">
            Dados informados: {referral.reward_pix_key ?? referral.reward_bank_details}
          </p>
        ) : null}
      </div>
    );
  }

  if (referral.status !== "contratado") {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Quando o indicado fechar contrato, você escolhe aqui como quer resgatar a recompensa.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/50 p-4">
      <p className="text-sm font-semibold">Como você quer resgatar {formatBRL(referral.reward_cents)}?</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("dinheiro")}
          className={`rounded-xl border p-3 text-left transition-colors hover:border-primary ${
            method === "dinheiro" ? "border-primary bg-accent" : "border-border bg-card"
          }`}
        >
          <Banknote className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold">Receber em dinheiro</p>
          <p className="mt-1 text-xs text-muted-foreground">Via Pix ou transferência bancária.</p>
        </button>
        <button
          type="button"
          onClick={() => setMethod("voucher")}
          className={`rounded-xl border p-3 text-left transition-colors hover:border-primary ${
            method === "voucher" ? "border-primary bg-accent" : "border-border bg-card"
          }`}
        >
          <Ticket className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold">Voucher de abatimento</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crédito para descontar na mensalidade do contrato.
          </p>
        </button>
      </div>

      {method === "dinheiro" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`pix-${referral.id}`}>Chave Pix</Label>
            <Input
              id={`pix-${referral.id}`}
              value={pixKey}
              onChange={(event) => setPixKey(event.target.value)}
              maxLength={160}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`banco-${referral.id}`}>Dados para transferência bancária</Label>
            <Textarea
              id={`banco-${referral.id}`}
              rows={3}
              maxLength={400}
              value={bankDetails}
              onChange={(event) => setBankDetails(event.target.value)}
              placeholder="Banco, agência, conta e nome do titular"
            />
          </div>
        </div>
      ) : null}

      <Button
        className="mt-4"
        disabled={!method || choose.isPending}
        onClick={() => {
          if (!method) return;
          if (method === "dinheiro" && !pixKey.trim() && !bankDetails.trim()) {
            toast.error("Informe a chave Pix ou os dados bancários.");
            return;
          }
          choose.mutate(
            { referral_id: referral.id, method, pix_key: pixKey, bank_details: bankDetails },
            {
              onSuccess: (result) => {
                if (!result.ok) {
                  toast.info("Esta recompensa já tem forma de resgate escolhida.");
                  return;
                }
                setMessage(
                  method === "dinheiro"
                    ? "Aguarde a transferência: nossa equipe vai enviar o valor para os dados informados."
                    : "Você tem um crédito para abatimento: o valor ficará disponível para abatimento no seu contrato.",
                );
                toast.success("Forma de resgate registrada!");
              },
              onError: () => toast.error("Não foi possível registrar o resgate. Tente novamente."),
            },
          );
        }}
      >
        {choose.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Finalizar resgate
      </Button>

      {message ? (
        <p className="mt-3 rounded-xl border border-primary/40 bg-accent p-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
