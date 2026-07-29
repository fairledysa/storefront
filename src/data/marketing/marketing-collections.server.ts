import "server-only";

import { getStoreDb } from "@/data/db/store-db.server";
import { loadCategoryProductsByIds } from "@/data/pages/category.loader";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function decoded(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function canonicalTypeFromPath(value: string) {
  const key = value.toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, string> = {
    trends: "trend",
    trend: "trend",
    "best-sellers": "best_seller",
    bestseller: "best_seller",
    "new-arrivals": "new_arrival",
    seasonal: "seasonal",
    clearance: "clearance",
    deals: "flash_sale",
    "flash-sale": "flash_sale",
  };
  return aliases[key] ?? "";
}

function isLive(row: any, channel: "web" | "app") {
  const now = Date.now();
  const startsAt = row?.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row?.ends_at ? new Date(row.ends_at).getTime() : null;

  if (row?.status !== "active" && row?.status !== "scheduled") return false;
  if (channel === "web" && row?.show_on_web === false) return false;
  if (channel === "app" && row?.show_on_app === false) return false;
  if (startsAt && Number.isFinite(startsAt) && startsAt > now) return false;
  if (endsAt && Number.isFinite(endsAt) && endsAt <= now) return false;

  return true;
}

const COLLECTION_SELECT = [
  "id",
  "name",
  "slug",
  "collection_type",
  "status",
  "title",
  "subtitle",
  "description",
  "image_url",
  "mobile_image_url",
  "badge_text",
  "badge_bg",
  "badge_color",
  "starts_at",
  "ends_at",
  "show_on_web",
  "show_on_app",
  "sort_order",
  "settings",
].join(",");

export type MarketingCollectionView = {
  id: string;
  name: string;
  slug: string;
  canonicalPath: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  mobileImageUrl: string;
  badge: { text: string; bg: string; color: string; icon: string } | null;
  products: any[];
};

async function findCollection(args: {
  db: any;
  storeId: string;
  identifier: string;
}) {
  const { db, storeId, identifier } = args;

  const query = db
    .from("marketing_collections")
    .select(COLLECTION_SELECT)
    .eq("store_id", storeId);

  if (isUuid(identifier)) {
    const { data, error } = await query.eq("id", identifier).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  } else {
    const { data, error } = await query.eq("slug", identifier).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const collectionType = canonicalTypeFromPath(identifier);
  if (!collectionType) return null;

  const { data, error } = await db
    .from("marketing_collections")
    .select(COLLECTION_SELECT)
    .eq("store_id", storeId)
    .eq("collection_type", collectionType)
    .in("status", ["active", "scheduled"])
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function loadMarketingCollection(args: {
  storeId: string;
  slug: string;
  channel: "web" | "app";
}): Promise<MarketingCollectionView | null> {
  const storeId = text(args.storeId);
  const identifier = decoded(args.slug);
  if (!storeId || !identifier) return null;

  const db: any = await getStoreDb(storeId);
  const collection = await findCollection({ db, storeId, identifier });

  if (!collection || !isLive(collection, args.channel)) return null;

  const { data: links, error: linksError } = await db
    .from("marketing_collection_products")
    .select("product_id,sort_order,is_pinned,is_excluded")
    .eq("store_id", storeId)
    .eq("collection_id", collection.id)
    .eq("is_excluded", false)
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true });

  if (linksError) throw new Error(linksError.message);

  const productIds = (links ?? [])
    .map((row: any) => text(row.product_id))
    .filter(Boolean);

  const products = await loadCategoryProductsByIds({
    store_id: storeId,
    productIds,
    limit: 120,
  });

  const type = text(collection.collection_type);
  const typeIdentity: Record<string, { label: string; icon: string; bg: string }> = {
    trend: { label: "ترندات", icon: "🔥", bg: "#7c3aed" },
    seasonal: { label: "موسمية", icon: "🌙", bg: "#a16207" },
    best_seller: { label: "الأفضل مبيعًا", icon: "🏆", bg: "#b7791f" },
    new_arrival: { label: "وصل حديثًا", icon: "🆕", bg: "#047857" },
    clearance: { label: "تصفية", icon: "🏷️", bg: "#dc2626" },
    flash_sale: { label: "عرض سريع", icon: "⚡", bg: "#ea580c" },
    custom: { label: "مجموعة", icon: "", bg: "#475467" },
  };
  const identity = typeIdentity[type] ?? typeIdentity.custom;
  const badgeText = text(collection.badge_text) || identity.label;
  const badge = badgeText
    ? {
        text: badgeText,
        bg: text(collection.badge_bg) || identity.bg,
        color: text(collection.badge_color) || "#ffffff",
        icon: text(collection?.settings?.badgeIcon ?? collection?.settings?.icon) || identity.icon,
      }
    : null;

  const collectionSlug = text(collection.slug) || text(collection.id);

  return {
    id: text(collection.id),
    name: text(collection.name),
    slug: collectionSlug,
    canonicalPath: `/collections/${encodeURIComponent(collectionSlug)}`,
    type,
    title: text(collection.title) || text(collection.name),
    subtitle: text(collection.subtitle),
    description: text(collection.description),
    imageUrl: text(collection.image_url),
    mobileImageUrl: text(collection.mobile_image_url),
    badge,
    products: products.map((product: any) => ({
      ...product,
      // لا نستبدل شارة المنتج الأصلية مثل "شحن مجاني".
      // معلومات المجموعة تظهر داخل بطاقة المنتج الموحدة كسطر تسويقي مستقل.
      marketing_badge: badge,
      marketingCollection: {
        id: text(collection.id),
        slug: collectionSlug,
        type,
        name: text(collection.name),
      },
    })),
  };
}
