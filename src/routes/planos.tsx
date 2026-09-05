import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";

import mascoteAsset from "@/assets/mascote-serviceflix.png.asset.json";
import { PlanCard } from "@/components/site/PlanCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos de manutenção — Service Flix" },
      {
        name: "description",
        content:
          "Compare os planos Básico, Master, Premium e Personalizado da Service Flix: dias de atendimento por semana, carga horária e serviços inclusos.",
      },
      { property: "og:title", content: "Planos de manutenção — Service Flix" },
      {
        property: "og:description",
        content:
          "Do plano Básico (1 dia por semana) ao Personalizado: escolha a frequência de manutenção ideal para seu imóvel.",
      },
    ],
  }),
  component: PlanosPage,
});

const INCLUSOS = [
  "Painel exclusivo do cliente",
  "Abertura de solicitações online",
  "Ordens de serviço registradas",
  "Histórico de atendimentos",
  "Informações do contrato",
  "Acompanhamento de pagamentos",
];

function PlanosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-muted/40 py-14">
          <div className="mx-auto w-full max-w-6xl px-4 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div>
              <h1 className="text-4xl font-bold">Planos de manutenção por assinatura</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Cada plano define quantos dias por semana nossa equipe está no seu imóvel, com 4 horas
              de serviço por atendimento. Precisa de outra configuração? O plano Personalizado é
              montado conforme a sua necessidade.
            </p>
            </div>
            <img
              src={mascoteAsset.url}
              alt="Mascote Service Flix"
              width={512}
              height={683}
              className="mx-auto mt-8 w-40 drop-shadow-xl lg:mx-0 lg:mt-0 lg:w-52"
            />
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.slug} plan={plan} />
            ))}
          </div>
        </section>

        <section className="bg-muted/50 py-14">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-2xl font-bold">Comparativo rápido</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/70 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Plano</th>
                    <th className="px-4 py-3 font-semibold">Dias por semana</th>
                    <th className="px-4 py-3 font-semibold">Horas por dia</th>
                    <th className="px-4 py-3 font-semibold">Carga mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {PLANS.map((plan) => (
                    <tr key={plan.slug} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{plan.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{plan.frequency}</td>
                      <td className="px-4 py-3 text-muted-foreground">{plan.hours}</td>
                      <td className="px-4 py-3 text-muted-foreground">{plan.monthlyHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-lg font-semibold">Incluso em todos os planos</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {INCLUSOS.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6">
                <Link to="/contato">Solicitar proposta</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
