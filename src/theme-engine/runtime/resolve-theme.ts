// FILE: apps/storefront/src/theme-engine/runtime/resolve-theme.ts

import { cache } from "react";

import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { themeRegistry, type ThemeCode } from "@/theme-engine/registry";

export type ResolvedTheme = {
  code: ThemeCode;
  settings: Record<string, any>;
};

type StoreThemeRow = {
  theme_id: string;
  status: string;
  settings: Record<string, any> | null;
  updated_at?: string | null;
};

type ThemeRow = {
  id: string;
  code: string;
  catalog_theme_id?: string | null;
  default_settings: Record<string, any> | null;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function buildThemeOptionsSlug(themeId: string) {
  return `theme:${themeId}:theme_options`;
}

function buildThemeVersionOptionsSlug(versionId: string) {
  return `theme_version:${versionId}:theme_options`;
}

async function fetchLatestStoreTheme(args: {
  store_id: string;
  status: "draft" | "published";
}) {
  const storeId = s(args.store_id);
  if (!storeId) return null;

  const sb = (await getStoreDb(storeId)) as any;

  const r = await sb
    .from("store_themes")
    .select("theme_id,status,settings,updated_at")
    .eq("store_id", storeId)
    .eq("status", args.status)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (r.data as StoreThemeRow | null) ?? null;
}

async function fetchThemeById(theme_id: string) {
  const themeId = s(theme_id);
  if (!themeId) return null;

  const sb = (await controlDb()) as any;

  const r = await sb
    .from("themes")
    .select("id,code,catalog_theme_id,default_settings")
    .eq("id", themeId)
    .limit(1)
    .maybeSingle();

  return (r.data as ThemeRow | null) ?? null;
}

async function fetchThemeByCode(theme_code: string) {
  const themeCode = s(theme_code);
  if (!themeCode) return null;

  const sb = (await controlDb()) as any;

  const r = await sb
    .from("themes")
    .select("id,code,catalog_theme_id,default_settings")
    .eq("code", themeCode)
    .limit(1)
    .maybeSingle();

  return (r.data as ThemeRow | null) ?? null;
}

async function fetchStoreThemeSettings(args: {
  store_id: string;
  theme_id: string;
  status: "draft" | "published";
}) {
  const storeId = s(args.store_id);
  const themeId = s(args.theme_id);

  if (!storeId || !themeId) return null;

  const sb = (await getStoreDb(storeId)) as any;

  const r = await sb
    .from("store_themes")
    .select("settings,updated_at")
    .eq("store_id", storeId)
    .eq("theme_id", themeId)
    .eq("status", args.status)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (r.data as { settings: Record<string, any> | null } | null) ?? null;
}

async function fetchThemeOptionsFromStoreSettings(args: {
  store_id: string;
  theme_id: string;
}) {
  const storeId = s(args.store_id);
  const themeId = s(args.theme_id);

  if (!storeId || !themeId) return null;

  const sb = (await getStoreDb(storeId)) as any;
  const slug = buildThemeOptionsSlug(themeId);

  const r = await sb
    .from("store_settings")
    .select("id,value,updated_at")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    (r.data as {
      id: string;
      value: Record<string, any> | null;
      updated_at?: string | null;
    } | null) ?? null
  );
}

async function fetchThemeVersionOptions(args: {
  store_id: string;
  catalog_theme_id?: string | null;
  preview: boolean;
}) {
  const storeId = s(args.store_id);
  const catalogThemeId = s(args.catalog_theme_id);

  if (!storeId || !catalogThemeId) return null;

  const sb = (await getStoreDb(storeId)) as any;
  const wantedStatus = args.preview ? "draft" : "published";

  const versionQuery = await sb
    .from("store_theme_versions")
    .select("id, theme_id, status, is_default, last_updated_at, created_at")
    .eq("store_id", storeId)
    .eq("theme_id", catalogThemeId)
    .eq("status", wantedStatus)
    .order("is_default", { ascending: false })
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let versionRow = versionQuery.data as { id: string } | null;

  if (!versionRow && args.preview) {
    const fallbackPublished = await sb
      .from("store_theme_versions")
      .select("id, theme_id, status, is_default, last_updated_at, created_at")
      .eq("store_id", storeId)
      .eq("theme_id", catalogThemeId)
      .eq("status", "published")
      .order("is_default", { ascending: false })
      .order("last_updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    versionRow = fallbackPublished.data as { id: string } | null;
  }

  if (!versionRow?.id) return null;

  const slug = buildThemeVersionOptionsSlug(String(versionRow.id));

  const settingRes = await sb
    .from("store_settings")
    .select("id,value,updated_at")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    (settingRes.data as {
      id: string;
      value: Record<string, any> | null;
      updated_at?: string | null;
    } | null) ?? null
  );
}

export const resolveTheme = cache(
  async ({
    store_id,
    preview,
    theme_code,
  }: {
    store_id: string;
    preview: boolean;
    theme_code?: string;
  }): Promise<ResolvedTheme> => {
    const storeId = s(store_id);
    const fallback = themeRegistry.defaultTheme();

    if (!storeId) {
      return {
        code: fallback.code,
        settings: safeObject(fallback.default_settings),
      };
    }

    if (theme_code) {
      const code = theme_code as ThemeCode;

      if (!themeRegistry.has(code)) {
        return {
          code: fallback.code,
          settings: safeObject(fallback.default_settings),
        };
      }

      const themeRow = await fetchThemeByCode(code);

      if (!themeRow) {
        return {
          code,
          settings: safeObject(themeRegistry.get(code).default_settings),
        };
      }

      const status: "draft" | "published" = preview ? "draft" : "published";

      const [storeTheme, themeOptionsByTheme, themeOptionsByVersion] =
        await Promise.all([
          fetchStoreThemeSettings({
            store_id: storeId,
            theme_id: themeRow.id,
            status,
          }),

          fetchThemeOptionsFromStoreSettings({
            store_id: storeId,
            theme_id: themeRow.id,
          }),

          fetchThemeVersionOptions({
            store_id: storeId,
            catalog_theme_id: themeRow.catalog_theme_id ?? null,
            preview,
          }),
        ]);

      const settings = {
        ...safeObject(themeRow.default_settings),
        ...safeObject(storeTheme?.settings),
        ...safeObject(themeOptionsByTheme?.value),
        ...safeObject(themeOptionsByVersion?.value),
      };

      return { code, settings };
    }

    const st =
      (preview
        ? await fetchLatestStoreTheme({ store_id: storeId, status: "draft" })
        : null) ??
      (await fetchLatestStoreTheme({
        store_id: storeId,
        status: "published",
      }));

    if (!st?.theme_id) {
      return {
        code: fallback.code,
        settings: safeObject(fallback.default_settings),
      };
    }

    const themeRow = await fetchThemeById(st.theme_id);

    if (!themeRow) {
      return {
        code: fallback.code,
        settings: safeObject(fallback.default_settings),
      };
    }

    const code = (themeRow.code as ThemeCode) || fallback.code;

    if (!themeRegistry.has(code)) {
      return {
        code: fallback.code,
        settings: safeObject(fallback.default_settings),
      };
    }

    const [themeOptionsByTheme, themeOptionsByVersion] = await Promise.all([
      fetchThemeOptionsFromStoreSettings({
        store_id: storeId,
        theme_id: themeRow.id,
      }),

      fetchThemeVersionOptions({
        store_id: storeId,
        catalog_theme_id: themeRow.catalog_theme_id ?? null,
        preview,
      }),
    ]);

    const settings = {
      ...safeObject(themeRow.default_settings),
      ...safeObject(st.settings),
      ...safeObject(themeOptionsByTheme?.value),
      ...safeObject(themeOptionsByVersion?.value),
    };

    return { code, settings };
  },
);
