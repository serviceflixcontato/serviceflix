import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Droplets,
  Gift,
  Hammer,
  Home,
  PaintRoller,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import heroImg from "@/assets/hero-manutencao.jpg";
import mascoteAsset from "@/assets/mascote-serviceflix.png.asset.json";
import condominiosImg from "@/assets/publico-condominios.jpg";
import residenciasImg from "@/assets/publico-residencias.jpg";
import { PlanCard } from "@/components/site/PlanCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { PLANS, whatsappLink } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Service Flix — Manutenção por assinatura para casas e condomínios" },
      {
        name: "description",
        content:
          "Manutenção predial e residencial por assinatura: equipe fixa, atendimentos semanais, ordens de serviço e painel do cliente. Para condomínios e residências.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:title",
        content: "Service Flix — Manutenção por assinatura para casas e condomínios",
      },
      {
        property: "og:description",
        content:
          "Equipe de manutenção quando você precisa: planos semanais para condomínios e residências, com painel do cliente completo.",
      },
    ],
  }),
  component: Home_,
});

const DESTAQUES = [
  {
    icon: ShieldCheck,
    title: "Equipe fixa",
    text: "Profissionais recorrentes que conhecem o seu imóvel.",
  },
  {
    icon: ClipboardList,
    title: "Tudo em OS",
    text: "Cada atendimento registrado no painel do cliente.",
  },
  {
    icon: Sparkles,
    title: "Preventivo",
    text: "Cronograma que evita emergências e reduz custos.",
  },
  {
    icon: Wrench,
    title: "Multisserviços",
    text: "Elétrica, hidráulica, reparos de pintura e reparos gerais.",
  },
];

const SERVICOS = [
  { icon: Zap, title: "Elétrica", text: "Quadros, tomadas, iluminação e pequenas instalações." },
  { icon: Droplets, title: "Hidráulica", text: "Vazamentos, torneiras, caixas d'água e desentupimento." },
  { icon: PaintRoller, title: "Pintura (reparos)", text: "Retoques e reparos de pintura em áreas comuns e ambientes." },
  { icon: Hammer, title: "Reparos gerais", text: "Alvenaria, fixações e ajustes do dia a dia. Reformas são feitas por contrato." },
];

const PASSOS = [
  { n: "01", title: "Escolha o plano", text: "Selecione a frequência ideal ou monte um plano sob medida." },
  { n: "02", title: "Falamos com você", text: "Avaliamos a demanda e enviamos a proposta com o escopo." },
  { n: "03", title: "Atendimentos programados", text: "A equipe cumpre os dias contratados com registro de OS." },
  { n: "04", title: "Acompanhe pelo painel", text: "Solicite serviços, veja o histórico e gerencie pagamentos." },
];

function Home_() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative isolate overflow-hidden">
          <img
            src={heroImg}
            alt="Técnico de manutenção Service Flix trabalhando na fachada de um condomínio"
            width={1600}
            height={1008}
            className="absolute inset-0 -z-10 h-full w-full object-cover object-right"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/30" />

          <img
            src={mascoteAsset.url}
            alt="Mascote Service Flix"
            width={512}
            height={683}
            className="pointer-events-none absolute bottom-0 right-2 hidden h-[380px] w-auto drop-shadow-2xl md:block lg:right-10 lg:h-[480px]"
          />

          <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-16 sm:pb-36 md:pt-24">
            <div className="max-w-2xl text-ink-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Serviços com flexibilidade
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
                Manutenção inteligente para{" "}
                <span className="text-primary">condomínios e residências</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-ink-foreground/80 sm:text-lg">
                Uma equipe de manutenção disponível nos dias contratados, com ordens de serviço,
                histórico e pagamentos organizados em um painel exclusivo do cliente.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/planos">
                    Ver planos <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-ink-foreground/40 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                >
                  <Link to="/contato">Solicitar orçamento</Link>
                </Button>
              </div>
              <img
                src={mascoteAsset.url}
                alt="Mascote Service Flix"
                width={512}
                height={683}
                loading="lazy"
                className="mx-auto mt-10 w-40 drop-shadow-2xl md:hidden"
              />
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-foreground/70">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Condomínios
                </span>
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" /> Residências e proprietários
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Equipe própria
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CARDS SOBREPOSTOS */}
        <section className="relative z-10 mx-auto -mt-20 w-full max-w-6xl px-4 sm:-mt-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DESTAQUES.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-elevated"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <item.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* DOIS PÚBLICOS */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Para quem atendemos
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Dois públicos, o mesmo padrão de atendimento
            </h2>
            <p className="mt-3 text-muted-foreground">
              A Service Flix atende quem administra condomínios e também quem só precisa de um
              profissional de confiança em casa.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {[
              {
                img: condominiosImg,
                alt: "Equipe de manutenção em frente a um condomínio residencial",
                icon: Building2,
                eyebrow: "Condomínios",
                title: "Manutenção contratada, sem depender de autônomos",
                text: "Para síndicos e administradoras que precisam de presença programada, responsabilidade técnica e relatórios de cada atendimento.",
                items: [
                  "Equipe fixa em dias definidos no contrato",
                  "Plano preventivo de áreas comuns e fachadas",
                  "Relatórios e histórico de OS para prestação de contas",
                  "Prioridade no atendimento de urgências",
                ],
                cta: "Falar sobre condomínios",
                plano: "premium" as const,
              },
              {
                img: residenciasImg,
                alt: "Profissional Service Flix fazendo reparo em uma cozinha residencial",
                icon: Home,
                eyebrow: "Residências e proprietários",
                title: "Um profissional de confiança sempre disponível",
                text: "Para quem cansou de procurar alguém a cada problema: reparos, instalações e manutenção da casa com preço previsível e equipe conhecida.",
                items: [
                  "Atendimentos semanais conforme o plano",
                  "Reparos elétricos, hidráulicos e de pintura",
                  "Fixações, instalações e pequenos ajustes",
                  "Solicitação de serviço direto pelo painel",
                ],
                cta: "Falar sobre residências",
                plano: "basico" as const,
              },
            ].map((bloco) => (
              <article
                key={bloco.eyebrow}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-card"
              >
                <img
                  src={bloco.img}
                  alt={bloco.alt}
                  loading="lazy"
                  width={1200}
                  height={900}
                  className="h-56 w-full object-cover sm:h-64"
                />
                <div className="p-6 sm:p-8">
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                    <bloco.icon className="h-3.5 w-3.5" /> {bloco.eyebrow}
                  </span>
                  <h3 className="mt-4 text-2xl font-bold">{bloco.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{bloco.text}</p>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {bloco.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6">
                    <Link to="/contato" search={{ plano: bloco.plano }}>
                      {bloco.cta}
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SERVIÇOS */}
        <section className="bg-muted/50 py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Nossos serviços
              </span>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Tudo o que a manutenção do dia a dia exige
              </h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICOS.map((s) => (
                <div
                  key={s.title}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-transform duration-200 hover:-translate-y-1"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PASSOS */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Como funciona
              </span>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Assinar a Service Flix é simples
              </h2>
              <p className="mt-3 text-muted-foreground">
                Do primeiro contato ao acompanhamento pelo painel, você sabe exatamente o que foi
                feito, quando e por quem.
              </p>
              <Button asChild className="mt-6" variant="secondary">
                <Link to="/planos">Comparar planos</Link>
              </Button>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              {PASSOS.map((passo) => (
                <li key={passo.n} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <span className="font-display text-2xl font-bold text-primary">{passo.n}</span>
                  <p className="mt-2 font-semibold">{passo.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{passo.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PLANOS */}
        <section className="bg-muted/50 py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Planos
                </span>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Escolha a frequência ideal</h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Todos os planos servem residências e condomínios, com painel do cliente,
                  abertura de solicitações e histórico de atendimentos.
                </p>
              </div>
              <Button asChild variant="ghost">
                <Link to="/planos">
                  Ver detalhes <ArrowRight className="ml-2 h-4 w-4" />
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

        {/* INDIQUE E GANHE */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16" id="indique-e-ganhe">
          <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 shadow-card lg:grid-cols-[1.1fr_0.9fr] lg:items-center sm:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                <Gift className="h-3.5 w-3.5" /> Indique e ganhe
              </span>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Ganhe R$ 500 por indicação que fechar contrato
              </h2>
              <p className="mt-3 text-muted-foreground">
                Conhece um condomínio ou uma residência que precisa de manutenção? Faça seu
                cadastro gratuito, envie a indicação pelo painel e receba a recompensa quando o
                indicado contratar um plano Service Flix.
              </p>
              <ol className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Crie sua conta (ou entre) na área do cliente.
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Preencha o cadastro da indicação: responsável, nome do condomínio ou residência,
                  endereço e CNPJ.
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Acompanhe a indicação e a recompensa na aba <strong>Indique e ganhe</strong>.
                </li>
              </ol>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">Cadastrar e indicar</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/painel/indicacoes">Já tenho conta</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl bg-brand-gradient p-8 text-primary-foreground">
              <p className="text-sm uppercase tracking-wider text-primary-foreground/80">
                Recompensa por indicação
              </p>
              <p className="mt-2 font-display text-5xl font-bold">R$ 500</p>
              <p className="mt-3 text-sm text-primary-foreground/90">
                Valor pago por cada indicação que se tornar cliente Service Flix. Sem limite de
                indicações.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="rounded-3xl bg-brand-gradient p-8 text-primary-foreground sm:p-12">
            <h2 className="text-3xl font-bold">Pronto para ter manutenção sem dor de cabeça?</h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/90">
              Deixe seus dados e nossa equipe entra em contato para entender a sua necessidade —
              seja no seu condomínio ou na sua casa.
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
