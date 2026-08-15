import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, formatDateTime, useWorkOrders } from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/ordens")({
  component: Ordens,
});

function Ordens() {
  const { data: orders = [], isLoading } = useWorkOrders();
  const history = orders.filter((order) => order.completed_at);
  const upcoming = orders.filter((order) => !order.completed_at);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Ordens de serviço em aberto</h1>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhuma OS em aberto no momento.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.map((order) => (
              <li key={order.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">
                    {order.os_number} · {order.title}
                  </p>
                  <Badge variant="secondary">{STATUS_LABELS[order.status] ?? order.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Agendada para {formatDateTime(order.scheduled_for)} ·{" "}
                  {order.technician ?? "Técnico a definir"}
                </p>
                {order.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{order.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Histórico de atendimentos</h2>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Os atendimentos concluídos aparecerão aqui.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">OS</th>
                  <th className="pb-3">Serviço</th>
                  <th className="pb-3">Técnico</th>
                  <th className="pb-3">Conclusão</th>
                  <th className="pb-3">Horas</th>
                </tr>
              </thead>
              <tbody>
                {history.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="py-3 font-medium">{order.os_number}</td>
                    <td className="py-3">{order.title}</td>
                    <td className="py-3 text-muted-foreground">{order.technician ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">
                      {formatDateTime(order.completed_at)}
                    </td>
                    <td className="py-3 text-muted-foreground">{order.hours_spent ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
