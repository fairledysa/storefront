// FILE: apps/storefront/src/data/catalog/categories.ts
import { getStoreDb } from "@/data/db/store-db.server";

export type CategoryGridItem = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  depth: number;
  path: string;

  // ✅ SEO fields
  public_no: number;
  short_url: string | null; // from category_metadata.url

  image: { url: string; alt?: string | null } | null;
};

export type CategoryNode = CategoryGridItem & { children: CategoryNode[] };

function pickPrimaryImage(media: any[] | null | undefined) {
  const arr = Array.isArray(media) ? media : [];
  if (!arr.length) return null;

  const primary = arr.find((m) => m?.is_primary) ?? arr[0];

  if (!primary?.url) return null;

  return {
    url: String(primary.url),
    alt: primary?.alt ?? null,
  };
}

function normalizeShortUrl(v: any): string | null {
  const value = String(v ?? "").trim();

  if (!value) return null;

  // لو مخزن رابط كامل
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      const segment = url.pathname.split("/").filter(Boolean).pop() || "";

      return segment || null;
    }
  } catch {}

  // لو مخزن "/Nmsy"
  return value.replace(/^\/+/, "") || null;
}

function normalizeLimit(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(value, 200)) : 24;
}

function normalizeMaxDepth(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(value, 6)) : 6;
}

// ------------------------- GRID -------------------------
export async function getCategoriesForGrid(args: {
  store_id: string;
  limit: number;
  source: "top_level" | "by_parent_slug";
  parent_slug?: string;
}): Promise<CategoryGridItem[]> {
  const sb = await getStoreDb(args.store_id);

  let parentId: string | null = null;

  if (args.source === "by_parent_slug" && args.parent_slug) {
    const parentR = await sb
      .from("categories")
      .select("id")
      .eq("store_id", args.store_id)
      .eq("slug", args.parent_slug)
      .maybeSingle();

    parentId = (parentR.data as any)?.id ?? null;

    if (!parentId) return [];
  }

  let query = sb
    .from("categories")
    .select("id,name,slug,parent_id,sort_order,depth,path,public_no")
    .eq("store_id", args.store_id)
    .eq("status", "active");

  if (args.source === "top_level") {
    query = query.is("parent_id", null);
  }

  if (args.source === "by_parent_slug" && parentId) {
    query = query.eq("parent_id", parentId);
  }

  const categoriesResult = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(normalizeLimit(args.limit));

  const base = (categoriesResult.data || []) as any[];

  if (!base.length) return [];

  const ids = base.map((item) => item.id).filter(Boolean);

  if (!ids.length) return [];

  // metadata urls
  const metaResult = await sb
    .from("category_metadata")
    .select("category_id,url")
    .in("category_id", ids);

  const metaByCategory = new Map<string, any>();

  for (const meta of (metaResult.data || []) as any[]) {
    metaByCategory.set(String(meta.category_id), meta);
  }

  // media
  const mediaResult = await sb
    .from("category_media")
    .select("category_id,url,alt,is_primary,sort_order")
    .eq("store_id", args.store_id)
    .in("category_id", ids)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  if (mediaResult.error) throw new Error(mediaResult.error.message);

  const mediaByCategory = new Map<string, any[]>();

  for (const media of (mediaResult.data || []) as any[]) {
    const key = String(media.category_id);

    if (!mediaByCategory.has(key)) {
      mediaByCategory.set(key, []);
    }

    mediaByCategory.get(key)!.push(media);
  }

  return base.map((category) => {
    const id = String(category.id);
    const meta = metaByCategory.get(id);

    return {
      id,
      name: String(category.name),
      slug: String(category.slug),
      parent_id: category.parent_id ? String(category.parent_id) : null,
      sort_order: Number(category.sort_order ?? 0),
      depth: Number(category.depth ?? 1),
      path: String(category.path ?? "/"),

      public_no: Number(category.public_no),
      short_url: normalizeShortUrl(meta?.url),

      image: pickPrimaryImage(mediaByCategory.get(id) || []),
    };
  });
}

// ------------------------- TREE -------------------------
export async function getCategoriesTree(args: {
  store_id: string;
  max_depth: number;
}): Promise<CategoryNode[]> {
  const sb = await getStoreDb(args.store_id);

  const maxDepth = normalizeMaxDepth(args.max_depth);

  const categoriesResult = await sb
    .from("categories")
    .select("id,name,slug,parent_id,sort_order,depth,path,public_no")
    .eq("store_id", args.store_id)
    .eq("status", "active")
    .lte("depth", maxDepth)
    .order("depth", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const base = (categoriesResult.data || []) as any[];

  if (!base.length) return [];

  const ids = base.map((item) => item.id).filter(Boolean);

  if (!ids.length) return [];

  const metaResult = await sb
    .from("category_metadata")
    .select("category_id,url")
    .in("category_id", ids);

  const metaByCategory = new Map<string, any>();

  for (const meta of (metaResult.data || []) as any[]) {
    metaByCategory.set(String(meta.category_id), meta);
  }

  const mediaResult = await sb
    .from("category_media")
    .select("category_id,url,alt,is_primary,sort_order")
    .eq("store_id", args.store_id)
    .in("category_id", ids)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  if (mediaResult.error) throw new Error(mediaResult.error.message);

  const mediaByCategory = new Map<string, any[]>();

  for (const media of (mediaResult.data || []) as any[]) {
    const key = String(media.category_id);

    if (!mediaByCategory.has(key)) {
      mediaByCategory.set(key, []);
    }

    mediaByCategory.get(key)!.push(media);
  }

  const byId = new Map<string, CategoryNode>();

  for (const category of base) {
    const id = String(category.id);
    const meta = metaByCategory.get(id);

    byId.set(id, {
      id,
      name: String(category.name),
      slug: String(category.slug),
      parent_id: category.parent_id ? String(category.parent_id) : null,
      sort_order: Number(category.sort_order ?? 0),
      depth: Number(category.depth ?? 1),
      path: String(category.path ?? "/"),

      public_no: Number(category.public_no),
      short_url: normalizeShortUrl(meta?.url),

      image: pickPrimaryImage(mediaByCategory.get(id) || []),
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortNode(node: CategoryNode) {
    node.children.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    node.children.forEach(sortNode);
  }

  roots.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  roots.forEach(sortNode);

  return roots;
}
