import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisDeletePattern } from "@/data/cache/redis-cache.server";
import { clearStoreThemeMemoryCache } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const expectedSecret = text(process.env.THEME_CACHE_CLEAR_SECRET);
  const receivedSecret = text(request.headers.get("x-theme-cache-secret"));

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const storeId = text(body?.storeId);

  if (!storeId) {
    return NextResponse.json({ ok: false, error: "STORE_ID_REQUIRED" }, { status: 400 });
  }

  clearStoreThemeMemoryCache(storeId);

  revalidateTag(`store-theme:${storeId}`, { expire: 0 });
  revalidateTag("store-context", { expire: 0 });
  revalidatePath("/", "layout");

  const prefix = cacheKey("resolve-store");
  const patterns = [
    `${prefix}:active-theme-version:${storeId}`,
    `${prefix}:active-store-theme:${storeId}`,
    `${prefix}:theme-main-info:${storeId}:*`,
    `${prefix}:theme-options:${storeId}:*`,
    `${prefix}:store-context:*`,
  ];

  let redisDeleted = 0;
  let redisEnabled = false;

  for (const pattern of patterns) {
    const result = await redisDeletePattern(pattern);
    redisDeleted += result.deleted;
    redisEnabled ||= result.enabled;
  }

  return NextResponse.json({
    ok: true,
    storeId,
    nextCacheRevalidated: true,
    redis: { enabled: redisEnabled, deleted: redisDeleted },
  });
}
