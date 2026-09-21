import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scheduleServiceRequest, setServiceRequestStatus } from "@/lib/admin.functions";
import { useProviders } from "@/components/admin/ProviderManager";
import { providerRoleLabel } from "@/lib/providers";

const STATUS_OPTIONS = [
  { value: "aberta", label: "Aberta" },
  { value: "em_analise", label: "Em análise" },
  { value: "agendada", label: "Agendada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ServiceRequestActions({
  request,
}: {
  request: {
    id: string;
    status: string;
    scheduled_at?: string | null;
    scheduled_technician?: string | null;
    materials_needed?: string | null;
    team_message?: string | null;
  };
}) {
  const queryClient = useQueryClient();
  const schedule = useServerFn(scheduleServiceRequest);
  const setStatus = useServerFn(setServiceRequestStatus);

  const [scheduledAt, setScheduledAt] = useState(toLocalInput(request.scheduled_at));
  const [technician, setTechnician] = useState(request.scheduled_technician ?? "");
  const [materials, setMaterials] = useState(request.materials_needed ?? "");
  const [message, setMessage] = useState(request.team_message ?? "");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const scheduleMutation = useMutation({
    mutationFn: () =>
      schedule({
        data: {
          request_id: request.id,
          scheduled_at: scheduledAt,
          scheduled_technician: technician,
          materials_needed: materials,
          team_message: message,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Agendamento enviado ao cliente para confirmação.");
      refresh();
    },
    onError: () => toast.error("Não foi possível salvar o agendamento."),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      setStatus({ data: { request_id: request.id, status } as never }),
    onSuccess: () => {
      toast.success("Situação atualizada.");
      refresh();
    },
    onError: () => toast.error("Não foi possível atualizar a situação."),
  });

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="h-4 w-4 text-primary" /> Resposta da equipe
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`data-${request.id}`}>Dia e hora da visita</Label>
          <Input
            id={`data-${request.id}`}
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Situação da solicitação</Label>
          <Select
            value={request.status}
            onValueChange={(value) => statusMutation.mutate(value)}
            disabled={statusMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label>Profissional que fará o serviço</Label>
        <Select value={technician || "none"} onValueChange={(value) => setTechnician(value === "none" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha o profissional cadastrado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">A definir</SelectItem>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.full_name}>
                {provider.full_name} · {providerRoleLabel(provider.role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {providers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Cadastre os profissionais na aba Prestadores para escolher aqui.
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`material-${request.id}`}>Material necessário (o cliente deve adquirir)</Label>
        <Textarea
          id={`material-${request.id}`}
          rows={3}
          value={materials}
          onChange={(event) => setMaterials(event.target.value)}
          placeholder="Ex.: 1 torneira de bancada, 1 veda rosca, 2 metros de mangueira flexível"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`msg-${request.id}`}>Mensagem para o cliente</Label>
        <Textarea
          id={`msg-${request.id}`}
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ex.: Nossa equipe estará no local no dia e hora marcados. Deixe o material disponível."
        />
      </div>

      <Button
        className="mt-4"
        size="sm"
        disabled={scheduleMutation.isPending || !scheduledAt}
        onClick={() => scheduleMutation.mutate()}
      >
        {scheduleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Enviar data, hora e materiais ao cliente
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Você pode alterar a data da visita a qualquer momento — o cliente recebe a nova data e
        confirma novamente.
      </p>
    </div>
  );
}
