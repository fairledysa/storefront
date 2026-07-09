// FILE: apps/storefront/src/app/(store)/api/smart-search/keywords/route.ts

import { NextRequest, NextResponse } from "next/server";

import { controlDb } from "@/data/db/control-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import {
  getKeywordList,
  getKeywordScopeLists,
  getSmartSearchDefinitionFromThemeOptions,
} from "@/themes/malak/smart-search/config";
import { parseSmartSearchPath, SMART_SEARCH_QUERY } from "@/themes/malak/smart-search/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function asPath(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const cleanKey = s(key);
    const cleanValue = s(item);
    if (cleanKey && cleanValue) out[cleanKey] = cleanValue;
  }
  return out;
}

function hasExactScope(rowPath: Record<string, string>, requestedPath: Record<string, string>) {
  return Object.entries(requestedPath).every(([key, value]) => rowPath[key] === value);
}

export async function GET(request: NextRequest) {
  const ctx = await resolveStoreContext();
  const storeId = s(ctx.store?.id);
  const versionId = s(ctx.theme?.version_id);
  const instanceId = s(request.nextUrl.searchParams.get(SMART_SEARCH_QUERY.instance));
  const keywordListId = s(request.nextUrl.searchParams.get(SMART_SEARCH_QUERY.keywordList));
  const requestedPath = parseSmartSearchPath(
    request.nextUrl.searchParams.get(SMART_SEARCH_QUERY.path),
  );

  if (!storeId || !versionId) {
    return NextResponse.json(
      { ok: false, error: "STORE_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const definition = getSmartSearchDefinitionFromThemeOptions(
    ctx.theme?.options,
    instanceId,
  );
  const keywordList = getKeywordList(definition);
  const scopeLists = getKeywordScopeLists(definition);

  if (
    !definition ||
    !keywordList ||
    definition.instanceId !== instanceId ||
    keywordList.id !== keywordListId
  ) {
    return NextResponse.json(
      { ok: false, error: "SMART_SEARCH_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const categoryPath: Record<string, string> = {};

  for (const list of scopeLists) {
    const categoryId = s(requestedPath[list.id]);
    if (!categoryId) {
      return NextResponse.json(
        { ok: true, items: [] },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }
    categoryPath[list.id] = categoryId;
  }

  const db = controlDb() as any;
  const result = await db
    .from("store_smart_search_keywords")
    .select("id,keyword,is_active,sort_order,category_path")
    .eq("store_id", storeId)
    .eq("theme_version_id", versionId)
    .eq("component_instance_id", definition.instanceId)
    .eq("keyword_list_id", keywordList.id)
    .eq("is_active", true)
    .contains("category_path", categoryPath)
    .order("sort_order", { ascending: true })
    .order("keyword", { ascending: true })
    .limit(500);

  if (result.error) {
    console.error("SMART_SEARCH_KEYWORDS_LOAD_FAILED", {
      storeId,
      versionId,
      instanceId: definition.instanceId,
      keywordListId: keywordList.id,
      message: result.error.message,
    });

    return NextResponse.json(
      { ok: false, error: "KEYWORDS_LOAD_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const seen = new Set<string>();
  const items = (Array.isArray(result.data) ? result.data : [])
    .map((row: any) => {
      const id = s(row?.id);
      const label = s(row?.keyword);
      const rowPath = asPath(row?.category_path);
      if (!id || !label || !hasExactScope(rowPath, categoryPath) || seen.has(id)) {
        return null;
      }
      seen.add(id);
      return {
        id,
        label,
        sortOrder: Number(row?.sort_order ?? 0) || 0,
      };
    })
    .filter(Boolean);

  return NextResponse.json(
    { ok: true, items },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
