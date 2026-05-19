// FILE: apps/storefront/src/themes/malak/screens/category/CategoryScreen.tsx

"use client";

import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import { parseStoreOptions } from "@/lib/store-options";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";
import ProductCard from "@/themes/malak/components/product-card/ProductCard";

type Props = {
  data?: any;
  mode: SeoUrlMode;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function resolveProductHref(product: any, mode: SeoUrlMode) {
  const existingHref = s(product?.href) || s(product?.url);

  if (existingHref) return existingHref;

  return buildProductHref({
    mode,
    slugNameAr: product?.name ?? product?.title ?? "",
    slugNameEn: product?.slug ?? product?.name ?? product?.title ?? "",
    publicNo: Number(product?.public_no ?? product?.publicNo ?? 0),
    shortCode: product?.short_url ?? product?.shortUrl ?? null,
  });
}

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

function buildProductCard(args: {
  product: any;
  mode: SeoUrlMode;
  showDashInstead: boolean;
  currencies?: any;
  tax?: any;
}): ProductCardVM {
  const href = resolveProductHref(args.product, args.mode);

  return toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...args.product,
      href,
      showDashInstead: args.showDashInstead,
    },
  });
}

function sortProductsByStock(
  products: ProductCardVM[],
  quantitySortEnabled: boolean,
) {
  if (!quantitySortEnabled) return products;

  return [...products].sort((a, b) => {
    if (a.isOutOfStock === b.isOutOfStock) return 0;
    if (a.isOutOfStock && !b.isOutOfStock) return 1;
    if (!a.isOutOfStock && b.isOutOfStock) return -1;

    return 0;
  });
}

export default function CategoryScreen({ data, mode }: Props) {
  if (!data || !data.category) {
    return (
      <div dir="rtl" className="mk-dcat">
        <div className="mk-dcat__container">
          <div className="mk-dcat__error">تعذر تحميل الصفحة</div>
        </div>
      </div>
    );
  }

  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);

  const isTagPage = data?.route === "tag" || data?.category?.is_tag === true;

  const pageTitle =
    s(data?.tag?.title) ||
    s(data?.tag?.name) ||
    s(data?.category?.name) ||
    "المنتجات";

  const pageDescription =
    s(data?.tag?.description) || s(data?.category?.description) || "";

  const storeOptions = parseStoreOptions(data?.options ?? {});
  const quantitySortEnabled = storeOptions?.switches?.quantitySort ?? true;
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const rawProducts = Array.isArray(data.products) ? data.products : [];

  const productCards = rawProducts.map((product: any) =>
    buildProductCard({
      product,
      mode,
      showDashInstead,
      currencies,
      tax,
    }),
  );

  const products = sortProductsByStock(productCards, quantitySortEnabled);

  return (
    <div
      dir="rtl"
      className={["mk-dcat", isTagPage ? "mk-dcat--tag" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mk-dcat__container">
        {isTagPage ? (
          <div className="mk-dcat__tagHead">
            <div className="mk-dcat__tagMeta">
              <span className="mk-dcat__tagEyebrow">وسم المنتجات</span>

              <h1 className="mk-dcat__title mk-dcat__title--tag">
                {pageTitle}
              </h1>

              {pageDescription ? (
                <p className="mk-dcat__tagDesc">{pageDescription}</p>
              ) : null}
            </div>

            <div className="mk-dcat__tagCount">
              <span>{products.length}</span>
              <small>منتج</small>
            </div>
          </div>
        ) : (
          <h1 className="mk-dcat__title">{pageTitle}</h1>
        )}

        {products.length === 0 ? (
          <div className="mk-dcat__empty">
            {isTagPage
              ? "لا توجد منتجات مرتبطة بهذا الوسم"
              : "لا توجد منتجات في هذا القسم"}
          </div>
        ) : (
          <div className="mk-dcat__grid">
            {products.map((product, index) => (
              <ProductCard
                key={`${product.id || product.publicNo || index}_${
                  product.publicNo ?? index
                }`}
                item={product as any}
              />
            ))}
          </div>
        )}
      </div>

      {isTagPage ? (
        <style jsx global>{`
          .mk-dcat--tag {
            min-height: 62vh;
            background: var(--mk-bg-page, #fff);
          }

          .mk-dcat--tag .mk-dcat__container {
            width: min(100% - 32px, var(--mk-container, 1280px));
            margin-inline: auto;
            padding-block: 34px 54px;
          }

          .mk-dcat__tagHead {
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 26px;
            border-bottom: 1px solid rgba(24, 24, 27, 0.08);
            padding-bottom: 18px;
          }

          .mk-dcat__tagMeta {
            min-width: 0;
            display: grid;
            gap: 8px;
          }

          .mk-dcat__tagEyebrow {
            width: fit-content;
            border: 1px solid rgba(24, 24, 27, 0.08);
            border-radius: 999px;
            background: rgba(244, 244, 245, 0.72);
            padding: 6px 10px;
            color: rgba(39, 39, 42, 0.62);
            font-size: 11px;
            font-weight: 900;
            line-height: 1;
          }

          .mk-dcat__title--tag {
            margin: 0 !important;
            color: #111827;
            font-size: clamp(24px, 3vw, 38px);
            font-weight: 950;
            line-height: 1.2;
            letter-spacing: -0.04em;
          }

          .mk-dcat__tagDesc {
            max-width: 680px;
            margin: 0;
            color: rgba(63, 63, 70, 0.72);
            font-size: 14px;
            font-weight: 650;
            line-height: 1.9;
          }

          .mk-dcat__tagCount {
            min-width: 94px;
            height: 70px;
            display: grid;
            place-items: center;
            align-content: center;
            border: 1px solid rgba(24, 24, 27, 0.08);
            border-radius: 20px;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.9), #fff),
              rgba(244, 244, 245, 0.7);
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
          }

          .mk-dcat__tagCount span {
            color: #09090b;
            font-size: 22px;
            font-weight: 950;
            line-height: 1;
          }

          .mk-dcat__tagCount small {
            margin-top: 4px;
            color: rgba(82, 82, 91, 0.72);
            font-size: 11px;
            font-weight: 850;
            line-height: 1;
          }

          .mk-dcat--tag .mk-dcat__grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
            gap: 22px;
            align-items: start;
          }

          .mk-dcat--tag .mk-dcat__empty {
            min-height: 220px;
            display: grid;
            place-items: center;
            border: 1px dashed rgba(24, 24, 27, 0.14);
            border-radius: 24px;
            background: rgba(250, 250, 250, 0.75);
            color: rgba(63, 63, 70, 0.72);
            font-size: 14px;
            font-weight: 800;
          }

          @media (max-width: 768px) {
            .mk-dcat--tag .mk-dcat__container {
              width: min(100% - 24px, var(--mk-container, 1280px));
              padding-block: 22px 38px;
            }

            .mk-dcat__tagHead {
              align-items: stretch;
              gap: 12px;
              margin-bottom: 18px;
              padding-bottom: 14px;
            }

            .mk-dcat__tagEyebrow {
              padding: 5px 9px;
              font-size: 10.5px;
            }

            .mk-dcat__title--tag {
              font-size: 24px;
            }

            .mk-dcat__tagDesc {
              font-size: 12.5px;
              line-height: 1.8;
            }

            .mk-dcat__tagCount {
              min-width: 72px;
              height: 58px;
              border-radius: 16px;
            }

            .mk-dcat__tagCount span {
              font-size: 18px;
            }

            .mk-dcat--tag .mk-dcat__grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }
          }
        `}</style>
      ) : null}
    </div>
  );
}