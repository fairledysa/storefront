// FILE: apps/storefront/src/app/(store)/page.tsx

import { cache } from "react";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { resolveTheme } from "@/theme-engine/runtime/resolve-theme";
import { loadPageLayout } from "@/theme-engine/layouts/load-page-layout";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { renderTemplate } from "@/theme-engine/runtime/render-template";

import MalakTheme from "@/themes/malak";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { renderMalakMaintenancePage } from "@/themes/malak/screens/maintenance/render-maintenance-page";

import { getSeoMeta, getSeoUrlMode } from "@/data/store/settings";
import { getStoreMaintenanceSettings } from "@/data/store/maintenance";
import { loadHomePage } from "@/data/pages/home.loader";

const getStoreContextCached = cache(async () => {
  return await resolveStoreContext();
});

const getSeoMetaCached = cache(async (storeId: string) => {
  return await getSeoMeta(storeId);
});

const getSeoUrlModeCached = cache(async (storeId: string) => {
  return await getSeoUrlMode(storeId);
});

const loadHomePageCached = cache(
  async (storeId: string, themeOptions: Record<string, any>) => {
    return await loadHomePage({
      store_id: storeId,
      limit: 24,
      themeOptions,
    });
  },
);

function safeText(input?: string | null) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function s(input: unknown) {
  return String(input ?? "").trim();
}

type PreviewDevice = "mobile" | "desktop";
type StoreSearchParams = Record<string, string | string[] | undefined>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * يعرض نسخة الجوال الحقيقية فقط داخل iframe محرر الثيم.
 * زيارة المتجر العامة لا تتأثر بهذا المعامل.
 */
function getThemeEditorPreviewDevice(
  searchParams?: StoreSearchParams,
): PreviewDevice | null {
  const preview = s(firstSearchParam(searchParams?.preview));
  const themeEditor = s(firstSearchParam(searchParams?.themeEditor));
  const requested = s(
    firstSearchParam(searchParams?.themeEditorDevice),
  ).toLowerCase();

  if (preview !== "1" || themeEditor !== "1") return null;
  if (requested === "mobile" || requested === "desktop") return requested;

  return null;
}

function normalizeKeywords(input?: string | null) {
  const value = safeText(input);
  if (!value) return undefined;

  return value
    .replace(/،/g, ",")
    .split(/[\s,|/]+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

function safeObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function detectDeviceFromUA(ua: string) {
  return /android|iphone|ipad|ipod|mobile/i.test(String(ua || ""))
    ? ("mobile" as const)
    : ("desktop" as const);
}

async function getOriginSafe() {
  const h = await headers();

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_DEV_HOST ??
    "localhost:3003";

  const proto =
    h.get("x-forwarded-proto") ??
    process.env.NEXT_PUBLIC_DEV_PROTOCOL ??
    "http";

  return `${proto}://${host}`;
}

function metadataBaseFromOrigin(origin: string) {
  try {
    return new URL(origin);
  } catch {
    return undefined;
  }
}

function normalizeSeoImage(origin: string, value: unknown) {
  const raw = s(value);
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  if (raw.startsWith("/")) {
    return `${origin.replace(/\/+$/g, "")}${raw}`;
  }

  return raw;
}

function looksLikeImage(value: unknown) {
  const raw = s(value);
  if (!raw) return false;
  if (raw.startsWith("data:")) return false;

  const lower = raw.toLowerCase();

  return (
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(lower) ||
    lower.includes("/images/") ||
    lower.includes("/image/") ||
    lower.includes("cdn.") ||
    lower.includes("r2.") ||
    lower.includes("supabase")
  );
}

function collectImageCandidates(
  value: any,
  out: string[],
  depth = 0,
  seen = new Set<any>(),
) {
  if (out.length >= 60) return;
  if (depth > 5) return;
  if (!value) return;

  if (typeof value === "string") {
    if (looksLikeImage(value)) out.push(value);
    return;
  }

  if (typeof value !== "object") return;
  if (seen.has(value)) return;

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 30)) {
      collectImageCandidates(item, out, depth + 1, seen);
      if (out.length >= 60) break;
    }

    return;
  }

  const preferredKeys = [
    "og_image",
    "ogImage",
    "seo_og_image",
    "seoOgImage",
    "image_url",
    "imageUrl",
    "desktop_image",
    "desktopImage",
    "mobile_image",
    "mobileImage",
    "background_image",
    "backgroundImage",
    "banner_image",
    "bannerImage",
    "hero_image",
    "heroImage",
    "cover_image",
    "coverImage",
    "thumbnail_url",
    "thumbnailUrl",
    "original_url",
    "originalUrl",
    "url",
    "src",
  ];

  for (const key of preferredKeys) {
    if (key in value) {
      collectImageCandidates(value[key], out, depth + 1, seen);
      if (out.length >= 60) return;
    }
  }

  for (const key of Object.keys(value)) {
    if (preferredKeys.includes(key)) continue;

    collectImageCandidates(value[key], out, depth + 1, seen);
    if (out.length >= 60) return;
  }
}

function firstImageCandidate(origin: string, values: unknown[]) {
  for (const value of values) {
    const raw = s(value);
    if (!raw) continue;
    if (!looksLikeImage(raw)) continue;

    const normalized = normalizeSeoImage(origin, raw);
    if (normalized) return normalized;
  }

  return "";
}

function getStaticHomeSeoImage(args: {
  origin: string;
  store: any;
  seo: any;
  themeOptions?: Record<string, any>;
  bootstrap?: any;
}) {
  const themeOptions = safeObject(args.themeOptions);
  const bootstrap = safeObject(args.bootstrap);

  return firstImageCandidate(args.origin, [
    args.seo?.og_image,
    args.seo?.ogImage,
    args.seo?.image,
    args.seo?.image_url,
    args.seo?.imageUrl,

    args.store?.logo_url,
    args.store?.logoUrl,
    args.store?.favicon_url,
    args.store?.faviconUrl,

    themeOptions?.seo?.og_image,
    themeOptions?.seo?.ogImage,
    themeOptions?.og_image,
    themeOptions?.ogImage,
    themeOptions?.logo_url,
    themeOptions?.logoUrl,
    themeOptions?.favicon_url,
    themeOptions?.faviconUrl,
    themeOptions?.brand?.logo_url,
    themeOptions?.brand?.logoUrl,
    themeOptions?.branding?.logo_url,
    themeOptions?.branding?.logoUrl,
    themeOptions?.identity?.logo_url,
    themeOptions?.identity?.logoUrl,
    themeOptions?.header?.logo_url,
    themeOptions?.header?.logoUrl,
    themeOptions?.header?.logo,
    themeOptions?.homepage?.og_image,
    themeOptions?.homepage?.ogImage,
    themeOptions?.homepage?.image_url,
    themeOptions?.homepage?.imageUrl,
    themeOptions?.home?.og_image,
    themeOptions?.home?.ogImage,
    themeOptions?.hero?.image_url,
    themeOptions?.hero?.imageUrl,
    themeOptions?.hero?.desktop_image,
    themeOptions?.hero?.desktopImage,

    bootstrap?.store?.logo_url,
    bootstrap?.store?.logoUrl,
    bootstrap?.store?.favicon_url,
    bootstrap?.store?.faviconUrl,
    bootstrap?.logo_url,
    bootstrap?.logoUrl,
    bootstrap?.favicon_url,
    bootstrap?.faviconUrl,
    bootstrap?.header?.logo_url,
    bootstrap?.header?.logoUrl,
    bootstrap?.header?.logo,
    bootstrap?.brand?.logo_url,
    bootstrap?.brand?.logoUrl,
    bootstrap?.branding?.logo_url,
    bootstrap?.branding?.logoUrl,
    bootstrap?.identity?.logo_url,
    bootstrap?.identity?.logoUrl,
  ]);
}

function extractHomeSeoImage(args: {
  origin: string;
  store: any;
  seo: any;
  themeOptions?: Record<string, any>;
  bootstrap?: any;
  homeData?: any;
}) {
  const staticImage = getStaticHomeSeoImage({
    origin: args.origin,
    store: args.store,
    seo: args.seo,
    themeOptions: args.themeOptions,
    bootstrap: args.bootstrap,
  });

  if (staticImage) return staticImage;

  const candidates: string[] = [];
  collectImageCandidates(args.homeData, candidates);

  return firstImageCandidate(args.origin, candidates);
}

function buildHomeJsonLdEntries(args: {
  origin: string;
  storeName: string;
  description: string;
  image?: string;
}) {
  const origin = args.origin.replace(/\/+$/g, "");
  const image = s(args.image);

  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${origin}/#store`,
    name: args.storeName,
    description: args.description,
    url: `${origin}/`,
    ...(image ? { logo: image, image } : {}),
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: args.storeName,
    description: args.description,
    url: `${origin}/`,
    publisher: {
      "@id": `${origin}/#store`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return [
    {
      id: "mk-jsonld-store",
      data: storeJsonLd,
    },
    {
      id: "mk-jsonld-website",
      data: websiteJsonLd,
    },
  ];
}

function JsonLdScript({
  id,
  data,
}: {
  id: string;
  data: Record<string, any>;
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function HomeJsonLdScripts({
  entries,
}: {
  entries: Array<{ id: string; data: Record<string, any> }>;
}) {
  return (
    <>
      {entries.map((entry) => (
        <JsonLdScript key={entry.id} id={entry.id} data={entry.data} />
      ))}
    </>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getStoreContextCached();
  if (!ctx?.store) return {};

  const store = ctx.store;
  const themeOptions = safeObject(ctx.theme?.options);

  const origin = await getOriginSafe();
  const canonical = `${origin.replace(/\/+$/g, "")}/`;
  const metadataBase = metadataBaseFromOrigin(origin);

  const maintenance = await getStoreMaintenanceSettings(store.id);

  if (maintenance.enabled) {
    const title = safeText(`${maintenance.title} | ${store.name}`);
    const description = safeText(
      maintenance.message || store.description || store.name,
    );

    const image = getStaticHomeSeoImage({
      origin,
      store,
      seo: {},
      themeOptions,
    });

    return {
      metadataBase,
      title,
      description,
      alternates: { canonical },
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
      openGraph: {
        type: "website",
        title,
        description,
        url: canonical,
        siteName: safeText(store.name),
        locale: "ar_AR",
        images: image
          ? [
              {
                url: image,
                width: 1200,
                height: 630,
                alt: title,
              },
            ]
          : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: image ? [image] : undefined,
      },
      icons: {
        icon: store.favicon_url || "/favicon.ico",
      },
    };
  }

  const seo = await getSeoMetaCached(store.id);

  const title = safeText(seo.title || store.name);
  const description = safeText(
    seo.description || store.description || store.name,
  );

  const keywords = normalizeKeywords(seo.keywords || title);
  let image = getStaticHomeSeoImage({
    origin,
    store,
    seo,
    themeOptions,
  });

  if (!image) {
    try {
      const homeData = await loadHomePageCached(store.id, themeOptions);

      image = extractHomeSeoImage({
        origin,
        store,
        seo,
        themeOptions,
        homeData,
      });
    } catch {
      image = "";
    }
  }

  const locale = safeText(seo.locale || "ar_AR") || "ar_AR";

  const other: Record<string, string> = {};
  if (seo.published_time) {
    other["store:published_time"] = String(seo.published_time);
  }

  const twitterHandle = seo.twitter_handle || undefined;

  return {
    metadataBase,
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: safeText(store.name) || title,
      locale,
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
      site: twitterHandle,
      creator: twitterHandle,
    },
    icons: {
      icon: store.favicon_url || "/favicon.ico",
    },
    other,
  };
}

export default async function StoreHomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const previewVal = Array.isArray(sp.preview) ? sp.preview[0] : sp.preview;
  const preview = previewVal === "1";
  const previewDevice = getThemeEditorPreviewDevice(sp);

  const ctx = await getStoreContextCached();
  if (!ctx?.store) return notFound();

  const store = ctx.store;

  const maintenance = await getStoreMaintenanceSettings(store.id);

  if (maintenance.enabled && !preview) {
    return await renderMalakMaintenancePage({
      ctx,
      settings: maintenance,
    });
  }

  const activeThemeKey = String(ctx.theme?.theme_key || "").trim();
  const isMalak = activeThemeKey === "malak";

  if (isMalak) {
    const h = await headers();
    const device =
      previewDevice ?? detectDeviceFromUA(h.get("user-agent") || "");

    const themeOptions = safeObject(ctx.theme?.options);

    const seoModePromise = getSeoUrlModeCached(store.id);
    const seoPromise = getSeoMetaCached(store.id);

    const homeDataPromise = loadHomePageCached(store.id, themeOptions);

    const bootstrapPromise = seoModePromise.then((seoMode) =>
      getMalakBootstrap({
        store: {
          id: store.id,
          slug: store.slug,
          name: store.name,
          logo_url: store.logo_url ?? null,
          favicon_url: store.favicon_url ?? null,
          description: store.description ?? null,
          default_currency: store.default_currency ?? null,
        },
        seoMode,
      }),
    );

    const [seoMode, seo, homeData, bootstrap] = await Promise.all([
      seoModePromise,
      seoPromise,
      homeDataPromise,
      bootstrapPromise,
    ]);

    const origin = await getOriginSafe();

    const seoTitle = safeText(seo.title || store.name);
    const seoDescription = safeText(
      seo.description || store.description || store.name,
    );

    const seoImage = extractHomeSeoImage({
      origin,
      store,
      seo,
      themeOptions,
      bootstrap,
      homeData,
    });

    const jsonLdEntries = buildHomeJsonLdEntries({
      origin,
      storeName: safeText(store.name) || seoTitle,
      description: seoDescription,
      image: seoImage,
    });

    const mergedData = {
      ...(homeData || {}),

      themeOptions,

      homepage: {
        ...((homeData as any)?.homepage || {}),
      },

      themeData: {
        ...((homeData as any)?.themeData || {}),
      },

      theme_data: {
        ...((homeData as any)?.theme_data || {}),
      },
    };

    const appCtx = {
      ...ctx,
      store,
      device,
      seoMode,
      data: mergedData,
      bootstrap,

      /*
       * مهم للأداء:
       * لا نقرأ عدد السلة من السيرفر في الصفحة الرئيسية العامة.
       * السلة بيانات شخصية وتتحدث لاحقًا من runtime/API.
       */
      initialCartCount: 0,

      theme: {
        key: "malak",
        version_id: ctx.theme?.version_id ?? "published",
        options: themeOptions,
      },
    };

    return (
      <>
        <HomeJsonLdScripts entries={jsonLdEntries} />
        <MalakTheme ctx={appCtx as any} />
      </>
    );
  }

  const theme = await resolveTheme({ store_id: store.id, preview });

  const [layout, custom, seo, origin] = await Promise.all([
    loadPageLayout({
      store_id: store.id,
      page_key: "home",
      preview,
    }),
    loadCustomCode({ store_id: store.id, preview }),
    getSeoMetaCached(store.id),
    getOriginSafe(),
  ]);

  const orgName = safeText(seo.title || store.name);
  const orgDesc = safeText(seo.description || store.description || store.name);
  const orgLogo = extractHomeSeoImage({
    origin,
    store,
    seo,
    themeOptions: safeObject(ctx.theme?.options),
  });

  const jsonLdEntries = buildHomeJsonLdEntries({
    origin,
    storeName: orgName,
    description: orgDesc,
    image: orgLogo,
  });

  return (
    <>
      <HomeJsonLdScripts entries={jsonLdEntries} />

      {custom.css ? (
        <style
          id="store-custom-css"
          dangerouslySetInnerHTML={{ __html: custom.css }}
        />
      ) : null}

      {custom.scripts.map((s) => (
        <Script
          key={s.src}
          src={s.src}
          strategy={s.strategy || "afterInteractive"}
        />
      ))}

      {renderTemplate({
        template: "home",
        themeCode: (theme as any)?.code,
        store,
        theme,
        sections: layout.sections,
      })}
    </>
  );
}