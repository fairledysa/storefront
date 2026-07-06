// FILE: apps/storefront/src/app/api/analytics/visit/route.ts

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { riyadhDateKey } from "@/data/analytics/riyadh-date";
import {
  isAnalyticsVisitsEnabled,
  recordStoreVisit,
} from "@/data/analytics/visit-redis.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_UA = /(?:bot\b|crawler|spider|slurp|facebookexternalhit|preview|prerender|headless|lighthouse|uptime|monitoring)/i;
const SESSION_ID = /^[A-Za-z0-9_-]{20,160}$/;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function cleanHost(value: unknown) {
  return s(value)
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function requestHost(request: Request) {
  return cleanHost(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );
}

function sameOriginRequest(request: Request) {
  const origin = s(request.headers.get("origin"));
  if (!origin) return true;

  try {
    return cleanHost(new URL(origin).host) === requestHost(request);
  } catch {
    return false;
  }
}

function clientIpHash(request: Request) {
  const rawIp = s(request.headers.get("x-forwarded-for")).split(",")[0].trim()
    || s(request.headers.get("x-real-ip"))
    || "unknown";

  // لا نخزن IP؛ نستخدم Hash قصيرًا فقط لمفتاح rate limit في Redis.
  return createHash("sha256").update(rawIp).digest("hex").slice(0, 32);
}

function rateBucket(now: Date) {
  return String(Math.floor(now.getTime() / 60_000));
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  if (!isAnalyticsVisitsEnabled()) {
    return response({ ok: true, enabled: false }, 200);
  }

  if (!sameOriginRequest(request)) {
    return response({ ok: false, error: "INVALID_ORIGIN" }, 403);
  }

  const userAgent = s(request.headers.get("user-agent"));
  if (BOT_UA.test(userAgent)) {
    return response({ ok: true, enabled: true, ignored: "bot" });
  }

  const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown };
  const sessionId = s(body.sessionId);

  if (!SESSION_ID.test(sessionId)) {
    return response({ ok: false, error: "INVALID_SESSION" }, 400);
  }

  try {
    const ctx = await resolveStoreContext();
    const storeId = s(ctx.store?.id);

    if (!storeId) {
      return response({ ok: true, enabled: true, ignored: "store_not_found" });
    }

    const now = new Date();
    const result = await recordStoreVisit({
      storeId,
      sessionId,
      ipHash: clientIpHash(request),
      dateKey: riyadhDateKey(now),
      rateBucket: rateBucket(now),
    });

    if (!result.ok && result.reason === "rate_limited") {
      return response({ ok: true, enabled: true, ignored: "rate_limited" }, 202);
    }

    if (!result.ok) {
      return response({ ok: false, enabled: true, error: "ANALYTICS_UNAVAILABLE" }, 503);
    }

    return response({
      ok: true,
      enabled: true,
      counted: result.counted,
    });
  } catch (error) {
    console.error("STORE_VISIT_TRACKING_FAILED", error);
    return response({ ok: false, enabled: true, error: "ANALYTICS_UNAVAILABLE" }, 503);
  }
}
