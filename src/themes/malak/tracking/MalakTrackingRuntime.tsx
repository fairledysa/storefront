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

function sendToGoogleAnalytics(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  const ecommercePayload = {
    currency: event.currency,
    value: event.value,
    items: event.items,
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", event.name, ecommercePayload);
  }
}

function pushToDataLayer(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

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

  const rawItem = safeObject(args.detail?.item || args.detail?.product || args.detail);

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

  const productVm = useMemo(() => {
    return buildProductVm({
      data,
      bootstrap,
    });
  }, [data, bootstrap]);

  const route = getRoute(data);
  const productId = s(productVm?.id);

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