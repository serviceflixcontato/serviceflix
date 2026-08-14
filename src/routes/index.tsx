import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Home,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { PlanCard } from "@/components/site/PlanCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { PLANS, whatsappLink } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Service Flix — Manutenção predial por assinatura" },
      {
        name: "description",
        content:
          "Planos de manutenção por assinatura para residências e condomínios: equipe fixa, atendimentos semanais e painel do cliente para acompanhar OS e pagamentos.",
      },
      { property: "og:title", content: "Service Flix — Manutenção predial por assinatura" },
      {
        property: "og:description",
        content:
          "Equipe de manutenção quando você precisa, com planos semanais e painel do cliente completo.",
      },
    ],
  }),
  component: Home_,
});

const DIFERENCIAIS = [
  {
    icon: ShieldCheck,
    title: "Equipe fixa e confiável",
    text: "Profissionais recorrentes que conhecem o seu imóvel e o histórico dos serviços.",
  },
  {
    icon: ClipboardList,
    title: "Tudo registrado em OS",
    text: "Cada atendimento gera uma ordem de serviço acessível no painel do cliente.",
  },
  {
    icon: Sparkles,
    title: "Preventivo antes do prejuízo",
    text: "Cronograma de manutenção que evita emergências e reduz custos ao longo do ano.",
  },
  {
    icon: Wrench,
    title: "Serviços com flexibilidade",
    text: "Elétrica, hidráulica, pintura, alvenaria, montagem e pequenos reparos no mesmo contrato.",
  },
];

const PASSOS = [
  { n: "01", title: "Escolha o plano", text: "Selecione a frequência ideal ou monte um plano sob medida." },
  { n: "02", title: "Nossa equipe entra em contato", text: "Avaliamos a demanda e enviamos a proposta com o escopo." },
  { n: "03", title: "Atendimentos programados", text: "A equipe cumpre os dias contratados com registro de OS." },
  { n: "04", title: "Acompanhe pelo painel", text: "Solicite serviços, veja o histórico e gerencie pagamentos." },
];

function Home_() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-hero text-ink-foreground">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/20 bg-ink-foreground/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
                Serviços com flexibilidade
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
                Manutenção por assinatura para{" "}
                <span className="text-primary">residências e condomínios</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-ink-foreground/80 sm:text-lg">
                Uma equipe de manutenção disponível nos dias contratados, com ordens de serviço,
                histórico e pagamentos organizados em um painel exclusivo do cliente.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/contato">
                    Solicitar contato <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/planos">Ver planos</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-sm text-ink-foreground/70">
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" /> Residências
                </span>
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Condomínios
                </span>
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> Atendimento por WhatsApp
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-ink-foreground/15 bg-ink-foreground/5 p-6 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                Como funciona a assinatura
              </h2>
              <ul className="mt-4 space-y-4">
                {PASSOS.map((passo) => (
                  <li key={passo.n} className="flex gap-4">
                    <span className="font-display text-lg font-semibold text-primary">{passo.n}</span>
                    <div>
                      <p className="font-medium">{passo.title}</p>
                      <p className="text-sm text-ink-foreground/70">{passo.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">Por que assinar a Service Flix</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Em vez de procurar profissional a cada problema, você tem manutenção contínua com
            previsibilidade de custo e responsabilidade técnica.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DIFERENCIAIS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-muted/50 py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Planos de manutenção</h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Todos os planos incluem painel do cliente, abertura de solicitações e histórico de
                  atendimentos.
                </p>
              </div>
              <Button asChild variant="ghost">
                <Link to="/planos">
                  Comparar planos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((plan) => (
                <PlanCard key={plan.slug} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="rounded-3xl bg-brand-gradient p-8 text-primary-foreground sm:p-12">
            <h2 className="text-3xl font-bold">Pronto para ter manutenção sem dor de cabeça?</h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/90">
              Deixe seus dados e nossa equipe entra em contato para entender a sua necessidade e
              montar a melhor proposta.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contato">Solicitar contato</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href={whatsappLink("Olá! Gostaria de saber mais sobre os planos da Service Flix.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
