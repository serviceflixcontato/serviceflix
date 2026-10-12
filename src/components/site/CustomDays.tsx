import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/hooks/use-plan-prices";

export function CustomDays({
  value,
  onChange,
  dailyCents,
  totalCents,
}: {
  value: string;
  onChange: (value: string) => void;
  dailyCents: number | null;
  totalCents: number | null;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/10 p-4 sm:col-span-2">
      <Label htmlFor="custom-days">Quantos dias por mês você quer?</Label>
      <Input
        id="custom-days"
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        placeholder="Ex.: 5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-40 bg-background"
      />
      <p className="text-sm text-muted-foreground">
        {dailyCents != null ? `Valor da diária: ${formatBRL(dailyCents)}` : "Valor da diária a definir"}
      </p>
      <p className="text-base font-semibold">
        Mensalidade: {totalCents != null ? formatBRL(totalCents) : "—"}
      </p>
    </div>
  );
}
