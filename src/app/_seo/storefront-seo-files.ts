// FILE: apps/storefront/src/app/_seo/storefront-seo-files.ts

import { NextRequest, NextResponse } from "next/server";

import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

type SeoUrlMode = "short" | "named_ar" | "named_en";

type StoreSettingRow = {
  slug?: string | null;
  value?: any;
  updated_at?: string | null;
  created_at?: string | null;
};

type SitemapItem = {
  loc: string;
  lastmod?: string | null;
  changefreq?: string;
  priority?: string;
};

const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

const ROBOTS_SETTING_SLUGS = [
  "seo.robots_txt",
  "seo.robots_file",
  "seo.robots",
  "robots.txt",
];

const SITEMAP_URL_LIMIT = 20000;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function escapeXml(value: unknown) {
  return s(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanHost(raw: string) {
  return s(raw).toLowerCase().replace(/:\d+$/, "");
}

function getRequestBaseUrl(request: NextRequest) {
  const forwardedHost = cleanHost(request.headers.get("x-forwarded-host") || "");
  const host = forwardedHost || cleanHost(request.headers.get("host") || "");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");

  if (host) return `${proto}://${host}`;

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
}

function responseXml(xml: string, status = 200) {
  return new NextResponse(xml, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function responseText(text: string, status = 200) {
  return new NextResponse(text, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function formatLastmod(value: unknown) {
  const text = s(value);
  if (!text) return "";

  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return "";

  return date.toISOString();
}

function normalizeSlug(value: unknown) {
  const text = s(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 90);

  return text || "page";
}

function makeAbsUrl(baseUrl: string, path: string) {
  const cleanBase = s(baseUrl).replace(/\/+$/, "");
  const cleanPath = s(path).startsWith("/") ? s(path) : `/${s(path)}`;

  return new URL(cleanPath, `${cleanBase}/`).toString();
}

async function loadSettingFromClient(
  sb: any,
  storeId: string,
  slugs: string[],
): Promise<StoreSettingRow | null> {
  try {
    const { data, error } = await sb
      .from("store_settings")
      .select("slug,value,updated_at,created_at")
      .eq("store_id", storeId)
      .in("slug", slugs)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !Array.isArray(data) || !data.length) return null;

    return data[0] as StoreSettingRow;
  } catch {
    return null;
  }
}

async function loadStoreSetting(storeId: string, slugs: string[]) {
  try {
    const storeDb = await getStoreDb(storeId);
    const fromStoreDb = await loadSettingFromClient(storeDb, storeId, slugs);

    if (fromStoreDb) return fromStoreDb;
  } catch {
    //
  }

  try {
    const fromControlDb = await loadSettingFromClient(
      controlDb(),
      storeId,
      slugs,
    );

    if (fromControlDb) return fromControlDb;
  } catch {
    //
  }

  return null;
}

async function loadSeoUrlMode(storeId: string): Promise<SeoUrlMode> {
  const row = await loadStoreSetting(storeId, ["seo.url_mode", "seo.meta"]);
  const value = safeObject(row?.value);

  const mode = s(value.mode);
  if (mode === "named_ar" || mode === "named_en" || mode === "short") {
    return mode;
  }

  const urlMode = Number(value.url_mode ?? 0);
  if (urlMode === 1) return "named_ar";
  if (urlMode === 2) return "named_en";

  return "short";
}

async function loadRobotsContent(storeId: string) {
  const row = await loadStoreSetting(storeId, ROBOTS_SETTING_SLUGS);
  const value = row?.value;

  if (typeof value === "string") return value.replace(/\r\n/g, "\n");

  const obj = safeObject(value);
  return s(obj.content).replace(/\r\n/g, "\n");
}

function buildDefaultRobots(baseUrl: string) {
  return [
    `Sitemap: ${baseUrl.replace(/\/+$/, "")}/sitemap.xml`,
    "User-agent: *",
    "Allow: /",
    "Disallow: /*?iframe",
    "Disallow: /*?currency=",
  ].join("\n");
}

function buildCategoryPath(row: any, mode: SeoUrlMode) {
  const publicNo = s(row?.public_no ?? row?.publicNo);

  if (!publicNo) return "";

  if (mode === "short") return `/c${publicNo}`;

  const name = normalizeSlug(row?.name ?? row?.title ?? "category");
  return `/${name}/c${publicNo}`;
}

function buildProductPath(row: any, mode: SeoUrlMode) {
  const publicNo = s(row?.public_no ?? row?.publicNo);

  if (!publicNo) return "";

  if (mode === "short") return `/p${publicNo}`;

  const name = normalizeSlug(row?.name ?? row?.title ?? "product");
  return `/${name}/p${publicNo}`;
}

function urlEntry(item: SitemapItem) {
  return [
    "  <url>",
    `    <loc>${escapeXml(item.loc)}</loc>`,
    item.lastmod ? `    <lastmod>${escapeXml(item.lastmod)}</lastmod>` : "",
    item.changefreq
      ? `    <changefreq>${escapeXml(item.changefreq)}</changefreq>`
      : "",
    item.priority ? `    <priority>${escapeXml(item.priority)}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function sitemapUrlset(items: SitemapItem[]) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="${SITEMAP_NS}">`,
    ...items.map(urlEntry),
    `</urlset>`,
  ].join("\n");
}

function sitemapIndex(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/+$/, "");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="${SITEMAP_NS}">`,
    `  <sitemap>`,
    `    <loc>${escapeXml(`${cleanBase}/sitemap-1.xml`)}</loc>`,
    `  </sitemap>`,
    `  <sitemap>`,
    `    <loc>${escapeXml(`${cleanBase}/sitemap-2.xml`)}</loc>`,
    `  </sitemap>`,
    `</sitemapindex>`,
  ].join("\n");
}

async function resolveSeoContext(request: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return null;
  }

  const storeId = String(ctx.store.id);
  const baseUrl = getRequestBaseUrl(request);
  const mode = await loadSeoUrlMode(storeId);

  return {
    ctx,
    storeId,
    baseUrl,
    mode,
  };
}

async function loadCategoriesSitemapItems(args: {
  storeId: string;
  baseUrl: string;
  mode: SeoUrlMode;
}) {
  const sb: any = await getStoreDb(args.storeId);

  const { data, error } = await sb
    .from("categories")
    .select("id,name,public_no,updated_at")
    .eq("store_id", args.storeId)
    .order("updated_at", { ascending: false })
    .limit(SITEMAP_URL_LIMIT);

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row: any): SitemapItem | null => {
      const path = buildCategoryPath(row, args.mode);
      if (!path) return null;

      return {
        loc: makeAbsUrl(args.baseUrl, path),
        lastmod: formatLastmod(row.updated_at),
        changefreq: "daily",
        priority: "0.8",
      };
    })
    .filter(Boolean) as SitemapItem[];
}

async function loadProductsSitemapItems(args: {
  storeId: string;
  baseUrl: string;
  mode: SeoUrlMode;
}) {
  const sb: any = await getStoreDb(args.storeId);

  const { data, error } = await sb
    .from("products")
    .select("id,name,public_no,updated_at,status")
    .eq("store_id", args.storeId)
    .in("status", ["active", "published"])
    .order("updated_at", { ascending: false })
    .limit(SITEMAP_URL_LIMIT);

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row: any): SitemapItem | null => {
      const path = buildProductPath(row, args.mode);
      if (!path) return null;

      return {
        loc: makeAbsUrl(args.baseUrl, path),
        lastmod: formatLastmod(row.updated_at),
        changefreq: "daily",
        priority: "0.7",
      };
    })
    .filter(Boolean) as SitemapItem[];
}

export async function handleSitemapIndex(request: NextRequest) {
  const seo = await resolveSeoContext(request);

  if (!seo) {
    return responseXml(sitemapUrlset([]), 404);
  }

  return responseXml(sitemapIndex(seo.baseUrl));
}

export async function handleSitemapOne(request: NextRequest) {
  const seo = await resolveSeoContext(request);

  if (!seo) {
    return responseXml(sitemapUrlset([]), 404);
  }

  const home: SitemapItem = {
    loc: makeAbsUrl(seo.baseUrl, "/"),
    changefreq: "daily",
    priority: "1.0",
  };

  const categories = await loadCategoriesSitemapItems({
    storeId: seo.storeId,
    baseUrl: seo.baseUrl,
    mode: seo.mode,
  });

  return responseXml(sitemapUrlset([home, ...categories]));
}

export async function handleSitemapTwo(request: NextRequest) {
  const seo = await resolveSeoContext(request);

  if (!seo) {
    return responseXml(sitemapUrlset([]), 404);
  }

  const products = await loadProductsSitemapItems({
    storeId: seo.storeId,
    baseUrl: seo.baseUrl,
    mode: seo.mode,
  });

  return responseXml(sitemapUrlset(products));
}

export async function handleRobotsTxt(request: NextRequest) {
  const seo = await resolveSeoContext(request);

  if (!seo) {
    return responseText("User-agent: *\nDisallow: /", 404);
  }

  const saved = await loadRobotsContent(seo.storeId);
  const content = saved || buildDefaultRobots(seo.baseUrl);

  return responseText(content);
}