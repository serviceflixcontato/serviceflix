import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/hooks/use-panel-data";
import { supabase } from "@/integrations/supabase/client";
import { providerRoleLabel } from "@/lib/providers";

type RequestRow = {
  id: string;
  scheduled_at?: string | null;
  scheduled_technician?: string | null;
  provider_name?: string | null;
  provider_role?: string | null;
  provider_photo_url?: string | null;
  materials_needed?: string | null;
  team_message?: string | null;
  schedule_status?: string | null;
  client_response_note?: string | null;
};

export function ScheduleResponse({
  request,
  providerPhoto,
}: {
  request: RequestRow;
  providerPhoto?: string | null | undefined;
}) {
  const queryClient = useQueryClient();
  const [showReschedule, setShowReschedule] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!request.scheduled_at) return null;

  const status = request.schedule_status ?? "aguardando_confirmacao";

  async function respond(next: "confirmado" | "reagendamento_solicitado") {
    if (next === "reagendamento_solicitado" && reason.trim().length < 5) {
      toast.error("Descreva o motivo do reagendamento.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({
        schedule_status: next,
        client_response_note: next === "confirmado" ? null : reason.trim(),
        client_responded_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível enviar sua resposta. Tente novamente.");
      return;
    }
    toast.success(
      next === "confirmado"
        ? "Data confirmada! Nossa equipe estará no local no dia e hora marcados."
        : "Pedido de reagendamento enviado. Vamos enviar uma nova data em breve.",
    );
    setShowReschedule(false);
    setReason("");
    void queryClient.invalidateQueries({ queryKey: ["service_requests"] });
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/40 bg-accent/40 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <CalendarClock className="h-4 w-4 text-primary" /> Agendamento da Service Flix
      </p>
      <p className="mt-2">
        <strong>Data e hora da visita:</strong> {formatDateTime(request.scheduled_at)}
      </p>
      {request.provider_name || request.scheduled_technician ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3">
          {providerPhoto ? (
            <img
              src={providerPhoto}
              alt={request.provider_name ?? "Profissional"}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">Profissional responsável</p>
            <p className="font-semibold">
              {request.provider_name ?? request.scheduled_technician}
            </p>
            <p className="text-xs text-muted-foreground">
              {providerRoleLabel(request.provider_role)}
            </p>
          </div>
        </div>
      ) : null}
      {request.materials_needed ? (
        <p className="mt-2">
          <strong>Material que você deve adquirir:</strong> {request.materials_needed}
        </p>
      ) : null}
      {request.team_message ? (
        <p className="mt-2 text-muted-foreground">{request.team_message}</p>
      ) : null}

      {status === "confirmado" ? (
        <p className="mt-3">
          <Badge className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Data confirmada por você
          </Badge>
        </p>
      ) : status === "reagendamento_solicitado" ? (
        <div className="mt-3">
          <Badge variant="outline">Reagendamento solicitado</Badge>
          {request.client_response_note ? (
            <p className="mt-2 text-muted-foreground">Motivo: {request.client_response_note}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={saving} onClick={() => void respond("confirmado")}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar data e hora
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReschedule((value) => !value)}
            >
              Solicitar reagendamento
            </Button>
          </div>
          {showReschedule ? (
            <div className="space-y-2">
              <Label htmlFor={`motivo-${request.id}`}>Motivo do reagendamento</Label>
              <Textarea
                id={`motivo-${request.id}`}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Conte o motivo e, se possível, os melhores dias e horários para você"
              />
              <Button
                size="sm"
                disabled={saving}
                onClick={() => void respond("reagendamento_solicitado")}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar pedido de reagendamento
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
