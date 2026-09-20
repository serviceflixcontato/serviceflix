import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/hooks/use-panel-data";
import { saveReferralReceipt } from "@/lib/admin.functions";
import { signPhotoUrls, uploadRewardReceipt } from "@/lib/service-photos";

type Props = {
  referralId: string;
  referrerId: string;
  receiptPath: string | null;
  receiptNote: string | null;
  paidAt: string | null;
};

/** Envio da foto do comprovante de transferência da recompensa de indicação. */
export function RewardReceiptUpload({
  referralId,
  referrerId,
  receiptPath,
  receiptNote,
  paidAt,
}: Props) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveReferralReceipt);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!receiptPath) {
      setUrl(null);
      return;
    }
    void signPhotoUrls([receiptPath]).then((map) => {
      if (active) setUrl(map.get(receiptPath) ?? null);
    });
    return () => {
      active = false;
    };
  }, [receiptPath]);

  const send = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Escolha a imagem do comprovante.");
      const path = await uploadRewardReceipt({ file, ownerId: referrerId });
      await save({ data: { id: referralId, storage_path: path, note } });
    },
    onSuccess: async () => {
      toast.success("Comprovante enviado. O cliente já pode ver a recompensa paga.");
      setFile(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o comprovante."),
  });

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-3">
      <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Receipt className="h-3.5 w-3.5" /> Comprovante do pagamento da recompensa
      </Label>

      {receiptPath ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Enviado {paidAt ? `em ${formatDateTime(paidAt)}` : ""}
            {receiptNote ? ` · ${receiptNote}` : ""}
          </p>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer">
              <img
                src={url}
                alt="Comprovante da recompensa"
                className="max-h-48 rounded-xl border border-border object-contain"
              />
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={400}
          placeholder="Observação (ex.: Pix enviado hoje)"
        />
        <Button
          type="button"
          disabled={!file || send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {receiptPath ? "Substituir comprovante" : "Enviar comprovante"}
        </Button>
      </div>
    </div>
  );
}
