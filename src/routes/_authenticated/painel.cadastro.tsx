import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { useProfile } from "@/hooks/use-panel-data";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { isProfileComplete } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/painel/cadastro")({
  component: CadastroCompleto,
});

type FormState = {
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
};

function CadastroCompleto() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const complete = isProfileComplete(profile ?? null);

  const [form, setForm] = useState<FormState>({
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
  });

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({
        full_name: form.full_name.trim(),
        cpf_cnpj: form.cpf_cnpj.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        address_number: form.address_number.trim(),
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim(),
        city_uf: form.city_uf.trim(),
        client_type: form.client_type,
      });
      toast.success("Cadastro completo! Seus dados já entram no contrato automaticamente.");
      void navigate({ to: "/painel/contratar" });
    } catch {
      toast.error("Não foi possível salvar seus dados. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Completar meu cadastro</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esses dados ficam guardados na sua conta e são usados automaticamente no contrato quando
          você escolher um plano — você não precisa digitar tudo de novo.
        </p>
        {complete ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-accent p-3 text-sm text-accent-foreground">
            <CheckCircle2 className="h-4 w-4" /> Seu cadastro está completo.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo / razão social" value={form.full_name} onChange={(v) => set("full_name", v)} />
          <Field label="CPF ou CNPJ" value={form.cpf_cnpj} onChange={(v) => set("cpf_cnpj", v)} />
          <Field label="E-mail" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Telefone / WhatsApp" value={form.phone} onChange={(v) => set("phone", v)} />
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

        <Button type="submit" className="mt-6" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar e continuar
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
