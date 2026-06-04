// FILE: apps/storefront/src/themes/malak/tracking/MalakTrackingRuntime.tsx

"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  toProductDetailVM,
  type ProductDetailVM,
} from "@/data/viewmodels/product.vm";
import type { MalakBootstrap } from "../bootstrap/types";

type Props = {
  data?: any;
  bootstrap?: MalakBootstrap;
  device?: string;
};

type TrackingEventName =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "view_category";

type TrackingItem = {
  item_id: string;
  item_name: string;

  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;

  item_variant?: string;
  price?: number;
  discount?: number;
  quantity?: number;

  product_id?: string;
  variant_id?: string | null;
  product_public_no?: number | null;
  image_url?: string | null;
};

type TrackingEvent = {
  name: TrackingEventName;
  currency: string;
  value: number;
  items: TrackingItem[];
  source: "malak_storefront";
  device: string;
  route: string;
  path: string;
  payload?: Record<string, any>;
};

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const DEFAULT_CURRENCY = "SAR";
const DEFAULT_DEVICE = "desktop";
const MAX_VIEW_CATEGORY_ITEMS = 24;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundMoney(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function cleanCurrencyCode(value: unknown, fallback = DEFAULT_CURRENCY) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function getCurrentPath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

function getBootstrapCurrencies(data: any, bootstrap?: MalakBootstrap) {
  return (
    data?.bootstrap?.currencies ||
    data?.currencies ||
    data?.store?.currencies ||
    data?.theme?.currencies ||
    bootstrap?.currencies ||
    null
  );
}

function getBootstrapTax(data: any, bootstrap?: MalakBootstrap) {
  return (
    data?.bootstrap?.tax ||
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
    data?.tax_settings ||
    data?.taxSettings ||
    bootstrap?.tax ||
    null
  );
}

function getFallbackCurrency(data: any, bootstrap?: MalakBootstrap) {
  const currencies = getBootstrapCurrencies(data, bootstrap);

  return cleanCurrencyCode(
    firstDefined(
      currencies?.active_code,
      currencies?.selected_code,
      currencies?.default_code,
      bootstrap?.currencies?.active_code,
      bootstrap?.currencies?.selected_code,
      bootstrap?.currencies?.default_code,
    ),
    DEFAULT_CURRENCY,
  );
}

function getRoute(data: any) {
  return firstText(data?.route, data?.pageType, data?.page_type);
}

function getRouteForTracking(data: any) {
  const direct = getRoute(data);
  if (direct) return direct;

  if (data?.product?.id || data?.product) return "product";
  if (data?.category?.id || data?.category) return "category";

  const path = getCurrentPath();

  if (path === "/" || path === "") return "home";
  if (/\/c\d+/i.test(path) || path.includes("/category")) return "category";
  if (path.includes("/categories")) return "categories";

  return "";
}

function getSelectedOptionsText(value: any) {
  if (!Array.isArray(value)) return "";

  return value
    .map((row) => {
      const name = firstText(row?.name, row?.label, row?.title);
      const optionValue = firstText(row?.value, row?.display_value, row?.label);

      if (name && optionValue) return `${name}: ${optionValue}`;
      return optionValue || name;
    })
    .filter(Boolean)
    .join(" / ");
}

function normalizeCategoriesFromVm(productVm: ProductDetailVM) {
  const categories = Array.isArray(productVm.categories)
    ? productVm.categories
    : [];

  return categories
    .map((category) => s(category?.name))
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeCategoriesFromRawProduct(product: any) {
  const sources = [
    product?.categories,
    product?.seo?.categories,
    product?.metadata?.categories,
    product?.raw?.categories,
    product?.raw?.seo?.categories,
  ];

  const out: string[] = [];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;

    for (const category of source) {
      const name = firstText(category?.name, category?.title, category);
      if (name) out.push(name);
    }
  }

  return Array.from(new Set(out)).slice(0, 5);
}

function buildCategoryFields(categories: string[]) {
  return {
    ...(categories[0] ? { item_category: categories[0] } : {}),
    ...(categories[1] ? { item_category2: categories[1] } : {}),
    ...(categories[2] ? { item_category3: categories[2] } : {}),
    ...(categories[3] ? { item_category4: categories[3] } : {}),
    ...(categories[4] ? { item_category5: categories[4] } : {}),
  };
}

function buildTrackingItemFromProductVm(args: {
  productVm: ProductDetailVM;
  quantity?: number;
  selectedOptions?: Array<{ name: string; value: string }>;
  variantId?: string | null;
}): TrackingItem | null {
  const productVm = args.productVm;
  const productId = s(productVm.id);
  const itemName = firstText(productVm.name, productVm.title);

  if (!productId || !itemName) return null;

  const price = roundMoney(productVm.pricing?.price ?? productVm.price);
  const compareAtPrice = safeNum(
    productVm.pricing?.compareAtPrice ?? productVm.compareAtPrice,
  );

  const discount =
    compareAtPrice !== null && compareAtPrice > price
      ? roundMoney(compareAtPrice - price)
      : 0;

  const categories = normalizeCategoriesFromVm(productVm);
  const selectedOptionsText = getSelectedOptionsText(args.selectedOptions);

  return {
    item_id: productId,
    item_name: itemName,

    ...(productVm.brandInfo?.name || productVm.brandName
      ? {
          item_brand: s(productVm.brandInfo?.name || productVm.brandName),
        }
      : {}),

    ...buildCategoryFields(categories),

    ...(selectedOptionsText || args.variantId
      ? {
          item_variant: selectedOptionsText || s(args.variantId),
        }
      : {}),

    price,
    ...(discount > 0 ? { discount } : {}),
    quantity: Math.max(1, Number(args.quantity || 1)),

    product_id: productId,
    variant_id: args.variantId || null,
    product_public_no: productVm.publicNo ?? null,
    image_url: productVm.imageUrl || productVm.image_url || null,
  };
}

function buildProductVm(args: {
  data: any;
  bootstrap?: MalakBootstrap;
}): ProductDetailVM | null {
  const rawProduct = args.data?.product;
  if (!rawProduct) return null;

  try {
    return toProductDetailVM({
      storeSlug: "",
      product: rawProduct,
      currencies: getBootstrapCurrencies(args.data, args.bootstrap),
      tax: getBootstrapTax(args.data, args.bootstrap),
    } as any);
  } catch {
    return null;
  }
}

function buildProductVmFromRawProduct(args: {
  product: any;
  data: any;
  bootstrap?: MalakBootstrap;
}): ProductDetailVM | null {
  if (!args.product) return null;

  try {
    return toProductDetailVM({
      storeSlug: "",
      product: args.product,
      currencies: getBootstrapCurrencies(args.data, args.bootstrap),
      tax: getBootstrapTax(args.data, args.bootstrap),
    } as any);
  } catch {
    return null;
  }
}

function buildTrackingItemFromRawProduct(args: {
  product: any;
  data: any;
  bootstrap?: MalakBootstrap;
  fallbackCategories?: string[];
  quantity?: number;
}): TrackingItem | null {
  const productVm = buildProductVmFromRawProduct({
    product: args.product,
    data: args.data,
    bootstrap: args.bootstrap,
  });

  if (!productVm) return null;

  const item = buildTrackingItemFromProductVm({
    productVm,
    quantity: args.quantity ?? 1,
  });

  if (!item) return null;

  const hasCategory = Boolean(
    item.item_category ||
      item.item_category2 ||
      item.item_category3 ||
      item.item_category4 ||
      item.item_category5,
  );

  if (!hasCategory) {
    const categories = [
      ...(args.fallbackCategories || []),
      ...normalizeCategoriesFromRawProduct(args.product),
    ]
      .map(s)
      .filter(Boolean)
      .slice(0, 5);

    Object.assign(item, buildCategoryFields(categories));
  }

  return item;
}

function readAddToCartProductId(detail: any) {
  return firstText(
    detail?.product_id,
    detail?.productId,
    detail?.id,
    detail?.item?.product_id,
    detail?.item?.productId,
    detail?.item?.id,
    detail?.item?.product?.id,
  );
}

function readAddToCartVariantId(detail: any) {
  return (
    firstText(
      detail?.variant_id,
      detail?.variantId,
      detail?.item?.variant_id,
      detail?.item?.variantId,
      detail?.item?.product?.variant_id,
      detail?.item?.product?.variantId,
    ) || null
  );
}

function readAddToCartQty(detail: any) {
  const qty =
    safeNum(detail?.addedQty) ??
    safeNum(detail?.added_qty) ??
    safeNum(detail?.qty) ??
    safeNum(detail?.quantity) ??
    safeNum(detail?.item?.qty) ??
    safeNum(detail?.item?.quantity) ??
    1;

  return Math.max(1, Math.floor(qty));
}

function readAddToCartPrice(item: any) {
  const sale =
    safeNum(
      firstDefined(
        item?.sale_price,
        item?.salePrice,
        item?.product?.sale_price,
        item?.product?.salePrice,
        item?.metadata?.sale_price,
        item?.metadata?.salePrice,
      ),
    ) ?? null;

  if (sale !== null && sale > 0) return sale;

  return (
    safeNum(
      firstDefined(
        item?.price,
        item?.unit_price,
        item?.unitPrice,
        item?.product?.price,
        item?.product?.unit_price,
        item?.product?.unitPrice,
        item?.metadata?.price,
        item?.metadata?.regular_price,
        item?.metadata?.regularPrice,
        item?.metadata?.base_price_fallback,
        item?.metadata?.basePriceFallback,
      ),
    ) ?? 0
  );
}

function readAddToCartCompareAtPrice(item: any) {
  return safeNum(
    firstDefined(
      item?.compareAtPrice,
      item?.compare_at_price,
      item?.regularPrice,
      item?.regular_price,
      item?.product?.compareAtPrice,
      item?.product?.compare_at_price,
      item?.metadata?.compareAtPrice,
      item?.metadata?.compare_at_price,
      item?.metadata?.regularPrice,
      item?.metadata?.regular_price,
    ),
  );
}

function readAddToCartCurrency(args: {
  item: any;
  data: any;
  bootstrap?: MalakBootstrap;
}) {
  return cleanCurrencyCode(
    firstDefined(
      args.item?.currency_code,
      args.item?.currencyCode,
      args.item?.currency,
      args.item?.product?.currency_code,
      args.item?.product?.currencyCode,
      args.item?.product?.currency,
      args.item?.metadata?.currency_code,
      args.item?.metadata?.currencyCode,
      args.item?.metadata?.currency,
    ),
    getFallbackCurrency(args.data, args.bootstrap),
  );
}

function readAddToCartItemName(item: any) {
  return firstText(
    item?.title,
    item?.name,
    item?.product?.name,
    item?.product?.title,
    item?.metadata?.title,
    item?.metadata?.name,
    "المنتج",
  );
}

function readAddToCartImageUrl(item: any) {
  return (
    firstText(
      item?.imageUrl,
      item?.image_url,
      item?.thumbnailUrl,
      item?.thumbnail_url,
      item?.product?.imageUrl,
      item?.product?.image_url,
      item?.metadata?.imageUrl,
      item?.metadata?.image_url,
      item?.metadata?.thumbnailUrl,
      item?.metadata?.thumbnail_url,
    ) || null
  );
}

function buildTrackingItemFromAddToCartDetail(detail: any): {
  currency: string;
  item: TrackingItem | null;
  value: number;
} {
  const rawItem = safeObject(detail?.item || detail?.product || detail);
  const productId = readAddToCartProductId(detail);
  const itemName = readAddToCartItemName(rawItem);

  if (!productId || !itemName) {
    return {
      currency: DEFAULT_CURRENCY,
      item: null,
      value: 0,
    };
  }

  const qty = readAddToCartQty(detail);
  const price = roundMoney(readAddToCartPrice(rawItem));
  const compareAtPrice = readAddToCartCompareAtPrice(rawItem);

  const discount =
    compareAtPrice !== null && compareAtPrice > price
      ? roundMoney(compareAtPrice - price)
      : 0;

  const selectedOptions =
    detail?.selected_options ||
    detail?.selectedOptions ||
    rawItem?.selected_options ||
    rawItem?.selectedOptions ||
    [];

  const variantId = readAddToCartVariantId(detail);
  const selectedOptionsText = getSelectedOptionsText(selectedOptions);

  const categoriesSource = Array.isArray(rawItem?.categories)
    ? rawItem.categories
    : Array.isArray(rawItem?.seo?.categories)
      ? rawItem.seo.categories
      : Array.isArray(rawItem?.raw?.categories)
        ? rawItem.raw.categories
        : [];

  const categories = categoriesSource
    .map((category: any) => firstText(category?.name, category?.title, category))
    .filter(Boolean)
    .slice(0, 5);

  const item: TrackingItem = {
    item_id: productId,
    item_name: itemName,

    ...(firstText(rawItem?.brandName, rawItem?.brand, rawItem?.brand?.name)
      ? {
          item_brand: firstText(
            rawItem?.brandName,
            rawItem?.brand,
            rawItem?.brand?.name,
          ),
        }
      : {}),

    ...buildCategoryFields(categories),

    ...(selectedOptionsText || variantId
      ? {
          item_variant: selectedOptionsText || s(variantId),
        }
      : {}),

    price,
    ...(discount > 0 ? { discount } : {}),
    quantity: qty,

    product_id: productId,
    variant_id: variantId,
    product_public_no:
      safeNum(rawItem?.publicNo ?? rawItem?.public_no) ?? null,
    image_url: readAddToCartImageUrl(rawItem),
  };

  return {
    currency: DEFAULT_CURRENCY,
    item,
    value: roundMoney(price * qty),
  };
}

function looksLikeProduct(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const id = firstText(value.id, value.product_id, value.productId);
  const name = firstText(value.name, value.title, value.product?.name);

  if (!id || !name) return false;

  return Boolean(
    value.price !== undefined ||
      value.sale_price !== undefined ||
      value.salePrice !== undefined ||
      value.regular_price !== undefined ||
      value.regularPrice !== undefined ||
      value.compareAtPrice !== undefined ||
      value.compare_at_price !== undefined ||
      value.pricing ||
      value.product_pricing ||
      value.stock ||
      value.variants ||
      value.options ||
      value.metadata?.base_price_fallback !== undefined ||
      value.metadata?.basePriceFallback !== undefined ||
      value.metadata?.variants_price_min !== undefined ||
      value.metadata?.variantsPriceMin !== undefined ||
      value.product_type ||
      value.productType,
  );
}

function pushProductRows(target: any[], value: any) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const row of value) {
      if (looksLikeProduct(row)) target.push(row);
    }

    return;
  }

  if (looksLikeProduct(value)) {
    target.push(value);
  }
}

function collectProductsFromSection(target: any[], section: any) {
  if (!section || typeof section !== "object") return;

  pushProductRows(target, section.products);
  pushProductRows(target, section.product_items);
  pushProductRows(target, section.productItems);
  pushProductRows(target, section.linkedProducts);
  pushProductRows(target, section.linked_products);

  pushProductRows(target, section.items);

  pushProductRows(target, section.data?.products);
  pushProductRows(target, section.data?.items);

  pushProductRows(target, section.value?.products);
  pushProductRows(target, section.value?.items);

  pushProductRows(target, section.values?.products);
  pushProductRows(target, section.values?.items);

  pushProductRows(target, section.settings?.products);
  pushProductRows(target, section.options?.products);
}

function collectProductsForViewCategory(data: any) {
  const out: any[] = [];

  pushProductRows(out, data?.products);
  pushProductRows(out, data?.items);
  pushProductRows(out, data?.productItems);
  pushProductRows(out, data?.product_items);
  pushProductRows(out, data?.results);
  pushProductRows(out, data?.results?.items);
  pushProductRows(out, data?.results?.products);

  pushProductRows(out, data?.category?.products);
  pushProductRows(out, data?.category?.items);
  pushProductRows(out, data?.categoryProducts);
  pushProductRows(out, data?.category_products);

  pushProductRows(out, data?.home?.products);
  pushProductRows(out, data?.home?.items);

  pushProductRows(out, data?.featuredProducts);
  pushProductRows(out, data?.featured_products);
  pushProductRows(out, data?.latestProducts);
  pushProductRows(out, data?.latest_products);
  pushProductRows(out, data?.bestSellingProducts);
  pushProductRows(out, data?.best_selling_products);

  for (const section of safeArray(data?.sections)) {
    collectProductsFromSection(out, section);
  }

  for (const section of safeArray(data?.blocks)) {
    collectProductsFromSection(out, section);
  }

  for (const section of safeArray(data?.home?.sections)) {
    collectProductsFromSection(out, section);
  }

  for (const section of safeArray(data?.page?.sections)) {
    collectProductsFromSection(out, section);
  }

  for (const section of safeArray(data?.content?.sections)) {
    collectProductsFromSection(out, section);
  }

  const seen = new Set<string>();
  const unique: any[] = [];

  for (const product of out) {
    const key =
      firstText(
        product?.id,
        product?.product_id,
        product?.productId,
        product?.public_no,
        product?.publicNo,
        product?.href,
        product?.url,
      ) || JSON.stringify(product).slice(0, 120);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    unique.push(product);

    if (unique.length >= MAX_VIEW_CATEGORY_ITEMS) break;
  }

  return unique;
}

function readCategoryObject(data: any) {
  return safeObject(
    data?.category ||
      data?.currentCategory ||
      data?.current_category ||
      data?.collection ||
      data?.taxonomy ||
      data?.group,
  );
}

function readViewCategoryName(args: { data: any; route: string }) {
  const category = readCategoryObject(args.data);

  if (args.route === "home") {
    return firstText(
      args.data?.home?.title,
      args.data?.page?.title,
      args.data?.store?.name,
      "الرئيسية",
    );
  }

  if (args.route === "categories") {
    return firstText(
      args.data?.title,
      args.data?.page?.title,
      args.data?.heading,
      "الأقسام",
    );
  }

  return firstText(
    category?.name,
    category?.title,
    args.data?.categoryName,
    args.data?.category_name,
    args.data?.title,
    args.data?.heading,
    args.data?.seo?.title,
    "القسم",
  );
}

function readViewCategoryId(args: { data: any; route: string }) {
  const category = readCategoryObject(args.data);

  if (args.route === "home") return "home";
  if (args.route === "categories") return "categories";

  return (
    firstText(
      category?.id,
      category?.public_no,
      category?.publicNo,
      args.data?.category_id,
      args.data?.categoryId,
    ) || args.route
  );
}

function isViewCategoryRoute(route: string, data: any) {
  if (route === "home") return true;
  if (route === "category") return true;
  if (route === "categories") return true;

  if (route === "product") return false;
  if (data?.product?.id || data?.product) return false;

  if (data?.category?.id || data?.category) return true;

  return false;
}

function buildViewCategoryEvent(args: {
  data: any;
  bootstrap?: MalakBootstrap;
  device: string;
}): TrackingEvent | null {
  const route = getRouteForTracking(args.data);

  if (!isViewCategoryRoute(route, args.data)) return null;

  const categoryName = readViewCategoryName({
    data: args.data,
    route,
  });

  const categoryId = readViewCategoryId({
    data: args.data,
    route,
  });

  const fallbackCategories =
    route === "category" && categoryName ? [categoryName] : [];

  const rawProducts = collectProductsForViewCategory(args.data);

  const items = rawProducts
    .map((product) =>
      buildTrackingItemFromRawProduct({
        product,
        data: args.data,
        bootstrap: args.bootstrap,
        fallbackCategories,
        quantity: 1,
      }),
    )
    .filter((item): item is TrackingItem => item !== null);

  const currency = getFallbackCurrency(args.data, args.bootstrap);
  const value = roundMoney(
    items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0),
  );

  return {
    name: "view_category",
    currency,
    value,
    items,
    source: "malak_storefront",
    device: args.device || DEFAULT_DEVICE,
    route: route || "unknown",
    path: getCurrentPath(),
    payload: {
      category_id: categoryId || null,
      category_name: categoryName || null,
      item_list_id: categoryId || route || null,
      item_list_name: categoryName || route || null,
      products_count: items.length,
    },
  };
}

function sendToGoogleAnalytics(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  const ecommercePayload = {
    currency: event.currency,
    value: event.value,
    items: event.items,
    ...(event.payload?.item_list_id
      ? { item_list_id: event.payload.item_list_id }
      : {}),
    ...(event.payload?.item_list_name
      ? { item_list_name: event.payload.item_list_name }
      : {}),
    ...(event.payload?.category_id
      ? { category_id: event.payload.category_id }
      : {}),
    ...(event.payload?.category_name
      ? { category_name: event.payload.category_name }
      : {}),
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", event.name, ecommercePayload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(["event", event.name, ecommercePayload]);
}

function pushToDataLayer(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({ ecommerce: null });

  window.dataLayer.push({
    event: "mk_tracking_event",
    mk_event_name: event.name,
    mk_source: event.source,
    mk_device: event.device,
    mk_route: event.route,
    mk_path: event.path,
    ecommerce: {
      currency: event.currency,
      value: event.value,
      items: event.items,
      ...(event.payload?.item_list_id
        ? { item_list_id: event.payload.item_list_id }
        : {}),
      ...(event.payload?.item_list_name
        ? { item_list_name: event.payload.item_list_name }
        : {}),
    },
    payload: event.payload || {},
  });
}

function dispatchUnifiedTrackingEvent(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("mk:tracking:event", {
      detail: event,
    }),
  );

  window.dispatchEvent(
    new CustomEvent("elyaia:tracking:event", {
      detail: event,
    }),
  );
}

function sendTrackingEvent(event: TrackingEvent) {
  dispatchUnifiedTrackingEvent(event);
  pushToDataLayer(event);
  sendToGoogleAnalytics(event);
}

function buildViewItemEvent(args: {
  productVm: ProductDetailVM;
  data: any;
  bootstrap?: MalakBootstrap;
  device: string;
}): TrackingEvent | null {
  const item = buildTrackingItemFromProductVm({
    productVm: args.productVm,
    quantity: 1,
  });

  if (!item) return null;

  const currency = cleanCurrencyCode(
    args.productVm.pricing?.currencyCode ||
      args.productVm.pricing?.currency_code ||
      args.productVm.currencyCode ||
      args.productVm.currency_code,
    getFallbackCurrency(args.data, args.bootstrap),
  );

  const value = roundMoney(item.price || 0);

  return {
    name: "view_item",
    currency,
    value,
    items: [item],
    source: "malak_storefront",
    device: args.device || DEFAULT_DEVICE,
    route: getRoute(args.data) || "product",
    path: getCurrentPath(),
    payload: {
      product_id: args.productVm.id,
      product_public_no: args.productVm.publicNo ?? null,
    },
  };
}

function buildAddToCartEvent(args: {
  detail: any;
  data: any;
  bootstrap?: MalakBootstrap;
  device: string;
}): TrackingEvent | null {
  const built = buildTrackingItemFromAddToCartDetail(args.detail);
  if (!built.item) return null;

  const rawItem = safeObject(
    args.detail?.item || args.detail?.product || args.detail,
  );

  const currency = readAddToCartCurrency({
    item: rawItem,
    data: args.data,
    bootstrap: args.bootstrap,
  });

  return {
    name: "add_to_cart",
    currency,
    value: built.value,
    items: [built.item],
    source: "malak_storefront",
    device: args.device || DEFAULT_DEVICE,
    route: getRoute(args.data) || "unknown",
    path: getCurrentPath(),
    payload: {
      product_id: built.item.product_id,
      variant_id: built.item.variant_id ?? null,
      added_qty: built.item.quantity ?? 1,
    },
  };
}

export default function MalakTrackingRuntime({
  data,
  bootstrap,
  device = DEFAULT_DEVICE,
}: Props) {
  const sentViewItemsRef = useRef<Set<string>>(new Set());
  const sentViewCategoriesRef = useRef<Set<string>>(new Set());

  const productVm = useMemo(() => {
    return buildProductVm({
      data,
      bootstrap,
    });
  }, [data, bootstrap]);

  const route = getRouteForTracking(data);
  const productId = s(productVm?.id);

  useEffect(() => {
    const event = buildViewCategoryEvent({
      data,
      bootstrap,
      device,
    });

    if (!event) return;

    const key = [
      event.name,
      event.route,
      event.path,
      event.payload?.item_list_id || "",
      event.payload?.item_list_name || "",
    ].join("|");

    if (sentViewCategoriesRef.current.has(key)) return;

    sentViewCategoriesRef.current.add(key);
    sendTrackingEvent(event);
  }, [data, bootstrap, device, route]);

  useEffect(() => {
    if (!productVm) return;
    if (!productId) return;

    const isProductRoute =
      route === "product" ||
      Boolean(data?.product) ||
      Boolean(data?.product?.id);

    if (!isProductRoute) return;

    const key = `${productId}|${getCurrentPath()}`;
    if (sentViewItemsRef.current.has(key)) return;

    sentViewItemsRef.current.add(key);

    const event = buildViewItemEvent({
      productVm,
      data,
      bootstrap,
      device,
    });

    if (!event) return;

    sendTrackingEvent(event);
  }, [productVm, productId, route, data, bootstrap, device]);

  useEffect(() => {
    function handleAddToCartDone(event: Event) {
      const detail = (event as CustomEvent<any>).detail;
      if (!detail) return;

      const trackingEvent = buildAddToCartEvent({
        detail,
        data,
        bootstrap,
        device,
      });

      if (!trackingEvent) return;

      sendTrackingEvent(trackingEvent);
    }

    window.addEventListener(
      "product:add-to-cart:done",
      handleAddToCartDone as EventListener,
    );

    return () => {
      window.removeEventListener(
        "product:add-to-cart:done",
        handleAddToCartDone as EventListener,
      );
    };
  }, [data, bootstrap, device]);

  return null;
}