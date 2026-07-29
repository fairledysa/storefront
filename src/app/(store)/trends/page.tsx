import type { Metadata } from "next";
import { headers } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getSeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";
import { loadLiveTrendCollections } from "@/data/marketing/trends.server";
import { toProductCardVM } from "@/data/viewmodels/product.vm";
import { buildProductHref as buildStoreProductHref } from "@/lib/seo/build-store-href";
import MalakTheme from "@/themes/malak";
import TrendsScreen from "@/themes/malak/screens/trends/TrendsScreen";
import TrendsMobileScreen from "@/themes/malak/screens-mobile/marketing/TrendsMobileScreen";

function text(value: unknown) {
  return String(value ?? "").trim();
}


function productHrefFromStoreRouting(product: any, seoMode: any) {
  const publicNo = Number(
    product?.public_no ??
      product?.publicNo ??
      product?.seo?.public_no ??
      product?.seo?.publicNo ??
      product?.metadata?.public_no ??
      product?.metadata?.publicNo ??
      0,
  );

  if (!Number.isFinite(publicNo) || publicNo <= 0) {
    return text(product?.href) || text(product?.url) || "#";
  }

  return buildStoreProductHref({
    mode: seoMode || "named_ar",
    slugNameAr:
      text(product?.slug_name_ar) ||
      text(product?.slugNameAr) ||
      text(product?.name_ar) ||
      text(product?.name) ||
      text(product?.title),
    slugNameEn:
      text(product?.slug_name_en) ||
      text(product?.slugNameEn) ||
      text(product?.name_en) ||
      text(product?.slug) ||
      text(product?.name) ||
      text(product?.title),
    publicNo,
    shortCode:
      text(product?.short_url) ||
      text(product?.shortUrl) ||
      text(product?.seo?.short_url) ||
      text(product?.seo?.shortUrl),
  });
}

function deviceFromHeaders(userAgent: string, mobileHint: string | null) {
  if (mobileHint === "?1") return "mobile" as const;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent)
    ? ("mobile" as const)
    : ("desktop" as const);
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await resolveStoreContext();
  const storeName = text(ctx?.store?.name);
  const title = storeName ? `الترندات | ${storeName}` : "الترندات";
  return {
    title,
    description: "اكتشف جميع الترندات والمنتجات الرائجة الآن.",
    alternates: { canonical: "/trends" },
  };
}

export default async function TrendsPage() {
  const ctx: any = await resolveStoreContext();
  const storeId = text(ctx?.store?.id);
  const h = await headers();
  const device = deviceFromHeaders(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );
  const seoMode = await getSeoUrlMode(storeId);

  const [bootstrap, initialCartCount, rawTrends] = await Promise.all([
    getMalakBootstrap({
      store: {
        id: ctx.store.id,
        slug: ctx.store.slug,
        name: ctx.store.name,
        logo_url: ctx.store.logo_url ?? null,
        favicon_url: ctx.store.favicon_url ?? null,
      },
      seoMode,
      themeOptions: ctx?.theme?.options ?? null,
      version_id: ctx?.theme?.version_id ?? "published",
    }),
    getInitialCartCount(storeId),
    loadLiveTrendCollections({ storeId, previewProducts: 4 }),
  ]);

  const trends = rawTrends.map((trend) => ({
    ...trend,
    products: trend.products.map((product: any) =>
      toProductCardVM({
        storeSlug: text(ctx?.store?.slug),
        product: { ...product, href: productHrefFromStoreRouting(product, seoMode) },
        currencies: bootstrap?.currencies ?? null,
        tax: bootstrap?.tax ?? null,
      }),
    ),
  }));

  const appCtx = {
    ...ctx,
    device,
    seoMode,
    bootstrap,
    initialCartCount,
    data: { route: "trends", trends, bootstrap },
    theme: {
      ...(ctx?.theme ?? {}),
      key: "malak",
      theme_key: "malak",
      version_id: ctx?.theme?.version_id ?? "published",
      options: ctx?.theme?.options ?? {},
    },
  };

  return (
    <MalakTheme ctx={appCtx}>
      {device === "mobile" ? <TrendsMobileScreen trends={trends} /> : <TrendsScreen trends={trends} />}
    </MalakTheme>
  );
}
