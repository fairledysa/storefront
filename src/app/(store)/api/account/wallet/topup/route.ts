import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { storeCustomerExists } from "@/lib/auth/store-customer.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { isMoyasarConfigured } from "@/lib/wallet/moyasar-topup.server";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: HEADERS }); }
function text(v: unknown) { return String(v ?? "").trim(); }
function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

async function context() {
  const store = await resolveStoreContext();
  const storeId = text(store?.store?.id);
  if (!storeId) return { error: json({ ok: false, error: "STORE_NOT_FOUND" }, 404) } as const;
  const jar = await cookies();
  const token = jar.get("elyaia_session")?.value || jar.get("elyaiaSession")?.value || "";
  if (!token) return { error: json({ ok: false, error: "UNAUTHENTICATED" }, 401) } as const;
  let session: any = null;
  try { session = await Promise.resolve(verifySession(token) as any); } catch {}
  const db: any = await getStoreDb(storeId);
  let customerId = text(session?.customer_id);
  if (!customerId && (session?.auth_user_id || session?.user_id)) {
    const row = await db.from("customers").select("id").eq("auth_user_id", text(session.auth_user_id || session.user_id)).maybeSingle();
    customerId = text(row.data?.id);
  }
  if (!customerId) return { error: json({ ok: false, error: "UNAUTHENTICATED" }, 401) } as const;
  if (!(await storeCustomerExists(db, storeId, customerId))) {
    return { error: json({ ok: false, error: "UNAUTHENTICATED" }, 401) } as const;
  }
  const host = text(store?.host).toLowerCase();
  const storeOrigin = host
    ? `${process.env.NODE_ENV === "production" ? "https" : "http"}://${host}`
    : "";
  return { storeId, customerId, db, currency: text(store?.store?.default_currency || "SAR").toUpperCase(), storeName: text(store?.store?.name || "المتجر"), storeOrigin } as const;
}

function idempotencyKey(value: unknown, prefix: string) {
  const key = text(value);
  if (/^[A-Za-z0-9:_-]{16,180}$/.test(key)) return key;
  return `${prefix}:${crypto.randomUUID()}`;
}

export async function POST(req: NextRequest) {
  try {
    const c = await context(); if ("error" in c) return c.error;
    if (!isMoyasarConfigured()) return json({ ok: false, error: "MOYASAR_NOT_CONFIGURED", message_ar: "إضافة الرصيد غير متاحة حاليًا." }, 503);
    const body = await req.json().catch(() => ({}));
    const amount = Math.round(num(body.amount) * 100) / 100;
    if (amount <= 0) return json({ ok: false, error: "INVALID_TOPUP_AMOUNT" }, 400);

    const settings = await c.db.from("store_wallet_settings").select("wallet_enabled,topup_enabled,minimum_topup_amount,maximum_topup_amount").eq("store_id", c.storeId).maybeSingle();
    if (settings.error) throw settings.error;
    if (!settings.data?.wallet_enabled || !settings.data?.topup_enabled) return json({ ok: false, error: "WALLET_TOPUP_DISABLED" }, 403);
    const min = num(settings.data.minimum_topup_amount || 10);
    const max = settings.data.maximum_topup_amount == null ? null : num(settings.data.maximum_topup_amount);
    if (amount < min) return json({ ok: false, error: "TOPUP_AMOUNT_BELOW_MINIMUM", minimum: min }, 400);
    if (max != null && amount > max) return json({ ok: false, error: "TOPUP_AMOUNT_ABOVE_MAXIMUM", maximum: max }, 400);

    const operationKey = idempotencyKey(
      body.idempotency_key,
      `topup:${c.storeId}:${c.customerId}`,
    );
    const rpc = await c.db.rpc("wallet_create_topup_session", {
      p_store_id: c.storeId,
      p_customer_id: c.customerId,
      p_amount: amount,
      p_currency: c.currency,
      p_payment_method: "card",
      p_payment_provider: "moyasar",
      p_idempotency_key: operationKey,
      p_expires_at: null,
      p_metadata: { source: "storefront_customer_wallet", store_origin: c.storeOrigin },
    });
    if (rpc.error) throw rpc.error;
    const session = rpc.data?.session || rpc.data;
    if (!session?.id) throw new Error("TOPUP_SESSION_CREATE_FAILED");

    if (!c.storeOrigin) throw new Error("STORE_ORIGIN_UNAVAILABLE");
    const callbackUrl = new URL("/api/account/wallet/topup/callback", c.storeOrigin);
    callbackUrl.searchParams.set("store", c.storeId);
    callbackUrl.searchParams.set("session", String(session.id));

    return json({
      ok: true,
      session: {
        id: String(session.id), amount, currency: text(session.currency || c.currency), expires_at: session.expires_at || null,
      },
      moyasar: {
        publishable_key: text(process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY),
        amount_minor: Math.round(amount * 100),
        currency: text(session.currency || c.currency),
        description: `إضافة رصيد إلى محفظة ${c.storeName}`,
        callback_url: callbackUrl.toString(),
        metadata: { store_id: c.storeId, customer_id: c.customerId, topup_session_id: String(session.id), purpose: "wallet_topup" },
      },
    });
  } catch (error: any) {
    console.error("[wallet/topup]", error);
    return json({ ok: false, error: "TOPUP_CREATE_FAILED" }, 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const c = await context(); if ("error" in c) return c.error;
    const body = await req.json().catch(() => ({}));
    const sessionId = text(body.session_id);
    const paymentId = text(body.payment_id);
    if (!sessionId || !paymentId) return json({ ok: false, error: "INVALID_REQUEST" }, 400);
    const result = await c.db.from("customer_wallet_topup_sessions").update({
      provider_payment_id: paymentId,
      status: "processing",
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId).eq("store_id", c.storeId).eq("customer_id", c.customerId).in("status", ["pending", "processing"]).select("id").maybeSingle();
    if (result.error) throw result.error;
    return json({ ok: true });
  } catch (error: any) {
    console.error("[wallet/topup/attach]", error);
    return json({ ok: false, error: "TOPUP_PAYMENT_ATTACH_FAILED" }, 400);
  }
}
