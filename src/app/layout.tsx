// FILE: apps/storefront/src/app/layout.tsx

import Script from "next/script";
import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Storefront",
  manifest: "/manifest.webmanifest",
  applicationName: "Storefront",
  appleWebApp: {
    capable: true,
    title: "Storefront",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Storefront",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

const GOOGLE_SITE_VERIFICATION_APP_KEY = "google_site_verification";
const GOOGLE_ANALYTICS_APP_KEY = "google_analytics";

const storeRootStyle = {
  "--font-store": "Tajawal, Arial, sans-serif",
  "--primary": "#00a98f",
  "--primary-foreground": "#ffffff",
} as CSSProperties;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {}
  }

  return {};
}

function extractGoogleVerificationCode(value: unknown) {
  const clean = s(value);

  if (!clean) return "";

  const contentMatch = clean.match(/content=["']([^"']+)["']/i);

  if (contentMatch?.[1]) {
    return s(contentMatch[1]);
  }

  if (clean.includes("<meta")) {
    return "";
  }

  return clean;
}

function cleanGoogleAnalyticsMeasurementId(value: unknown) {
  const id = s(value).toUpperCase();

  if (!id) return "";
  if (!/^G-[A-Z0-9]+$/.test(id)) return "";

  return id;
}

async function loadInstalledAppConfig(args: {
  storeId: string;
  appKey: string;
}) {
  const sb: any = await getStoreDb(args.storeId);

  const { data: appData, error: appError } = await sb
    .from("app_catalog")
    .select("id,key,slug")
    .eq("key", args.appKey)
    .maybeSingle();

  if (appError || !appData?.id) return null;

  const appId = s(appData.id);
  if (!appId) return null;

  const { data: installationData, error: installationError } = await sb
    .from("store_app_installations")
    .select("id,store_id,app_id,status,config_status,updated_at,installed_at")
    .eq("store_id", args.storeId)
    .eq("app_id", appId)
    .neq("status", "uninstalled")
    .order("updated_at", { ascending: false })
    .order("installed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (installationError || !installationData?.id) return null;

  const installationId = s(installationData.id);
  if (!installationId) return null;

  const { data: configData, error: configError } = await sb
    .from("store_app_configs")
    .select("id,enabled,public_config,private_config,metadata,updated_at")
    .eq("store_id", args.storeId)
    .eq("app_id", appId)
    .eq("installation_id", installationId)
    .maybeSingle();

  if (configError || !configData) return null;
  if (configData.enabled === false) return null;

  return {
    appId,
    installationId,
    installation: installationData,
    config: configData,
    publicConfig: safeObject(configData.public_config),
    privateConfig: safeObject(configData.private_config),
    metadata: safeObject(configData.metadata),
  };
}

async function loadTrackingSettingsForCurrentStore() {
  try {
    const ctx = await resolveStoreContext();
    const storeId = s((ctx.store as any)?.id);

    if (!storeId) {
      return {
        googleSiteVerificationCode: "",
        googleAnalyticsMeasurementId: "",
      };
    }

    const [siteVerification, googleAnalytics] = await Promise.all([
      loadInstalledAppConfig({
        storeId,
        appKey: GOOGLE_SITE_VERIFICATION_APP_KEY,
      }),
      loadInstalledAppConfig({
        storeId,
        appKey: GOOGLE_ANALYTICS_APP_KEY,
      }),
    ]);

    const googleSiteVerificationCode = siteVerification
      ? extractGoogleVerificationCode(
          siteVerification.publicConfig.verification_code,
        ) ||
        extractGoogleVerificationCode(
          siteVerification.publicConfig.verification_meta_tag,
        )
      : "";

    const googleAnalyticsMeasurementId = googleAnalytics
      ? cleanGoogleAnalyticsMeasurementId(
          googleAnalytics.publicConfig.measurement_id ||
            googleAnalytics.publicConfig.measurementId ||
            googleAnalytics.publicConfig.ga4_measurement_id ||
            googleAnalytics.publicConfig.ga4MeasurementId,
        )
      : "";

    return {
      googleSiteVerificationCode,
      googleAnalyticsMeasurementId,
    };
  } catch (error) {
    console.error("STORE_TRACKING_HEAD_LOAD_FAILED", error);

    return {
      googleSiteVerificationCode: "",
      googleAnalyticsMeasurementId: "",
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { googleSiteVerificationCode, googleAnalyticsMeasurementId } =
    await loadTrackingSettingsForCurrentStore();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {googleSiteVerificationCode ? (
          <meta
            name="google-site-verification"
            content={googleSiteVerificationCode}
          />
        ) : null}

        {googleAnalyticsMeasurementId ? (
          <>
            <Script
              id="store-google-analytics-loader"
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsMeasurementId}`}
              strategy="afterInteractive"
            />

            <Script
              id="store-google-analytics-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){window.dataLayer.push(arguments);}
                  window.gtag = window.gtag || gtag;
                  window.gtag('js', new Date());
                  window.gtag('config', '${googleAnalyticsMeasurementId}', {
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        ) : null}
      </head>

      <body style={storeRootStyle}>{children}</body>
    </html>
  );
}