// FILE: apps/storefront/src/themes/malak/screens-mobile/product/ProductMobileScreen.tsx
"use client";

import { useMemo, useState } from "react";

import MobileProductGallery from "./_components/MobileProductGallery";
import MobileProductInfo from "./_components/MobileProductInfo";
import MobileProductTabs from "./_components/MobileProductTabs";
import MobileStickyAddToCart from "./_components/MobileStickyAddToCart";
import MobileRecommendedProducts from "./_components/MobileRecommendedProducts";

import ProductReviews from "../../screens/product/_components/ProductReviews";

import {
  toProductDetailVM,
  type ProductDetailVM,
} from "@/data/viewmodels/product.vm";
import type { SeoUrlMode } from "@/data/store/settings";
import { parseStoreOptions } from "@/lib/store-options";
import { buildCategoryHref as buildStoreCategoryHref } from "@/lib/seo/build-store-href";
import type { MalakBootstrapProductOptions } from "../../bootstrap/types";

type Props = { data?: any };

type ProductSpecRow = {
  id: string;
  name: string;
  value: string;
};

type ProductCategoryItem = {
  id: string;
  name: string;
  href?: string | null;
  public_no?: number | null;
  publicNo?: number | null;
  short_url?: string | null;
  shortUrl?: string | null;
  slug?: string | null;
  slug_ar?: string | null;
  slug_en?: string | null;
  slug_name_ar?: string | null;
  slug_name_en?: string | null;
};

type ProductSizeGuideItem = {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  categoryIds: string[];
  sortOrder: number;
};

type ProductScreenCurrencyRow = {
  code: string;
  symbol: string;
  decimalDigits: number;
  rate: number;
  isDefault: boolean;
  enabled: boolean;
};

type ProductScreenCurrencyRuntime = {
  defaultCode: string;
  targetCode: string;
  targetSymbol: string;
  targetDecimals: number;
  map: Map<string, ProductScreenCurrencyRow>;
};

type ProductRatingSettings = {
  displayCustomerReviews: boolean;
  showRatingSummary: boolean;
  showRecommendation: boolean;
  allowHiddenNames: boolean;
  allowLikes: boolean;
  allowAttachImages: boolean;
};

const PRODUCT_OPTIONS_FALLBACK: MalakBootstrapProductOptions = {
  show_singleSelection: false,
  show_multipleOption: false,

  enable_add_product_toast: true,

  activate_zoom: false,

  enhanced_brand_senction: false,

  thumbs_bottom: true,
  disable_thumbs_in_mobile: false,

  show_payments_in_product_single: true,
  show_category_in_product_single: false,

  hide_ratings: false,

  replace_slider_text: false,
  hide_countdown: false,
  show_discounted_amount: true,

  update_both_prices: false,
  hide_top_price: false,

  top_details_tabs: true,
  mini_offers_box: true,

  show_product_features: false,
  show_sidebar: false,

  show_sticky_product: true,
  sticky_add_to_cart: true,

  show_tags: true,

  slider_background_size: "cover",
};

const RATING_SETTINGS_FALLBACK: ProductRatingSettings = {
  displayCustomerReviews: true,
  showRatingSummary: true,
  showRecommendation: true,
  allowHiddenNames: false,
  allowLikes: false,
  allowAttachImages: false,
};

function resolveCurrenciesFromData(data: any) {
  return (
    data?.bootstrap?.currencies ||
    data?.currencies ||
    data?.store?.currencies ||
    data?.theme?.currencies ||
    data?.settings?.currencies ||
    null
  );
}

function resolveTaxFromData(data: any) {
  return (
    data?.bootstrap?.tax ||
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
    data?.tax_settings ||
    data?.taxSettings ||
    null
  );
}

function normalizeMode(value: any): SeoUrlMode {
  const mode = String(value?.mode ?? value ?? "").trim();

  if (mode === "short" || mode === "named_ar" || mode === "named_en") {
    return mode;
  }

  return "named_ar";
}

function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value: any) {
  return String(value ?? "").trim();
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function firstText(...values: any[]) {
  for (const value of values) {
    const t = text(value);
    if (t) return t;
  }

  return "";
}

function clampDecimals(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function intOrNull(value: any): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function readBool(value: any, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) {
      return false;
    }
  }

  if (value && typeof value === "object") {
    if ("enabled" in value) return readBool(value.enabled, fallback);
    if ("is_enabled" in value) return readBool(value.is_enabled, fallback);
    if ("checked" in value) return readBool(value.checked, fallback);
    if ("value" in value) return readBool(value.value, fallback);
  }

  return fallback;
}

function readMetaBool(meta: any, keys: string[]) {
  for (const key of keys) {
    const value = meta?.[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
  }

  return false;
}

function normalizeRatingSettings(source: any): ProductRatingSettings {
  const settings =
    source && typeof source === "object" && !Array.isArray(source)
      ? source
      : {};

  return {
    displayCustomerReviews: readBool(
      firstValue(
        settings.displayCustomerReviews,
        settings.display_customer_reviews,
      ),
      RATING_SETTINGS_FALLBACK.displayCustomerReviews,
    ),

    showRatingSummary: readBool(
      firstValue(settings.showRatingSummary, settings.show_rating_summary),
      RATING_SETTINGS_FALLBACK.showRatingSummary,
    ),

    showRecommendation: readBool(
      firstValue(settings.showRecommendation, settings.show_recommendation),
      RATING_SETTINGS_FALLBACK.showRecommendation,
    ),

    allowHiddenNames: readBool(
      firstValue(settings.allowHiddenNames, settings.allow_hidden_names),
      RATING_SETTINGS_FALLBACK.allowHiddenNames,
    ),

    allowLikes: readBool(
      firstValue(settings.allowLikes, settings.allow_likes),
      RATING_SETTINGS_FALLBACK.allowLikes,
    ),

    allowAttachImages: readBool(
      firstValue(settings.allowAttachImages, settings.allow_attach_images),
      RATING_SETTINGS_FALLBACK.allowAttachImages,
    ),
  };
}

function readCurrencySymbol(args: {
  productVm: ProductDetailVM;
  product: any;
  rawProduct: any;
  data: any;
}) {
  const vm: any = args.productVm ?? {};
  const product: any = args.product ?? {};
  const rawProduct: any = args.rawProduct ?? {};
  const data: any = args.data ?? {};
  const bootstrap: any = data?.bootstrap || data?.theme?.bootstrap || {};

  return firstText(
    vm.currencySymbol,
    vm.currency_symbol,
    vm.symbol,
    vm.currency?.symbol,
    vm.storeCurrency?.symbol,
    vm.store_currency?.symbol,
    vm.pricing?.currencySymbol,
    vm.pricing?.currency_symbol,
    vm.pricing?.currency?.symbol,

    product.currencySymbol,
    product.currency_symbol,
    product.symbol,
    product.currency?.symbol,
    product.storeCurrency?.symbol,
    product.store_currency?.symbol,
    product.pricing?.currencySymbol,
    product.pricing?.currency_symbol,
    product.pricing?.currency?.symbol,
    product.product_pricing?.currencySymbol,
    product.product_pricing?.currency_symbol,
    product.product_pricing?.currency?.symbol,

    product.metadata?.currencySymbol,
    product.metadata?.currency_symbol,
    product.metadata?.symbol,
    product.metadata?.currency?.symbol,
    product.metadata?.storeCurrency?.symbol,
    product.metadata?.store_currency?.symbol,

    rawProduct.currencySymbol,
    rawProduct.currency_symbol,
    rawProduct.symbol,
    rawProduct.currency?.symbol,
    rawProduct.storeCurrency?.symbol,
    rawProduct.store_currency?.symbol,

    data.currencySymbol,
    data.currency_symbol,
    data.symbol,
    data.currency?.symbol,
    data.storeCurrency?.symbol,
    data.store_currency?.symbol,
    data.store?.currencySymbol,
    data.store?.currency_symbol,
    data.store?.currency?.symbol,
    data.store?.storeCurrency?.symbol,
    data.store?.store_currency?.symbol,

    bootstrap.currencySymbol,
    bootstrap.currency_symbol,
    bootstrap.symbol,
    bootstrap.currency?.symbol,
    bootstrap.storeCurrency?.symbol,
    bootstrap.store_currency?.symbol,
  );
}

function readCurrencyDecimals(args: {
  productVm: ProductDetailVM;
  product: any;
  rawProduct: any;
  data: any;
}) {
  const vm: any = args.productVm ?? {};
  const product: any = args.product ?? {};
  const rawProduct: any = args.rawProduct ?? {};
  const data: any = args.data ?? {};
  const bootstrap: any = data?.bootstrap || data?.theme?.bootstrap || {};

  return clampDecimals(
    firstValue(
      vm.currencyDecimals,
      vm.currency_decimals,
      vm.decimalDigits,
      vm.decimal_digits,
      vm.currency?.decimalDigits,
      vm.currency?.decimal_digits,
      vm.storeCurrency?.decimalDigits,
      vm.store_currency?.decimal_digits,
      vm.pricing?.currencyDecimals,
      vm.pricing?.currency_decimals,
      vm.pricing?.decimalDigits,
      vm.pricing?.decimal_digits,
      vm.pricing?.currency?.decimalDigits,
      vm.pricing?.currency?.decimal_digits,

      product.currencyDecimals,
      product.currency_decimals,
      product.decimalDigits,
      product.decimal_digits,
      product.currency?.decimalDigits,
      product.currency?.decimal_digits,
      product.storeCurrency?.decimalDigits,
      product.store_currency?.decimal_digits,
      product.pricing?.currencyDecimals,
      product.pricing?.currency_decimals,
      product.pricing?.decimalDigits,
      product.pricing?.decimal_digits,
      product.pricing?.currency?.decimalDigits,
      product.pricing?.currency?.decimal_digits,
      product.product_pricing?.currencyDecimals,
      product.product_pricing?.currency_decimals,
      product.product_pricing?.decimalDigits,
      product.product_pricing?.decimal_digits,
      product.product_pricing?.currency?.decimalDigits,
      product.product_pricing?.currency?.decimal_digits,

      product.metadata?.currencyDecimals,
      product.metadata?.currency_decimals,
      product.metadata?.decimalDigits,
      product.metadata?.decimal_digits,
      product.metadata?.currency?.decimalDigits,
      product.metadata?.currency?.decimal_digits,
      product.metadata?.storeCurrency?.decimalDigits,
      product.metadata?.store_currency?.decimal_digits,

      rawProduct.currencyDecimals,
      rawProduct.currency_decimals,
      rawProduct.decimalDigits,
      rawProduct.decimal_digits,
      rawProduct.currency?.decimalDigits,
      rawProduct.currency?.decimal_digits,
      rawProduct.storeCurrency?.decimalDigits,
      rawProduct.store_currency?.decimal_digits,

      data.currencyDecimals,
      data.currency_decimals,
      data.decimalDigits,
      data.decimal_digits,
      data.currency?.decimalDigits,
      data.currency?.decimal_digits,
      data.storeCurrency?.decimalDigits,
      data.store_currency?.decimal_digits,
      data.store?.currencyDecimals,
      data.store?.currency_decimals,
      data.store?.decimalDigits,
      data.store?.decimal_digits,
      data.store?.currency?.decimalDigits,
      data.store?.currency?.decimal_digits,
      data.store?.storeCurrency?.decimalDigits,
      data.store?.store_currency?.decimal_digits,

      bootstrap.currencyDecimals,
      bootstrap.currency_decimals,
      bootstrap.decimalDigits,
      bootstrap.decimal_digits,
      bootstrap.currency?.decimalDigits,
      bootstrap.currency?.decimal_digits,
      bootstrap.storeCurrency?.decimalDigits,
      bootstrap.store_currency?.decimal_digits,
      0,
    ),
  );
}

function normalizeSliderBackgroundSize(
  value: any,
): "cover" | "contain" | "fill" {
  const v = text(value);
  if (v === "cover" || v === "contain" || v === "fill") return v;
  return PRODUCT_OPTIONS_FALLBACK.slider_background_size;
}

function normalizeProductOptions(source: any): MalakBootstrapProductOptions {
  const options =
    source && typeof source === "object" && !Array.isArray(source)
      ? source
      : {};

  return {
    show_singleSelection:
      typeof options.show_singleSelection === "boolean"
        ? options.show_singleSelection
        : PRODUCT_OPTIONS_FALLBACK.show_singleSelection,

    show_multipleOption:
      typeof options.show_multipleOption === "boolean"
        ? options.show_multipleOption
        : PRODUCT_OPTIONS_FALLBACK.show_multipleOption,

    enable_add_product_toast:
      typeof options.enable_add_product_toast === "boolean"
        ? options.enable_add_product_toast
        : PRODUCT_OPTIONS_FALLBACK.enable_add_product_toast,

    activate_zoom:
      typeof options.activate_zoom === "boolean"
        ? options.activate_zoom
        : PRODUCT_OPTIONS_FALLBACK.activate_zoom,

    enhanced_brand_senction:
      typeof options.enhanced_brand_senction === "boolean"
        ? options.enhanced_brand_senction
        : PRODUCT_OPTIONS_FALLBACK.enhanced_brand_senction,

    thumbs_bottom:
      typeof options.thumbs_bottom === "boolean"
        ? options.thumbs_bottom
        : PRODUCT_OPTIONS_FALLBACK.thumbs_bottom,

    disable_thumbs_in_mobile:
      typeof options.disable_thumbs_in_mobile === "boolean"
        ? options.disable_thumbs_in_mobile
        : PRODUCT_OPTIONS_FALLBACK.disable_thumbs_in_mobile,

    show_payments_in_product_single:
      typeof options.show_payments_in_product_single === "boolean"
        ? options.show_payments_in_product_single
        : PRODUCT_OPTIONS_FALLBACK.show_payments_in_product_single,

    show_category_in_product_single:
      typeof options.show_category_in_product_single === "boolean"
        ? options.show_category_in_product_single
        : PRODUCT_OPTIONS_FALLBACK.show_category_in_product_single,

    hide_ratings:
      typeof options.hide_ratings === "boolean"
        ? options.hide_ratings
        : PRODUCT_OPTIONS_FALLBACK.hide_ratings,

    replace_slider_text:
      typeof options.replace_slider_text === "boolean"
        ? options.replace_slider_text
        : PRODUCT_OPTIONS_FALLBACK.replace_slider_text,

    hide_countdown:
      typeof options.hide_countdown === "boolean"
        ? options.hide_countdown
        : PRODUCT_OPTIONS_FALLBACK.hide_countdown,

    show_discounted_amount:
      typeof options.show_discounted_amount === "boolean"
        ? options.show_discounted_amount
        : PRODUCT_OPTIONS_FALLBACK.show_discounted_amount,

    update_both_prices:
      typeof options.update_both_prices === "boolean"
        ? options.update_both_prices
        : PRODUCT_OPTIONS_FALLBACK.update_both_prices,

    hide_top_price:
      typeof options.hide_top_price === "boolean"
        ? options.hide_top_price
        : PRODUCT_OPTIONS_FALLBACK.hide_top_price,

    top_details_tabs:
      typeof options.top_details_tabs === "boolean"
        ? options.top_details_tabs
        : PRODUCT_OPTIONS_FALLBACK.top_details_tabs,

    mini_offers_box:
      typeof options.mini_offers_box === "boolean"
        ? options.mini_offers_box
        : PRODUCT_OPTIONS_FALLBACK.mini_offers_box,

    show_product_features:
      typeof options.show_product_features === "boolean"
        ? options.show_product_features
        : PRODUCT_OPTIONS_FALLBACK.show_product_features,

    show_sidebar:
      typeof options.show_sidebar === "boolean"
        ? options.show_sidebar
        : PRODUCT_OPTIONS_FALLBACK.show_sidebar,

    show_sticky_product:
      typeof options.show_sticky_product === "boolean"
        ? options.show_sticky_product
        : PRODUCT_OPTIONS_FALLBACK.show_sticky_product,

    sticky_add_to_cart:
      typeof options.sticky_add_to_cart === "boolean"
        ? options.sticky_add_to_cart
        : PRODUCT_OPTIONS_FALLBACK.sticky_add_to_cart,

    show_tags:
      typeof options.show_tags === "boolean"
        ? options.show_tags
        : PRODUCT_OPTIONS_FALLBACK.show_tags,

    slider_background_size: normalizeSliderBackgroundSize(
      options.slider_background_size,
    ),
  };
}

function readVariantValueIds(variant: any) {
  const ids = [
    ...(Array.isArray(variant?.option_value_ids)
      ? variant.option_value_ids
      : []),
    ...(Array.isArray(variant?.optionValueIds) ? variant.optionValueIds : []),
  ];

  return Array.from(new Set(ids.map((id) => String(id)).filter(Boolean)));
}

function getVariantRegularPriceForSelection(variant: any) {
  return safeNum(
    firstValue(
      variant?.price,
      variant?.regularPrice,
      variant?.regular_price,
      variant?.basePrice,
      variant?.base_price,
    ),
  );
}

function getVariantSalePriceForSelection(variant: any) {
  return safeNum(
    firstValue(
      variant?.sale_price,
      variant?.salePrice,
      variant?.baseSalePrice,
      variant?.base_sale_price,
    ),
  );
}

function getVariantFinalPriceForSelection(variant: any) {
  const regular = getVariantRegularPriceForSelection(variant);
  const sale = getVariantSalePriceForSelection(variant);

  if (
    typeof sale === "number" &&
    typeof regular === "number" &&
    sale > 0 &&
    regular > 0 &&
    sale < regular
  ) {
    return sale;
  }

  if (typeof regular === "number" && regular > 0) return regular;

  return null;
}

function readLooseBool(value: any): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) {
      return false;
    }
  }

  return null;
}

function isSellableVariant(variant: any, productUnlimited: boolean) {
  if (!variant || typeof variant !== "object") return false;

  const disabled = readLooseBool(
    firstValue(
      variant?.disabled,
      variant?.is_disabled,
      variant?.isDisabled,
      variant?.deleted,
      variant?.is_deleted,
      variant?.isDeleted,
    ),
  );

  if (disabled === true) return false;

  const active = readLooseBool(
    firstValue(
      variant?.active,
      variant?.is_active,
      variant?.isActive,
      variant?.enabled,
      variant?.is_enabled,
      variant?.isEnabled,
    ),
  );

  if (active === false) return false;

  const status = text(
    firstValue(variant?.status, variant?.stock_status, variant?.stockStatus),
  ).toLowerCase();

  if (
    status === "disabled" ||
    status === "inactive" ||
    status === "deleted" ||
    status === "archived" ||
    status === "out_of_stock" ||
    status === "out-of-stock" ||
    status === "soldout" ||
    status === "sold_out"
  ) {
    return false;
  }

  const unlimited = readLooseBool(
    firstValue(variant?.unlimited_quantity, variant?.unlimitedQuantity),
  );

  if (productUnlimited || unlimited === true) return true;

  const qty = Number(
    firstValue(
      variant?.stock_quantity,
      variant?.stockQuantity,
      variant?.available_qty,
      variant?.availableQty,
      variant?.quantity,
      variant?.qty,
    ),
  );

  if (Number.isFinite(qty)) return qty > 0;

  const available = readLooseBool(
    firstValue(
      variant?.available,
      variant?.is_available,
      variant?.isAvailable,
      variant?.in_stock,
      variant?.inStock,
    ),
  );

  if (available !== null) return available;

  return true;
}

function getCheapestSellableVariant(
  variants: any[],
  productUnlimited: boolean,
) {
  const rows = (Array.isArray(variants) ? variants : [])
    .map((variant, index) => ({
      variant,
      index,
      price: getVariantFinalPriceForSelection(variant),
      isDefault: Boolean(variant?.is_default ?? variant?.isDefault),
    }))
    .filter((row) => isSellableVariant(row.variant, productUnlimited));

  if (!rows.length) return null;

  const withPrice = rows.filter(
    (row) => typeof row.price === "number" && row.price > 0,
  );

  if (!withPrice.length) return rows[0]?.variant ?? null;

  withPrice.sort((a, b) => {
    const priceDiff = Number(a.price) - Number(b.price);
    if (priceDiff !== 0) return priceDiff;

    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;

    return a.index - b.index;
  });

  return withPrice[0]?.variant ?? null;
}

function buildDefaultSelectionFromSellable(
  options: any[],
  variants: any[],
  productUnlimited: boolean,
) {
  const cheapestVariant = getCheapestSellableVariant(
    variants,
    productUnlimited,
  );

  if (cheapestVariant) {
    const ids = readVariantValueIds(cheapestVariant);
    if (ids.length) return ids;
  }

  return [];
}

function computeAllowedValues(args: {
  options: any[];
  variants: any[];
  selectedIds: string[];
  productUnlimited: boolean;
}) {
  const options = Array.isArray(args.options) ? args.options : [];
  const variants = (Array.isArray(args.variants) ? args.variants : []).filter(
    (variant) => isSellableVariant(variant, args.productUnlimited),
  );

  const selectedSet = new Set<string>((args.selectedIds || []).map(String));
  const allowedByOption = new Map<string, Set<string>>();

  for (const option of options) {
    const optionId = String(option?.id ?? "");
    const optionValues = Array.isArray(option?.values) ? option.values : [];

    const currentIdsOfThisOption = new Set<string>(
      optionValues
        .map((value: any) => String(value?.id ?? ""))
        .filter((id: string) => Boolean(id)),
    );

    const allowed = new Set<string>();

    for (const value of optionValues) {
      const valueId = String(value?.id ?? "");
      if (!valueId) continue;

      const testSelected = new Set<string>(selectedSet);

      for (const oldId of Array.from(currentIdsOfThisOption)) {
        testSelected.delete(String(oldId));
      }

      testSelected.add(valueId);

      const ok = variants.some((variant: any) => {
        const ids = new Set<string>(readVariantValueIds(variant));

        for (const selectedId of testSelected) {
          if (!ids.has(selectedId)) return false;
        }

        return true;
      });

      if (ok) allowed.add(valueId);
    }

    allowedByOption.set(optionId, allowed);
  }

  return allowedByOption;
}

function resolveSelectedVariant(
  variants: any[],
  selectedIds: string[],
  productUnlimited: boolean,
) {
  const clean = (selectedIds || []).map(String).filter(Boolean);
  if (!clean.length) return null;

  const sellableVariants = (Array.isArray(variants) ? variants : []).filter(
    (variant) => isSellableVariant(variant, productUnlimited),
  );

  return (
    sellableVariants.find((variant: any) => {
      const ids = readVariantValueIds(variant);

      if (ids.length !== clean.length) return false;

      for (const id of ids) {
        if (!clean.includes(id)) return false;
      }

      return true;
    }) ?? null
  );
}

function collectProductCategoryIds(product: any) {
  const out = new Set<string>();

  const pushMany = (arr: any[]) => {
    for (const item of arr) {
      const id = String(item?.id ?? item?.category_id ?? "").trim();
      if (id) out.add(id);
    }
  };

  if (Array.isArray(product?.categories)) pushMany(product.categories);
  if (Array.isArray(product?.seo?.categories)) pushMany(product.seo.categories);
  if (Array.isArray(product?.category_links)) pushMany(product.category_links);

  if (Array.isArray(product?.categoryIds)) {
    for (const id of product.categoryIds) {
      const value = String(id ?? "").trim();
      if (value) out.add(value);
    }
  }

  if (Array.isArray(product?.category_ids)) {
    for (const id of product.category_ids) {
      const value = String(id ?? "").trim();
      if (value) out.add(value);
    }
  }

  if (Array.isArray(product?.metadata?.categoryIds)) {
    for (const id of product.metadata.categoryIds) {
      const value = String(id ?? "").trim();
      if (value) out.add(value);
    }
  }

  if (Array.isArray(product?.metadata?.category_ids)) {
    for (const id of product.metadata.category_ids) {
      const value = String(id ?? "").trim();
      if (value) out.add(value);
    }
  }

  return Array.from(out);
}

function normalizeVmCategories(
  productVm: ProductDetailVM,
): ProductCategoryItem[] {
  const rows = Array.isArray((productVm as any)?.categories)
    ? (productVm as any).categories
    : [];

  return rows
    .map((category: any) => ({
      id: text(category.id),
      name: text(category.name),
      public_no: category.publicNo ?? null,
      publicNo: category.publicNo ?? null,
      href: null,
      short_url: null,
      shortUrl: null,
    }))
    .filter((category: ProductCategoryItem) => category.id || category.name);
}

function parseArrayMaybe(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function unwrapSizeGuideRows(source: any): any[] {
  if (!source) return [];

  if (Array.isArray(source)) return source;

  if (typeof source === "string") {
    try {
      return unwrapSizeGuideRows(JSON.parse(source));
    } catch {
      return [];
    }
  }

  if (source && typeof source === "object") {
    const keys = [
      "size_guides",
      "sizeGuides",
      "guides",
      "items",
      "rows",
      "data",
    ];

    for (const key of keys) {
      const rows = unwrapSizeGuideRows(source[key]);
      if (rows.length) return rows;
    }
  }

  return [];
}

function collectRawSizeGuideRows(data: any): any[] {
  const options = data?.options ?? {};

  const sources = [
    data?.sizeGuides,
    data?.size_guides,
    data?.productSizeGuides,
    data?.product_size_guides,

    options?.["options:size_guides"],
    options?.["options:size-guides"],
    options?.["options:product_size_guides"],
    options?.["options:product-size-guides"],
    options?.size_guides,
    options?.sizeGuides,
    options?.product_size_guides,
    options?.productSizeGuides,
  ];

  for (const source of sources) {
    const rows = unwrapSizeGuideRows(source);
    if (rows.length) return rows;
  }

  return [];
}

function collectSizeGuideCategoryIds(row: any): string[] {
  const out = new Set<string>();

  function pushOne(value: any) {
    const id = text(
      value?.id ??
        value?.category_id ??
        value?.categoryId ??
        value?.value ??
        value,
    );

    if (id) out.add(id);
  }

  function pushMany(value: any) {
    const arr = parseArrayMaybe(value);

    for (const item of arr) {
      pushOne(item);
    }
  }

  pushMany(row?.category_ids);
  pushMany(row?.categoryIds);
  pushMany(row?.selected_category_ids);
  pushMany(row?.selectedCategoryIds);
  pushMany(row?.categories);
  pushMany(row?.category_links);
  pushMany(row?.categoryLinks);

  return Array.from(out);
}

function normalizeProductSizeGuide(
  row: any,
  index: number,
): ProductSizeGuideItem | null {
  const id = text(row?.id || row?.uuid || `size-guide-${index}`);

  const title =
    text(row?.title || row?.name || row?.label) || "جدول المقاسات";

  const contentHtml = text(
    row?.content_html ||
      row?.contentHtml ||
      row?.details_html ||
      row?.detailsHtml ||
      row?.body_html ||
      row?.bodyHtml ||
      row?.html,
  );

  const contentText = text(
    row?.content ||
      row?.details ||
      row?.body ||
      row?.description ||
      row?.text,
  );

  const enabled = readBool(
    firstValue(row?.enabled, row?.is_enabled, row?.isEnabled, row?.active),
    true,
  );

  if (!enabled) return null;

  const categoryIds = collectSizeGuideCategoryIds(row);

  if (!id || !title) return null;
  if (!categoryIds.length) return null;

  const sortOrder = Number(row?.sort_order ?? row?.sortOrder ?? index + 1);

  return {
    id,
    title,
    contentHtml,
    contentText,
    categoryIds,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : index + 1,
  };
}

function collectProductSizeGuides(args: {
  data: any;
  productCategoryIds: string[];
}): ProductSizeGuideItem[] {
  const productCategorySet = new Set(
    (Array.isArray(args.productCategoryIds) ? args.productCategoryIds : [])
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean),
  );

  if (!productCategorySet.size) return [];

  return collectRawSizeGuideRows(args.data)
    .map((row, index) => normalizeProductSizeGuide(row, index))
    .filter((guide): guide is ProductSizeGuideItem => guide !== null)
    .filter((guide) =>
      guide.categoryIds.some((categoryId) =>
        productCategorySet.has(String(categoryId)),
      ),
    )
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
}

function buildCategoryCrumbHref(category: ProductCategoryItem, mode: SeoUrlMode) {
  const publicNo = intOrNull(category.public_no ?? category.publicNo);

  if (publicNo) {
    return buildStoreCategoryHref({
      mode,
      slugNameAr: text(
        category.slug_name_ar ||
          category.slug_ar ||
          category.slug ||
          category.name,
      ),
      slugNameEn: text(
        category.slug_name_en ||
          category.slug_en ||
          category.slug ||
          category.name,
      ),
      publicNo,
      shortCode: category.short_url ?? category.shortUrl ?? null,
    });
  }

  const existingHref = text(category.href);
  if (existingHref) return existingHref;

  return "";
}

function collectProductFeatures(data: any, bootstrap: any) {
  const out: Array<{
    title: string;
    subtitle?: string | null;
    icon?: string | null;
  }> = [];

  const sources = [
    data?.product?.features,
    data?.product?.metadata?.features,
    data?.features,
    bootstrap?.product?.features,
    bootstrap?.features,
  ];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;

    for (const item of source) {
      const title = text(item?.title || item?.name || item?.label);
      const subtitle = text(item?.subtitle || item?.description || item?.text);
      const icon = text(item?.icon);

      if (!title) continue;

      out.push({
        title,
        subtitle: subtitle || null,
        icon: icon || null,
      });
    }
  }

  return out;
}

function collectProductSpecs(product: any): ProductSpecRow[] {
  const sources = [
    product?.metadata?.productSpecs,
    product?.metadata?.specs,
    product?.metadata?.specifications,
    product?.productSpecs,
    product?.specs,
    product?.specifications,
  ];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;

    return source
      .map((item: any, index: number) => {
        const id = text(item?.id) || `spec-${index}`;
        const name = text(item?.name || item?.label || item?.title);
        const value = text(item?.value || item?.description || item?.text);

        return { id, name, value };
      })
      .filter((item) => item.name || item.value);
  }

  return [];
}

function formatMoney(
  value: number,
  currencySymbol: string,
  decimalDigits: number,
) {
  const formatted = new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(Number(value || 0));

  const symbol = text(currencySymbol);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

function cleanCurrencyCode(value: any, fallback = "") {
  const code = String(value ?? "").trim().toUpperCase();
  return code || fallback;
}

function positiveRate(value: any, fallback = 1) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readCurrencyRate(row: any) {
  const meta =
    row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

  return positiveRate(
    row?.rate ??
      row?.exchange_rate ??
      row?.conversion_rate ??
      row?.rate_to_default ??
      row?.rateToDefault ??
      row?.value ??
      meta?.rate ??
      meta?.exchange_rate ??
      meta?.conversion_rate ??
      meta?.rate_to_default ??
      meta?.rateToDefault ??
      meta?.value,
    1,
  );
}

function normalizeCurrencyRow(row: any): ProductScreenCurrencyRow | null {
  const code = cleanCurrencyCode(
    row?.currency_code ?? row?.currencyCode ?? row?.code,
    "",
  );

  if (!code) return null;

  return {
    code,
    symbol: firstText(
      row?.symbol,
      row?.currency_symbol,
      row?.currencySymbol,
      code,
    ),
    decimalDigits: clampDecimals(
      firstValue(
        row?.decimal_digits,
        row?.decimalDigits,
        row?.currency_decimals,
        row?.currencyDecimals,
      ),
    ),
    rate: readCurrencyRate(row),
    isDefault: Boolean(row?.is_default ?? row?.isDefault ?? false),
    enabled: row?.is_enabled !== false && row?.enabled !== false,
  };
}

function pushCurrencyRows(target: any[], source: any) {
  if (!source) return;

  if (Array.isArray(source)) {
    target.push(...source);
    return;
  }

  if (Array.isArray(source?.items)) {
    target.push(...source.items);
  }

  if (Array.isArray(source?.currencies)) {
    target.push(...source.currencies);
  }

  if (
    source?.code ||
    source?.currency_code ||
    source?.currencyCode ||
    source?.symbol
  ) {
    target.push(source);
  }
}

function collectCurrencyRows(data: any, product: any, rawProduct: any) {
  const bootstrap = data?.bootstrap || data?.theme?.bootstrap || {};
  const rows: any[] = [];

  pushCurrencyRows(rows, bootstrap?.currencies);
  pushCurrencyRows(rows, data?.currencies);
  pushCurrencyRows(rows, data?.currency);
  pushCurrencyRows(rows, data?.currency_info);
  pushCurrencyRows(rows, data?.store?.currencies);
  pushCurrencyRows(rows, data?.storeCurrency);
  pushCurrencyRows(rows, data?.store_currency);

  pushCurrencyRows(rows, product?.currencies);
  pushCurrencyRows(rows, product?.store_currencies);
  pushCurrencyRows(rows, product?.storeCurrency);
  pushCurrencyRows(rows, product?.store_currency);
  pushCurrencyRows(rows, product?.pricing);
  pushCurrencyRows(rows, product?.product_pricing);

  pushCurrencyRows(rows, rawProduct?.currencies);
  pushCurrencyRows(rows, rawProduct?.store_currencies);
  pushCurrencyRows(rows, rawProduct?.storeCurrency);
  pushCurrencyRows(rows, rawProduct?.store_currency);
  pushCurrencyRows(rows, rawProduct?.pricing);
  pushCurrencyRows(rows, rawProduct?.product_pricing);

  const map = new Map<string, ProductScreenCurrencyRow>();

  for (const row of rows) {
    const normalized = normalizeCurrencyRow(row);
    if (!normalized?.code) continue;

    const current = map.get(normalized.code);

    if (!current) {
      map.set(normalized.code, normalized);
      continue;
    }

    const currentHasRate = current.rate > 1;
    const nextHasRate = normalized.rate > 1;

    map.set(normalized.code, {
      ...current,
      ...normalized,
      symbol: normalized.symbol || current.symbol,
      decimalDigits: normalized.decimalDigits ?? current.decimalDigits ?? 0,
      rate: !currentHasRate && nextHasRate ? normalized.rate : current.rate,
      isDefault: current.isDefault || normalized.isDefault,
      enabled: current.enabled || normalized.enabled,
    });
  }

  return map;
}

function readSelectedCurrencyCode(data: any) {
  const bootstrap = data?.bootstrap || data?.theme?.bootstrap || {};
  const currencies = bootstrap?.currencies || data?.currencies || {};

  return cleanCurrencyCode(
    firstText(
      currencies?.active_code,
      currencies?.activeCode,
      currencies?.selected_code,
      currencies?.selectedCode,
      currencies?.current_code,
      currencies?.currentCode,
      data?.currency_info?.code,
      data?.currency_info?.currency_code,
      data?.currency?.code,
      data?.currency?.currency_code,
      data?.storeCurrency?.code,
      data?.storeCurrency?.currency_code,
      data?.store_currency?.code,
      data?.store_currency?.currency_code,
    ),
    "",
  );
}

function readDefaultCurrencyCode(
  data: any,
  map: Map<string, ProductScreenCurrencyRow>,
) {
  const bootstrap = data?.bootstrap || data?.theme?.bootstrap || {};
  const currencies = bootstrap?.currencies || data?.currencies || {};

  const explicit = cleanCurrencyCode(
    firstText(
      currencies?.default_code,
      currencies?.defaultCode,
      data?.store?.default_currency,
      data?.store?.defaultCurrency,
      data?.default_currency,
      data?.defaultCurrency,
    ),
    "",
  );

  if (explicit && map.has(explicit)) return explicit;

  const rateOneDefault = Array.from(map.values()).find(
    (row) => row.isDefault && row.rate === 1,
  );

  if (rateOneDefault?.code) return rateOneDefault.code;

  const anyDefault = Array.from(map.values()).find((row) => row.isDefault);
  if (anyDefault?.code) return anyDefault.code;

  return explicit || "SAR";
}

function buildProductScreenCurrencyRuntime(args: {
  data: any;
  product: any;
  rawProduct: any;
}): ProductScreenCurrencyRuntime {
  const map = collectCurrencyRows(args.data, args.product, args.rawProduct);
  const defaultCode = readDefaultCurrencyCode(args.data, map);

  if (!map.has(defaultCode)) {
    map.set(defaultCode, {
      code: defaultCode,
      symbol: defaultCode,
      decimalDigits: 0,
      rate: 1,
      isDefault: true,
      enabled: true,
    });
  }

  const selectedCode = readSelectedCurrencyCode(args.data);
  const targetCode =
    selectedCode && map.get(selectedCode)?.enabled ? selectedCode : defaultCode;

  const target = map.get(targetCode) || map.get(defaultCode)!;

  return {
    defaultCode,
    targetCode: target.code,
    targetSymbol: target.symbol || target.code,
    targetDecimals: clampDecimals(target.decimalDigits),
    map,
  };
}

function readProductPriceCurrencyCode(args: {
  productVm: ProductDetailVM;
  product: any;
  rawProduct: any;
  data: any;
  fallbackCode: string;
}) {
  const vm: any = args.productVm ?? {};
  const product: any = args.product ?? {};
  const rawProduct: any = args.rawProduct ?? {};
  const data: any = args.data ?? {};

  return cleanCurrencyCode(
    firstText(
      vm.pricing?.currency_code,
      vm.pricing?.currencyCode,
      vm.pricing?.currency,
      vm.currency_code,
      vm.currencyCode,
      vm.currency,

      product.pricing?.currency_code,
      product.pricing?.currencyCode,
      product.pricing?.currency,
      product.product_pricing?.currency_code,
      product.product_pricing?.currencyCode,
      product.product_pricing?.currency,
      product.currency_code,
      product.currencyCode,
      product.currency,
      product.metadata?.currency_code,
      product.metadata?.currencyCode,
      product.metadata?.currency,

      rawProduct.pricing?.currency_code,
      rawProduct.pricing?.currencyCode,
      rawProduct.pricing?.currency,
      rawProduct.product_pricing?.currency_code,
      rawProduct.product_pricing?.currencyCode,
      rawProduct.product_pricing?.currency,
      rawProduct.currency_code,
      rawProduct.currencyCode,
      rawProduct.currency,
      rawProduct.metadata?.currency_code,
      rawProduct.metadata?.currencyCode,
      rawProduct.metadata?.currency,

      data?.product?.pricing?.currency,
      data?.product?.product_pricing?.currency,
    ),
    args.fallbackCode,
  );
}

function convertMoneyByRuntime(args: {
  amount: number | null;
  sourceCode?: any;
  runtime: ProductScreenCurrencyRuntime;
}) {
  const amount = Number(args.amount ?? 0);
  if (!Number.isFinite(amount)) return null;

  const runtime = args.runtime;
  const sourceCode = cleanCurrencyCode(args.sourceCode, runtime.defaultCode);
  const source =
    runtime.map.get(sourceCode) || runtime.map.get(runtime.defaultCode);
  const target =
    runtime.map.get(runtime.targetCode) || runtime.map.get(runtime.defaultCode);

  if (!source || !target) return amount;
  if (source.code === target.code) return amount;

  const sourceRate =
    source.code === runtime.defaultCode ? 1 : positiveRate(source.rate, 1);

  const targetRate =
    target.code === runtime.defaultCode ? 1 : positiveRate(target.rate, 1);

  const amountInDefault =
    source.code === runtime.defaultCode ? amount : amount * sourceRate;

  return target.code === runtime.defaultCode
    ? amountInDefault
    : amountInDefault / targetRate;
}

export default function ProductMobileScreen({ data }: Props) {
  const rawProduct = data?.product;
  const hasProduct = Boolean(rawProduct);

  const mode: SeoUrlMode = normalizeMode(data?.mode);

  const bootstrap = data?.bootstrap || data?.theme?.bootstrap || {};
  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);

  const productVm = useMemo(() => {
    return toProductDetailVM({
      storeSlug: "",
      currencies,
      tax,
      product: rawProduct ?? {},
    } as any);
  }, [rawProduct, currencies, tax]);

  const product = productVm.raw ?? rawProduct ?? {};
  const productOptions = normalizeProductOptions(bootstrap?.product?.options);

  const ratingSettings = normalizeRatingSettings(
    bootstrap?.ratingSettings ??
      bootstrap?.rating_settings ??
      data?.ratingSettings ??
      data?.rating_settings,
  );

  const storeOptions = parseStoreOptions(data?.options ?? {});
  const showSeeMoreButton = storeOptions?.switches?.seeMoreButton ?? true;
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const currencyRuntime = useMemo(() => {
    return buildProductScreenCurrencyRuntime({
      data,
      product,
      rawProduct,
    });
  }, [data, product, rawProduct]);

  const fallbackCurrencySymbol = useMemo(() => {
    return readCurrencySymbol({
      productVm,
      product,
      rawProduct,
      data,
    });
  }, [productVm, product, rawProduct, data]);

  const fallbackCurrencyDecimals = useMemo(() => {
    return readCurrencyDecimals({
      productVm,
      product,
      rawProduct,
      data,
    });
  }, [productVm, product, rawProduct, data]);

  const currencySymbol =
    productVm.pricing.currencySymbol ||
    productVm.currencySymbol ||
    fallbackCurrencySymbol ||
    currencyRuntime.targetSymbol;

  const currencyDecimals = clampDecimals(
    firstValue(
      productVm.pricing.currencyDecimals,
      productVm.currencyDecimals,
      fallbackCurrencyDecimals,
      currencyRuntime.targetDecimals,
      0,
    ),
  );

  const priceSourceCurrency = useMemo(() => {
    return readProductPriceCurrencyCode({
      productVm,
      product,
      rawProduct,
      data,
      fallbackCode: currencyRuntime.defaultCode,
    });
  }, [productVm, product, rawProduct, data, currencyRuntime.defaultCode]);

  const images = useMemo(() => {
    return Array.isArray(productVm.images) ? productVm.images : [];
  }, [productVm.images]);

  const productImageAlts = useMemo(() => {
    if (Array.isArray(productVm.imageAlts) && productVm.imageAlts.length) {
      return productVm.imageAlts;
    }

    const productName = text(productVm.name || product?.name);

    return images.map((_, index) => {
      if (productName) {
        return index === 0 ? productName : `${productName} - صورة ${index + 1}`;
      }

      return index === 0 ? "صورة المنتج" : `صورة المنتج ${index + 1}`;
    });
  }, [productVm.imageAlts, productVm.name, product?.name, images]);

  const options = Array.isArray(productVm.options) ? productVm.options : [];
  const variants = Array.isArray(productVm.variants) ? productVm.variants : [];

  const productCategoryIds = useMemo(() => {
    return collectProductCategoryIds(product);
  }, [product]);

  const productSizeGuides = useMemo(() => {
    return collectProductSizeGuides({
      data,
      productCategoryIds,
    });
  }, [data, productCategoryIds]);

  const productCategories = useMemo(() => {
    return normalizeVmCategories(productVm);
  }, [productVm]);

  const breadcrumbItems = useMemo(() => {
    return [
      { label: "الرئيسية", href: "/" },
      ...productCategories.map((category) => ({
        label: category.name,
        href: buildCategoryCrumbHref(category, mode),
      })),
      { label: text(productVm.name) || "المنتج" },
    ];
  }, [productCategories, mode, productVm.name]);
const productBackHref = useMemo(() => {
  const categoryCrumbs = breadcrumbItems
    .slice(1, -1)
    .map((item) => text(item.href))
    .filter(Boolean);

  return categoryCrumbs[categoryCrumbs.length - 1] || "/";
}, [breadcrumbItems]);
  const productFeatures = useMemo(() => {
    return collectProductFeatures(data, bootstrap);
  }, [data, bootstrap]);

  const productSpecs = useMemo(() => {
    return collectProductSpecs(product);
  }, [product]);

  const productUnlimited = Boolean(productVm.detailStock.unlimitedQuantity);
  const productQty = Number(productVm.detailStock.quantity ?? 0);

  const hasSimpleProductStock =
    productUnlimited || (Number.isFinite(productQty) && productQty > 0);

  const hasOptions = options.length > 0;
  const hasVariants = variants.length > 0;
  const isVariantProduct = hasOptions && hasVariants;

  const defaultSelectedIds = useMemo(() => {
    if (!isVariantProduct) return [];

    return buildDefaultSelectionFromSellable(
      options,
      variants,
      productUnlimited,
    );
  }, [isVariantProduct, options, variants, productUnlimited]);

  const selectedStateKey = String(productVm.id ?? "");

  const [selectedOptionState, setSelectedOptionState] = useState<{
    key: string;
    ids: string[];
  }>(() => ({
    key: selectedStateKey,
    ids: defaultSelectedIds,
  }));

  const selectedOptionValueIds =
    selectedOptionState.key === selectedStateKey
      ? selectedOptionState.ids
      : defaultSelectedIds;

  const allowedByOption = useMemo(() => {
    if (!isVariantProduct) return new Map<string, Set<string>>();

    return computeAllowedValues({
      options,
      variants,
      selectedIds: selectedOptionValueIds,
      productUnlimited,
    });
  }, [
    isVariantProduct,
    options,
    variants,
    selectedOptionValueIds,
    productUnlimited,
  ]);

  const selectedVariant = useMemo(() => {
    if (!isVariantProduct) return null;

    return resolveSelectedVariant(
      variants,
      selectedOptionValueIds,
      productUnlimited,
    );
  }, [isVariantProduct, variants, selectedOptionValueIds, productUnlimited]);

  const variantRegularPrice = safeNum(
    firstValue(
      selectedVariant?.price,
      selectedVariant?.regularPrice,
      selectedVariant?.regular_price,
      selectedVariant?.basePrice,
      selectedVariant?.base_price,
    ),
  );

  const variantSalePrice = safeNum(
    firstValue(
      selectedVariant?.sale_price,
      selectedVariant?.salePrice,
      selectedVariant?.baseSalePrice,
      selectedVariant?.base_sale_price,
    ),
  );

  const productFinalPrice = safeNum(productVm.pricing.price);
  const productRegularPrice = safeNum(productVm.pricing.regularPrice);
  const productSalePrice = safeNum(productVm.pricing.salePrice);
  const productCompareAtPrice = safeNum(productVm.pricing.compareAtPrice);

  const selectedRegularPrice = isVariantProduct
    ? variantRegularPrice
    : productRegularPrice;

  const selectedSalePrice = isVariantProduct
    ? variantSalePrice
    : productSalePrice;

  const selectedHasDiscount =
    typeof selectedSalePrice === "number" &&
    typeof selectedRegularPrice === "number" &&
    selectedSalePrice > 0 &&
    selectedRegularPrice > 0 &&
    selectedSalePrice < selectedRegularPrice;

  const rawFinalPrice = isVariantProduct
    ? selectedHasDiscount
      ? selectedSalePrice
      : selectedRegularPrice
    : productFinalPrice;

  const rawCompareAtPrice = isVariantProduct
    ? selectedHasDiscount
      ? selectedRegularPrice
      : null
    : typeof productCompareAtPrice === "number" &&
        typeof productFinalPrice === "number" &&
        productCompareAtPrice > productFinalPrice
      ? productCompareAtPrice
      : null;

  const finalPrice = convertMoneyByRuntime({
    amount: rawFinalPrice,
    sourceCode: priceSourceCurrency,
    runtime: currencyRuntime,
  });

  const compareAtPrice = convertMoneyByRuntime({
    amount: rawCompareAtPrice,
    sourceCode: priceSourceCurrency,
    runtime: currencyRuntime,
  });

  const hasDiscount =
    typeof finalPrice === "number" &&
    typeof compareAtPrice === "number" &&
    finalPrice > 0 &&
    compareAtPrice > finalPrice;

  const saleEnd = productVm.pricing.saleEnd;

  const showSaleCountdown =
    Boolean(productVm.showSaleCountdown) && !productOptions.hide_countdown;

  const selectedOptionsSnapshot = useMemo(() => {
    if (!isVariantProduct) return [];

    const selectedSet = new Set(selectedOptionValueIds.map(String));
    const out: Array<{ name: string; value: string }> = [];

    for (const option of options) {
      const optionName = String(option?.name ?? option?.label ?? "").trim();
      if (!optionName) continue;

      const values = Array.isArray(option?.values) ? option.values : [];
      const hit = values.find((value: any) =>
        selectedSet.has(String(value?.id)),
      );

      if (!hit) continue;

      const valueName = String(
        hit?.display_value ?? hit?.displayValue ?? hit?.name ?? hit?.label ?? "",
      ).trim();

      if (!valueName) continue;

      out.push({ name: optionName, value: valueName });
    }

    return out;
  }, [isVariantProduct, options, selectedOptionValueIds]);

  const canAddToCart = isVariantProduct
    ? Boolean(selectedVariant?.id)
    : hasSimpleProductStock;

  const stockMessage = isVariantProduct
    ? "هذه التركيبة غير متوفرة أو نفدت الكمية."
    : "هذا المنتج غير متوفر حالياً.";

  const allowFileUpload = readMetaBool(product?.metadata, [
    "enableUploadImage",
    "allow_file_upload",
    "enable_file_upload",
    "attachment_enabled",
    "allow_attachment",
    "file_upload_enabled",
  ]);

  const allowNote = readMetaBool(product?.metadata, [
    "enableNote",
    "allow_note",
    "enable_note",
    "note_enabled",
    "customer_note_enabled",
    "allow_customer_note",
  ]);

  const payments = Array.isArray(bootstrap?.footer?.payments)
    ? bootstrap.footer.payments
    : [];

  const promotionTitle = text(productVm.promotionTitle);

  const descriptionHtml = String(productVm.descriptionHtml ?? "");
  const descriptionText = String(product?.description ?? "");

  const specsHtml = String(
    product?.metadata?.specsHtml ??
      product?.metadata?.specificationsHtml ??
      "",
  );

  const reviewsEnabled = productOptions.hide_ratings
    ? false
    : storeOptions?.reviews?.enabled ?? true;

  const questionsEnabled =
    storeOptions?.reviews?.productQuestionsEnabled ?? true;

  const allowGuestQuestions =
    storeOptions?.reviews?.allowGuestQuestions ?? false;

  const shouldShowProductReviews = Boolean(
    reviewsEnabled &&
      !productOptions.hide_ratings &&
      ratingSettings.displayCustomerReviews,
  );

  const reviewsCount = Number(
    productVm.reviewsSummary.count ?? product?.rating?.count ?? 0,
  );

  const taxForProduct = productVm.tax ?? tax;

  const taxForRecommended = {
    ...(tax && typeof tax === "object" ? tax : {}),
    ...(productVm.tax && typeof productVm.tax === "object"
      ? productVm.tax
      : {}),
    enabled: Boolean(
      productVm.tax?.enabled ||
        productVm.tax?.isIncludedInPrice ||
        productVm.tax?.is_included_in_price ||
        productVm.tax?.rate ||
        tax?.enabled ||
        tax?.rate ||
        tax?.effective_rate ||
        tax?.effectiveRate,
    ),
  };

  if (!hasProduct) {
    return (
      <div dir="rtl" className="mk-mproduct-state">
        تعذر تحميل المنتج
      </div>
    );
  }

  return (
    <main
      dir="rtl"
      className={[
        "mk-mproduct",
        productOptions.top_details_tabs ? "mk-mproduct--top-tabs" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <section
        className="mk-mproduct-hero"
        data-mk-product-card-id={String(productVm.id ?? "")}
      >
      <MobileProductGallery
  images={images}
  productName={String(productVm.name ?? "")}
  imageAlts={productImageAlts}
  activateZoom={productOptions.activate_zoom}
  thumbsBottom={!productOptions.disable_thumbs_in_mobile}
  objectFit={productOptions.slider_background_size}
  backHref={productBackHref}
/>
      </section>

      <section className="mk-mproduct-content" aria-label="تفاصيل المنتج">
        <MobileProductInfo
          storeOptions={storeOptions}
          productOptions={productOptions}
          tax={taxForProduct}
          name={productVm.name}
          subtitle={productVm.subtitle || null}
          promotionTitle={promotionTitle || null}
          price={finalPrice}
          compareAtPrice={compareAtPrice}
          currencySymbol={currencySymbol}
          currencyDecimals={currencyDecimals}
          saleEnd={saleEnd}
          showSaleCountdown={showSaleCountdown}
          brand={productVm.brandInfo?.name ?? null}
          brandLogo={productVm.brandInfo?.logoUrl ?? null}
          categories={productCategories}
          payments={payments}
          options={isVariantProduct ? options : []}
          selectedOptionValueIds={isVariantProduct ? selectedOptionValueIds : []}
          allowedByOption={allowedByOption}
          onSelectOption={(optionId: string, valueId: string) => {
            if (!isVariantProduct) return;

            const allowed = allowedByOption.get(String(optionId));
            if (allowed && !allowed.has(String(valueId))) return;

            setSelectedOptionState((state) => {
              const prev =
                state.key === selectedStateKey
                  ? state.ids
                  : defaultSelectedIds;

              const option = options.find(
                (item: any) => String(item?.id) === String(optionId),
              );

              const optionValueIds = (
                Array.isArray(option?.values) ? option.values : []
              ).map((value: any) => String(value?.id));

              const filtered = prev.filter(
                (id) => !optionValueIds.includes(String(id)),
              );

              return {
                key: selectedStateKey,
                ids: [...filtered, String(valueId)],
              };
            });
          }}
          shipping={{
            requires_shipping: product?.require_shipping ?? true,
            weight: selectedVariant?.weight ?? product?.shipping?.weight ?? null,
            weight_unit:
              selectedVariant?.weight_unit ??
              selectedVariant?.weightUnit ??
              product?.shipping?.weight_unit ??
              "kg",
          }}
          identifiers={{
            sku:
              selectedVariant?.sku ??
              product?.identifiers?.sku ??
              product?.metadata?.sku ??
              null,
            mpn:
              selectedVariant?.mpn ??
              product?.identifiers?.mpn ??
              product?.metadata?.mpn ??
              null,
            gtin: selectedVariant?.gtin ?? product?.identifiers?.gtin ?? null,
          }}
          tags={productOptions.show_tags ? productVm.tags : []}
          purchaseCount={product?.purchase_count ?? 0}
          productCategoryIds={productCategoryIds}
          sizeGuides={productSizeGuides}
        />

        {productOptions.mini_offers_box && (promotionTitle || hasDiscount) ? (
          <div className="mk-mproduct-offers">
            <div className="mk-mproduct-offers__title">العروض الخاصة</div>

            <div className="mk-mproduct-offers__items">
              {promotionTitle ? (
                <span className="mk-mproduct-offers__item">
                  {promotionTitle}
                </span>
              ) : null}

              {hasDiscount && compareAtPrice && finalPrice ? (
                <span className="mk-mproduct-offers__item">
                  وفر{" "}
                  {formatMoney(
                    compareAtPrice - finalPrice,
                    currencySymbol,
                    currencyDecimals,
                  )}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <MobileProductTabs
          mode="details_cards"
          productId={String(productVm.id ?? "")}
          reviewsEnabled={reviewsEnabled}
          questionsEnabled={questionsEnabled}
          allowGuestQuestions={allowGuestQuestions}
          allowLikes={ratingSettings.allowLikes}
          descriptionHtml={descriptionHtml}
          descriptionText={descriptionText}
          specsHtml={specsHtml}
          productSpecs={productSpecs}
          reviewsCount={reviewsCount}
          showSeeMoreButton={showSeeMoreButton}
          hideRatings={true}
        />

        {!canAddToCart ? (
          <div className="mk-mproduct-stockAlert">{stockMessage}</div>
        ) : null}

        {productOptions.show_product_features && productFeatures.length ? (
          <div className="mk-mproduct-features">
            {productFeatures.map((feature, index) => (
              <div
                key={`feature-${feature.title}-${index}`}
                className="mk-mproduct-feature"
              >
                {feature.icon ? (
                  <span className="mk-mproduct-feature__icon">
                    {feature.icon}
                  </span>
                ) : null}

                <div className="mk-mproduct-feature__body">
                  <div className="mk-mproduct-feature__title">
                    {feature.title}
                  </div>

                  {feature.subtitle ? (
                    <div className="mk-mproduct-feature__subtitle">
                      {feature.subtitle}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {shouldShowProductReviews ? (
          <section
            className="mk-mproduct-reviews"
            aria-label="الأسئلة والتقييمات"
          >
            <div className="mk-mproduct-sectionHead">
              <div>
                <h2>الأسئلة والتقييمات</h2>
                <p>{Number(reviewsCount ?? 0)} مشاركة منشورة</p>
              </div>
            </div>

            <ProductReviews
              productId={String(productVm.id ?? "")}
              enabled={reviewsEnabled}
              showRatingSummary={ratingSettings.showRatingSummary}
              questionsEnabled={questionsEnabled}
              allowGuestQuestions={allowGuestQuestions}
              showRecommendation={ratingSettings.showRecommendation}
              allowLikes={ratingSettings.allowLikes}
              allowHiddenNames={ratingSettings.allowHiddenNames}
              title="الأسئلة والتقييمات"
              placeholder="اكتب سؤالك أو شاركنا تجربتك مع المنتج"
            />
          </section>
        ) : null}

        <MobileRecommendedProducts
          items={data?.recommendations ?? []}
          mode={mode}
          title={
            productOptions.replace_slider_text
              ? "عادة ما يتم شراؤه مع"
              : "منتجات ربما تعجبك"
          }
          currencies={currencies}
          tax={taxForRecommended}
          storeOptions={{
            ...storeOptions,
            switches: {
              ...(storeOptions?.switches ?? {}),
              showDashInstead,
            },
          }}
        />
      </section>

      {productOptions.show_sticky_product ? (
        <div className="mk-mproduct-mobileCart">
          <MobileStickyAddToCart
            productId={String(productVm.id)}
            productTitle={productVm.name}
            productImageUrl={images[0] ?? null}
            variantId={
              isVariantProduct
                ? selectedVariant?.id
                  ? String(selectedVariant.id)
                  : null
                : null
            }
            price={finalPrice}
            compareAtPrice={compareAtPrice}
            currencyCode={currencyRuntime.targetCode}
            currencySymbol={currencySymbol}
            currencyDecimals={currencyDecimals}
            saleEnd={saleEnd}
            showSaleCountdown={showSaleCountdown}
            selectedOptionValueIds={isVariantProduct ? selectedOptionValueIds : []}
            selectedOptions={selectedOptionsSnapshot}
            disabled={!canAddToCart}
            allowFileUpload={allowFileUpload}
            allowNote={allowNote}
            enableToast={productOptions.enable_add_product_toast}
          />
        </div>
      ) : null}
    </main>
  );
}