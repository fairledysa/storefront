import "server-only";

import { getStoreDb } from "@/data/db/store-db.server";
import { loadCategoryProductsByIds } from "@/data/pages/category.loader";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function isLive(row: any) {
  const now = Date.now();
  const startsAt = row?.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row?.ends_at ? new Date(row.ends_at).getTime() : null;

  if (row?.status !== "active" && row?.status !== "scheduled") return false;
  if (row?.show_on_web === false) return false;
  if (startsAt && Number.isFinite(startsAt) && startsAt > now) return false;
  if (endsAt && Number.isFinite(endsAt) && endsAt <= now) return false;
  return true;
}

export type TrendCollectionListItem = {
  id: string;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  mobileImageUrl: string;
  canonicalPath: string;
  badge: {
    text: string;
    bg: string;
    color: string;
    icon: string;
  };
  products: any[];
  productCount: number;
};

export async function loadLiveTrendCollections(args: {
  storeId: string;
  previewProducts?: number;
}): Promise<TrendCollectionListItem[]> {
  const storeId = text(args.storeId);
  if (!storeId) return [];

  const previewProducts = Math.max(1, Math.min(8, Number(args.previewProducts) || 4));
  const db: any = await getStoreDb(storeId);

  const { data: rows, error } = await db
    .from("marketing_collections")
    .select(
      "id,name,slug,title,subtitle,description,image_url,mobile_image_url,badge_text,badge_bg,badge_color,settings,status,show_on_web,starts_at,ends_at,sort_order,updated_at",
    )
    .eq("store_id", storeId)
    .eq("collection_type", "trend")
    .in("status", ["active", "scheduled"])
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const liveRows = (rows ?? []).filter(isLive);

  const result = await Promise.all(
    liveRows.map(async (row: any) => {
      const { data: links, error: linksError } = await db
        .from("marketing_collection_products")
        .select("product_id,sort_order,is_pinned,is_excluded")
        .eq("store_id", storeId)
        .eq("collection_id", row.id)
        .eq("is_excluded", false)
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: true });

      if (linksError) throw new Error(linksError.message);

      const allIds = (links ?? [])
        .map((link: any) => text(link.product_id))
        .filter(Boolean);
      const previewIds = allIds.slice(0, previewProducts);
      const products = await loadCategoryProductsByIds({
        store_id: storeId,
        productIds: previewIds,
        limit: previewProducts,
      });

      const settings = row?.settings && typeof row.settings === "object" ? row.settings : {};
      const slug = text(row.slug) || text(row.id);
      const badgeText = text(row.badge_text) || "ترندات";
      const badgeBg = text(row.badge_bg) || "#7c3aed";
      const badgeColor = text(row.badge_color) || "#ffffff";
      const badgeIcon = text(settings.badgeIcon ?? settings.icon ?? "");

      return {
        id: text(row.id),
        name: text(row.name),
        slug,
        title: text(row.title) || text(row.name),
        subtitle: text(row.subtitle),
        description: text(row.description),
        imageUrl: text(row.image_url),
        mobileImageUrl: text(row.mobile_image_url),
        canonicalPath: `/collections/${encodeURIComponent(slug)}`,
        badge: {
          text: badgeText,
          bg: badgeBg,
          color: badgeColor,
          icon: badgeIcon,
        },
        productCount: allIds.length,
        products: products.map((product: any) => ({
          ...product,
          marketing_badge: {
            text: badgeText,
            bg: badgeBg,
            color: badgeColor,
            icon: badgeIcon,
          },
          marketingCollection: {
            id: text(row.id),
            slug,
            type: "trend",
            name: text(row.name),
          },
        })),
      } satisfies TrendCollectionListItem;
    }),
  );

  return result;
}
