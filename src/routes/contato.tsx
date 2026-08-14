import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
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
import { supabase } from "@/integrations/supabase/client";
import { CONTACT, PLANS, whatsappLink } from "@/lib/plans";

const searchSchema = z.object({
  plano: z.string().optional(),
});

export const Route = createFileRoute("/contato")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Solicitar contato — Service Flix" },
      {
        name: "description",
        content:
          "Preencha seus dados e a equipe da Service Flix entra em contato para montar o plano de manutenção ideal para sua residência ou condomínio.",
      },
      { property: "og:title", content: "Solicitar contato — Service Flix" },
      {
        property: "og:description",
        content: "Fale com a Service Flix e receba uma proposta de manutenção por assinatura.",
      },
    ],
  }),
  component: ContatoPage,
});

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Informe um telefone válido").max(30),
  property_type: z.enum(["residencia", "condominio", "empresa"]),
  plan_interest: z.string().max(60).optional(),
  message: z.string().trim().max(1000).optional(),
});

function ContatoPage() {
  const { plano } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [propertyType, setPropertyType] = useState("residencia");
  const [planInterest, setPlanInterest] = useState(plano ?? "master");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = leadSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      property_type: propertyType,
      plan_interest: planInterest,
      message: form.get("message") ?? "",
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados informados.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("contact_leads").insert(parsed.data);
    setLoading(false);

    if (error) {
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
      return;
    }

    setSent(true);
    toast.success("Solicitação enviada! Nossa equipe entrará em contato.");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h1 className="text-4xl font-bold">Solicitar contato</h1>
            <p className="mt-4 text-muted-foreground">
              Preencha o formulário e nossa equipe entra em contato para entender sua necessidade e
              apresentar a proposta do plano mais adequado.
            </p>

            {sent ? (
              <div className="mt-8 rounded-2xl border border-primary/40 bg-accent p-8 text-accent-foreground">
                <h2 className="text-xl font-semibold">Recebemos sua solicitação!</h2>
                <p className="mt-2 text-sm">
                  Em breve nossa equipe entra em contato pelo telefone ou e-mail informado.
                </p>
                <Button className="mt-5" variant="secondary" onClick={() => setSent(false)}>
                  Enviar outra solicitação
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" name="name" maxLength={120} required placeholder="Seu nome" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input id="phone" name="phone" maxLength={30} required placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" maxLength={255} required placeholder="voce@email.com" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="property_type">Tipo de imóvel</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger id="property_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residencia">Residência</SelectItem>
                        <SelectItem value="condominio">Condomínio</SelectItem>
                        <SelectItem value="empresa">Empresa / comércio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan_interest">Plano de interesse</Label>
                    <Select value={planInterest} onValueChange={setPlanInterest}>
                      <SelectTrigger id="plan_interest">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Conte o que você precisa (opcional)</Label>
                  <Textarea
                    id="message"
                    name="message"
                    maxLength={1000}
                    rows={4}
                    placeholder="Ex: condomínio com 40 unidades, precisa de manutenção preventiva e reparos elétricos."
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar solicitação
                </Button>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold">Atendimento direto</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  {CONTACT.whatsappLabel}
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  {CONTACT.email}
                </li>
              </ul>
              <Button asChild className="mt-5 w-full" variant="secondary">
                <a
                  href={whatsappLink("Olá! Gostaria de falar sobre os planos da Service Flix.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                </a>
              </Button>
            </div>

            <div className="rounded-2xl bg-brand-gradient p-6 text-primary-foreground">
              <h2 className="text-lg font-semibold">Já é cliente?</h2>
              <p className="mt-2 text-sm text-primary-foreground/90">
                Acesse a área exclusiva para abrir solicitações, ver OS e pagamentos.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
