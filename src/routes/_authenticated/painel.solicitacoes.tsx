import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, formatDateTime, useServiceRequests } from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel/solicitacoes")({
  component: Solicitacoes,
});

const schema = z.object({
  title: z.string().trim().min(3, "Descreva o serviço em poucas palavras").max(120),
  category: z.string().trim().min(1, "Selecione uma categoria").max(60),
  priority: z.enum(["baixa", "media", "alta", "urgente"]),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().min(10, "Detalhe o que precisa ser feito").max(1500),
});

const CATEGORIES = [
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Alvenaria",
  "Marcenaria",
  "Ar-condicionado",
  "Jardinagem",
  "Outros",
];

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

function Solicitacoes() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useServiceRequests();
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("media");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const parsed = schema.safeParse({
      title: form.get("title"),
      category,
      priority,
      location: form.get("location"),
      description: form.get("description"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados");
      return;
    }

    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSubmitting(false);
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const { error } = await supabase.from("service_requests").insert({
      user_id: userId,
      title: parsed.data.title,
      category: parsed.data.category,
      priority: parsed.data.priority,
      location: parsed.data.location ?? null,
      description: parsed.data.description,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível registrar a solicitação. Tente novamente.");
      return;
    }
    toast.success("Solicitação enviada! Nossa equipe já foi notificada.");
    formEl.reset();
    setCategory("");
    setPriority("media");
    void queryClient.invalidateQueries({ queryKey: ["service_requests"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Nova solicitação de manutenção</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Descreva o serviço necessário. Vamos agendar dentro dos dias previstos no seu plano.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" placeholder="Ex.: Troca de tomada na cozinha" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local / unidade</Label>
            <Input id="location" name="location" placeholder="Ex.: Bloco B — apto 302" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Conte os detalhes do que precisa ser feito"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar solicitação
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Minhas solicitações</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma solicitação registrada ainda.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">{request.title}</p>
                  <Badge variant="secondary">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.category} · {request.location ?? "Local não informado"} ·{" "}
                  {formatDateTime(request.created_at)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
