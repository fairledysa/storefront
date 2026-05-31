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

type TimingMark = {
  name: string;
  ms: number;
};

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

function nowMs() {
  return Date.now();
}

function readNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function isRenderTimingEnabled() {
  const value = String(process.env.STOREFRONT_RENDER_TIMING || "")
    .trim()
    .toLowerCase();

  return value === "1" || value === "true" || value === "yes";
}

function renderTimingThresholdMs() {
  return Math.max(
    300,
    Math.min(
      10_000,
      readNumberEnv("STOREFRONT_RENDER_TIMING_THRESHOLD_MS", 1200),
    ),
  );
}

function formatTimingMarks(marks: TimingMark[]) {
  return marks.map((mark) => `${mark.name}=${mark.ms}ms`).join("; ");
}

function logRenderTiming(args: {
  template: StorefrontTemplate;
  storeId: string;
  storeSlug: string;
  themeCode: string;
  device?: "desktop" | "mobile";
  totalMs: number;
  marks: TimingMark[];
}) {
  if (!isRenderTimingEnabled()) return;

  const threshold = renderTimingThresholdMs();
  if (args.totalMs < threshold) return;

  console.info("[storefront-render-timing]", {
    template: args.template,
    storeId: args.storeId,
    storeSlug: args.storeSlug,
    themeCode: args.themeCode,
    device: args.device ?? "unknown",
    totalMs: args.totalMs,
    thresholdMs: threshold,
    marks: formatTimingMarks(args.marks),
  });
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
  const totalStartedAt = nowMs();
  const timingMarks: TimingMark[] = [];

  const mark = (name: string, startedAt: number) => {
    timingMarks.push({
      name,
      ms: nowMs() - startedAt,
    });
  };

  const safeCode = (themeCode as any) || (theme?.code as any);
  const kind = THEME_KIND[safeCode as ThemeCode] || "legacy";
  const themeOptions = safeObject(theme?.settings);

  if (kind === "app-shell") {
    const headersStartedAt = nowMs();
    const h = await headers();
    const ua = h.get("user-agent") || "";
    const device = detectDeviceFromUA(ua);
    mark("headers_device", headersStartedAt);

    const loadThemeStartedAt = nowMs();
    const loaded = loadTheme(safeCode as ThemeCode);
    const C = loaded.Component;
    mark("load_theme", loadThemeStartedAt);

    if (!C) {
      logRenderTiming({
        template,
        storeId: store.id,
        storeSlug: store.slug,
        themeCode: String(safeCode),
        device,
        totalMs: nowMs() - totalStartedAt,
        marks: timingMarks,
      });

      return null;
    }

    const seoStartedAt = nowMs();
    const seoMode = await getSeoUrlMode(store.id);
    mark("seo_mode", seoStartedAt);

    const bootstrapStartedAt = nowMs();
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
    mark("bootstrap_cart", bootstrapStartedAt);

    const pageDataStartedAt = nowMs();
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
    mark("page_data", pageDataStartedAt);

    const totalMs = nowMs() - totalStartedAt;

    logRenderTiming({
      template,
      storeId: store.id,
      storeSlug: store.slug,
      themeCode: String(safeCode),
      device,
      totalMs,
      marks: timingMarks,
    });

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

  const registryStartedAt = nowMs();
  const reg = themeRegistry.has(safeCode)
    ? themeRegistry.get(safeCode)
    : themeRegistry.defaultTheme();

  const T = reg.templates[template as keyof typeof reg.templates];
  mark("legacy_registry", registryStartedAt);

  if (!T) {
    logRenderTiming({
      template,
      storeId: store.id,
      storeSlug: store.slug,
      themeCode: String(safeCode),
      totalMs: nowMs() - totalStartedAt,
      marks: timingMarks,
    });

    return null;
  }

  const totalMs = nowMs() - totalStartedAt;

  logRenderTiming({
    template,
    storeId: store.id,
    storeSlug: store.slug,
    themeCode: String(safeCode),
    totalMs,
    marks: timingMarks,
  });

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