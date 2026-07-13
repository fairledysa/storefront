import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

function text(value: unknown) { return String(value ?? "").trim(); }
function code(value: unknown) { const v = text(value).toUpperCase(); return /^[A-Z]{3}$/.test(v) ? v : ""; }
function number(value: unknown, fallback = 1) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; }
function decimals(value: unknown, fallback = 2) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(4, Math.trunc(n))) : fallback; }
function metadata(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rate(row: any) { const meta = metadata(row?.metadata); return number(meta.rate ?? meta.exchange_rate ?? meta.exchangeRate ?? meta.conversion_rate ?? meta.conversionRate, 1); }
function cookieName(storeId: string) { return `mk_currency_${storeId.replace(/[^a-zA-Z0-9_-]/g, "_")}`; }

export async function GET() {
  try {
    const context = await resolveStoreContext();
    const storeId = text(context?.store?.id);
    if (!storeId) return NextResponse.json({ ok: false, error: "STORE_NOT_FOUND" }, { status: 404 });

    const db: any = await getStoreDb(storeId);
    const { data, error } = await db
      .from("store_currencies")
      .select("currency_code,name_ar,name_en,symbol,decimal_digits,is_enabled,is_default,sort_order,metadata")
      .eq("store_id", storeId)
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const fallbackCode = code(context?.store?.default_currency) || "SAR";
    const items = (Array.isArray(data) ? data : []).map((row: any) => ({
      code: code(row?.currency_code) || fallbackCode,
      symbol: text(row?.symbol) || code(row?.currency_code) || fallbackCode,
      name: text(row?.name_ar || row?.name_en) || code(row?.currency_code) || fallbackCode,
      decimals: decimals(row?.decimal_digits, 2),
      rate: rate(row),
      is_default: Boolean(row?.is_default),
    }));

    if (!items.length) items.push({ code: fallbackCode, symbol: fallbackCode, name: fallbackCode, decimals: 2, rate: 1, is_default: true });
    const base = items.find((item: any) => item.is_default) || items.find((item: any) => item.code === fallbackCode) || items[0];
    const selected = code((await cookies()).get(cookieName(storeId))?.value);
    const active = items.find((item: any) => item.code === selected) || base;

    return NextResponse.json({ ok: true, base, active, items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[account-currency-context] failed", error);
    return NextResponse.json({ ok: false, error: "CURRENCY_CONTEXT_FAILED" }, { status: 500 });
  }
}
