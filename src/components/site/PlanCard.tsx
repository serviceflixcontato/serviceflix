import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { planPriceLabel, usePlanPrices } from "@/hooks/use-plan-prices";
import type { Plan } from "@/lib/plans";

export function PlanCard({ plan }: { plan: Plan }) {
  const { data: prices } = usePlanPrices();
  const priceLabel = planPriceLabel(prices?.find((item) => item.slug === plan.slug));

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-card transition-transform duration-200 hover:-translate-y-1 ${
        plan.highlight ? "border-primary shadow-elevated" : "border-border"
      }`}
    >
      {plan.highlight ? (
        <Badge className="absolute -top-3 left-6">Mais escolhido</Badge>
      ) : null}

      <h3 className="text-xl font-semibold">{plan.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>

      {priceLabel ? (
        <p className="mt-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold">{priceLabel}</span>
          {priceLabel.startsWith("R$") ? (
            <span className="text-sm text-muted-foreground">/ mês</span>
          ) : null}
        </p>
      ) : null}

      <dl className="mt-5 space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <dt className="sr-only">Frequência</dt>
          <dd className="font-medium">{plan.frequency}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <dt className="sr-only">Carga horária</dt>
          <dd className="font-medium">{plan.hours}</dd>
        </div>
        <div className="pl-6 text-xs text-muted-foreground">{plan.monthlyHours}</div>
      </dl>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Ideal para: {plan.bestFor}
      </p>

      <Button asChild className="mt-4" variant={plan.highlight ? "default" : "secondary"}>
        <Link to="/contato" search={{ plano: plan.slug }}>
          Solicitar proposta
        </Link>
      </Button>
    </article>
  );
}
