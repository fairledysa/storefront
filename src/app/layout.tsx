// FILE: apps/storefront/src/app/layout.tsx

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

const storeRootStyle = {
  "--font-store": "Tajawal, Arial, sans-serif",
  "--primary": "#00a98f",
  "--primary-foreground": "#ffffff",
} as CSSProperties;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
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

async function loadGoogleSiteVerificationCodeForCurrentStore() {
  try {
    const ctx = await resolveStoreContext();
    const storeId = s((ctx.store as any)?.id);

    if (!storeId) return "";

    const sb: any = await getStoreDb(storeId);

    const { data: appData, error: appError } = await sb
      .from("app_catalog")
      .select("id,key")
      .eq("key", GOOGLE_SITE_VERIFICATION_APP_KEY)
      .maybeSingle();

    if (appError || !appData?.id) return "";

    const appId = s(appData.id);

    if (!appId) return "";

    const { data: installationData, error: installationError } = await sb
      .from("store_app_installations")
      .select("id,store_id,app_id,status,config_status")
      .eq("store_id", storeId)
      .eq("app_id", appId)
      .neq("status", "uninstalled")
      .limit(1)
      .maybeSingle();

    if (installationError || !installationData?.id) return "";

    const installationId = s(installationData.id);

    if (!installationId) return "";

    const { data: configData, error: configError } = await sb
      .from("store_app_configs")
      .select("id,enabled,public_config,metadata")
      .eq("store_id", storeId)
      .eq("app_id", appId)
      .eq("installation_id", installationId)
      .maybeSingle();

    if (configError || !configData) return "";
    if (configData.enabled === false) return "";

    const publicConfig = safeObject(configData.public_config);

    return (
      extractGoogleVerificationCode(publicConfig.verification_code) ||
      extractGoogleVerificationCode(publicConfig.verification_meta_tag)
    );
  } catch (error) {
    console.error("GOOGLE_SITE_VERIFICATION_HEAD_LOAD_FAILED", error);
    return "";
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const googleSiteVerificationCode =
    await loadGoogleSiteVerificationCodeForCurrentStore();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {googleSiteVerificationCode ? (
          <meta
            name="google-site-verification"
            content={googleSiteVerificationCode}
          />
        ) : null}
      </head>

      <body style={storeRootStyle}>{children}</body>
    </html>
  );
}