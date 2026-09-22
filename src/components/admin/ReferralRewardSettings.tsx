import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/hooks/use-panel-data";
import { useReferralReward } from "@/hooks/use-referral-settings";
import { updateReferralRewardAmount, updateReferralRewardSetting } from "@/lib/admin.functions";

/** Converte "500" ou "500,50" em centavos. */
function toCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function fromCents(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Valor padrão pago por cada nova indicação convertida. */
export function ReferralRewardSettings() {
  const queryClient = useQueryClient();
  const { rewardCents } = useReferralReward();
  const [value, setValue] = useState<string | null>(null);
  const save = useServerFn(updateReferralRewardSetting);

  const mutation = useMutation({
    mutationFn: (reward_cents: number) => save({ data: { reward_cents } }),
    onSuccess: () => {
      toast.success("Valor das indicações atualizado.");
      setValue(null);
      void queryClient.invalidateQueries({ queryKey: ["referral-settings"] });
    },
    onError: () => toast.error("Não foi possível salvar o novo valor."),
  });

  const current = value ?? fromCents(rewardCents);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <Label htmlFor="referral-reward" className="text-sm font-semibold">
        Valor pago por indicação
      </Label>
      <p className="mt-1 text-xs text-muted-foreground">
        Hoje cada indicação que fecha contrato vale {formatBRL(rewardCents)}. Alterar aqui muda o
        valor das próximas indicações.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">R$</span>
        <Input
          id="referral-reward"
          inputMode="decimal"
          className="w-36"
          value={current}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          size="sm"
          disabled={mutation.isPending}
          onClick={() => {
            const cents = toCents(current);
            if (cents === null) {
              toast.error("Informe um valor válido, por exemplo 500,00.");
              return;
            }
            mutation.mutate(cents);
          }}
        >
          Salvar valor
        </Button>
      </div>
    </div>
  );
}

/** Ajuste do valor de uma indicação específica. */
export function ReferralRewardAmount({
  referralId,
  rewardCents,
}: {
  referralId: string;
  rewardCents: number;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<string | null>(null);
  const save = useServerFn(updateReferralRewardAmount);

  const mutation = useMutation({
    mutationFn: (reward_cents: number) => save({ data: { id: referralId, reward_cents } }),
    onSuccess: () => {
      toast.success("Valor da indicação atualizado.");
      setValue(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Não foi possível alterar o valor desta indicação."),
  });

  const current = value ?? fromCents(rewardCents ?? 0);

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">Valor desta indicação</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">R$</span>
        <Input
          inputMode="decimal"
          value={current}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => {
            const cents = toCents(current);
            if (cents === null) {
              toast.error("Informe um valor válido, por exemplo 500,00.");
              return;
            }
            mutation.mutate(cents);
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
