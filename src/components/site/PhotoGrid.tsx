import type { ServicePhoto } from "@/hooks/use-service-photos";
import { formatDateTime } from "@/hooks/use-panel-data";

/** Mostra as fotos de um atendimento com um destaque para as de serviço concluído. */
export function PhotoGrid({ photos, title }: { photos: ServicePhoto[]; title?: string }) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-3">
      {title ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.id} className="overflow-hidden rounded-xl border border-border">
            {photo.url ? (
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Foto do serviço"}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform hover:scale-105"
                />
              </a>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
                Foto indisponível
              </div>
            )}
            <figcaption className="px-2 py-1.5 text-[11px] leading-tight text-muted-foreground">
              {photo.kind === "conclusao" ? "Serviço concluído" : "Enviada pelo cliente"}
              <br />
              {photo.caption ? `${photo.caption} · ` : ""}
              {formatDateTime(photo.created_at)}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
