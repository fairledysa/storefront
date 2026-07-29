import "server-only";

import type { ProductRow } from "@/data/catalog/products";
import type { getStoreOptions } from "@/data/store/options";
import { toProductCardVM } from "@/data/viewmodels/product.vm";
import {
  getProductPriceView,
  shouldShowTaxIncludedLabel,
} from "@/lib/rules/product-rules";

import type { MobileCommerceContext } from "./commerce-context.server";
import type {
  MobileProductCard,
  MobileProductMarketing,
} from "./home/home.types";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function productMetaText(row: ProductRow, ...keys: string[]): string | null {
  const metadata = object(row.metadata);
  for (const key of keys) {
    const value = String(metadata[key] ?? "").trim();
    if (value) return value;
  }
  return null;
}

function fallbackOptions(row: ProductRow): MobileProductCard["options"] {
  return (Array.isArray(row.options) ? row.options : [])
    .map((option) => ({
      id: String(option.id),
      name: String(option.name ?? "").trim(),
      option_field_type: option.option_field_type
        ? String(option.option_field_type)
        : null,
      display_type: option.display_type ? String(option.display_type) : null,
      values: (Array.isArray(option.values) ? option.values : [])
        .map((value) => ({
          id: String(value.id),
          name: String(value.name ?? "").trim(),
          display_value:
            value.display_value == null ? null : String(value.display_value),
          image_url: value.image_url == null ? null : String(value.image_url),
        }))
        .filter((value) => value.name || value.display_value),
    }))
    .filter((option) => option.name && option.values.length > 0);
}

function legacyPricing(
  row: ProductRow,
  storeOptions: Awaited<ReturnType<typeof getStoreOptions>>,
) {
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const variantPrices = variants
    .flatMap((variant) => [number(variant.sale_price), number(variant.price)])
    .filter((value): value is number => value !== null && value >= 0);
  const pricing = row.pricing ?? null;
  const view = getProductPriceView(storeOptions, {
    id: row.id,
    name: row.name,
    price: pricing?.price ?? null,
    sale_price: pricing?.sale_price ?? null,
    min_price: variantPrices.length
      ? Math.min(...variantPrices)
      : pricing?.price ?? null,
    max_price: variantPrices.length
      ? Math.max(...variantPrices)
      : pricing?.price ?? null,
    has_variant_prices: variantPrices.length > 0,
    category_ids: row.seo?.categories?.map((category) => category.id) ?? [],
    is_digital: row.metadata?.is_digital === true,
  });

  return {
    price: view.price,
    salePrice: view.salePrice,
    mode: view.mode as "normal" | "start_from",
    minPrice: view.minPrice,
    maxPrice: view.maxPrice,
    currencyCode: String(pricing?.currency ?? row.seo?.currency ?? "SAR"),
    currencySymbol: String(pricing?.currency ?? row.seo?.currency ?? "SAR"),
    decimalDigits: 2,
    isOutOfStock: false,
    tax: {
      enabled: false,
      label: "VAT",
      rate: 0,
      prices_include_tax: false,
      should_add_tax_to_price: false,
      is_included_in_price: false,
      display_label: shouldShowTaxIncludedLabel(storeOptions)
        ? "شامل الضريبة"
        : null,
    },
  };
}

export function buildMobileProductCard(
  row: ProductRow,
  storeOptions: Awaited<ReturnType<typeof getStoreOptions>>,
  optionOverride?: MobileProductCard["options"],
  social?: {
    rating: number | null;
    reviewCount: number;
    soldQty: number;
    showRating: boolean;
    showPurchaseCount: boolean;
  },
  marketing?: MobileProductMarketing | null,
  commerce?: MobileCommerceContext | null,
): MobileProductCard {
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const pricing = row.pricing ?? null;
  const vm = commerce
    ? toProductCardVM({
        storeSlug: commerce.storeSlug,
        product: row,
        currencies: commerce.currencies,
        tax: commerce.tax,
      })
    : null;
  const legacy = vm ? null : legacyPricing(row, storeOptions);
  const variantCurrentPrices = (vm?.variants ?? [])
    .map((variant) => number(variant.sale_price) ?? number(variant.price))
    .filter((value): value is number => value !== null && value >= 0);
  const minPrice = variantCurrentPrices.length
    ? Math.min(...variantCurrentPrices)
    : vm?.price ?? legacy?.minPrice ?? null;
  const maxPrice = variantCurrentPrices.length
    ? Math.max(...variantCurrentPrices)
    : vm?.price ?? legacy?.maxPrice ?? null;
  const priceMode: "normal" | "start_from" =
    variantCurrentPrices.length > 1 && minPrice !== maxPrice
      ? "start_from"
      : legacy?.mode ?? "normal";

  const stock = row.stock ?? null;
  const unlimited = vm?.stock.unlimitedQuantity ?? stock?.unlimited_quantity === true;
  const quantity = vm?.stock.quantity ?? number(stock?.quantity);
  const options = optionOverride?.length ? optionOverride : fallbackOptions(row);
  const inStock = vm
    ? !vm.isOutOfStock
    : unlimited ||
      (quantity !== null && quantity > 0) ||
      variants.some(
        (variant) =>
          variant.unlimited_quantity || Number(variant.stock_quantity ?? 0) > 0,
      );

  const currencyCode =
    vm?.currency_code || String(pricing?.currency ?? row.seo?.currency ?? "SAR");
  const currencySymbol = vm?.currency_symbol || currencyCode;
  const decimalDigits = vm?.decimal_digits ?? 2;
  const tax = vm?.tax;

  return {
    id: row.id,
    public_no: row.public_no ?? null,
    name: row.name,
    image_url:
      row.thumbnail_url ??
      row.image_url ??
      row.media?.[0]?.thumbnail_url ??
      row.media?.[0]?.url ??
      null,
    currency: currencyCode,
    currency_code: currencyCode,
    currency_symbol: currencySymbol,
    decimal_digits: decimalDigits,
    price: vm?.regularPrice ?? legacy?.price ?? null,
    sale_price: vm?.salePrice ?? legacy?.salePrice ?? null,
    price_mode: priceMode,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock: inStock,
    stock_quantity: unlimited ? null : quantity,
    unlimited_quantity: unlimited,
    has_variants: variants.length > 0 || Boolean(options?.length),
    show_tax_included: Boolean(tax?.displayLabel ?? legacy?.tax.display_label),
    tax: tax
      ? {
          enabled: tax.enabled,
          label: tax.label,
          rate: tax.rate,
          prices_include_tax: tax.prices_include_tax,
          should_add_tax_to_price: tax.should_add_tax_to_price,
          is_included_in_price: tax.is_included_in_price,
          display_label: tax.display_label,
        }
      : legacy!.tax,
    promotional_title: productMetaText(
      row,
      "promotionTitle",
      "promotion_title",
      "promoTitle",
      "promo_title",
    ),
    rating: social?.showRating ? social.rating : null,
    review_count: social?.showRating ? social.reviewCount : 0,
    sold_qty:
      social?.soldQty ?? Math.max(0, Number(row.sold_qty ?? 0) || 0),
    show_rating: social?.showRating === true,
    show_purchase_count: social?.showPurchaseCount === true,
    marketing: marketing ?? null,
    options,
  };
}
