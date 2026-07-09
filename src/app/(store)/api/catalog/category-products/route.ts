// FILE: apps/storefront/src/app/(store)/api/catalog/category-products/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { getProductsForGridPage } from "@/data/catalog/products";
import { loadCategoryProductsPage } from "@/data/pages/category.loader";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function clampOffset(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(5000, Math.floor(n)));
}

export async function GET(request: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return NextResponse.json(
      { ok: false, error: "STORE_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const categoryId = s(request.nextUrl.searchParams.get("scope_category_id"));

  if (categoryId === "__all__") {
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    searchParams.delete("scope_category_id");
    searchParams.delete("offset");
    searchParams.delete("limit");

    try {
      const page = await getProductsForGridPage({
        store_id: ctx.store.id,
        offset: clampOffset(request.nextUrl.searchParams.get("offset")),
        limit: PAGE_SIZE,
        sort: searchParams.get("sort"),
      });

      return NextResponse.json(
        {
          ok: true,
          items: page.items,
          pageInfo: page.pageInfo,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      console.error("[category-products-api] all-products failed", {
        store_id: ctx.store.id,
        message: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
        { ok: false, error: "ALL_PRODUCTS_LOAD_FAILED" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  if (!categoryId) {
    return NextResponse.json(
      { ok: false, error: "CATEGORY_REQUIRED" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const storeDb = await getStoreDb(ctx.store.id);
  const categoryResult = await storeDb
    .from("categories")
    .select("id")
    .eq("store_id", ctx.store.id)
    .eq("id", categoryId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (categoryResult.error || !categoryResult.data?.id) {
    return NextResponse.json(
      { ok: false, error: "CATEGORY_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.delete("scope_category_id");
  searchParams.delete("offset");
  searchParams.delete("limit");

  try {
    const page = await loadCategoryProductsPage({
      store_id: ctx.store.id,
      category_id: categoryId,
      searchParams,
      offset: clampOffset(request.nextUrl.searchParams.get("offset")),
      limit: PAGE_SIZE,
      smartSearch: {
        themeOptions: ctx.theme?.options ?? null,
        themeVersionId: ctx.theme?.version_id ?? null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        items: page.items,
        pageInfo: page.pageInfo,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[category-products-api] failed", {
      store_id: ctx.store.id,
      category_id: categoryId,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { ok: false, error: "CATEGORY_PRODUCTS_LOAD_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
