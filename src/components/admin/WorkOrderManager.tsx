import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Trash2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS, formatDateTime } from "@/hooks/use-panel-data";
import {
  createWorkOrder,
  deleteWorkOrder,
  setWorkOrderStatus,
  updateWorkOrder,
} from "@/lib/admin.functions";
import { useProviders } from "@/components/admin/ProviderManager";
import { providerRoleLabel } from "@/lib/providers";

type Client = { id: string; full_name: string | null; email: string | null };
type RequestRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  request_code?: string | null;
};
export type AdminWorkOrder = {
  id: string;
  user_id: string;
  request_id: string | null;
  os_number: string;
  title: string;
  description: string | null;
  technician: string | null;
  provider_id?: string | null;
  provider_name?: string | null;
  provider_role?: string | null;
  provider_photo_url?: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  hours_spent: number | null;
  status: string;
};

const OS_STATUS = ["agendada", "em_andamento", "concluida", "cancelada"] as const;

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function WorkOrderManager({
  orders,
  clients,
  requests,
  nameById,
}: {
  orders: AdminWorkOrder[];
  clients: Client[];
  requests: RequestRow[];
  nameById: Map<string, string>;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  const createFn = useServerFn(createWorkOrder);
  const updateFn = useServerFn(updateWorkOrder);
  const statusFn = useServerFn(setWorkOrderStatus);
  const deleteFn = useServerFn(deleteWorkOrder);

  const [clientId, setClientId] = useState("");
  const [requestId, setRequestId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [providerId, setProviderId] = useState("none");
  const [scheduledFor, setScheduledFor] = useState("");
  const providers = (useProviders().data ?? []).filter((p) => p.active);

  const openRequests = useMemo(
    () => requests.filter((r) => r.status !== "cancelada"),
    [requests],
  );

  /** Ao escolher o código da solicitação, cliente e serviço entram sozinhos. */
  function handlePickRequest(value: string) {
    setRequestId(value);
    if (value === "none") return;
    const request = requests.find((r) => r.id === value);
    if (!request) return;
    setClientId(request.user_id);
    if (!title.trim()) setTitle(request.title);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          user_id: clientId,
          request_id: requestId === "none" ? null : requestId,
          title: title.trim(),
          description: description.trim() || undefined,
          provider_id: providerId === "none" ? null : providerId,
          scheduled_for: scheduledFor || null,
        },
      }),
    onSuccess: () => {
      toast.success("Ordem de serviço criada. O cliente já vê no painel dele.");
      setClientId("");
      setRequestId("none");
      setTitle("");
      setDescription("");
      setProviderId("none");
      setScheduledFor("");
      invalidate();
    },
    onError: () => toast.error("Não foi possível criar a OS."),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { order_id: string; status: string; hours_spent?: number | null }) =>
      statusFn({ data: input as never }),
    onSuccess: () => {
      toast.success("Situação da OS atualizada.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível atualizar a OS."),
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => deleteFn({ data: { order_id: orderId } }),
    onSuccess: () => {
      toast.success("OS excluída.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível excluir a OS."),
  });

  const open = orders.filter((o) => !o.completed_at && o.status !== "cancelada");
  const done = orders.filter((o) => o.completed_at || o.status === "cancelada");

  function handleCreate() {
    if (!clientId) {
      toast.error("Escolha o cliente.");
      return;
    }
    if (title.trim().length < 2) {
      toast.error("Informe o serviço que será executado.");
      return;
    }
    createMutation.mutate();
  }

  function handleConclude(order: AdminWorkOrder) {
    const input = window.prompt(
      `Concluir ${order.os_number} — quantas horas de serviço? (ex.: 2 ou 1.5)`,
      order.hours_spent != null ? String(order.hours_spent) : "",
    );
    if (input === null) return;
    const hours = input.trim() === "" ? null : Number(input.replace(",", "."));
    if (hours != null && Number.isNaN(hours)) {
      toast.error("Horas inválidas.");
      return;
    }
    statusMutation.mutate({ order_id: order.id, status: "concluida", hours_spent: hours });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">Nova ordem de serviço</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Código da solicitação (ex.: OS123456SF)</Label>
            <Select value={requestId} onValueChange={handlePickRequest}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o código" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vínculo (OS criada por nós)</SelectItem>
                {openRequests.map((request) => (
                  <SelectItem key={request.id} value={request.id}>
                    {request.request_code ?? "sem código"} · {request.title} ·{" "}
                    {nameById.get(request.user_id) ?? "Cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name ?? client.email ?? "Cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Serviço</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Troca de torneira no banheiro social"
              maxLength={140}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do serviço, materiais, observações..."
              maxLength={1500}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Técnico responsável (opcional)</Label>
            <Input
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Nome do técnico"
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-xs">Data e hora agendada</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          className="mt-3"
          onClick={handleCreate}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Criar OS para o cliente
        </Button>
      </div>

      {open.length > 0 ? (
        <div>
          <p className="text-sm font-semibold">Em aberto</p>
          <ul className="mt-2 space-y-3">
            {open.map((order) => (
              <WorkOrderRow
                key={order.id}
                order={order}
                nameById={nameById}
                busy={statusMutation.isPending}
                onStatus={(status) => statusMutation.mutate({ order_id: order.id, status })}
                onConclude={() => handleConclude(order)}
                onDelete={() => deleteMutation.mutate(order.id)}
                onSaveEdit={(patch) => updateFn({ data: { order_id: order.id, ...patch } }).then(() => {
                  toast.success("OS atualizada.");
                  invalidate();
                })}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {done.length > 0 ? (
        <div>
          <p className="text-sm font-semibold">Concluídas e canceladas</p>
          <ul className="mt-2 space-y-3">
            {done.map((order) => (
              <WorkOrderRow
                key={order.id}
                order={order}
                nameById={nameById}
                busy={statusMutation.isPending}
                onStatus={(status) => statusMutation.mutate({ order_id: order.id, status })}
                onConclude={() => handleConclude(order)}
                onDelete={() => deleteMutation.mutate(order.id)}
                onSaveEdit={(patch) => updateFn({ data: { order_id: order.id, ...patch } }).then(() => {
                  toast.success("OS atualizada.");
                  invalidate();
                })}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {orders.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" /> Nenhuma OS registrada. Crie a primeira acima.
        </p>
      ) : null}
    </div>
  );
}

function WorkOrderRow({
  order,
  nameById,
  busy,
  onStatus,
  onConclude,
  onDelete,
  onSaveEdit,
}: {
  order: AdminWorkOrder;
  nameById: Map<string, string>;
  busy: boolean;
  onStatus: (status: string) => void;
  onConclude: () => void;
  onDelete: () => void;
  onSaveEdit: (patch: {
    title: string;
    description: string | undefined;
    technician: string | undefined;
    scheduled_for: string | null;
  }) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description ?? "");
  const [technician, setTechnician] = useState(order.technician ?? "");
  const [scheduledFor, setScheduledFor] = useState(toLocalInput(order.scheduled_for));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (title.trim().length < 2) {
      toast.error("Informe o serviço.");
      return;
    }
    setSaving(true);
    try {
      await onSaveEdit({
        title: title.trim(),
        description: description.trim() || undefined,
        technician: technician.trim() || undefined,
        scheduled_for: scheduledFor || null,
      });
      setEditing(false);
    } catch {
      toast.error("Não foi possível salvar a OS.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {order.os_number} · {order.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {nameById.get(order.user_id) ?? "Cliente"} ·{" "}
            {order.scheduled_for
              ? `agendada para ${formatDateTime(order.scheduled_for)}`
              : "sem data marcada"}{" "}
            · {order.technician ?? "técnico a definir"}
          </p>
          {order.completed_at ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Concluída em {formatDateTime(order.completed_at)}
              {order.hours_spent != null ? ` · ${order.hours_spent}h de serviço` : ""}
            </p>
          ) : null}
          {order.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{order.description}</p>
          ) : null}
        </div>
        <Badge variant={order.completed_at ? "default" : "secondary"}>
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      {editing ? (
        <div className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Serviço</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1500}
            />
          </div>
          <div>
            <Label className="text-xs">Técnico</Label>
            <Input value={technician} onChange={(e) => setTechnician(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label className="text-xs">Data e hora</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={order.status} onValueChange={onStatus} disabled={busy}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OS_STATUS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status] ?? status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!order.completed_at ? (
            <Button size="sm" variant="secondary" onClick={onConclude} disabled={busy}>
              Concluir OS
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3 w-3" /> Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm(`Excluir a ${order.os_number}? Isso não pode ser desfeito.`)) {
                onDelete();
              }
            }}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </li>
  );
}
