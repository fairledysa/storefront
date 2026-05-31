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

function safeText(input?: string | null) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKeywords(input?: string | null) {
  const s = safeText(input);
  if (!s) return undefined;

  return s
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

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getStoreContextCached();
  if (!ctx?.store) return {};

  const store = ctx.store;

  const origin = await getOriginSafe();
  const canonical = `${origin}/`;

  const maintenance = await getStoreMaintenanceSettings(store.id);

  if (maintenance.enabled) {
    const title = safeText(`${maintenance.title} | ${store.name}`);
    const description = safeText(
      maintenance.message || store.description || store.name,
    );

    return {
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
        images: store.logo_url
          ? [{ url: store.logo_url, width: 600, height: 300 }]
          : undefined,
      },
      twitter: {
        card: store.logo_url ? "summary_large_image" : "summary",
        title,
        description,
        images: store.logo_url ? [store.logo_url] : undefined,
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
  const image = seo.og_image || (store as any).logo_url || undefined;
  const locale = safeText(seo.locale || "ar_AR") || "ar_AR";

  const other: Record<string, string> = {};
  if (seo.published_time) {
    other["store:published_time"] = String(seo.published_time);
  }

  const twitterHandle = seo.twitter_handle || undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: title,
      locale,
      images: image ? [{ url: image, width: 600, height: 300 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
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
    const device = detectDeviceFromUA(h.get("user-agent") || "");

    const themeOptions = safeObject(ctx.theme?.options);

    const seoModePromise = getSeoUrlModeCached(store.id);

    const homeDataPromise = loadHomePage({
      store_id: store.id,
      limit: 24,
      themeOptions,
    });

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

    const [seoMode, homeData, bootstrap] = await Promise.all([
      seoModePromise,
      homeDataPromise,
      bootstrapPromise,
    ]);

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

    return <MalakTheme ctx={appCtx as any} />;
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
  const orgLogo = seo.og_image || (store as any).logo_url || undefined;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: orgName,
    description: orgDesc,
    url: origin,
    ...(orgLogo ? { logo: orgLogo } : {}),
  };

  return (
    <>
      <Script
        id="store-org-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

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