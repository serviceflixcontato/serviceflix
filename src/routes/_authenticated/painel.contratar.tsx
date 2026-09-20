import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ContractText } from "@/components/site/ContractText";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCEPT_ITEMS } from "@/lib/contract";
import { buildContractFields } from "@/lib/contract-fields";
import { PLANS } from "@/lib/plans";
import { planPriceLabel, usePlanPrices } from "@/hooks/use-plan-prices";
import { useAcceptContract } from "@/hooks/use-contract";
import { useProfile } from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/contratar")({
  component: Contratar,
});

type FormState = {
  plan_slug: string;
  full_name: string;
  cpf_cnpj: string;
  email: string;
  phone: string;
  address: string;
  address_number: string;
  complement: string;
  neighborhood: string;
  city_uf: string;
  client_type: "condominio" | "residencia";
  payment_method: string;
};

const PAYMENT_METHODS = ["Mercado Pago (Pix, boleto ou cartão)", "Dinheiro", "A definir"];

function Contratar() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: prices } = usePlanPrices();
  const acceptMutation = useAcceptContract();

  const [form, setForm] = useState<FormState>({
    plan_slug: "master",
    full_name: "",
    cpf_cnpj: "",
    email: "",
    phone: "",
    address: "",
    address_number: "",
    complement: "",
    neighborhood: "",
    city_uf: "",
    client_type: "residencia",
    payment_method: PAYMENT_METHODS[0]!,
  });
  const [checks, setChecks] = useState<boolean[]>(ACCEPT_ITEMS.map(() => false));

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      full_name: current.full_name || (profile.full_name ?? ""),
      cpf_cnpj: current.cpf_cnpj || (profile.cpf_cnpj ?? ""),
      email: current.email || (profile.email ?? ""),
      phone: current.phone || (profile.phone ?? ""),
      address: current.address || (profile.address ?? ""),
      address_number: current.address_number || (profile.address_number ?? ""),
      complement: current.complement || (profile.complement ?? ""),
      neighborhood: current.neighborhood || (profile.neighborhood ?? ""),
      city_uf: current.city_uf || (profile.city_uf ?? ""),
      client_type: (profile.client_type === "condominio" ? "condominio" : "residencia") as
        | "condominio"
        | "residencia",
    }));
  }, [profile]);

  const plan = PLANS.find((item) => item.slug === form.plan_slug) ?? PLANS[0]!;
  const price = prices?.find((item) => item.slug === form.plan_slug);
  const priceLabel = planPriceLabel(price) ?? "Sob consulta";
  const priceCents = typeof price?.price_cents === "number" ? price.price_cents : null;

  const fields = useMemo(
    () =>
      buildContractFields(form, {
        plan_slug: plan.slug,
        plan_name: plan.name,
        monthly_price_label: priceLabel,
        periodicity: "Mensal",
        payment_method: form.payment_method,
      }),
    [form, plan, priceLabel],
  );

  const allChecked = checks.every(Boolean);
  const requiredFilled =
    form.full_name.trim().length > 2 &&
    form.cpf_cnpj.trim().length >= 11 &&
    form.email.trim().includes("@") &&
    form.phone.trim().length >= 8 &&
    form.address.trim().length > 2 &&
    form.address_number.trim().length > 0 &&
    form.neighborhood.trim().length > 1 &&
    form.city_uf.trim().length > 1;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!requiredFilled) {
      toast.error("Preencha todos os dados obrigatórios do contrato.");
      return;
    }
    if (!allChecked) {
      toast.error("Marque as quatro declarações de aceite para concluir.");
      return;
    }

    try {
      await acceptMutation.mutateAsync({
        plan_slug: plan.slug,
        plan_name: plan.name,
        monthly_price_cents: priceCents,
        monthly_price_label: priceLabel,
        periodicity: "Mensal",
        payment_method: form.payment_method,
        full_name: form.full_name.trim(),
        cpf_cnpj: form.cpf_cnpj.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        address_number: form.address_number.trim(),
        complement: form.complement.trim(),
        neighborhood: form.neighborhood.trim(),
        city_uf: form.city_uf.trim(),
        client_type: form.client_type,
        fields,
        accepted_all: true,
      });
      toast.success("Contrato assinado! Sua contratação foi registrada.");
      void navigate({ to: "/painel/contrato" });
    } catch {
      toast.error("Não foi possível registrar o aceite. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Contratar plano e assinar contrato</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha o plano, confirme seus dados, leia o contrato e marque as declarações de aceite. O
          aceite é registrado com data, hora, IP e versão do contrato.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={form.plan_slug} onValueChange={(value) => set("plan_slug", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {plan.frequency} · {plan.hours} · {priceLabel}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select
              value={form.payment_method}
              onValueChange={(value) => set("payment_method", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Dados para o contrato</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo / razão social" value={form.full_name} onChange={(v) => set("full_name", v)} />
          <Field label="CPF ou CNPJ" value={form.cpf_cnpj} onChange={(v) => set("cpf_cnpj", v)} />
          <Field label="E-mail" value={form.email} onChange={(v) => set("email", v)} type="email" />
          <Field label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Endereço (rua/avenida)" value={form.address} onChange={(v) => set("address", v)} />
          <Field label="Número" value={form.address_number} onChange={(v) => set("address_number", v)} />
          <Field
            label="Complemento (opcional)"
            value={form.complement}
            onChange={(v) => set("complement", v)}
            optional
          />
          <Field label="Bairro" value={form.neighborhood} onChange={(v) => set("neighborhood", v)} />
          <Field label="Cidade / UF" value={form.city_uf} onChange={(v) => set("city_uf", v)} />
          <div className="space-y-2">
            <Label>Tipo de imóvel</Label>
            <Select
              value={form.client_type}
              onValueChange={(value) => set("client_type", value as FormState["client_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residencia">Residência</SelectItem>
                <SelectItem value="condominio">Condomínio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Contrato</h2>
        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
          <ContractText fields={fields} />
        </div>

        <div className="mt-6 space-y-3">
          {ACCEPT_ITEMS.map((item, index) => (
            <label key={index} className="flex gap-3 text-sm">
              <Checkbox
                checked={checks[index] === true}
                onCheckedChange={(value) =>
                  setChecks((current) =>
                    current.map((checked, i) => (i === index ? value === true : checked)),
                  )
                }
                className="mt-0.5"
              />
              <span className="text-muted-foreground">{item}</span>
            </label>
          ))}
        </div>

        <Button
          type="submit"
          className="mt-6 w-full sm:w-auto"
          disabled={acceptMutation.isPending || !allChecked}
        >
          {acceptMutation.isPending ? "Registrando aceite..." : "Aceitar e contratar"}
        </Button>
      </section>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required={!optional}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
