// FILE: apps/storefront/src/theme-engine/store-context/resolve-store.ts

import { headers } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisCached } from "@/data/cache/redis-cache.server";
import { controlDb } from "@/data/db/control-db.server";

export type StoreRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  default_currency: string;
  description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
};

type StoreDomainRow = {
  store_id: string;
  domain: string;
  verified_at: string | null;
  is_primary: boolean | null;
};

export type ThemeMainInfo = {
  primary_color: string;
  font: string;
};

export type ThemeOptions = Record<string, any>;

export type StoreThemeContext = {
  version_id: string;
  theme_key: string | null;
  main_info: ThemeMainInfo;
  options: ThemeOptions;
};

export type StoreContext = {
  host: string;
  store_slug?: string;
  store?: StoreRow;
  theme?: StoreThemeContext;
};

const STORE_SELECT =
  "id,slug,name,status,default_currency,description,logo_url,favicon_url";

const DEFAULT_MAIN_INFO: ThemeMainInfo = {
  primary_color: "#00a98f",
  font: "tajawal",
};

function cleanHost(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/:\d+$/, "");
}

function localSubdomainSlug(host: string) {
  if (!host.endsWith(".localhost")) return null;

  const parts = host.split(".");
  if (parts.length < 2) return null;

  return parts[0] || null;
}

function madrarSubdomainSlug(host: string) {
  if (!host.endsWith(".elyaia.com")) return null;

  const parts = host.split(".");
  if (parts.length < 3) return null;

  return parts[0] || null;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function logDbError(scope: string, error: any, meta?: Record<string, any>) {
  console.error(`[resolve-store] ${scope}`, {
    message: error?.message ?? String(error),
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    code: error?.code ?? null,
    meta: meta ?? null,
  });
}

/* ---------------------- DB lookups (control db) ---------------------- */

async function fetchStoreBySlug(slug: string): Promise<StoreRow | null> {
  try {
    const sb = controlDb();

    const r = await sb
      .from("stores")
      .select(STORE_SELECT)
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (r.error) {
      logDbError("fetchStoreBySlug failed", r.error, { slug });
      return null;
    }

    return (r.data as StoreRow | null) ?? null;
  } catch (e: any) {
    logDbError("fetchStoreBySlug crashed", e, { slug });
    return null;
  }
}

async function fetchStoreById(store_id: string): Promise<StoreRow | null> {
  try {
    const sb = controlDb();

    const r = await sb
      .from("stores")
      .select(STORE_SELECT)
      .eq("id", store_id)
      .limit(1)
      .maybeSingle();

    if (r.error) {
      logDbError("fetchStoreById failed", r.error, { store_id });
      return null;
    }

    return (r.data as StoreRow | null) ?? null;
  } catch (e: any) {
    logDbError("fetchStoreById crashed", e, { store_id });
    return null;
  }
}

async function fetchVerifiedDomainRow(
  host: string,
): Promise<StoreDomainRow | null> {
  try {
    const sb = controlDb();

    const r = await sb
      .from("store_domains")
      .select("store_id,domain,verified_at,is_primary")
      .eq("domain", host)
      .not("verified_at", "is", null)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.error) {
      logDbError("fetchVerifiedDomainRow failed", r.error, { host });
      return null;
    }

    return (r.data as StoreDomainRow | null) ?? null;
  } catch (e: any) {
    logDbError("fetchVerifiedDomainRow crashed", e, { host });
    return null;
  }
}

function slugForThemeMainInfo(versionId: string) {
  return `theme_version:${versionId}:main_info`;
}

function slugForThemeOptions(versionId: string) {
  return `theme_version:${versionId}:theme_options`;
}

type ThemeVersionRow = {
  id: string;
  store_id: string;
  theme_id: string;
  status: string;
  is_default: boolean | null;
  last_updated_at: string | null;
  created_at: string | null;
  themes_catalog?: { key: string | null } | null;
};

type ActiveStoreThemeRow = {
  id: string;
  store_id: string;
  theme_id: string;
  status: string;
  settings: Record<string, any>;
  updated_at: string | null;
  created_at: string | null;
  version_id: string;
  theme_key: string | null;
  catalog_key: string | null;
};

async function fetchActiveThemeVersion(
  store_id: string,
): Promise<ThemeVersionRow | null> {
  try {
    const sb = controlDb();

    const r = await sb
      .from("store_theme_versions")
      .select(
        `
        id,
        store_id,
        theme_id,
        status,
        is_default,
        last_updated_at,
        created_at,
        themes_catalog:theme_id ( key )
      `,
      )
      .eq("store_id", store_id)
      .eq("status", "published")
      .order("is_default", { ascending: false })
      .order("last_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.error) {
      logDbError("fetchActiveThemeVersion failed", r.error, { store_id });
      return null;
    }

    return (r.data as ThemeVersionRow | null) ?? null;
  } catch (e: any) {
    logDbError("fetchActiveThemeVersion crashed", e, { store_id });
    return null;
  }
}

function mainInfoFromThemeSettings(settings: Record<string, any>): ThemeMainInfo {
  const colors = safeObject(settings.colors);
  const typography = safeObject(settings.typography);

  return {
    primary_color: String(
      settings.primary_color ??
        settings.primaryColor ??
        colors.primary ??
        colors.brand ??
        DEFAULT_MAIN_INFO.primary_color,
    ),
    font: String(
      settings.font ??
        settings.font_family ??
        settings.fontFamily ??
        typography.font ??
        DEFAULT_MAIN_INFO.font,
    ),
  };
}

async function fetchActiveStoreTheme(
  store_id: string,
): Promise<ActiveStoreThemeRow | null> {
  try {
    const sb = controlDb();

    const st = await sb
      .from("store_themes")
      .select("id,store_id,theme_id,status,settings,updated_at,created_at")
      .eq("store_id", store_id)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (st.error) {
      logDbError("fetchActiveStoreTheme failed", st.error, { store_id });
      return null;
    }

    if (!st.data?.theme_id) return null;

    const theme = await sb
      .from("themes")
      .select("id,code,name,catalog_theme_id")
      .eq("id", st.data.theme_id)
      .limit(1)
      .maybeSingle();

    if (theme.error) {
      logDbError("fetchActiveStoreTheme theme lookup failed", theme.error, {
        store_id,
        theme_id: st.data.theme_id,
      });
      return null;
    }

    const themeCode = String(theme.data?.code ?? "").trim();
    const catalogThemeId = String(theme.data?.catalog_theme_id ?? "").trim();

    let catalogKey: string | null = null;

    if (catalogThemeId) {
      const catalog = await sb
        .from("themes_catalog")
        .select("id,key,name")
        .eq("id", catalogThemeId)
        .limit(1)
        .maybeSingle();

      if (catalog.error) {
        logDbError("fetchActiveStoreTheme catalog lookup failed", catalog.error, {
          store_id,
          catalog_theme_id: catalogThemeId,
        });
      } else {
        catalogKey = String(catalog.data?.key ?? "").trim() || null;
      }
    }

    const themeKey = themeCode || catalogKey || null;

    if (!themeKey) return null;

    return {
      id: String(st.data.id),
      store_id: String(st.data.store_id),
      theme_id: String(st.data.theme_id),
      status: String(st.data.status),
      settings: safeObject(st.data.settings),
      updated_at: st.data.updated_at ?? null,
      created_at: st.data.created_at ?? null,
      version_id: `store_theme:${st.data.id}`,
      theme_key: themeKey,
      catalog_key: catalogKey,
    };
  } catch (e: any) {
    logDbError("fetchActiveStoreTheme crashed", e, { store_id });
    return null;
  }
}

async function fetchThemeMainInfo(
  store_id: string,
  version_id: string,
): Promise<ThemeMainInfo> {
  try {
    const sb = controlDb();
    const slug = slugForThemeMainInfo(version_id);

    const r = await sb
      .from("store_settings")
      .select("value")
      .eq("store_id", store_id)
      .eq("slug", slug)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.error) {
      logDbError("fetchThemeMainInfo failed", r.error, {
        store_id,
        version_id,
        slug,
      });

      return DEFAULT_MAIN_INFO;
    }

    const v = safeObject(r.data?.value);

    return {
      primary_color: String(v.primary_color ?? DEFAULT_MAIN_INFO.primary_color),
      font: String(v.font ?? DEFAULT_MAIN_INFO.font),
    };
  } catch (e: any) {
    logDbError("fetchThemeMainInfo crashed", e, { store_id, version_id });
    return DEFAULT_MAIN_INFO;
  }
}

async function fetchThemeOptions(
  store_id: string,
  version_id: string,
): Promise<Record<string, any>> {
  try {
    const sb = controlDb();
    const slug = slugForThemeOptions(version_id);

    const r = await sb
      .from("store_settings")
      .select("value")
      .eq("store_id", store_id)
      .eq("slug", slug)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.error) {
      logDbError("fetchThemeOptions failed", r.error, {
        store_id,
        version_id,
        slug,
      });

      return {};
    }

    return safeObject(r.data?.value);
  } catch (e: any) {
    logDbError("fetchThemeOptions crashed", e, { store_id, version_id });
    return {};
  }
}

/* ---------------------- Cached wrappers (Next + Redis) ---------------------- */

const _storeBySlugCache = new Map<string, () => Promise<StoreRow | null>>();
const _storeByIdCache = new Map<string, () => Promise<StoreRow | null>>();
const _domainRowCache = new Map<string, () => Promise<StoreDomainRow | null>>();

const _activeThemeVersionCache = new Map<
  string,
  () => Promise<ThemeVersionRow | null>
>();

const _activeStoreThemeCache = new Map<
  string,
  () => Promise<ActiveStoreThemeRow | null>
>();

const _themeMainInfoCache = new Map<string, () => Promise<ThemeMainInfo>>();

const _themeOptionsCache = new Map<
  string,
  () => Promise<Record<string, any>>
>();

function cachedStoreBySlug(slug: string) {
  let fn = _storeBySlugCache.get(slug);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "store-by-slug", slug),
          { ttlSeconds: 300 },
          () => fetchStoreBySlug(slug),
        ),
      ["store-by-slug", slug],
      { revalidate: 60 },
    );

    _storeBySlugCache.set(slug, fn);
  }

  return fn();
}

function cachedStoreById(store_id: string) {
  let fn = _storeByIdCache.get(store_id);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "store-by-id", store_id),
          { ttlSeconds: 300 },
          () => fetchStoreById(store_id),
        ),
      ["store-by-id", store_id],
      { revalidate: 60 },
    );

    _storeByIdCache.set(store_id, fn);
  }

  return fn();
}

function cachedDomainRow(host: string) {
  let fn = _domainRowCache.get(host);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "domain-row", host),
          { ttlSeconds: 300 },
          () => fetchVerifiedDomainRow(host),
        ),
      ["store-domain", host],
      { revalidate: 60 },
    );

    _domainRowCache.set(host, fn);
  }

  return fn();
}

function cachedActiveThemeVersion(store_id: string) {
  let fn = _activeThemeVersionCache.get(store_id);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "active-theme-version", store_id),
          { ttlSeconds: 120 },
          () => fetchActiveThemeVersion(store_id),
        ),
      ["active-theme-version", store_id],
      { revalidate: 30 },
    );

    _activeThemeVersionCache.set(store_id, fn);
  }

  return fn();
}

function cachedActiveStoreTheme(store_id: string) {
  let fn = _activeStoreThemeCache.get(store_id);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "active-store-theme", store_id),
          { ttlSeconds: 120 },
          () => fetchActiveStoreTheme(store_id),
        ),
      ["active-store-theme", store_id],
      { revalidate: 30 },
    );

    _activeStoreThemeCache.set(store_id, fn);
  }

  return fn();
}

function cachedThemeMainInfo(store_id: string, version_id: string) {
  const key = `${store_id}:${version_id}`;
  let fn = _themeMainInfoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "theme-main-info", store_id, version_id),
          { ttlSeconds: 120 },
          () => fetchThemeMainInfo(store_id, version_id),
        ),
      ["theme-main-info", store_id, version_id],
      { revalidate: 30 },
    );

    _themeMainInfoCache.set(key, fn);
  }

  return fn();
}

function cachedThemeOptions(store_id: string, version_id: string) {
  const key = `${store_id}:${version_id}`;
  let fn = _themeOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "theme-options", store_id, version_id),
          { ttlSeconds: 120 },
          () => fetchThemeOptions(store_id, version_id),
        ),
      ["theme-options", store_id, version_id],
      { revalidate: 30 },
    );

    _themeOptionsCache.set(key, fn);
  }

  return fn();
}

/* ---------------------------- Main resolver ---------------------------- */

async function attachThemeToContext(ctx: StoreContext): Promise<StoreContext> {
  const storeId = ctx.store?.id;

  if (!storeId) return ctx;

  const version = await cachedActiveThemeVersion(storeId);

  if (version?.id) {
    const [main_info, options] = await Promise.all([
      cachedThemeMainInfo(storeId, version.id),
      cachedThemeOptions(storeId, version.id),
    ]);

    return {
      ...ctx,
      theme: {
        version_id: version.id,
        theme_key: version.themes_catalog?.key ?? null,
        main_info,
        options,
      },
    };
  }

  const fallbackTheme = await cachedActiveStoreTheme(storeId);

  if (!fallbackTheme?.theme_key) return ctx;

  return {
    ...ctx,
    theme: {
      version_id: fallbackTheme.version_id,
      theme_key: fallbackTheme.theme_key,
      main_info: mainInfoFromThemeSettings(fallbackTheme.settings),
      options: fallbackTheme.settings,
    },
  };
}

async function resolveStoreContextByHost(host: string): Promise<StoreContext> {
  if (!host) return { host: "" };

  const localSlug = localSubdomainSlug(host);

  if (localSlug) {
    const store0 = await cachedStoreBySlug(localSlug);

    if (store0) {
      return attachThemeToContext({
        host,
        store_slug: store0.slug,
        store: store0,
      });
    }

    return {
      host,
      store_slug: localSlug,
    };
  }

  const slug = madrarSubdomainSlug(host);

  if (slug) {
    const store = await cachedStoreBySlug(slug);

    if (store) {
      return attachThemeToContext({
        host,
        store_slug: store.slug,
        store,
      });
    }

    return {
      host,
      store_slug: slug,
    };
  }

  const domainRow = await cachedDomainRow(host);

  if (domainRow?.store_id) {
    const store2 = await cachedStoreById(String(domainRow.store_id));

    if (store2) {
      return attachThemeToContext({
        host,
        store_slug: store2.slug,
        store: store2,
      });
    }
  }

  return { host };
}

const _storeContextCache = new Map<string, () => Promise<StoreContext>>();

function cachedStoreContextByHost(host: string) {
  let fn = _storeContextCache.get(host);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("resolve-store", "store-context", host),
          { ttlSeconds: 120 },
          () => resolveStoreContextByHost(host),
        ),
      ["store-context", host],
      { revalidate: 60 },
    );

    _storeContextCache.set(host, fn);
  }

  return fn();
}

export const resolveStoreContext = cache(async (): Promise<StoreContext> => {
  const h = await headers();

  const host = cleanHost(h.get("x-forwarded-host") || h.get("host") || "");

  if (!host) return { host: "" };

  return cachedStoreContextByHost(host);
});