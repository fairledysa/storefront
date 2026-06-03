// FILE: apps/storefront/src/app/(store)/layout.tsx

import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { THEME_KIND, type ThemeCode } from "@/theme-engine/types";

const PWA_SETTING_SLUGS = ["app/pwa", "store.pwa", "pwa"];

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function normalizeUrl(value: unknown) {
  const url = s(value);

  if (!url) return "";
  if (url.startsWith("http://")) return url;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;

  return `/${url}`;
}

function cleanColor(value: unknown, fallback: string) {
  const color = s(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function extractGoogleVerificationCode(value: unknown) {
  const clean = s(value);

  if (!clean) return "";

  const contentMatch = clean.match(/content=["']([^"']+)["']/i);
  if (contentMatch?.[1]) return s(contentMatch[1]);

  if (clean.includes("<meta")) return "";

  return clean;
}

async function loadPwaSettings(storeId: string) {
  const sb: any = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,updated_at,created_at")
    .eq("store_id", storeId)
    .in("slug", PWA_SETTING_SLUGS)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || !data.length) {
    return {};
  }

  return safeObject(data[0]?.value);
}

async function loadGoogleSiteVerificationCode(storeId: string) {
  const sb: any = await getStoreDb(storeId);

  const { data: installations, error: installationsError } = await sb
    .from("store_app_installations")
    .select("id,app_id,status,config_status,app_snapshot,updated_at,installed_at")
    .eq("store_id", storeId)
    .neq("status", "uninstalled")
    .order("updated_at", { ascending: false })
    .order("installed_at", { ascending: false })
    .limit(30);

  if (installationsError || !Array.isArray(installations)) {
    return "";
  }

  const installation = installations.find((row: any) => {
    const snapshot = safeObject(row?.app_snapshot);

    return (
      s(snapshot.key) === "google_site_verification" ||
      s(snapshot.slug) === "google-site-verification"
    );
  });

  if (!installation?.id) return "";

  const installationId = s(installation.id);
  const appId = s(installation.app_id);

  if (!installationId || !appId) return "";

  const { data: configData, error: configError } = await sb
    .from("store_app_configs")
    .select("id,enabled,public_config,metadata,updated_at")
    .eq("store_id", storeId)
    .eq("app_id", appId)
    .eq("installation_id", installationId)
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();

  if (configError || !configData?.id) return "";

  const publicConfig = safeObject(configData.public_config);
  const metadata = safeObject(configData.metadata);
  const googleSiteVerification = safeObject(metadata.google_site_verification);

  return (
    extractGoogleVerificationCode(publicConfig.verification_code) ||
    extractGoogleVerificationCode(publicConfig.verification_meta_tag) ||
    extractGoogleVerificationCode(googleSiteVerification.verification_code) ||
    extractGoogleVerificationCode(googleSiteVerification.verification_meta_tag)
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await resolveStoreContext();
  const store = ctx.store as any;

  if (!store) return {};

  const storeId = String(store.id);

  const [pwa, googleSiteVerificationCode] = await Promise.all([
    loadPwaSettings(storeId),
    loadGoogleSiteVerificationCode(storeId),
  ]);

  const icon = safeObject(pwa.icon);

  const appName = s(pwa.app_name) || s(store.name) || "Store";
  const shortName = (s(pwa.short_name) || appName).slice(0, 18);
  const themeColor = cleanColor(pwa.theme_color, "#0D3B45");

  const iconUrl = normalizeUrl(
    icon.apple_180 ||
      icon.source ||
      icon.pwa_192 ||
      icon.pwa_512 ||
      icon.maskable_512 ||
      store.favicon_url ||
      store.logo_url ||
      "/favicon.ico",
  );

  return {
    title: appName,
    description: s(store.description) || undefined,

    applicationName: appName,
    manifest: "/manifest.webmanifest",

    verification: googleSiteVerificationCode
      ? {
          google: googleSiteVerificationCode,
        }
      : undefined,

    icons: {
      icon: iconUrl,
      apple: iconUrl,
      shortcut: iconUrl,
    },

    appleWebApp: {
      capable: true,
      title: shortName,
      statusBarStyle: "default",
    },

    formatDetection: {
      telephone: false,
    },

    other: {
      "theme-color": themeColor,
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": shortName,
      "apple-mobile-web-app-status-bar-style": "default",
    },
  };
}

function resolveThemeCode(theme: any): ThemeCode {
  const code = String(
    theme?.theme_key ??
      theme?.themeCode ??
      theme?.theme_code ??
      theme?.code ??
      theme?.key ??
      theme?.theme?.key ??
      theme?.theme?.code ??
      "",
  ).trim();

  return (code || "classic") as ThemeCode;
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await resolveStoreContext();

  if (!ctx.store) return notFound();

  const activeCode = resolveThemeCode(ctx.theme);
  const kind = THEME_KIND[activeCode] || "legacy";
  const isAppShell = kind === "app-shell";

  const custom = await loadCustomCode({
    store_id: ctx.store.id,
    preview: false,
  });

  const CustomHead = (
    <>
      {custom.css ? (
        <style
          id="store-custom-css"
          dangerouslySetInnerHTML={{ __html: custom.css }}
        />
      ) : null}

      {custom.scripts.map((script) => (
        <Script
          key={script.src}
          src={script.src}
          strategy={script.strategy || "afterInteractive"}
        />
      ))}
    </>
  );

  if (isAppShell) {
    return (
      <>
        {CustomHead}
        {children}
      </>
    );
  }

  const { default: StorefrontHeader } = await import(
    "@/components/storefront/header"
  );

  return (
    <>
      {CustomHead}

      <div dir="rtl" className="min-h-screen bg-slate-50">
        <StorefrontHeader store={ctx.store as any} />

        {children}

        <footer className="border-t py-6 text-center text-sm text-slate-500">
          {ctx.store.name} © {new Date().getFullYear()}
        </footer>
      </div>
    </>
  );
}