// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileCategoryProductCard.tsx
"use client";

import ProductCard from "@/themes/malak/components/product-card/ProductCard";
import type { ProductCardItem } from "@/themes/malak/components/product-card/ProductCard";

type MobileCategoryCardItem = {
  id?: string | number | null;
  href?: string | null;
  title?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  rating?: number | string | null;
  reviewsCount?: number | string | null;

  subtitle?: string | null;
  promotionTitle?: string | null;
  metadata?: Record<string, any> | null;
  badge?: { text: string; bg: string; color: string } | null;
  isOutOfStock?: boolean | null;

  saleEnd?: string | null;
  showSaleCountdown?: boolean | null;
  showDashInstead?: boolean | null;
};

type Props = {
  item?: MobileCategoryCardItem | null;
};

function toFiniteNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toOptionalFiniteNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toNullableFiniteNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function MobileCategoryProductCard({ item }: Props) {
  if (!item) return null;

  const id = String(item.id ?? "").trim();
  const title = String(item.title ?? "").trim();
  const href = String(item.href ?? "#").trim() || "#";
  const imageUrl = String(item.imageUrl ?? "").trim();

  // حماية إضافية: لا ترندر كارد مكسور لو المنتج جاي undefined أو ناقص جدًا
  if (!id && !title && !imageUrl) return null;

  const mappedItem: ProductCardItem = {
    id: id || title || href,
    href,

    brand: String(item.brand ?? "").trim(),
    title,

    subtitle: item.subtitle ?? null,
    promotionTitle: item.promotionTitle ?? null,
    metadata: item.metadata ?? null,

    imageUrl,

    rating: toOptionalFiniteNumber(item.rating),
    reviewsCount: toOptionalFiniteNumber(item.reviewsCount),

    price: toFiniteNumber(item.price, 0),
    compareAtPrice:
      item.compareAtPrice === null || item.compareAtPrice === undefined
        ? null
        : toNullableFiniteNumber(item.compareAtPrice),

    badge: item.badge ?? null,

    isOutOfStock: Boolean(item.isOutOfStock),

    saleEnd: item.saleEnd ?? null,
    showSaleCountdown: Boolean(item.showSaleCountdown),

    showDashInstead: item.showDashInstead ?? true,
  };

  return <ProductCard item={mappedItem} />;
}