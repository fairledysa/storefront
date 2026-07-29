import "server-only";

import { loadCategoryProductsByIds } from "@/data/pages/category.loader";
import { getStoreDb } from "@/data/db/store-db.server";
import { getStoreOptions } from "@/data/store/options";
import type { BootstrapRequest } from "../bootstrap/bootstrap.types";
import { getMobileCommerceContext, type MobileCommerceContext } from "../commerce-context.server";
import { resolveActiveMobileStoreApp } from "../store-app.server";
import { buildMobileProductOptions } from "../product-options.server";
import { canShowPurchaseCount, loadProductSocialPolicy, loadProductSocialStats } from "../product-social.server";
import { buildMobileProductCard } from "../mobile-product-card.server";
import type { MobileProductCard } from "../home/home.types";
import {
  MOBILE_MARKETING_HUBS,
  MOBILE_MARKETING_ORDER,
  type MobileMarketingHubType,
} from "./marketing.config";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isLive(row: any) {
  const now = Date.now();
  const startsAt = row?.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row?.ends_at ? new Date(row.ends_at).getTime() : null;
  if (!["active", "scheduled"].includes(text(row?.status))) return false;
  if (row?.show_on_app === false) return false;
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
  "show_on_app",
  "sort_order",
  "settings",
  "created_at",
].join(",");

export type MobileMarketingBadge = {
  collection_id: string;
  slug: string;
  type: string;
  name: string;
  title: string;
  badge_text: string;
  badge_bg: string;
  badge_color: string;
  badge_icon: string;
  href: string;
};

export type MobileMarketingNavigationItem = {
  type: MobileMarketingHubType;
  label: string;
  icon: string;
  href: string;
  sort_order: number;
};

export type MobileMarketingCollection = {
  id: string;
  name: string;
  slug: string;
  type: MobileMarketingHubType;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  mobile_image_url: string | null;
  badge: {
    text: string;
    background: string;
    color: string;
    icon: string;
  };
  starts_at: string | null;
  ends_at: string | null;
  products: MobileProductCard[];
};

function fallbackBadge(type: string) {
  const config = MOBILE_MARKETING_HUBS[type as MobileMarketingHubType];
  return config?.label ?? "مجموعة";
}

function toBadge(row: any): MobileMarketingBadge {
  const settings = object(row?.settings);
  const type = text(row?.collection_type);
  const slug = text(row?.slug) || text(row?.id);
  return {
    collection_id: text(row?.id),
    slug,
    type,
    name: text(row?.name),
    title: text(row?.title) || text(row?.name),
    badge_text: text(row?.badge_text) || fallbackBadge(type),
    badge_bg: text(row?.badge_bg) || "#7C3AED",
    badge_color: text(row?.badge_color) || "#FFFFFF",
    badge_icon: text(settings.badgeIcon) || MOBILE_MARKETING_HUBS[type as MobileMarketingHubType]?.icon || "✨",
    href: `/marketing/collection/${encodeURIComponent(slug)}`,
  };
}

export async function loadMobileMarketingNavigation(input: BootstrapRequest) {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const db: any = await getStoreDb(app.storeId);
  const { data, error } = await db
    .from("store_marketing_settings")
    .select("enabled,metadata")
    .eq("store_id", app.storeId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const metadata = object(data?.metadata);
  const source = object(metadata.mainNavPages);
  const items = MOBILE_MARKETING_ORDER.flatMap((type, index) => {
    const raw = source[type];
    const config = MOBILE_MARKETING_HUBS[type];
    const rawObject = object(raw);
    const enabled = Object.keys(rawObject).length ? rawObject.enabled === true : raw === true;
    if (!enabled) return [];
    return [{
      type,
      label: text(rawObject.label) || config.label,
      icon: text(rawObject.icon) || config.icon,
      href: config.appPath,
      sort_order: Number(rawObject.sortOrder) || (index + 1) * 10,
    } satisfies MobileMarketingNavigationItem];
  }).sort((a, b) => a.sort_order - b.sort_order);

  return {
    config_version: app.configVersion,
    enabled: data?.enabled !== false && items.length > 0,
    items,
  };
}

async function loadProductsForCollection(args: {
  storeId: string;
  collection: any;
  limit?: number;
  commerce: MobileCommerceContext;
}) {
  const db: any = await getStoreDb(args.storeId);
  const { data: links, error } = await db
    .from("marketing_collection_products")
    .select("product_id,sort_order,is_pinned,is_excluded")
    .eq("store_id", args.storeId)
    .eq("collection_id", args.collection.id)
    .eq("is_excluded", false)
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  const ids = (links ?? []).map((row: any) => text(row.product_id)).filter(Boolean);
  const rows = await loadCategoryProductsByIds({
    store_id: args.storeId,
    productIds: ids,
    limit: Math.max(1, Math.min(args.limit ?? 120, 120)),
  });
  const storeOptions = await getStoreOptions(args.storeId);
  const [socialPolicy, socialStats] = await Promise.all([
    loadProductSocialPolicy(args.storeId, storeOptions),
    loadProductSocialStats(args.storeId, rows),
  ]);
  const marketing = toBadge(args.collection);

  return rows.map((row: any) => {
    const stats = socialStats.get(row.id) ?? {
      rating: null,
      reviewCount: 0,
      soldQty: Math.max(0, Number(row.sold_qty ?? 0) || 0),
    };
    return buildMobileProductCard(
      row,
      storeOptions,
      buildMobileProductOptions(row),
      {
        ...stats,
        showRating: socialPolicy.showRatingsOnApp,
        showPurchaseCount: canShowPurchaseCount(socialPolicy, row),
      },
      marketing,
      args.commerce,
    );
  });
}

function collectionView(row: any, products: MobileProductCard[]): MobileMarketingCollection {
  const badge = toBadge(row);
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug) || text(row.id),
    type: text(row.collection_type) as MobileMarketingHubType,
    title: text(row.title) || text(row.name),
    subtitle: text(row.subtitle),
    description: text(row.description),
    image_url: text(row.image_url) || null,
    mobile_image_url: text(row.mobile_image_url) || null,
    badge: {
      text: badge.badge_text,
      background: badge.badge_bg,
      color: badge.badge_color,
      icon: badge.badge_icon,
    },
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
    products,
  };
}

export async function loadMobileMarketingCollections(input: BootstrapRequest, type: MobileMarketingHubType) {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const commerce = await getMobileCommerceContext(app, input);
  const db: any = await getStoreDb(app.storeId);
  const { data, error } = await db
    .from("marketing_collections")
    .select(COLLECTION_SELECT)
    .eq("store_id", app.storeId)
    .eq("collection_type", type)
    .in("status", ["active", "scheduled"])
    .eq("show_on_app", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(isLive);
  const collections = await Promise.all(rows.map(async (row: any) =>
    collectionView(row, await loadProductsForCollection({ storeId: app.storeId, collection: row, limit: 12, commerce })),
  ));

  return {
    config_version: app.configVersion,
    type,
    hub: MOBILE_MARKETING_HUBS[type],
    collections,
  };
}

export async function loadMobileMarketingCollection(input: BootstrapRequest, slug: string) {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const commerce = await getMobileCommerceContext(app, input);
  const db: any = await getStoreDb(app.storeId);
  const identifier = decodeURIComponent(text(slug));
  const { data, error } = await db
    .from("marketing_collections")
    .select(COLLECTION_SELECT)
    .eq("store_id", app.storeId)
    .eq("slug", identifier)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !isLive(data)) return null;
  return {
    config_version: app.configVersion,
    collection: collectionView(data, await loadProductsForCollection({ storeId: app.storeId, collection: data, limit: 120, commerce })),
  };
}

export async function loadMobileProductMarketingMap(args: {
  storeId: string;
  productIds: string[];
}) {
  const ids = [...new Set(args.productIds.map(text).filter(Boolean))];
  const out = new Map<string, MobileMarketingBadge>();
  if (!ids.length) return out;

  const db: any = await getStoreDb(args.storeId);
  const { data: links, error: linksError } = await db
    .from("marketing_collection_products")
    .select("product_id,collection_id,sort_order,is_pinned,is_excluded")
    .eq("store_id", args.storeId)
    .in("product_id", ids)
    .eq("is_excluded", false)
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true });
  if (linksError) return out;

  const collectionIds = [...new Set((links ?? []).map((row: any) => text(row.collection_id)).filter(Boolean))];
  if (!collectionIds.length) return out;
  const { data: collections, error: collectionsError } = await db
    .from("marketing_collections")
    .select(COLLECTION_SELECT)
    .eq("store_id", args.storeId)
    .in("id", collectionIds)
    .in("status", ["active", "scheduled"])
    .eq("show_on_app", true)
    .order("sort_order", { ascending: true });
  if (collectionsError) return out;

  const live = new Map((collections ?? []).filter(isLive).map((row: any) => [text(row.id), row]));
  for (const link of links ?? []) {
    const productId = text(link.product_id);
    if (out.has(productId)) continue;
    const collection = live.get(text(link.collection_id));
    if (collection) out.set(productId, toBadge(collection));
  }
  return out;
}
