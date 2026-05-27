// FILE: apps/storefront/src/app/(store)/[...slug]/page.tsx

import type { Metadata } from "next";
import { cache, type ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  toProductDetailVM,
  type ProductDetailVM,
} from "@/data/viewmodels/product.vm";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { supabaseAdmin } from "@/data/store/supabase.server";

import { fromBase62 } from "@/lib/seo/base62";
import {
  buildCategoryHref,
  buildProductHref,
} from "@/lib/seo/build-store-href";
import { parseSlug } from "./_routing/parse-slug";
import {
  buildKeywords,
  getRequestOriginSafe,
  safeText,
} from "./_routing/seo-helpers";

import { loadHomePage } from "@/data/pages/home.loader";
import {
  loadCategoryPageByPublicNo,
  loadCategoryPageByShortCode,
} from "@/data/pages/category.loader";
import { loadCategoryFiltersForPage } from "@/data/pages/category-filters.loader";

import {
  loadProductPageByPublicNo,
  loadProductPageByShortCode,
} from "@/data/pages/product.loader";
import { loadTagPageBySlug } from "@/data/pages/tag.loader";
import { getStoreMaintenanceSettings } from "@/data/store/maintenance";
import { renderMalakMaintenancePage } from "@/themes/malak/screens/maintenance/render-maintenance-page";


import { renderHomePage } from "@/theme-engine/runtime/pages/render-home";
import { renderCategoryPage } from "@/theme-engine/runtime/pages/render-category";
import { renderProductPage } from "@/theme-engine/runtime/pages/render-product";
import { renderCartPage } from "@/theme-engine/runtime/pages/render-cart";

import MalakTheme from "@/themes/malak";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";

import CategoryScreen from "@/themes/malak/screens/category/CategoryScreen";
import CategoryMobileScreen from "@/themes/malak/screens-mobile/category/CategoryMobileScreen";
import ProductScreen from "@/themes/malak/screens/product/ProductScreen";
import ProductMobileScreen from "@/themes/malak/screens-mobile/product/ProductMobileScreen";
import PageScreen from "@/themes/malak/screens/page/PageScreen";
import TagScreen from "@/themes/malak/screens/tag/TagScreen";

import { getSeoUrlMode } from "@/data/store/settings";

type SP = Record<string, string | string[] | undefined>;

type PageParams = {
  slug?: string[];
};

type PageProps = {
  params?: PageParams | Promise<PageParams>;
  searchParams?: Promise<SP>;
};

type StorePageRow = {
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
/* -------------------------
   Request-level cached helpers
   الهدف: تقليل التكرار بين generateMetadata و Page
   ------------------------- */

const getRequestOriginSafeCached = cache(async () => {
  return await getRequestOriginSafe();
});

const getSeoUrlModeCached = cache(async (storeId: string) => {
  return await getSeoUrlMode(storeId);
});

const loadInfoPageBySlugCached = cache(
  async (storeId: string, slug: string) => {
    return await loadInfoPageBySlug({
      storeId,
      slug,
    });
  },
);

const loadTagPageBySlugCached = cache(
  async (storeId: string, slug: string, limit: number) => {
    return await loadTagPageBySlug({
      store_id: storeId,
      slug,
      limit,
    });
  },
);

const loadCategoryPageByPublicNoCached = cache(
  async (storeId: string, publicNo: number) => {
    return await loadCategoryPageByPublicNo({
      store_id: storeId,
      publicNo,
    });
  },
);

const loadCategoryByShortOrBase62Cached = cache(
  async (storeId: string, code: string) => {
    return await loadCategoryByShortOrBase62({
      storeId,
      code,
    });
  },
);
const loadCategoryFiltersForPageCached = cache(
  async (storeId: string, categoryId: string, searchParams?: SP) => {
    return await loadCategoryFiltersForPage({
      store_id: storeId,
      category_id: categoryId,
      searchParams,
      limit: 60,
    });
  },
);

const loadProductPageByPublicNoCached = cache(
  async (storeId: string, publicNo: number) => {
    return await loadProductPageByPublicNo({
      store_id: storeId,
      publicNo,
    });
  },
);

const loadProductByShortOrBase62Cached = cache(
  async (storeId: string, code: string) => {
    return await loadProductByShortOrBase62({
      storeId,
      code,
    });
  },
);

const loadHomePageCached = cache(
  async (
    storeId: string,
    limit: number,
    themeOptions: Record<string, any>,
  ) => {
    return await loadHomePage({
      store_id: storeId,
      limit,
      themeOptions,
    });
  },
);

const loadStoreReviewsCached = cache(async (storeId: string) => {
  return await loadStoreReviews(storeId);
});
function s(value: unknown) {
  return String(value ?? "").trim();
}

function isLangPrefix(v: string) {
  return v === "ar" || v === "en";
}

function isDigits(x: string) {
  return /^[0-9]+$/.test(x);
}

function isInfoPagePrefix(v: string) {
  return v === "p" || v === "pages";
}

function normalizeStorePageSlug(value: unknown) {
  let raw = s(value);

  if (!raw) return "";

  try {
    raw = decodeURIComponent(raw);
  } catch {}

  return raw
    .toLowerCase()
    .replace(/^\s+|\s+$/g, "")
    .replace(/^\/+/, "")
    .replace(/^p\/+/i, "")
    .replace(/^pages\/+/i, "")
    .replace(/[\\?#%]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapStorePage(row: any): StorePageRow {
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

async function loadInfoPageBySlug(args: {
  storeId: string;
  slug: string;
}): Promise<StorePageRow | null> {
  const storeId = s(args.storeId);
  const incomingSlug = normalizeStorePageSlug(args.slug);

  if (!storeId || !incomingSlug) return null;

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_pages")
    .select(PAGE_SELECT)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    console.error("STORE_PAGE_LOAD_FAILED", {
      storeId,
      incomingSlug,
      error,
    });

    return null;
  }

  const found = data.find((row: any) => {
    const seoSlug = normalizeStorePageSlug(row?.seo_slug);
    const titleSlug = normalizeStorePageSlug(row?.title);
    const idSlug = normalizeStorePageSlug(row?.id);

    return (
      seoSlug === incomingSlug ||
      titleSlug === incomingSlug ||
      idSlug === incomingSlug
    );
  });

  if (!found?.id) {
    console.error("STORE_PAGE_NOT_FOUND_DEBUG", {
      storeId,
      incomingSlug,
      available: data.map((row: any) => ({
        id: row?.id,
        title: row?.title,
        seo_slug: row?.seo_slug,
        normalized_seo_slug: normalizeStorePageSlug(row?.seo_slug),
        normalized_title: normalizeStorePageSlug(row?.title),
        is_active: row?.is_active,
      })),
    });

    return null;
  }

  return mapStorePage(found);
}

function matchRoute(slug: string[], parts: string[]) {
  if (slug.length === parts.length) {
    return parts.every((part, i) => slug[i] === part);
  }

  if (slug.length === parts.length + 1 && isLangPrefix(String(slug[0] ?? ""))) {
    return parts.every((part, i) => slug[i + 1] === part);
  }

  return false;
}

function detectDeviceFromUA(ua: string, mobileHint?: string | null) {
  const hint = String(mobileHint ?? "").toLowerCase().trim();

  if (hint === "?1" || hint === "1" || hint === "true" || hint === "mobile") {
    return "mobile" as const;
  }

  const raw = String(ua || "").toLowerCase();

  const isMobile =
    raw.includes("iphone") ||
    raw.includes("android") ||
    raw.includes("ipad") ||
    raw.includes("ipod") ||
    raw.includes("mobile");

  return isMobile ? ("mobile" as const) : ("desktop" as const);
}

function isMalakTheme(ctx: any) {
  const themeKey =
    s(ctx?.theme?.theme_key) ||
    s(ctx?.theme?.key) ||
    s(ctx?.theme?.code) ||
    s(ctx?.theme?.theme_code);

  return themeKey === "malak";
}

async function buildMalakBootstrap(args: { ctx: any; seoMode: any }) {
  return await getMalakBootstrap({
    store: {
      id: args.ctx.store.id,
      slug: args.ctx.store.slug,
      name: args.ctx.store.name,
      logo_url: args.ctx.store.logo_url ?? null,
      favicon_url: args.ctx.store.favicon_url ?? null,
    },
    seoMode: args.seoMode,
    themeOptions: args.ctx?.theme?.options ?? null,
    version_id: args.ctx?.theme?.version_id ?? "published",
  });
}

async function buildMalakShellData(args: { ctx: any; seoMode: any }) {
  const [bootstrap, initialCartCount] = await Promise.all([
    buildMalakBootstrap({
      ctx: args.ctx,
      seoMode: args.seoMode,
    }),
    getInitialCartCount(args.ctx.store.id),
  ]);

  return {
    bootstrap,
    initialCartCount,
  };
}

function buildMalakCtx(args: {
  ctx: any;
  device: "mobile" | "desktop";
  seoMode: any;
  data: any;
  bootstrap?: any;
  initialCartCount?: number;
}) {
  return {
    ...args.ctx,
    device: args.device,
    seoMode: args.seoMode,
    data: args.data,
    bootstrap: args.bootstrap,
    initialCartCount: args.initialCartCount ?? 0,
    theme: {
      ...(args.ctx?.theme ?? {}),
      key: "malak",
      theme_key: "malak",
      version_id: args.ctx?.theme?.version_id ?? "published",
      options: args.ctx?.theme?.options ?? {},
    },
  };
}

async function renderMalakCategoryPage(args: {
  ctx: any;
  data: any;
  preview: boolean;
}) {
  const h = await headers();

  const device = detectDeviceFromUA(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );

  const seoMode = await getSeoUrlModeCached(args.ctx.store.id)

  const { bootstrap, initialCartCount } = await buildMalakShellData({
    ctx: args.ctx,
    seoMode,
  });

  const pageData = {
    ...(args.data ?? {}),
    route: args.data?.route ?? "category",
    bootstrap,
    theme: {
      bootstrap,
      options: args.ctx?.theme?.options ?? {},
      version_id: args.ctx?.theme?.version_id ?? "published",
    },
  };

  const appCtx = buildMalakCtx({
    ctx: args.ctx,
    device,
    seoMode,
    data: pageData,
    bootstrap,
    initialCartCount,
  });

  return (
    <MalakTheme ctx={appCtx as any}>
      {device === "mobile" ? (
        <CategoryMobileScreen data={pageData} mode={seoMode} />
      ) : (
        <CategoryScreen data={pageData} mode={seoMode} />
      )}
    </MalakTheme>
  );
}

async function renderMalakTagPage(args: {
  ctx: any;
  data: any;
  preview: boolean;
}) {
  const h = await headers();

  const device = detectDeviceFromUA(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );

  const seoMode = await getSeoUrlModeCached(args.ctx.store.id)

  const { bootstrap, initialCartCount } = await buildMalakShellData({
    ctx: args.ctx,
    seoMode,
  });

  const pageData = {
    ...(args.data ?? {}),
    route: "tag",
    bootstrap,
    theme: {
      bootstrap,
      options: args.ctx?.theme?.options ?? {},
      version_id: args.ctx?.theme?.version_id ?? "published",
    },
  };

  const appCtx = buildMalakCtx({
    ctx: args.ctx,
    device,
    seoMode,
    data: pageData,
    bootstrap,
    initialCartCount,
  });

  return (
    <MalakTheme ctx={appCtx as any}>
      <TagScreen data={pageData} mode={seoMode} />
    </MalakTheme>
  );
}

async function renderMalakProductPage(args: {
  ctx: any;
  data: any;
  preview: boolean;
}) {
  const h = await headers();

  const device = detectDeviceFromUA(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );

  const seoMode = await getSeoUrlModeCached(args.ctx.store.id)

  const { bootstrap, initialCartCount } = await buildMalakShellData({
    ctx: args.ctx,
    seoMode,
  });

  const dataWithMode = {
    ...(args.data ?? {}),
    mode: seoMode,
    route: "product",
    bootstrap,
    theme: {
      bootstrap,
      options: args.ctx?.theme?.options ?? {},
      version_id: args.ctx?.theme?.version_id ?? "published",
    },
  };

  const appCtx = buildMalakCtx({
    ctx: args.ctx,
    device,
    seoMode,
    data: dataWithMode,
    bootstrap,
    initialCartCount,
  });

  return (
    <MalakTheme ctx={appCtx as any}>
      {device === "mobile" ? (
        <ProductMobileScreen data={dataWithMode} />
      ) : (
        <ProductScreen data={dataWithMode} />
      )}
    </MalakTheme>
  );
}

async function renderMalakInfoPage(args: {
  ctx: any;
  page: StorePageRow;
  preview: boolean;
}) {
  const h = await headers();

  const device = detectDeviceFromUA(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );

  const seoMode = await getSeoUrlModeCached(args.ctx.store.id)

  const { bootstrap, initialCartCount } = await buildMalakShellData({
    ctx: args.ctx,
    seoMode,
  });

  const pageData = {
    ...(args.page ?? {}),
    route: "page",
    bootstrap,
    theme: {
      bootstrap,
      options: args.ctx?.theme?.options ?? {},
      version_id: args.ctx?.theme?.version_id ?? "published",
    },
  };

  const appCtx = buildMalakCtx({
    ctx: args.ctx,
    device,
    seoMode,
    data: pageData,
    bootstrap,
    initialCartCount,
  });

  return (
    <MalakTheme ctx={appCtx as any}>
      <PageScreen data={pageData} />
    </MalakTheme>
  );
}

function customerNameFromReview(review: any) {
  const customer = Array.isArray(review?.customers)
    ? review.customers[0]
    : review?.customers;

  return (
    String(review?.author_name ?? "").trim() ||
    String(customer?.full_name ?? "").trim() ||
    "عميل"
  );
}

function normalizeStoreReview(review: any) {
  return {
    id: String(review?.id ?? ""),
    name: customerNameFromReview(review),
    authorName: customerNameFromReview(review),
    role: review?.is_verified_purchase ? "عميل موثّق" : "",
    avatar: "",
    image: "",
    text: String(review?.body || review?.title || "").trim(),
    body: String(review?.body || "").trim(),
    title: String(review?.title || "").trim(),
    rating: Number(review?.rating || 5),
    createdAt: String(review?.published_at || review?.created_at || ""),
    created_at: review?.published_at || review?.created_at || null,
    isPinned: Boolean(review?.is_pinned),
    isFeatured: Boolean(review?.is_featured),
    helpfulCount: Number(review?.helpful_count || 0),
    isVerifiedPurchase: Boolean(review?.is_verified_purchase),
    isGuest: Boolean(review?.is_guest),
  };
}

async function loadStoreReviews(storeId: string) {
  const sb: any = supabaseAdmin();

  try {
    const baseSelect = `
      id,
      store_id,
      target_type,
      target_id,
      customer_id,
      order_id,
      review_type,
      rating,
      title,
      body,
      author_name,
      is_verified_purchase,
      is_guest,
      status,
      is_pinned,
      is_featured,
      helpful_count,
      sort_order,
      published_at,
      created_at,
      customers (
        id,
        full_name
      )
    `;

    const firstQuery = await sb
      .from("review_entries")
      .select(baseSelect)
      .eq("store_id", storeId)
      .eq("target_type", "store")
      .eq("target_id", storeId)
      .eq("review_type", "review")
      .eq("status", "published")
      .not("rating", "is", null)
      .order("is_pinned", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (
      !firstQuery.error &&
      Array.isArray(firstQuery.data) &&
      firstQuery.data.length
    ) {
      return firstQuery.data.map((review: any) => normalizeStoreReview(review));
    }

    const fallbackQuery = await sb
      .from("review_entries")
      .select(baseSelect)
      .eq("store_id", storeId)
      .eq("target_type", "store")
      .eq("review_type", "review")
      .eq("status", "published")
      .not("rating", "is", null)
      .order("is_pinned", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (fallbackQuery.error) {
      console.error("store reviews error", fallbackQuery.error);
      return [];
    }

    return (fallbackQuery.data ?? []).map((review: any) =>
      normalizeStoreReview(review),
    );
  } catch (error) {
    console.error("store reviews exception", error);
    return [];
  }
}

async function renderStoreRoute(args: {
  store: any;
  store_id: string;
  preview: boolean;
  route: string;
  extraData?: Record<string, any>;
}) {
  return await renderCartPage({
    store: args.store,
    store_id: args.store_id,
    preview: args.preview,
    data: {
      route: args.route,
      ...(args.extraData ?? {}),
    },
  });
}

async function loadCategoryByShortOrBase62(args: {
  storeId: string;
  code: string;
}) {
  let category = await loadCategoryPageByShortCode({
    store_id: args.storeId,
    code: args.code,
  });

  if (category) return category;

  try {
    const publicNo = fromBase62(args.code);

    if (typeof publicNo === "number" && publicNo > 0) {
      category = await loadCategoryPageByPublicNo({
        store_id: args.storeId,
        publicNo,
      });
    }
  } catch {}

  return category;
}
async function attachCatalogFiltersToCategoryData(args: {
  storeId: string;
  data: any;
  searchParams?: SP;
}) {
  const categoryId = s(args.data?.category?.id);

  if (!categoryId) return args.data;

  const catalogFilters = await loadCategoryFiltersForPageCached(
    args.storeId,
    categoryId,
    args.searchParams,
  );

  if (!catalogFilters) return args.data;

  return {
    ...(args.data ?? {}),
    catalogFilters,
  };
}
async function loadProductByShortOrBase62(args: {
  storeId: string;
  code: string;
}) {
  let product = await loadProductPageByShortCode({
    store_id: args.storeId,
    code: args.code,
  });

  if (product) return product;

  try {
    const publicNo = fromBase62(args.code);

    if (typeof publicNo === "number" && publicNo > 0) {
      product = await loadProductPageByPublicNo({
        store_id: args.storeId,
        publicNo,
      });
    }
  } catch {}

  return product;
}

function getInfoPageSlug(slug: string[]) {
  const first = String(slug[0] ?? "");
  const second = String(slug[1] ?? "");
  const third = String(slug[2] ?? "");

  if (slug.length === 2 && isInfoPagePrefix(first) && s(second)) {
    return second;
  }

  if (
    slug.length === 3 &&
    isLangPrefix(first) &&
    isInfoPagePrefix(second) &&
    s(third)
  ) {
    return third;
  }

  return "";
}

function isTagPagePrefix(v: string) {
  return v === "tag" || v === "tags";
}

function getTagPageSlug(slug: string[]) {
  const first = String(slug[0] ?? "");
  const second = String(slug[1] ?? "");
  const third = String(slug[2] ?? "");

  if (slug.length === 2 && isTagPagePrefix(first) && s(second)) {
    return second;
  }

  if (
    slug.length === 3 &&
    isLangPrefix(first) &&
    isTagPagePrefix(second) &&
    s(third)
  ) {
    return third;
  }

  return "";
}

function stripHtml(value: unknown) {
  return s(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function limitText(value: unknown, max = 160) {
  const text = safeText(stripHtml(value));
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function toPositiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function seoSlug(value: unknown, fallback: string) {
  const raw = s(value)
    .toLowerCase()
    .replace(/[ـ]+/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || fallback;
}

function absoluteUrl(origin: string, pathOrUrl?: string | null) {
  const value = s(pathOrUrl);
  if (!value) return origin;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const path = value.startsWith("/") ? value : `/${value}`;
  return `${origin.replace(/\/+$/g, "")}${path}`;
}

function pathFromSlug(slug: string[]) {
  if (!slug.length) return "/";

  return `/${slug
    .map((part) => encodeURIComponent(decodeURIComponent(String(part))))
    .join("/")}`;
}

function getStoreDescription(store: any) {
  return limitText(store?.description, 160) || s(store?.name) || "متجر إلكتروني";
}

function getStoreImage(store: any) {
  return s(store?.logo_url) || s(store?.favicon_url) || "";
}

function titleWithStore(title: string, storeName: string) {
  const cleanTitle = safeText(title);
  const cleanStore = safeText(storeName);

  if (!cleanTitle) return cleanStore || "المتجر";
  if (!cleanStore) return cleanTitle;
  if (cleanTitle === cleanStore) return cleanTitle;
  if (cleanTitle.includes(cleanStore)) return cleanTitle;

  return `${cleanTitle} | ${cleanStore}`;
}

function makeMetadata(args: {
  origin: string;
  title: string;
  description: string;
  canonicalPath: string;
  storeName: string;
  image?: string | null;
  keywords?: string;
  type?: "website" | "article";
  index?: boolean;
}): Metadata {
  const title = safeText(args.title) || args.storeName || "المتجر";
  const description = limitText(args.description, 160) || args.storeName;
  const canonical = absoluteUrl(args.origin, args.canonicalPath);
  const imageUrl = s(args.image) ? absoluteUrl(args.origin, s(args.image)) : "";
  const index = args.index !== false;

  const metadata: Metadata = {
    title,
    description,
    keywords: args.keywords,
    alternates: {
      canonical,
    },
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: args.storeName,
      type: args.type || "website",
      locale: "ar_SA",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };

  try {
    metadata.metadataBase = new URL(args.origin);
  } catch {}

  return metadata;
}

function makeNoIndexMetadata(args: {
  origin: string;
  title: string;
  description?: string;
  canonicalPath: string;
  storeName: string;
}) {
  return makeMetadata({
    origin: args.origin,
    title: titleWithStore(args.title, args.storeName),
    description: args.description || args.storeName,
    canonicalPath: args.canonicalPath,
    storeName: args.storeName,
    index: false,
  });
}

function isThankYouRoute(slug: string[]) {
  return (
    (slug.length === 2 &&
      slug[0] === "thankyou" &&
      String(slug[1] ?? "").trim() !== "") ||
    (slug.length === 3 &&
      isLangPrefix(String(slug[0] ?? "")) &&
      slug[1] === "thankyou" &&
      String(slug[2] ?? "").trim() !== "")
  );
}

function isOrderDetailsRoute(slug: string[]) {
  return (
    (slug.length === 3 &&
      slug[0] === "account" &&
      slug[1] === "orders" &&
      String(slug[2] ?? "").trim() !== "") ||
    (slug.length === 4 &&
      isLangPrefix(String(slug[0] ?? "")) &&
      slug[1] === "account" &&
      slug[2] === "orders" &&
      String(slug[3] ?? "").trim() !== "")
  );
}

function isPrivateStoreRoute(slug: string[]) {
  return (
    matchRoute(slug, ["cart"]) ||
    matchRoute(slug, ["account"]) ||
    matchRoute(slug, ["account", "wallet"]) ||
    matchRoute(slug, ["account", "orders"]) ||
    matchRoute(slug, ["account", "addresses"]) ||
    matchRoute(slug, ["account", "rewards"]) ||
    matchRoute(slug, ["account", "gift-balance"]) ||
    matchRoute(slug, ["account", "refer"]) ||
    matchRoute(slug, ["account", "tickets"]) ||
    matchRoute(slug, ["account", "favorites"]) ||
    isOrderDetailsRoute(slug) ||
    isThankYouRoute(slug)
  );
}

function getProductCanonicalPath(productData: any, seoMode: any) {
  const product = productData?.product ?? productData;

  const name =
    s(product?.metadata?.seo_slug) ||
    s(product?.seo?.seo_title) ||
    s(product?.name) ||
    "product";

  return buildProductHref({
    mode: seoMode || "named_ar",
    slugNameAr: seoSlug(name, "product"),
    slugNameEn: seoSlug(name, "product"),
    publicNo: toPositiveNumber(product?.public_no ?? product?.publicNo),
    shortCode: product?.short_url ?? product?.shortUrl ?? null,
  });
}

function getCategoryCanonicalPath(categoryData: any, seoMode: any) {
  const category = categoryData?.category ?? categoryData;

  const slug =
    s(category?.slug) ||
    seoSlug(category?.seo_title || category?.name, "category");

  return buildCategoryHref({
    mode: seoMode || "named_ar",
    slugNameAr: slug,
    slugNameEn: slug,
    publicNo: toPositiveNumber(category?.public_no ?? category?.publicNo),
    shortCode: category?.short_url ?? category?.shortUrl ?? null,
  });
}

function isStoreLogoAsset(value: unknown) {
  const url = s(value).toLowerCase();

  if (!url) return false;

  return (
    url.includes("/profile/logo") ||
    url.includes("/profile/favicon") ||
    url.includes("/profile/") ||
    url.includes("/favicon") ||
    url.includes("favicon.ico")
  );
}

function firstCleanImage(values: unknown[]) {
  for (const value of values) {
    const url = s(value);

    if (!url) continue;
    if (isStoreLogoAsset(url)) continue;

    return url;
  }

  return "";
}

function getProductImage(product: any) {
  const media = Array.isArray(product?.media) ? product.media : [];

  const sortedMedia = media
    .slice()
    .filter((m: any) => {
      const url = s(m?.original_url) || s(m?.url) || s(m?.thumbnail_url);
      if (!url) return false;
      if (isStoreLogoAsset(url)) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const aDefault = a?.is_default ? 0 : 1;
      const bDefault = b?.is_default ? 0 : 1;

      if (aDefault !== bDefault) return aDefault - bDefault;

      return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
    });

  const mediaImage =
    s(sortedMedia[0]?.original_url) ||
    s(sortedMedia[0]?.url) ||
    s(sortedMedia[0]?.thumbnail_url);

  return firstCleanImage([
    mediaImage,
    product?.image_url,
    product?.thumbnail_url,
    product?.metadata?.og_image_url,
    product?.metadata?.image_url,
    product?.seo?.og_image_url,
  ]);
}

function getProductDescription(product: any, storeDescription: string) {
  return (
    limitText(product?.seo?.seo_description, 160) ||
    limitText(product?.metadata?.seo_description, 160) ||
    limitText(product?.description, 160) ||
    limitText(product?.metadata?.descriptionHtml, 160) ||
    limitText(product?.metadata?.subtitle, 160) ||
    storeDescription
  );
}

function getCategoryDescription(category: any, storeDescription: string) {
  return (
    limitText(category?.seo_description, 160) ||
    limitText(category?.description, 160) ||
    storeDescription
  );
}

function getInfoPageDescription(page: StorePageRow, storeDescription: string) {
  return (
    limitText(page.seo_description, 160) ||
    limitText(page.content, 160) ||
    storeDescription
  );
}

type JsonLdEntry = {
  id: string;
  data: Record<string, any> | null | undefined;
};

function cleanJsonLd(value: any): any {
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => cleanJsonLd(item))
      .filter((item) => item !== undefined && item !== null && item !== "");

    return arr.length ? arr : undefined;
  }

  if (value && typeof value === "object") {
    const out: Record<string, any> = {};

    for (const [key, raw] of Object.entries(value)) {
      const next = cleanJsonLd(raw);

      if (next === undefined || next === null || next === "") continue;
      if (Array.isArray(next) && !next.length) continue;

      out[key] = next;
    }

    return Object.keys(out).length ? out : undefined;
  }

  return value;
}

function JsonLdScripts({ entries }: { entries: JsonLdEntry[] }) {
  const cleanEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      id: entry.id,
      data: cleanJsonLd(entry.data),
    }))
    .filter((entry) => entry.id && entry.data);

  if (!cleanEntries.length) return null;

  return (
    <>
      {cleanEntries.map((entry) => (
        <script
          key={entry.id}
          id={entry.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry.data).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

function withJsonLd(children: ReactNode, entries: JsonLdEntry[]) {
  return (
    <>
      <JsonLdScripts entries={entries} />
      {children}
    </>
  );
}

function storeJsonLdId(origin: string) {
  return `${origin.replace(/\/+$/g, "")}/#store`;
}

function websiteJsonLdId(origin: string) {
  return `${origin.replace(/\/+$/g, "")}/#website`;
}

function buildStoreJsonLd(args: {
  origin: string;
  storeName: string;
  storeDescription: string;
  storeImage?: string | null;
}) {
  const url = absoluteUrl(args.origin, "/");
  const logo = s(args.storeImage) ? absoluteUrl(args.origin, args.storeImage) : "";

  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": storeJsonLdId(args.origin),
    name: args.storeName,
    description: args.storeDescription,
    url,
    logo,
    image: logo,
  };
}

function buildWebsiteJsonLd(args: {
  origin: string;
  storeName: string;
  storeDescription: string;
}) {
  const url = absoluteUrl(args.origin, "/");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteJsonLdId(args.origin),
    url,
    name: args.storeName,
    description: args.storeDescription,
    publisher: {
      "@id": storeJsonLdId(args.origin),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(args.origin, "/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBreadcrumbJsonLd(
  items: Array<{
    name: string;
    item: string;
  }>,
) {
  const cleanItems = items
    .map((item) => ({
      name: safeText(item.name),
      item: s(item.item),
    }))
    .filter((item) => item.name && item.item);

  if (cleanItems.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: cleanItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

function productPrice(product: any) {
  const sale = Number(product?.pricing?.sale_price ?? product?.seo?.sale_price);
  if (Number.isFinite(sale) && sale > 0) return sale;

  const price = Number(product?.pricing?.price ?? product?.seo?.price);
  if (Number.isFinite(price) && price > 0) return price;

  return null;
}

function productCurrency(product: any) {
  return s(product?.pricing?.currency) || s(product?.seo?.currency) || "SAR";
}
function roundJsonLdMoney(value: any, decimals: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;

  const digitsRaw = Number(decimals ?? 2);
  const digits = Number.isFinite(digitsRaw)
    ? Math.max(0, Math.min(4, Math.floor(digitsRaw)))
    : 2;

  return Number(n.toFixed(digits));
}

function buildProductJsonLdVm(args: {
  product: any;
  bootstrap?: any;
}): ProductDetailVM | null {
  try {
    if (!args.product) return null;

    return toProductDetailVM({
      storeSlug: "",
      product: args.product,
      currencies: args.bootstrap?.currencies ?? null,
      tax: args.bootstrap?.tax ?? null,
    } as any);
  } catch (error) {
    console.error("PRODUCT_JSONLD_VM_FAILED", error);
    return null;
  }
}

function productSeoPrice(
  product: any,
  productVm?: ProductDetailVM | null,
) {
  const vmPrice = roundJsonLdMoney(
    productVm?.pricing?.price ?? productVm?.price,
    productVm?.pricing?.currencyDecimals ??
      productVm?.currencyDecimals ??
      productVm?.pricing?.decimalDigits ??
      productVm?.decimalDigits ??
      2,
  );

  if (vmPrice !== null) return vmPrice;

  return productPrice(product);
}

function productSeoCurrency(
  product: any,
  productVm?: ProductDetailVM | null,
) {
  return (
    s(productVm?.pricing?.currencyCode) ||
    s(productVm?.pricing?.currency_code) ||
    s(productVm?.currencyCode) ||
    s(productVm?.currency_code) ||
    productCurrency(product)
  );
}
function productSku(product: any) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const defaultVariant =
    variants.find((variant: any) => Boolean(variant?.is_default)) || variants[0];

  return (
    s(product?.identifiers?.sku) ||
    s(defaultVariant?.sku) ||
    s(product?.metadata?.sku) ||
    s(product?.id)
  );
}

function productAvailability(product: any) {
  if (product?.seo?.in_stock === false) return "https://schema.org/OutOfStock";
  if (product?.seo?.in_stock === true) return "https://schema.org/InStock";

  const stock = product?.stock;
  if (stock?.unlimited_quantity) return "https://schema.org/InStock";

  const qty = Number(stock?.quantity ?? 0);
  if (Number.isFinite(qty) && qty > 0) return "https://schema.org/InStock";

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hasSellableVariant = variants.some((variant: any) => {
    if (variant?.unlimited_quantity) return true;

    const variantQty = Number(variant?.stock_quantity ?? 0);
    return Number.isFinite(variantQty) && variantQty > 0;
  });

  return hasSellableVariant
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function productBrandName(product: any) {
  return s(product?.brand?.name) || s(product?.seo?.brand_name) || "";
}

function productImages(
  product: any,
  origin: string,
  fallbackImage?: string | null,
) {
  const images = new Set<string>();

  const add = (value: unknown) => {
    const url = s(value);

    if (!url) return;
    if (isStoreLogoAsset(url)) return;

    images.add(absoluteUrl(origin, url));
  };

  add(getProductImage(product));

  if (Array.isArray(product?.media)) {
    const sortedMedia = product.media
      .slice()
      .filter((m: any) => m?.media_kind === "image" || !m?.media_kind)
      .sort((a: any, b: any) => {
        const aDefault = a?.is_default ? 0 : 1;
        const bDefault = b?.is_default ? 0 : 1;

        if (aDefault !== bDefault) return aDefault - bDefault;

        return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
      });

    for (const item of sortedMedia) {
      add(item?.original_url || item?.url || item?.thumbnail_url);
    }
  }

  add(fallbackImage);

  return Array.from(images).slice(0, 8);
}

function productRatingJsonLd(product: any) {
  const ratingValue = Number(
    product?.rating?.average ?? product?.rating_average ?? product?.rating,
  );

  const reviewCount = Number(
    product?.rating?.count ?? product?.reviews_count ?? product?.reviewsCount,
  );

  if (!Number.isFinite(ratingValue) || ratingValue <= 0) return null;
  if (!Number.isFinite(reviewCount) || reviewCount <= 0) return null;

  return {
    "@type": "AggregateRating",
    ratingValue: Math.min(5, Math.max(1, ratingValue)),
    reviewCount: Math.floor(reviewCount),
  };
}

function buildProductJsonLd(args: {
  origin: string;
  canonicalPath: string;
  product: any;
  productVm?: ProductDetailVM | null;
  title: string;
  description: string;
  image?: string | null;
  storeName: string;
}) {
  const url = absoluteUrl(args.origin, args.canonicalPath);
 const price = productSeoPrice(args.product, args.productVm);
  const brandName = productBrandName(args.product);
  const images = productImages(args.product, args.origin, args.image);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: args.title,
    description: args.description,
    image: images,
    sku: productSku(args.product),
    url,
    brand: brandName
      ? {
          "@type": "Brand",
          name: brandName,
        }
      : undefined,
    aggregateRating: productRatingJsonLd(args.product),
    offers: price
      ? {
          "@type": "Offer",
          url,
          priceCurrency: productSeoCurrency(args.product, args.productVm),
          price,
          availability: productAvailability(args.product),
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@id": storeJsonLdId(args.origin),
            name: args.storeName,
          },
        }
      : undefined,
  };
}

function buildProductBreadcrumbJsonLd(args: {
  origin: string;
  canonicalPath: string;
  product: any;
  title: string;
  seoMode: any;
}) {
  const categories = Array.isArray(args.product?.seo?.categories)
    ? args.product.seo.categories
    : [];

  const primaryCategory =
    categories.find((category: any) => Boolean(category?.is_primary)) ||
    categories[0];

  const items = [
    {
      name: "الرئيسية",
      item: absoluteUrl(args.origin, "/"),
    },
  ];

  if (primaryCategory?.name && primaryCategory?.public_no) {
    const categoryPath = buildCategoryHref({
      mode: args.seoMode || "named_ar",
      slugNameAr: s(primaryCategory.name),
      slugNameEn: s(primaryCategory.name),
      publicNo: toPositiveNumber(primaryCategory.public_no),
      shortCode: null,
    });

    items.push({
      name: s(primaryCategory.name),
      item: absoluteUrl(args.origin, categoryPath),
    });
  }

  items.push({
    name: args.title,
    item: absoluteUrl(args.origin, args.canonicalPath),
  });

  return buildBreadcrumbJsonLd(items);
}

function buildCollectionPageJsonLd(args: {
  origin: string;
  canonicalPath: string;
  title: string;
  description: string;
  products?: any[];
  seoMode: any;
}) {
  const url = absoluteUrl(args.origin, args.canonicalPath);
  const products = Array.isArray(args.products) ? args.products.slice(0, 24) : [];

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: args.title,
    description: args.description,
    url,
    mainEntity: products.length
      ? {
          "@type": "ItemList",
          itemListElement: products.map((product, index) => {
            const productPath = getProductCanonicalPath({ product }, args.seoMode);
            const image = getProductImage(product);

            return {
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(args.origin, productPath),
              name: s(product?.seo?.seo_title) || s(product?.name),
              image: image ? absoluteUrl(args.origin, image) : undefined,
            };
          }),
        }
      : undefined,
  };
}

function buildWebPageJsonLd(args: {
  origin: string;
  canonicalPath: string;
  title: string;
  description: string;
}) {
  const url = absoluteUrl(args.origin, args.canonicalPath);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: args.title,
    description: args.description,
    url,
    inLanguage: "ar-SA",
  };
}

function buildHomeJsonLdEntries(args: {
  origin: string;
  storeName: string;
  storeDescription: string;
  storeImage?: string | null;
}): JsonLdEntry[] {
  return [
    {
      id: "mk-jsonld-store",
      data: buildStoreJsonLd(args),
    },
    {
      id: "mk-jsonld-website",
      data: buildWebsiteJsonLd(args),
    },
  ];
}

function buildInfoPageJsonLdEntries(args: {
  origin: string;
  canonicalPath: string;
  title: string;
  description: string;
}): JsonLdEntry[] {
  return [
    {
      id: "mk-jsonld-webpage",
      data: buildWebPageJsonLd(args),
    },
    {
      id: "mk-jsonld-breadcrumbs",
      data: buildBreadcrumbJsonLd([
        {
          name: "الرئيسية",
          item: absoluteUrl(args.origin, "/"),
        },
        {
          name: args.title,
          item: absoluteUrl(args.origin, args.canonicalPath),
        },
      ]),
    },
  ];
}

function buildCategoryJsonLdEntries(args: {
  origin: string;
  canonicalPath: string;
  title: string;
  description: string;
  products?: any[];
  seoMode: any;
}): JsonLdEntry[] {
  return [
    {
      id: "mk-jsonld-collection",
      data: buildCollectionPageJsonLd(args),
    },
    {
      id: "mk-jsonld-breadcrumbs",
      data: buildBreadcrumbJsonLd([
        {
          name: "الرئيسية",
          item: absoluteUrl(args.origin, "/"),
        },
        {
          name: args.title,
          item: absoluteUrl(args.origin, args.canonicalPath),
        },
      ]),
    },
  ];
}

function buildProductJsonLdEntries(args: {
  origin: string;
  canonicalPath: string;
  product: any;
  productVm?: ProductDetailVM | null;
  title: string;
  description: string;
  image?: string | null;
  storeName: string;
  seoMode: any;
}): JsonLdEntry[] {
  return [
    {
      id: "mk-jsonld-product",
      data: buildProductJsonLd(args),
    },
    {
      id: "mk-jsonld-breadcrumbs",
      data: buildProductBreadcrumbJsonLd(args),
    },
  ];
}

function titleFromSlug(value: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  return decoded.replace(/[-_]+/g, " ").trim();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const ctx = await resolveStoreContext();
const origin = await getRequestOriginSafeCached();

  if (!ctx.store) {
    return makeNoIndexMetadata({
      origin,
      title: "غير موجود",
      canonicalPath: "/",
      storeName: "المتجر",
    });
  }

  const sp = (await props.searchParams) || {};
  const previewVal = Array.isArray(sp.preview) ? sp.preview[0] : sp.preview;
  const themeEditorVal = Array.isArray(sp.themeEditor)
    ? sp.themeEditor[0]
    : sp.themeEditor;

  const preview = previewVal === "1" || themeEditorVal === "1";

  const params = ((await props.params) ?? {}) as PageParams;
  const slug = params.slug || [];

 const seoMode = await getSeoUrlModeCached(ctx.store.id);
  const storeName = s(ctx.store.name) || "المتجر";
  const storeDescription = getStoreDescription(ctx.store);
  const storeImage = getStoreImage(ctx.store);
  const currentPath = pathFromSlug(slug);
const maintenance = await getStoreMaintenanceSettings(ctx.store.id);

if (maintenance.enabled && !preview) {
  return makeNoIndexMetadata({
    origin,
    title: maintenance.title || storeName,
    description: maintenance.message || storeDescription,
    canonicalPath: currentPath,
    storeName,
  });
}
  if (preview) {
    return makeNoIndexMetadata({
      origin,
      title: storeName,
      description: storeDescription,
      canonicalPath: currentPath,
      storeName,
    });
  }

  if (isPrivateStoreRoute(slug)) {
    return makeNoIndexMetadata({
      origin,
      title: storeName,
      description: storeDescription,
      canonicalPath: currentPath,
      storeName,
    });
  }

  const infoPageSlug = getInfoPageSlug(slug);

  if (infoPageSlug) {
   const page = await loadInfoPageBySlugCached(
  ctx.store.id,
  infoPageSlug,
);

    if (!page) {
      return makeNoIndexMetadata({
        origin,
        title: "الصفحة غير موجودة",
        description: storeDescription,
        canonicalPath: currentPath,
        storeName,
      });
    }

    const pageSlug =
      normalizeStorePageSlug(page.seo_slug) ||
      normalizeStorePageSlug(page.title) ||
      normalizeStorePageSlug(page.id);

    const pageTitle = s(page.seo_title) || s(page.title) || storeName;
    const description = getInfoPageDescription(page, storeDescription);

    return makeMetadata({
      origin,
      title: titleWithStore(pageTitle, storeName),
      description,
      canonicalPath: `/p/${pageSlug}`,
      storeName,
      image: storeImage,
      keywords: buildKeywords([pageTitle, description, storeName]),
      type: "article",
    });
  }

  const tagPageSlug = getTagPageSlug(slug);

  if (tagPageSlug) {
const data = await loadTagPageBySlugCached(
  ctx.store.id,
  tagPageSlug,
  1,
);

    if (!data) {
      return makeNoIndexMetadata({
        origin,
        title: "الوسم غير موجود",
        description: storeDescription,
        canonicalPath: currentPath,
        storeName,
      });
    }

    const tagTitle =
      s(data?.tag?.name) ||
      s(data?.tag?.title) ||
      s(data?.title) ||
      titleFromSlug(tagPageSlug);

    const description = limitText(data?.tag?.description, 160) || storeDescription;

    return makeMetadata({
      origin,
      title: titleWithStore(tagTitle, storeName),
      description,
      canonicalPath: `/tag/${encodeURIComponent(tagPageSlug)}`,
      storeName,
      image: storeImage,
      keywords: buildKeywords([tagTitle, description, storeName]),
    });
  }

  const decision = parseSlug(slug);

  if (decision.type === "home") {
    return makeMetadata({
      origin,
      title: storeName,
      description: storeDescription,
      canonicalPath: "/",
      storeName,
      image: storeImage,
      keywords: buildKeywords([storeName, storeDescription]),
    });
  }

  if (decision.type === "named_category") {
  const data = await loadCategoryPageByPublicNoCached(
  ctx.store.id,
  decision.publicNo,
);

    if (!data?.category) {
      return makeNoIndexMetadata({
        origin,
        title: "القسم غير موجود",
        description: storeDescription,
        canonicalPath: currentPath,
        storeName,
      });
    }

    const category = data.category;
    const title = s(category.seo_title) || s(category.name) || storeName;
    const description = getCategoryDescription(category, storeDescription);
    const canonicalPath = getCategoryCanonicalPath(data, seoMode);

    return makeMetadata({
      origin,
      title: titleWithStore(title, storeName),
      description,
      canonicalPath,
      storeName,
      image: category.og_image_url || storeImage,
      keywords: buildKeywords([title, description, storeName]),
    });
  }

  if (decision.type === "named_product") {
const data = await loadProductPageByPublicNoCached(
  ctx.store.id,
  decision.publicNo,
);

    if (!data?.product) {
      return makeNoIndexMetadata({
        origin,
        title: "المنتج غير موجود",
        description: storeDescription,
        canonicalPath: currentPath,
        storeName,
      });
    }

    const product = data.product;
    const title = s(product?.seo?.seo_title) || s(product?.name) || storeName;
    const description = getProductDescription(product, storeDescription);
    const canonicalPath = getProductCanonicalPath(data, seoMode);
 const image = getProductImage(product);

    return makeMetadata({
      origin,
      title: titleWithStore(title, storeName),
      description,
      canonicalPath,
      storeName,
      image,
      keywords: buildKeywords([
        title,
        description,
        product?.seo?.brand_name,
        storeName,
      ]),
    });
  }

  if (decision.type === "short_category") {
const data = await loadCategoryByShortOrBase62Cached(
  ctx.store.id,
  decision.code,
);

    if (!data?.category) {
      return makeNoIndexMetadata({
        origin,
        title: "القسم غير موجود",
        description: storeDescription,
        canonicalPath: currentPath,
        storeName,
      });
    }

    const category = data.category;
    const title = s(category.seo_title) || s(category.name) || storeName;
    const description = getCategoryDescription(category, storeDescription);
    const canonicalPath = getCategoryCanonicalPath(data, seoMode);

    return makeMetadata({
      origin,
      title: titleWithStore(title, storeName),
      description,
      canonicalPath,
      storeName,
      image: category.og_image_url || storeImage,
      keywords: buildKeywords([title, description, storeName]),
    });
  }

  if (decision.type === "short") {
  const product = await loadProductByShortOrBase62Cached(
  ctx.store.id,
  decision.code,
);

    if (product?.product) {
      const row = product.product;
      const title = s(row?.seo?.seo_title) || s(row?.name) || storeName;
      const description = getProductDescription(row, storeDescription);
      const canonicalPath = getProductCanonicalPath(product, seoMode);
     const image = getProductImage(row);

      return makeMetadata({
        origin,
        title: titleWithStore(title, storeName),
        description,
        canonicalPath,
        storeName,
        image,
        keywords: buildKeywords([
          title,
          description,
          row?.seo?.brand_name,
          storeName,
        ]),
      });
    }

 const category = await loadCategoryByShortOrBase62Cached(
  ctx.store.id,
  decision.code,
);

    if (category?.category) {
      const row = category.category;
      const title = s(row.seo_title) || s(row.name) || storeName;
      const description = getCategoryDescription(row, storeDescription);
      const canonicalPath = getCategoryCanonicalPath(category, seoMode);

      return makeMetadata({
        origin,
        title: titleWithStore(title, storeName),
        description,
        canonicalPath,
        storeName,
        image: row.og_image_url || storeImage,
        keywords: buildKeywords([title, description, storeName]),
      });
    }

    return makeNoIndexMetadata({
      origin,
      title: "الصفحة غير موجودة",
      description: storeDescription,
      canonicalPath: currentPath,
      storeName,
    });
  }

  return makeNoIndexMetadata({
    origin,
    title: "الصفحة غير موجودة",
    description: storeDescription,
    canonicalPath: currentPath,
    storeName,
  });
}

export default async function Page(props: PageProps) {
  const ctx = await resolveStoreContext();
  if (!ctx.store) return notFound();

  const sp = (await props.searchParams) || {};
  const previewVal = Array.isArray(sp.preview) ? sp.preview[0] : sp.preview;
  const preview = previewVal === "1";

  const params = ((await props.params) ?? {}) as { slug?: string[] };
  const slug = params.slug || [];

  const origin = await getRequestOriginSafeCached();
  const storeName = s(ctx.store.name) || "المتجر";
  const storeDescription = getStoreDescription(ctx.store);
  const storeImage = getStoreImage(ctx.store);

  const maintenance = await getStoreMaintenanceSettings(ctx.store.id);

if (maintenance.enabled && !preview) {
  return await renderMalakMaintenancePage({
    ctx,
    settings: maintenance,
  });
}

  const infoPageSlug = getInfoPageSlug(slug);

  if (infoPageSlug) {
 const page = await loadInfoPageBySlugCached(
  ctx.store.id,
  infoPageSlug,
);

    if (!page) return notFound();

    const pageSlug =
      normalizeStorePageSlug(page.seo_slug) ||
      normalizeStorePageSlug(page.title) ||
      normalizeStorePageSlug(page.id);

    const pageTitle = s(page.seo_title) || s(page.title) || storeName;
    const pageDescription = getInfoPageDescription(page, storeDescription);
    const pageCanonicalPath = `/p/${pageSlug}`;

    const jsonLdEntries = buildInfoPageJsonLdEntries({
      origin,
      canonicalPath: pageCanonicalPath,
      title: pageTitle,
      description: pageDescription,
    });

    if (isMalakTheme(ctx)) {
      const content = await renderMalakInfoPage({
        ctx,
        page,
        preview,
      });

      return withJsonLd(content, jsonLdEntries);
    }

    return withJsonLd(
      <div dir="rtl" className="mx-auto max-w-4xl px-4 py-10">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-black text-slate-900">
            {page.title}
          </h1>

          {String(page.page_type || "").toLowerCase() === "html" ? (
            <div
              className="prose prose-slate max-w-none text-right"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : (
            <div className="whitespace-pre-line text-right text-base leading-9 text-slate-700">
              {page.content}
            </div>
          )}
        </article>
      </div>,
      jsonLdEntries,
    );
  }

  const tagPageSlug = getTagPageSlug(slug);

  if (tagPageSlug) {
const data = await loadTagPageBySlugCached(
  ctx.store.id,
  tagPageSlug,
  48,
);

    if (!data) return notFound();

   const seoMode = await getSeoUrlModeCached(ctx.store.id);
    const tagTitle =
      s(data?.tag?.name) ||
      s(data?.tag?.title) ||
      s(data?.title) ||
      titleFromSlug(tagPageSlug);
    const tagDescription =
      limitText(data?.tag?.description, 160) || storeDescription;
    const tagCanonicalPath = `/tag/${encodeURIComponent(tagPageSlug)}`;

    const jsonLdEntries = buildCategoryJsonLdEntries({
      origin,
      canonicalPath: tagCanonicalPath,
      title: tagTitle,
      description: tagDescription,
      products: data?.products,
      seoMode,
    });

    if (isMalakTheme(ctx)) {
      const content = await renderMalakTagPage({
        ctx,
        data,
        preview,
      });

      return withJsonLd(content, jsonLdEntries);
    }

    const content = await renderCategoryPage({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      data,
    });

    return withJsonLd(content, jsonLdEntries);
  }

  if (matchRoute(slug, ["cart"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "cart",
    });
  }

  const isThankYou =
    (slug.length === 2 &&
      slug[0] === "thankyou" &&
      String(slug[1] ?? "").trim() !== "") ||
    (slug.length === 3 &&
      isLangPrefix(String(slug[0] ?? "")) &&
      slug[1] === "thankyou" &&
      String(slug[2] ?? "").trim() !== "");







  if (isThankYou) {
    const token = isLangPrefix(String(slug[0] ?? ""))
      ? String(slug[2] ?? "")
      : String(slug[1] ?? "");

    const sb: any = supabaseAdmin();

    let order: any = null;

    const ORDER_SELECT = [
      "id",
      "order_number",
      "public_no",
      "public_token",
      "invoice_no",
      "status",
      "base_status_key",
      "payment_status",
      "payment_method",
      "currency",
      "subtotal",
      "shipping_amount",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "created_at",
      "shipping_address",
      "shipping_snapshot",
    ].join(",");

    const byToken = await sb
      .from("orders")
      .select(ORDER_SELECT)
      .eq("store_id", ctx.store.id)
      .eq("public_token", token)
      .maybeSingle();

    if (!byToken.error && byToken.data?.id) {
      order = byToken.data;
    } else if (isDigits(token)) {
      const byPublicNo = await sb
        .from("orders")
        .select(ORDER_SELECT)
        .eq("store_id", ctx.store.id)
        .eq("public_no", Number(token))
        .maybeSingle();

      if (!byPublicNo.error && byPublicNo.data?.id) {
        order = byPublicNo.data;
      }
    }

    if (!order?.id) return notFound();

    const orderItemsR = await sb
      .from("order_items")
      .select(
        [
          "id",
          "order_id",
          "product_id",
          "variant_id",
          "name",
          "sku",
          "qty",
          "currency",
          "unit_price",
          "total_price",
          "selected_options",
          "selected_option_value_ids",
          "created_at",
        ].join(","),
      )
      .eq("store_id", ctx.store.id)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    const orderItems =
      !orderItemsR.error && Array.isArray(orderItemsR.data)
        ? orderItemsR.data
        : [];

    const productIds = Array.from(
      new Set(
        orderItems
          .map((item: any) => String(item?.product_id ?? "").trim())
          .filter(Boolean),
      ),
    );

    const mediaR =
      productIds.length > 0
        ? await sb
            .from("product_media")
            .select("product_id,original_url,is_default,sort_order")
            .eq("store_id", ctx.store.id)
            .in("product_id", productIds)
        : { data: [], error: null };

    const imageByProduct = new Map<string, string>();

    if (!mediaR.error && Array.isArray(mediaR.data)) {
      const bestByProduct = new Map<string, any>();

      for (const row of mediaR.data) {
        const productId = String(row?.product_id ?? "");
        if (!productId) continue;

        const current = bestByProduct.get(productId);

        const score =
          (row?.is_default ? 0 : 1000) + Number(row?.sort_order ?? 0);

        const currentScore = current
          ? (current?.is_default ? 0 : 1000) + Number(current?.sort_order ?? 0)
          : Number.POSITIVE_INFINITY;

        if (!current || score < currentScore) {
          bestByProduct.set(productId, row);
        }
      }

      for (const [productId, row] of bestByProduct.entries()) {
        const imageUrl = String(row?.original_url ?? "").trim();
        if (imageUrl) imageByProduct.set(productId, imageUrl);
      }
    }

    const orderNo =
      order.public_no != null
        ? String(order.public_no)
        : order.order_number != null
          ? String(order.order_number)
          : order.public_token != null
            ? String(order.public_token)
            : token;

    function moneyValue(value: any) {
      const num = Number(value ?? 0);
      return Number.isFinite(num) ? num : 0;
    }

    function moneyRound(value: any) {
      return Math.round(moneyValue(value) * 100) / 100;
    }

    function safeRecord(value: any): Record<string, any> {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }

      return {};
    }

    function firstSnapshotValue(
      source: Record<string, any>,
      keys: string[],
      fallback: any = null,
    ) {
      for (const key of keys) {
        const value = source?.[key];

        if (value === undefined || value === null || value === "") continue;

        return value;
      }

      return fallback;
    }

    function snapshotMoney(
      source: Record<string, any>,
      keys: string[],
      fallback: any = 0,
    ) {
      return moneyRound(firstSnapshotValue(source, keys, fallback));
    }

    function snapshotText(
      source: Record<string, any>,
      keys: string[],
      fallback = "",
    ) {
      const value = firstSnapshotValue(source, keys, fallback);
      return String(value ?? "").trim();
    }

    function snapshotBool(
      source: Record<string, any>,
      keys: string[],
      fallback = false,
    ) {
      const value = firstSnapshotValue(source, keys, undefined);

      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;

      if (typeof value === "string") {
        const v = value.trim().toLowerCase();

        if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) {
          return true;
        }

        if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) {
          return false;
        }
      }

      return fallback;
    }

    const shippingSnapshot = safeRecord(order.shipping_snapshot);
    const checkoutSnapshot = safeRecord(shippingSnapshot.checkout);

    const financialSnapshot =
      Object.keys(checkoutSnapshot).length > 0
        ? checkoutSnapshot
        : shippingSnapshot;
const orderOptionsR = await sb
  .from("order_option_answers")
  .select(
    [
      "id",
      "option_id",
      "option_name",
      "option_type",
      "value",
      "choice_ids",
      "choices_snapshot",
      "metadata",
      "snapshot",
      "price_customer",
      "currency",
      "created_at",
    ].join(","),
  )
  .eq("store_id", ctx.store.id)
  .eq("order_id", order.id)
  .order("created_at", { ascending: true });

function safeArrayValue(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function normalizeOrderOptionAnswer(row: any, index: number) {
  const snapshot = safeRecord(row?.snapshot);
  const metadata = safeRecord(row?.metadata);

  const choicesSnapshot =
    safeArrayValue(row?.choices_snapshot).length > 0
      ? safeArrayValue(row?.choices_snapshot)
      : safeArrayValue(snapshot?.choices);

  const optionName =
    String(row?.option_name ?? "").trim() ||
    String(snapshot?.option_name ?? "").trim() ||
    `خيار الطلب ${index + 1}`;

  const optionType =
    String(row?.option_type ?? "").trim() ||
    String(snapshot?.option_type ?? "").trim() ||
    "";

  let value = String(row?.value ?? "").trim();

  if (optionType === "choices" && choicesSnapshot.length > 0) {
    value = choicesSnapshot
      .map((choice: any) => String(choice?.label ?? "").trim())
      .filter(Boolean)
      .join("، ");
  }

  if (optionType === "appointment") {
    const date = String(metadata?.date ?? "").trim();
    const from = String(metadata?.from ?? "").trim();
    const to = String(metadata?.to ?? "").trim();

    if (date && from && to) {
      value = `${date} من ${from} إلى ${to}`;
    } else if (date) {
      value = date;
    }
  }

  const price = moneyRound(row?.price_customer);

  return {
    id: String(row?.id ?? `${row?.option_id ?? "option"}-${index}`),
    optionId: String(row?.option_id ?? ""),
    option_id: String(row?.option_id ?? ""),

    name: optionName,
    optionName,

    type: optionType,
    optionType,

    value,

    choices: choicesSnapshot.map((choice: any) => ({
      id: String(choice?.id ?? ""),
      label: String(choice?.label ?? "").trim(),
      price_customer: moneyRound(choice?.price_customer),
      priceCustomer: moneyRound(choice?.price_customer),
    })),

    metadata,
    price_customer: price,
    priceCustomer: price,
    currency: String(row?.currency ?? order.currency ?? "").trim(),
  };
}

const orderOptions =
  !orderOptionsR.error && Array.isArray(orderOptionsR.data)
    ? orderOptionsR.data
        .map((row: any, index: number) =>
          normalizeOrderOptionAnswer(row, index),
        )
        .filter((row: any) => row.name)
    : [];

const orderOptionsFee = moneyRound(
  orderOptions.reduce(
    (acc: number, row: any) =>
      acc + moneyRound(row.price_customer ?? row.priceCustomer),
    0,
  ),
);

    const subtotalAmount = snapshotMoney(
      financialSnapshot,
      ["subtotal", "subtotal_amount", "subtotalAmount"],
      order.subtotal,
    );

    const discountAmount = snapshotMoney(
      financialSnapshot,
      ["discount_amount", "discountAmount", "discount"],
      order.discount_amount,
    );

    const shippingAmount = snapshotMoney(
      financialSnapshot,
      ["shipping_amount", "shippingAmount", "shipping"],
      order.shipping_amount,
    );

    const shippingTaxAmount = snapshotMoney(
      financialSnapshot,
      ["shipping_tax", "shippingTax"],
      0,
    );

    const shippingTotalAmount = snapshotMoney(
      financialSnapshot,
      ["shipping_total", "shippingTotal"],
      shippingAmount + shippingTaxAmount,
    );

    const paymentFeeBaseAmount = snapshotMoney(
      financialSnapshot,
      ["payment_fee_amount", "paymentFeeAmount", "payment_fee", "paymentFee"],
      0,
    );

    const paymentFeeTaxAmount = snapshotMoney(
      financialSnapshot,
      ["payment_fee_tax", "paymentFeeTax"],
      0,
    );

    const paymentFeeTotalFromSnapshot = snapshotMoney(
      financialSnapshot,
      ["payment_fee_total", "paymentFeeTotal"],
      0,
    );

    const taxAmount = snapshotMoney(
      financialSnapshot,
      ["tax_amount", "taxAmount", "tax"],
      order.tax_amount,
    );

    const totalAmount = snapshotMoney(
      financialSnapshot,
      ["total_amount", "totalAmount", "total"],
      order.total_amount,
    );

    const productTaxAmount = snapshotMoney(
      financialSnapshot,
      ["product_tax", "productTax"],
      Math.max(0, taxAmount - shippingTaxAmount - paymentFeeTaxAmount),
    );

    const knownTotalWithoutPaymentFee = Math.max(
      0,
      subtotalAmount - discountAmount + shippingAmount + taxAmount,
    );

    const fallbackPaymentFeeAmount = Math.max(
      0,
      moneyRound(totalAmount - knownTotalWithoutPaymentFee),
    );

    const paymentFeeAmount =
      paymentFeeBaseAmount > 0
        ? paymentFeeBaseAmount
        : paymentFeeTotalFromSnapshot > 0 && paymentFeeTaxAmount > 0
          ? Math.max(0, moneyRound(paymentFeeTotalFromSnapshot - paymentFeeTaxAmount))
          : fallbackPaymentFeeAmount;

    const paymentFeeTotalAmount =
      paymentFeeTotalFromSnapshot > 0
        ? paymentFeeTotalFromSnapshot
        : moneyRound(paymentFeeAmount + paymentFeeTaxAmount);

    const taxEnabled = snapshotBool(
      financialSnapshot,
      ["tax_enabled", "taxEnabled"],
      taxAmount > 0,
    );

    const taxLabel =
      snapshotText(
        financialSnapshot,
        ["tax_label", "taxLabel"],
        "",
      ) || "ضريبة القيمة المضافة";

    const taxRate = snapshotMoney(
      financialSnapshot,
      ["tax_rate", "taxRate"],
      0,
    );

    const pricesIncludeTax = snapshotBool(
      financialSnapshot,
      ["prices_include_tax", "pricesIncludeTax"],
      false,
    );

    const shippingIncludeTax = snapshotBool(
      financialSnapshot,
      ["shipping_include_tax", "shippingIncludeTax"],
      false,
    );

    const paymentFeeIncludeTax = snapshotBool(
      financialSnapshot,
      ["payment_fee_include_tax", "paymentFeeIncludeTax"],
      false,
    );

    const paymentMethod =
      snapshotText(
        financialSnapshot,
        ["payment_method", "paymentMethod"],
        "",
      ) || String(order.payment_method ?? "").trim();

    function paymentLabel(method: any) {
      const value = String(method ?? "").trim();

      if (value === "cod") return "الدفع عند الاستلام";
      if (value === "bank_transfer") return "تحويل بنكي";
      if (value.startsWith("provider:")) return "دفع إلكتروني";

      return "طريقة الدفع المسجلة";
    }

    function paymentStatusLabel(status: any) {
      const value = String(status ?? "").trim();

      if (value === "paid") return "مدفوع";
      if (value === "unpaid") return "غير مدفوع / قيد المعالجة";
      if (value === "failed") return "فشل الدفع";
      if (value === "refunded") return "تم الاسترجاع";

      return "قيد المعالجة";
    }

    function statusLabel(orderRow: any) {
      const base = String(orderRow?.base_status_key ?? "").trim();
      const status = String(orderRow?.status ?? "").trim();

      if (base === "pending_review") return "تم الاستلام";
      if (base === "processing") return "جاري التجهيز";
      if (base === "shipped") return "تم الشحن";
      if (base === "delivered") return "تم التسليم";
      if (base === "cancelled" || status === "cancelled") return "ملغي";

      return "تم الاستلام";
    }

    function statusDescription(orderRow: any) {
      const base = String(orderRow?.base_status_key ?? "").trim();
      const status = String(orderRow?.status ?? "").trim();

      if (base === "pending_review") return "تم استلام الطلب وجاري مراجعته.";
      if (base === "processing") return "طلبك قيد التجهيز الآن.";
      if (base === "shipped") return "تم تسليم الطلب لشركة الشحن.";
      if (base === "delivered") return "تم تسليم الطلب بنجاح.";
      if (base === "cancelled" || status === "cancelled") {
        return "تم إلغاء هذا الطلب.";
      }

      return "تم استلام الطلب وجاري مراجعته.";
    }

    function addressText(orderRow: any) {
      const address = orderRow?.shipping_address ?? null;

      const city = String(address?.city ?? "").trim();
      const district = String(address?.district ?? "").trim();
      const line1 = String(address?.address_line1 ?? "").trim();

      const parts = [city, district, line1].filter(Boolean);

      if (parts.length > 0) return parts.join(" - ");

      return "العنوان المختار أثناء إتمام الطلب";
    }

    function itemSubtitle(item: any) {
      const selected = Array.isArray(item?.selected_options)
        ? item.selected_options
        : [];

      const parts = selected
        .map((row: any) => {
          const name = String(row?.name ?? "").trim();
          const value = String(row?.value ?? "").trim();

          if (name && value) return `${name}: ${value}`;
          if (value) return value;

          return "";
        })
        .filter(Boolean);

      if (parts.length > 0) return parts.join("، ");

      const sku = String(item?.sku ?? "").trim();
      return sku ? `SKU: ${sku}` : "";
    }

    const thankYouItems = orderItems.map((item: any) => {
      const productId = String(item?.product_id ?? "").trim();

      return {
        id: String(item?.id ?? ""),
        title: String(item?.name ?? "منتج"),
        subtitle: itemSubtitle(item),
        qty: Number(item?.qty ?? 1),
        price: moneyValue(item?.unit_price),
        imageUrl: imageByProduct.get(productId) ?? null,
      };
    });

    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "thankyou",
      extraData: {
        token,
        orderNo,
orderOptions,
order_options: orderOptions,
orderOptionsFee,
order_options_fee: orderOptionsFee,

        totalAmount,
        currency: String(order.currency ?? "SAR"),

        subtotal: subtotalAmount,
        shippingAmount,
        shippingTaxAmount,
        shippingTotalAmount,
        shippingIncludeTax,

        discountAmount,

        taxAmount,
        productTaxAmount,
        taxEnabled,
        taxLabel,
        taxRate,
        pricesIncludeTax,

        paymentFeeAmount,
        paymentFeeTaxAmount,
        paymentFeeTotalAmount,
        paymentFeeIncludeTax,
        paymentFeeLabel:
          paymentFeeAmount > 0 && paymentMethod === "cod"
            ? "رسوم الدفع عند الاستلام"
            : "رسوم الدفع",

        paymentLabel: paymentLabel(paymentMethod),
        paymentStatusLabel: paymentStatusLabel(order.payment_status),

        estimatedDeliveryText:
          String(shippingSnapshot?.eta_text ?? "").trim() ||
          "سيتم تحديده قريبًا",

        deliveryAddressText: addressText(order),

        statusLabel: statusLabel(order),
        statusDescription: statusDescription(order),

        items: thankYouItems,
      },
    });
  }









 
  if (matchRoute(slug, ["account"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "account",
    });
  }

  if (matchRoute(slug, ["account", "wallet"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "wallet",
    });
  }

  if (matchRoute(slug, ["account", "orders"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "orders",
    });
  }

  const isOrderDetails =
    (slug.length === 3 &&
      slug[0] === "account" &&
      slug[1] === "orders" &&
      String(slug[2] ?? "").trim() !== "") ||
    (slug.length === 4 &&
      isLangPrefix(String(slug[0] ?? "")) &&
      slug[1] === "account" &&
      slug[2] === "orders" &&
      String(slug[3] ?? "").trim() !== "");

  if (isOrderDetails) {
    const orderNo = isLangPrefix(String(slug[0] ?? ""))
      ? String(slug[3] ?? "")
      : String(slug[2] ?? "");

    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "order_details",
      extraData: { orderNo },
    });
  }

  if (matchRoute(slug, ["account", "addresses"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "addresses",
    });
  }

  if (matchRoute(slug, ["account", "rewards"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "rewards",
    });
  }

  if (matchRoute(slug, ["account", "gift-balance"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "gift_balance",
    });
  }

  if (matchRoute(slug, ["account", "refer"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "refer",
    });
  }

  if (matchRoute(slug, ["account", "tickets"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "tickets",
    });
  }

  if (matchRoute(slug, ["account", "favorites"])) {
    return await renderStoreRoute({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      route: "favorites",
    });
  }

  const decision = parseSlug(slug);

  if (decision.type === "home") {
    const themeOptions = ctx?.theme?.options ?? {};

const data = await loadHomePageCached(
  ctx.store.id,
  24,
  themeOptions,
);

  const storeReviews = await loadStoreReviewsCached(ctx.store.id);

    const content = await renderHomePage({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      data: {
        ...(data ?? {}),

        themeOptions,
        theme_options: themeOptions,

        storeReviews,
        store_reviews: storeReviews,
        testimonials: storeReviews,
        reviews: storeReviews,
      } as any,
    });

    return withJsonLd(
      content,
      buildHomeJsonLdEntries({
        origin,
        storeName,
        storeDescription,
        storeImage,
      }),
    );
  }

if (decision.type === "named_category") {
const rawData = await loadCategoryPageByPublicNoCached(
  ctx.store.id,
  decision.publicNo,
);

    if (!rawData) return notFound();

    const data = await attachCatalogFiltersToCategoryData({
      storeId: ctx.store.id,
      data: rawData,
      searchParams: sp,
    });

   const seoMode = await getSeoUrlModeCached(ctx.store.id);
    const category = data.category;
    const title = s(category?.seo_title) || s(category?.name) || storeName;
    const description = getCategoryDescription(category, storeDescription);
    const canonicalPath = getCategoryCanonicalPath(data, seoMode);

    const jsonLdEntries = buildCategoryJsonLdEntries({
      origin,
      canonicalPath,
      title,
      description,
      products: data?.products,
      seoMode,
    });

    if (isMalakTheme(ctx)) {
      const content = await renderMalakCategoryPage({
        ctx,
        data,
        preview,
      });

      return withJsonLd(content, jsonLdEntries);
    }

    const content = await renderCategoryPage({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      data,
    });

    return withJsonLd(content, jsonLdEntries);
  }

  if (decision.type === "named_product") {
 const data = await loadProductPageByPublicNoCached(
  ctx.store.id,
  decision.publicNo,
);

    if (!data) return notFound();

  const seoMode = await getSeoUrlModeCached(ctx.store.id);
    const product = data.product;
    const title = s(product?.seo?.seo_title) || s(product?.name) || storeName;
    const description = getProductDescription(product, storeDescription);
    const canonicalPath = getProductCanonicalPath(data, seoMode);
    const image = getProductImage(product) || storeImage;
    const bootstrapForJsonLd = isMalakTheme(ctx)
      ? await buildMalakBootstrap({
          ctx,
          seoMode,
        })
      : null;

    const productVmForJsonLd = bootstrapForJsonLd
      ? buildProductJsonLdVm({
          product,
          bootstrap: bootstrapForJsonLd,
        })
      : null;
    const jsonLdEntries = buildProductJsonLdEntries({
      origin,
      canonicalPath,
      product,
            productVm: productVmForJsonLd,
      title,
      description,
      image,
      storeName,
      seoMode,
    });

    if (isMalakTheme(ctx)) {
      const content = await renderMalakProductPage({
        ctx,
        data,
        preview,
      });

      return withJsonLd(content, jsonLdEntries);
    }

    const content = await renderProductPage({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      data,
    });

    return withJsonLd(content, jsonLdEntries);
  }

if (decision.type === "short_category") {
const rawCategory = await loadCategoryByShortOrBase62Cached(
  ctx.store.id,
  decision.code,
);

    if (!rawCategory) return notFound();

    const category = await attachCatalogFiltersToCategoryData({
      storeId: ctx.store.id,
      data: rawCategory,
      searchParams: sp,
    });

    const seoMode = await getSeoUrlModeCached(ctx.store.id);
    const row = category.category;
    const title = s(row?.seo_title) || s(row?.name) || storeName;
    const description = getCategoryDescription(row, storeDescription);
    const canonicalPath = getCategoryCanonicalPath(category, seoMode);

    const jsonLdEntries = buildCategoryJsonLdEntries({
      origin,
      canonicalPath,
      title,
      description,
      products: category?.products,
      seoMode,
    });

    if (isMalakTheme(ctx)) {
      const content = await renderMalakCategoryPage({
        ctx,
        data: category,
        preview,
      });

      return withJsonLd(content, jsonLdEntries);
    }

    const content = await renderCategoryPage({
      store: ctx.store,
      store_id: ctx.store.id,
      preview,
      data: category,
    });

    return withJsonLd(content, jsonLdEntries);
  }

  if (decision.type === "short") {
 const product = await loadProductByShortOrBase62Cached(
  ctx.store.id,
  decision.code,
);

    if (product) {
      const seoMode = await getSeoUrlModeCached(ctx.store.id);
      const row = product.product;
      const title = s(row?.seo?.seo_title) || s(row?.name) || storeName;
      const description = getProductDescription(row, storeDescription);
      const canonicalPath = getProductCanonicalPath(product, seoMode);
     const image = getProductImage(row);
      const bootstrapForJsonLd = isMalakTheme(ctx)
        ? await buildMalakBootstrap({
            ctx,
            seoMode,
          })
        : null;

      const productVmForJsonLd = bootstrapForJsonLd
        ? buildProductJsonLdVm({
            product: row,
            bootstrap: bootstrapForJsonLd,
          })
        : null;
      const jsonLdEntries = buildProductJsonLdEntries({
        origin,
        canonicalPath,
        product: row,
                productVm: productVmForJsonLd,
        title,
        description,
        image,
        storeName,
        seoMode,
      });

      if (isMalakTheme(ctx)) {
        const content = await renderMalakProductPage({
          ctx,
          data: product,
          preview,
        });

        return withJsonLd(content, jsonLdEntries);
      }

      const content = await renderProductPage({
        store: ctx.store,
        store_id: ctx.store.id,
        preview,
        data: product,
      });

      return withJsonLd(content, jsonLdEntries);
    }

 const rawCategory = await loadCategoryByShortOrBase62Cached(
  ctx.store.id,
  decision.code,
);

    if (rawCategory) {
      const category = await attachCatalogFiltersToCategoryData({
        storeId: ctx.store.id,
        data: rawCategory,
        searchParams: sp,
      });
      const seoMode = await getSeoUrlModeCached(ctx.store.id);
      const row = category.category;
      const title = s(row?.seo_title) || s(row?.name) || storeName;
      const description = getCategoryDescription(row, storeDescription);
      const canonicalPath = getCategoryCanonicalPath(category, seoMode);

      const jsonLdEntries = buildCategoryJsonLdEntries({
        origin,
        canonicalPath,
        title,
        description,
        products: category?.products,
        seoMode,
      });

      if (isMalakTheme(ctx)) {
        const content = await renderMalakCategoryPage({
          ctx,
          data: category,
          preview,
        });

        return withJsonLd(content, jsonLdEntries);
      }

      const content = await renderCategoryPage({
        store: ctx.store,
        store_id: ctx.store.id,
        preview,
        data: category,
      });

      return withJsonLd(content, jsonLdEntries);
    }

    return notFound();
  }

  return notFound();
}