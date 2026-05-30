// FILE: apps/storefront/src/theme-engine/layouts/load-page-layout.ts

import { cache } from "react";

import { getStoreDb } from "@/data/db/store-db.server";
import { defaultHomeLayout } from "@/theme-engine/layouts/defaults";

export type LayoutSection = {
  id: string;
  type: string;
  enabled?: boolean;
  sort?: number;
  props?: Record<string, any>;
  style?: Record<string, any>;
};

export type PageLayout = {
  sections: LayoutSection[];
};

type StorePageLayoutRow = {
  layout: any[] | null;
  status: string;
  updated_at: string;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSections(input: any): LayoutSection[] {
  const arr = Array.isArray(input) ? input : [];

  return arr
    .map((x: any, idx: number) => ({
      id: String(x?.id || `sec_${idx + 1}`),
      type: String(x?.type || ""),
      enabled: x?.enabled !== false,
      sort: Number.isFinite(x?.sort) ? Number(x.sort) : idx,
      props: x?.props && typeof x.props === "object" ? x.props : {},
      style: x?.style && typeof x.style === "object" ? x.style : {},
    }))
    .filter((section) => Boolean(section.type));
}

async function fetchLayoutRow(
  store_id: string,
  page_key: string,
  status: "draft" | "published",
) {
  const storeId = s(store_id);
  const pageKey = s(page_key);

  if (!storeId || !pageKey) return null;

  const sb = (await getStoreDb(storeId)) as any;

  const r = await sb
    .from("store_page_layouts")
    .select("layout,status,updated_at")
    .eq("store_id", storeId)
    .eq("page_key", pageKey)
    .eq("status", status)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return r.data as StorePageLayoutRow | null;
}

export const loadPageLayout = cache(
  async ({
    store_id,
    page_key,
    preview,
  }: {
    store_id: string;
    page_key: string;
    preview: boolean;
  }): Promise<PageLayout> => {
    const storeId = s(store_id);
    const pageKey = s(page_key) || "home";

    if (!storeId) {
      return { sections: pageKey === "home" ? defaultHomeLayout() : [] };
    }

    const row =
      (preview ? await fetchLayoutRow(storeId, pageKey, "draft") : null) ??
      (await fetchLayoutRow(storeId, pageKey, "published"));

    if (!row?.layout) {
      return { sections: pageKey === "home" ? defaultHomeLayout() : [] };
    }

    return { sections: normalizeSections(row.layout) };
  },
);