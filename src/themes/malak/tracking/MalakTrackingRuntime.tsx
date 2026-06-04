// FILE: apps/storefront/src/themes/malak/tracking/MalakTrackingRuntime.tsx

"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  toProductCardVM,
  toProductDetailVM,
  type ProductCardVM,
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
  | "select_item"
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
  item_list_id?: string;
  item_list_name?: string;

  index?: number;
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

type TrackingListState = {
  itemListId: string;
  itemListName: string;
  currency: string;
  value: number;
  route: string;
  path: string;
  items: TrackingItem[];
  itemsById: Map<string, TrackingItem>;
};

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const DEFAULT_CURRENCY = "SAR";
const DEFAULT_DEVICE = "desktop";
const SOURCE = "malak_storefront" as const;
const PURCHASE_SENT_PREFIX = "mk_tracking_purchase_sent:";

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

function normalizeCategoriesFromRaw(row: any) {
  const sources = [
    row?.categories,
    row?.seo?.categories,
    row?.raw?.categories,
    row?.metadata?.categories,
    row?.category_path,
    row?.categoryPath,
  ];

  const out: string[] = [];

  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const item of source) {
        const name = firstText(item?.name, item?.title, item?.label, item);
        if (name) out.push(name);
      }
    } else {
      const text = firstText(source);
      if (text) {
        text
          .split("/")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => out.push(item));
      }
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
  index?: number;
  itemListId?: string;
  itemListName?: string;
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

    ...(args.itemListId ? { item_list_id: args.itemListId } : {}),
    ...(args.itemListName ? { item_list_name: args.itemListName } : {}),
    ...(typeof args.index === "number" ? { index: args.index } : {}),

    price,
    ...(discount > 0 ? { discount } : {}),
    quantity: Math.max(1, Number(args.quantity || 1)),

    product_id: productId,
    variant_id: args.variantId || null,
    product_public_no: productVm.publicNo ?? null,
    image_url: productVm.imageUrl || productVm.image_url || null,
  };
}

function buildTrackingItemFromProductCardVm(args: {
  productVm: ProductCardVM;
  rawProduct?: any;
  quantity?: number;
  index?: number;
  itemListId?: string;
  itemListName?: string;
}): TrackingItem | null {
  const productVm = args.productVm;
  const rawProduct = args.rawProduct ?? productVm.raw ?? {};
  const productId = s(productVm.id);
  const itemName = firstText(
    productVm.title,
    rawProduct?.name,
    rawProduct?.title,
  );

  if (!productId || !itemName) return null;

  const price = roundMoney(productVm.price);
  const compareAtPrice = safeNum(productVm.compareAtPrice);

  const discount =
    compareAtPrice !== null && compareAtPrice > price
      ? roundMoney(compareAtPrice - price)
      : 0;

  const categories = normalizeCategoriesFromRaw(rawProduct);

  return {
    item_id: productId,
    item_name: itemName,

    ...(productVm.brandName || productVm.brand
      ? {
          item_brand: s(productVm.brandName || productVm.brand),
        }
      : {}),

    ...buildCategoryFields(categories),

    ...(args.itemListId ? { item_list_id: args.itemListId } : {}),
    ...(args.itemListName ? { item_list_name: args.itemListName } : {}),
    ...(typeof args.index === "number" ? { index: args.index } : {}),

    price,
    ...(discount > 0 ? { discount } : {}),
    quantity: Math.max(1, Number(args.quantity || 1)),

    product_id: productId,
    variant_id: null,
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

function buildProductCardVm(args: {
  rawProduct: any;
  data: any;
  bootstrap?: MalakBootstrap;
}): ProductCardVM | null {
  const rawProduct = args.rawProduct;
  if (!rawProduct) return null;

  if (
    rawProduct?.id &&
    rawProduct?.title &&
    rawProduct?.href &&
    rawProduct?.price !== undefined
  ) {
    return rawProduct as ProductCardVM;
  }

  try {
    return toProductCardVM({
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
  item: TrackingItem | null;
  value: number;
} {
  const rawItem = safeObject(detail?.item || detail?.product || detail);
  const productId = readAddToCartProductId(detail);
  const itemName = readAddToCartItemName(rawItem);

  if (!productId || !itemName) {
    return {
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
  const categories = normalizeCategoriesFromRaw(rawItem);

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
    item,
    value: roundMoney(price * qty),
  };
}

function unwrapArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.results)) return value.results;

  return [];
}

function collectSectionProducts(value: any): any[] {
  const sections = Array.isArray(value) ? value : [];
  const out: any[] = [];

  for (const section of sections) {
    const possible = [
      section?.items,
      section?.products,
      section?.data?.items,
      section?.data?.products,
      section?.props?.items,
      section?.props?.products,
    ];

    for (const source of possible) {
      const rows = unwrapArray(source);
      if (rows.length) out.push(...rows);
    }
  }

  return out;
}

function collectProductRowsForList(data: any) {
  const route = getRoute(data);

  const directSources = [
    data?.items,
    data?.products,
    data?.results,
    data?.productItems,
    data?.product_items,
    data?.category?.items,
    data?.category?.products,
    data?.categoryProducts,
    data?.category_products,
    data?.search?.items,
    data?.search?.products,
    data?.search?.results,
    data?.collection?.items,
    data?.collection?.products,
    data?.page?.items,
    data?.page?.products,
  ];

  const rows: any[] = [];

  for (const source of directSources) {
    const found = unwrapArray(source);
    if (found.length) rows.push(...found);
  }

  if (route === "home" || !route) {
    rows.push(...collectSectionProducts(data?.sections));
    rows.push(...collectSectionProducts(data?.home?.sections));
    rows.push(...collectSectionProducts(data?.homepage?.sections));
    rows.push(...collectSectionProducts(data?.page?.sections));
    rows.push(...collectSectionProducts(data?.layout?.sections));

    const homeSources = [
      data?.featuredProducts,
      data?.featured_products,
      data?.latestProducts,
      data?.latest_products,
      data?.bestSellers,
      data?.best_sellers,
      data?.offers,
    ];

    for (const source of homeSources) {
      const found = unwrapArray(source);
      if (found.length) rows.push(...found);
    }
  }

  const seen = new Set<string>();

  return rows.filter((row) => {
    if (!row) return false;

    const id = firstText(
      row?.id,
      row?.product_id,
      row?.productId,
      row?.raw?.id,
      row?.product?.id,
    );

    const title = firstText(
      row?.title,
      row?.name,
      row?.raw?.title,
      row?.raw?.name,
      row?.product?.title,
      row?.product?.name,
    );

    if (!id || !title) return false;

    if (seen.has(id)) return false;
    seen.add(id);

    return true;
  });
}

function getCategoryName(data: any) {
  return firstText(
    data?.category?.name,
    data?.category?.title,
    data?.currentCategory?.name,
    data?.current_category?.name,
    data?.collection?.name,
    data?.collection?.title,
    data?.title,
  );
}

function getCategoryPublicNo(data: any) {
  return (
    safeNum(
      firstDefined(
        data?.category?.public_no,
        data?.category?.publicNo,
        data?.currentCategory?.public_no,
        data?.currentCategory?.publicNo,
        data?.current_category?.public_no,
        data?.current_category?.publicNo,
      ),
    ) ?? null
  );
}

function getTrackingListName(data: any) {
  const route = getRoute(data);

  if (route === "home") return "الرئيسية";
  if (route === "category") return getCategoryName(data) || "القسم";
  if (route === "search") return "نتائج البحث";
  if (route === "tag") return firstText(data?.tag?.name, data?.tag?.title) || "وسم";
  if (route === "page") return firstText(data?.page?.title, data?.title) || "صفحة";

  return getCategoryName(data) || "قائمة المنتجات";
}

function getTrackingListId(data: any) {
  const route = getRoute(data);
  const publicNo = getCategoryPublicNo(data);

  if (route === "home") return "home";

  if (route === "category") {
    return publicNo
      ? `category_${publicNo}`
      : `category_${s(getCategoryName(data)) || "unknown"}`;
  }

  if (route === "search") return "search_results";

  const name = getTrackingListName(data);
  return `${route || "list"}_${name || "products"}`;
}

function shouldSendViewCategory(data: any) {
  const route = getRoute(data);

  return (
    route === "home" ||
    route === "category" ||
    route === "tag" ||
    route === "search"
  );
}

function buildListTrackingState(args: {
  data: any;
  bootstrap?: MalakBootstrap;
  device: string;
}): TrackingListState | null {
  if (!shouldSendViewCategory(args.data)) return null;

  const rows = collectProductRowsForList(args.data);
  if (!rows.length) return null;

  const itemListName = getTrackingListName(args.data);
  const itemListId = getTrackingListId(args.data);
  const currency = getFallbackCurrency(args.data, args.bootstrap);

  const items = rows
    .map((row, index) => {
      const productVm = buildProductCardVm({
        rawProduct: row,
        data: args.data,
        bootstrap: args.bootstrap,
      });

      if (!productVm) return null;

      return buildTrackingItemFromProductCardVm({
        productVm,
        rawProduct: row,
        quantity: 1,
        index: index + 1,
        itemListId,
        itemListName,
      });
    })
    .filter(Boolean) as TrackingItem[];

  if (!items.length) return null;

  const itemsById = new Map<string, TrackingItem>();

  for (const item of items) {
    const ids = [item.item_id, item.product_id].map(s).filter(Boolean);

    for (const id of ids) {
      if (!itemsById.has(id)) itemsById.set(id, item);
    }
  }

  const value = roundMoney(
    items.reduce((sum, item) => {
      return (
        sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1))
      );
    }, 0),
  );

  return {
    itemListId,
    itemListName,
    currency,
    value,
    route: getRoute(args.data) || "unknown",
    path: getCurrentPath(),
    items,
    itemsById,
  };
}

function buildViewCategoryEvent(args: {
  state: TrackingListState;
  data: any;
  device: string;
}): TrackingEvent {
  return {
    name: "view_category",
    currency: args.state.currency,
    value: args.state.value,
    items: args.state.items,
    source: SOURCE,
    device: args.device || DEFAULT_DEVICE,
    route: args.state.route,
    path: args.state.path,
    payload: {
      item_list_id: args.state.itemListId,
      item_list_name: args.state.itemListName,
      category_name: args.state.itemListName,
      category_public_no: getCategoryPublicNo(args.data),
      item_count: args.state.items.length,
    },
  };
}

function readOrderNo(data: any) {
  return firstText(
    data?.orderNo,
    data?.order_no,
    data?.orderNumber,
    data?.order_number,
    data?.invoiceNo,
    data?.invoice_no,
    data?.publicNo,
    data?.public_no,
    data?.order?.orderNo,
    data?.order?.order_no,
    data?.order?.orderNumber,
    data?.order?.order_number,
    data?.order?.invoiceNo,
    data?.order?.invoice_no,
    data?.order?.publicNo,
    data?.order?.public_no,
    data?.order?.id,
    data?.id,
  );
}

function readPurchaseCurrency(data: any, bootstrap?: MalakBootstrap) {
  return cleanCurrencyCode(
    firstDefined(
      data?.currency_code,
      data?.currencyCode,
      data?.currency,
      data?.order?.currency_code,
      data?.order?.currencyCode,
      data?.order?.currency,
    ),
    getFallbackCurrency(data, bootstrap),
  );
}

function readMoneyValue(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    const num = safeNum(value);
    if (num !== null) return roundMoney(num);
  }

  return 0;
}

function readCouponCode(data: any) {
  return firstText(
    data?.coupon?.code,
    data?.couponCode,
    data?.coupon_code,
    data?.discountCode,
    data?.discount_code,
    data?.order?.coupon?.code,
    data?.order?.couponCode,
    data?.order?.coupon_code,
  );
}

function readOrderOptionsFee(data: any) {
  return readMoneyValue(
    data?.orderOptionsFee,
    data?.order_options_fee,
    data?.order?.orderOptionsFee,
    data?.order?.order_options_fee,
  );
}

function readPurchaseSubtotal(data: any) {
  return readMoneyValue(
    data?.subtotal,
    data?.subtotalAmount,
    data?.order?.subtotal,
    data?.order?.subtotalAmount,
  );
}

function readPurchaseShipping(data: any) {
  return readMoneyValue(
    data?.shippingAmount,
    data?.shipping,
    data?.shippingTotalAmount,
    data?.shipping_total,
    data?.shippingTotal,
    data?.order?.shippingAmount,
    data?.order?.shipping,
    data?.order?.shipping_total,
  );
}

function readPurchaseTax(data: any) {
  return readMoneyValue(
    data?.taxAmount,
    data?.vatAmount,
    typeof data?.tax === "object" ? data?.tax?.amount : data?.tax,
    data?.order?.taxAmount,
    data?.order?.vatAmount,
    typeof data?.order?.tax === "object" ? data?.order?.tax?.amount : data?.order?.tax,
  );
}

function readPurchaseDiscount(data: any) {
  return readMoneyValue(
    data?.discountAmount,
    data?.discount,
    data?.order?.discountAmount,
    data?.order?.discount,
  );
}

function readPurchasePaymentFee(data: any) {
  return readMoneyValue(
    data?.paymentFeeAmount,
    data?.payment_fee_amount,
    data?.paymentFee,
    data?.payment_fee,
    data?.codFee,
    data?.cod_fee,
    data?.paymentFeeTotalAmount,
    data?.payment_fee_total,
    data?.paymentFeeTotal,
    data?.order?.paymentFeeAmount,
    data?.order?.payment_fee_amount,
    data?.order?.paymentFee,
    data?.order?.payment_fee,
    data?.order?.codFee,
    data?.order?.cod_fee,
  );
}

function readPurchaseTotal(data: any) {
  const explicitTotal = readMoneyValue(
    data?.totalAmount,
    data?.total,
    data?.grandTotal,
    data?.order?.totalAmount,
    data?.order?.total,
    data?.order?.grandTotal,
  );

  if (explicitTotal > 0) return explicitTotal;

  const subtotal = readPurchaseSubtotal(data);
  const shipping = readPurchaseShipping(data);
  const tax = readPurchaseTax(data);
  const discount = readPurchaseDiscount(data);
  const paymentFee = readPurchasePaymentFee(data);
  const orderOptionsFee = readOrderOptionsFee(data);

  return roundMoney(
    Math.max(0, subtotal + shipping + tax + paymentFee + orderOptionsFee - discount),
  );
}

function readPurchaseItemId(row: any, index: number) {
  return firstText(
    row?.product_id,
    row?.productId,
    row?.product?.id,
    row?.variant?.product_id,
    row?.id,
    `item_${index + 1}`,
  );
}

function readPurchaseItemName(row: any) {
  return firstText(
    row?.item_name,
    row?.itemName,
    row?.title,
    row?.name,
    row?.product?.name,
    row?.product?.title,
    "المنتج",
  );
}

function readPurchaseItemPrice(row: any) {
  return readMoneyValue(
    row?.unit_price,
    row?.unitPrice,
    row?.price,
    row?.total_price && row?.qty ? Number(row.total_price) / Math.max(1, Number(row.qty)) : null,
    row?.totalPrice && row?.qty ? Number(row.totalPrice) / Math.max(1, Number(row.qty)) : null,
  );
}

function readPurchaseItemQty(row: any) {
  const qty = safeNum(
    firstDefined(row?.qty, row?.quantity, row?.count, row?.item_quantity),
  );

  return Math.max(1, Math.floor(qty || 1));
}

function readPurchaseItemVariant(row: any) {
  const selectedOptions = getSelectedOptionsText(
    row?.selected_options || row?.selectedOptions || row?.options || [],
  );

  return (
    selectedOptions ||
    firstText(row?.variant_name, row?.variantName, row?.variant_id, row?.variantId) ||
    ""
  );
}

function readPurchaseItemImage(row: any) {
  return (
    firstText(
      row?.imageUrl,
      row?.image_url,
      row?.thumbnailUrl,
      row?.thumbnail_url,
      row?.product?.imageUrl,
      row?.product?.image_url,
      row?.product?.thumbnailUrl,
      row?.product?.thumbnail_url,
    ) || null
  );
}

function buildPurchaseItems(data: any): TrackingItem[] {
  const rows = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.order?.items)
      ? data.order.items
      : Array.isArray(data?.order_items)
        ? data.order_items
        : [];

  return rows
    .map((row: any, index: number) => {
      const itemId = readPurchaseItemId(row, index);
      const itemName = readPurchaseItemName(row);

      if (!itemId || !itemName) return null;

      const price = readPurchaseItemPrice(row);
      const quantity = readPurchaseItemQty(row);
      const categories = normalizeCategoriesFromRaw(row);
      const itemVariant = readPurchaseItemVariant(row);

      const item: TrackingItem = {
        item_id: itemId,
        item_name: itemName,

        ...(firstText(row?.brandName, row?.brand, row?.brand?.name, row?.product?.brand?.name)
          ? {
              item_brand: firstText(
                row?.brandName,
                row?.brand,
                row?.brand?.name,
                row?.product?.brand?.name,
              ),
            }
          : {}),

        ...buildCategoryFields(categories),

        ...(itemVariant ? { item_variant: itemVariant } : {}),

        price,
        quantity,

        product_id: itemId,
        variant_id: firstText(row?.variant_id, row?.variantId) || null,
        product_public_no:
          safeNum(row?.product_public_no ?? row?.productPublicNo ?? row?.publicNo ?? row?.public_no) ??
          null,
        image_url: readPurchaseItemImage(row),
      };

      return item;
    })
    .filter(Boolean) as TrackingItem[];
}

function isThankYouRoute(data: any) {
  const route = getRoute(data);
  const path = getCurrentPath();

  return (
    route === "thankyou" ||
    route === "thank_you" ||
    route === "order_success" ||
    route === "order-success" ||
    route === "purchase" ||
    path.startsWith("/thankyou/")
  );
}

function buildPurchaseEvent(args: {
  data: any;
  bootstrap?: MalakBootstrap;
  device: string;
}): TrackingEvent | null {
  if (!isThankYouRoute(args.data)) return null;

  const transactionId = readOrderNo(args.data);
  if (!transactionId) return null;

  const currency = readPurchaseCurrency(args.data, args.bootstrap);
  const value = readPurchaseTotal(args.data);
  const items = buildPurchaseItems(args.data);

  if (!items.length) return null;

  const shipping = readPurchaseShipping(args.data);
  const tax = readPurchaseTax(args.data);
  const discount = readPurchaseDiscount(args.data);
  const paymentFee = readPurchasePaymentFee(args.data);
  const orderOptionsFee = readOrderOptionsFee(args.data);
  const coupon = readCouponCode(args.data);

  return {
    name: "purchase",
    currency,
    value,
    items,
    source: SOURCE,
    device: args.device || DEFAULT_DEVICE,
    route: getRoute(args.data) || "thankyou",
    path: getCurrentPath(),
    payload: {
      transaction_id: transactionId,
      order_no: transactionId,
      affiliation: firstText(
        args.data?.store?.name,
        args.data?.bootstrap?.store?.name,
        args.bootstrap?.store?.name,
        "malak_storefront",
      ),
      shipping,
      tax,
      discount,
      payment_fee: paymentFee,
      order_options_fee: orderOptionsFee,
      coupon: coupon || undefined,
      item_count: items.length,
    },
  };
}

function googleEventName(eventName: TrackingEventName) {
  if (eventName === "view_category") return "view_item_list";
  return eventName;
}

function buildGoogleEcommercePayload(event: TrackingEvent) {
  return {
    currency: event.currency,
    value: event.value,

    ...(event.payload?.transaction_id
      ? { transaction_id: event.payload.transaction_id }
      : {}),

    ...(event.payload?.affiliation
      ? { affiliation: event.payload.affiliation }
      : {}),

    ...(event.payload?.tax !== undefined ? { tax: event.payload.tax } : {}),
    ...(event.payload?.shipping !== undefined
      ? { shipping: event.payload.shipping }
      : {}),

    ...(event.payload?.coupon ? { coupon: event.payload.coupon } : {}),

    ...(event.payload?.item_list_id
      ? { item_list_id: event.payload.item_list_id }
      : {}),

    ...(event.payload?.item_list_name
      ? { item_list_name: event.payload.item_list_name }
      : {}),

    ...(event.payload?.search_term
      ? { search_term: event.payload.search_term }
      : {}),

    items: event.items,
  };
}

function sendToGoogleAnalytics(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  const ecommercePayload = buildGoogleEcommercePayload(event);

  if (typeof window.gtag === "function") {
    window.gtag("event", googleEventName(event.name), ecommercePayload);
  }
}

function pushToDataLayer(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    ecommerce: null,
  });

  window.dataLayer.push({
    event: "mk_tracking_event",
    mk_event_name: event.name,
    mk_google_event_name: googleEventName(event.name),
    mk_source: event.source,
    mk_device: event.device,
    mk_route: event.route,
    mk_path: event.path,
    ecommerce: buildGoogleEcommercePayload(event),
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

function getPurchaseStorageKey(event: TrackingEvent) {
  const transactionId = firstText(event.payload?.transaction_id);
  if (!transactionId) return "";

  return `${PURCHASE_SENT_PREFIX}${transactionId}`;
}

function wasPurchaseAlreadySent(event: TrackingEvent) {
  if (typeof window === "undefined") return false;

  const key = getPurchaseStorageKey(event);
  if (!key) return false;

  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markPurchaseAsSent(event: TrackingEvent) {
  if (typeof window === "undefined") return;

  const key = getPurchaseStorageKey(event);
  if (!key) return;

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    //
  }
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
    source: SOURCE,
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
    source: SOURCE,
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

function isBlockedSelectClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;

  return Boolean(
    target.closest(
      [
        "button",
        "input",
        "select",
        "textarea",
        "[role='button']",
        "[data-mk-favorite-button]",
        ".mkpc-action",
        ".mkpc-cart-inline",
        ".mk-pcart-submit",
        ".mk-mcart-submit",
        ".mk-qv",
      ].join(","),
    ),
  );
}

function findProductCardFromClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return null;

  const card = target.closest("[data-mk-product-card-id]") as HTMLElement | null;
  if (!card) return null;

  if (!anchor.contains(card) && anchor !== card) return null;

  return {
    anchor,
    card,
    productId: s(card.getAttribute("data-mk-product-card-id")),
  };
}

function parseDomPrice(value: string) {
  const clean = String(value || "")
    .replace(/[^\d.,]/g, "")
    .replace(/,/g, "");

  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function buildDomTrackingItem(args: {
  card: HTMLElement;
  productId: string;
  state: TrackingListState | null;
}): TrackingItem | null {
  const title = firstText(
    args.card.querySelector(".mkpc-title")?.textContent,
    args.card.getAttribute("title"),
    "المنتج",
  );

  const image =
    (args.card.querySelector("img") as HTMLImageElement | null)?.currentSrc ||
    (args.card.querySelector("img") as HTMLImageElement | null)?.src ||
    null;

  if (!args.productId || !title) return null;

  const priceText =
    args.card.querySelector(".mkpc-now")?.textContent ||
    args.card.querySelector("[data-price]")?.textContent ||
    "";

  const price = roundMoney(parseDomPrice(priceText));

  return {
    item_id: args.productId,
    item_name: title,
    ...(args.state?.itemListId ? { item_list_id: args.state.itemListId } : {}),
    ...(args.state?.itemListName
      ? { item_list_name: args.state.itemListName }
      : {}),
    price,
    quantity: 1,
    product_id: args.productId,
    variant_id: null,
    product_public_no: null,
    image_url: image,
  };
}

function buildSelectItemEvent(args: {
  item: TrackingItem;
  state: TrackingListState | null;
  data: any;
  bootstrap?: MalakBootstrap;
  device: string;
}): TrackingEvent {
  const itemListId =
    args.item.item_list_id ||
    args.state?.itemListId ||
    getTrackingListId(args.data);

  const itemListName =
    args.item.item_list_name ||
    args.state?.itemListName ||
    getTrackingListName(args.data);

  const item = {
    ...args.item,
    item_list_id: itemListId,
    item_list_name: itemListName,
    quantity: Math.max(1, Number(args.item.quantity || 1)),
  };

  const currency =
    args.state?.currency || getFallbackCurrency(args.data, args.bootstrap);

  const value = roundMoney(Number(item.price || 0) * Number(item.quantity || 1));

  return {
    name: "select_item",
    currency,
    value,
    items: [item],
    source: SOURCE,
    device: args.device || DEFAULT_DEVICE,
    route: getRoute(args.data) || "unknown",
    path: getCurrentPath(),
    payload: {
      item_list_id: itemListId,
      item_list_name: itemListName,
      product_id: item.product_id || item.item_id,
      product_public_no: item.product_public_no ?? null,
      index: item.index ?? null,
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
  const sentSelectItemsRef = useRef<Set<string>>(new Set());
  const sentPurchasesRef = useRef<Set<string>>(new Set());
  const listStateRef = useRef<TrackingListState | null>(null);

  const productVm = useMemo(() => {
    return buildProductVm({
      data,
      bootstrap,
    });
  }, [data, bootstrap]);

  const listState = useMemo(() => {
    return buildListTrackingState({
      data,
      bootstrap,
      device,
    });
  }, [data, bootstrap, device]);

  const purchaseEvent = useMemo(() => {
    return buildPurchaseEvent({
      data,
      bootstrap,
      device,
    });
  }, [data, bootstrap, device]);

  const route = getRoute(data);
  const productId = s(productVm?.id);

  useEffect(() => {
    listStateRef.current = listState;
  }, [listState]);

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
    if (!listState) return;

    const key = [
      listState.route,
      listState.path,
      listState.itemListId,
      listState.items.length,
      listState.value,
    ].join("|");

    if (sentViewCategoriesRef.current.has(key)) return;

    sentViewCategoriesRef.current.add(key);

    const event = buildViewCategoryEvent({
      state: listState,
      data,
      device,
    });

    sendTrackingEvent(event);
  }, [listState, data, device]);

  useEffect(() => {
    if (!purchaseEvent) return;

    const transactionId = firstText(purchaseEvent.payload?.transaction_id);
    if (!transactionId) return;

    const key = [
      purchaseEvent.name,
      transactionId,
      purchaseEvent.currency,
      purchaseEvent.value,
    ].join("|");

    if (sentPurchasesRef.current.has(key)) return;
    if (wasPurchaseAlreadySent(purchaseEvent)) return;

    sentPurchasesRef.current.add(key);

    sendTrackingEvent(purchaseEvent);
    markPurchaseAsSent(purchaseEvent);
  }, [purchaseEvent]);

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

  useEffect(() => {
    function sendSelectFromCard(args: {
      card: HTMLElement;
      productId: string;
    }) {
      const state = listStateRef.current;

      const item =
        state?.itemsById.get(args.productId) ||
        buildDomTrackingItem({
          card: args.card,
          productId: args.productId,
          state,
        });

      if (!item) return;

      const trackingEvent = buildSelectItemEvent({
        item,
        state,
        data,
        bootstrap,
        device,
      });

      const dedupeKey = [
        trackingEvent.name,
        trackingEvent.path,
        trackingEvent.payload?.item_list_id || "",
        trackingEvent.payload?.product_id || item.item_id,
      ].join("|");

      if (sentSelectItemsRef.current.has(dedupeKey)) return;

      sentSelectItemsRef.current.add(dedupeKey);

      window.setTimeout(() => {
        sentSelectItemsRef.current.delete(dedupeKey);
      }, 1200);

      sendTrackingEvent(trackingEvent);
    }

    function handleSelectItemClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (isBlockedSelectClick(event.target)) return;

      const found = findProductCardFromClick(event.target);
      if (!found?.productId) return;

      sendSelectFromCard({
        card: found.card,
        productId: found.productId,
      });
    }

    document.addEventListener("click", handleSelectItemClick, true);

    return () => {
      document.removeEventListener("click", handleSelectItemClick, true);
    };
  }, [data, bootstrap, device]);

  return null;
}