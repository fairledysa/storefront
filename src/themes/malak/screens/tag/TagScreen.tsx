// FILE: apps/storefront/src/themes/malak/screens/tag/TagScreen.tsx
"use client";

import type { SeoUrlMode } from "@/data/store/settings";
import CategoryScreen from "@/themes/malak/screens/category/CategoryScreen";

type Props = {
  data?: any;
  mode: SeoUrlMode;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function getTagData(data: any) {
  const tag = data?.tag || data?.category || data?.currentCategory || {};

  return {
    id: s(tag?.id),
    name: s(tag?.name) || s(tag?.title) || "وسم",
    slug: s(tag?.slug),
    description: s(tag?.description),
    seoTitle: s(tag?.seo_title),
    seoDescription: s(tag?.seo_description),
  };
}

function getProducts(data: any) {
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function productCountLabel(count: number) {
  if (count === 1) return "منتج";
  if (count === 2) return "منتجان";
  if (count >= 3 && count <= 10) return "منتجات";
  return "منتج";
}

export default function TagScreen({ data, mode }: Props) {
  const tag = getTagData(data);
  const products = getProducts(data);

  const description =
    tag.description ||
    tag.seoDescription ||
    "منتجات مرتبطة بهذا الوسم من نفس المتجر.";

  const normalizedData = {
    ...(data ?? {}),
    route: "tag",
    products,
    items: products,
    productCount: products.length,
    total: products.length,
    category: {
      ...(data?.category ?? {}),
      ...(data?.tag ?? {}),
      id: tag.id,
      name: tag.name,
      title: tag.name,
      slug: tag.slug,
      description: tag.description,
      is_tag: true,
    },
    currentCategory: {
      ...(data?.currentCategory ?? {}),
      ...(data?.tag ?? {}),
      id: tag.id,
      name: tag.name,
      title: tag.name,
      slug: tag.slug,
      description: tag.description,
      is_tag: true,
    },
  };

  return (
    <main dir="rtl" className="mk-tag-page">
      <section className="mk-tag-head" aria-label="وسم المنتجات">
        <div className="mk-tag-head__inner">
          <div className="mk-tag-head__content">
            <div className="mk-tag-head__topline">
              <span className="mk-tag-head__eyebrow">وسم المنتجات</span>

              <span className="mk-tag-head__count">
                <strong>{products.length}</strong>
                <span>{productCountLabel(products.length)}</span>
              </span>
            </div>

            <h1 className="mk-tag-head__title">{tag.name}</h1>

            <p className="mk-tag-head__desc">{description}</p>
          </div>
        </div>
      </section>

      <section className="mk-tag-products" aria-label={`منتجات وسم ${tag.name}`}>
        <CategoryScreen data={normalizedData} mode={mode} />
      </section>
    </main>
  );
}