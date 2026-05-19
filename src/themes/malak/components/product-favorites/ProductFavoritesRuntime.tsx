// FILE: apps/storefront/src/themes/malak/components/product-favorites/ProductFavoritesRuntime.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductCardItem } from "@/themes/malak/components/product-card/ProductCard";

type FavoriteItem = ProductCardItem & {
  product_id?: string | null;
  productId?: string | null;
  [key: string]: any;
};

type FavoritesResponse = {
  ok?: boolean;
  favorited?: boolean;
  is_favorite?: boolean;
  isFavorite?: boolean;
  ids?: string[];
  product_ids?: string[];
  productIds?: string[];
  items?: Array<{
    id?: string;
    product_id?: string;
    productId?: string;
    product?: {
      id?: string;
    };
  }>;
  product_id?: string;
  productId?: string;
  error?: string;
};

const API_URL = "/api/account/favorites";

function s(value: any) {
  return String(value ?? "").trim();
}

function readProductId(value: any) {
  return (
    s(value?.product_id) ||
    s(value?.productId) ||
    s(value?.product?.id) ||
    s(value?.id) ||
    ""
  );
}

function readProductIds(payload: FavoritesResponse) {
  const direct = Array.isArray(payload?.product_ids)
    ? payload.product_ids
    : Array.isArray(payload?.productIds)
      ? payload.productIds
      : Array.isArray(payload?.ids)
        ? payload.ids
        : null;

  if (direct) {
    return direct.map((id) => s(id)).filter(Boolean);
  }

  if (Array.isArray(payload?.items)) {
    return payload.items.map((item) => readProductId(item)).filter(Boolean);
  }

  return [];
}

function readConfirmedFavorite(payload: FavoritesResponse, fallback: boolean) {
  if (typeof payload?.favorited === "boolean") return payload.favorited;
  if (typeof payload?.is_favorite === "boolean") return payload.is_favorite;
  if (typeof payload?.isFavorite === "boolean") return payload.isFavorite;

  return fallback;
}

async function readJsonResponse(response: Response) {
  const json = (await response.json().catch(() => ({}))) as FavoritesResponse;

  if (!response.ok || json?.ok === false) {
    throw new Error(json?.error || "favorites_request_failed");
  }

  return json;
}

export default function ProductFavoritesRuntime() {
  const favoritesRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  const [, forceRender] = useState(0);

  const paintDom = useCallback(() => {
    const favoriteIds = favoritesRef.current;
    const pendingIds = pendingRef.current;

    document
      .querySelectorAll<HTMLElement>("[data-mk-product-card-id]")
      .forEach((card) => {
        const productId = s(card.getAttribute("data-mk-product-card-id"));
        if (!productId) return;

        const isFavorite = favoriteIds.has(productId);
        const isPending = pendingIds.has(productId);

        card.classList.toggle("is-favorite", isFavorite);
        card.setAttribute("data-mk-favorite", isFavorite ? "true" : "false");

        const button = card.querySelector<HTMLButtonElement>(
          "[data-mk-favorite-button], .mkpc-action--fav",
        );

        if (!button) return;

        button.classList.toggle("is-favorite", isFavorite);
        button.classList.toggle("is-loading", isPending);
        button.setAttribute("aria-pressed", isFavorite ? "true" : "false");
        button.setAttribute(
          "aria-label",
          isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة",
        );
      });
  }, []);

  const schedulePaint = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      paintDom();
    });
  }, [paintDom]);

  const commitFavorites = useCallback(
    (next: Set<string>) => {
      favoritesRef.current = next;
      forceRender((value) => value + 1);
      schedulePaint();

      window.dispatchEvent(
        new CustomEvent("product:favorites:loaded", {
          detail: {
            productIds: Array.from(next),
            product_ids: Array.from(next),
          },
        }),
      );
    },
    [schedulePaint],
  );

  const emitChanged = useCallback(
    (detail: {
      productId: string;
      product_id: string;
      isFavorite: boolean;
      is_favorite: boolean;
      item?: FavoriteItem;
    }) => {
      window.dispatchEvent(
        new CustomEvent("product:favorites:changed", { detail }),
      );

      window.dispatchEvent(
        new CustomEvent("product:favorites-changed", { detail }),
      );

      window.dispatchEvent(
        new CustomEvent("product:favorite-changed", { detail }),
      );

      window.dispatchEvent(new CustomEvent("favorites:changed", { detail }));

      window.dispatchEvent(
        new CustomEvent("product:fav-changed", { detail }),
      );
    },
    [],
  );

  useEffect(() => {
    let alive = true;

    async function loadFavorites() {
      try {
        const response = await fetch(API_URL, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const json = await readJsonResponse(response);
        if (!alive) return;

        commitFavorites(new Set(readProductIds(json)));
      } catch {
        if (!alive) return;
        commitFavorites(new Set());
      }
    }

    void loadFavorites();

    return () => {
      alive = false;
    };
  }, [commitFavorites]);

  useEffect(() => {
    const onFavorite = async (event: Event) => {
      const detail = (event as CustomEvent<FavoriteItem>).detail;
      const productId = readProductId(detail);

      if (!productId) return;
      if (pendingRef.current.has(productId)) return;

      const wasFavorite = favoritesRef.current.has(productId);
      const optimistic = new Set(favoritesRef.current);

      if (wasFavorite) {
        optimistic.delete(productId);
      } else {
        optimistic.add(productId);
      }

      pendingRef.current.add(productId);
      commitFavorites(optimistic);

      try {
        const response = await fetch(API_URL, {
          method: wasFavorite ? "DELETE" : "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
            productId,
          }),
        });

        const json = await readJsonResponse(response);
        const confirmedFavorite = readConfirmedFavorite(json, !wasFavorite);

        const confirmed = new Set(favoritesRef.current);

        if (confirmedFavorite) {
          confirmed.add(productId);
        } else {
          confirmed.delete(productId);
        }

        commitFavorites(confirmed);

        emitChanged({
          productId,
          product_id: productId,
          isFavorite: confirmedFavorite,
          is_favorite: confirmedFavorite,
          item: detail,
        });
      } catch (error) {
        const rollback = new Set(favoritesRef.current);

        if (wasFavorite) {
          rollback.add(productId);
        } else {
          rollback.delete(productId);
        }

        commitFavorites(rollback);

        window.dispatchEvent(
          new CustomEvent("product:favorites:error", {
            detail: {
              productId,
              product_id: productId,
              item: detail,
              error,
            },
          }),
        );
      } finally {
        pendingRef.current.delete(productId);
        schedulePaint();
      }
    };

    window.addEventListener("product:fav", onFavorite);

    return () => {
      window.removeEventListener("product:fav", onFavorite);
    };
  }, [commitFavorites, emitChanged, schedulePaint]);

  useEffect(() => {
    schedulePaint();

    const observer = new MutationObserver(() => {
      schedulePaint();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [schedulePaint]);

  return (
    <style jsx global>{`
      .mkpc-card[data-mk-favorite="true"] .mkpc-action--fav,
      .mkpc-action--fav.is-favorite {
        border-color: rgba(225, 29, 72, 0.2) !important;
        background: #fff1f2 !important;
        color: #e11d48 !important;
        box-shadow: 0 12px 26px rgba(225, 29, 72, 0.16) !important;
      }

      .mkpc-action--fav.is-loading {
        pointer-events: none !important;
        opacity: 0.72 !important;
      }
    `}</style>
  );
}