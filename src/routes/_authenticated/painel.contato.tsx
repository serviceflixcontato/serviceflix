import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CONTACT, whatsappLink } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/painel/contato")({
  component: Contato,
  head: () => ({
    meta: [
      { title: "Contato | Painel do Cliente Service Flix" },
      {
        name: "description",
        content:
          "Fale com a equipe Service Flix pelo WhatsApp ou e-mail direto da sua área do cliente.",
      },
      { property: "og:title", content: "Contato | Painel do Cliente Service Flix" },
      {
        property: "og:description",
        content:
          "Fale com a equipe Service Flix pelo WhatsApp ou e-mail direto da sua área do cliente.",
      },
    ],
  }),
});

function Contato() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Fale com a Service Flix</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Precisa de algo urgente, tem dúvidas sobre o contrato ou quer ajustar algo no seu plano?
          Nossa equipe responde rapidinho pelos canais abaixo.
        </p>

        <div className="mt-6 space-y-4">
          <a
            href={whatsappLink("Olá! Sou cliente Service Flix e gostaria de falar com a equipe.")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">WhatsApp</span>
              <span className="block text-sm text-muted-foreground">{CONTACT.whatsappLabel}</span>
            </span>
          </a>

          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Mail className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">E-mail</span>
              <span className="block text-sm text-muted-foreground">{CONTACT.email}</span>
            </span>
          </a>
        </div>

        <Button asChild className="mt-6 w-full sm:w-auto">
          <a
            href={whatsappLink("Olá! Sou cliente Service Flix e gostaria de falar com a equipe.")}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Chamar no WhatsApp
          </a>
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Quando falar com a gente</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Urgências e reparos:</strong> chame direto no WhatsApp — atendemos os planos
              Master e Premium com prioridade.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Contrato e mensalidade:</strong> dúvidas sobre cobrança, vencimento ou
              alteração de plano podem ser feitas por WhatsApp ou e-mail.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Manutenções programadas:</strong> continue abrindo pela aba{" "}
              <strong>Solicitações</strong> — a equipe agenda por lá mesmo.
            </span>
          </li>
        </ul>
        <p className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Dica: para solicitações de manutenção com fotos, use a aba Solicitações. O contato aqui é
          para falar direto com nosso time.
        </p>
      </section>
    </div>
  );
}
