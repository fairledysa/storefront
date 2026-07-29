import type { Metadata } from "next";
import { headers } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getSeoUrlMode, type SeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";
import { loadLiveMarketingHubCollections } from "@/data/marketing/marketing-hubs.server";
import { MARKETING_HUBS, type MarketingHubType } from "@/data/marketing/marketing-hubs.config";
import { toProductCardVM } from "@/data/viewmodels/product.vm";
import { buildProductHref } from "@/lib/seo/build-store-href";
import MalakTheme from "@/themes/malak";
import MarketingHubScreen from "@/themes/malak/screens/marketing-hub/MarketingHubScreen";
import MarketingHubMobileScreen from "@/themes/malak/screens-mobile/marketing/MarketingHubMobileScreen";

function text(value: unknown) {
  return String(value ?? "").trim();
}

// نفس قاعدة صفحة التصنيف: نحترم href القادم من مصدر المنتجات أولًا،
// وإذا لم يوجد نبنيه فقط عبر مولد روابط المتجر الرسمي.
function resolveProductHref(product: any, mode: SeoUrlMode) {
  const existingHref = text(product?.href) || text(product?.url);
  if (existingHref) return existingHref;

  return buildProductHref({
    mode,
    slugNameAr: product?.name ?? product?.title ?? "",
    slugNameEn: product?.slug ?? product?.name ?? product?.title ?? "",
    publicNo: Number(product?.public_no ?? product?.publicNo ?? 0),
    shortCode: product?.short_url ?? product?.shortUrl ?? null,
  });
}

function deviceFromHeaders(userAgent: string, mobileHint: string | null) {
  if (mobileHint === "?1") return "mobile" as const;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent)
    ? ("mobile" as const)
    : ("desktop" as const);
}

export async function buildMarketingHubMetadata(
  type: MarketingHubType,
): Promise<Metadata> {
  const config = MARKETING_HUBS[type];
  const ctx = await resolveStoreContext();
  const storeName = text(ctx?.store?.name);
  const title = storeName ? `${config.title} | ${storeName}` : config.title;

  return {
    title,
    description: config.description,
    alternates: { canonical: config.path },
  };
}

export default async function MarketingHubPage({
  type,
}: {
  type: MarketingHubType;
}) {
  const config = MARKETING_HUBS[type];
  const ctx: any = await resolveStoreContext();
  const storeId = text(ctx?.store?.id);
  const h = await headers();
  const device = deviceFromHeaders(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );
  const seoMode = await getSeoUrlMode(storeId);

  const [bootstrap, initialCartCount, rawCollections] = await Promise.all([
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
    loadLiveMarketingHubCollections({ storeId, type, previewProducts: 4 }),
  ]);

  const currencies = bootstrap?.currencies ?? null;
  const tax = bootstrap?.tax ?? null;

  const collections = rawCollections.map((collection) => ({
    ...collection,
    products: collection.products.map((product: any) =>
      toProductCardVM({
        // مطابق لصفحة التصنيف؛ لا نضيف storeSlug على الرابط ولا نخترع مسارًا.
        storeSlug: "",
        product: {
          ...product,
          href: resolveProductHref(product, seoMode),
        },
        currencies,
        tax,
      }),
    ),
  }));

  const appCtx = {
    ...ctx,
    device,
    seoMode,
    bootstrap,
    initialCartCount,
    data: { route: `marketing_hub_${type}`, collections, bootstrap },
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
      {device === "mobile" ? (
        <MarketingHubMobileScreen config={config} collections={collections} />
      ) : (
        <MarketingHubScreen config={config} collections={collections} />
      )}
    </MalakTheme>
  );
}
