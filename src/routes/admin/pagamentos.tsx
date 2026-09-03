import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Copy, FlaskConical, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MODE_LABELS, usePaymentConfig, useSetPaymentMode } from "@/hooks/use-payment-config";

export const Route = createFileRoute("/admin/pagamentos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuração de pagamento — Service Flix" },
      {
        name: "description",
        content: "Alternância entre ambiente de teste e produção do Mercado Pago.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Configuração de pagamento — Service Flix" },
      { property: "og:description", content: "Área restrita da equipe Service Flix." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <ConfiguracoesPagamento />
    </AdminShell>
  ),
});

function ConfiguracoesPagamento() {
  const { data: config, isLoading } = usePaymentConfig();
  const setMode = useSetPaymentMode();
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/public/mercadopago-webhook`);
  }, []);

  const isLive = config?.mode === "live";

  function handleToggle(next: boolean) {
    const mode = next ? "live" : "sandbox";
    setMode.mutate(mode, {
      onSuccess: () =>
        toast.success(
          mode === "live"
            ? "Modo produção ativado. Os pagamentos agora são reais."
            : "Modo teste ativado. Nenhuma cobrança real será feita.",
        ),
      onError: () => toast.error("Não foi possível alterar o modo. Verifique suas permissões."),
    });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando configurações...</p>;
  }

  if (!config?.isAdmin) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Configuração de pagamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é restrita à equipe Service Flix.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Mercado Pago</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Alterne entre o ambiente de teste e o de produção. O site usa automaticamente o Access
              Token correspondente ao modo selecionado.
            </p>
          </div>
          <Badge variant={isLive ? "default" : "secondary"} className="shrink-0">
            {MODE_LABELS[config.mode]}
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            {isLive ? (
              <Rocket className="h-5 w-5 text-primary" />
            ) : (
              <FlaskConical className="h-5 w-5 text-primary" />
            )}
            <div>
              <Label htmlFor="mp-mode" className="text-sm font-semibold">
                Ativar modo produção
              </Label>
              <p className="text-xs text-muted-foreground">
                Desligado = ambiente de teste (nenhuma cobrança real).
              </p>
            </div>
          </div>
          <Switch
            id="mp-mode"
            checked={isLive}
            disabled={setMode.isPending}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TokenStatus
            label="Access Token de teste"
            secret="MERCADOPAGO_ACCESS_TOKEN_TEST"
            configured={config.sandboxConfigured}
          />
          <TokenStatus
            label="Access Token de produção"
            secret="MERCADOPAGO_ACCESS_TOKEN_LIVE"
            configured={config.liveConfigured}
          />
        </div>

        {!config.ready ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            O Access Token do modo <strong>{MODE_LABELS[config.mode]}</strong> ainda não foi
            cadastrado. Peça ao suporte Lovable para salvar a credencial e os botões de pagamento
            passam a funcionar na hora.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">URL de notificação (webhook)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cole esta URL no painel do Mercado Pago em <em>Suas integrações → Webhooks</em>, marcando
          os eventos <strong>Pagamentos</strong> e <strong>Assinaturas</strong>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-muted px-3 py-2 text-xs">
            {webhookUrl || "—"}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(webhookUrl);
              toast.success("URL copiada.");
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Como configurar depois</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            1. Acesse o painel de desenvolvedores do Mercado Pago e crie uma aplicação de checkout.
          </li>
          <li>
            2. Copie as <strong>credenciais de teste</strong> (Access Token começando com
            <code className="mx-1 rounded bg-muted px-1">TEST-</code>) e depois as de produção
            (<code className="mx-1 rounded bg-muted px-1">APP_USR-</code>).
          </li>
          <li>3. Peça aqui no chat para salvar as credenciais — elas ficam guardadas com segurança.</li>
          <li>4. Cadastre a URL de webhook acima e teste uma fatura em modo teste.</li>
          <li>5. Quando estiver tudo certo, ligue o modo produção nesta página.</li>
        </ol>
      </section>
    </div>
  );
}

function TokenStatus({
  label,
  secret,
  configured,
}: {
  label: string;
  secret: string;
  configured: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {configured ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        )}
        {label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {configured ? "Configurado" : "Ainda não configurado"} · {secret}
      </p>
    </div>
  );
}
