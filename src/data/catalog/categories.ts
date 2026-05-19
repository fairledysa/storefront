// FILE: apps/storefront/src/data/catalog/categories.ts
import { supabaseAdmin } from "@/data/store/supabase.server";

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
  return { url: String(primary.url), alt: primary?.alt ?? null };
}

function normalizeShortUrl(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  // لو مخزن رابط كامل
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      const seg = u.pathname.split("/").filter(Boolean).pop() || "";
      return seg || null;
    }
  } catch {}

  // لو مخزن "/Nmsy"
  return s.replace(/^\/+/, "") || null;
}

// ------------------------- GRID -------------------------
export async function getCategoriesForGrid(args: {
  store_id: string;
  limit: number;
  source: "top_level" | "by_parent_slug";
  parent_slug?: string;
}): Promise<CategoryGridItem[]> {
  const sb = supabaseAdmin();

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

  let q = sb
    .from("categories")
    .select("id,name,slug,parent_id,sort_order,depth,path,public_no")
    .eq("store_id", args.store_id)
    .eq("status", "active");

  if (args.source === "top_level") q = q.is("parent_id", null);
  if (args.source === "by_parent_slug" && parentId)
    q = q.eq("parent_id", parentId);

  const r = await q
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(
      Number.isFinite(args.limit) ? Math.max(1, Math.min(args.limit, 200)) : 24,
    );

  const base = (r.data || []) as any[];
  if (!base.length) return [];

  const ids = base.map((x) => x.id).filter(Boolean);

  // metadata urls
  const metaR = await sb
    .from("category_metadata")
    .select("category_id,url")
    .in("category_id", ids);

  const metaByCat = new Map<string, any>();
  for (const m of (metaR.data || []) as any[])
    metaByCat.set(String(m.category_id), m);

  // media
  const mediaR = await sb
    .from("category_media")
    .select("category_id,url,alt,is_primary,sort_order")
    .eq("store_id", args.store_id)
    .in("category_id", ids)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const mediaByCat = new Map<string, any[]>();
  for (const m of (mediaR.data || []) as any[]) {
    const k = String(m.category_id);
    if (!mediaByCat.has(k)) mediaByCat.set(k, []);
    mediaByCat.get(k)!.push(m);
  }

  return base.map((c) => {
    const meta = metaByCat.get(String(c.id));
    return {
      id: String(c.id),
      name: String(c.name),
      slug: String(c.slug),
      parent_id: c.parent_id ? String(c.parent_id) : null,
      sort_order: Number(c.sort_order ?? 0),
      depth: Number(c.depth ?? 1),
      path: String(c.path ?? "/"),

      public_no: Number(c.public_no),
      short_url: normalizeShortUrl(meta?.url),

      image: pickPrimaryImage(mediaByCat.get(String(c.id)) || []),
    };
  });
}

// ------------------------- TREE -------------------------
export async function getCategoriesTree(args: {
  store_id: string;
  max_depth: number;
}): Promise<CategoryNode[]> {
  const sb = supabaseAdmin();

  const maxDepth = Number.isFinite(args.max_depth)
    ? Math.max(1, Math.min(args.max_depth, 6))
    : 6;

  const r = await sb
    .from("categories")
    .select("id,name,slug,parent_id,sort_order,depth,path,public_no")
    .eq("store_id", args.store_id)
    .eq("status", "active")
    .lte("depth", maxDepth)
    .order("depth", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const base = (r.data || []) as any[];
  if (!base.length) return [];

  const ids = base.map((x) => x.id).filter(Boolean);

  const metaR = await sb
    .from("category_metadata")
    .select("category_id,url")
    .in("category_id", ids);

  const metaByCat = new Map<string, any>();
  for (const m of (metaR.data || []) as any[])
    metaByCat.set(String(m.category_id), m);

  const mediaR = await sb
    .from("category_media")
    .select("category_id,url,alt,is_primary,sort_order")
    .eq("store_id", args.store_id)
    .in("category_id", ids)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const mediaByCat = new Map<string, any[]>();
  for (const m of (mediaR.data || []) as any[]) {
    const k = String(m.category_id);
    if (!mediaByCat.has(k)) mediaByCat.set(k, []);
    mediaByCat.get(k)!.push(m);
  }

  const byId = new Map<string, CategoryNode>();
  for (const c of base) {
    const meta = metaByCat.get(String(c.id));
    byId.set(String(c.id), {
      id: String(c.id),
      name: String(c.name),
      slug: String(c.slug),
      parent_id: c.parent_id ? String(c.parent_id) : null,
      sort_order: Number(c.sort_order ?? 0),
      depth: Number(c.depth ?? 1),
      path: String(c.path ?? "/"),

      public_no: Number(c.public_no),
      short_url: normalizeShortUrl(meta?.url),

      image: pickPrimaryImage(mediaByCat.get(String(c.id)) || []),
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

  function sortNode(n: CategoryNode) {
    n.children.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    n.children.forEach(sortNode);
  }

  roots.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  roots.forEach(sortNode);

  return roots;
}
