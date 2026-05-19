// lib/rules/product-rules.ts
import type { StoreOptions } from "@/lib/store-options";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

export type ProductRuleInput = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  hs_code?: string | null;

  weight?: number | string | null;
  weight_unit?: string | null;

  price?: number | string | null;
  sale_price?: number | string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;

  is_digital?: boolean | null;

  brand_id?: string | null;
  tag_ids?: string[];
  category_ids?: string[];

  has_variant_prices?: boolean | null;
};

export function shouldShowProductSku(
  options: StoreOptions,
  product: ProductRuleInput
) {
  return options.switches.showProductSku && !!s(product.sku);
}

export function shouldShowProductWeight(
  options: StoreOptions,
  product: ProductRuleInput
) {
  return options.switches.showWeight && n(product.weight) !== null;
}

export function shouldShowHsCode(
  options: StoreOptions,
  product: ProductRuleInput
) {
  return options.switches.hsCodeEnabled && !!s(product.hs_code);
}

export function shouldShowDashInstead(options: StoreOptions) {
  return options.switches.showDashInstead;
}

export function getDisplayValue(
  value: unknown,
  options: StoreOptions
): string {
  const text = s(value);
  if (text) return text;
  return shouldShowDashInstead(options) ? "-" : "";
}

export function shouldUsePriceStartFrom(
  options: StoreOptions,
  product: ProductRuleInput
) {
  return !!(
    options.switches.priceStartFrom &&
    product.has_variant_prices &&
    n(product.min_price) !== null
  );
}

export function getProductPriceView(
  options: StoreOptions,
  product: ProductRuleInput
) {
  const price = n(product.price);
  const salePrice = n(product.sale_price);
  const minPrice = n(product.min_price);
  const maxPrice = n(product.max_price);

  const hasRange =
    minPrice !== null &&
    maxPrice !== null &&
    minPrice !== maxPrice;

  if (shouldUsePriceStartFrom(options, product) && minPrice !== null) {
    return {
      mode: "start_from" as const,
      price: minPrice,
      salePrice: null,
      minPrice,
      maxPrice,
      hasRange,
    };
  }

  return {
    mode: "normal" as const,
    price,
    salePrice,
    minPrice,
    maxPrice,
    hasRange,
  };
}

export function shouldProtectDigitalProduct(
  options: StoreOptions,
  product: ProductRuleInput
) {
  return !!(
    options.switches.digitalProductProtection &&
    product.is_digital
  );
}

export function shouldShowSeeMoreButton(
  options: StoreOptions,
  description?: string | null
) {
  if (!options.switches.seeMoreButton) return false;
  return s(description).length > 140;
}

export function canShowPurchaseCount(
  options: StoreOptions,
  product: ProductRuleInput
) {
  const cfg = options.productPurchaseCount;
  if (!cfg.enabled) return false;

  if (!cfg.selectedCategoriesOnly) return true;

  const ids = Array.isArray(product.category_ids)
    ? product.category_ids.map(String)
    : [];

  return ids.some((id) => cfg.categoryIds.includes(id));
}

export function getProductRecommendationMode(options: StoreOptions) {
  if (!options.productRecommendations.enabled) return null;
  return options.productRecommendations.type;
}

export function shouldShowRecommendations(options: StoreOptions) {
  return !!options.productRecommendations.enabled;
}

export function shouldShowTaxIncludedLabel(options: StoreOptions) {
  return options.switches.taxIncluded;
}