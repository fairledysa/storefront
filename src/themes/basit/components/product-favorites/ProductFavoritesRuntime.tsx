// FILE: apps/storefront/src/themes/basit/components/product-favorites/ProductFavoritesRuntime.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductCardItem } from "@/themes/basit/components/product-card/ProductCard";

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

type FavoritesCache = {
  ids: string[];
  expiresAt: number;
};

const API_URL = "/api/account/favorites";

const FAVORITES_CACHE_TTL = 60_000;
const FAVORITES_ERROR_CACHE_TTL = 10_000;
const FAVORITES_IDLE_TIMEOUT = 1800;
const FAVORITES_FALLBACK_DELAY = 700;
const MUTATION_PAINT_DELAY = 90;

let favoritesCache: FavoritesCache | null = null;
let favoritesPending: Promise<string[]> | null = null;

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
    return Array.from(new Set(direct.map((id) => s(id)).filter(Boolean)));
  }

  if (Array.isArray(payload?.items)) {
    return Array.from(
      new Set(payload.items.map((item) => readProductId(item)).filter(Boolean)),
    );
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

function getCachedFavoriteIds() {
  if (!favoritesCache) return null;

  if (favoritesCache.expiresAt <= Date.now()) {
    favoritesCache = null;
    return null;
  }

  return favoritesCache.ids;
}

function setCachedFavoriteIds(ids: string[], ttl = FAVORITES_CACHE_TTL) {
  favoritesCache = {
    ids: Array.from(new Set(ids.map((id) => s(id)).filter(Boolean))),
    expiresAt: Date.now() + ttl,
  };
}

function clearFavoritesCache() {
  favoritesCache = null;
  favoritesPending = null;
}

function scheduleIdleTask(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const w = window as any;

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(callback, {
      timeout: FAVORITES_IDLE_TIMEOUT,
    });

    return () => {
      if (typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(id);
      }
    };
  }

  const id = window.setTimeout(callback, FAVORITES_FALLBACK_DELAY);

  return () => {
    window.clearTimeout(id);
  };
}

async function loadFavoriteIds(force = false) {
  if (!force) {
    const cached = getCachedFavoriteIds();
    if (cached) return cached;
  }

  if (favoritesPending) return favoritesPending;

  favoritesPending = fetch(API_URL, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })
    .then(async (response) => {
      const json = await readJsonResponse(response);
      const ids = readProductIds(json);

      setCachedFavoriteIds(ids);

      return ids;
    })
    .catch(() => {
      setCachedFavoriteIds([], FAVORITES_ERROR_CACHE_TTL);
      return [];
    })
    .finally(() => {
      favoritesPending = null;
    });

  return favoritesPending;
}

function hasFavoriteDomTargets() {
  if (typeof document === "undefined") return false;

  return Boolean(
    document.querySelector(
      "[data-mk-product-card-id], [data-mk-favorite-button], .mkpc-action--fav",
    ),
  );
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}

function readButtonProductId(button: HTMLElement) {
  return (
    s(button.getAttribute("data-mk-favorite-product-id")) ||
    s(button.getAttribute("data-mk-product-id")) ||
    s(button.getAttribute("data-product-id")) ||
    s(button.closest("[data-mk-product-card-id]")?.getAttribute("data-mk-product-card-id"))
  );
}

function paintFavoriteButton(args: {
  button: HTMLButtonElement;
  productId: string;
  isFavorite: boolean;
  isPending: boolean;
}) {
  const { button, isFavorite, isPending } = args;

  button.classList.toggle("is-favorite", isFavorite);
  button.classList.toggle("is-loading", isPending);
  button.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  button.setAttribute(
    "aria-label",
    isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة",
  );
}

export default function ProductFavoritesRuntime() {
  const favoritesRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const loadedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const mutationTimerRef = useRef<number | null>(null);

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

        card
          .querySelectorAll<HTMLButtonElement>(
            "[data-mk-favorite-button], .mkpc-action--fav",
          )
          .forEach((button) => {
            paintFavoriteButton({
              button,
              productId,
              isFavorite,
              isPending,
            });
          });
      });

    document
      .querySelectorAll<HTMLButtonElement>(
        "[data-mk-favorite-button][data-mk-favorite-product-id], [data-mk-favorite-button][data-mk-product-id], .mkpc-action--fav[data-mk-favorite-product-id], .mkpc-action--fav[data-mk-product-id]",
      )
      .forEach((button) => {
        const productId = readButtonProductId(button);
        if (!productId) return;

        paintFavoriteButton({
          button,
          productId,
          isFavorite: favoriteIds.has(productId),
          isPending: pendingIds.has(productId),
        });
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
    (next: Set<string>, options?: { emitLoaded?: boolean; cache?: boolean }) => {
      favoritesRef.current = next;

      if (options?.cache !== false) {
        setCachedFavoriteIds(Array.from(next));
      }

      forceRender((value) => value + 1);
      schedulePaint();

      if (options?.emitLoaded !== false) {
        window.dispatchEvent(
          new CustomEvent("product:favorites:loaded", {
            detail: {
              productIds: Array.from(next),
              product_ids: Array.from(next),
            },
          }),
        );
      }
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

      window.dispatchEvent(new CustomEvent("product:fav-changed", { detail }));
    },
    [],
  );

  const ensureLoaded = useCallback(
    async (force = false) => {
      if (!force && loadedRef.current) {
        schedulePaint();
        return;
      }

      const cached = force ? null : getCachedFavoriteIds();

      if (cached) {
        loadedRef.current = true;
        commitFavorites(new Set(cached), {
          emitLoaded: true,
          cache: false,
        });
        return;
      }

      if (!force && !hasFavoriteDomTargets()) {
        schedulePaint();
        return;
      }

      const ids = await loadFavoriteIds(force);

      loadedRef.current = true;

      commitFavorites(new Set(ids), {
        emitLoaded: true,
        cache: false,
      });
    },
    [commitFavorites, schedulePaint],
  );

  useEffect(() => {
    const cached = getCachedFavoriteIds();

    if (cached) {
      loadedRef.current = true;
      commitFavorites(new Set(cached), {
        emitLoaded: true,
        cache: false,
      });
      return;
    }

    let alive = true;

    const cancelIdle = scheduleIdleTask(() => {
      if (!alive) return;
      void ensureLoaded(false);
    });

    return () => {
      alive = false;
      cancelIdle();
    };
  }, [commitFavorites, ensureLoaded]);

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
      loadedRef.current = true;

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

    const onAuthChanged = () => {
      clearFavoritesCache();
      loadedRef.current = false;
      commitFavorites(new Set(), {
        emitLoaded: false,
        cache: false,
      });
      void ensureLoaded(true);
    };

    const onFavoritesReload = () => {
      clearFavoritesCache();
      loadedRef.current = false;
      void ensureLoaded(true);
    };

    window.addEventListener("product:fav", onFavorite);
    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("favorites:reload", onFavoritesReload);
    window.addEventListener("product:favorites:reload", onFavoritesReload);

    return () => {
      window.removeEventListener("product:fav", onFavorite);
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("favorites:reload", onFavoritesReload);
      window.removeEventListener("product:favorites:reload", onFavoritesReload);
    };
  }, [commitFavorites, emitChanged, ensureLoaded, schedulePaint]);

  useEffect(() => {
    schedulePaint();

    const observer = new MutationObserver(() => {
      if (mutationTimerRef.current) {
        window.clearTimeout(mutationTimerRef.current);
      }

      mutationTimerRef.current = window.setTimeout(() => {
        mutationTimerRef.current = null;
        schedulePaint();

        if (!loadedRef.current && hasFavoriteDomTargets()) {
          void ensureLoaded(false);
        }
      }, MUTATION_PAINT_DELAY);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (mutationTimerRef.current) {
        window.clearTimeout(mutationTimerRef.current);
        mutationTimerRef.current = null;
      }

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [ensureLoaded, schedulePaint]);

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