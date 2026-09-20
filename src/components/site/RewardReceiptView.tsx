import { Receipt } from "lucide-react";
import { useEffect, useState } from "react";

import { formatDateTime } from "@/hooks/use-panel-data";
import { signPhotoUrls } from "@/lib/service-photos";

/** Mostra ao cliente o comprovante da recompensa paga pela equipe. */
export function RewardReceiptView({
  receiptPath,
  receiptNote,
  paidAt,
}: {
  receiptPath: string;
  receiptNote: string | null;
  paidAt: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void signPhotoUrls([receiptPath]).then((map) => {
      if (active) setUrl(map.get(receiptPath) ?? null);
    });
    return () => {
      active = false;
    };
  }, [receiptPath]);

  return (
    <div className="mt-3 rounded-xl border border-primary/40 bg-accent p-3 text-accent-foreground">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Receipt className="h-4 w-4" /> Recompensa paga
      </p>
      <p className="mt-1 text-xs">
        {paidAt ? `Pagamento registrado em ${formatDateTime(paidAt)}.` : "Pagamento registrado."}
        {receiptNote ? ` ${receiptNote}` : ""}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block">
          <img
            src={url}
            alt="Comprovante da recompensa"
            className="max-h-56 rounded-xl border border-border object-contain"
          />
        </a>
      ) : (
        <p className="mt-2 text-xs">Carregando comprovante...</p>
      )}
    </div>
  );
}
