import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getStoreDb } from "@/data/db/store-db.server";
import { getProductsByIds } from "@/data/catalog/products";
import { getSeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";
import { buildProductHref } from "@/lib/seo/build-store-href";
import BasitTheme from "@/themes/basit";
import VideosScreen from "@/themes/basit/screens/videos/VideosScreen";

const text = (value: unknown) => String(value ?? "").trim();
const safeArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

function bool(value: unknown, fallback = false) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = text(value).toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function deviceFromHeaders(userAgent: string, mobileHint: string | null) {
  if (mobileHint === "?1") return "mobile" as const;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent)
    ? ("mobile" as const)
    : ("desktop" as const);
}

function collectProductCategoryIds(product: any) {
  const ids = new Set<string>();

  const push = (value: unknown) => {
    const id = text(value);
    if (id) ids.add(id);
  };

  const pushItem = (value: any) => {
    if (value && typeof value === "object") {
      push(value.id ?? value.category_id ?? value.categoryId ?? value.value);
      return;
    }
    push(value);
  };

  const pushMany = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) pushItem(item);
  };

  push(product?.category_id);
  push(product?.categoryId);
  push(product?.main_category_id);
  push(product?.mainCategoryId);
  push(product?.primary_category_id);
  push(product?.primaryCategoryId);

  pushMany(product?.category_ids);
  pushMany(product?.categoryIds);
  pushMany(product?.categories);
  pushMany(product?.category_links);
  pushMany(product?.categoryLinks);
  pushMany(product?.seo?.categories);
  pushMany(product?.metadata?.category_ids);
  pushMany(product?.metadata?.categoryIds);

  return Array.from(ids);
}

type VideoCategory = { id: string; name: string };

function flattenNavigationCategories(value: unknown): VideoCategory[] {
  const output: VideoCategory[] = [];
  const seen = new Set<string>();

  const visit = (rows: unknown) => {
    if (!Array.isArray(rows)) return;

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, any>;
      const id = text(item.id ?? item.category_id ?? item.categoryId);
      const name = text(item.name ?? item.title ?? item.label);

      if (id && name && !seen.has(id)) {
        seen.add(id);
        output.push({ id, name });
      }

      visit(item.children);
      visit(item.subcategories);
      visit(item.sub_categories);
      visit(item.items);
    }
  };

  visit(value);
  return output;
}

function productHref(product: any, mode: any) {
  const publicNo = Number(product?.public_no ?? product?.publicNo ?? 0);
  const fallback = text(product?.href ?? product?.url ?? product?.permalink);
  if (!Number.isFinite(publicNo) || publicNo <= 0) return fallback || "#";

  return buildProductHref({
    mode: mode || "named_ar",
    slugNameAr: text(product?.slug_name_ar ?? product?.name_ar ?? product?.name ?? product?.title),
    slugNameEn: text(product?.slug_name_en ?? product?.name_en ?? product?.slug ?? product?.name),
    publicNo,
    shortCode: text(product?.short_url ?? product?.shortUrl) || null,
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx: any = await resolveStoreContext();
  const storeName = text(ctx?.store?.name);
  return {
    title: storeName ? `فيديوهات المنتجات | ${storeName}` : "فيديوهات المنتجات",
    description: "شاهد فيديوهات المنتجات وتسوق مباشرة من تجربة الفيديوهات القصيرة.",
    alternates: { canonical: "/videos" },
  };
}

export default async function ProductVideosPage() {
  const ctx: any = await resolveStoreContext();
  const storeId = text(ctx?.store?.id);
  const themeKey = text(ctx?.theme?.theme_key ?? ctx?.theme?.key);
  if (!storeId || themeKey !== "basit") notFound();

  const themeOptions = ctx?.theme?.options ?? {};
  if (!bool(themeOptions.enable_product_video_shorts, false)) notFound();

  const h = await headers();
  const device = deviceFromHeaders(h.get("user-agent") || "", h.get("sec-ch-ua-mobile"));
  const seoMode = await getSeoUrlMode(storeId);
  const db: any = await getStoreDb(storeId);

  const mediaResult = await db
    .from("product_media")
    .select("id,product_id,original_url,thumbnail_url,video_url,mux_playback_id,created_at,sort_order")
    .eq("store_id", storeId)
    .eq("media_kind", "video")
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(120);

  if (mediaResult.error) throw mediaResult.error;

  const uniqueMedia: any[] = [];
  const seen = new Set<string>();
  for (const media of safeArray(mediaResult.data)) {
    const productId = text(media?.product_id);
    const videoUrl = text(media?.video_url ?? media?.original_url);
    if (!productId || !videoUrl || seen.has(productId)) continue;
    seen.add(productId);
    uniqueMedia.push(media);
  }

  const productIds = uniqueMedia.map((media) => text(media.product_id)).filter(Boolean);
  const products = productIds.length
    ? await getProductsByIds({ store_id: storeId, ids: productIds, limit: productIds.length })
    : [];
  const productById = new Map(products.map((product: any) => [text(product?.id), product]));

  const baseItems = uniqueMedia.flatMap((media) => {
    const product = productById.get(text(media.product_id));
    if (!product) return [];

    const title = text(product?.name ?? product?.title) || "المنتج";
    const priceValue = Number(product?.sale_price ?? product?.price ?? product?.final_price ?? 0);
    const currency = text(product?.currency_symbol ?? product?.currency?.symbol ?? "SAR");
    const image = text(
      product?.image_url ?? product?.thumbnail_url ?? product?.image ?? product?.images?.[0]?.url,
    );
    const rating = Number(product?.rating?.average ?? product?.rating_average ?? product?.rating ?? 0);
    const reviewsCount = Number(
      product?.rating?.count ?? product?.reviews_count ?? product?.reviewsCount ?? 0,
    );

    return [{
      id: text(product?.id),
      title,
      href: productHref(product, seoMode),
      price: Number.isFinite(priceValue) && priceValue > 0 ? `${priceValue.toFixed(2)} ${currency}` : "",
      image,
      videoSrc: text(media?.video_url ?? media?.original_url),
      poster: text(media?.thumbnail_url) || image,
      rating: Number.isFinite(rating) ? rating : 0,
      reviewsCount: Number.isFinite(reviewsCount) ? reviewsCount : 0,
      raw: product,
    }];
  });

  const [bootstrap, initialCartCount] = await Promise.all([
    getMalakBootstrap({
      store: {
        id: ctx.store.id,
        slug: ctx.store.slug,
        name: ctx.store.name,
        logo_url: ctx.store.logo_url ?? null,
        favicon_url: ctx.store.favicon_url ?? null,
      },
      seoMode,
      themeOptions,
      version_id: ctx?.theme?.version_id ?? "published",
    }),
    getInitialCartCount(storeId),
  ]);

  const navigationCategories = flattenNavigationCategories(
    (bootstrap as any)?.navigation?.categories ??
      (bootstrap as any)?.categories ??
      (bootstrap as any)?.store?.categories ??
      [],
  );
  const categoryById = new Map(navigationCategories.map((entry) => [entry.id, entry]));

  const items = baseItems.map((item) => {
    const categoryIds = collectProductCategoryIds(item.raw);
    const categories = categoryIds
      .map((id) => categoryById.get(id))
      .filter((entry): entry is VideoCategory => Boolean(entry));

    return {
      ...item,
      raw: {
        ...(item.raw ?? {}),
        category_ids: categoryIds,
        categories,
      },
    };
  });

  const reviewsOptions = (bootstrap as any)?.storeOptions?.reviews ?? (bootstrap as any)?.options?.reviews ?? {};
  const questionsEnabled = reviewsOptions?.questionsEnabled !== false;
  const allowGuestQuestions = reviewsOptions?.allowGuestQuestions === true;
  const commentsEnabled = bool(themeOptions.show_product_video_comments, false);

  const appCtx = {
    ...ctx,
    device,
    seoMode,
    bootstrap,
    initialCartCount,
    data: { route: "videos", videos: items, bootstrap },
    theme: {
      ...(ctx?.theme ?? {}),
      key: "basit",
      theme_key: "basit",
      version_id: ctx?.theme?.version_id ?? "published",
      options: themeOptions,
    },
  };

  return (
    <BasitTheme ctx={appCtx}>
      <VideosScreen
        items={items}
        commentsEnabled={commentsEnabled}
        questionsEnabled={questionsEnabled}
        allowGuestQuestions={allowGuestQuestions}
      />
    </BasitTheme>
  );
}
