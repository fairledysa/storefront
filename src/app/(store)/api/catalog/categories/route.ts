// FILE: apps/storefront/src/app/(store)/api/catalog/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import {
  getCategoriesForGrid,
  getCategoriesTree,
} from "@/data/catalog/categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await resolveStoreContext();
  if (!ctx.store) {
    return NextResponse.json(
      { ok: false, error: "STORE_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sp = req.nextUrl.searchParams;

  const mode = (sp.get("mode") || "tree") as "tree" | "grid";
  const limit = Number(sp.get("limit") || "24");
  const source = (sp.get("source") || "top_level") as
    | "top_level"
    | "by_parent_slug";
  const parent_slug = sp.get("parent_slug") || undefined;
  const max_depth = Number(sp.get("max_depth") || "6");

  if (mode === "grid") {
    const items = await getCategoriesForGrid({
      store_id: ctx.store.id,
      limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 24,
      source,
      parent_slug,
    });

    return NextResponse.json(
      { ok: true, mode: "grid", store_id: ctx.store.id, items },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tree = await getCategoriesTree({
    store_id: ctx.store.id,
    max_depth: Number.isFinite(max_depth)
      ? Math.max(1, Math.min(max_depth, 6))
      : 6,
  });

  return NextResponse.json(
    { ok: true, mode: "tree", store_id: ctx.store.id, tree },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

// (اختياري) لو أحد نادى OPTIONS بالغلط
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
