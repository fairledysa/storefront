// FILE: apps/storefront/src/app/api/analytics/flush/route.ts

import { NextResponse } from "next/server";

import {
  previousRiyadhDateKey,
  riyadhDateKey,
} from "@/data/analytics/riyadh-date";
import {
  getActiveStoreIds,
  getDailyVisitCounts,
  isAnalyticsVisitsEnabled,
} from "@/data/analytics/visit-redis.server";
import { controlDb } from "@/data/db/control-db.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function authorized(request: Request) {
  const secret = s(process.env.CRON_SECRET);

  // محليًا فقط: نسمح بالتشغيل اليدوي لتجربة التكامل بدون وضع secret في جهاز المطور.
  if (process.env.NODE_ENV !== "production" && !secret) return true;
  if (!secret) return false;

  const bearer = s(request.headers.get("authorization"));
  return safeEqual(bearer, `Bearer ${secret}`);
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

async function flushDay(dateKey: string) {
  const storeIds = await getActiveStoreIds(dateKey);
  if (!storeIds.length) {
    return { dateKey, activeStores: 0, upserted: 0 };
  }

  const counts = await getDailyVisitCounts({ dateKey, storeIds });
  const rows = storeIds.map((storeId) => ({
    store_id: storeId,
    business_date: dateKey,
    visits: Math.max(0, Number(counts.get(storeId) ?? 0)),
    source: "redis_session_counter",
    updated_at: new Date().toISOString(),
  }));

  const db = controlDb();
  const { error } = await db
    .from("store_analytics_daily")
    .upsert(rows, { onConflict: "store_id,business_date" });

  if (error) throw error;

  return {
    dateKey,
    activeStores: storeIds.length,
    upserted: rows.length,
  };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  if (!isAnalyticsVisitsEnabled()) {
    return json({ ok: true, skipped: "ANALYTICS_VISITS_DISABLED" });
  }

  try {
    const now = new Date();
    const dateKeys = Array.from(
      new Set([riyadhDateKey(now), previousRiyadhDateKey(now)]),
    );

    const results = [] as Array<{
      dateKey: string;
      activeStores: number;
      upserted: number;
    }>;

    for (const dateKey of dateKeys) {
      results.push(await flushDay(dateKey));
    }

    return json({ ok: true, results });
  } catch (error: any) {
    console.error("ANALYTICS_FLUSH_FAILED", error);
    return json(
      {
        ok: false,
        error: "ANALYTICS_FLUSH_FAILED",
        message: s(error?.message) || "تعذر تحديث ملخص الزيارات.",
      },
      500,
    );
  }
}
