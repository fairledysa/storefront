// FILE: apps/storefront/src/themes/malak/screens/home/_dynamic/product-utils.ts

import { buildProductHref as buildStoreProductHref } from "@/lib/seo/build-store-href";
import type { ProductSliderItem } from "./types";
import {
  firstDefined,
  getImageFromValue,
  getPickerItemId,
  lower,
  safeNum,
  s,
} from "./utils";

type ProductCardOptionValue = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  color?: string | null;
  image?: string | null;
  image_url?: string | null;
};

type ProductCardOption = {
  id?: string;
  name?: string;
  label?: string;
  values?: ProductCardOptionValue[];
};

type SliderProductItemWithHover = ProductSliderItem & {
  subtitle?: string | null;
  promotionTitle?: string | null;
  metadata?: Record<string, any> | null;
  seo?: Record<string, any> | null;

  image_url?: string | null;
  images?: any[];
  media?: any[];

  hoverImageUrl?: string | null;
  hover_image_url?: string | null;
  secondImageUrl?: string | null;
  second_image_url?: string | null;

  options?: ProductCardOption[];
  variants?: any[];

  saleEnd?: string | null;
  showSaleCountdown?: boolean;
};

export function getProductMap(data: any) {
  return data?.linkedProductsById && typeof data.linkedProductsById === "object"
    ? data.linkedProductsById
    : {};
}

export function getProductId(product: any) {
  return (
    s(product?.id) ||
    s(product?.product_id) ||
    s(product?.productId) ||
    s(product?.uuid) ||
    s(product?.value)
  );
}

export function getAllProductsRaw(data: any) {
  const direct = Array.isArray(data?.products) ? data.products : [];
  const map = getProductMap(data);
  const mapped = Object.values(map || {});

  const seen = new Set<string>();
  const out: any[] = [];

  [...direct, ...mapped].forEach((product: any) => {
    const id = getProductId(product);
    if (!id || seen.has(id)) return;

    seen.add(id);
    out.push(product);
  });

  return out;
}

export function getBestSellingProductsRaw(data: any) {
  const direct = Array.isArray(data?.bestSellingProducts)
    ? data.bestSellingProducts
    : [];

  const seen = new Set<string>();
  const out: any[] = [];

  direct.forEach((product: any) => {
    const id = getProductId(product);
    if (!id || seen.has(id)) return;

    seen.add(id);
    out.push(product);
  });

  return out;
}

export function getProductCategoryIds(product: any) {
  const ids = new Set<string>();

  [
    product?.category_id,
    product?.categoryId,
    product?.main_category_id,
    product?.mainCategoryId,
    product?.category?.id,
    product?.category?.value,
    product?.primary_category?.id,
    product?.primaryCategory?.id,
  ].forEach((value) => {
    const id = s(value);
    if (id) ids.add(id);
  });

  const arrays = [
    product?.categories,
    product?.seo?.categories,
    product?.product_categories,
    product?.linked_categories,
    product?.category_links,
    product?.categoryIds,
    product?.category_ids,
    product?.metadata?.categoryIds,
    product?.metadata?.category_ids,
  ];

  arrays.forEach((arr) => {
    if (!Array.isArray(arr)) return;

    arr.forEach((item: any) => {
      if (typeof item === "string") {
        const id = s(item);
        if (id) ids.add(id);
        return;
      }

      const id =
        s(item?.id) ||
        s(item?.category_id) ||
        s(item?.categoryId) ||
        s(item?.value);

      if (id) ids.add(id);
    });
  });

  return Array.from(ids);
}

export function getProductCreatedTime(product: any) {
  const time = new Date(
    product?.created_at ||
      product?.createdAt ||
      product?.published_at ||
      product?.updated_at ||
      0,
  ).getTime();

  return Number.isFinite(time) ? time : 0;
}

export function sortProductsByNewest(products: any[]) {
  return [...products].sort(
    (a, b) => getProductCreatedTime(b) - getProductCreatedTime(a),
  );
}

function mediaUrl(item: any) {
  return (
    s(item?.original_url) ||
    s(item?.url) ||
    s(item?.public_url) ||
    s(item?.image_url) ||
    s(item?.imageUrl) ||
    s(item?.src) ||
    ""
  );
}

function getSortedImageMedia(product: any) {
  const media = Array.isArray(product?.media) ? product.media : [];

  return media
    .filter((m: any) => {
      const kind = lower(m?.media_kind || m?.kind || m?.type);
      return !kind || kind === "image";
    })
    .sort((a: any, b: any) => {
      const ad = a?.is_default ? 1 : 0;
      const bd = b?.is_default ? 1 : 0;

      if (bd !== ad) return bd - ad;

      return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
    });
}

function getImageArrayUrl(product: any, index: number) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const raw = images[index];

  return (
    s(raw?.original_url) ||
    s(raw?.url) ||
    s(raw?.public_url) ||
    s(raw?.image_url) ||
    s(raw?.imageUrl) ||
    s(raw?.src) ||
    s(raw)
  );
}

function getMetadataImageArrayUrl(product: any, index: number) {
  const images = Array.isArray(product?.metadata?.images)
    ? product.metadata.images
    : [];

  const raw = images[index];

  return (
    s(raw?.original_url) ||
    s(raw?.url) ||
    s(raw?.public_url) ||
    s(raw?.image_url) ||
    s(raw?.imageUrl) ||
    s(raw?.src) ||
    s(raw)
  );
}

export function getFirstProductImage(product: any) {
  const direct =
    s(product?.imageUrl) ||
    s(product?.image_url) ||
    s(product?.image) ||
    s(product?.thumbnail) ||
    s(product?.thumbnail_url) ||
    s(product?.thumbnailUrl) ||
    s(product?.cover) ||
    s(product?.cover_url) ||
    s(product?.coverUrl) ||
    s(product?.main_image_url) ||
    s(product?.mainImageUrl) ||
    s(product?.seo?.og_image_url) ||
    s(product?.seo?.image) ||
    s(product?.seo?.image_url) ||
    s(product?.seo?.imageUrl) ||
    s(product?.metadata?.imageUrl) ||
    s(product?.metadata?.image_url) ||
    s(product?.metadata?.thumbnail_url) ||
    s(product?.metadata?.thumbnailUrl) ||
    getImageArrayUrl(product, 0) ||
    getMetadataImageArrayUrl(product, 0);

  if (direct) return direct;

  return mediaUrl(getSortedImageMedia(product)[0]);
}

export function getSecondProductImage(product: any, mainImage?: string) {
  const main = s(mainImage) || getFirstProductImage(product);

  const direct =
    s(product?.hoverImageUrl) ||
    s(product?.hover_image_url) ||
    s(product?.secondImageUrl) ||
    s(product?.second_image_url) ||
    s(product?.secondary_image_url) ||
    s(product?.secondaryImageUrl) ||
    s(product?.seo?.hoverImageUrl) ||
    s(product?.seo?.hover_image_url) ||
    s(product?.seo?.secondImageUrl) ||
    s(product?.seo?.second_image_url) ||
    s(product?.metadata?.hoverImageUrl) ||
    s(product?.metadata?.hover_image_url) ||
    s(product?.metadata?.secondImageUrl) ||
    s(product?.metadata?.second_image_url) ||
    s(product?.metadata?.secondary_image_url) ||
    s(product?.metadata?.secondaryImageUrl);

  if (direct && direct !== main) return direct;

  const imageSecond = getImageArrayUrl(product, 1);
  if (imageSecond && imageSecond !== main) return imageSecond;

  const metadataSecond = getMetadataImageArrayUrl(product, 1);
  if (metadataSecond && metadataSecond !== main) return metadataSecond;

  const sortedMedia = getSortedImageMedia(product);
  const mediaSecond = mediaUrl(sortedMedia[1]);

  if (mediaSecond && mediaSecond !== main) return mediaSecond;

  const mediaFirstDifferent = sortedMedia
    .map((item: any) => mediaUrl(item))
    .find((url: string) => url && url !== main);

  return mediaFirstDifferent || "";
}

export function getProductOptions(product: any): ProductCardOption[] {
  if (Array.isArray(product?.options)) return product.options;

  if (Array.isArray(product?.seo?.options)) return product.seo.options;

  if (Array.isArray(product?.metadata?.options)) {
    return product.metadata.options;
  }

  return [];
}

export function hasProductOptions(product: any) {
  return getProductOptions(product).length > 0;
}

export function getProductVariants(product: any) {
  return Array.isArray(product?.variants) ? product.variants : [];
}

export function readProductUnlimited(product: any) {
  return Boolean(
    firstDefined(
      product?.stock?.unlimited_quantity,
      product?.seo?.stock?.unlimited_quantity,
      product?.unlimited_quantity,
      product?.metadata?.unlimited_quantity,
      product?.metadata?.stock?.unlimited_quantity,
    ) ?? false,
  );
}

export function isSellableVariant(variant: any, productUnlimited: boolean) {
  if (productUnlimited) return true;

  const unlimited = Boolean(variant?.unlimited_quantity ?? false);
  if (unlimited) return true;

  const qty = Number(variant?.stock_quantity ?? variant?.quantity ?? 0);
  return Number.isFinite(qty) && qty > 0;
}

export function resolveProductPrices(product: any) {
  const productBase =
    safeNum(product?.seo?.price, NaN) ||
    safeNum(product?.pricing?.price, NaN) ||
    safeNum(product?.price, 0);

  const productSaleRaw = firstDefined(
    product?.seo?.sale_price,
    product?.pricing?.sale_price,
    product?.sale_price,
  );

  const productSale =
    productSaleRaw === undefined || productSaleRaw === null
      ? null
      : safeNum(productSaleRaw, 0);

  if (!hasProductOptions(product)) {
    const hasDiscount =
      typeof productSale === "number" &&
      productSale > 0 &&
      productBase > 0 &&
      productSale < productBase;

    return {
      price: hasDiscount ? productSale : productBase,
      compareAtPrice: hasDiscount ? productBase : null,
    };
  }

  const variants = getProductVariants(product);
  const productUnlimited = readProductUnlimited(product);

  const usableVariants = variants.filter((variant: any) =>
    isSellableVariant(variant, productUnlimited),
  );

  if (!usableVariants.length) {
    const hasDiscount =
      typeof productSale === "number" &&
      productSale > 0 &&
      productBase > 0 &&
      productSale < productBase;

    return {
      price: hasDiscount ? productSale : productBase,
      compareAtPrice: hasDiscount ? productBase : null,
    };
  }

  const prices = usableVariants.map((variant: any) => {
    const variantBase = safeNum(variant?.price, 0) || productBase;
    const variantSaleRaw = firstDefined(variant?.sale_price, productSale);
    const variantSale =
      variantSaleRaw === undefined || variantSaleRaw === null
        ? null
        : safeNum(variantSaleRaw, 0);

    const hasDiscount =
      typeof variantSale === "number" &&
      variantSale > 0 &&
      variantBase > 0 &&
      variantSale < variantBase;

    return {
      price: hasDiscount ? variantSale : variantBase,
      compareAtPrice: hasDiscount ? variantBase : null,
    };
  });

  prices.sort(
    (
      a: { price: number; compareAtPrice: number | null },
      b: { price: number; compareAtPrice: number | null },
    ) => Number(a.price) - Number(b.price),
  );

  return prices[0] || { price: productBase, compareAtPrice: null };
}

export function buildProductHref(product: any, seoMode: any) {
  const publicNo = Number(
    product?.public_no ??
      product?.publicNo ??
      product?.seo?.public_no ??
      product?.seo?.publicNo ??
      product?.metadata?.public_no ??
      product?.metadata?.publicNo ??
      0,
  );

  if (Number.isFinite(publicNo) && publicNo > 0) {
    return buildStoreProductHref({
      mode: seoMode || "named_ar",
      slugNameAr:
        s(product?.slug_name_ar) ||
        s(product?.slugNameAr) ||
        s(product?.name_ar) ||
        s(product?.name) ||
        s(product?.title) ||
        s(product?.label),
      slugNameEn:
        s(product?.slug_name_en) ||
        s(product?.slugNameEn) ||
        s(product?.name_en) ||
        s(product?.slug) ||
        s(product?.name) ||
        s(product?.title) ||
        s(product?.label),
      publicNo,
      shortCode:
        product?.short_url ??
        product?.shortUrl ??
        product?.seo?.short_url ??
        product?.seo?.shortUrl ??
        product?.metadata?.short_url ??
        product?.metadata?.shortUrl ??
        null,
    });
  }

  const existingHref = s(product?.href) || s(product?.url);
  if (existingHref) return existingHref;

  return "#";
}

function getProductSubtitle(product: any) {
  return (
    s(product?.subtitle) ||
    s(product?.sub_title) ||
    s(product?.metadata?.subtitle) ||
    null
  );
}

function getProductPromotionTitle(product: any) {
  return (
    s(product?.promotionTitle) ||
    s(product?.promotion_title) ||
    s(product?.metadata?.promotionTitle) ||
    s(product?.metadata?.promotion_title) ||
    null
  );
}

function getProductSaleEnd(product: any) {
  return (
    s(product?.seo?.sale_end) ||
    s(product?.seo?.saleEnd) ||
    s(product?.pricing?.sale_end) ||
    s(product?.pricing?.saleEnd) ||
    s(product?.sale_end) ||
    s(product?.saleEnd) ||
    s(product?.metadata?.sale_end) ||
    s(product?.metadata?.saleEnd) ||
    null
  );
}

function getProductShowSaleCountdown(product: any) {
  const raw = firstDefined(
    product?.showSaleCountdown,
    product?.show_sale_countdown,
    product?.pricing?.show_sale_countdown,
    product?.pricing?.showSaleCountdown,
    product?.seo?.show_sale_countdown,
    product?.seo?.showSaleCountdown,
    product?.metadata?.showSaleCountdown,
    product?.metadata?.show_sale_countdown,
  );

  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;

  if (typeof raw === "string") {
    const value = raw.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(value)) return true;
    if (["false", "0", "no", "off"].includes(value)) return false;
  }

  return false;
}

export function normalizeProductForSlider(
  product: any,
  seoMode: any,
): SliderProductItemWithHover | null {
  const id = getProductId(product);
  if (!id) return null;

  const prices = resolveProductPrices(product);
  const imageUrl = getFirstProductImage(product);
  const hoverImageUrl = getSecondProductImage(product, imageUrl);
  const options = getProductOptions(product);

  return {
    id,
    href: buildProductHref(product, seoMode),
    brand: s(
      product?.brand?.name ||
        product?.brand_name ||
        product?.brandName ||
        product?.vendor ||
        product?.seo?.brand_name ||
        product?.metadata?.brand ||
        product?.metadata?.brand_name,
    ),
    title: s(product?.title || product?.name || product?.label),

    subtitle: getProductSubtitle(product),
    promotionTitle: getProductPromotionTitle(product),

    metadata:
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : null,

    seo: product?.seo && typeof product.seo === "object" ? product.seo : null,

    imageUrl,
    image_url: imageUrl,

    hoverImageUrl: hoverImageUrl || null,
    hover_image_url: hoverImageUrl || null,
    secondImageUrl: hoverImageUrl || null,
    second_image_url: hoverImageUrl || null,

    images: Array.isArray(product?.images) ? product.images : [],
    media: Array.isArray(product?.media) ? product.media : [],

    options,
    variants: getProductVariants(product),

    saleEnd: getProductSaleEnd(product),
    showSaleCountdown: getProductShowSaleCountdown(product),

    rating:
      product?.rating?.average !== undefined
        ? Number(product.rating.average)
        : product?.rating_average !== undefined
          ? Number(product.rating_average)
          : product?.rating !== undefined && typeof product.rating !== "object"
            ? Number(product.rating)
            : undefined,

    reviewsCount:
      product?.rating?.count !== undefined
        ? Number(product.rating.count)
        : product?.reviews_count !== undefined
          ? Number(product.reviews_count)
          : product?.reviewsCount !== undefined
            ? Number(product.reviewsCount)
            : undefined,

    price: Number(prices.price || 0),
    compareAtPrice: prices.compareAtPrice,

    badge:
      product?.badge && typeof product.badge === "object"
        ? product.badge
        : product?.metadata?.promotionTitle
          ? {
              text: s(product.metadata.promotionTitle),
              bg: "rgb(0,121,23)",
              color: "#fff",
            }
          : null,
  };
}

export function normalizeProductsForSlider(products: any[], seoMode: any) {
  const seen = new Set<string>();

  return (Array.isArray(products) ? products : [])
    .map((product) => normalizeProductForSlider(product, seoMode))
    .filter((product): product is SliderProductItemWithHover => {
      if (!product) return false;
      if (!product.id) return false;
      if (seen.has(product.id)) return false;

      seen.add(product.id);
      return true;
    });
}

export function normalizePickerProductFallback(item: any) {
  if (!item || typeof item !== "object") return null;

  const id = getPickerItemId(item);
  if (!id) return null;

  const image = getImageFromValue(item);

  return {
    ...item,
    id,
    name:
      s(item.name) ||
      s(item.title) ||
      s(item.label) ||
      s(item.text) ||
      "منتج",
    title:
      s(item.title) ||
      s(item.name) ||
      s(item.label) ||
      s(item.text) ||
      "منتج",
    imageUrl: image,
    image_url: image,
    thumbnail_url: image,
  };
}

export function mergePickerProductWithFullProduct(full: any, pickerFallback: any) {
  if (!full) return pickerFallback;
  if (!pickerFallback) return full;

  const fullImage = getFirstProductImage(full);
  const pickerImage = getFirstProductImage(pickerFallback);

  if (fullImage) return full;
  if (!pickerImage) return full;

  return {
    ...full,
    imageUrl: pickerImage,
    image_url: pickerImage,
    thumbnail_url: pickerImage,
  };
}

export function getLinkedProductFromValue(value: any, data: any) {
  const productMap = getProductMap(data);
  const allProducts = getAllProductsRaw(data);
  const id = getPickerItemId(value);

  if (!id) return null;

  const pickerFallback = normalizePickerProductFallback(value);
  const full =
    productMap?.[id] ||
    allProducts.find((product) => getProductId(product) === id);

  return mergePickerProductWithFullProduct(full, pickerFallback);
}