// FILE: apps/storefront/src/data/pages/store-page.loader.ts

import "server-only";

import { supabaseAdmin } from "@/data/store/supabase.server";

export type StorePageRow = {
  id: string;
  store_id: string;
  title: string;
  page_type: string;
  content: string;
  show_in_footer: boolean;
  is_active: boolean;
  seo_title: string | null;
  seo_slug: string | null;
  seo_description: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type FooterStorePageLink = {
  id: string;
  title: string;
  slug: string;
  href: string;
  sort_order: number;
};

const PAGE_SELECT = [
  "id",
  "store_id",
  "title",
  "page_type",
  "content",
  "show_in_footer",
  "is_active",
  "seo_title",
  "seo_slug",
  "seo_description",
  "sort_order",
  "created_at",
  "updated_at",
].join(",");

function s(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeStorePageSlug(value: unknown) {
  const raw = s(value);

  if (!raw) return "";

  return raw
    .toLowerCase()
    .replace(/^\s+|\s+$/g, "")
    .replace(/^\/+/, "")
    .replace(/^pages\/+/i, "")
    .replace(/^p\/+/i, "")
    .replace(/[\\?#%]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildStorePageHref(slug: unknown) {
  const cleanSlug = normalizeStorePageSlug(slug);
  if (!cleanSlug) return "";
  return `/p/${cleanSlug}`;
}

export function mapStorePage(row: any): StorePageRow {
  return {
    id: String(row?.id ?? ""),
    store_id: String(row?.store_id ?? ""),
    title: String(row?.title ?? ""),
    page_type: String(row?.page_type ?? "general"),
    content: String(row?.content ?? ""),
    show_in_footer: row?.show_in_footer !== false,
    is_active: row?.is_active !== false,
    seo_title: row?.seo_title ?? null,
    seo_slug: row?.seo_slug ?? null,
    seo_description: row?.seo_description ?? null,
    sort_order: Number(row?.sort_order ?? 0),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function mapFooterPage(row: any): FooterStorePageLink | null {
  const id = s(row?.id);
  const title = s(row?.title);

  const slug =
    normalizeStorePageSlug(row?.seo_slug) ||
    normalizeStorePageSlug(row?.title) ||
    id;

  const href = buildStorePageHref(slug);

  if (!id || !title || !slug || !href) return null;

  return {
    id,
    title,
    slug,
    href,
    sort_order: Number(row?.sort_order ?? 0),
  };
}

export async function loadFooterStorePages(
  storeId: string,
): Promise<FooterStorePageLink[]> {
  const store_id = s(storeId);
  if (!store_id) return [];

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_pages")
    .select("id,title,seo_slug,sort_order,created_at")
    .eq("store_id", store_id)
    .eq("is_active", true)
    .eq("show_in_footer", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map((row: any) => mapFooterPage(row))
    .filter(Boolean) as FooterStorePageLink[];
}

export async function loadStorePageBySlug(args: {
  storeId: string;
  slug: string;
}) {
  const storeId = s(args.storeId);
  const slug = normalizeStorePageSlug(args.slug);

  if (!storeId || !slug) return null;

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_pages")
    .select(PAGE_SELECT)
    .eq("store_id", storeId)
    .eq("seo_slug", slug)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return mapStorePage(data);
}