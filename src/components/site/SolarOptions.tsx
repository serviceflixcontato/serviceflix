import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/hooks/use-plan-prices";
import { SOLAR_ADESAO_PANEIS, solarAdesao, solarAnnualTotal, solarMonthlyTotal } from "@/lib/plans";

export function parseSolar(panels: string, cleanings: string) {
  const p = Number.parseInt(panels, 10);
  const c = Number.parseInt(cleanings, 10);
  return {
    panels: Number.isFinite(p) && p >= 1 && p <= 1000 ? p : null,
    cleanings: Number.isFinite(c) && c >= 1 && c <= 12 ? c : null,
  };
}

export function SolarOptions({
  panels,
  cleanings,
  onPanels,
  onCleanings,
  perPanelCents,
}: {
  panels: string;
  cleanings: string;
  onPanels: (value: string) => void;
  onCleanings: (value: string) => void;
  perPanelCents: number | null;
}) {
  const valid = parseSolar(panels, cleanings);
  const ready = perPanelCents != null && valid.panels && valid.cleanings;
  return (
    <div className="grid gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 sm:col-span-2 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="solar-panels">Quantos painéis você tem?</Label>
        <Input
          id="solar-panels"
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          placeholder="Ex.: 10"
          value={panels}
          onChange={(event) => onPanels(event.target.value)}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="solar-cleanings">Quantas limpezas por ano?</Label>
        <Input
          id="solar-cleanings"
          type="number"
          inputMode="numeric"
          min={1}
          max={12}
          placeholder="Ex.: 4"
          value={cleanings}
          onChange={(event) => onCleanings(event.target.value)}
          className="bg-background"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <p className="text-sm text-muted-foreground">
          {perPanelCents != null
            ? `Valor por painel (cada limpeza): ${formatBRL(perPanelCents)}`
            : "Valor por painel a definir"}
        </p>
        <p className="text-sm text-muted-foreground">
          Total no ano:{" "}
          {ready ? formatBRL(solarAnnualTotal(perPanelCents, valid.panels!, valid.cleanings!)) : "—"}
        </p>
        <p className="text-lg font-bold">
          1ª mensalidade (adesão, equivale a {SOLAR_ADESAO_PANEIS} painéis):{" "}
          <span className="text-xl font-extrabold text-primary">
            {perPanelCents != null ? formatBRL(solarAdesao(perPanelCents)) : "—"}
          </span>
        </p>
        <p className="text-base font-semibold">
          Mais 11 parcelas de:{" "}
          {ready ? formatBRL(solarMonthlyTotal(perPanelCents, valid.panels!, valid.cleanings!)) : "—"}
        </p>
        <p className="rounded-lg border border-primary/40 bg-primary/5 p-2 text-xs font-medium text-foreground">
          Promoção especial: após a contratação não há carência — as limpezas já podem ser
          agendadas.
        </p>
      </div>
    </div>
  );
}
