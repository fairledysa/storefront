import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getSeoUrlMode, type SeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";
import { loadMarketingCollection } from "@/data/marketing/marketing-collections.server";
import { toProductCardVM } from "@/data/viewmodels/product.vm";
import { buildProductHref } from "@/lib/seo/build-store-href";
import { buildProductHref as buildStoreProductHref } from "@/lib/seo/build-store-href";
import MalakTheme from "@/themes/malak";
import MarketingCollectionScreen from "@/themes/malak/screens/marketing-collection/MarketingCollectionScreen";
import MarketingCollectionMobileScreen from "@/themes/malak/screens-mobile/marketing/MarketingCollectionMobileScreen";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await resolveStoreContext();
  const storeId = text(ctx?.store?.id);
  const collection = storeId
    ? await loadMarketingCollection({ storeId, slug, channel: "web" })
    : null;

  if (!collection) {
    return {
      title: "المجموعة غير موجودة",
      robots: { index: false, follow: false },
    };
  }

  const storeName = text(ctx?.store?.name);
  const title = storeName
    ? `${collection.title} | ${storeName}`
    : collection.title;
  const description =
    collection.description || collection.subtitle || undefined;
  const image = collection.imageUrl || collection.mobileImageUrl;

  return {
    title,
    description,
    alternates: { canonical: collection.canonicalPath },
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
      type: "website",
    },
  };
}

export default async function MarketingCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx: any = await resolveStoreContext();
  const storeId = text(ctx?.store?.id);
  if (!storeId) return notFound();

  const collection = await loadMarketingCollection({
    storeId,
    slug,
    channel: "web",
  });
  if (!collection) return notFound();

  const decodedSlug = (() => {
    try {
      return decodeURIComponent(slug);
    } catch {
      return slug;
    }
  })();

  // أي رابط بديل مثل /collections/trends أو UUID يتحول للرابط المحفوظ الحقيقي.
  if (decodedSlug !== collection.slug) {
    redirect(collection.canonicalPath);
  }

  const h = await headers();
  const device = deviceFromHeaders(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );
  const seoMode = await getSeoUrlMode(storeId);
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
      themeOptions: ctx?.theme?.options ?? null,
      version_id: ctx?.theme?.version_id ?? "published",
    }),
    getInitialCartCount(storeId),
  ]);

  const productCards = collection.products.map((product: any) =>
    toProductCardVM({
      storeSlug: "",
      product: {
        ...product,
        href: resolveProductHref(product, seoMode),
      },
      currencies: bootstrap?.currencies ?? null,
      tax: bootstrap?.tax ?? null,
    }),
  );

  const normalizedCollection = {
    ...collection,
    products: productCards,
  };

  const appCtx = {
    ...ctx,
    device,
    seoMode,
    bootstrap,
    initialCartCount,
    data: { route: "marketing_collection", collection: normalizedCollection, bootstrap },
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
        <MarketingCollectionMobileScreen collection={normalizedCollection} />
      ) : (
        <MarketingCollectionScreen collection={normalizedCollection} />
      )}
    </MalakTheme>
  );
}
