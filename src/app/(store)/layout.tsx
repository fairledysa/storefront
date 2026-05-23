// FILE: apps/storefront/src/app/(store)/layout.tsx
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { THEME_KIND, type ThemeCode } from "@/theme-engine/types";
import { supabaseAdmin } from "@/data/store/supabase.server";

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

async function loadPwaSettings(storeId: string) {
  const sb: any = supabaseAdmin();

  const { data } = await sb
    .from("store_settings")
    .select("value,updated_at,created_at")
    .eq("store_id", storeId)
    .eq("slug", "app/pwa")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return safeObject(data?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await resolveStoreContext();
  const store = ctx.store as any;

  if (!store) return {};

  const pwa = await loadPwaSettings(store.id);
  const icon = safeObject(pwa.icon);

  const appName = s(pwa.app_name) || s(store.name);
  const shortName = (s(pwa.short_name) || appName).slice(0, 18);

  const iconUrl =
    s(icon.apple_180) ||
    s(icon.source) ||
    s(store.favicon_url) ||
    s(store.logo_url) ||
    "/favicon.ico";

  return {
    title: appName,
    description: store.description || undefined,
    applicationName: appName,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: iconUrl,
      apple: iconUrl,
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
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": shortName,
      "theme-color": s(pwa.theme_color) || "#0D3B45",
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

      {custom.scripts.map((s) => (
        <Script
          key={s.src}
          src={s.src}
          strategy={s.strategy || "afterInteractive"}
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

  const { default: StorefrontHeader } =
    await import("@/components/storefront/header");

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