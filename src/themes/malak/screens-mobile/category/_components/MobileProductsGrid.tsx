// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileProductsGrid.tsx
"use client";

import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import MobileCategoryProductCard from "./MobileCategoryProductCard";

type Props = {
  products: any[];
  mode: SeoUrlMode;
};

function safeNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function firstDefined(...values: any[]) {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }

  return undefined;
}

function readImage(p: any) {
  const media = Array.isArray(p?.media) ? p.media : [];

  const firstImage = media
    .filter((m: any) => m?.media_kind === "image" && m?.original_url)
    .sort(
      (a: any, b: any) =>
        Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
    )[0];

  return String(firstImage?.original_url ?? p?.image_url ?? "").trim();
}

function readPriceData(p: any) {
  const base =
    safeNum(firstDefined(p?.seo?.price, p?.pricing?.price, p?.price)) ?? 0;

  const sale = safeNum(
    firstDefined(p?.seo?.sale_price, p?.pricing?.sale_price, p?.sale_price),
  );

  if (typeof sale === "number" && sale > 0 && sale < base) {
    return {
      price: sale,
      compareAtPrice: base,
    };
  }

  return {
    price: base,
    compareAtPrice: null,
  };
}

function readRating(p: any) {
  const val = firstDefined(
    p?.rating,
    p?.rating?.average,
    p?.seo?.rating_average,
  );

  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function readReviewsCount(p: any) {
  const val = firstDefined(
    p?.reviews_count,
    p?.rating?.count,
    p?.seo?.rating_count,
  );

  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function readOutOfStock(p: any) {
  const qty = Number(
    firstDefined(
      p?.stock?.quantity,
      p?.quantity,
      p?.stock_quantity,
      p?.seo?.stock?.quantity,
    ) ?? 0,
  );

  const unlimited = Boolean(
    firstDefined(
      p?.stock?.unlimited_quantity,
      p?.unlimited_quantity,
      p?.seo?.stock?.unlimited_quantity,
    ) ?? false,
  );

  if (unlimited) return false;

  return !(Number.isFinite(qty) && qty > 0);
}

function readSaleEnd(p: any) {
  const value =
    p?.pricing?.sale_end ??
    p?.seo?.sale_end ??
    p?.sale_end ??
    p?.metadata?.saleEnd ??
    null;

  const text = String(value ?? "").trim();

  return text || null;
}

function readShowSaleCountdown(p: any) {
  const value =
    p?.metadata?.showSaleCountdown ?? p?.metadata?.show_sale_countdown ?? false;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1";
  }

  return false;
}

export default function MobileProductsGrid({ products, mode }: Props) {
  if (!products || products.length === 0) {
    return (
      <div className="mk-mobile-category-products-empty">
        لا توجد منتجات
      </div>
    );
  }

  return (
    <div className="mk-mobile-category-products">
      {products.map((p: any, i: number) => {
        const href = buildProductHref({
          mode,
          slugNameAr: p?.name ?? "",
          slugNameEn: p?.name ?? "",
          publicNo: Number(p?.public_no ?? 0),
          shortCode: p?.short_url ?? null,
        });

        const pricing = readPriceData(p);

        return (
          <MobileCategoryProductCard
            key={`${String(p?.id ?? p?.public_no ?? i)}_${i}`}
            item={{
              id: String(p?.id ?? p?.public_no ?? i),
              href,
              brand: String(p?.brand?.name ?? p?.brand_name ?? ""),
              title: String(p?.name ?? ""),
              imageUrl: readImage(p),
              rating: readRating(p) ?? undefined,
              reviewsCount: readReviewsCount(p) ?? undefined,
              price: pricing.price,
              compareAtPrice: pricing.compareAtPrice,
              subtitle: p?.subtitle ?? p?.metadata?.subtitle ?? null,
              promotionTitle:
                p?.promotionTitle ?? p?.metadata?.promotionTitle ?? null,
              metadata: p?.metadata ?? null,
              badge: null,
              isOutOfStock: readOutOfStock(p),
              saleEnd: readSaleEnd(p),
              showSaleCountdown: readShowSaleCountdown(p),
              showDashInstead: true,
            }}
          />
        );
      })}
    </div>
  );
}