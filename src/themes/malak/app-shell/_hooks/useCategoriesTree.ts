// FILE: apps/storefront/src/themes/malak/app-shell/_hooks/useCategoriesTree.ts
"use client";

import { useEffect, useMemo, useState } from "react";

export type CategoryNode = {
  id: string;

  name: string;
  slug: string;

  public_no: number;
  short_url?: string | null;

  parent_id: string | null;
  sort_order: number;
  depth: number;
  path: string;

  image?: { url: string; alt?: string | null } | null;
  children: CategoryNode[];
};

type ApiTreeResponse = {
  tree?: CategoryNode[];
  error?: string;
  message?: string;
};

type CacheEntry = {
  version: 1;
  maxDepth: number;
  cachedAt: number;
  tree: CategoryNode[];
};

type CacheSnapshot = {
  hasCache: boolean;
  tree: CategoryNode[];
};

const CACHE_VERSION = 1;
const STORAGE_PREFIX = "mk:categories-tree:v1:";
const memoryCache = new Map<string, CacheEntry>();

function cacheKey(maxDepth: number) {
  return `${STORAGE_PREFIX}${maxDepth}`;
}

function normalizeMaxDepth(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(8, Math.floor(n)) : 3;
}

function normalizeTree(value: unknown): CategoryNode[] {
  return Array.isArray(value) ? (value as CategoryNode[]) : [];
}

function readCategoriesCache(maxDepth: number): CacheSnapshot {
  const key = cacheKey(maxDepth);

  const memory = memoryCache.get(key);
  if (memory?.version === CACHE_VERSION && Array.isArray(memory.tree)) {
    return {
      hasCache: true,
      tree: memory.tree,
    };
  }

  if (typeof window === "undefined") {
    return {
      hasCache: false,
      tree: [],
    };
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return {
        hasCache: false,
        tree: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<CacheEntry>;

    if (
      parsed?.version !== CACHE_VERSION ||
      Number(parsed?.maxDepth) !== maxDepth ||
      !Array.isArray(parsed?.tree)
    ) {
      window.sessionStorage.removeItem(key);

      return {
        hasCache: false,
        tree: [],
      };
    }

    const entry: CacheEntry = {
      version: CACHE_VERSION,
      maxDepth,
      cachedAt: Number(parsed.cachedAt || Date.now()),
      tree: normalizeTree(parsed.tree),
    };

    memoryCache.set(key, entry);

    return {
      hasCache: true,
      tree: entry.tree,
    };
  } catch {
    return {
      hasCache: false,
      tree: [],
    };
  }
}

function writeCategoriesCache(maxDepth: number, tree: CategoryNode[]) {
  const key = cacheKey(maxDepth);

  const entry: CacheEntry = {
    version: CACHE_VERSION,
    maxDepth,
    cachedAt: Date.now(),
    tree: normalizeTree(tree),
  };

  memoryCache.set(key, entry);

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}

export function useCategoriesTree(opts?: { maxDepth?: number }) {
  const maxDepth = useMemo(
    () => normalizeMaxDepth(opts?.maxDepth ?? 3),
    [opts?.maxDepth],
  );

  const initialSnapshot = useMemo(() => readCategoriesCache(maxDepth), [maxDepth]);

  const [loading, setLoading] = useState(!initialSnapshot.hasCache);
  const [tree, setTree] = useState<CategoryNode[]>(initialSnapshot.tree);
  const [error, setError] = useState<string>("");
  const [revalidating, setRevalidating] = useState(initialSnapshot.hasCache);

  useEffect(() => {
    let cancelled = false;

    const cached = readCategoriesCache(maxDepth);

    const cachedTimer = window.setTimeout(() => {
      if (cancelled) return;

      if (cached.hasCache) {
        setTree(cached.tree);
        setLoading(false);
        setError("");
        setRevalidating(true);
        return;
      }

      setLoading(true);
      setError("");
      setRevalidating(false);
    }, 0);

    const controller = new AbortController();

    async function loadTree() {
      try {
        const res = await fetch(
          `/api/catalog/categories?mode=tree&max_depth=${maxDepth}`,
          {
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          },
        );

        const json = (await res.json().catch(() => ({}))) as ApiTreeResponse;

        if (!res.ok) {
          throw new Error(json?.message || json?.error || "FAILED");
        }

        const nextTree = normalizeTree(json?.tree);

        writeCategoriesCache(maxDepth, nextTree);

        if (cancelled) return;

        setTree(nextTree);
        setError("");
        setLoading(false);
        setRevalidating(false);
      } catch (e: any) {
        if (cancelled || e?.name === "AbortError") return;

        if (cached.hasCache) {
          setTree(cached.tree);
          setError("");
          setLoading(false);
          setRevalidating(false);
          return;
        }

        setTree([]);
        setError(e?.message || "تعذر تحميل الأقسام");
        setLoading(false);
        setRevalidating(false);
      }
    }

    void loadTree();

    return () => {
      cancelled = true;
      window.clearTimeout(cachedTimer);
      controller.abort();
    };
  }, [maxDepth]);

  return {
    loading,
    tree,
    error,
    revalidating,
  };
}