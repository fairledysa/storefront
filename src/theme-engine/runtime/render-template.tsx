// FILE: apps/storefront/src/theme-engine/runtime/render-template.tsx

import type { ReactNode } from "react";
import { headers } from "next/headers";

import { themeRegistry } from "@/theme-engine/registry";
import type { ThemeCode } from "@/theme-engine/types";
import { THEME_KIND } from "@/theme-engine/types";
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";
import { loadTheme } from "@/theme-engine/load-theme";

import { getSeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  favicon_url?: string | null;
};

type ThemeRuntime = {
  code: ThemeCode;
  settings: Record<string, any>;
};

export type StorefrontTemplate =
  | "home"
  | "category"
  | "product"
  | "cart"
  | "account"
  | "account/wallet"
  | "account/rewards"
  | "account/gift-balance"
  | "account/orders"
  | "account/order-details"
  | "account/addresses"
  | "account/tickets"
  | "account/refer"
  | "account/favorites";

function detectDeviceFromUA(ua: string) {
  const raw = String(ua || "").toLowerCase();

  const isMobile =
    raw.includes("iphone") ||
    raw.includes("android") ||
    raw.includes("ipad") ||
    raw.includes("ipod") ||
    raw.includes("mobile");

  return isMobile ? ("mobile" as const) : ("desktop" as const);
}

function safeObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

export async function renderTemplate({
  template,
  themeCode,
  store,
  theme,
  sections,
  data,
  children,
}: {
  template: StorefrontTemplate;
  themeCode: ThemeCode;
  store: StoreRow;
  theme: ThemeRuntime;
  sections?: LayoutSection[];
  data?: any;
  children?: ReactNode;
}) {
  const safeCode = (themeCode as any) || (theme?.code as any);
  const kind = THEME_KIND[safeCode as ThemeCode] || "legacy";
  const themeOptions = safeObject(theme?.settings);

  if (kind === "app-shell") {
    const h = await headers();
    const ua = h.get("user-agent") || "";
    const device = detectDeviceFromUA(ua);

    const loaded = loadTheme(safeCode as ThemeCode);
    const C = loaded.Component;

    if (!C) return null;

    const seoMode = await getSeoUrlMode(store.id);

    const [bootstrap, initialCartCount] = await Promise.all([
      getMalakBootstrap({
        store: {
          id: store.id,
          slug: store.slug,
          name: store.name,
          logo_url: store.logo_url ?? null,
          favicon_url: store.favicon_url ?? null,
        },
        seoMode,
        themeOptions,
        version_id: "published",
      }),

      getInitialCartCount(store.id),
    ]);

    const pageData = {
      ...safeObject(data),

      themeOptions,
      theme_options: themeOptions,

      bootstrap,

      navigation: {
        ...safeObject(data?.navigation),
        categories:
          data?.navigation?.categories ??
          bootstrap?.navigation?.categories ??
          [],
        mega_menu:
          data?.navigation?.mega_menu ??
          (bootstrap as any)?.navigation?.mega_menu ??
          null,
      },

      theme: {
        ...safeObject(data?.theme),
        key: safeCode,
        theme_key: safeCode,
        version_id: "published",
        options: themeOptions,
        bootstrap,
      },
    };

    return (
      <C
        ctx={{
          store: {
            id: store.id,
            name: store.name,
            logo_url: store.logo_url ?? null,
          },
          theme: {
            key: safeCode,
            version_id: "published",
            options: themeOptions,
          },
          device,
          seoMode,
          data: pageData,
          bootstrap,
          initialCartCount,
        }}
      >
        {children}
      </C>
    );
  }

  const reg = themeRegistry.has(safeCode)
    ? themeRegistry.get(safeCode)
    : themeRegistry.defaultTheme();

  const T = reg.templates[template as keyof typeof reg.templates];

  if (!T) return null;

  return (
    <T
      store={store}
      theme={{
        ...theme,
        settings: themeOptions,
      }}
      sections={sections || []}
      data={{
        ...safeObject(data),
        themeOptions,
        theme_options: themeOptions,
      }}
    />
  );
}