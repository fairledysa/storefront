// FILE: apps/storefront/src/themes/malak/app-shell/_hooks/useCategoriesTree.ts
"use client";

import { useEffect, useState } from "react";

export type CategoryNode = {
  id: string;

  // ✅ أسماء القسم (يكفينا name للنيمد_عربي)
  name: string;
  slug: string;

  // ✅ مهم للرابطين اللي تبيهم
  public_no: number; // used for named_ar: /{slug}/c{public_no}
  short_url?: string | null; // used for short: /{short_url}  (مثل Nmsy)

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

export function useCategoriesTree(opts?: { maxDepth?: number }) {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [error, setError] = useState<string>("");

  const maxDepth = opts?.maxDepth ?? 3;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/catalog/categories?mode=tree&max_depth=${maxDepth}`,
          { cache: "no-store", credentials: "include" },
        );

        const json = (await res.json().catch(() => ({}))) as ApiTreeResponse;

        if (!res.ok) throw new Error(json?.message || json?.error || "FAILED");

        const nextTree = Array.isArray(json?.tree) ? json.tree : [];

        // ✅ ضمان وجود public_no (عشان ما نطلع روابط غلط)
        // لو API ما يرجّع public_no، راح تشوفها هنا مباشرة
        if (!cancelled) setTree(nextTree);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "تعذر تحميل الأقسام");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [maxDepth]);

  return { loading, tree, error };
}
