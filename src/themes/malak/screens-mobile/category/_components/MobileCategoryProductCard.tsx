// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileCategoryProductCard.tsx
"use client";

import ProductCard from "@/themes/malak/components/product-card/ProductCard";
import type { ProductCardVM } from "@/data/viewmodels/product.vm";

type Props = {
  item?: ProductCardVM | null;
};

export default function MobileCategoryProductCard({ item }: Props) {
  if (!item) return null;

  const id = String(item.id ?? "").trim();
  const title = String(item.title ?? "").trim();
  const imageUrl = String((item as any).imageUrl ?? "").trim();

  if (!id && !title && !imageUrl) return null;

  return <ProductCard item={item as any} />;
}