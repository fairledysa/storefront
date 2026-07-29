// FILE: apps/storefront/src/data/catalog/products.ts
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getStoreDb } from "@/data/db/store-db.server";
import { getOrdersDb } from "@/data/db/orders-db.server";

export type ProductCategoryMini = {
  id: string;
  public_no: number | null;
  name: string;
  is_primary?: boolean;
};

export type ProductMediaMini = {
  id: string;
  url: string;
  original_url?: string;
  thumbnail_url?: string | null;
  media_kind?: "image" | "video";
  is_default?: boolean;
  sort_order?: number;
};

export type ProductSEOData = {
  created_at?: string | null;

  seo_title?: string | null;
  seo_description?: string | null;

  og_image_url?: string | null;

  brand_name?: string | null;

  currency?: string | null;
  price?: number | null;
  sale_price?: number | null;
  sale_end?: string | null;

  in_stock?: boolean | null;

  categories?: ProductCategoryMini[];
};

export type ProductRow = {
  id: string;
  store_id: string;

  name: string;
  description?: string | null;
  status: string;

  public_no?: number | null;
  sold_qty?: number;

  display_order?: number | null;
  displayOrder?: number | null;

  brand_id?: string | null;

  short_url?: string | null;

  image_url?: string | null;
  thumbnail_url?: string | null;
  media?: ProductMediaMini[];

  seo?: ProductSEOData;

  metadata?: Record<string, any> | null;

  pricing?: {
    currency: string;
    price: number;
    sale_price: number | null;
    sale_end: string | null;
  } | null;

  stock?: {
    quantity: number;
    unlimited_quantity: boolean;
  } | null;

  options?: Array<{
    id: string;
    name: string;
    sort_order: number;
    option_field_type?: string | null;
    display_type?: string | null;
    values?: Array<{
      id: string;
      name: string;
      display_value?: string | null;
      image_url?: string | null;
      quantity?: number | null;
      is_default?: boolean;
      sort_order: number;
    }>;
  }>;

  variants?: Array<{
    id: string;
    price: number;
    sale_price: number | null;
    stock_quantity: number;
    unlimited_quantity: boolean;
    is_default: boolean;
    option_value_ids?: string[];
    option_values?: Array<{
      id: string;
      option_id: string;
      name: string;
      display_value: string | null;
      image_url: string | null;
    }>;
  }>;
};

export type CatalogProductSort =
  | "recommended"
  | "latest"
  | "popular"
  | "price_asc"
  | "price_desc";

function s(x: any) {
  return String(x ?? "").trim();
}

function uniqueStrings(values: any[]) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => s(value))
        .filter(Boolean),
    ),
  );
}

function readOne(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeChannelKey(x: any) {
  return s(x).toLowerCase();
}

function getMetadataChannels(metadata: any): string[] | null {
  const raw = metadata?.channels;
  if (!Array.isArray(raw)) return null;

  const out = raw.map((x: any) => normalizeChannelKey(x)).filter(Boolean);

  return Array.from(new Set(out));
}

function readMetaBool(meta: any, keys: string[]) {
  for (const key of keys) {
    const value = meta?.[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    if (typeof value === "string") {
      const v = String(value).trim().toLowerCase();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
  }

  return null;
}

function readDisplayOrder(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const text = s(value);
  if (!text) return null;

  const n = Number(text);
  if (!Number.isFinite(n)) return null;

  const int = Math.floor(n);
  return int > 0 ? int : null;
}

function compareDisplayOrder(a: any, b: any) {
  const aOrder = readDisplayOrder(a?.display_order ?? a?.displayOrder);
  const bOrder = readDisplayOrder(b?.display_order ?? b?.displayOrder);

  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  if (aOrder !== null && bOrder === null) return -1;
  if (aOrder === null && bOrder !== null) return 1;

  return 0;
}

function getCreatedTime(row: any) {
  const value = row?.created_at ?? row?.seo?.created_at ?? null;
  const time = new Date(value ?? 0).getTime();

  return Number.isFinite(time) ? time : 0;
}

function compareCreatedDesc(a: any, b: any) {
  return getCreatedTime(b) - getCreatedTime(a);
}

function compareCategoryProductRows(a: any, b: any) {
  const displayOrderCompare = compareDisplayOrder(a, b);
  if (displayOrderCompare !== 0) return displayOrderCompare;

  const aCategoryOrder =
    a?.__category_sort_order === null || a?.__category_sort_order === undefined
      ? null
      : Number(a.__category_sort_order);

  const bCategoryOrder =
    b?.__category_sort_order === null || b?.__category_sort_order === undefined
      ? null
      : Number(b.__category_sort_order);

  const aHasCategoryOrder =
    aCategoryOrder !== null && Number.isFinite(aCategoryOrder);
  const bHasCategoryOrder =
    bCategoryOrder !== null && Number.isFinite(bCategoryOrder);

  if (aHasCategoryOrder && bHasCategoryOrder && aCategoryOrder !== bCategoryOrder) {
    return aCategoryOrder - bCategoryOrder;
  }

  if (aHasCategoryOrder && !bHasCategoryOrder) return -1;
  if (!aHasCategoryOrder && bHasCategoryOrder) return 1;

  const createdCompare = compareCreatedDesc(a, b);
  if (createdCompare !== 0) return createdCompare;

  return Number(a?.__fallback_rank ?? 0) - Number(b?.__fallback_rank ?? 0);
}

function normalizeCatalogProductSort(value: unknown): CatalogProductSort {
  const text = s(value).toLowerCase();

  if (text === "latest" || text === "newest" || text === "new") {
    return "latest";
  }

  if (text === "popular" || text === "best_selling" || text === "best-selling") {
    return "popular";
  }

  if (text === "price_asc" || text === "price-asc" || text === "low_price") {
    return "price_asc";
  }

  if (text === "price_desc" || text === "price-desc" || text === "high_price") {
    return "price_desc";
  }

  return "recommended";
}

function compareTextId(a: any, b: any) {
  return s(a?.id).localeCompare(s(b?.id));
}

function readCatalogPrice(row: any) {
  const value = Number(row?.__catalog_price);
  return Number.isFinite(value) && value >= 0 ? value : Number.POSITIVE_INFINITY;
}

function readCatalogSoldQty(row: any) {
  const value = Number(row?.__catalog_sold_qty ?? row?.sold_qty ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function compareCatalogProductRows(a: any, b: any, sort: CatalogProductSort) {
  if (sort === "latest") {
    const created = compareCreatedDesc(a, b);
    return created !== 0 ? created : compareTextId(a, b);
  }

  if (sort === "popular") {
    const sold = readCatalogSoldQty(b) - readCatalogSoldQty(a);
    if (sold !== 0) return sold;

    const created = compareCreatedDesc(a, b);
    return created !== 0 ? created : compareTextId(a, b);
  }

  if (sort === "price_asc" || sort === "price_desc") {
    const aPrice = readCatalogPrice(a);
    const bPrice = readCatalogPrice(b);
    const aHasPrice = Number.isFinite(aPrice);
    const bHasPrice = Number.isFinite(bPrice);

    // المنتجات التي لا تملك سعرًا صالحًا تبقى في نهاية النتائج في الاتجاهين.
    if (aHasPrice && !bHasPrice) return -1;
    if (!aHasPrice && bHasPrice) return 1;

    if (aHasPrice && bHasPrice && aPrice !== bPrice) {
      return sort === "price_asc" ? aPrice - bPrice : bPrice - aPrice;
    }

    const created = compareCreatedDesc(a, b);
    return created !== 0 ? created : compareTextId(a, b);
  }

  return compareCategoryProductRows(a, b);
}

const POPULAR_ORDER_STATUSES = [
  "pending",
  "paid",
  "completed",
  "shipped",
] as const;

async function loadCatalogSoldQtyRaw(store_id: string): Promise<Record<string, number>> {
  const storeId = s(store_id);
  if (!storeId) return {};

  const ordersDb = await getOrdersDb(storeId);
  const pageSize = 1000;
  const totals = new Map<string, number>();

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await ordersDb
      .from("order_items")
      .select("id,product_id,qty,orders!inner(status)")
      .eq("store_id", storeId)
      .not("product_id", "is", null)
      .in("orders.status", [...POPULAR_ORDER_STATUSES])
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`CATALOG_POPULAR_ORDER_ITEMS_FAILED: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];

    for (const row of rows) {
      const productId = s(row?.product_id);
      const qty = Number(row?.qty ?? 0);

      if (!productId || !Number.isFinite(qty) || qty <= 0) continue;

      totals.set(productId, (totals.get(productId) || 0) + qty);
    }

    if (rows.length < pageSize) break;
  }

  return Object.fromEntries(totals);
}

const catalogSoldQtyCache = new Map<
  string,
  () => Promise<Record<string, number>>
>();

function loadCatalogSoldQty(store_id: string) {
  const storeId = s(store_id);
  const key = storeId;

  let fn = catalogSoldQtyCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadCatalogSoldQtyRaw(storeId),
      ["catalog-popular-order-items-v1", storeId],
      { revalidate: 60 },
    );

    catalogSoldQtyCache.set(key, fn);
  }

  return fn();
}

export async function getCatalogProductPurchaseQuantities(store_id: string) {
  return await loadCatalogSoldQty(store_id);
}

async function attachCatalogSortMetrics(args: {
  sb: any;
  store_id: string;
  products: any[];
  sort: CatalogProductSort;
}) {
  const products = Array.isArray(args.products) ? args.products : [];

  if (!products.length || args.sort === "recommended" || args.sort === "latest") {
    return products;
  }

  const ids = uniqueStrings(products.map((product) => product?.id));
  if (!ids.length) return products;

  const priceByProductId = new Map<string, number>();
  const soldQtyByProductId = new Map<string, number>();

  if (args.sort === "popular") {
    const catalogSoldQty = await loadCatalogSoldQty(args.store_id);

    for (const productId of ids) {
      const soldQty = Number(catalogSoldQty[productId] ?? 0);

      if (Number.isFinite(soldQty) && soldQty > 0) {
        soldQtyByProductId.set(productId, soldQty);
      }
    }
  }

  for (let index = 0; index < ids.length; index += 400) {
    const chunk = ids.slice(index, index + 400);

    if (args.sort === "price_asc" || args.sort === "price_desc") {
      const { data } = await args.sb
        .from("product_pricing")
        .select("product_id,price,sale_price,sale_end")
        .in("product_id", chunk);

      for (const row of Array.isArray(data) ? data : []) {
        const productId = s(row?.product_id);
        if (!productId) continue;

        const basePrice = Number(row?.price ?? 0);
        const salePrice = Number(row?.sale_price);
        const saleEnd = row?.sale_end ? new Date(row.sale_end).getTime() : null;
        const saleIsCurrent =
          Number.isFinite(salePrice) &&
          salePrice > 0 &&
          (saleEnd === null || (Number.isFinite(saleEnd) && saleEnd >= Date.now()));
        const effectivePrice = saleIsCurrent ? salePrice : basePrice;

        if (!Number.isFinite(effectivePrice) || effectivePrice < 0) continue;

        const current = priceByProductId.get(productId);
        if (current === undefined || effectivePrice < current) {
          priceByProductId.set(productId, effectivePrice);
        }
      }
    }

  }

  return products.map((product) => ({
    ...product,
    __catalog_price: priceByProductId.get(s(product?.id)),
    __catalog_sold_qty: soldQtyByProductId.get(s(product?.id)),
  }));
}

function isPublishedStatus(status: any) {
  const v = s(status).toLowerCase();

  if (
    v === "hidden" ||
    v === "draft" ||
    v === "archived" ||
    v === "inactive" ||
    v === "deleted"
  ) {
    return false;
  }

  if (
    v === "active" ||
    v === "sale" ||
    v === "published" ||
    v === "public"
  ) {
    return true;
  }

  return true;
}

const WEB_CHANNEL_KEYS = new Set([
  "web",
  "website",
  "storefront",
  "store",
  "online_store",
  "site",
]);

export function isProductVisibleInWeb(input: { status?: any; metadata?: any }) {
  if (!isPublishedStatus(input?.status)) return false;

  const hiddenMeta = readMetaBool(input?.metadata, [
    "is_hidden",
    "hidden",
    "hide_product",
    "product_hidden",
  ]);

  if (hiddenMeta === true) return false;

  const channels = getMetadataChannels(input?.metadata);

  if (channels) {
    return channels.some((ch) => WEB_CHANNEL_KEYS.has(ch));
  }

  return true;
}

function pickImage(mediaRows: any[]): {
  image_url: string | null;
  thumbnail_url: string | null;
  media: ProductMediaMini[];
} {
  const arr = (mediaRows || []).filter(Boolean);

  arr.sort((a, b) => {
    const ad = a?.is_default ? 1 : 0;
    const bd = b?.is_default ? 1 : 0;
    if (bd !== ad) return bd - ad;
    const as = Number(a?.sort_order ?? 0);
    const bs = Number(b?.sort_order ?? 0);
    return as - bs;
  });

  const media: ProductMediaMini[] = arr
    .map((m) => {
      const originalUrl = s(m?.original_url || m?.url || m?.src);
      if (!originalUrl) return null;

      return {
        id: String(m?.id ?? originalUrl),
        url: originalUrl,
        original_url: originalUrl,
        thumbnail_url: m?.thumbnail_url ?? null,
        media_kind: (m?.media_kind || "image") as "image" | "video",
        is_default: !!m?.is_default,
        sort_order: Number(m?.sort_order ?? 0),
      };
    })
    .filter(Boolean) as ProductMediaMini[];

  const img =
    media.find((x) => x.media_kind === "image" && x.url) ??
    media.find((x) => x.url) ??
    null;

  return {
    image_url: img?.url ?? null,
    thumbnail_url: img?.thumbnail_url ?? null,
    media,
  };
}

function productMetadataFromRow(row: any) {
  const pm = readOne(row?.product_metadata);
  if (!pm) return null;

  return {
    url: pm.url ?? null,
    title: pm.title ?? null,
    description: pm.description ?? null,
  };
}

const BASE_SELECT =
  "id,store_id,name,description,status,public_no,display_order,created_at,brand_id,metadata,product_metadata(url,title,description)";

type ProductBulkMaps = {
  pricingByProductId: Map<string, any>;
  stockByProductId: Map<string, any>;
  mediaByProductId: Map<string, any[]>;
  brandById: Map<string, any>;
  categoriesByProductId: Map<string, ProductCategoryMini[]>;
  optionsByProductId: Map<string, any[]>;
  variantsByProductId: Map<string, any[]>;
  soldQtyByProductId?: Map<string, number>;
};

function mapBaseProductRowFromBulk(row: any, maps: ProductBulkMaps): ProductRow {
  const product_metadata = productMetadataFromRow(row);
  const productId = String(row.id);

  const pricing = maps.pricingByProductId.get(productId) ?? null;
  const stock = maps.stockByProductId.get(productId) ?? null;
  const mediaRows = maps.mediaByProductId.get(productId) ?? [];
  const brand = row.brand_id ? maps.brandById.get(String(row.brand_id)) : null;
  const categories = maps.categoriesByProductId.get(productId) ?? [];
  const optionsRows = maps.optionsByProductId.get(productId) ?? [];
  const variantsRows = maps.variantsByProductId.get(productId) ?? [];

  const { image_url, thumbnail_url, media } = pickImage(mediaRows);

  const qty = Number(stock?.quantity ?? 0);
  const unlimited = Boolean(stock?.unlimited_quantity ?? false);
  const inStock = unlimited ? true : qty > 0;

  const metadata =
    row?.metadata && typeof row.metadata === "object" ? row.metadata : null;

  const displayOrder = readDisplayOrder(row?.display_order);

  const seo: ProductSEOData = {
    created_at: row.created_at ?? null,
    seo_title: product_metadata?.title ?? null,
    seo_description: product_metadata?.description ?? null,
    og_image_url: image_url,
    brand_name: brand?.name ?? null,
    currency: pricing?.currency ?? "SAR",
    price:
      pricing?.price === null || pricing?.price === undefined
        ? null
        : Number(pricing.price),
    sale_price:
      pricing?.sale_price === null || pricing?.sale_price === undefined
        ? null
        : Number(pricing.sale_price),
    sale_end:
      pricing?.sale_end === null || pricing?.sale_end === undefined
        ? null
        : String(pricing.sale_end),
    in_stock: inStock,
    categories,
  };

  return {
    id: row.id,
    store_id: row.store_id,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    public_no: row.public_no ?? null,
    sold_qty: Number(
      maps.soldQtyByProductId?.get(productId) ?? row?.sold_qty ?? 0,
    ),

    display_order: displayOrder,
    displayOrder,

    brand_id: row.brand_id ?? null,

    short_url: product_metadata?.url ?? null,
    image_url,
    thumbnail_url,
    media,
    seo,
    metadata,

    pricing: pricing
      ? {
          currency: String(pricing.currency ?? "SAR"),
          price: Number(pricing.price ?? 0),
          sale_price:
            pricing.sale_price === null || pricing.sale_price === undefined
              ? null
              : Number(pricing.sale_price),
          sale_end:
            pricing.sale_end === null || pricing.sale_end === undefined
              ? null
              : String(pricing.sale_end),
        }
      : {
          currency: "SAR",
          price: 0,
          sale_price: null,
          sale_end: null,
        },

    stock: stock
      ? {
          quantity: Number(stock.quantity ?? 0),
          unlimited_quantity: !!stock.unlimited_quantity,
        }
      : {
          quantity: 0,
          unlimited_quantity: false,
        },

    options: optionsRows.map((o) => ({
      id: String(o.id),
      name: String(o.name ?? ""),
      sort_order: Number(o.sort_order ?? 0),
      option_field_type: o.option_field_type == null ? null : String(o.option_field_type),
      display_type: o.display_type == null ? null : String(o.display_type),
      values: Array.isArray(o.values)
        ? o.values.map((v: any) => ({
            id: String(v.id),
            name: String(v.name ?? ""),
            display_value: v.display_value == null ? null : String(v.display_value),
            image_url: v.image_url == null ? null : String(v.image_url),
            quantity: v.quantity === null || v.quantity === undefined ? null : Number(v.quantity),
            is_default: !!v.is_default,
            sort_order: Number(v.sort_order ?? 0),
          }))
        : [],
    })),

    variants: variantsRows.map((v) => ({
      id: String(v.id),
      price: Number(v.price ?? 0),
      sale_price:
        v.sale_price === null || v.sale_price === undefined
          ? null
          : Number(v.sale_price),
      stock_quantity: Number(v.stock_quantity ?? 0),
      unlimited_quantity: !!v.unlimited_quantity,
      is_default: !!v.is_default,
      option_value_ids: Array.isArray(v.option_value_ids) ? v.option_value_ids.map(String).filter(Boolean) : [],
      option_values: Array.isArray(v.option_values) ? v.option_values.map((value: any) => ({
        id: String(value.id),
        option_id: String(value.option_id),
        name: String(value.name ?? ""),
        display_value: value.display_value == null ? null : String(value.display_value),
        image_url: value.image_url == null ? null : String(value.image_url),
      })) : [],
    })),
  };
}

async function mapProductRowsBulk(
  rowsInput: any[],
  extra?: { soldQtyByProductId?: Map<string, number> },
): Promise<ProductRow[]> {
  const rows = (Array.isArray(rowsInput) ? rowsInput : []).filter(Boolean);
  if (!rows.length) return [];

  const storeId = s(rows[0]?.store_id);
  if (!storeId) return [];

  const sb = await getStoreDb(storeId);

  const productIds = Array.from(
    new Set(rows.map((row) => String(row?.id ?? "")).filter(Boolean)),
  );

  if (!productIds.length) return [];

  const brandIds = Array.from(
    new Set(rows.map((row) => String(row?.brand_id ?? "")).filter(Boolean)),
  );

  const [
    pricingR,
    stockR,
    mediaR,
    optionsR,
    variantsR,
    brandsR,
    productCategoriesR,
  ] = await Promise.all([
    sb
      .from("product_pricing")
      .select("product_id,currency,price,sale_price,sale_end")
      .in("product_id", productIds),

    sb
      .from("product_stock")
      .select("product_id,quantity,unlimited_quantity")
      .in("product_id", productIds),

    sb
      .from("product_media")
      .select(
        "id,product_id,media_kind,original_url,thumbnail_url,is_default,sort_order",
      )
      .in("product_id", productIds),

    sb
      .from("product_options")
      .select("id,product_id,name,option_field_type,display_type,sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),

    sb
      .from("product_variants")
      .select(
        "id,product_id,price,sale_price,stock_quantity,unlimited_quantity,is_default,created_at",
      )
      .in("product_id", productIds)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),

    brandIds.length
      ? sb.from("brands").select("id,name").in("id", brandIds)
      : Promise.resolve({ data: [] } as any),

    sb
      .from("product_categories")
      .select("product_id,category_id,is_primary")
      .in("product_id", productIds),
  ]);

  const optionRows = (optionsR.data || []) as any[];
  const optionIds = optionRows.map((row) => String(row.id)).filter(Boolean);
  const optionValuesR = optionIds.length
    ? await sb
        .from("product_option_values")
        .select("id,option_id,name,display_value,image_url,quantity,is_default,sort_order")
        .in("option_id", optionIds)
        .order("sort_order", { ascending: true })
    : ({ data: [] } as any);

  const optionValueRows = (optionValuesR.data || []) as any[];
  const optionValueById = new Map<string, any>(
    optionValueRows.map((value) => [String(value.id), value]),
  );

  const variantRows = (variantsR.data || []) as any[];
  const variantIds = variantRows.map((variant) => String(variant.id)).filter(Boolean);
  const variantLinksR = variantIds.length
    ? await sb
        .from("variant_option_values")
        .select("variant_id,option_value_id")
        .in("variant_id", variantIds)
    : ({ data: [] } as any);

  if ((variantLinksR as any).error) {
    throw new Error(`PRODUCT_VARIANT_OPTION_LINKS_FAILED: ${(variantLinksR as any).error.message}`);
  }

  const optionValueIdsByVariantId = new Map<string, string[]>();
  for (const link of variantLinksR.data || []) {
    const variantId = String(link.variant_id ?? "");
    const optionValueId = String(link.option_value_id ?? "");
    if (!variantId || !optionValueId) continue;
    const current = optionValueIdsByVariantId.get(variantId) || [];
    if (!current.includes(optionValueId)) current.push(optionValueId);
    optionValueIdsByVariantId.set(variantId, current);
  }

  const valuesByOptionId = new Map<string, any[]>();
  for (const value of optionValueRows) {
    const optionId = String(value.option_id);
    const values = valuesByOptionId.get(optionId) || [];
    values.push(value);
    valuesByOptionId.set(optionId, values);
  }

  for (const option of optionRows) {
    option.values = valuesByOptionId.get(String(option.id)) || [];
  }

  const pricingByProductId = new Map<string, any>();
  for (const row of pricingR.data || []) {
    pricingByProductId.set(String(row.product_id), row);
  }

  const stockByProductId = new Map<string, any>();
  for (const row of stockR.data || []) {
    stockByProductId.set(String(row.product_id), row);
  }

  const mediaByProductId = new Map<string, any[]>();
  for (const row of mediaR.data || []) {
    const productId = String(row.product_id);
    const arr = mediaByProductId.get(productId) || [];
    arr.push(row);
    mediaByProductId.set(productId, arr);
  }

  const optionsByProductId = new Map<string, any[]>();
  for (const row of optionsR.data || []) {
    const productId = String(row.product_id);
    const arr = optionsByProductId.get(productId) || [];
    arr.push(row);
    optionsByProductId.set(productId, arr);
  }

  const variantsByProductId = new Map<string, any[]>();
  for (const row of variantRows) {
    const productId = String(row.product_id);
    const variantId = String(row.id);
    const optionValueIds = optionValueIdsByVariantId.get(variantId) || [];
    const enrichedVariant = {
      ...row,
      option_value_ids: optionValueIds,
      option_values: optionValueIds
        .map((valueId) => optionValueById.get(valueId))
        .filter(Boolean),
    };
    const arr = variantsByProductId.get(productId) || [];
    arr.push(enrichedVariant);
    variantsByProductId.set(productId, arr);
  }

  const brandById = new Map<string, any>();
  for (const row of brandsR.data || []) {
    brandById.set(String(row.id), row);
  }

  const productCategoryRows = (productCategoriesR.data || []) as any[];
  const categoryIds = Array.from(
    new Set(
      productCategoryRows
        .map((row) => String(row?.category_id ?? ""))
        .filter(Boolean),
    ),
  );

  const categoriesById = new Map<string, any>();

  if (categoryIds.length) {
    const catsR = await sb
      .from("categories")
      .select("id,name,public_no,sort_order")
      .in("id", categoryIds);

    for (const row of catsR.data || []) {
      categoriesById.set(String(row.id), row);
    }
  }

  const categoriesByProductId = new Map<string, ProductCategoryMini[]>();

  for (const link of productCategoryRows) {
    const productId = String(link?.product_id ?? "");
    const categoryId = String(link?.category_id ?? "");
    if (!productId || !categoryId) continue;

    const cat = categoriesById.get(categoryId);
    if (!cat) continue;

    const arr = categoriesByProductId.get(productId) || [];

    arr.push({
      id: String(cat.id),
      name: String(cat.name ?? ""),
      public_no: cat.public_no ?? null,
      is_primary: !!link?.is_primary,
    });

    categoriesByProductId.set(productId, arr);
  }

  for (const [productId, arr] of categoriesByProductId.entries()) {
    arr.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    categoriesByProductId.set(productId, arr);
  }

  const maps: ProductBulkMaps = {
    pricingByProductId,
    stockByProductId,
    mediaByProductId,
    brandById,
    categoriesByProductId,
    optionsByProductId,
    variantsByProductId,
    soldQtyByProductId: extra?.soldQtyByProductId,
  };

  return rows.map((row) => mapBaseProductRowFromBulk(row, maps));
}

async function enrichProductSEO(args: {
  sb: SupabaseClient;
  store_id: string;
  product_id: string;
  brand_id: string | null;
  created_at: string | null;
  product_metadata: {
    url?: string | null;
    title?: string | null;
    description?: string | null;
  } | null;
}): Promise<{
  seo: ProductSEOData;
  image_url: string | null;
  thumbnail_url: string | null;
  media: ProductMediaMini[];
}> {
  const { sb, store_id, product_id, brand_id, created_at, product_metadata } =
    args;

  const [pricingR, stockR, mediaR, brandR, linksR] = await Promise.all([
    sb
      .from("product_pricing")
      .select("currency,price,sale_price,sale_end")
      .eq("product_id", product_id)
      .maybeSingle(),

    sb
      .from("product_stock")
      .select("quantity,unlimited_quantity")
      .eq("product_id", product_id)
      .maybeSingle(),

    sb
      .from("product_media")
      .select("id,media_kind,original_url,thumbnail_url,is_default,sort_order")
      .eq("store_id", store_id)
      .eq("product_id", product_id),

    brand_id
      ? sb
          .from("brands")
          .select("name")
          .eq("store_id", store_id)
          .eq("id", brand_id)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),

    sb
      .from("product_categories")
      .select("category_id,is_primary")
      .eq("product_id", product_id),
  ]);

  const pricing = pricingR.data as any | null;
  const stock = stockR.data as any | null;
  const mediaRows = (mediaR.data || []) as any[];
  const brand = (brandR as any).data as any | null;
  const links = (linksR.data || []) as any[];

  const categoryIds = links.map((x) => x.category_id).filter(Boolean);
  let categories: ProductCategoryMini[] = [];

  if (categoryIds.length) {
    const catsR = await sb
      .from("categories")
      .select("id,name,public_no,sort_order")
      .eq("store_id", store_id)
      .in("id", categoryIds);

    const cats = (catsR.data || []) as any[];

    const isPrimaryMap = new Map<string, boolean>();
    for (const l of links) isPrimaryMap.set(l.category_id, !!l.is_primary);

    cats.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    categories = cats.map((c) => ({
      id: c.id,
      name: c.name,
      public_no: c.public_no ?? null,
      is_primary: isPrimaryMap.get(c.id) ?? false,
    }));
  }

  const { image_url, thumbnail_url, media } = pickImage(mediaRows);

  const qty = Number(stock?.quantity ?? 0);
  const unlimited = Boolean(stock?.unlimited_quantity ?? false);
  const inStock = unlimited ? true : qty > 0;

  const seo: ProductSEOData = {
    created_at: created_at ?? null,
    seo_title: product_metadata?.title ?? null,
    seo_description: product_metadata?.description ?? null,
    og_image_url: image_url,
    brand_name: brand?.name ?? null,
    currency: pricing?.currency ?? "SAR",
    price:
      pricing?.price === null || pricing?.price === undefined
        ? null
        : Number(pricing.price),
    sale_price:
      pricing?.sale_price === null || pricing?.sale_price === undefined
        ? null
        : Number(pricing.sale_price),
    sale_end:
      pricing?.sale_end === null || pricing?.sale_end === undefined
        ? null
        : String(pricing.sale_end),
    in_stock: inStock,
    categories,
  };

  return { seo, image_url, thumbnail_url, media };
}

async function mapBaseProductRow(
  row: any,
  extra?: { sold_qty?: number },
): Promise<ProductRow> {
  const product = await mapProductRowsBulk(
    [row],
    extra?.sold_qty
      ? {
          soldQtyByProductId: new Map([
            [String(row.id), Number(extra.sold_qty)],
          ]),
        }
      : undefined,
  );

  return product[0];
}

async function getProductByIdRaw(opts: { store_id: string; id: string }) {
  const sb = await getStoreDb(opts.store_id);

  const r = await sb
    .from("products")
    .select(BASE_SELECT)
    .eq("store_id", opts.store_id)
    .eq("id", opts.id)
    .limit(1)
    .maybeSingle();

  const row: any = r.data;
  if (!row) return null;
  if (!isProductVisibleInWeb(row)) return null;

  return await mapBaseProductRow(row);
}

async function getProductByPublicNoRaw(opts: {
  store_id: string;
  public_no: number;
}) {
  const sb = await getStoreDb(opts.store_id);

  const r = await sb
    .from("products")
    .select(BASE_SELECT)
    .eq("store_id", opts.store_id)
    .eq("public_no", opts.public_no)
    .limit(1)
    .maybeSingle();

  const row: any = r.data;
  if (!row) return null;
  if (!isProductVisibleInWeb(row)) return null;

  return await mapBaseProductRow(row);
}

async function getProductByShortUrlRaw(opts: {
  store_id: string;
  short_url: string;
}) {
  const sb = await getStoreDb(opts.store_id);

  const metaR = await sb
    .from("product_metadata")
    .select("product_id,url,title,description")
    .eq("url", opts.short_url)
    .limit(1)
    .maybeSingle();

  const meta: any = metaR.data;
  if (!meta?.product_id) return null;

  const pR = await sb
    .from("products")
    .select(BASE_SELECT)
    .eq("store_id", opts.store_id)
    .eq("id", meta.product_id)
    .limit(1)
    .maybeSingle();

  const row: any = pR.data;
  if (!row) return null;
  if (!isProductVisibleInWeb(row)) return null;

  row.product_metadata = {
    url: meta.url ?? null,
    title: meta.title ?? null,
    description: meta.description ?? null,
  };

  return await mapBaseProductRow(row);
}

const productByIdCache = new Map<string, () => Promise<ProductRow | null>>();
const productByPublicNoCache = new Map<
  string,
  () => Promise<ProductRow | null>
>();
const productByShortUrlCache = new Map<
  string,
  () => Promise<ProductRow | null>
>();

export async function getProductById(opts: { store_id: string; id: string }) {
  const key = `${opts.store_id}:${opts.id}`;
  let fn = productByIdCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getProductByIdRaw(opts),
      ["product-by-id-v3-variant-stock", opts.store_id, opts.id],
      { revalidate: 60 },
    );

    productByIdCache.set(key, fn);
  }

  return fn();
}

export async function getProductByPublicNo(opts: {
  store_id: string;
  public_no: number;
}) {
  const key = `${opts.store_id}:${opts.public_no}`;
  let fn = productByPublicNoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getProductByPublicNoRaw(opts),
      ["product-by-public-no-v3-variant-stock", opts.store_id, String(opts.public_no)],
      { revalidate: 60 },
    );

    productByPublicNoCache.set(key, fn);
  }

  return fn();
}

export async function getProductByShortUrl(opts: {
  store_id: string;
  short_url: string;
}) {
  const key = `${opts.store_id}:${opts.short_url}`;
  let fn = productByShortUrlCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getProductByShortUrlRaw(opts),
      ["product-by-short-url-v3-variant-stock", opts.store_id, opts.short_url],
      { revalidate: 60 },
    );

    productByShortUrlCache.set(key, fn);
  }

  return fn();
}

async function getProductsByCategoryRaw(opts: {
  store_id: string;
  category_id: string;
  limit: number;
  offset?: number;
  sort?: CatalogProductSort | string | null;
}) {
  return getProductsByCategoriesRaw({
    store_id: opts.store_id,
    category_ids: [opts.category_id],
    limit: opts.limit,
    offset: opts.offset,
    sort: opts.sort,
  });
}

async function getProductsByCategoriesRaw(opts: {
  store_id: string;
  category_ids: string[];
  limit: number;
  offset?: number;
  sort?: CatalogProductSort | string | null;
}) {
  const sb = await getStoreDb(opts.store_id);
  const limit = Math.min(Math.max(Number(opts.limit ?? 24), 1), 200);
  const offsetValue = Number(opts.offset ?? 0);
  const offset = Number.isFinite(offsetValue)
    ? Math.max(0, Math.min(Math.floor(offsetValue), 5000))
    : 0;
  const sort = normalizeCatalogProductSort(opts.sort);
  const requiredRows = offset + limit;
  const fetchLimit =
    sort === "recommended"
      ? Math.min(Math.max(requiredRows * 4, limit), 20000)
      : 20000;
  const categoryIds = uniqueStrings(opts.category_ids).slice(0, 250);

  if (!s(opts.store_id) || !categoryIds.length) return [] as ProductRow[];

  const firstR = await sb
    .from("category_products")
    .select(`sort_order, products:products(${BASE_SELECT})`)
    .in("category_id", categoryIds)
    .order("sort_order", { ascending: true })
    .limit(fetchLimit);

  const firstProducts = (firstR.data || [])
    .map((x: any, index: number) => {
      const product = readOne(x.products);
      if (!product) return null;

      return {
        ...product,
        __category_sort_order:
          x?.sort_order === null || x?.sort_order === undefined
            ? null
            : Number(x.sort_order),
        __fallback_rank: index,
      };
    })
    .filter(Boolean)
    .filter((p: any) => p.store_id === opts.store_id)
    .filter((p: any) => isProductVisibleInWeb(p));

  const seen = new Set<string>();
  const merged: any[] = [];

  for (const product of firstProducts) {
    const id = s(product?.id);
    if (!id || seen.has(id)) continue;

    seen.add(id);
    merged.push(product);
  }

  if (merged.length < fetchLimit) {
    const secondR = await sb
      .from("product_categories")
      .select(`products:products(${BASE_SELECT})`)
      .in("category_id", categoryIds)
      .limit(fetchLimit);

    const secondProducts = (secondR.data || [])
      .map((x: any, index: number) => {
        const product = readOne(x.products);
        if (!product) return null;

        return {
          ...product,
          __category_sort_order: null,
          __fallback_rank: firstProducts.length + index,
        };
      })
      .filter(Boolean)
      .filter((p: any) => p.store_id === opts.store_id)
      .filter((p: any) => isProductVisibleInWeb(p));

    for (const product of secondProducts) {
      const id = s(product?.id);
      if (!id || seen.has(id)) continue;

      seen.add(id);
      merged.push(product);

      if (merged.length >= fetchLimit) break;
    }
  }

  if (!merged.length) return [] as ProductRow[];

  const productsWithMetrics = await attachCatalogSortMetrics({
    sb,
    store_id: opts.store_id,
    products: merged,
    sort,
  });

  const picked = productsWithMetrics
    .slice()
    .sort((a, b) => compareCatalogProductRows(a, b, sort))
    .slice(offset, offset + limit);

  return await mapProductRowsBulk(picked);
}

const productsByCategoryCache = new Map<string, () => Promise<ProductRow[]>>();

export async function getProductsByCategory(opts: {
  store_id: string;
  category_id: string;
  limit: number;
  offset?: number;
  sort?: CatalogProductSort | string | null;
}) {
  const limit = Math.min(Math.max(Number(opts.limit ?? 24), 1), 200);
  const offsetValue = Number(opts.offset ?? 0);
  const offset = Number.isFinite(offsetValue)
    ? Math.max(0, Math.min(Math.floor(offsetValue), 5000))
    : 0;
  const sort = normalizeCatalogProductSort(opts.sort);
  const key = `${opts.store_id}:${opts.category_id}:${limit}:${offset}:${sort}:variant-stock-v2`;

  let fn = productsByCategoryCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getProductsByCategoryRaw({ ...opts, limit, offset, sort }),
      [
        "products-by-category-v5-variant-stock",
        opts.store_id,
        opts.category_id,
        String(limit),
        String(offset),
        sort,
      ],
      { revalidate: 60 },
    );

    productsByCategoryCache.set(key, fn);
  }

  return fn();
}

export async function getProductsByCategories(opts: {
  store_id: string;
  category_ids: string[];
  limit: number;
  offset?: number;
  sort?: CatalogProductSort | string | null;
}) {
  const storeId = s(opts.store_id);
  const limit = Math.min(Math.max(Number(opts.limit ?? 24), 1), 200);
  const offsetValue = Number(opts.offset ?? 0);
  const offset = Number.isFinite(offsetValue)
    ? Math.max(0, Math.min(Math.floor(offsetValue), 5000))
    : 0;
  const sort = normalizeCatalogProductSort(opts.sort);
  const categoryIds = uniqueStrings(opts.category_ids).slice(0, 250);

  if (!storeId || !categoryIds.length) return [] as ProductRow[];

  const sortedCategoryIds = [...categoryIds].sort();
  const key = `${storeId}:${sortedCategoryIds.join(",")}:${limit}:${offset}:${sort}:variant-stock-v2`;

  let fn = productsByCategoryCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getProductsByCategoriesRaw({
          store_id: storeId,
          category_ids: sortedCategoryIds,
          limit,
          offset,
          sort,
        }),
      [
        "products-by-categories-v5-variant-stock",
        storeId,
        sortedCategoryIds.join(","),
        String(limit),
        String(offset),
        sort,
      ],
      { revalidate: 60 },
    );

    productsByCategoryCache.set(key, fn);
  }

  return fn();
}

async function getProductsForGridRaw(opts: {
  store_id: string;
  limit?: number;
}): Promise<ProductRow[]> {
  const sb = await getStoreDb(opts.store_id);
  const limit = Math.min(Math.max(Number(opts.limit ?? 12), 1), 60);

  const fetchLimit = Math.min(limit * 3, 180);

  const r = await sb
    .from("products")
    .select(BASE_SELECT)
    .eq("store_id", opts.store_id)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  const rows = ((r.data || []) as any[]).filter((row: any) =>
    isProductVisibleInWeb(row),
  );

  const picked = rows.slice(0, limit);
  return await mapProductRowsBulk(picked);
}

const productsForGridCache = new Map<string, () => Promise<ProductRow[]>>();

export async function getProductsForGrid(opts: {
  store_id: string;
  limit?: number;
}): Promise<ProductRow[]> {
  const limit = Math.min(Math.max(Number(opts.limit ?? 12), 1), 60);
  const key = `${opts.store_id}:${limit}:variant-stock-v3`;

  let fn = productsForGridCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getProductsForGridRaw({ ...opts, limit }),
      ["products-for-grid-v3-variant-stock", opts.store_id, String(limit)],
      { revalidate: 60 },
    );

    productsForGridCache.set(key, fn);
  }

  return fn();
}

export type ProductsGridPage = {
  items: ProductRow[];
  pageInfo: {
    pageSize: number;
    nextOffset: number;
    hasNextPage: boolean;
  };
};

export async function getProductsForGridPage(opts: {
  store_id: string;
  limit?: number;
  offset?: number;
  sort?: CatalogProductSort | string | null;
}): Promise<ProductsGridPage> {
  const storeId = s(opts.store_id);
  const pageSize = Math.min(Math.max(Number(opts.limit ?? 24), 1), 120);
  const offsetValue = Number(opts.offset ?? 0);
  const offset = Number.isFinite(offsetValue)
    ? Math.max(0, Math.min(Math.floor(offsetValue), 5000))
    : 0;
  const sort = normalizeCatalogProductSort(opts.sort);

  const empty = {
    items: [] as ProductRow[],
    pageInfo: {
      pageSize,
      nextOffset: offset,
      hasNextPage: false,
    },
  };

  if (!storeId) return empty;

  const sb = await getStoreDb(storeId);
  const requiredRows = offset + pageSize + 1;
  const fetchLimit =
    sort === "price_asc" || sort === "price_desc" || sort === "popular"
      ? 20000
      : Math.min(Math.max(requiredRows * 4, pageSize + 1), 20000);

  let query: any = sb
    .from("products")
    .select(BASE_SELECT)
    .eq("store_id", storeId);

  if (sort === "recommended") {
    query = query
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
  } else if (sort === "latest") {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
  } else {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
  }

  const { data, error } = await query.limit(fetchLimit);

  if (error) {
    throw new Error(error.message);
  }

  const visible = (Array.isArray(data) ? data : []).filter((row: any) =>
    isProductVisibleInWeb(row),
  );

  const productsWithMetrics = await attachCatalogSortMetrics({
    sb,
    store_id: storeId,
    products: visible,
    sort,
  });

  const ordered = productsWithMetrics
    .slice()
    .sort((a, b) => compareCatalogProductRows(a, b, sort));

  const pageRows = ordered.slice(offset, offset + pageSize);

  return {
    items: await mapProductRowsBulk(pageRows),
    pageInfo: {
      pageSize,
      nextOffset: offset + pageRows.length,
      hasNextPage: ordered.length > offset + pageRows.length,
    },
  };
}

async function getBestSellingProductsForGridRaw(opts: {
  store_id: string;
  limit?: number;
}): Promise<ProductRow[]> {
  const storeDb = (await getStoreDb(opts.store_id)) as any;
  const limit = Math.min(Math.max(Number(opts.limit ?? 12), 1), 60);

  try {
    const fastR = await storeDb
      .from("products")
      .select(`${BASE_SELECT},sold_qty`)
      .eq("store_id", opts.store_id)
      .gt("sold_qty", 0)
      .order("sold_qty", { ascending: false, nullsFirst: false })
      .limit(Math.min(limit * 3, 180));

    if (!fastR.error && Array.isArray(fastR.data) && fastR.data.length) {
      const rows = fastR.data
        .filter((row: any) => isProductVisibleInWeb(row))
        .slice(0, limit);

      if (rows.length) {
        const soldMap = new Map<string, number>();

        for (const row of rows) {
          const productId = s(row?.id);
          if (!productId) continue;

          const soldQty = Number(row?.sold_qty ?? 0);
          soldMap.set(productId, Number.isFinite(soldQty) ? soldQty : 0);
        }

        return await mapProductRowsBulk(rows, {
          soldQtyByProductId: soldMap,
        });
      }
    }
  } catch {
    // fallback to order_items aggregation below
  }

  const ordersDb = await getOrdersDb(opts.store_id);

  const orderItemsR = await ordersDb
    .from("order_items")
    .select(
      `
      product_id,
      qty,
      orders!inner (
        id,
        status
      )
    `,
    )
    .eq("store_id", opts.store_id)
    .not("product_id", "is", null)
    .in("orders.status", ["pending", "completed"])
    .limit(10000);

  const orderItems = (orderItemsR.data || []) as any[];

  const soldMap = new Map<string, number>();

  for (const item of orderItems) {
    const productId = s(item?.product_id);
    if (!productId) continue;

    const qty = Number(item?.qty ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    soldMap.set(productId, (soldMap.get(productId) || 0) + qty);
  }

  const sortedProductIds = Array.from(soldMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([productId]) => productId)
    .slice(0, limit * 3);

  if (!sortedProductIds.length) return [];

  const productsR = await storeDb
    .from("products")
    .select(BASE_SELECT)
    .eq("store_id", opts.store_id)
    .in("id", sortedProductIds);

  const rows = ((productsR.data || []) as any[]).filter((row: any) =>
    isProductVisibleInWeb(row),
  );

  const rowById = new Map<string, any>();

  for (const row of rows) {
    rowById.set(String(row.id), row);
  }

  const pickedRows: any[] = [];
  const pickedSoldMap = new Map<string, number>();

  for (const productId of sortedProductIds) {
    const row = rowById.get(productId);
    if (!row) continue;

    pickedRows.push(row);
    pickedSoldMap.set(productId, soldMap.get(productId) || 0);

    if (pickedRows.length >= limit) break;
  }

  return await mapProductRowsBulk(pickedRows, {
    soldQtyByProductId: pickedSoldMap,
  });
}

const bestSellingProductsForGridCache = new Map<
  string,
  () => Promise<ProductRow[]>
>();

export async function getBestSellingProductsForGrid(opts: {
  store_id: string;
  limit?: number;
}): Promise<ProductRow[]> {
  const limit = Math.min(Math.max(Number(opts.limit ?? 12), 1), 60);
  const key = `${opts.store_id}:${limit}`;

  let fn = bestSellingProductsForGridCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getBestSellingProductsForGridRaw({ ...opts, limit }),
      ["best-selling-products-for-grid-v3-variant-stock", opts.store_id, String(limit)],
      { revalidate: 120 },
    );

    bestSellingProductsForGridCache.set(key, fn);
  }

  return fn();
}

// =====================================================
// Product Search
// =====================================================

function normalizeArabicSearchText(value: any) {
  return s(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchQuery(value: any) {
  return s(value)
    .replace(/[%_,]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 90)
    .trim();
}

function getSearchTokens(value: any) {
  const normalized = normalizeArabicSearchText(value);

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((x) => x.trim())
        .filter((x) => x.length >= 2),
    ),
  ).slice(0, 8);
}

function makeArabicTermVariants(value: string) {
  const raw = normalizeSearchQuery(value);
  const normalized = normalizeArabicSearchText(raw);

  const set = new Set<string>();

  function add(v: string) {
    const text = s(v);
    if (text.length >= 2) set.add(text);
  }

  add(raw);
  add(normalized);

  if (normalized.includes("ه")) {
    add(normalized.replace(/ه/g, "ة"));
  }

  if (normalized.includes("ة")) {
    add(normalized.replace(/ة/g, "ه"));
  }

  return Array.from(set).slice(0, 6);
}

function makeSearchTerms(value: string) {
  const query = normalizeSearchQuery(value);
  const tokens = getSearchTokens(query);

  const set = new Set<string>();

  for (const variant of makeArabicTermVariants(query)) {
    set.add(variant);
  }

  for (const token of tokens) {
    for (const variant of makeArabicTermVariants(token)) {
      set.add(variant);
    }
  }

  return Array.from(set)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .slice(0, 12);
}

function likePattern(value: string) {
  const clean = normalizeSearchQuery(value)
    .replace(/\\/g, "")
    .replace(/\*/g, "")
    .trim();

  return `%${clean}%`;
}

function safeSearchObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function stringifySearchValue(value: any): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return s(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifySearchValue(item))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => stringifySearchValue(item))
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function productSearchText(product: ProductRow) {
  const metadata = safeSearchObject(product.metadata);

  const categoriesText = Array.isArray(product.seo?.categories)
    ? product.seo.categories.map((category) => category.name).join(" ")
    : "";

  const optionsText = Array.isArray(product.options)
    ? product.options.map((option) => option.name).join(" ")
    : "";

  return normalizeArabicSearchText(
    [
      product.name,
      product.description,
      product.seo?.seo_title,
      product.seo?.seo_description,
      product.seo?.brand_name,
      categoriesText,
      optionsText,
      stringifySearchValue(metadata?.tags),
      stringifySearchValue(metadata?.keywords),
      stringifySearchValue(metadata?.brand),
      stringifySearchValue(metadata?.search),
      stringifySearchValue(metadata?.conditions),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function scoreProductForSearch(args: {
  product: ProductRow;
  q: string;
  sourceBoost: number;
}) {
  const query = normalizeArabicSearchText(args.q);
  const tokens = getSearchTokens(args.q);

  const name = normalizeArabicSearchText(args.product.name);
  const desc = normalizeArabicSearchText(args.product.description);
  const brand = normalizeArabicSearchText(args.product.seo?.brand_name);
  const allText = productSearchText(args.product);

  let score = Number(args.sourceBoost || 0);

  if (query && name === query) score += 500;
  if (query && name.startsWith(query)) score += 360;
  if (query && name.includes(query)) score += 280;
  if (query && brand.includes(query)) score += 180;
  if (query && desc.includes(query)) score += 90;
  if (query && allText.includes(query)) score += 70;

  if (tokens.length) {
    const allTokensInName = tokens.every((token) => name.includes(token));
    const allTokensInText = tokens.every((token) => allText.includes(token));

    if (allTokensInName) score += 220;
    if (allTokensInText) score += 120;

    for (const token of tokens) {
      if (name.includes(token)) score += 55;
      else if (brand.includes(token)) score += 45;
      else if (desc.includes(token)) score += 22;
      else if (allText.includes(token)) score += 16;
    }
  }

  if (args.product.seo?.in_stock === true) score += 18;
  if (Number(args.product.sold_qty ?? 0) > 0) {
    score += Math.min(Number(args.product.sold_qty ?? 0), 30);
  }

  if (args.product.image_url || args.product.thumbnail_url) score += 8;

  const price = Number(
    args.product.pricing?.sale_price ?? args.product.pricing?.price ?? 0,
  );

  if (Number.isFinite(price) && price > 0) score += 6;

  return score;
}

async function loadProductRowsByIds(args: { store_id: string; ids: string[] }) {
  const sb = await getStoreDb(args.store_id);

  const ids = Array.from(new Set(args.ids.map((id) => s(id)).filter(Boolean)));
  if (!ids.length) return [] as any[];

  const chunks: string[][] = [];

  for (let i = 0; i < ids.length; i += 80) {
    chunks.push(ids.slice(i, i + 80));
  }

  const rows: any[] = [];

  for (const chunk of chunks) {
    const r = await sb
      .from("products")
      .select(BASE_SELECT)
      .eq("store_id", args.store_id)
      .in("id", chunk);

    for (const row of r.data || []) {
      if (!isProductVisibleInWeb(row)) continue;
      rows.push(row);
    }
  }

  return rows;
}

async function getProductsByIdsRaw(opts: {
  store_id: string;
  ids: string[];
  limit?: number;
}): Promise<ProductRow[]> {
  const limit = Math.min(
    Math.max(Number(opts.limit ?? opts.ids.length), 1),
    500,
  );
  const ids = uniqueStrings(opts.ids).slice(0, limit);

  if (!s(opts.store_id) || !ids.length) return [];

  const rows = await loadProductRowsByIds({
    store_id: opts.store_id,
    ids,
  });

  if (!rows.length) return [];

  const rowById = new Map<string, any>();

  for (const row of rows) {
    const id = s(row?.id);
    if (id) rowById.set(id, row);
  }

  const orderedRows = ids.map((id) => rowById.get(id)).filter(Boolean);

  return await mapProductRowsBulk(orderedRows);
}

const productsByIdsCache = new Map<string, () => Promise<ProductRow[]>>();

export async function getProductsByIds(opts: {
  store_id: string;
  ids: string[];
  limit?: number;
}): Promise<ProductRow[]> {
  const storeId = s(opts.store_id);
  const limit = Math.min(
    Math.max(Number(opts.limit ?? opts.ids?.length ?? 1), 1),
    500,
  );
  const ids = uniqueStrings(opts.ids).slice(0, limit);

  if (!storeId || !ids.length) return [];

  const sortedIds = [...ids].sort();
  const key = `${storeId}:${limit}:${sortedIds.join(",")}:variant-stock-v3`;

  let fn = productsByIdsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getProductsByIdsRaw({
          store_id: storeId,
          ids: sortedIds,
          limit,
        }),
      [
        "products-by-ids-v3-variant-stock",
        storeId,
        String(limit),
        sortedIds.join(","),
      ],
      { revalidate: 60 },
    );

    productsByIdsCache.set(key, fn);
  }

  const products = await fn();
  const byId = new Map<string, ProductRow>();

  for (const product of products) {
    const id = s(product?.id);
    if (id) byId.set(id, product);
  }

  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductRow[];
}

async function getProductsBySearchRaw(opts: {
  store_id: string;
  q: string;
  limit?: number;
}): Promise<ProductRow[]> {
  const sb = (await getStoreDb(opts.store_id)) as any;

  const q = normalizeSearchQuery(opts.q);
  const limit = Math.min(Math.max(Number(opts.limit ?? 48), 1), 80);

  if (!q || q.length < 2) return [];

  const fetchLimit = Math.min(limit * 5, 240);
  const terms = makeSearchTerms(q);

  const rowsById = new Map<string, any>();
  const boostById = new Map<string, number>();

  function rememberBoost(productId: any, boost: number) {
    const id = s(productId);
    if (!id) return;

    boostById.set(id, Math.max(boostById.get(id) ?? 0, boost));
  }

  function rememberRow(row: any, boost: number) {
    const id = s(row?.id);
    if (!id) return;
    if (!isProductVisibleInWeb(row)) return;

    rowsById.set(id, row);
    rememberBoost(id, boost);
  }

  function rememberRows(rows: any[] | null | undefined, boost: number) {
    for (const row of rows || []) {
      rememberRow(row, boost);
    }
  }

  const directTasks: Array<Promise<any>> = [];
  const directBoosts: number[] = [];

  for (const term of terms) {
    const pattern = likePattern(term);

    directTasks.push(
      sb
        .from("products")
        .select(BASE_SELECT)
        .eq("store_id", opts.store_id)
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
    );
    directBoosts.push(260);

    directTasks.push(
      sb
        .from("products")
        .select(BASE_SELECT)
        .eq("store_id", opts.store_id)
        .ilike("description", pattern)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
    );
    directBoosts.push(95);
  }

  if (/^\d+$/.test(q)) {
    directTasks.push(
      sb
        .from("products")
        .select(BASE_SELECT)
        .eq("store_id", opts.store_id)
        .eq("public_no", Number(q))
        .limit(1),
    );
    directBoosts.push(520);
  }

  const directResults = await Promise.all(directTasks);

  directResults.forEach((result, index) => {
    rememberRows(result?.data || [], directBoosts[index] ?? 0);
  });

  const linkedProductIds: string[] = [];

  function addLinkedProductId(productId: any, boost: number) {
    const id = s(productId);
    if (!id) return;

    linkedProductIds.push(id);
    rememberBoost(id, boost);
  }

  await Promise.all(
    terms.map(async (term) => {
      const pattern = likePattern(term);

      const [
        metaTitleR,
        metaDescriptionR,
        metaUrlR,
        categoriesR,
        brandsR,
        optionsR,
        optionValuesNameR,
        optionValuesDisplayR,
        variantsSkuR,
        variantsBarcodeR,
      ] = await Promise.all([
        sb
          .from("product_metadata")
          .select("product_id,title,description,url")
          .ilike("title", pattern)
          .limit(fetchLimit),

        sb
          .from("product_metadata")
          .select("product_id,title,description,url")
          .ilike("description", pattern)
          .limit(fetchLimit),

        sb
          .from("product_metadata")
          .select("product_id,title,description,url")
          .ilike("url", pattern)
          .limit(fetchLimit),

        sb
          .from("categories")
          .select("id,name")
          .eq("store_id", opts.store_id)
          .ilike("name", pattern)
          .limit(40),

        sb
          .from("brands")
          .select("id,name")
          .eq("store_id", opts.store_id)
          .ilike("name", pattern)
          .limit(40),

        sb
          .from("product_options")
          .select("id,product_id,name")
          .ilike("name", pattern)
          .limit(fetchLimit),

        sb
          .from("product_option_values")
          .select("id,option_id,name,display_value")
          .ilike("name", pattern)
          .limit(fetchLimit),

        sb
          .from("product_option_values")
          .select("id,option_id,name,display_value")
          .ilike("display_value", pattern)
          .limit(fetchLimit),

        sb
          .from("product_variants")
          .select("product_id,sku,barcode")
          .ilike("sku", pattern)
          .limit(fetchLimit),

        sb
          .from("product_variants")
          .select("product_id,sku,barcode")
          .ilike("barcode", pattern)
          .limit(fetchLimit),
      ]);

      for (const row of metaTitleR.data || []) {
        addLinkedProductId(row?.product_id, 170);
      }

      for (const row of metaDescriptionR.data || []) {
        addLinkedProductId(row?.product_id, 110);
      }

      for (const row of metaUrlR.data || []) {
        addLinkedProductId(row?.product_id, 150);
      }

      const categoryIds = Array.from(
        new Set(
          (categoriesR.data || [])
            .map((row: any) => s(row?.id))
            .filter(Boolean),
        ),
      );

      if (categoryIds.length) {
        const linksR = await sb
          .from("product_categories")
          .select("product_id,category_id")
          .in("category_id", categoryIds)
          .limit(fetchLimit);

        for (const row of linksR.data || []) {
          addLinkedProductId(row?.product_id, 135);
        }
      }

      const brandIds = Array.from(
        new Set(
          (brandsR.data || [])
            .map((row: any) => s(row?.id))
            .filter(Boolean),
        ),
      );

      if (brandIds.length) {
        const productsR = await sb
          .from("products")
          .select(BASE_SELECT)
          .eq("store_id", opts.store_id)
          .in("brand_id", brandIds)
          .limit(fetchLimit);

        rememberRows(productsR.data || [], 150);
      }

      for (const row of optionsR.data || []) {
        addLinkedProductId(row?.product_id, 100);
      }

      const optionIds = Array.from(
        new Set(
          [
            ...(optionValuesNameR.data || []),
            ...(optionValuesDisplayR.data || []),
          ]
            .map((row: any) => s(row?.option_id))
            .filter(Boolean),
        ),
      );

      if (optionIds.length) {
        const optionRowsR = await sb
          .from("product_options")
          .select("id,product_id")
          .in("id", optionIds)
          .limit(fetchLimit);

        for (const row of optionRowsR.data || []) {
          addLinkedProductId(row?.product_id, 120);
        }
      }

      for (const row of variantsSkuR.data || []) {
        addLinkedProductId(row?.product_id, 240);
      }

      for (const row of variantsBarcodeR.data || []) {
        addLinkedProductId(row?.product_id, 260);
      }
    }),
  );

  const missingIds = Array.from(new Set(linkedProductIds)).filter(
    (id) => !rowsById.has(id),
  );

  const linkedRows = await loadProductRowsByIds({
    store_id: opts.store_id,
    ids: missingIds,
  });

  for (const row of linkedRows) {
    rememberRow(row, boostById.get(String(row.id)) ?? 0);
  }

  const baseRows = Array.from(rowsById.values());
  if (!baseRows.length) return [];

  const products = await mapProductRowsBulk(baseRows);

  return products
    .map((product) => ({
      product,
      score: scoreProductForSearch({
        product,
        q,
        sourceBoost: boostById.get(String(product.id)) ?? 0,
      }),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aSold = Number(a.product.sold_qty ?? 0);
      const bSold = Number(b.product.sold_qty ?? 0);

      if (bSold !== aSold) return bSold - aSold;

      const aDate = new Date(a.product.seo?.created_at ?? 0).getTime();
      const bDate = new Date(b.product.seo?.created_at ?? 0).getTime();

      return bDate - aDate;
    })
    .slice(0, limit)
    .map((row) => row.product);
}

const productsBySearchCache = new Map<string, () => Promise<ProductRow[]>>();

export async function getProductsBySearch(opts: {
  store_id: string;
  q: string;
  limit?: number;
}): Promise<ProductRow[]> {
  const q = normalizeSearchQuery(opts.q);
  const limit = Math.min(Math.max(Number(opts.limit ?? 48), 1), 80);

  if (!q || q.length < 2) return [];

  const key = `${opts.store_id}:${normalizeArabicSearchText(q)}:${limit}:variant-stock-v3`;

  let fn = productsBySearchCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getProductsBySearchRaw({
          store_id: opts.store_id,
          q,
          limit,
        }),
      [
        "products-by-smart-search-v3-variant-stock",
        opts.store_id,
        normalizeArabicSearchText(q),
        String(limit),
      ],
      { revalidate: 45 },
    );

    productsBySearchCache.set(key, fn);
  }

  return fn();
}

// =====================================================
// Product Details (images + options + variants)
// =====================================================

export type ProductMediaRow = {
  id: string;
  media_kind: "image" | "video";
  original_url: string;
  url: string;
  thumbnail_url: string | null;
  alt: string | null;
  video_url: string | null;
  is_default: boolean;
  sort_order: number;
};

export type ProductOptionValueRow = {
  id: string;
  option_id: string;
  name: string;
  extra_price: number;
  quantity: number | null;
  is_default: boolean;
  display_value: string | null;
  image_url: string | null;
  sort_order: number;
};

export type ProductOptionRow = {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  option_field_type: string;
  display_type: "text" | "image" | "color";
  visibility: "always" | "on_condition";
  visibility_condition_operator: string | null;
  visibility_condition_option_id: string | null;
  visibility_condition_value_id: string | null;
  sort_order: number;
  values: ProductOptionValueRow[];
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  sale_price: number;
  stock_quantity: number;
  unlimited_quantity: boolean;
  is_default: boolean;
  option_values: Array<{
    id: string;
    option_id: string;
    name: string;
    display_value: string | null;
    extra_price: number;
    image_url: string | null;
  }>;
};

export type ProductDetails = Omit<ProductRow, "media"> & {
  media: ProductMediaRow[];
  options: ProductOptionRow[];
  variants: ProductVariantRow[];
  metadata?: Record<string, any>;
  conditions?: any;
};

function sortAllMedia(rows: any[]): ProductMediaRow[] {
  const arr = (rows || []).filter(Boolean);

  arr.sort((a, b) => {
    const ad = a?.is_default ? 1 : 0;
    const bd = b?.is_default ? 1 : 0;
    if (bd !== ad) return bd - ad;
    return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
  });

  return arr
    .map((m) => {
      const originalUrl = s(m?.original_url || m?.url || m?.src);
      if (!originalUrl) return null;

      return {
        id: String(m.id),
        media_kind: (m.media_kind || "image") as "image" | "video",
        original_url: originalUrl,
        url: originalUrl,
        thumbnail_url: m.thumbnail_url ?? null,
        alt: m.alt ?? null,
        video_url: m.video_url ?? null,
        is_default: !!m.is_default,
        sort_order: Number(m.sort_order ?? 0),
      };
    })
    .filter(Boolean) as ProductMediaRow[];
}

async function fetchProductOptionsWithValues(
  sb: SupabaseClient,
  product_id: string,
) {
  const optR = await sb
    .from("product_options")
    .select(
      "id,product_id,name,is_required,option_field_type,display_type,visibility,visibility_condition_operator,visibility_condition_option_id,visibility_condition_value_id,sort_order",
    )
    .eq("product_id", product_id)
    .order("sort_order", { ascending: true });

  const opts = (optR.data || []) as any[];
  if (!opts.length) return [] as ProductOptionRow[];

  const optionIds = opts.map((o) => o.id);

  const valR = await sb
    .from("product_option_values")
    .select(
      "id,option_id,name,extra_price,quantity,is_default,display_value,image_url,sort_order",
    )
    .in("option_id", optionIds)
    .order("sort_order", { ascending: true });

  const values = (valR.data || []) as any[];

  const byOpt = new Map<string, ProductOptionValueRow[]>();

  for (const v of values) {
    const arr = byOpt.get(v.option_id) || [];
    arr.push({
      id: String(v.id),
      option_id: String(v.option_id),
      name: String(v.name),
      extra_price: Number(v.extra_price ?? 0),
      quantity:
        v.quantity === null || v.quantity === undefined
          ? null
          : Number(v.quantity),
      is_default: !!v.is_default,
      display_value: v.display_value ?? null,
      image_url: v.image_url ?? null,
      sort_order: Number(v.sort_order ?? 0),
    });
    byOpt.set(String(v.option_id), arr);
  }

  return opts.map((o) => ({
    id: String(o.id),
    product_id: String(o.product_id),
    name: String(o.name),
    is_required: !!o.is_required,
    option_field_type: String(o.option_field_type),
    display_type: o.display_type as any,
    visibility: o.visibility as any,
    visibility_condition_operator: o.visibility_condition_operator ?? null,
    visibility_condition_option_id: o.visibility_condition_option_id ?? null,
    visibility_condition_value_id: o.visibility_condition_value_id ?? null,
    sort_order: Number(o.sort_order ?? 0),
    values: byOpt.get(String(o.id)) || [],
  }));
}

async function fetchProductVariantsWithOptionValues(
  sb: SupabaseClient,
  product_id: string,
) {
  const vR = await sb
    .from("product_variants")
    .select(
      "id,product_id,sku,barcode,price,sale_price,stock_quantity,unlimited_quantity,is_default,created_at",
    )
    .eq("product_id", product_id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const variants = (vR.data || []) as any[];
  if (!variants.length) return [] as ProductVariantRow[];

  const variantIds = variants.map((v) => v.id);

  const linkR = await sb
    .from("variant_option_values")
    .select(
      "variant_id, option_value:product_option_values(id,option_id,name,display_value,extra_price,image_url)",
    )
    .in("variant_id", variantIds);

  const links = (linkR.data || []) as any[];

  const byVariant = new Map<string, ProductVariantRow["option_values"]>();

  for (const row of links) {
    const vid = String(row.variant_id);
    const ov = readOne(row.option_value);
    if (!ov) continue;

    const arr = byVariant.get(vid) || [];
    arr.push({
      id: String(ov.id),
      option_id: String(ov.option_id),
      name: String(ov.name),
      display_value: ov.display_value ?? null,
      extra_price: Number(ov.extra_price ?? 0),
      image_url: ov.image_url ?? null,
    });
    byVariant.set(vid, arr);
  }

  return variants.map((v) => ({
    id: String(v.id),
    product_id: String(v.product_id),
    sku: v.sku ?? null,
    barcode: v.barcode ?? null,
    price: Number(v.price ?? 0),
    sale_price: Number(v.sale_price ?? 0),
    stock_quantity: Number(v.stock_quantity ?? 0),
    unlimited_quantity: !!v.unlimited_quantity,
    is_default: !!v.is_default,
    option_values: byVariant.get(String(v.id)) || [],
  }));
}

export async function getProductDetailsByPublicNo(opts: {
  store_id: string;
  public_no: number;
}): Promise<ProductDetails | null> {
  const sb = await getStoreDb(opts.store_id);

  const r = await sb
    .from("products")
    .select(`${BASE_SELECT}, metadata`)
    .eq("store_id", opts.store_id)
    .eq("public_no", opts.public_no)
    .limit(1)
    .maybeSingle();

  const row: any = r.data;
  if (!row) return null;
  if (!isProductVisibleInWeb(row)) return null;

  const base = await mapBaseProductRow(row);

  const mediaR = await sb
    .from("product_media")
    .select(
      "id,media_kind,original_url,thumbnail_url,alt,video_url,is_default,sort_order",
    )
    .eq("store_id", opts.store_id)
    .eq("product_id", base.id);

  const media = sortAllMedia(mediaR.data || []);

  const [options, variants] = await Promise.all([
    fetchProductOptionsWithValues(sb, base.id),
    fetchProductVariantsWithOptionValues(sb, base.id),
  ]);

  const metadata = (
    row?.metadata && typeof row.metadata === "object" ? row.metadata : {}
  ) as any;

  return {
    ...base,
    media,
    options,
    variants,
    metadata,
    conditions: metadata?.conditions ?? null,
  };
}

export async function getProductDetailsByShortUrl(opts: {
  store_id: string;
  short_url: string;
}): Promise<ProductDetails | null> {
  const sb = await getStoreDb(opts.store_id);

  const metaR = await sb
    .from("product_metadata")
    .select("product_id,url,title,description")
    .eq("url", opts.short_url)
    .limit(1)
    .maybeSingle();

  const meta: any = metaR.data;
  if (!meta?.product_id) return null;

  const pR = await sb
    .from("products")
    .select(`${BASE_SELECT}, metadata`)
    .eq("store_id", opts.store_id)
    .eq("id", meta.product_id)
    .limit(1)
    .maybeSingle();

  const row: any = pR.data;
  if (!row) return null;
  if (!isProductVisibleInWeb(row)) return null;

  row.product_metadata = {
    url: meta.url ?? null,
    title: meta.title ?? null,
    description: meta.description ?? null,
  };

  const base = await mapBaseProductRow(row);

  const mediaR = await sb
    .from("product_media")
    .select(
      "id,media_kind,original_url,thumbnail_url,alt,video_url,is_default,sort_order",
    )
    .eq("store_id", opts.store_id)
    .eq("product_id", base.id);

  const media = sortAllMedia(mediaR.data || []);

  const [options, variants] = await Promise.all([
    fetchProductOptionsWithValues(sb, base.id),
    fetchProductVariantsWithOptionValues(sb, base.id),
  ]);

  const metadata = (
    row?.metadata && typeof row.metadata === "object" ? row.metadata : {}
  ) as any;

  return {
    ...base,
    media,
    options,
    variants,
    metadata,
    conditions: metadata?.conditions ?? null,
  };
}
