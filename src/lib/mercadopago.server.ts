/**
 * Helpers server-only para integração com o Mercado Pago.
 * Suporta dois ambientes: sandbox (teste) e live (produção).
 */

export type MpMode = "sandbox" | "live";

const MP_API = "https://api.mercadopago.com";

export function getAccessToken(mode: MpMode): string | null {
  const token =
    mode === "live"
      ? process.env["MERCADOPAGO_ACCESS_TOKEN_LIVE"]
      : process.env["MERCADOPAGO_ACCESS_TOKEN_TEST"];
  return token && token.trim().length > 0 ? token.trim() : null;
}

export function getWebhookSecret(mode: MpMode): string | null {
  const secret =
    mode === "live"
      ? process.env["MERCADOPAGO_WEBHOOK_SECRET_LIVE"]
      : process.env["MERCADOPAGO_WEBHOOK_SECRET_TEST"];
  return secret && secret.trim().length > 0 ? secret.trim() : null;
}

export function tokenStatus() {
  return {
    sandboxConfigured: getAccessToken("sandbox") !== null,
    liveConfigured: getAccessToken("live") !== null,
  };
}

async function mpFetch<T>(
  path: string,
  token: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("X-Idempotency-Key", idempotencyKey);

  const response = await fetch(`${MP_API}${path}`, { ...rest, headers });
  const text = await response.text();

  if (!response.ok) {
    console.error("[mercadopago] erro", path, response.status, text.slice(0, 500));
    throw new Error(`Mercado Pago respondeu ${response.status}`);
  }

  return (text ? JSON.parse(text) : {}) as T;
}

export type PreferenceInput = {
  title: string;
  amountCents: number;
  externalReference: string;
  payerEmail?: string | null;
  origin: string;
  notificationUrl: string;
};

export type PreferenceResult = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

/** Checkout Pro avulso: Pix, boleto ou cartão. */
export async function createPreference(
  mode: MpMode,
  token: string,
  input: PreferenceInput,
): Promise<{ id: string; checkoutUrl: string }> {
  const data = await mpFetch<PreferenceResult>("/checkout/preferences", token, {
    method: "POST",
    idempotencyKey: `pref-${input.externalReference}-${Date.now()}`,
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number((input.amountCents / 100).toFixed(2)),
        },
      ],
      ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      statement_descriptor: "SERVICEFLIX",
      back_urls: {
        success: `${input.origin}/painel/pagamentos?status=sucesso`,
        pending: `${input.origin}/painel/pagamentos?status=pendente`,
        failure: `${input.origin}/painel/pagamentos?status=falha`,
      },
      auto_return: "approved",
    }),
  });

  const checkoutUrl =
    (mode === "sandbox" ? data.sandbox_init_point ?? data.init_point : data.init_point) ?? null;

  if (!checkoutUrl) throw new Error("Mercado Pago não retornou o link de checkout");
  return { id: data.id, checkoutUrl };
}

export type PreapprovalInput = {
  reason: string;
  amountCents: number;
  externalReference: string;
  payerEmail: string;
  origin: string;
};

/** Assinatura recorrente mensal (Preapproval). */
export async function createPreapproval(
  _mode: MpMode,
  token: string,
  input: PreapprovalInput,
): Promise<{ id: string; checkoutUrl: string }> {
  const data = await mpFetch<{ id: string; init_point?: string; sandbox_init_point?: string }>(
    "/preapproval",
    token,
    {
      method: "POST",
      idempotencyKey: `preap-${input.externalReference}-${Date.now()}`,
      body: JSON.stringify({
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: `${input.origin}/painel/pagamentos?status=assinatura`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number((input.amountCents / 100).toFixed(2)),
          currency_id: "BRL",
        },
      }),
    },
  );

  const checkoutUrl = data.init_point ?? data.sandbox_init_point ?? null;
  if (!checkoutUrl) throw new Error("Mercado Pago não retornou o link da assinatura");
  return { id: data.id, checkoutUrl };
}

export type MpPayment = {
  id: number;
  status: string;
  external_reference?: string | null;
  payment_method_id?: string | null;
  date_approved?: string | null;
};

export async function getPayment(token: string, paymentId: string) {
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`, token, { method: "GET" });
}

export async function getPreapproval(token: string, preapprovalId: string) {
  return mpFetch<{ id: string; status: string; external_reference?: string | null }>(
    `/preapproval/${preapprovalId}`,
    token,
    { method: "GET" },
  );
}
