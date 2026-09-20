import { Link, createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
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
import { PhotoGrid } from "@/components/site/PhotoGrid";
import { ScheduleResponse } from "@/components/site/ScheduleResponse";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABELS,
  formatDateTime,
  useServiceRequests,
  useSubscription,
} from "@/hooks/use-panel-data";
import { groupPhotos, useServicePhotos } from "@/hooks/use-service-photos";
import { uploadServicePhotos } from "@/lib/service-photos";

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
  "Pintura (reparos)",
  "Alvenaria",
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
  const { data: subscription } = useSubscription();
  const isActive = subscription?.status === "ativa";
  const { data: photos = [] } = useServicePhotos();
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("media");
  const [files, setFiles] = useState<File[]>([]);

  const photosByRequest = groupPhotos(photos).byRequest;

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

    const { data: created, error } = await supabase
      .from("service_requests")
      .insert({
        user_id: userId,
        title: parsed.data.title,
        category: parsed.data.category,
        urgency: parsed.data.priority,
        location: parsed.data.location ?? null,
        description: parsed.data.description,
      })
      .select("id")
      .single();

    if (error || !created) {
      setSubmitting(false);
      toast.error("Não foi possível registrar a solicitação. Tente novamente.");
      return;
    }

    if (files.length > 0) {
      try {
        await uploadServicePhotos({
          files,
          ownerId: userId,
          uploadedBy: userId,
          kind: "cliente",
          requestId: created.id,
        });
      } catch (uploadError) {
        toast.error(
          uploadError instanceof Error
            ? uploadError.message
            : "A solicitação foi enviada, mas as fotos não subiram.",
        );
      }
    }

    setSubmitting(false);
    toast.success("Solicitação enviada! Nossa equipe já foi notificada.");
    formEl.reset();
    setCategory("");
    setPriority("media");
    setFiles([]);
    void queryClient.invalidateQueries({ queryKey: ["service_requests"] });
    void queryClient.invalidateQueries({ queryKey: ["service_photos"] });
  }

  if (!isActive) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Lock className="h-5 w-5 text-primary" /> Conta ainda não ativada
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {subscription
              ? "Seu contrato foi registrado. Assim que o pagamento for confirmado e nossa equipe ativar sua conta, você poderá abrir solicitações de manutenção por aqui."
              : "Para abrir solicitações de manutenção, escolha um plano, assine o contrato e realize o pagamento. A ativação é feita pela nossa equipe."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={subscription ? "/painel/pagamentos" : "/painel/contratar"}>
                {subscription ? "Ir para pagamentos" : "Escolher plano"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/painel/contrato">Ver meu contrato</Link>
            </Button>
          </div>
        </section>
      </div>
    );
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


          <div className="space-y-2">
            <Label htmlFor="photos">Fotos do problema (opcional)</Label>
            <Input
              id="photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
            <p className="text-xs text-muted-foreground">
              {files.length > 0
                ? `${files.length} foto(s) selecionada(s)`
                : "Você pode anexar várias fotos, até 10 MB cada."}
            </p>
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
                  <p className="font-semibold">
                    {request.request_code ? `${request.request_code} · ` : ""}
                    {request.title}
                  </p>
                  <Badge variant="secondary">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.category} · {request.location ?? "Local não informado"} ·{" "}
                  {formatDateTime(request.created_at)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>
                <ScheduleResponse request={request} />
                <PhotoGrid
                  photos={(photosByRequest.get(request.id) ?? []).filter(
                    (photo) => photo.kind === "cliente",
                  )}
                  title="Fotos enviadas por você"
                />
                <PhotoGrid
                  photos={(photosByRequest.get(request.id) ?? []).filter(
                    (photo) => photo.kind === "conclusao",
                  )}
                  title="Serviço finalizado pela equipe"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
