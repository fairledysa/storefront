// FILE: apps/storefront/src/themes/malak/components/product-cart/ProductCartRuntime.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MalakBootstrapCurrencies } from "../../bootstrap/types";

type AddToCartItem = {
  id?: string | null;
  product_id?: string | null;
  productId?: string | null;
  product?: {
    id?: string | null;
    name?: string | null;
    price?: number | string | null;
    sale_price?: number | string | null;
    currency?: string | null;
    currency_code?: string | null;
    currencyCode?: string | null;
    currency_symbol?: string | null;
    currencySymbol?: string | null;
    symbol?: string | null;
    decimal_digits?: number | string | null;
    decimalDigits?: number | string | null;
    currency_decimals?: number | string | null;
    currencyDecimals?: number | string | null;
  } | null;
  qty?: number | string | null;
  variant_id?: string | null;
  variantId?: string | null;
  selected_option_value_ids?: string[] | null;
  selectedOptionValueIds?: string[] | null;
  selected_options?: Array<{ name: string; value: string }> | null;
  selectedOptions?: Array<{ name: string; value: string }> | null;
  options?: any[];
  metadata?: Record<string, any> | null;
  seo?: Record<string, any> | null;
  imageUrl?: string | null;
  image_url?: string | null;
  title?: string | null;
  name?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  salePrice?: number | string | null;
  compareAtPrice?: number | string | null;
  currency?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  currency_symbol?: string | null;
  currencySymbol?: string | null;
  symbol?: string | null;
  decimal_digits?: number | string | null;
  decimalDigits?: number | string | null;
  currency_decimals?: number | string | null;
  currencyDecimals?: number | string | null;
  isOutOfStock?: boolean;
  quickView?: boolean;
  [key: string]: any;
};

type RuntimeCurrency = {
  code: string;
  symbol: string;
  name: string;
  rate: number;
  decimals: number;
  isDefault: boolean;
  enabled: boolean;
};

type RuntimeCurrencies = {
  defaultCode: string;
  selectedCookieName: string;
  items: RuntimeCurrency[];
};

type AddedNotice = {
  id: string;
  title: string;
  imageUrl: string;
  price: number | null;
  formattedPrice: string | null;
  qty: number;
  message: string;
  tone: "success" | "error";
};

type Props = {
  currencies?: MalakBootstrapCurrencies | null;
};

const API_URL = "/api/cart/items";

const FALLBACK_CURRENCY: RuntimeCurrency = {
  code: "SAR",
  symbol: "ر.س",
  name: "ريال سعودي",
  rate: 1,
  decimals: 2,
  isDefault: true,
  enabled: true,
};

const CURRENCY_STORAGE_KEYS = [
  "mk_currency",
  "mk_selected_currency",
  "malak_currency",
  "store_currency",
  "selected_currency",
  "currency",
];

function s(value: any) {
  return String(value ?? "").trim();
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled"].includes(text)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(text)) return false;
  }

  return fallback;
}

function cleanCurrencyCode(value: any) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positiveNum(value: any, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampDecimals(value: any, fallback = 2) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function readProductId(item: AddToCartItem) {
  return (
    s(item.product_id) ||
    s(item.productId) ||
    s(item.id) ||
    s(item.product?.id)
  );
}

function clampQty(value: any) {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function arr(value: any): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function normalizeSelectedOptions(value: any) {
  if (!Array.isArray(value)) return [];

  return value
    .map((row) => ({
      name: s(row?.name),
      value: s(row?.value),
    }))
    .filter((row) => row.name && row.value);
}

function normalizeRuntimeCurrency(row: any): RuntimeCurrency | null {
  const metadata =
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};

  const code = cleanCurrencyCode(
    row?.code ?? row?.currency_code ?? row?.currencyCode ?? row?.currency,
  );

  if (!code) return null;

  const isDefault = readBool(row?.is_default ?? row?.isDefault, false);

  return {
    code,
    symbol: s(row?.symbol) || code,
    name: s(row?.name) || s(row?.name_ar) || s(row?.name_en) || code,
    rate: isDefault
      ? 1
      : positiveNum(
          row?.rate ??
            row?.exchange_rate ??
            row?.exchangeRate ??
            row?.conversion_rate ??
            row?.conversionRate ??
            row?.rate_to_default ??
            row?.rateToDefault ??
            metadata?.rate_to_default ??
            metadata?.rateToDefault ??
            metadata?.exchange_rate ??
            metadata?.exchangeRate ??
            metadata?.rate ??
            metadata?.conversion_rate ??
            metadata?.conversionRate ??
            metadata?.value,
          1,
        ),
    decimals: clampDecimals(
      row?.decimals ??
        row?.decimal_digits ??
        row?.decimalDigits ??
        row?.currency_decimals ??
        row?.currencyDecimals,
      2,
    ),
    isDefault,
    enabled: readBool(row?.enabled ?? row?.is_enabled ?? row?.isEnabled, true),
  };
}

function buildRuntimeCurrencies(
  currencies?: MalakBootstrapCurrencies | null,
): RuntimeCurrencies {
  const rawItems = Array.isArray(currencies?.items) ? currencies.items : [];

  const items = rawItems
    .map(normalizeRuntimeCurrency)
    .filter(Boolean) as RuntimeCurrency[];

  const defaultCode =
    cleanCurrencyCode(currencies?.default_code) ||
    cleanCurrencyCode(items.find((item) => item.isDefault)?.code) ||
    FALLBACK_CURRENCY.code;

  const hasDefault = items.some((item) => item.code === defaultCode);

  const finalItems = hasDefault
    ? items.map((item) =>
        item.code === defaultCode
          ? {
              ...item,
              isDefault: true,
              rate: 1,
              enabled: true,
            }
          : item,
      )
    : [
        {
          ...FALLBACK_CURRENCY,
          code: defaultCode,
          symbol:
            defaultCode === FALLBACK_CURRENCY.code
              ? FALLBACK_CURRENCY.symbol
              : defaultCode,
          name: defaultCode,
        },
        ...items,
      ];

  return {
    defaultCode,
    selectedCookieName: s(currencies?.selected_cookie_name) || "mk_currency",
    items: finalItems.filter((item) => item.enabled || item.isDefault),
  };
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";

  const key = `${encodeURIComponent(name)}=`;
  const part = document.cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(key));

  if (!part) return "";

  try {
    return decodeURIComponent(part.slice(key.length));
  } catch {
    return part.slice(key.length);
  }
}

function readStoredCurrencyCode(cookieName: string) {
  if (typeof window === "undefined") return "";

  const keys = Array.from(new Set([cookieName, ...CURRENCY_STORAGE_KEYS]));

  for (const key of keys) {
    try {
      const value = cleanCurrencyCode(window.localStorage.getItem(key));
      if (value) return value;
    } catch {
      //
    }
  }

  for (const key of keys) {
    const value = cleanCurrencyCode(readCookie(key));
    if (value) return value;
  }

  return "";
}

function findCurrency(state: RuntimeCurrencies, code: string) {
  const target = cleanCurrencyCode(code);
  if (!target) return null;

  return state.items.find((item) => item.code === target) ?? null;
}

function normalizeSymbol(value: any) {
  return s(value).replace(/\s+/g, "").toUpperCase();
}

function findCurrencyBySymbol(state: RuntimeCurrencies, symbol: string) {
  const target = normalizeSymbol(symbol);
  if (!target) return null;

  return (
    state.items.find((item) => normalizeSymbol(item.symbol) === target) ??
    state.items.find((item) => normalizeSymbol(item.code) === target) ??
    null
  );
}

function readItemCurrencyCode(item: AddToCartItem) {
  return cleanCurrencyCode(
    item.currency_code ??
      item.currencyCode ??
      item.currency ??
      item.product?.currency_code ??
      item.product?.currencyCode ??
      item.product?.currency ??
      item.metadata?.currency_code ??
      item.metadata?.currencyCode ??
      item.metadata?.currency ??
      item.seo?.currency_code ??
      item.seo?.currencyCode ??
      item.seo?.currency,
  );
}

function readItemCurrencySymbol(item: AddToCartItem) {
  return (
    s(item.currency_symbol) ||
    s(item.currencySymbol) ||
    s(item.symbol) ||
    s(item.product?.currency_symbol) ||
    s(item.product?.currencySymbol) ||
    s(item.product?.symbol) ||
    s(item.metadata?.currency_symbol) ||
    s(item.metadata?.currencySymbol) ||
    s(item.metadata?.symbol) ||
    s(item.seo?.currency_symbol) ||
    s(item.seo?.currencySymbol) ||
    s(item.seo?.symbol)
  );
}

function readItemDecimals(item: AddToCartItem) {
  const value =
    item.currency_decimals ??
    item.currencyDecimals ??
    item.decimal_digits ??
    item.decimalDigits ??
    item.product?.currency_decimals ??
    item.product?.currencyDecimals ??
    item.product?.decimal_digits ??
    item.product?.decimalDigits ??
    item.metadata?.currency_decimals ??
    item.metadata?.currencyDecimals ??
    item.metadata?.decimal_digits ??
    item.metadata?.decimalDigits ??
    item.seo?.currency_decimals ??
    item.seo?.currencyDecimals ??
    item.seo?.decimal_digits ??
    item.seo?.decimalDigits;

  const n = Number(value);
  return Number.isFinite(n) ? clampDecimals(n, 0) : null;
}

 function readItemPrice(item: AddToCartItem) {
  const sale = safeNum(
    item.sale_price ??
      item.salePrice ??
      item.product?.sale_price ??
      item.metadata?.sale_price ??
      item.metadata?.salePrice ??
      item.metadata?.base_sale_price_fallback ??
      item.metadata?.baseSalePriceFallback,
  );

  if (sale !== null && sale > 0) return sale;

  const price = safeNum(
    item.price ??
      item.product?.price ??
      item.metadata?.price ??
      item.metadata?.regular_price ??
      item.metadata?.regularPrice ??
      item.metadata?.base_price_fallback ??
      item.metadata?.basePriceFallback ??
      item.metadata?.variants_price_min ??
      item.metadata?.variantsPriceMin,
  );

  return price !== null && price > 0 ? price : null;
}

function convertCurrencyAmount(args: {
  amount: number;
  sourceCode: string;
  selectedCode: string;
  state: RuntimeCurrencies;
}) {
  const source =
    findCurrency(args.state, args.sourceCode) ||
    findCurrency(args.state, args.state.defaultCode) ||
    FALLBACK_CURRENCY;

  const selected =
    findCurrency(args.state, args.selectedCode) ||
    findCurrency(args.state, args.state.defaultCode) ||
    FALLBACK_CURRENCY;

  if (source.code === selected.code) return args.amount;

  const sourceRate = positiveNum(source.rate, 1);
  const selectedRate = positiveNum(selected.rate, 1);

  const amountInDefault = args.amount * sourceRate;
  return amountInDefault / selectedRate;
}

function formatCurrencyAmount(amount: number, currency: RuntimeCurrency) {
  const formatted = new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency.decimals,
  }).format(Number(amount || 0));

  const symbol = s(currency.symbol) || currency.code;

  return `${symbol} ${formatted}`;
}

function formatItemPrice(
  item: AddToCartItem,
  currencies?: MalakBootstrapCurrencies | null,
) {
  const price = readItemPrice(item);
  if (price === null) return null;

  const state = buildRuntimeCurrencies(currencies);

  const selectedCode =
    readStoredCurrencyCode(state.selectedCookieName) ||
    cleanCurrencyCode(currencies?.active_code) ||
    cleanCurrencyCode(currencies?.selected_code) ||
    state.defaultCode;

  const selected =
    findCurrency(state, selectedCode) ||
    findCurrency(state, state.defaultCode) ||
    FALLBACK_CURRENCY;

  const explicitSourceCode = readItemCurrencyCode(item);
  const explicitSymbol = readItemCurrencySymbol(item);
  const explicitDecimals = readItemDecimals(item);

  let finalAmount = price;

  if (explicitSourceCode) {
    finalAmount = convertCurrencyAmount({
      amount: price,
      sourceCode: explicitSourceCode,
      selectedCode: selected.code,
      state,
    });
  } else if (explicitSymbol) {
    const symbolCurrency = findCurrencyBySymbol(state, explicitSymbol);

    if (symbolCurrency?.code && symbolCurrency.code !== selected.code) {
      finalAmount = convertCurrencyAmount({
        amount: price,
        sourceCode: symbolCurrency.code,
        selectedCode: selected.code,
        state,
      });
    }
  }

  const finalCurrency =
    explicitSourceCode || explicitSymbol
      ? selected
      : {
          ...selected,
          decimals:
            explicitDecimals !== null ? explicitDecimals : selected.decimals,
        };

  return formatCurrencyAmount(finalAmount, finalCurrency);
}

function hasOptionsWithValues(options: any[]) {
  return (Array.isArray(options) ? options : []).some(
    (option) => Array.isArray(option?.values) && option.values.length > 0,
  );
}

function readOptions(item: AddToCartItem) {
  const direct = Array.isArray(item.options) ? item.options : [];
  if (hasOptionsWithValues(direct)) return direct;

  const metadataOptions = item.metadata?.options;
  if (Array.isArray(metadataOptions) && hasOptionsWithValues(metadataOptions)) {
    return metadataOptions;
  }

  const seoOptions = item.seo?.options || item.metadata?.seo?.options;
  if (Array.isArray(seoOptions) && hasOptionsWithValues(seoOptions)) {
    return seoOptions;
  }

  return direct;
}

function needsQuickView(item: AddToCartItem) {
  if (item.quickView) return false;

  const selectedIds = arr(
    item.selected_option_value_ids || item.selectedOptionValueIds,
  );

  if (selectedIds.length > 0) return false;
  if (s(item.variant_id) || s(item.variantId)) return false;

  return hasOptionsWithValues(readOptions(item));
}

async function readJson(response: Response) {
  return await response.json().catch(() => ({}));
}

function toast(message: string) {
  window.dispatchEvent(
    new CustomEvent("toast", {
      detail: { message },
    }),
  );
}

function emitOptimisticAdd(args: {
  productId: string;
  qty: number;
  item: AddToCartItem;
}) {
  window.dispatchEvent(
    new CustomEvent("cart:optimistic-add", {
      detail: {
        product_id: args.productId,
        productId: args.productId,
        qty: args.qty,
        item: args.item,
      },
    }),
  );
}

function emitCartSync() {
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

function emitAddToCartError(args: {
  productId: string;
  item: AddToCartItem;
  message: string;
  code?: string;
  response?: any;
}) {
  window.dispatchEvent(
    new CustomEvent("product:add-to-cart:error", {
      detail: {
        product_id: args.productId,
        productId: args.productId,
        item: args.item,
        message: args.message,
        code: args.code || "ADD_TO_CART_ERROR",
        response: args.response,
      },
    }),
  );
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}

function isVisibleElement(el: Element | null): el is HTMLElement {
  if (!el) return false;

  const html = el as HTMLElement;
  const rect = html.getBoundingClientRect();
  const style = window.getComputedStyle(html);

  return (
    rect.width > 4 &&
    rect.height > 4 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity || 1) > 0
  );
}

function visibleArea(rect: DOMRect) {
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;

  const left = Math.max(0, rect.left);
  const right = Math.min(vw, rect.right);
  const top = Math.max(0, rect.top);
  const bottom = Math.min(vh, rect.bottom);

  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function findProductCard(productId: string) {
  const id = cssEscape(productId);
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-mk-product-card-id="${id}"]`,
    ),
  ).filter(isVisibleElement);

  if (!cards.length) return null;

  const scored = cards
    .map((card) => {
      const rect = card.getBoundingClientRect();

      return {
        card,
        area: visibleArea(rect),
        top: Math.max(0, rect.top),
        left: Math.max(0, rect.left),
      };
    })
    .filter((row) => row.area > 20);

  if (!scored.length) return cards[0];

  scored.sort((a, b) => {
    if (b.area !== a.area) return b.area - a.area;
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  return scored[0]?.card ?? cards[0];
}

function readMediaUrl(value: any) {
  if (!value) return "";
  if (typeof value === "string") return s(value);

  return (
    s(value.currentSrc) ||
    s(value.src) ||
    s(value.original_url) ||
    s(value.public_url) ||
    s(value.image_url) ||
    s(value.imageUrl) ||
    s(value.thumbnail_url) ||
    s(value.thumbnailUrl) ||
    s(value.url) ||
    s(value.path) ||
    ""
  );
}

function readItemImage(item: AddToCartItem) {
  const direct =
    s(item.imageUrl) ||
    s(item.image_url) ||
    s(item.thumbnail_url) ||
    s(item.thumbnailUrl) ||
    s(item.cover_url) ||
    s(item.coverUrl) ||
    s(item.metadata?.imageUrl) ||
    s(item.metadata?.image_url) ||
    s(item.metadata?.thumbnail_url) ||
    s(item.metadata?.thumbnailUrl) ||
    s(item.seo?.image) ||
    s(item.seo?.image_url) ||
    s(item.seo?.imageUrl) ||
    s(item.seo?.og_image_url);

  if (direct) return direct;

  const mediaBuckets = [
    item.media,
    item.images,
    item.metadata?.media,
    item.metadata?.images,
    item.metadata?.gallery,
    item.metadata?.product_images,
    item.seo?.media,
    item.seo?.images,
  ];

  for (const bucket of mediaBuckets) {
    if (!Array.isArray(bucket)) continue;

    for (const row of bucket) {
      const url = readMediaUrl(row);
      if (url) return url;
    }
  }

  return "";
}

function readItemTitle(item: AddToCartItem) {
  return (
    s(item.title) ||
    s(item.name) ||
    s(item.product?.name) ||
    s(item.metadata?.title) ||
    s(item.metadata?.name) ||
    "المنتج"
  );
}

function findLargestVisibleImage(selectors: string[]) {
  const images: HTMLImageElement[] = [];

  for (const selector of selectors) {
    document.querySelectorAll<HTMLImageElement>(selector).forEach((img) => {
      if (isVisibleElement(img)) images.push(img);
    });
  }

  if (!images.length) return null;

  images.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();

    return visibleArea(br) - visibleArea(ar);
  });

  return images[0] ?? null;
}

function findSourceImage(item: AddToCartItem, productId: string) {
  if (item.quickView) {
    const quickViewImage =
      document.querySelector<HTMLImageElement>(".mk-qv__image") ?? null;

    if (isVisibleElement(quickViewImage)) return quickViewImage;
  }

  const card = findProductCard(productId);

  const cardImage =
    card?.querySelector<HTMLImageElement>(".mkpc-media-img--main") ??
    card?.querySelector<HTMLImageElement>(".mkpc-media img") ??
    card?.querySelector<HTMLImageElement>("img") ??
    null;

  if (isVisibleElement(cardImage)) return cardImage;

  const productPageImage = findLargestVisibleImage([
    ".mk-dproduct-gallerySide img",
    ".mk-dproduct-gallery img",
    ".mk-product-gallery img",
    ".mk-pgallery img",
    ".mk-gallery img",
    ".swiper-slide-active img",
  ]);

  if (isVisibleElement(productPageImage)) return productPageImage;

  return null;
}

function pickCartTarget(candidates: HTMLElement[]) {
  const rows = candidates
    .filter(isVisibleElement)
    .map((el) => {
      const rect = el.getBoundingClientRect();

      return {
        el,
        rect,
        topBand: rect.top <= 190 ? 0 : 10000,
        leftScore: rect.left,
        topScore: rect.top,
      };
    })
    .filter((row) => row.rect.top < window.innerHeight);

  if (!rows.length) return null;

  rows.sort((a, b) => {
    if (a.topBand !== b.topBand) return a.topBand - b.topBand;
    if (a.topScore !== b.topScore) return a.topScore - b.topScore;
    return a.leftScore - b.leftScore;
  });

  return rows[0]?.el ?? null;
}

function findCartTarget() {
  const strongSelectors = [
    "[data-mk-cart-target='true']",
    "[data-mk-cart-button='true']",
    "[data-mk-cart-icon='true']",
    ".mk-desktop-nav__cart",
  ];

  for (const selector of strongSelectors) {
    const hit = pickCartTarget(
      Array.from(document.querySelectorAll<HTMLElement>(selector)),
    );

    if (hit) return hit;
  }

  const fallbackSelectors = [
    "[data-cart-target]",
    ".mk-cart-target",
    ".mk-header-cart",
    ".mk-header__cart",
    ".mk-header__cartBtn",
    ".mk-dmn__cart",
    ".mk-mega-nav__cart",
    ".mk-desktop-mega-nav__cart",
    "a[href='/cart']",
    "a[href$='/cart']",
    "a[href*='/cart']",
    "button[aria-label*='السلة']",
    "button[aria-label*='سلة']",
    "a[aria-label*='السلة']",
    "a[aria-label*='سلة']",
  ];

  const seen = new Set<HTMLElement>();
  const candidates: HTMLElement[] = [];

  for (const selector of fallbackSelectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (seen.has(el)) return;
      if (!isVisibleElement(el)) return;

      const rect = el.getBoundingClientRect();
      if (rect.top > 220) return;

      seen.add(el);
      candidates.push(el);
    });
  }

  return pickCartTarget(candidates);
}

function pulseCartTarget(target: HTMLElement | null) {
  if (!target) return;

  target.classList.remove("mk-cart-target-pulse");
  void target.offsetWidth;
  target.classList.add("mk-cart-target-pulse");

  window.setTimeout(() => {
    target.classList.remove("mk-cart-target-pulse");
  }, 900);
}

function shakeAddButtons(productId: string) {
  const id = cssEscape(productId);
  const buttons = new Set<HTMLElement>();

  const card = findProductCard(productId);

  card
    ?.querySelectorAll<HTMLElement>(".mkpc-action--cart, .mkpc-cart-inline")
    .forEach((button) => buttons.add(button));

  document
    .querySelectorAll<HTMLElement>(`[data-mk-cart-product-id="${id}"]`)
    .forEach((button) => buttons.add(button));

  document
    .querySelectorAll<HTMLElement>(".mk-pcart-submit")
    .forEach((button) => {
      if (isVisibleElement(button)) buttons.add(button);
    });

  buttons.forEach((button) => {
    button.classList.remove("mk-cart-limit-shake");
    void button.offsetWidth;
    button.classList.add("mk-cart-limit-shake");

    window.setTimeout(() => {
      button.classList.remove("mk-cart-limit-shake");
    }, 620);
  });
}

async function playAddToCartAnimation(item: AddToCartItem, productId: string) {
  const source = findSourceImage(item, productId);
  const target = findCartTarget();

  if (!source || !target) {
    pulseCartTarget(target);
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const src = source.currentSrc || source.src || readItemImage(item);
  if (!src) {
    pulseCartTarget(target);
    return;
  }

  const sourceRatio = sourceRect.width / Math.max(1, sourceRect.height);

  const startWidth = Math.max(112, Math.min(sourceRect.width, 320));
  const startHeight = Math.max(
    112,
    Math.min(startWidth / Math.max(0.55, sourceRatio), 420),
  );

  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  const startLeft = sourceCenterX - startWidth / 2;
  const startTop = sourceCenterY - startHeight / 2;

  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  const finalScale = Math.max(
    0.045,
    Math.min(0.09, 20 / Math.max(1, Math.min(startWidth, startHeight))),
  );

  const lift = Math.max(150, Math.min(260, Math.abs(dy) * 0.35 + 150));

  const ghost = document.createElement("img");

  ghost.src = src;
  ghost.alt = "";
  ghost.className = "mk-cart-fly-ghost";

  ghost.style.width = `${startWidth}px`;
  ghost.style.height = `${startHeight}px`;
  ghost.style.left = `${startLeft}px`;
  ghost.style.top = `${startTop}px`;
  ghost.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
  ghost.style.opacity = "1";

  document.body.appendChild(ghost);

  try {
    if (typeof ghost.animate === "function") {
      const animation = ghost.animate(
        [
          {
            offset: 0,
            transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
            opacity: 1,
            filter: "blur(0px)",
          },
          {
            offset: 0.1,
            transform: `translate3d(${dx * 0.04}px, -18px, 0) scale(.98) rotate(-1deg)`,
            opacity: 1,
            filter: "blur(0px)",
          },
          {
            offset: 0.44,
            transform: `translate3d(${dx * 0.36}px, ${
              dy * 0.36 - lift
            }px, 0) scale(.54) rotate(-9deg)`,
            opacity: 0.98,
            filter: "blur(0px)",
          },
          {
            offset: 0.74,
            transform: `translate3d(${dx * 0.76}px, ${
              dy * 0.76 - lift * 0.38
            }px, 0) scale(.25) rotate(7deg)`,
            opacity: 0.82,
            filter: "blur(.15px)",
          },
          {
            offset: 1,
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${finalScale}) rotate(12deg)`,
            opacity: 0,
            filter: "blur(.8px)",
          },
        ],
        {
          duration: 920,
          easing: "cubic-bezier(.17,.88,.22,1)",
          fill: "forwards",
        },
      );

      await animation.finished.catch(() => undefined);
    } else {
      ghost.style.transition =
        "transform 920ms cubic-bezier(.17,.88,.22,1), opacity 920ms ease, filter 920ms ease";

      window.requestAnimationFrame(() => {
        ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${finalScale}) rotate(12deg)`;
        ghost.style.opacity = "0";
        ghost.style.filter = "blur(.8px)";
      });

      await new Promise((resolve) => window.setTimeout(resolve, 940));
    }
  } finally {
    ghost.remove();
    pulseCartTarget(target);
  }
}

function readAddedQty(json: any, fallback: number) {
  const noticeAdded = safeNum(json?.data?.notice?.added_now);
  if (noticeAdded !== null) return Math.max(0, Math.floor(noticeAdded));

  const stockAdded = safeNum(json?.data?.stock?.added_now);
  if (stockAdded !== null) return Math.max(0, Math.floor(stockAdded));

  return clampQty(fallback);
}

function buildAddedNotice(args: {
  item: AddToCartItem;
  productId: string;
  addedQty: number;
  message: string;
  tone?: "success" | "error";
  currencies?: MalakBootstrapCurrencies | null;
}): AddedNotice {
  return {
    id: `${args.productId}-${Date.now()}`,
    title: readItemTitle(args.item),
    imageUrl: readItemImage(args.item),
    price: readItemPrice(args.item),
    formattedPrice: formatItemPrice(args.item, args.currencies),
    qty: args.addedQty,
    message: args.message || "تمت إضافة المنتج للسلة",
    tone: args.tone || "success",
  };
}

export default function ProductCartRuntime({ currencies = null }: Props) {
  const pendingRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const [addedNotice, setAddedNotice] = useState<AddedNotice | null>(null);

  const paintDom = useCallback(() => {
    const pending = pendingRef.current;

    document
      .querySelectorAll<HTMLElement>("[data-mk-product-card-id]")
      .forEach((card) => {
        const productId = s(card.getAttribute("data-mk-product-card-id"));
        if (!productId) return;

        const isLoading = pending.has(productId);
        card.classList.toggle("is-cart-loading", isLoading);

        card
          .querySelectorAll<HTMLButtonElement>(
            ".mkpc-action--cart, .mkpc-cart-inline",
          )
          .forEach((button) => {
            if (!button.hasAttribute("data-mk-original-disabled")) {
              button.setAttribute(
                "data-mk-original-disabled",
                button.disabled ? "true" : "false",
              );
            }

            const originallyDisabled =
              button.getAttribute("data-mk-original-disabled") === "true";

            button.classList.toggle("is-loading", isLoading);
            button.disabled =
              isLoading ||
              originallyDisabled ||
              button.getAttribute("aria-disabled") === "true";
          });
      });

    document
      .querySelectorAll<HTMLButtonElement>("[data-mk-cart-product-id]")
      .forEach((button) => {
        const productId = s(button.getAttribute("data-mk-cart-product-id"));
        if (!productId) return;

        if (!button.hasAttribute("data-mk-original-disabled")) {
          button.setAttribute(
            "data-mk-original-disabled",
            button.disabled ? "true" : "false",
          );
        }

        const originallyDisabled =
          button.getAttribute("data-mk-original-disabled") === "true";

        const isLoading = pending.has(productId);
        button.classList.toggle("is-loading", isLoading);
        button.disabled =
          isLoading ||
          originallyDisabled ||
          button.getAttribute("data-disabled") === "true";
      });
  }, []);

  const schedulePaint = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      paintDom();
    });
  }, [paintDom]);

  const showAddedNotice = useCallback((notice: AddedNotice) => {
    setAddedNotice(notice);

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setAddedNotice(null);
      noticeTimerRef.current = null;
    }, notice.tone === "error" ? 6500 : 5200);
  }, []);

  useEffect(() => {
    const onAddToCart = async (event: Event) => {
      const item = (event as CustomEvent<AddToCartItem>).detail;
      if (!item) return;

      const productId = readProductId(item);
      if (!productId) return;

      if (item.isOutOfStock) {
        const message = "نفدت الكمية";

        shakeAddButtons(productId);
        toast(message);

        showAddedNotice(
          buildAddedNotice({
            item,
            productId,
            addedQty: 0,
            message,
            tone: "error",
            currencies,
          }),
        );

        emitAddToCartError({
          productId,
          item,
          message,
          code: "OUT_OF_STOCK",
        });

        return;
      }

      if (needsQuickView(item)) {
        window.dispatchEvent(
          new CustomEvent("product:quickview", {
            detail: item,
          }),
        );
        return;
      }

      if (pendingRef.current.has(productId)) return;

      const requestedQty = clampQty(item.qty);

      pendingRef.current.add(productId);
      schedulePaint();

      try {
        const variantId = s(item.variant_id) || s(item.variantId) || null;

        const selectedOptionValueIds = arr(
          item.selected_option_value_ids || item.selectedOptionValueIds,
        );

        const selectedOptions = normalizeSelectedOptions(
          item.selected_options || item.selectedOptions,
        );

        const response = await fetch(API_URL, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
            variant_id: variantId,
            qty: requestedQty,
            selected_option_value_ids: selectedOptionValueIds,
            selected_options: selectedOptions,
          }),
        });

        const json = await readJson(response);

        if (!response.ok) {
          const message =
            s(json?.message) || s(json?.error) || "تعذر إضافة المنتج للسلة";

          shakeAddButtons(productId);
          toast(message);

          showAddedNotice(
            buildAddedNotice({
              item,
              productId,
              addedQty: 0,
              message,
              tone: "error",
              currencies,
            }),
          );

          emitAddToCartError({
            productId,
            item,
            message,
            code: s(json?.error) || "ADD_TO_CART_FAILED",
            response: json,
          });

          return;
        }

        const noticeCode = s(json?.data?.notice?.code);
        const noticeMessage = s(json?.data?.notice?.message);
        const addedQty = readAddedQty(json, requestedQty);

        if (noticeCode === "QTY_LIMIT_REACHED" || addedQty <= 0) {
          const message =
            noticeMessage || "وصلت للحد الأقصى المسموح لهذا المنتج داخل السلة.";

          shakeAddButtons(productId);
          toast(message);

          showAddedNotice(
            buildAddedNotice({
              item,
              productId,
              addedQty: 0,
              message,
              tone: "error",
              currencies,
            }),
          );

          emitAddToCartError({
            productId,
            item,
            message,
            code: noticeCode || "QTY_LIMIT_REACHED",
            response: json,
          });

          return;
        }

        await playAddToCartAnimation(item, productId).catch(() => undefined);

        emitOptimisticAdd({
          productId,
          qty: addedQty,
          item,
        });

        emitCartSync();

        window.dispatchEvent(
          new CustomEvent("product:add-to-cart:done", {
            detail: {
              product_id: productId,
              productId,
              item,
              response: json,
              addedQty,
            },
          }),
        );

        showAddedNotice(
          buildAddedNotice({
            item,
            productId,
            addedQty,
            message: noticeMessage || "تمت إضافة المنتج للسلة",
            tone: "success",
            currencies,
          }),
        );
      } catch {
        const message = "تعذر إضافة المنتج للسلة";

        shakeAddButtons(productId);
        toast(message);

        showAddedNotice(
          buildAddedNotice({
            item,
            productId,
            addedQty: 0,
            message,
            tone: "error",
            currencies,
          }),
        );

        emitAddToCartError({
          productId,
          item,
          message,
          code: "ADD_TO_CART_FAILED",
        });
      } finally {
        pendingRef.current.delete(productId);
        schedulePaint();
      }
    };

    window.addEventListener("product:add-to-cart", onAddToCart);

    return () => {
      window.removeEventListener("product:add-to-cart", onAddToCart);

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }

      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, [currencies, schedulePaint, showAddedNotice]);

  return (
    <>
      {addedNotice ? (
        <div
          className={[
            "mk-cart-added",
            addedNotice.tone === "error" ? "mk-cart-added--error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          dir="rtl"
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            className="mk-cart-added__close"
            aria-label="إغلاق"
            onClick={() => setAddedNotice(null)}
          >
            ×
          </button>

          <div className="mk-cart-added__media">
            {addedNotice.imageUrl ? (
              <img src={addedNotice.imageUrl} alt="" />
            ) : (
              <span />
            )}
          </div>

          <div className="mk-cart-added__body">
            <div className="mk-cart-added__eyebrow">{addedNotice.message}</div>

            <div className="mk-cart-added__title" title={addedNotice.title}>
              {addedNotice.title}
            </div>

            <div className="mk-cart-added__meta">
              {addedNotice.tone === "success" ? (
                <span>الكمية: {addedNotice.qty}</span>
              ) : (
                <span>لم تتم زيادة الكمية</span>
              )}

              {addedNotice.formattedPrice ? (
                <strong dir="ltr">{addedNotice.formattedPrice}</strong>
              ) : null}
            </div>

            {addedNotice.tone === "success" ? (
              <div className="mk-cart-added__actions">
                <a href="/cart">عرض السلة</a>
                <a href="/checkout" className="mk-cart-added__checkout">
                  إتمام الطلب
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}