// FILE: apps/storefront/src/app/(store)/api/search/reindex/route.ts
import { NextResponse } from "next/server";

import { syncStoreSearchIndex } from "@/data/catalog/product-search-index";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

function canRunReindex(req: Request) {
  if (process.env.NODE_ENV !== "production") return true;

  const url = new URL(req.url);
  const secret = process.env.SEARCH_REINDEX_SECRET;

  if (!secret) return false;

  return url.searchParams.get("secret") === secret;
}

function readLimit(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 500);

  if (!Number.isFinite(limit)) return 500;

  return Math.min(Math.max(limit, 1), 5000);
}

export async function GET(req: Request) {
  if (!canRunReindex(req)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Forbidden",
      },
      { status: 403 },
    );
  }

  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return NextResponse.json(
      {
        ok: false,
        message: "Store not found",
      },
      { status: 404 },
    );
  }

  const result = await syncStoreSearchIndex({
    storeId: ctx.store.id,
    limit: readLimit(req),
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}