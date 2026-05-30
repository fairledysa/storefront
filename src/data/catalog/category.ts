// FILE: apps/storefront/src/data/catalog/category.ts
import { unstable_cache } from "next/cache";

import { getStoreDb } from "@/data/db/store-db.server";

export type CategoryRow = {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  depth: number;
  path: string;

  public_no?: number;

  short_url?: string | null;

  seo_title?: string | null;
  seo_description?: string | null;

  og_image_url?: string | null;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function pickCategoryOgImage(row: any): string | null {
  const media = row?.category_media;
  if (!media) return null;

  const arr = Array.isArray(media) ? media.slice() : [media];

  arr.sort((a: any, b: any) => {
    const ap = a?.is_primary ? 1 : 0;
    const bp = b?.is_primary ? 1 : 0;
    if (bp !== ap) return bp - ap;

    const as = Number(a?.sort_order ?? 0);
    const bs = Number(b?.sort_order ?? 0);
    return as - bs;
  });

  const first = arr.find(Boolean);
  return first?.url ?? null;
}

function readOne(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapCategory(row: any): CategoryRow {
  const metadata = readOne(row?.category_metadata);

  return {
    id: row.id,
    store_id: row.store_id,
    parent_id: row.parent_id ?? null,
    name: row.name,
    slug: row.slug,
    sort_order: row.sort_order ?? 0,
    depth: row.depth ?? 1,
    path: row.path ?? "/",
    public_no: row.public_no ?? undefined,

    short_url: metadata?.url ?? null,
    seo_title: metadata?.title ?? null,
    seo_description: metadata?.description ?? null,

    og_image_url: pickCategoryOgImage(row),
  };
}

async function getCategoryBySlugRaw(args: {
  store_id: string;
  slug: string;
}): Promise<CategoryRow | null> {
  const storeId = s(args.store_id);
  const slug = s(args.slug);

  if (!storeId || !slug) return null;

  const sb = await getStoreDb(storeId);

  const r = await sb
    .from("categories")
    .select(
      "id,store_id,parent_id,name,slug,sort_order,depth,path,public_no,category_metadata(title,description,url),category_media(url,is_primary,sort_order)",
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  const row: any = r.data;
  if (!row) return null;

  return mapCategory(row);
}

async function getCategoryByShortUrlRaw(args: {
  store_id: string;
  short_url: string;
}): Promise<CategoryRow | null> {
  const storeId = s(args.store_id);
  const shortUrl = s(args.short_url);

  if (!storeId || !shortUrl) return null;

  const sb = await getStoreDb(storeId);

  const r = await sb
    .from("category_metadata")
    .select(
      "url,title,description,category_id,categories!inner(id,store_id,parent_id,name,slug,sort_order,depth,path,public_no,category_media(url,is_primary,sort_order))",
    )
    .eq("url", shortUrl)
    .eq("categories.store_id", storeId)
    .limit(1)
    .maybeSingle();

  const row: any = r.data;
  const category = readOne(row?.categories);

  if (!category) return null;

  category.category_metadata = {
    url: row.url ?? null,
    title: row.title ?? null,
    description: row.description ?? null,
  };

  return mapCategory(category);
}

async function getCategoryByPublicNoRaw(args: {
  store_id: string;
  public_no: number;
}): Promise<CategoryRow | null> {
  const storeId = s(args.store_id);
  const publicNo = Number(args.public_no);

  if (!storeId || !Number.isFinite(publicNo) || publicNo <= 0) {
    return null;
  }

  const sb = await getStoreDb(storeId);

  const r = await sb
    .from("categories")
    .select(
      "id,store_id,parent_id,name,slug,sort_order,depth,path,public_no,category_metadata(title,description,url),category_media(url,is_primary,sort_order)",
    )
    .eq("store_id", storeId)
    .eq("public_no", publicNo)
    .limit(1)
    .maybeSingle();

  const row: any = r.data;
  if (!row) return null;

  return mapCategory(row);
}

async function getCategoriesForGridRaw(args: {
  store_id: string;
  parent_id?: string | null;
  limit?: number;
}): Promise<CategoryRow[]> {
  const storeId = s(args.store_id);
  if (!storeId) return [];

  const sb = await getStoreDb(storeId);
  const limit = Math.min(Math.max(Number(args.limit ?? 12), 1), 60);

  let query = sb
    .from("categories")
    .select(
      "id,store_id,parent_id,name,slug,sort_order,depth,path,public_no,category_metadata(title,description,url),category_media(url,is_primary,sort_order)",
    )
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (args.parent_id === null) {
    query = query.is("parent_id", null);
  } else if (typeof args.parent_id === "string") {
    query = query.eq("parent_id", args.parent_id);
  } else {
    query = query.is("parent_id", null);
  }

  const r = await query;
  const rows = (r.data || []) as any[];

  return rows.map(mapCategory);
}

const categoryBySlugCache = new Map<string, () => Promise<CategoryRow | null>>();
const categoryByShortUrlCache = new Map<
  string,
  () => Promise<CategoryRow | null>
>();
const categoryByPublicNoCache = new Map<
  string,
  () => Promise<CategoryRow | null>
>();
const categoriesForGridCache = new Map<string, () => Promise<CategoryRow[]>>();

export async function getCategoryBySlug(args: {
  store_id: string;
  slug: string;
}): Promise<CategoryRow | null> {
  const storeId = s(args.store_id);
  const slug = s(args.slug);

  if (!storeId || !slug) return null;

  const key = `${storeId}:${slug}`;
  let fn = categoryBySlugCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getCategoryBySlugRaw({
          store_id: storeId,
          slug,
        }),
      ["category-by-slug", storeId, slug],
      { revalidate: 120 },
    );

    categoryBySlugCache.set(key, fn);
  }

  return fn();
}

export async function getCategoryByShortUrl(args: {
  store_id: string;
  short_url: string;
}): Promise<CategoryRow | null> {
  const storeId = s(args.store_id);
  const shortUrl = s(args.short_url);

  if (!storeId || !shortUrl) return null;

  const key = `${storeId}:${shortUrl}`;
  let fn = categoryByShortUrlCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getCategoryByShortUrlRaw({
          store_id: storeId,
          short_url: shortUrl,
        }),
      ["category-by-short-url", storeId, shortUrl],
      { revalidate: 120 },
    );

    categoryByShortUrlCache.set(key, fn);
  }

  return fn();
}

export async function getCategoryByPublicNo(args: {
  store_id: string;
  public_no: number;
}): Promise<CategoryRow | null> {
  const storeId = s(args.store_id);
  const publicNo = Number(args.public_no);

  if (!storeId || !Number.isFinite(publicNo) || publicNo <= 0) {
    return null;
  }

  const key = `${storeId}:${publicNo}`;
  let fn = categoryByPublicNoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getCategoryByPublicNoRaw({
          store_id: storeId,
          public_no: publicNo,
        }),
      ["category-by-public-no", storeId, String(publicNo)],
      { revalidate: 120 },
    );

    categoryByPublicNoCache.set(key, fn);
  }

  return fn();
}

export async function getCategoriesForGrid(args: {
  store_id: string;
  parent_id?: string | null;
  limit?: number;
}): Promise<CategoryRow[]> {
  const storeId = s(args.store_id);
  if (!storeId) return [];

  const limit = Math.min(Math.max(Number(args.limit ?? 12), 1), 60);

  const parentKey =
    args.parent_id === null
      ? "root"
      : typeof args.parent_id === "string"
        ? args.parent_id
        : "root";

  const key = `${storeId}:${parentKey}:${limit}`;
  let fn = categoriesForGridCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getCategoriesForGridRaw({
          ...args,
          store_id: storeId,
          limit,
        }),
      ["categories-for-grid", storeId, parentKey, String(limit)],
      { revalidate: 120 },
    );

    categoriesForGridCache.set(key, fn);
  }

  return fn();
}