// FILE: apps/storefront/src/themes/malak/screens-mobile/account/FavoritesMobileScreen.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AccountMobileLayout from "./AccountMobileLayout";
import RequireMobileCustomer from "./_components/RequireMobileCustomer";

type FavoriteItem = {
  id: string;
  productId: string;
  title: string;
  href: string;
  image: string;
  priceText: string;
  meta: string;
};

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; items: FavoriteItem[] }
  | { kind: "error"; message: string };

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
  return (Array.isArray(value) ? value : [])
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

function readCurrency(product: any) {
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
      storeCurrency?.currency_code,
      storeCurrency?.code,
    ),
  ).toUpperCase();

  return (
    s(
      firstDefined(
        product?.currency_symbol,
        product?.currencySymbol,
        product?.symbol,
        product?.pricing?.currency_symbol,
        product?.pricing?.currencySymbol,
        product?.pricing?.symbol,
        storeCurrency?.symbol,
      ),
    ) ||
    code ||
    "ر.س"
  );
}

function readPrice(product: any) {
  const amount = safeNum(
    firstDefined(
      product?.price,
      product?.sale_price,
      product?.regular_price,
      product?.pricing?.price,
      product?.pricing?.sale_price,
      product?.product_pricing?.price,
      product?.metadata?.price,
    ),
  );

  if (amount === null) return "";

  return `${amount.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ${readCurrency(product)}`;
}

function normalizeFavorite(row: any): FavoriteItem | null {
  const product = getProductFromFavorite(row);
  const productId = s(
    firstDefined(product?.id, product?.product_id, row?.product_id, row?.productId),
  );

  if (!productId) return null;

  const title =
    s(product?.name_ar) ||
    s(product?.title_ar) ||
    s(product?.name) ||
    s(product?.title) ||
    "منتج من المفضلة";

  const slug = s(product?.slug || product?.handle);
  const href = slug ? `/products/${slug}` : `/products/${productId}`;

  return {
    id: s(row?.id || row?.favorite_id || productId),
    productId,
    title,
    href,
    image: getProductImage(product),
    priceText: readPrice(product),
    meta:
      s(product?.category?.name_ar) ||
      s(product?.category?.name) ||
      s(product?.brand?.name_ar) ||
      s(product?.brand?.name) ||
      "محفوظ في مفضلتك",
  };
}

export default function FavoritesMobileScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const res = await fetch("/api/account/favorites", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) throw new Error("failed");

      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.favorites)
          ? json.favorites
          : [];

      const items = rows.map(normalizeFavorite).filter(Boolean) as FavoriteItem[];
      setState(items.length ? { kind: "ready", items } : { kind: "empty" });
    } catch {
      setState({
        kind: "error",
        message: "تعذر تحميل المفضلة الآن. حاول مرة أخرى.",
      });
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const count = useMemo(
    () => (state.kind === "ready" ? state.items.length : 0),
    [state],
  );

  async function removeFavorite(productId: string) {
    if (!productId || removing) return;

    setRemoving(productId);

    try {
      const res = await fetch(
        `/api/account/favorites?product_id=${encodeURIComponent(productId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error("failed");

      setState((current) => {
        if (current.kind !== "ready") return current;
        const items = current.items.filter((item) => item.productId !== productId);
        return items.length ? { kind: "ready", items } : { kind: "empty" };
      });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <RequireMobileCustomer>
      <AccountMobileLayout active="favorites" title="المفضلة">
        <section className="mk-mfavorites">
          <div className="mk-mfavorites__hero">
            <span className="mk-mfavorites__icon">♡</span>
            <div>
              <p>منتجاتك المحفوظة</p>
              <h2>{count ? `${count} منتج في المفضلة` : "المفضلة جاهزة لاختياراتك"}</h2>
            </div>
          </div>

          {state.kind === "loading" ? (
            <div className="mk-morders-empty">
              <div className="mk-morders-empty__title">جاري تحميل المفضلة...</div>
            </div>
          ) : null}

          {state.kind === "error" ? (
            <div className="mk-morders-empty">
              <div className="mk-morders-empty__title">تعذر التحميل</div>
              <p className="mk-morders-empty__text">{state.message}</p>
              <button
                type="button"
                className="mk-mfavorites__retry"
                onClick={() => void loadFavorites()}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : null}

          {state.kind === "empty" ? (
            <div className="mk-morders-empty">
              <div className="mk-morders-empty__icon">♡</div>
              <div className="mk-morders-empty__title">لا توجد منتجات في المفضلة</div>
              <p className="mk-morders-empty__text">
                احفظ المنتجات التي تعجبك لتعود إليها بسهولة لاحقًا.
              </p>
            </div>
          ) : null}

          {state.kind === "ready" ? (
            <div className="mk-mfavorites__list">
              {state.items.map((item) => (
                <article className="mk-mfavorite-card" key={item.id || item.productId}>
                  <Link href={item.href} className="mk-mfavorite-card__image">
                    {item.image ? (
                      <img src={item.image} alt={item.title} loading="lazy" />
                    ) : (
                      <span>صورة المنتج</span>
                    )}
                  </Link>

                  <div className="mk-mfavorite-card__body">
                    <Link href={item.href} className="mk-mfavorite-card__title">
                      {item.title}
                    </Link>
                    <div className="mk-mfavorite-card__meta">{item.meta}</div>
                    {item.priceText ? (
                      <div className="mk-mfavorite-card__price">{item.priceText}</div>
                    ) : null}

                    <div className="mk-mfavorite-card__actions">
                      <Link href={item.href} className="mk-mfavorite-card__open">
                        عرض المنتج
                      </Link>
                      <button
                        type="button"
                        className="mk-mfavorite-card__remove"
                        disabled={removing === item.productId}
                        onClick={() => void removeFavorite(item.productId)}
                      >
                        {removing === item.productId ? "جاري الحذف..." : "إزالة"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </AccountMobileLayout>
    </RequireMobileCustomer>
  );
}
