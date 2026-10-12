import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlanPrices, useUpdatePlanPrice } from "@/hooks/use-plan-prices";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/admin/planos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Valores dos planos — Service Flix" },
      {
        name: "description",
        content: "Área restrita para atualizar os valores mensais dos planos de manutenção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Valores dos planos — Service Flix" },
      { property: "og:description", content: "Área restrita da equipe Service Flix." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <ValoresPlanos />
    </AdminShell>
  ),
});

type FormRow = { value: string; note: string };

function ValoresPlanos() {
  const { data: prices, isLoading } = usePlanPrices();
  const update = useUpdatePlanPrice();
  const [form, setForm] = useState<Record<string, FormRow>>({});

  useEffect(() => {
    if (!prices) return;
    const next: Record<string, FormRow> = {};
    for (const plan of PLANS) {
      const row = prices.find((item) => item.slug === plan.slug);
      next[plan.slug] = {
        value:
          typeof row?.price_cents === "number" ? (row.price_cents / 100).toFixed(2).replace(".", ",") : "",
        note: row?.price_note ?? "",
      };
    }
    setForm(next);
  }, [prices]);

  function setField(slug: string, field: keyof FormRow, value: string) {
    setForm((prev) => {
      const current: FormRow = prev[slug] ?? { value: "", note: "" };
      return { ...prev, [slug]: { ...current, [field]: value } };
    });
  }

  function handleSave(slug: string) {
    const row = form[slug];
    if (!row) return;
    const raw = row.value.trim().replace(/\./g, "").replace(",", ".");
    let cents: number | null = null;
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Informe um valor válido, por exemplo 1800,00.");
        return;
      }
      cents = Math.round(parsed * 100);
    }

    update.mutate(
      { slug, price_cents: cents, price_note: row.note.trim() || null },
      {
        onSuccess: () => toast.success("Valor atualizado. Já aparece no site."),
        onError: () => toast.error("Não foi possível salvar. Verifique seu acesso."),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Valores dos planos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Altere o valor mensal de cada plano. Deixe o valor em branco e escreva um texto (ex.: “Sob
          consulta”) quando o preço for negociado caso a caso.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <div key={plan.slug} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.slug === "personalizado"
                ? "O cliente escolhe os dias; a mensalidade é diária × dias."
                : plan.frequency}
            </p>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`valor-${plan.slug}`}>
                  {plan.slug === "personalizado" ? "Valor da diária (R$)" : "Valor mensal (R$)"}
                </Label>
                <Input
                  id={`valor-${plan.slug}`}
                  inputMode="decimal"
                  placeholder="1800,00"
                  value={form[plan.slug]?.value ?? ""}
                  onChange={(event) => setField(plan.slug, "value", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`obs-${plan.slug}`}>Texto no lugar do valor (opcional)</Label>
                <Input
                  id={`obs-${plan.slug}`}
                  maxLength={40}
                  placeholder="Sob consulta"
                  value={form[plan.slug]?.note ?? ""}
                  onChange={(event) => setField(plan.slug, "note", event.target.value)}
                />
              </div>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => handleSave(plan.slug)}
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
