// FILE: apps/storefront/src/themes/malak/components/product-card/ProductCard.tsx

"use client";

import {
  ComponentProps,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Icon from "@/components/icon/Icon";

type IconName = ComponentProps<typeof Icon>["icon"];

export type ProductCardOptionValue = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  display_value?: string | null;
  displayValue?: string | null;
  color?: string | null;
  image?: string | null;
  image_url?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  stock_quantity?: number | string | null;
  stockQuantity?: number | string | null;
  available_qty?: number | string | null;
  availableQty?: number | string | null;
  unlimited_quantity?: boolean | number | string | null;
  unlimitedQuantity?: boolean | number | string | null;
  available?: boolean | number | string | null;
  is_available?: boolean | number | string | null;
  isAvailable?: boolean | number | string | null;
  in_stock?: boolean | number | string | null;
  inStock?: boolean | number | string | null;
  disabled?: boolean | number | string | null;
  metadata?: Record<string, any> | null;
};

export type ProductCardOption = {
  id?: string;
  name?: string;
  label?: string;
  values?: ProductCardOptionValue[];
};

type ProductCardTax = {
  enabled?: boolean | number | string | null;

  label?: string | null;
  tax_label?: string | null;
  taxLabel?: string | null;

  rate?: number | string | null;
  effective_rate?: number | string | null;
  effectiveRate?: number | string | null;
  default_rate?: number | string | null;
  defaultRate?: number | string | null;

  prices_include_tax?: boolean | number | string | null;
  pricesIncludeTax?: boolean | number | string | null;

  isIncludedInPrice?: boolean | number | string | null;
  is_included_in_price?: boolean | number | string | null;

  displayLabel?: string | null;
  display_label?: string | null;
};

export type ProductCardItem = {
  id: string;
  href: string;

  brand: string;
  title: string;

  subtitle?: string | null;
  promotionTitle?: string | null;
  metadata?: Record<string, any> | null;

  imageUrl: string;
  hoverImageUrl?: string | null;
  hover_image_url?: string | null;
  secondImageUrl?: string | null;
  second_image_url?: string | null;

  image_url?: string | null;
  images?: any[];
  media?: any[];
  seo?: Record<string, any> | null;

  stock?: Record<string, any> | null;
  variants?: any[];

  rating?: number | null;
  reviewsCount?: number | null;
  price: number;
  compareAtPrice?: number | null;

  currency?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  currency_symbol?: string | null;
  currencyDecimals?: number | string | null;
  currency_decimals?: number | string | null;
  decimalDigits?: number | string | null;
  decimal_digits?: number | string | null;

  badge?: { text: string; bg: string; color: string } | null;

  tax?: ProductCardTax | null;

  isOutOfStock?: boolean;

  saleEnd?: string | null;
  showSaleCountdown?: boolean;

  showDashInstead?: boolean;

  options?: ProductCardOption[];
};

type VisibleOptionValue = ProductCardOptionValue & {
  label: string;
  isUnavailable: boolean;
};

type VisibleOption = {
  title: string;
  values: VisibleOptionValue[];
};

function s(value: any) {
  return String(value ?? "").trim();
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
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

function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return fallback;
}

function readBoolMaybe(value: any): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return null;
}

function boolFromAttr(value: string | null | undefined, fallback = false) {
  return readBool(value, fallback);
}

function clampDecimals(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function formatPrice(n: number, decimalDigits = 0) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(Number(n || 0));
}

function readCurrencySymbol(item: ProductCardItem) {
  const anyItem = item as any;

  return (
    s(anyItem.currencySymbol) ||
    s(anyItem.currency_symbol) ||
    s(anyItem.symbol) ||
    s(anyItem.currency?.symbol) ||
    s(anyItem.store_currency?.symbol) ||
    s(anyItem.storeCurrency?.symbol) ||
    s(anyItem.metadata?.currencySymbol) ||
    s(anyItem.metadata?.currency_symbol) ||
    s(anyItem.metadata?.symbol) ||
    s(anyItem.metadata?.currency?.symbol) ||
    s(anyItem.metadata?.store_currency?.symbol) ||
    s(anyItem.metadata?.storeCurrency?.symbol) ||
    s(anyItem.currency_code) ||
    s(anyItem.currencyCode) ||
    s(anyItem.currency) ||
    s(anyItem.metadata?.currency_code) ||
    s(anyItem.metadata?.currencyCode) ||
    s(anyItem.metadata?.currency) ||
    ""
  );
}

function readCurrencyDecimals(item: ProductCardItem) {
  const anyItem = item as any;

  return clampDecimals(
    firstDefined(
      anyItem.currencyDecimals,
      anyItem.currency_decimals,
      anyItem.decimalDigits,
      anyItem.decimal_digits,
      anyItem.currency?.decimal_digits,
      anyItem.currency?.decimalDigits,
      anyItem.store_currency?.decimal_digits,
      anyItem.storeCurrency?.decimalDigits,
      anyItem.metadata?.currencyDecimals,
      anyItem.metadata?.currency_decimals,
      anyItem.metadata?.decimalDigits,
      anyItem.metadata?.decimal_digits,
      anyItem.metadata?.currency?.decimal_digits,
      anyItem.metadata?.currency?.decimalDigits,
      0,
    ),
  );
}

function calcDiscountPct(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function hasRealDiscount(price: number, compareAt?: number | null) {
  return !!compareAt && compareAt > price;
}

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getLeft(target: string | null | undefined) {
  if (!target) return null;

  const ts = new Date(target).getTime();
  if (!Number.isFinite(ts)) return null;

  const diff = ts - Date.now();
  if (diff <= 0) return null;

  const total = Math.floor(diff / 1000);

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return { days, hours, minutes, seconds };
}

function TinyUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="mkpc-tcd-unit">
      <div className="mkpc-tcd-box">{value}</div>
      <div className="mkpc-tcd-label">{label}</div>
    </div>
  );
}

function TinyColon() {
  return <div className="mkpc-tcd-colon">:</div>;
}

function ProductCardCountdown({ target }: { target?: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = window.setInterval(() => {
      setTick((x) => x + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mounted]);

  const left = useMemo(() => {
    if (!mounted) return null;
    return getLeft(target);
  }, [target, tick, mounted]);

  if (!mounted || !left) return null;

  return (
    <div className="mkpc-tcd-wrap" dir="ltr">
      <div className="mkpc-tcd-title">ينتهي الخصم خلال</div>

      <div className="mkpc-tcd-row">
        <TinyUnit value={String(left.days)} label="D" />
        <TinyColon />
        <TinyUnit value={pad2(left.hours)} label="H" />
        <TinyColon />
        <TinyUnit value={pad2(left.minutes)} label="M" />
        <TinyColon />
        <TinyUnit value={pad2(left.seconds)} label="S" />
      </div>
    </div>
  );
}

const ICONS: {
  heart: IconName;
  plus: IconName;
  star: IconName;
  image: IconName;
  eye: IconName;
} = {
  heart: "Favourite" as IconName,
  plus: "ShoppingBasketAdd01" as IconName,
  star: "Star" as IconName,
  image: "Image01" as IconName,
  eye: "View" as IconName,
};

function normalizeArabic(value: string) {
  return s(value)
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function isBrandOptionName(value: string) {
  const text = normalizeArabic(value);

  return (
    text === "الماركه" ||
    text === "ماركه" ||
    text === "البراند" ||
    text === "براند" ||
    text === "brand" ||
    text === "brands" ||
    text === "vendor" ||
    text === "الشركه" ||
    text === "شركة" ||
    text === "الشركة"
  );
}

function hasOptionsWithValues(options: any[]) {
  return (Array.isArray(options) ? options : []).some(
    (option) => Array.isArray(option?.values) && option.values.length > 0,
  );
}

function getOptions(item: ProductCardItem): ProductCardOption[] {
  const direct = Array.isArray(item.options) ? item.options : [];

  if (hasOptionsWithValues(direct)) return direct;

  const metadataOptions = item.metadata?.options;
  if (Array.isArray(metadataOptions) && hasOptionsWithValues(metadataOptions)) {
    return metadataOptions;
  }

  const seoOptions = item.metadata?.seo?.options || item.seo?.options;
  if (Array.isArray(seoOptions) && hasOptionsWithValues(seoOptions)) {
    return seoOptions;
  }

  return direct;
}

function optionLabel(value: ProductCardOptionValue) {
  return (
    s(value.label) ||
    s(value.display_value) ||
    s(value.displayValue) ||
    s(value.name) ||
    s(value.value) ||
    ""
  );
}

function optionColor(value: ProductCardOptionValue) {
  return s(value.color);
}

function readProductUnlimited(item: ProductCardItem) {
  return readBool(
    firstDefined(
      item.stock?.unlimited_quantity,
      item.stock?.unlimitedQuantity,
      item.seo?.stock?.unlimited_quantity,
      item.seo?.stock?.unlimitedQuantity,
      item.metadata?.stock?.unlimited_quantity,
      item.metadata?.stock?.unlimitedQuantity,
      item.metadata?.unlimited_quantity,
      item.metadata?.unlimitedQuantity,
      item.metadata?.qtyUnlimited,
      item.metadata?.quantityUnlimited,
    ),
    false,
  );
}

function getVariants(item: ProductCardItem) {
  const direct = item.variants;
  if (Array.isArray(direct) && direct.length) return direct;

  const metadataVariants = item.metadata?.variants;
  if (Array.isArray(metadataVariants) && metadataVariants.length) {
    return metadataVariants;
  }

  const seoVariants = item.metadata?.seo?.variants || item.seo?.variants;
  if (Array.isArray(seoVariants) && seoVariants.length) return seoVariants;

  return [];
}

function getVariantOptionValueIds(variant: any) {
  const ids = new Set<string>();

  const arrays = [
    variant?.option_value_ids,
    variant?.optionValueIds,
    variant?.selected_option_value_ids,
    variant?.selectedOptionValueIds,
  ];

  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;

    for (const id of arr) {
      const value = s(id);
      if (value) ids.add(value);
    }
  }

  const optionValues = Array.isArray(variant?.option_values)
    ? variant.option_values
    : [];

  for (const value of optionValues) {
    const id = s(value?.id) || s(value?.value_id) || s(value?.valueId);
    if (id) ids.add(id);
  }

  const selections = Array.isArray(variant?.selections)
    ? variant.selections
    : [];

  for (const selection of selections) {
    const id =
      s(selection?.valueId) ||
      s(selection?.value_id) ||
      s(selection?.id) ||
      s(selection?.option_value_id) ||
      s(selection?.optionValueId);

    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function isSellableVariant(variant: any, productUnlimited: boolean) {
  if (productUnlimited) return true;

  const unlimited = readBool(
    firstDefined(
      variant?.unlimited_quantity,
      variant?.unlimitedQuantity,
      variant?.qtyUnlimited,
      variant?.quantityUnlimited,
      variant?.metadata?.unlimited_quantity,
      variant?.metadata?.unlimitedQuantity,
    ),
    false,
  );

  if (unlimited) return true;

  const qty = safeNum(
    firstDefined(
      variant?.stock_quantity,
      variant?.stockQuantity,
      variant?.quantity,
      variant?.qty,
      variant?.available_qty,
      variant?.availableQty,
      variant?.metadata?.stock_quantity,
      variant?.metadata?.stockQuantity,
      variant?.metadata?.quantity,
      variant?.metadata?.qty,
    ),
  );

  if (qty !== null) return qty > 0;

  const available = readBoolMaybe(
    firstDefined(
      variant?.available,
      variant?.is_available,
      variant?.isAvailable,
      variant?.in_stock,
      variant?.inStock,
      variant?.metadata?.available,
      variant?.metadata?.is_available,
      variant?.metadata?.isAvailable,
      variant?.metadata?.in_stock,
      variant?.metadata?.inStock,
    ),
  );

  if (available !== null) return available;

  return true;
}

function readValueQty(value: ProductCardOptionValue) {
  return safeNum(
    firstDefined(
      value.quantity,
      value.qty,
      value.stock_quantity,
      value.stockQuantity,
      value.available_qty,
      value.availableQty,
      value.metadata?.quantity,
      value.metadata?.qty,
      value.metadata?.stock_quantity,
      value.metadata?.stockQuantity,
      value.metadata?.available_qty,
      value.metadata?.availableQty,
    ),
  );
}

function readValueUnlimited(value: ProductCardOptionValue) {
  return readBoolMaybe(
    firstDefined(
      value.unlimited_quantity,
      value.unlimitedQuantity,
      value.metadata?.unlimited_quantity,
      value.metadata?.unlimitedQuantity,
      value.metadata?.qtyUnlimited,
    ),
  );
}

function readValueAvailableFlag(value: ProductCardOptionValue) {
  const disabled = readBoolMaybe(
    firstDefined(value.disabled, value.metadata?.disabled),
  );

  if (disabled === true) return false;

  return readBoolMaybe(
    firstDefined(
      value.available,
      value.is_available,
      value.isAvailable,
      value.in_stock,
      value.inStock,
      value.metadata?.available,
      value.metadata?.is_available,
      value.metadata?.isAvailable,
      value.metadata?.in_stock,
      value.metadata?.inStock,
    ),
  );
}

function isOptionValueUnavailable(
  item: ProductCardItem,
  value: ProductCardOptionValue,
) {
  const valueId = s(value.id);

  const productUnlimited = readProductUnlimited(item);
  const variants = getVariants(item);

  if (variants.length && valueId) {
    const relatedVariants = variants.filter((variant) =>
      getVariantOptionValueIds(variant).includes(valueId),
    );

    if (relatedVariants.length) {
      return !relatedVariants.some((variant) =>
        isSellableVariant(variant, productUnlimited),
      );
    }
  }

  const unlimited = readValueUnlimited(value);
  if (unlimited === true) return false;

  const qty = readValueQty(value);
  if (qty !== null) return qty <= 0;

  const available = readValueAvailableFlag(value);
  if (available !== null) return !available;

  return false;
}

function getVisibleOptions(item: ProductCardItem): VisibleOption[] {
  return getOptions(item)
    .map((option) => {
      const title = s(option.label) || s(option.name);
      const values = Array.isArray(option.values) ? option.values : [];

      return {
        title,
        values: values
          .map((value) => ({
            ...value,
            label: optionLabel(value),
            isUnavailable: isOptionValueUnavailable(item, value),
          }))
          .filter((value) => value.label || optionColor(value))
          .slice(0, 6),
      };
    })
    .filter((option) => option.values.length > 0)
    .filter((option) => !isBrandOptionName(option.title))
    .slice(0, 2);
}

function ProductOptionsPreview({ options }: { options: VisibleOption[] }) {
  if (!options.length) return null;

  return (
    <div className="mkpc-options-overlay">
      {options.map((option, optionIndex) => (
        <div
          key={`${option.title || "option"}-${optionIndex}`}
          className="mkpc-options-overlay__group"
        >
          {option.title ? (
            <span className="mkpc-options-overlay__title">{option.title}</span>
          ) : null}

          <span className="mkpc-options-overlay__values">
            {option.values.map((value, valueIndex) => {
              const label = optionLabel(value);
              const color = optionColor(value);

              return color ? (
                <span
                  key={`${label}-${color}-${valueIndex}`}
                  className={[
                    "mkpc-options-overlay__box",
                    "mkpc-options-overlay__box--color",
                    value.isUnavailable ? "is-unavailable" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={
                    value.isUnavailable
                      ? `${label || color} - نفدت الكمية`
                      : label || color
                  }
                  style={{ background: color }}
                />
              ) : (
                <span
                  key={`${label}-${valueIndex}`}
                  className={[
                    "mkpc-options-overlay__box",
                    value.isUnavailable ? "is-unavailable" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={
                    value.isUnavailable ? `${label} - نفدت الكمية` : label
                  }
                >
                  {label}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

type ProductCardRootSettings = {
  disableLazyload: boolean;
  switchImageOnHover: boolean;
  showOptionsOnCard: boolean;
  showNormalCountdown: boolean;
  hoverStyle: string;

  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  taxPricesIncludeTax: boolean;
  taxIncludedInPrice: boolean;
  taxDisplayLabel: string;
};

const ROOT_SETTINGS_DEFAULT =
  "false|false|false|false|on_image_hover|false|VAT|0|false|false|";

const ROOT_SETTING_ATTRS = [
  "data-mk-disable-products-lazyload",
  "data-mk-switch-image-on-hover",
  "data-mk-productcard-options",
  "data-mk-show-normal-countdown",
  "data-mk-product-hover-style",
  "data-mk-tax-enabled",
  "data-mk-tax-label",
  "data-mk-tax-rate",
  "data-mk-tax-prices-include-tax",
  "data-mk-tax-included-in-price",
  "data-mk-tax-display-label",
];

const rootSettingsListeners = new Set<() => void>();

let rootSettingsObserver: MutationObserver | null = null;
let rootSettingsObservedRoot: HTMLElement | null = null;

function notifyRootSettingsListeners() {
  for (const listener of rootSettingsListeners) {
    listener();
  }
}

function getRootSettingsSnapshot() {
  if (typeof document === "undefined") return ROOT_SETTINGS_DEFAULT;

  const root = document.querySelector(".mk-root") as HTMLElement | null;
  if (!root) return ROOT_SETTINGS_DEFAULT;

  return [
    root.getAttribute("data-mk-disable-products-lazyload") || "false",
    root.getAttribute("data-mk-switch-image-on-hover") || "false",
    root.getAttribute("data-mk-productcard-options") || "false",
    root.getAttribute("data-mk-show-normal-countdown") || "false",
    root.getAttribute("data-mk-product-hover-style") || "on_image_hover",
    root.getAttribute("data-mk-tax-enabled") || "false",
    root.getAttribute("data-mk-tax-label") || "VAT",
    root.getAttribute("data-mk-tax-rate") || "0",
    root.getAttribute("data-mk-tax-prices-include-tax") || "false",
    root.getAttribute("data-mk-tax-included-in-price") || "false",
    root.getAttribute("data-mk-tax-display-label") || "",
  ].join("|");
}

function ensureRootSettingsObserver() {
  if (typeof document === "undefined") return;

  const root = document.querySelector(".mk-root") as HTMLElement | null;
  if (!root) return;

  if (rootSettingsObserver && rootSettingsObservedRoot === root) return;

  if (rootSettingsObserver) {
    rootSettingsObserver.disconnect();
    rootSettingsObserver = null;
    rootSettingsObservedRoot = null;
  }

  rootSettingsObserver = new MutationObserver(() => {
    notifyRootSettingsListeners();
  });

  rootSettingsObserver.observe(root, {
    attributes: true,
    attributeFilter: ROOT_SETTING_ATTRS,
  });

  rootSettingsObservedRoot = root;
}

function subscribeRootSettings(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  rootSettingsListeners.add(listener);
  ensureRootSettingsObserver();

  const timer = window.setTimeout(() => {
    ensureRootSettingsObserver();
    listener();
  }, 0);

  return () => {
    window.clearTimeout(timer);
    rootSettingsListeners.delete(listener);

    if (rootSettingsListeners.size === 0 && rootSettingsObserver) {
      rootSettingsObserver.disconnect();
      rootSettingsObserver = null;
      rootSettingsObservedRoot = null;
    }
  };
}

function parseRootSettingsSnapshot(
  snapshot: string,
): ProductCardRootSettings {
  const parts = String(snapshot || ROOT_SETTINGS_DEFAULT).split("|");

  return {
    disableLazyload: boolFromAttr(parts[0], false),
    switchImageOnHover: boolFromAttr(parts[1], false),
    showOptionsOnCard: boolFromAttr(parts[2], false),
    showNormalCountdown: boolFromAttr(parts[3], false),
    hoverStyle: s(parts[4]) || "on_image_hover",

    taxEnabled: boolFromAttr(parts[5], false),
    taxLabel: s(parts[6]) || "VAT",
    taxRate: safeNum(parts[7]) ?? 0,
    taxPricesIncludeTax: boolFromAttr(parts[8], false),
    taxIncludedInPrice: boolFromAttr(parts[9], false),
    taxDisplayLabel: s(parts[10]),
  };
}

function useProductCardRootSettings() {
  const snapshot = useSyncExternalStore(
    subscribeRootSettings,
    getRootSettingsSnapshot,
    () => ROOT_SETTINGS_DEFAULT,
  );

  return useMemo(() => parseRootSettingsSnapshot(snapshot), [snapshot]);
}

function readMediaUrl(value: any) {
  if (!value) return "";

  if (typeof value === "string") return s(value);

  return (
    s(value.original_url) ||
    s(value.public_url) ||
    s(value.image_url) ||
    s(value.imageUrl) ||
    s(value.url) ||
    s(value.src) ||
    s(value.path) ||
    ""
  );
}

function isImageMedia(value: any) {
  if (!value || typeof value !== "object") return false;

  const kind = s(value.media_kind || value.kind || value.type).toLowerCase();

  return !kind || kind === "image";
}

function getSortedMediaImages(value: any) {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .filter((row) => {
      if (typeof row === "string") return Boolean(s(row));
      return isImageMedia(row) && Boolean(readMediaUrl(row));
    })
    .sort((a: any, b: any) => {
      const ad = a?.is_default ? 1 : 0;
      const bd = b?.is_default ? 1 : 0;
      if (bd !== ad) return bd - ad;

      return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
    })
    .map((row) => readMediaUrl(row))
    .filter(Boolean);
}

function firstDifferentImage(mainImage: string, ...values: any[]) {
  const main = s(mainImage);

  for (const value of values) {
    const url = readMediaUrl(value);

    if (url && url !== main) return url;
  }

  return "";
}

function getHoverImage(item: ProductCardItem, mainImage: string) {
  const anyItem = item as any;

  const direct = firstDifferentImage(
    mainImage,
    item.hoverImageUrl,
    item.hover_image_url,
    item.secondImageUrl,
    item.second_image_url,
    item.metadata?.hoverImageUrl,
    item.metadata?.hover_image_url,
    item.metadata?.secondImageUrl,
    item.metadata?.second_image_url,
    item.metadata?.image2,
    item.metadata?.image_2,
    item.metadata?.second_image,
    item.metadata?.seo?.hoverImageUrl,
    item.metadata?.seo?.hover_image_url,
    item.metadata?.seo?.secondImageUrl,
    item.metadata?.seo?.second_image_url,
    item.seo?.hoverImageUrl,
    item.seo?.hover_image_url,
    item.seo?.secondImageUrl,
    item.seo?.second_image_url,
    anyItem?.thumbnail_hover_url,
    anyItem?.thumbnailHoverUrl,
    anyItem?.cover_hover_url,
    anyItem?.coverHoverUrl,
  );

  if (direct) return direct;

  const buckets = [
    item.images,
    item.media,
    item.metadata?.images,
    item.metadata?.media,
    item.metadata?.gallery,
    item.metadata?.product_images,
    item.metadata?.seo?.images,
    item.metadata?.seo?.media,
    item.seo?.images,
    item.seo?.media,
    anyItem?.gallery,
    anyItem?.product_images,
  ];

  for (const bucket of buckets) {
    const images = getSortedMediaImages(bucket);
    const found = images.find((url) => url && url !== mainImage);

    if (found) return found;
  }

  return "";
}

function getHoverStyleClass(style: string) {
  if (style === "always") return "mkpc-card--actions-always";
  if (style === "hidden") return "mkpc-card--actions-hidden";
  return "mkpc-card--actions-on-hover";
}

function getProductCardId(item: ProductCardItem) {
  const anyItem = item as any;

  return (
    s(anyItem.product_id) ||
    s(anyItem.productId) ||
    s(item.id) ||
    s(anyItem.product?.id)
  );
}

function isProductCardButtonClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      ".mkpc-action, .mkpc-cart-inline, button, [data-mk-favorite-button]",
    ),
  );
}

function resolveProductTaxDisplayLabel(
  item: ProductCardItem,
  rootSettings: ProductCardRootSettings,
) {
  const anyItem = item as any;

  const tax =
    anyItem.tax ||
    anyItem.metadata?.tax ||
    anyItem.raw?.tax ||
    anyItem.raw?.metadata?.tax ||
    null;

  const enabled = readBool(
    firstDefined(tax?.enabled, rootSettings.taxEnabled),
    rootSettings.taxEnabled,
  );

  const rate =
    safeNum(
      firstDefined(
        tax?.effective_rate,
        tax?.effectiveRate,
        tax?.rate,
        tax?.default_rate,
        tax?.defaultRate,
        rootSettings.taxRate,
      ),
    ) ?? rootSettings.taxRate;

  const pricesIncludeTax = readBool(
    firstDefined(
      tax?.prices_include_tax,
      tax?.pricesIncludeTax,
      rootSettings.taxPricesIncludeTax,
    ),
    rootSettings.taxPricesIncludeTax,
  );

  const isIncludedInPrice = readBool(
    firstDefined(
      tax?.isIncludedInPrice,
      tax?.is_included_in_price,
      rootSettings.taxIncludedInPrice,
    ),
    rootSettings.taxIncludedInPrice,
  );

  if (!enabled || rate <= 0 || (!pricesIncludeTax && !isIncludedInPrice)) {
    return "";
  }

  return (
    firstText(
      tax?.displayLabel,
      tax?.display_label,
      rootSettings.taxDisplayLabel,
    ) || "شامل الضريبة"
  );
}

export default function ProductCard({ item }: { item: ProductCardItem }) {
  const rootSettings = useProductCardRootSettings();

  const {
    disableLazyload,
    switchImageOnHover,
    showOptionsOnCard,
    showNormalCountdown,
    hoverStyle,
  } = rootSettings;

  const productCardId = getProductCardId(item);

  const subtitleRaw = item.subtitle ?? item.metadata?.subtitle ?? null;
  const promoRaw = item.promotionTitle ?? item.metadata?.promotionTitle ?? null;

  const imageUrl = s(item.imageUrl || item.image_url);
  const rawHoverImageUrl = getHoverImage(item, imageUrl);
  const hoverImageUrl =
    rawHoverImageUrl && rawHoverImageUrl !== imageUrl ? rawHoverImageUrl : "";

  const brand = s(item.brand);
  const title = s(item.title);

  const visibleOptions = useMemo(() => getVisibleOptions(item), [item]);
  const hasOptionsOverlay = showOptionsOnCard && visibleOptions.length > 0;
  const canSwitchImage = Boolean(switchImageOnHover && imageUrl && hoverImageUrl);

  const subtitle = useMemo(() => {
    const value = String(subtitleRaw ?? "").trim();
    return value ? value.slice(0, 58) : "";
  }, [subtitleRaw]);

  const promo = useMemo(() => {
    const value = String(promoRaw ?? "").trim();
    return value ? value.slice(0, 34) : "";
  }, [promoRaw]);

  const pct = calcDiscountPct(item.price, item.compareAtPrice);
  const topBadgeText = s(item.badge?.text) || promo;

  const isOutOfStock = Boolean(item.isOutOfStock);
  const showDashInstead = item.showDashInstead ?? true;
  const showDashPrice = Number(item.price ?? 0) <= 0 && showDashInstead;
  const hasDiscount = hasRealDiscount(item.price, item.compareAtPrice);

  const currencySymbol = readCurrencySymbol(item);
  const currencyDecimals = readCurrencyDecimals(item);
  const taxDisplayLabel = resolveProductTaxDisplayLabel(item, rootSettings);

  const shouldShowCountdown =
    showNormalCountdown &&
    hasDiscount &&
    Boolean(item.saleEnd) &&
    item.showSaleCountdown === true;

  const imgLoading = disableLazyload ? "eager" : "lazy";

  return (
    <>
      <a
        className={[
          "mkpc-card",
          isOutOfStock ? "mkpc-card--oos" : "",
          canSwitchImage ? "mkpc-card--switch-image" : "",
          hasOptionsOverlay ? "mkpc-card--has-options" : "",
          getHoverStyleClass(hoverStyle),
        ].join(" ")}
        href={item.href}
        dir="rtl"
        data-mk-product-card-id={productCardId || undefined}
        data-mk-favorite="false"
        onClickCapture={(e) => {
          if (!isProductCardButtonClick(e.target)) return;

          e.preventDefault();
        }}
      >
        <div className="mkpc-card-inner">
          <div className="mkpc-media">
            <div className="mkpc-actions">
              <button
                type="button"
                className="mkpc-action mkpc-action--fav"
                data-mk-favorite-button
                aria-label="إضافة للمفضلة"
                aria-pressed="false"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  window.dispatchEvent(
                    new CustomEvent("product:fav", { detail: item }),
                  );
                }}
              >
                <Icon icon={ICONS.heart} size={17} />
              </button>

              <button
                type="button"
                className="mkpc-action mkpc-action--quick"
                aria-label="عرض سريع"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  window.dispatchEvent(
                    new CustomEvent("product:quickview", { detail: item }),
                  );
                }}
              >
                <Icon icon={ICONS.eye} size={17} />
              </button>

              <button
                type="button"
                className="mkpc-action mkpc-action--cart"
                aria-label={isOutOfStock ? "نفدت الكمية" : "إضافة للسلة"}
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  window.dispatchEvent(
                    new CustomEvent("product:add-to-cart", { detail: item }),
                  );
                }}
              >
                <Icon icon={ICONS.plus} size={18} />
              </button>
            </div>

            {topBadgeText ? (
              <div className="mkpc-top-badge">
                <span
                  className="mkpc-top-badge-pill"
                  style={{
                    background:
                      item.badge?.bg || "var(--mk-product-promo-bg, #000000)",
                    color: item.badge?.color || "#fff",
                  }}
                >
                  {topBadgeText}
                </span>
              </div>
            ) : null}

            {shouldShowCountdown ? (
              <div className="mkpc-media-countdown">
                <ProductCardCountdown target={item.saleEnd} />
              </div>
            ) : null}

            {imageUrl ? (
              <>
                <img
                  className="mkpc-media-img mkpc-media-img--main"
                  src={imageUrl}
                  alt={title || "صورة المنتج"}
                  loading={imgLoading}
                  decoding="async"
                />

                {canSwitchImage ? (
                  <img
                    className="mkpc-media-img mkpc-media-img--hover"
                    src={hoverImageUrl}
                    alt={title || "صورة المنتج"}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </>
            ) : (
              <div className="mkpc-media-placeholder" aria-label="لا توجد صورة">
                <div className="mkpc-media-placeholder-icon">
                  <Icon icon={ICONS.image} size={26} />
                </div>

                <div className="mkpc-media-placeholder-text">لا توجد صورة</div>
              </div>
            )}

            {hasOptionsOverlay ? (
              <ProductOptionsPreview options={visibleOptions} />
            ) : null}

            {brand ? (
              <div
                className={[
                  "mkpc-brand-overlay",
                  hasOptionsOverlay
                    ? "mkpc-brand-overlay--left"
                    : "mkpc-brand-overlay--right",
                ].join(" ")}
              >
                <span title={brand}>{brand}</span>
              </div>
            ) : null}

            {typeof item.rating === "number" ? (
              <div className="mkpc-rating-overlay">
                <Icon icon={ICONS.star} className="mkpc-star-ic" />

                <span>{item.rating.toFixed(1)}</span>

                {item.reviewsCount ? (
                  <span className="mkpc-reviews">({item.reviewsCount})</span>
                ) : null}
              </div>
            ) : null}

            {isOutOfStock ? (
              <div className="mkpc-oos-overlay">
                <div className="mkpc-oos-stamp">نفدت الكمية</div>
              </div>
            ) : null}
          </div>

          <div className="mkpc-body">
            <div className="mkpc-info">
              <div className="mkpc-title" title={title}>
                {title}
              </div>

              {subtitle ? (
                <div className="mkpc-subtitle" title={String(subtitleRaw ?? "")}>
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div className="mkpc-footer">
              {hasDiscount ? (
                <div className="mkpc-deal-row">
                  {pct ? <span className="mkpc-off">خصم {pct}%</span> : null}

                  <div className="mkpc-compare">
                    {formatPrice(
                      Number(item.compareAtPrice || 0),
                      currencyDecimals,
                    )}

                    {currencySymbol ? (
                      <>
                        {" "}
                        <span className="mkpc-cur">{currencySymbol}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mkpc-bottom-row">
                <button
                  type="button"
                  className="mkpc-cart-inline"
                  aria-label={isOutOfStock ? "نفدت الكمية" : "إضافة للسلة"}
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    window.dispatchEvent(
                      new CustomEvent("product:add-to-cart", { detail: item }),
                    );
                  }}
                >
                  <Icon icon={ICONS.plus} size={19} />
                </button>

                <div className="mkpc-price-stack">
                  <div className="mkpc-price-label">
                    {hasDiscount ? "السعر بعد الخصم" : "السعر"}
                  </div>

                  <div className="mkpc-now">
                    {showDashPrice ? (
                      "—"
                    ) : (
                      <>
                        {formatPrice(item.price, currencyDecimals)}

                        {currencySymbol ? (
                          <>
                            {" "}
                            <span className="mkpc-cur mkpc-cur--main">
                              {currencySymbol}
                            </span>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>

                  {taxDisplayLabel ? (
                    <div className="mkpc-tax-label">{taxDisplayLabel}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>
    </>
  );
}