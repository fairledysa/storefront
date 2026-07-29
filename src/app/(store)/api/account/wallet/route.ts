import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { storeCustomerExists } from "@/lib/auth/store-customer.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { isMoyasarConfigured } from "@/lib/wallet/moyasar-topup.server";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function currencyCode(value: unknown, fallback = "SAR") {
  return String(value ?? "").trim().toUpperCase() || fallback;
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of [
    "source",
    "phase",
    "hold_id",
    "withdrawal_request_id",
    "gift_id",
    "sender_customer_id",
    "recipient_customer_id",
  ] as const) {
    if (typeof source[key] === "string" && source[key].trim()) {
      result[key] = source[key].trim();
    }
  }
  return result;
}

function orderNumber(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export async function GET() {
  try {
    const context = await resolveStoreContext();
    const storeId = context?.store?.id;
    if (!storeId) return json({ ok: false, error: "STORE_NOT_FOUND" }, 404);

    const token = (await cookies()).get("elyaia_session")?.value;
    if (!token) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    let session: Awaited<ReturnType<typeof verifySession>> | null = null;
    try {
      session = await verifySession(token);
    } catch {
      session = null;
    }
    const customerId = session?.customer_id ? String(session.customer_id).trim() : "";
    if (!customerId) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const db: any = await getStoreDb(String(storeId));
    if (!(await storeCustomerExists(db, String(storeId), customerId))) {
      return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
    }
    const defaultCurrency = currencyCode(context.store?.default_currency);
    const walletResult = await db
      .from("customer_wallets")
      .select("id,currency,available_balance,pending_balance,lifetime_credit,lifetime_debit,status,updated_at")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .eq("currency", defaultCurrency)
      .maybeSingle();
    if (walletResult.error) throw walletResult.error;

    if (!walletResult.data?.id) {
      return json({
        ok: true,
        wallet: {
          id: null, currency: defaultCurrency, available_balance: 0,
          pending_balance: 0, lifetime_credit: 0, lifetime_debit: 0,
          status: "active", updated_at: null,
        },
        transactions: [],
      });
    }

    const wallet = walletResult.data;
    const transactionsResult = await db
      .from("customer_wallet_transactions")
      .select("id,order_id,direction,transaction_type,amount,currency,reason,customer_message,expires_at,status,metadata,created_at")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (transactionsResult.error) throw transactionsResult.error;

    const rows = Array.isArray(transactionsResult.data) ? transactionsResult.data : [];
    const orderIds = Array.from(new Set(rows.map((row: any) => String(row?.order_id ?? "").trim()).filter(Boolean)));
    const ordersResult = orderIds.length
      ? await db.from("orders").select("id,order_number,public_no")
          .eq("store_id", storeId).eq("customer_id", customerId).in("id", orderIds)
      : { data: [], error: null };
    if (ordersResult.error) throw ordersResult.error;

    const orderMap = new Map<string, { id: string; display_no: number }>();
    for (const order of Array.isArray(ordersResult.data) ? ordersResult.data : []) {
      const id = String(order?.id ?? "").trim();
      const displayNo = orderNumber(order?.order_number) ?? orderNumber(order?.public_no);
      if (id && displayNo) orderMap.set(id, { id, display_no: displayNo });
    }

    const settingsResult = await db.from("store_wallet_settings").select("wallet_enabled,topup_enabled,checkout_enabled,partial_payment_enabled,withdrawal_enabled,gifting_enabled,minimum_topup_amount,minimum_withdrawal_amount,withdrawal_processing_days").eq("store_id", storeId).maybeSingle();
    const walletSettings = settingsResult.error ? null : { ...(settingsResult.data || {}), moyasar_ready: isMoyasarConfigured() };

    const withdrawalsResult = await db
      .from("customer_wallet_withdrawal_requests")
      .select("id,hold_id,status")
      .eq("store_id", storeId)
      .eq("customer_id", customerId);
    if (withdrawalsResult.error) throw withdrawalsResult.error;

    const withdrawalByHoldId = new Map<string, string>();
    for (const request of Array.isArray(withdrawalsResult.data) ? withdrawalsResult.data : []) {
      const holdId = String(request?.hold_id ?? "").trim();
      const status = String(request?.status ?? "").trim();
      if (holdId) withdrawalByHoldId.set(holdId, status);
    }

    const giftCustomerIds = Array.from(
      new Set(
        rows
          .flatMap((row: any) => {
            const metadata = safeMetadata(row?.metadata);
            return [
              metadata.sender_customer_id,
              metadata.recipient_customer_id,
            ];
          })
          .filter(Boolean),
      ),
    );

    const giftCustomersResult = giftCustomerIds.length
      ? await db
          .from("customers")
          .select("id,full_name,email,phone_e164")
          .in("id", giftCustomerIds)
      : { data: [], error: null };

    if (giftCustomersResult.error) throw giftCustomersResult.error;

    const giftCustomerMap = new Map<string, any>();
    for (const customer of Array.isArray(giftCustomersResult.data)
      ? giftCustomersResult.data
      : []) {
      const id = String(customer?.id ?? "").trim();
      if (id) giftCustomerMap.set(id, customer);
    }

    return json({
      ok: true,
      settings: walletSettings,
      wallet: {
        id: String(wallet.id),
        currency: currencyCode(wallet.currency, defaultCurrency),
        available_balance: safeNumber(wallet.available_balance),
        pending_balance: safeNumber(wallet.pending_balance),
        lifetime_credit: safeNumber(wallet.lifetime_credit),
        lifetime_debit: safeNumber(wallet.lifetime_debit),
        status: String(wallet.status ?? "active"),
        updated_at: wallet.updated_at ?? null,
      },
      transactions: rows.map((row: any) => {
        const linkedOrder = orderMap.get(String(row?.order_id ?? "").trim()) ?? null;
        return {
          id: String(row.id), direction: String(row.direction ?? ""),
          transaction_type: String(row.transaction_type ?? ""),
          amount: safeNumber(row.amount), currency: currencyCode(row.currency, wallet.currency),
          reason: row.reason ? String(row.reason) : null,
          customer_message: row.customer_message ? String(row.customer_message) : null,
          status: (() => {
            const metadata = safeMetadata(row.metadata);
            const withdrawalStatus = metadata.hold_id
              ? withdrawalByHoldId.get(metadata.hold_id)
              : undefined;
            if (String(row.transaction_type ?? "") === "withdrawal_hold" && withdrawalStatus) {
              if (withdrawalStatus === "paid") return "posted";
              if (["rejected", "cancelled"].includes(withdrawalStatus)) return "cancelled";
              if (withdrawalStatus === "failed") return "failed";
            }
            return String(row.status ?? "");
          })(), expires_at: row.expires_at ?? null,
          created_at: row.created_at ?? null,
          order: linkedOrder,
          metadata: safeMetadata(row.metadata),
          counterparty: (() => {
            const metadata = safeMetadata(row.metadata);
            const type = String(row?.transaction_type ?? "");
            const counterpartyId =
              type === "gift_credit"
                ? metadata.sender_customer_id
                : type === "gift_debit"
                  ? metadata.recipient_customer_id
                  : undefined;
            const customer = counterpartyId
              ? giftCustomerMap.get(counterpartyId)
              : null;
            if (!customer?.id) return null;
            return {
              id: String(customer.id),
              name: String(customer.full_name ?? "").trim() || "عميل",
              email: customer.email ? String(customer.email) : null,
              phone: customer.phone_e164 ? String(customer.phone_e164) : null,
            };
          })(),
        };
      }),
    });
  } catch (error) {
    console.error("[account/wallet] Failed to load customer wallet", error);
    return json({ ok: false, error: "WALLET_LOAD_FAILED" }, 500);
  }
}
