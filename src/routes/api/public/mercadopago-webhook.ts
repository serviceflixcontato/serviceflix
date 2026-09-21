import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type MpNotification = {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
  resource?: string;
};

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Valida o header x-signature do Mercado Pago quando a chave secreta está configurada. */
function verifySignature(
  secret: string,
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string,
) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim() ?? "", rest.join("=").trim()];
    }),
  ) as Record<string, string>;

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqual(v1, expected);
}

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: MpNotification;
        try {
          payload = JSON.parse(body || "{}") as MpNotification;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const {
          getAccessToken,
          getWebhookSecret,
          getPayment,
          getPreapproval,
        } = await import("@/lib/mercadopago.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settings } = await supabaseAdmin
          .from("payment_settings")
          .select("mode")
          .eq("provider", "mercado_pago")
          .maybeSingle();
        const mode = (settings?.mode ?? "sandbox") as "sandbox" | "live";

        const token = getAccessToken(mode);
        if (!token) return new Response("Provider not configured", { status: 503 });

        const dataId = String(payload.data?.id ?? "");
        if (!dataId) return new Response("ok");

        const secret = getWebhookSecret(mode);
        if (secret) {
          const valid = verifySignature(
            secret,
            request.headers.get("x-signature"),
            request.headers.get("x-request-id"),
            dataId,
          );
          if (!valid) return new Response("Invalid signature", { status: 401 });
        }

        const topic = payload.type ?? payload.topic ?? "";

        try {
          if (topic === "payment") {
            // A API do Mercado Pago é a fonte da verdade — nunca confiamos no corpo recebido.
            const mpPayment = await getPayment(token, dataId);
            const reference = mpPayment.external_reference;
            if (reference) {
              const approved = mpPayment.status === "approved";
              await supabaseAdmin
                .from("payments")
                .update({
                  provider: "mercado_pago",
                  provider_mode: mode,
                  provider_payment_id: String(mpPayment.id),
                  status: approved
                    ? "pago"
                    : mpPayment.status === "pending" || mpPayment.status === "in_process"
                      ? "processando"
                      : "pendente",
                  method: mpPayment.payment_method_id ?? null,
                  paid_at: approved ? (mpPayment.date_approved ?? new Date().toISOString()) : null,
                })
                .eq("id", reference);

              // Pagamento online aprovado: o contrato entra na fila de análise
              // da equipe (fica piscando em amarelo no painel administrativo).
              if (approved) {
                const { data: paidRow } = await supabaseAdmin
                  .from("payments")
                  .select("subscription_id")
                  .eq("id", reference)
                  .maybeSingle();
                if (paidRow?.subscription_id) {
                  await supabaseAdmin
                    .from("subscriptions")
                    .update({ approval_status: "em_analise" })
                    .eq("id", paidRow.subscription_id)
                    .neq("approval_status", "aprovado");
                }
              }
            }

          } else if (topic === "subscription_preapproval" || topic === "preapproval") {
            const preapproval = await getPreapproval(token, dataId);
            if (preapproval.external_reference) {
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  provider: "mercado_pago",
                  provider_mode: mode,
                  provider_subscription_id: preapproval.id,
                  status: preapproval.status === "authorized" ? "ativa" : "pendente",
                })
                .eq("id", preapproval.external_reference);
            }
          }
        } catch (error) {
          console.error("[mercadopago-webhook] falha ao processar notificação", error);
          return new Response("Processing error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
