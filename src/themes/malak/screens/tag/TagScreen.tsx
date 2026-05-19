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
      <section className="mk-tag-head">
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

      <section className="mk-tag-products">
        <CategoryScreen data={normalizedData} mode={mode} />
      </section>

      <style jsx global>{`
        .mk-tag-page {
          min-height: 70vh;
          background: var(--mk-bg-page, #fff);
          color: var(--mk-text-primary, #111827);
        }

        .mk-tag-head {
          padding: 28px 16px 0;
        }

        .mk-tag-head__inner {
          width: min(var(--mk-container, 1180px), calc(100vw - 32px));
          margin: 0 auto;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          padding: 0 0 20px;
        }

        .mk-tag-head__content {
          max-width: 760px;
          text-align: right;
        }

        .mk-tag-head__topline {
          display: flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .mk-tag-head__eyebrow,
        .mk-tag-head__count {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.035);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .mk-tag-head__eyebrow {
          padding: 0 11px;
          color: rgba(15, 23, 42, 0.58);
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        .mk-tag-head__count {
          gap: 5px;
          padding: 0 10px;
          color: rgba(15, 23, 42, 0.62);
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        .mk-tag-head__count strong {
          color: var(--mk-text-primary, #111827);
          font-size: 13px;
          font-weight: 950;
        }

        .mk-tag-head__title {
          margin: 0;
          color: var(--mk-text-primary, #111827);
          font-size: clamp(25px, 3.1vw, 42px);
          font-weight: 950;
          letter-spacing: -0.045em;
          line-height: 1.12;
        }

        .mk-tag-head__desc {
          max-width: 620px;
          margin: 10px 0 0;
          color: rgba(15, 23, 42, 0.58);
          font-size: 14px;
          font-weight: 650;
          line-height: 1.85;
        }

        .mk-tag-products {
          padding: 18px 16px 54px;
        }

        .mk-tag-page .mk-dcat {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }

        .mk-tag-page .mk-dcat__container {
          width: min(var(--mk-container, 1180px), calc(100vw - 32px)) !important;
          max-width: none !important;
          margin: 0 auto !important;
          padding: 0 !important;
        }

        .mk-tag-page
          .mk-dcat__container
          > *:not(.mk-dcat__grid):not(.mk-dcat__empty) {
          display: none !important;
        }

        .mk-tag-page .mk-dcat__title {
          display: none !important;
        }

        .mk-tag-page .mk-dcat__grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(230px, 270px)) !important;
          gap: 18px !important;
          align-items: start !important;
          justify-content: end !important;
          margin: 0 !important;
          padding: 0 !important;
          border-top: 0 !important;
          direction: rtl !important;
        }

        .mk-tag-page .mk-dcat__grid > * {
          min-width: 0 !important;
        }

        .mk-tag-page .mk-dcat__empty {
          margin-top: 18px !important;
          border-radius: 22px !important;
          border: 1px solid rgba(15, 23, 42, 0.08) !important;
          background: rgba(255, 255, 255, 0.76) !important;
          color: rgba(15, 23, 42, 0.58) !important;
          padding: 28px 18px !important;
          font-size: 14px !important;
          font-weight: 900 !important;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.045) !important;
        }

        .mk-tag-page .mkpc-card {
          width: 100% !important;
        }

        .mk-tag-page .mkpc-media {
          aspect-ratio: 3 / 4 !important;
          height: auto !important;
          min-height: 0 !important;
          background: #f6f6f6 !important;
        }

        .mk-tag-page .mkpc-media-img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .mk-tag-page .mkpc-media-img--hover {
          object-fit: cover !important;
        }

        .mk-tag-page .mkpc-body {
          min-height: 150px !important;
        }

        .mk-tag-page .mkpc-options-overlay {
          display: grid !important;
        }

        @media (max-width: 768px) {
          .mk-tag-head {
            padding: 20px 12px 0;
          }

          .mk-tag-head__inner {
            width: min(var(--mk-container, 1180px), calc(100vw - 24px));
            padding-bottom: 16px;
          }

          .mk-tag-products {
            padding: 14px 12px 36px;
          }

          .mk-tag-head__topline {
            margin-bottom: 10px;
            gap: 6px;
          }

          .mk-tag-head__eyebrow,
          .mk-tag-head__count {
            min-height: 28px;
          }

          .mk-tag-head__eyebrow {
            padding: 0 10px;
            font-size: 10.5px;
          }

          .mk-tag-head__count {
            padding: 0 9px;
            font-size: 10.5px;
          }

          .mk-tag-head__title {
            font-size: 26px;
          }

          .mk-tag-head__desc {
            margin-top: 8px;
            font-size: 13px;
            line-height: 1.75;
          }

          .mk-tag-page .mk-dcat__container {
            width: min(var(--mk-container, 1180px), calc(100vw - 24px)) !important;
          }

          .mk-tag-page .mk-dcat__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
            justify-content: stretch !important;
          }
        }
      `}</style>
    </main>
  );
}