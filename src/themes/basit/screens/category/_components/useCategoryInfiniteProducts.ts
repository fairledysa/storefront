// FILE: apps/storefront/src/themes/basit/screens/category/_components/useCategoryInfiniteProducts.ts
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

export type CategoryProductsPageInfo = {
  hasNextPage?: boolean;
  nextOffset?: number | null;
  pageSize?: number;
};

type InfiniteState = {
  requestKey: string;
  items: any[];
  hasNextPage: boolean;
  nextOffset: number;
  loading: boolean;
  error: string;
};

type Args = {
  categoryId: string;
  initialItems: any[];
  pageInfo?: CategoryProductsPageInfo | null;
  searchParamsText?: string;
  requestKey: string;
  enabled?: boolean;
};

const PAGE_SIZE = 24;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function productId(product: any) {
  return s(product?.id ?? product?.product_id ?? product?.productId);
}

function dedupeProducts(items: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];

  for (const item of Array.isArray(items) ? items : []) {
    const id = productId(item);
    const key = id || `fallback:${out.length}`;

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}

function makeInitialState(args: Args): InfiniteState {
  const items = dedupeProducts(args.initialItems);
  const declaredOffset = Number(args.pageInfo?.nextOffset);
  const nextOffset = Number.isFinite(declaredOffset)
    ? Math.max(0, Math.floor(declaredOffset))
    : items.length;

  return {
    requestKey: args.requestKey,
    items,
    hasNextPage: Boolean(args.enabled !== false && args.pageInfo?.hasNextPage),
    nextOffset,
    loading: false,
    error: "",
  };
}

function messageFromError(_value: unknown) {
  return "تعذر تحميل المزيد، اسحب للأسفل للمحاولة مرة أخرى.";
}

export function useCategoryInfiniteProducts(args: Args): {
  products: any[];
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadError: string;
  sentinelRef: RefObject<HTMLDivElement | null>;
} {
  const initialItemsKey = useMemo(
    () =>
      (Array.isArray(args.initialItems) ? args.initialItems : [])
        .map((item) => productId(item))
        .join(","),
    [args.initialItems],
  );

  const initialState = useMemo(
    () => makeInitialState(args),
    [
      args.categoryId,
      args.enabled,
      args.pageInfo?.hasNextPage,
      args.pageInfo?.nextOffset,
      args.requestKey,
      args.searchParamsText,
      initialItemsKey,
    ],
  );

  const [storedState, setStoredState] = useState<InfiniteState>(() => initialState);
  const current =
    storedState.requestKey === args.requestKey ? storedState : initialState;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const activeRequestKeyRef = useRef(args.requestKey);
  const failedUntilExitRef = useRef<string>("");

  activeRequestKeyRef.current = args.requestKey;

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    failedUntilExitRef.current = "";
  }, [args.requestKey]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (
      args.enabled === false ||
      !args.categoryId ||
      !current.hasNextPage ||
      current.loading ||
      controllerRef.current
    ) {
      return;
    }

    const requestKey = args.requestKey;
    const offset = current.nextOffset;
    const baseState = current;
    const controller = new AbortController();

    controllerRef.current = controller;

    setStoredState((previous) => {
      const base =
        previous.requestKey === requestKey ? previous : baseState;

      if (!base.hasNextPage || base.loading) return base;

      return {
        ...base,
        loading: true,
        error: "",
      };
    });

    try {
      const params = new URLSearchParams(args.searchParamsText || "");
      params.set("scope_category_id", args.categoryId);
      params.set("offset", String(offset));
      params.set("limit", String(PAGE_SIZE));

      const response = await fetch(
        `/api/catalog/category-products?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(s(payload?.error) || "LOAD_MORE_FAILED");
      }

      if (activeRequestKeyRef.current !== requestKey) return;

      const pageItems = Array.isArray(payload?.items) ? payload.items : [];
      const pageInfo = payload?.pageInfo ?? {};
      const declaredNextOffset = Number(pageInfo?.nextOffset);

      setStoredState((previous) => {
        const base =
          previous.requestKey === requestKey ? previous : baseState;
        const items = dedupeProducts([...base.items, ...pageItems]);
        const nextOffset = Number.isFinite(declaredNextOffset)
          ? Math.max(0, Math.floor(declaredNextOffset))
          : Math.max(base.nextOffset + pageItems.length, items.length);

        return {
          requestKey,
          items,
          hasNextPage: Boolean(pageInfo?.hasNextPage),
          nextOffset,
          loading: false,
          error: "",
        };
      });

      failedUntilExitRef.current = "";
    } catch (error) {
      if ((error as any)?.name === "AbortError") return;
      if (activeRequestKeyRef.current !== requestKey) return;

      failedUntilExitRef.current = requestKey;

      setStoredState((previous) => {
        const base =
          previous.requestKey === requestKey ? previous : baseState;

        return {
          ...base,
          loading: false,
          error: messageFromError(error),
        };
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [
    args.categoryId,
    args.enabled,
    args.requestKey,
    args.searchParamsText,
    current,
  ]);

  useEffect(() => {
    const target = sentinelRef.current;

    if (
      !target ||
      args.enabled === false ||
      !current.hasNextPage ||
      current.loading ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (!entry.isIntersecting) {
          if (failedUntilExitRef.current === args.requestKey) {
            failedUntilExitRef.current = "";
          }
          return;
        }

        if (failedUntilExitRef.current === args.requestKey) return;

        void loadMore();
      },
      {
        root: null,
        rootMargin: "600px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [
    args.enabled,
    args.requestKey,
    current.hasNextPage,
    current.loading,
    loadMore,
  ]);

  return {
    products: current.items,
    hasNextPage: current.hasNextPage,
    isLoadingMore: current.loading,
    loadError: current.error,
    sentinelRef,
  };
}
