import "server-only";

import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

type ThemePageKey = "homepage" | "product" | "category" | "page";

type LoadThemePageComponentsArgs = {
  storeId: string;
  themeVersionId?: string | null;
  pageKey: ThemePageKey;
  entityId?: string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text(value),
  );
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function pageAliases(pageKey: ThemePageKey) {
  if (pageKey === "homepage") return ["homepage", "home"];
  if (pageKey === "product") return ["product", "products"];
  if (pageKey === "category") return ["category", "categories"];
  return ["page", "pages"];
}

async function resolveThemeVersionId(args: {
  storeId: string;
  themeVersionId?: string | null;
}) {
  const supplied = text(args.themeVersionId);
  if (isUuid(supplied)) return supplied;

  const db = (await getStoreDb(args.storeId)) as any;
  const { data, error } = await db
    .from("store_theme_versions")
    .select("id")
    .eq("store_id", args.storeId)
    .eq("status", "published")
    .order("is_default", { ascending: false })
    .order("last_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("THEME_PAGE_VERSION_LOAD_FAILED", {
      storeId: args.storeId,
      error,
    });
    return null;
  }

  return text(data?.id) || null;
}

function scopeOf(row: any) {
  const rules = object(row?.visibility_rules);
  return text(rules.scope || row?.scope_mode || "all").toLowerCase() || "all";
}

function targetIds(row: any) {
  const rules = object(row?.visibility_rules);
  return [
    rules.entity_id,
    rules.entityId,
    rules.product_id,
    rules.productId,
    rules.category_id,
    rules.categoryId,
    rules.page_id,
    rules.pageId,
    ...(Array.isArray(rules.entity_ids) ? rules.entity_ids : []),
    ...(Array.isArray(rules.entityIds) ? rules.entityIds : []),
  ]
    .map(text)
    .filter(Boolean);
}

function appliesToEntity(row: any, entityId?: string | null) {
  const scope = scopeOf(row);
  if (scope === "all") return true;

  const target = text(entityId);
  return Boolean(target) && targetIds(row).includes(target);
}

export async function loadThemePageComponents(
  args: LoadThemePageComponentsArgs,
): Promise<any[]> {
  const storeId = text(args.storeId);
  if (!storeId) return [];

  const versionId = await resolveThemeVersionId({
    storeId,
    themeVersionId: args.themeVersionId,
  });
  if (!versionId) return [];

  // Store theme versions and page component instances live in the store shard.
  // Using controlDb here returns no rows for sharded stores even though homepage
  // options still work through store_settings.
  const storeDb = (await getStoreDb(storeId)) as any;
  const { data: rows, error } = await storeDb
    .from("store_theme_page_components")
    .select(
      "id,component_id,page_key,instance_key,title,custom_label,is_enabled,is_deleted,sort_order,values,visibility_rules,metadata",
    )
    .eq("store_id", storeId)
    .eq("store_theme_version_id", versionId)
    .in("page_key", pageAliases(args.pageKey))
    .eq("is_enabled", true)
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(rows) || rows.length === 0) {
    if (error) {
      console.error("THEME_PAGE_COMPONENTS_LOAD_FAILED", {
        storeId,
        versionId,
        pageKey: args.pageKey,
        error,
      });
    }
    return [];
  }

  const componentIds = Array.from(
    new Set(rows.map((row: any) => text(row?.component_id)).filter(Boolean)),
  );

  const definitions = new Map<string, any>();
  if (componentIds.length) {
    const definitionsDb = controlDb();
    const { data: componentRows, error: componentError } = await definitionsDb
      .from("theme_components")
      .select("id,key,slug,name,component_kind,metadata")
      .in("id", componentIds);

    if (componentError) {
      console.error("THEME_COMPONENT_DEFINITIONS_LOAD_FAILED", {
        storeId,
        componentError,
      });
    } else {
      for (const component of componentRows ?? []) {
        definitions.set(text(component?.id), component);
      }
    }
  }

  const applicable = rows.filter((row: any) => appliesToEntity(row, args.entityId));
  const selected = applicable.filter((row: any) => scopeOf(row) !== "all");
  const effectiveRows = selected.length ? selected : applicable.filter((row: any) => scopeOf(row) === "all");

  return effectiveRows.map((row: any) => {
    const definition = definitions.get(text(row?.component_id)) ?? {};
    return {
      ...row,
      enabled: row?.is_enabled !== false,
      key: definition?.key ?? null,
      slug: definition?.slug ?? null,
      component_key: definition?.key ?? null,
      component_slug: definition?.slug ?? null,
      render_key:
        object(definition?.metadata)?.render_key ??
        object(definition?.metadata)?.render ??
        definition?.key ??
        definition?.slug ??
        null,
      component: definition,
    };
  });
}

export function withThemePageSections(
  options: Record<string, any> | null | undefined,
  pageKey: ThemePageKey,
  sections: any[],
) {
  const base = object(options);
  return {
    ...base,
    [pageKey]: {
      ...object(base[pageKey]),
      sections,
    },
  };
}
