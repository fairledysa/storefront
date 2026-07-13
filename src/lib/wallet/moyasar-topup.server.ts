import { getStoreDb } from "@/data/db/store-db.server";

const API_BASE = String(process.env.MOYASAR_API_BASE_URL || "https://api.moyasar.com/v1").replace(/\/$/, "");

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function authHeader() {
  const secret = text(process.env.MOYASAR_SECRET_KEY);
  if (!secret) throw new Error("MOYASAR_SECRET_KEY_MISSING");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export function isMoyasarConfigured() {
  return String(process.env.MOYASAR_ENABLED || "false").toLowerCase() === "true"
    && Boolean(text(process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY))
    && Boolean(text(process.env.MOYASAR_SECRET_KEY));
}

export async function fetchMoyasarPayment(paymentId: string) {
  const id = text(paymentId);
  if (!id) throw new Error("MOYASAR_PAYMENT_ID_REQUIRED");
  const response = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: authHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.id) {
    throw new Error(text(payload?.message || payload?.type || "MOYASAR_PAYMENT_FETCH_FAILED"));
  }
  return payload as Record<string, any>;
}

export async function verifyAndCompleteMoyasarTopup(args: {
  storeId: string;
  sessionId: string;
  paymentId: string;
  source: "callback" | "webhook";
}) {
  if (!isMoyasarConfigured()) throw new Error("MOYASAR_NOT_CONFIGURED");
  const storeId = text(args.storeId);
  const sessionId = text(args.sessionId);
  const paymentId = text(args.paymentId);
  if (!storeId || !sessionId || !paymentId) throw new Error("MOYASAR_TOPUP_IDENTIFIERS_REQUIRED");

  const db: any = await getStoreDb(storeId);
  const sessionResult = await db
    .from("customer_wallet_topup_sessions")
    .select("id,store_id,customer_id,wallet_id,amount,currency,status,payment_provider,provider_payment_id,idempotency_key,metadata")
    .eq("id", sessionId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (sessionResult.error) throw sessionResult.error;
  const session = sessionResult.data;
  if (!session?.id) throw new Error("TOPUP_SESSION_NOT_FOUND");
  if (String(session.payment_provider || "") !== "moyasar") throw new Error("TOPUP_PROVIDER_MISMATCH");

  if (session.status === "paid" && session.provider_payment_id === paymentId) {
    return { ok: true, idempotent: true, session };
  }

  const payment = await fetchMoyasarPayment(paymentId);
  const metadata = payment?.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
  const expectedMinor = Math.round(number(session.amount) * 100);
  const paymentAmount = number(payment.amount);
  const paymentCurrency = text(payment.currency).toUpperCase();
  const sessionCurrency = text(session.currency).toUpperCase();

  if (text(metadata.store_id) && text(metadata.store_id) !== storeId) throw new Error("MOYASAR_STORE_MISMATCH");
  if (text(metadata.topup_session_id) && text(metadata.topup_session_id) !== sessionId) throw new Error("MOYASAR_SESSION_MISMATCH");
  if (text(metadata.customer_id) && text(metadata.customer_id) !== text(session.customer_id)) throw new Error("MOYASAR_CUSTOMER_MISMATCH");
  if (paymentAmount !== expectedMinor) throw new Error("MOYASAR_AMOUNT_MISMATCH");
  if (paymentCurrency !== sessionCurrency) throw new Error("MOYASAR_CURRENCY_MISMATCH");

  if (String(payment.status) !== "paid") {
    const failedStatus = ["failed", "expired", "cancelled"].includes(String(payment.status))
      ? String(payment.status)
      : "failed";
    await db
      .from("customer_wallet_topup_sessions")
      .update({
        status: failedStatus,
        provider_payment_id: paymentId,
        provider_reference: text(payment?.source?.reference_number || payment?.reference_number) || null,
        failure_reason: text(payment?.source?.message || payment?.message || payment.status) || null,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { ...(session.metadata || {}), verification_source: args.source, last_payment_status: payment.status },
      })
      .eq("id", sessionId)
      .eq("store_id", storeId);
    return { ok: false, status: String(payment.status), session, payment };
  }

  const completeResult = await db.rpc("wallet_complete_topup", {
    p_topup_session_id: sessionId,
    p_provider_payment_id: paymentId,
    p_provider_reference: text(payment?.source?.reference_number || payment?.reference_number) || paymentId,
    p_idempotency_key: `moyasar-topup:${paymentId}`,
    p_metadata: {
      source: args.source,
      provider: "moyasar",
      moyasar_payment_id: paymentId,
      live: Boolean(payment.live),
    },
  });
  if (completeResult.error) throw completeResult.error;
  return { ok: true, idempotent: Boolean(completeResult.data?.idempotent), result: completeResult.data, payment };
}
