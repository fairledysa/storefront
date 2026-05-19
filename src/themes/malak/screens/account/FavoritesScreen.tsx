// FILE: apps/storefront/src/themes/malak/screens/account/FavoritesScreen.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AccountLayout from "./AccountLayout";
import ProductCard, {
  type ProductCardItem,
} from "@/themes/malak/components/product-card/ProductCard";

type FavoriteCardItem = ProductCardItem & {
  productId: string;
  favoriteId?: string | null;

  currency?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;

  currency_symbol?: string | null;
  currencySymbol?: string | null;
  symbol?: string | null;

  currency_decimals?: number | null;
  currencyDecimals?: number | null;
  decimal_digits?: number | null;
  decimalDigits?: number | null;

  store_currency?: any;
  storeCurrency?: any;

  pricing?: any;
  product_pricing?: any;
};

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; items: FavoriteCardItem[] }
  | { kind: "error" };

function s(value: any) {
  return String(value ?? "").trim();
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampDecimals(value: any, fallback = 2) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return fallback;
}

function readMediaUrl(value: any) {
  if (!value) return "";
  if (typeof value === "string") return s(value);

  return (
    s(value.original_url) ||
    s(value.public_url) ||
    s(value.image_url) ||
    s(value.imageUrl) ||
    s(value.thumbnail_url) ||
    s(value.thumbnailUrl) ||
    s(value.url) ||
    s(value.src) ||
    s(value.path) ||
    ""
  );
}

function isImageMedia(value: any) {
  if (!value || typeof value !== "object") return false;

  const kind = s(value.media_kind || value.kind || value.type).toLowerCase();

  return !kind || kind === "image";
}

function getSortedMediaImages(value: any) {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .filter((row) => {
      if (typeof row === "string") return Boolean(s(row));
      return isImageMedia(row) && Boolean(readMediaUrl(row));
    })
    .sort((a: any, b: any) => {
      const ad = a?.is_default ? 1 : 0;
      const bd = b?.is_default ? 1 : 0;

      if (bd !== ad) return bd - ad;

      return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
    })
    .map((row) => readMediaUrl(row))
    .filter(Boolean);
}

function getProductFromFavorite(row: any) {
  return (
    row?.product ||
    row?.products ||
    row?.product_row ||
    row?.productData ||
    row?.product_data ||
    row
  );
}

function readCurrencyPayload(product: any) {
  const storeCurrency =
    product?.store_currency ||
    product?.storeCurrency ||
    product?.pricing?.store_currency ||
    product?.pricing?.storeCurrency ||
    product?.product_pricing?.store_currency ||
    product?.product_pricing?.storeCurrency ||
    product?.metadata?.store_currency ||
    product?.metadata?.storeCurrency ||
    null;

  const code = s(
    firstDefined(
      product?.currency_code,
      product?.currencyCode,
      product?.currency,
      product?.pricing?.currency_code,
      product?.pricing?.currencyCode,
      product?.pricing?.currency,
      product?.product_pricing?.currency_code,
      product?.product_pricing?.currencyCode,
      product?.product_pricing?.currency,
      product?.metadata?.currency_code,
      product?.metadata?.currencyCode,
      product?.metadata?.currency,
      storeCurrency?.currency_code,
      storeCurrency?.code,
    ),
  ).toUpperCase();

  const symbol =
    s(
      firstDefined(
        product?.currency_symbol,
        product?.currencySymbol,
        product?.symbol,
        product?.pricing?.currency_symbol,
        product?.pricing?.currencySymbol,
        product?.pricing?.symbol,
        product?.product_pricing?.currency_symbol,
        product?.product_pricing?.currencySymbol,
        product?.product_pricing?.symbol,
        product?.metadata?.currency_symbol,
        product?.metadata?.currencySymbol,
        product?.metadata?.symbol,
        storeCurrency?.symbol,
      ),
    ) ||
    code ||
    "";

  const decimalDigits = clampDecimals(
    firstDefined(
      product?.currency_decimals,
      product?.currencyDecimals,
      product?.decimal_digits,
      product?.decimalDigits,
      product?.pricing?.currency_decimals,
      product?.pricing?.currencyDecimals,
      product?.pricing?.decimal_digits,
      product?.pricing?.decimalDigits,
      product?.product_pricing?.currency_decimals,
      product?.product_pricing?.currencyDecimals,
      product?.product_pricing?.decimal_digits,
      product?.product_pricing?.decimalDigits,
      product?.metadata?.currency_decimals,
      product?.metadata?.currencyDecimals,
      product?.metadata?.decimal_digits,
      product?.metadata?.decimalDigits,
      storeCurrency?.decimal_digits,
      storeCurrency?.decimalDigits,
    ),
    2,
  );

  const finalStoreCurrency = {
    ...(storeCurrency && typeof storeCurrency === "object" ? storeCurrency : {}),
    code,
    currency_code: code,
    symbol,
    decimal_digits: decimalDigits,
    decimalDigits: decimalDigits,
  };

  return {
    currency: code,
    currency_code: code,
    currencyCode: code,

    currency_symbol: symbol,
    currencySymbol: symbol,
    symbol,

    currency_decimals: decimalDigits,
    currencyDecimals: decimalDigits,
    decimal_digits: decimalDigits,
    decimalDigits: decimalDigits,

    store_currency: finalStoreCurrency,
    storeCurrency: finalStoreCurrency,
  };
}

function getProductImage(product: any) {
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
    s(product?.metadata?.thumbnailUrl);

  if (direct) return direct;

  return (
    getSortedMediaImages(product?.media)[0] ||
    getSortedMediaImages(product?.images)[0] ||
    getSortedMediaImages(product?.metadata?.media)[0] ||
    getSortedMediaImages(product?.metadata?.images)[0] ||
    ""
  );
}

function getProductHoverImage(product: any, mainImage: string) {
  const direct =
    s(product?.hoverImageUrl) ||
    s(product?.hover_image_url) ||
    s(product?.secondImageUrl) ||
    s(product?.second_image_url) ||
    s(product?.secondary_image_url) ||
    s(product?.secondaryImageUrl) ||
    s(product?.metadata?.hoverImageUrl) ||
    s(product?.metadata?.hover_image_url) ||
    s(product?.metadata?.secondImageUrl) ||
    s(product?.metadata?.second_image_url) ||
    s(product?.seo?.hoverImageUrl) ||
    s(product?.seo?.hover_image_url) ||
    s(product?.seo?.secondImageUrl) ||
    s(product?.seo?.second_image_url);

  if (direct && direct !== mainImage) return direct;

  const buckets = [
    product?.media,
    product?.images,
    product?.metadata?.media,
    product?.metadata?.images,
    product?.metadata?.gallery,
    product?.metadata?.product_images,
    product?.seo?.media,
    product?.seo?.images,
  ];

  for (const bucket of buckets) {
    const found = getSortedMediaImages(bucket).find(
      (url) => url && url !== mainImage,
    );

    if (found) return found;
  }

  return "";
}

function readOptions(product: any) {
  const sources = [
    product?.options,
    product?.product_options,
    product?.productOptions,
    product?.metadata?.options,
    product?.metadata?.product_options,
    product?.metadata?.productOptions,
    product?.seo?.options,
    product?.seo?.product_options,
    product?.seo?.productOptions,
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source.length) return source;
  }

  return [];
}

function readVariants(product: any) {
  const sources = [
    product?.variants,
    product?.metadata?.variants,
    product?.seo?.variants,
    product?.metadata?.seo?.variants,
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source.length) return source;
  }

  return [];
}

function readProductUnlimited(product: any) {
  return readBool(
    firstDefined(
      product?.stock?.unlimited_quantity,
      product?.stock?.unlimitedQuantity,
      product?.seo?.stock?.unlimited_quantity,
      product?.seo?.stock?.unlimitedQuantity,
      product?.unlimited_quantity,
      product?.unlimitedQuantity,
      product?.metadata?.stock?.unlimited_quantity,
      product?.metadata?.stock?.unlimitedQuantity,
      product?.metadata?.unlimited_quantity,
      product?.metadata?.unlimitedQuantity,
      product?.metadata?.qtyUnlimited,
    ),
    false,
  );
}

function readProductQty(product: any) {
  return safeNum(
    firstDefined(
      product?.stock?.quantity,
      product?.stock?.qty,
      product?.seo?.stock?.quantity,
      product?.quantity,
      product?.qty,
      product?.stock_quantity,
      product?.stockQuantity,
      product?.metadata?.quantity,
      product?.metadata?.qty,
      product?.metadata?.stock_quantity,
      product?.metadata?.stockQuantity,
      product?.metadata?.stock?.quantity,
    ),
  );
}

function hasExplicitSimpleStockData(product: any) {
  return (
    firstDefined(
      product?.stock?.quantity,
      product?.stock?.qty,
      product?.seo?.stock?.quantity,
      product?.quantity,
      product?.qty,
      product?.stock_quantity,
      product?.stockQuantity,
      product?.metadata?.quantity,
      product?.metadata?.qty,
      product?.metadata?.stock_quantity,
      product?.metadata?.stockQuantity,
      product?.metadata?.stock?.quantity,
      product?.stock?.unlimited_quantity,
      product?.stock?.unlimitedQuantity,
      product?.seo?.stock?.unlimited_quantity,
      product?.seo?.stock?.unlimitedQuantity,
      product?.unlimited_quantity,
      product?.unlimitedQuantity,
      product?.metadata?.unlimited_quantity,
      product?.metadata?.unlimitedQuantity,
      product?.metadata?.qtyUnlimited,
    ) !== undefined
  );
}

function isSellableVariant(variant: any, productUnlimited: boolean) {
  if (productUnlimited) return true;

  const unlimited = readBool(
    firstDefined(
      variant?.unlimited_quantity,
      variant?.unlimitedQuantity,
      variant?.qtyUnlimited,
      variant?.quantityUnlimited,
      variant?.metadata?.unlimited_quantity,
      variant?.metadata?.unlimitedQuantity,
    ),
    false,
  );

  if (unlimited) return true;

  const qty = safeNum(
    firstDefined(
      variant?.stock_quantity,
      variant?.stockQuantity,
      variant?.quantity,
      variant?.qty,
      variant?.available_qty,
      variant?.availableQty,
      variant?.metadata?.stock_quantity,
      variant?.metadata?.stockQuantity,
      variant?.metadata?.quantity,
      variant?.metadata?.qty,
    ),
  );

  if (qty !== null) return qty > 0;

  return true;
}

function hasVariantStockData(variant: any) {
  return (
    variant?.stock_quantity !== undefined ||
    variant?.stockQuantity !== undefined ||
    variant?.quantity !== undefined ||
    variant?.qty !== undefined ||
    variant?.unlimited_quantity !== undefined ||
    variant?.unlimitedQuantity !== undefined
  );
}

function isOutOfStockProduct(product: any) {
  const options = readOptions(product);
  const variants = readVariants(product);
  const productUnlimited = readProductUnlimited(product);
  const productQty = readProductQty(product);

  if (!options.length) {
    if (productUnlimited) return false;
    if (!hasExplicitSimpleStockData(product)) return false;

    return Number(productQty ?? 0) <= 0;
  }

  if (productUnlimited) return false;

  if (variants.some((variant: any) => hasVariantStockData(variant))) {
    return !variants.some((variant: any) =>
      isSellableVariant(variant, productUnlimited),
    );
  }

  if (hasExplicitSimpleStockData(product)) {
    return Number(productQty ?? 0) <= 0;
  }

  return false;
}

function resolvePrice(product: any) {
  const base =
    safeNum(
      firstDefined(
        product?.pricing?.price,
        product?.product_pricing?.price,
        product?.price,
        product?.regular_price,
        product?.base_price,
        product?.seo?.price,
        product?.metadata?.price,
        product?.metadata?.base_price,
      ),
    ) ?? 0;

  const sale = safeNum(
    firstDefined(
      product?.pricing?.sale_price,
      product?.pricing?.salePrice,
      product?.product_pricing?.sale_price,
      product?.product_pricing?.salePrice,
      product?.sale_price,
      product?.salePrice,
      product?.seo?.sale_price,
      product?.seo?.salePrice,
      product?.metadata?.sale_price,
      product?.metadata?.salePrice,
    ),
  );

  const hasDiscount =
    typeof sale === "number" && sale > 0 && base > 0 && sale < base;

  return {
    price: hasDiscount ? sale : base,
    compareAtPrice: hasDiscount ? base : null,
  };
}

function readBrand(product: any) {
  if (typeof product?.brand === "string") return s(product.brand);

  return (
    s(product?.brand?.name) ||
    s(product?.brand_name) ||
    s(product?.brandName) ||
    s(product?.vendor) ||
    s(product?.seo?.brand_name) ||
    s(product?.metadata?.brand) ||
    s(product?.metadata?.brand_name) ||
    ""
  );
}

function readRating(product: any) {
  return safeNum(
    firstDefined(
      product?.rating,
      product?.rating_average,
      product?.ratingAverage,
      product?.reviews?.rating,
      product?.reviews?.average,
      product?.seo?.rating?.average,
      product?.metadata?.rating,
    ),
  );
}

function readReviewsCount(product: any) {
  return (
    safeNum(
      firstDefined(
        product?.reviews_count,
        product?.reviewsCount,
        product?.rating_count,
        product?.reviews?.count,
        product?.seo?.rating?.count,
        product?.metadata?.reviewsCount,
        product?.metadata?.reviews_count,
      ),
    ) ?? undefined
  );
}

function readSaleEnd(product: any) {
  const value = firstDefined(
    product?.pricing?.sale_end,
    product?.pricing?.saleEnd,
    product?.product_pricing?.sale_end,
    product?.product_pricing?.saleEnd,
    product?.seo?.sale_end,
    product?.seo?.saleEnd,
    product?.sale_end,
    product?.saleEnd,
    product?.metadata?.saleEnd,
    product?.metadata?.sale_end,
  );

  return s(value) || null;
}

function readShowSaleCountdown(product: any) {
  return readBool(
    firstDefined(
      product?.showSaleCountdown,
      product?.show_sale_countdown,
      product?.pricing?.showSaleCountdown,
      product?.pricing?.show_sale_countdown,
      product?.product_pricing?.showSaleCountdown,
      product?.product_pricing?.show_sale_countdown,
      product?.seo?.showSaleCountdown,
      product?.seo?.show_sale_countdown,
      product?.metadata?.showSaleCountdown,
      product?.metadata?.show_sale_countdown,
    ),
    false,
  );
}

function readBadge(product: any) {
  if (product?.badge && typeof product.badge === "object") {
    const text = s(product.badge.text || product.badge.label || product.badge.name);

    if (!text) return null;

    return {
      text,
      bg:
        s(product.badge.bg || product.badge.background || product.badge.color) ||
        "#0b7a2a",
      color:
        s(
          product.badge.textColor ||
            product.badge.text_color ||
            product.badge.colorText,
        ) || "#fff",
    };
  }

  const promo =
    s(product?.promotionTitle) ||
    s(product?.promotion_title) ||
    s(product?.metadata?.promotionTitle) ||
    s(product?.metadata?.promotion_title);

  if (!promo) return null;

  return {
    text: promo,
    bg: "#0b7a2a",
    color: "#fff",
  };
}

function normalizeFavoriteItem(row: any): FavoriteCardItem | null {
  const product = getProductFromFavorite(row);
  const productId =
    s(row?.product_id) ||
    s(row?.productId) ||
    s(product?.id) ||
    s(product?.product_id) ||
    s(product?.productId);

  const title = s(product?.name) || s(product?.title);
  if (!productId || !title) return null;

  const imageUrl = getProductImage(product);
  const hoverImageUrl = getProductHoverImage(product, imageUrl);
  const prices = resolvePrice(product);
  const currencyPayload = readCurrencyPayload(product);

  const metadata =
    product?.metadata && typeof product.metadata === "object"
      ? {
          ...product.metadata,
          ...currencyPayload,
          media: product?.media,
          options: readOptions(product),
          hoverImageUrl,
          hover_image_url: hoverImageUrl,
          secondImageUrl: hoverImageUrl,
          second_image_url: hoverImageUrl,
        }
      : {
          ...currencyPayload,
          media: product?.media,
          options: readOptions(product),
          hoverImageUrl,
          hover_image_url: hoverImageUrl,
          secondImageUrl: hoverImageUrl,
          second_image_url: hoverImageUrl,
        };

  return {
    productId,
    favoriteId: s(row?.favorite_id) || s(row?.favoriteId) || s(row?.id) || null,
    id: productId,
    href:
      s(row?.href) ||
      s(product?.href) ||
      s(product?.url) ||
      s(product?.permalink) ||
      s(product?.link) ||
      "#",

    ...currencyPayload,

    brand: readBrand(product),
    title,
    subtitle:
      product?.subtitle ??
      product?.sub_title ??
      product?.metadata?.subtitle ??
      null,
    promotionTitle:
      product?.promotionTitle ??
      product?.promotion_title ??
      product?.metadata?.promotionTitle ??
      product?.metadata?.promotion_title ??
      null,

    metadata,
    imageUrl,
    image_url: product?.image_url ?? null,
    hoverImageUrl,
    hover_image_url: product?.hover_image_url ?? null,
    secondImageUrl: product?.secondImageUrl ?? hoverImageUrl,
    second_image_url: product?.second_image_url ?? hoverImageUrl,
    images: Array.isArray(product?.images) ? product.images : undefined,
    media: Array.isArray(product?.media) ? product.media : undefined,
    seo: product?.seo && typeof product.seo === "object" ? product.seo : null,
    stock: product?.stock && typeof product.stock === "object" ? product.stock : null,
    variants: readVariants(product),
    rating: readRating(product) ?? undefined,
    reviewsCount: readReviewsCount(product),

    price: prices.price,
    compareAtPrice: prices.compareAtPrice,

    pricing: product?.pricing ?? product?.product_pricing ?? null,
    product_pricing: product?.product_pricing ?? product?.pricing ?? null,

    badge: readBadge(product),
    isOutOfStock: isOutOfStockProduct(product),
    saleEnd: readSaleEnd(product),
    showSaleCountdown: readShowSaleCountdown(product),
    showDashInstead: true,
    options: readOptions(product),
  };
}

function Card({ text }: { text: string }) {
  return <div className="mk-account-emptyCard">{text}</div>;
}

export default function FavoritesScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [removingId, setRemovingId] = useState<string>("");

  const items = useMemo(() => {
    return state.kind === "ready" ? state.items : [];
  }, [state]);

  const loadFavorites = useCallback(async () => {
    try {
      setState({ kind: "loading" });

      const res = await fetch("/api/account/favorites", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }

      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json?.items) ? json.items : [];
      const nextItems = rows
        .map((row: any) => normalizeFavoriteItem(row))
        .filter(Boolean) as FavoriteCardItem[];

      if (!nextItems.length) {
        setState({ kind: "empty" });
        return;
      }

      setState({ kind: "ready", items: nextItems });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  const removeFavorite = useCallback(
    async (productId: string) => {
      const id = s(productId);
      if (!id || removingId) return;

      const previousState = state;

      try {
        setRemovingId(id);

        if (previousState.kind === "ready") {
          const nextItems = previousState.items.filter(
            (item) => item.productId !== id,
          );

          setState(
            nextItems.length
              ? { kind: "ready", items: nextItems }
              : { kind: "empty" },
          );
        }

        const res = await fetch(
          `/api/account/favorites?product_id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              product_id: id,
              productId: id,
            }),
          },
        );

        if (!res.ok) {
          setState(previousState);
          return;
        }

        window.dispatchEvent(
          new CustomEvent("product:favorites-changed", {
            detail: { product_id: id, removed: true },
          }),
        );
      } catch {
        setState(previousState);
      } finally {
        setRemovingId("");
      }
    },
    [removingId, state],
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!alive) return;
      await loadFavorites();
    }

    void run();

    return () => {
      alive = false;
    };
  }, [loadFavorites]);

  useEffect(() => {
    const refresh = () => {
      void loadFavorites();
    };

    window.addEventListener("product:favorites-changed", refresh);
    window.addEventListener("product:favorite-changed", refresh);
    window.addEventListener("favorites:changed", refresh);
    window.addEventListener("product:fav-changed", refresh);

    return () => {
      window.removeEventListener("product:favorites-changed", refresh);
      window.removeEventListener("product:favorite-changed", refresh);
      window.removeEventListener("favorites:changed", refresh);
      window.removeEventListener("product:fav-changed", refresh);
    };
  }, [loadFavorites]);

  return (
    <AccountLayout active="favorites" title="المفضلات">
      {state.kind === "loading" ? <Card text="جاري تحميل المفضلات..." /> : null}

      {state.kind === "empty" ? (
        <Card text="لا توجد منتجات مفضلة بعد" />
      ) : null}

      {state.kind === "error" ? (
        <div className="mk-account-emptyCard">
          <div>حدث خطأ أثناء تحميل المفضلات</div>

          <button
            type="button"
            className="mk-favorites-retry"
            onClick={() => void loadFavorites()}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <div className="mk-favorites">
          <div className="mk-favorites__head">
            <div className="mk-favorites__count">
              عدد المنتجات: <strong>{items.length}</strong>
            </div>

            <button
              type="button"
              className="mk-favorites__refresh"
              onClick={() => void loadFavorites()}
            >
              تحديث
            </button>
          </div>

          <div className="mk-favorites__grid">
            {items.map((item) => (
              <div key={item.productId} className="mk-favorites__item">
                <ProductCard item={item} />

                <button
                  type="button"
                  className="mk-favorites__remove"
                  disabled={removingId === item.productId}
                  onClick={() => void removeFavorite(item.productId)}
                >
                  {removingId === item.productId
                    ? "جاري الإزالة..."
                    : "إزالة من المفضلة"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .mk-favorites {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .mk-favorites__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 18px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.92);
          padding: 12px 14px;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
        }

        .mk-favorites__count {
          color: #111827;
          font-size: 13px;
          font-weight: 850;
        }

        .mk-favorites__count strong {
          font-weight: 1000;
        }

        .mk-favorites__refresh,
        .mk-favorites-retry {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: #fff;
          color: #111827;
          padding: 0 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
        }

        .mk-favorites-retry {
          margin-top: 12px;
        }

        .mk-favorites__grid {
          display: grid;
          grid-template-columns: repeat(var(--mk-products-per-row, 4), minmax(0, 1fr));
          gap: 14px;
        }

        .mk-favorites__item {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mk-favorites__item .mkpc-card,
        .mk-favorites__item .mkpc-card-inner {
          height: 100%;
        }

        .mk-favorites__remove {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          border: 1px solid rgba(220, 38, 38, 0.14);
          background: #fff1f2;
          color: #991b1b;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          transition:
            transform 160ms ease,
            opacity 160ms ease,
            background 160ms ease;
        }

        .mk-favorites__remove:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #ffe4e6;
        }

        .mk-favorites__remove:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        @media (max-width: 1023px) {
          .mk-favorites__grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 767px) {
          .mk-favorites__head {
            border-radius: 16px;
            padding: 11px 12px;
          }

          .mk-favorites__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .mk-favorites__remove {
            min-height: 34px;
            border-radius: 12px;
            font-size: 11px;
          }
        }

        @media (max-width: 420px) {
          .mk-favorites__grid {
            gap: 9px;
          }
        }
      `}</style>
    </AccountLayout>
  );
}