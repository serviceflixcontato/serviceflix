import { createFileRoute } from "@tanstack/react-router";
import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { formatBRL, formatDateTime } from "@/hooks/use-panel-data";
import { useCreateReferral, useMyReferrals } from "@/hooks/use-referrals";
import {
  REFERRAL_REWARD_CENTS,
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
          Ganhe {formatBRL(REFERRAL_REWARD_CENTS)} por indicação que fechar contrato
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
