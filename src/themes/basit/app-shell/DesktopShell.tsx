// FILE: apps/storefront/src/themes/basit/app-shell/DesktopShell.tsx
"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import DesktopHeader from "./_components/DesktopHeader";
import Footer from "./Footer";
import ScreenContainer from "./ScreenContainer";
import BottomNav from "./BottomNav";
import InstallAppPrompt from "./_components/InstallAppPrompt";
import SmartSearchDesktopBar from "@/themes/basit/components/smart-search/SmartSearchDesktopBar";
import StoreBreadcrumbs from "./_components/StoreBreadcrumbs";
import { shouldShowSmartSearchOnDesktop } from "@/themes/basit/smart-search/visibility";
import { useBasitThemeRuntime } from "./theme-runtime";

import type { ThemeAdapterOutput } from "../types";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../bootstrap/types";

import { useNavStack } from "../app-navigation/stack";
import { ROUTES } from "../app-navigation/routes";

const AuthModal = dynamic(() => import("./_components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  theme: ThemeAdapterOutput;
  seoMode: SeoUrlMode;
  data?: any;
  children?: ReactNode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
};

type AuthCacheValue = {
  authed: boolean;
  customer: any;
  expiresAt: number;
};

let authCache: AuthCacheValue | null = null;
let authPending: Promise<AuthCacheValue> | null = null;

const AUTH_CACHE_TTL = 60_000;
const AUTH_ERROR_CACHE_TTL = 10_000;
const AUTH_IDLE_TIMEOUT = 1800;
const AUTH_FALLBACK_DELAY = 700;

function boolAttr(value: any, fallback = false) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value === 1 ? "true" : "false";

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return "true";
    if (["false", "0", "no", "off"].includes(v)) return "false";
  }

  return fallback ? "true" : "false";
}

function boolValue(value: any, fallback = false) {
  return boolAttr(value, fallback) === "true";
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function firstDefined<T>(...values: T[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function cssColor(value: unknown) {
  const v = s(value);
  if (!v) return "";

  return v;
}

function firstHomeSectionIsSlider(data: any) {
  const sections =
    data?.themeOptions?.homepage?.sections ||
    data?.theme_options?.homepage?.sections ||
    data?.theme?.options?.homepage?.sections ||
    [];

  if (!Array.isArray(sections)) return false;

  const first = sections.find(
    (section: any) => section && section.enabled !== false,
  );
  if (!first || typeof first !== "object") return false;

  const tokens = [
    first.key,
    first.slug,
    first.category,
    first.render_key,
    first.renderKey,
    first.component_key,
    first.componentKey,
    first.component_slug,
    first.componentSlug,
    first.component?.key,
    first.component?.slug,
    first.component?.category,
    first.theme_component?.key,
    first.theme_component?.slug,
    first.theme_component?.category,
    first.definition?.key,
    first.definition?.slug,
    first.definition?.category,
  ]
    .map((value) => s(value).toLowerCase())
    .filter(Boolean);

  return tokens.some((token) =>
    [
      "responsive_hero_slider",
      "responsive_hero_slider_basit",
      "advanced_slider",
      "banners_slider",
      "slider",
    ].some((sliderToken) =>
      token === sliderToken || token.includes(sliderToken),
    ),
  );
}

function cssPx(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return fallback;

  return Math.min(Math.max(n, min), max);
}

function isHomePath(pathname: string | null) {
  const path = s(pathname || "/");

  return path === "/" || path === "";
}

function scheduleIdleTask(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const w = window as any;

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(callback, { timeout: AUTH_IDLE_TIMEOUT });

    return () => {
      if (typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(id);
      }
    };
  }

  const id = window.setTimeout(callback, AUTH_FALLBACK_DELAY);

  return () => {
    window.clearTimeout(id);
  };
}

function getCachedAuthState() {
  const now = Date.now();

  if (authCache && authCache.expiresAt > now) {
    return authCache;
  }

  return null;
}

async function loadAuthState(force = false): Promise<AuthCacheValue> {
  const cached = force ? null : getCachedAuthState();

  if (cached) return cached;

  if (authPending) {
    return authPending;
  }

  authPending = fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "include",
  })
    .then(async (response) => {
      const json = await response.json().catch(() => ({}));

      const next: AuthCacheValue = {
        authed: Boolean(json?.authed),
        customer: json?.customer ?? null,
        expiresAt: Date.now() + AUTH_CACHE_TTL,
      };

      authCache = next;

      return next;
    })
    .catch(() => {
      const next: AuthCacheValue = {
        authed: false,
        customer: null,
        expiresAt: Date.now() + AUTH_ERROR_CACHE_TTL,
      };

      authCache = next;

      return next;
    })
    .finally(() => {
      authPending = null;
    });

  return authPending;
}

function clearAuthCache() {
  authCache = null;
  authPending = null;
}

export default function DesktopShell({
  theme,
  seoMode,
  data,
  children,
  bootstrap,
  initialCartCount = 0,
}: Props) {
  const pathname = usePathname();
  const runtime = useBasitThemeRuntime();

  // كل الصفحات تعتمد النسخة الموحدة نفسها من الإعدادات.
  theme = runtime.theme;
  bootstrap = runtime.bootstrap ?? bootstrap;

  const setRoutes = useNavStack((state) => state.setRoutes);
  const setFromPath = useNavStack((state) => state.setFromPath);

  const cachedAuth = getCachedAuthState();

  const [authOpen, setAuthOpen] = useState(false);
  const [authModalMounted, setAuthModalMounted] = useState(false);
  const [authed, setAuthed] = useState(() => Boolean(cachedAuth?.authed));
  const [customer, setCustomer] = useState<any>(() => cachedAuth?.customer ?? null);

  const storefront: any = (theme as any)?.storefront || {};
  const themeHeader: any = (theme as any)?.header || {};
  const themeUi: any = (theme as any)?.ui || {};

  const bootstrapAny: any = bootstrap || {};
  const bootstrapHeader: any = bootstrapAny?.header || {};
  const bootstrapAppearance: any = bootstrapAny?.appearance || {};
  const bootstrapFooterOptions: any = bootstrapAny?.footer?.options || {};

  const bottomNavEnabled = boolValue(
    firstDefined(
      bootstrapFooterOptions.enable_bottom_nav,
      bootstrapAppearance.enable_bottom_nav,
      storefront?.bottomNav,
      storefront?.enableBottomNav,
      storefront?.enable_bottom_nav,
    ),
    false,
  );

  const bottomNavStyle =
    String(
      firstDefined(
        bootstrapFooterOptions.mobile_bottom_nav_style,
        bootstrapAppearance.mobile_bottom_nav_style,
        storefront?.mobileBottomNavStyle,
        storefront?.mobile_bottom_nav_style,
      ) ?? "solid",
    ) === "frosted"
      ? "frosted"
      : "solid";

  const bottomNavBg =
    cssColor(
      firstDefined(
        bootstrapFooterOptions.mobile_bottom_nav_bg,
        bootstrapAppearance.mobile_bottom_nav_bg,
        storefront?.mobileBottomNavBg,
        storefront?.mobile_bottom_nav_bg,
      ),
    ) || "#ffffff";

  const bottomNavTextColor =
    cssColor(
      firstDefined(
        bootstrapFooterOptions.mobile_bottom_nav_text_color,
        bootstrapAppearance.mobile_bottom_nav_text_color,
        storefront?.mobileBottomNavTextColor,
        storefront?.mobile_bottom_nav_text_color,
      ),
    ) || "#111111";

  // Basit has one appearance shared by every route.
  const isDarkMode = false;
  const isHome = isHomePath(pathname);
  const homeFirstSectionHasSlider = useMemo(
    () => isHome && firstHomeSectionIsSlider(data),
    [data, isHome],
  );

  const storeBg = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.store_bg_dark
        : bootstrapAppearance.store_bg,
      bootstrapAppearance.store_bg,
      themeUi.backgroundColor,
      themeUi.background_color,
      themeUi.store_bg,
    ),
  );

  // The secondary background option was removed. Keep one background everywhere.
  const storeBgSecondary = storeBg;

  const storeTextColor = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.store_text_color_dark
        : bootstrapAppearance.store_text_color,
      bootstrapAppearance.store_text_color,
      themeUi.textColor,
      themeUi.text_color,
      themeUi.store_text_color,
    ),
  );

  const storeTextColorSecondary = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.store_text_color_secondary_dark
        : bootstrapAppearance.store_text_color_secondary,
      bootstrapAppearance.store_text_color_secondary,
      themeUi.textSecondaryColor,
      themeUi.text_secondary_color,
      themeUi.store_text_color_secondary,
    ),
  );

  const headerBg = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.header_bg_dark
        : bootstrapAppearance.header_bg,
      bootstrapAppearance.header_bg,
      bootstrapHeader.background_color,
      bootstrapHeader.header_bg,
      themeHeader.backgroundColor,
      themeHeader.background_color,
      themeHeader.header_bg,
    ),
  );

  const headerTextColor = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.header_text_color_dark
        : bootstrapAppearance.header_text_color,
      bootstrapAppearance.header_text_color,
      bootstrapHeader.text_color,
      bootstrapHeader.header_text_color,
      themeHeader.textColor,
      themeHeader.text_color,
      themeHeader.header_text_color,
    ),
  );

  const productBg = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.product_bg_dark
        : bootstrapAppearance.product_bg,
      bootstrapAppearance.product_bg,
      themeUi.productBg,
      themeUi.product_bg,
    ),
  );

  const productPromoBg = cssColor(
    firstDefined(
      bootstrapAppearance.product_promo_bg,
      themeUi.productPromoBg,
      themeUi.product_promo_bg,
    ),
  );

  const footerBg = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.footer_bg_dark
        : bootstrapAppearance.footer_bg,
      bootstrapAppearance.footer_bg,
    ),
  );

  const footerTextColor = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.footer_text_color_dark
        : bootstrapAppearance.footer_text_color,
      bootstrapAppearance.footer_text_color,
    ),
  );

  const bottomFooterBg = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.bottom_footer_bg_dark
        : bootstrapAppearance.bottom_footer_bg,
      bootstrapAppearance.bottom_footer_bg,
    ),
  );

  const logoWidth = cssPx(
    firstDefined(
      bootstrapHeader.logo_width,
      bootstrapHeader.header_logo_width,
      themeHeader.logoWidth,
      themeHeader.logo_width,
      themeHeader.header_logo_width,
    ),
    170,
    1,
    300,
  );

  const logoHeight = cssPx(
    firstDefined(
      bootstrapHeader.logo_height,
      bootstrapHeader.header_logo_height,
      themeHeader.logoHeight,
      themeHeader.logo_height,
      themeHeader.header_logo_height,
    ),
    59,
    1,
    120,
  );

  const transparentHeaderEnabled = boolValue(
    firstDefined(
      bootstrapHeader.transparent_header,
      bootstrapHeader.trans_header,
      bootstrapAppearance.trans_header,
      storefront.transparentHeader,
      storefront.transparent_header,
      storefront.trans_header,
    ),
    false,
  );

  const sliderOverlayEnabled = boolValue(
    firstDefined(
      bootstrapHeader.slider_overlay,
      bootstrapHeader.slider_has_overlay,
      bootstrapAppearance.slider_has_overlay,
      storefront.sliderOverlay,
      storefront.slider_overlay,
      storefront.slider_has_overlay,
    ),
    false,
  );

  const shellStyle = useMemo(() => {
    const vars: Record<string, string> = {};

    if (storeBg) {
      vars["--mk-bg-page"] = storeBg;
      vars["--mk-bg-page-secondary"] = storeBg;
      vars["--mk-bg-main"] = storeBg;
      vars["--mk-bg-body"] = storeBg;
      vars["--mk-bg-card"] = storeBg;
      vars["--mk-bg-surface"] = storeBg;
      vars["--mk-bg-soft"] = storeBg;
      vars["--mk-bg-muted"] = storeBg;
      vars["--mk-bg-section"] = storeBg;
    }

    if (storeBgSecondary) {
      vars["--mk-bg-page-secondary"] = storeBgSecondary;
    }

    if (storeTextColor) {
      vars["--mk-text-main"] = storeTextColor;
      vars["--mk-text-primary"] = storeTextColor;
      vars["--mk-text"] = storeTextColor;
    }

    if (storeTextColorSecondary) {
      vars["--mk-text-secondary"] = storeTextColorSecondary;
      vars["--mk-text-muted"] = storeTextColorSecondary;
    }

    if (headerBg) {
      vars["--mk-bg-header"] = headerBg;
      vars["--mk-bg-topnav"] = headerBg;
    }

    if (headerTextColor) {
      vars["--mk-text-header"] = headerTextColor;
      vars["--mk-text-topnav"] = headerTextColor;
    }

    if (productBg) {
      vars["--mk-bg-product"] = productBg;
      vars["--mk-product-card-bg"] = productBg;
      vars["--mk-product-card"] = productBg;
      vars["--mk-product-bg-card"] = productBg;
    }

    if (productPromoBg) {
      vars["--mk-product-promo-bg"] = productPromoBg;
    }

    if (footerBg) {
      vars["--mk-bg-footer"] = footerBg;
    }

    if (footerTextColor) {
      vars["--mk-text-footer"] = footerTextColor;
    }

    if (bottomFooterBg) {
      vars["--mk-bg-footer-bottom"] = bottomFooterBg;
    }

    vars["--mk-bottom-nav-bg"] = bottomNavBg;
    vars["--mk-bottom-nav-text-color"] = bottomNavTextColor;

    if (logoWidth > 0) {
      vars["--mk-header-logo-width"] = `${logoWidth}px`;
      vars["--mk-header-logo-max-width"] = `${logoWidth}px`;
    }

    if (logoHeight > 0) {
      vars["--mk-header-logo-height"] = `${logoHeight}px`;
      vars["--mk-header-logo-max-height"] = `${logoHeight}px`;
    }

    vars["--mk-z-header"] = "300";
    vars["--mk-z-overlay"] = "400";
    vars["--mk-z-popover"] = "500";

    vars["--z-header"] = "300";
    vars["--z-overlay"] = "400";
    vars["--z-popover"] = "500";
    vars["--z-footer"] = "75";

    return vars as CSSProperties;
  }, [
    storeBg,
    storeBgSecondary,
    storeTextColor,
    storeTextColorSecondary,
    headerBg,
    headerTextColor,
    productBg,
    productPromoBg,
    footerBg,
    footerTextColor,
    bottomFooterBg,
    bottomNavBg,
    bottomNavTextColor,
    logoWidth,
    logoHeight,
  ]);

  const shellDataAttrs = useMemo(
    () => ({
      "data-mk-theme": isDarkMode ? "dark" : "light",
      "data-mk-bottom-nav-style": bottomNavStyle,

      "data-mk-header-sticky": boolAttr(
        firstDefined(
          bootstrapHeader.sticky_header,
          bootstrapHeader.header_is_sticky,
          bootstrapAppearance.header_is_sticky,
          themeHeader.stickyHeader,
          themeHeader.sticky_header,
          themeHeader.header_is_sticky,
        ),
        true,
      ),

      "data-mk-header-centered": boolAttr(
        firstDefined(
          bootstrapHeader.centered_logo,
          bootstrapAppearance.centered_logo,
          themeHeader.centeredLogo,
          themeHeader.centered_logo,
        ),
        true,
      ),

      "data-mk-topnav-dark": boolAttr(
        firstDefined(
          bootstrapHeader.topnav_dark,
          bootstrapHeader.topnav_is_dark,
          bootstrapAppearance.topnav_is_dark,
          themeHeader.topnavDark,
          themeHeader.topnav_dark,
          themeHeader.topnav_is_dark,
        ),
        false,
      ),

      "data-mk-hide-topnav": boolAttr(
        firstDefined(
          bootstrapHeader.hide_topnav,
          bootstrapAppearance.hide_topnav,
          themeHeader.hideTopnav,
          themeHeader.hide_topnav,
        ),
        false,
      ),

      "data-mk-hide-topnav-links": boolAttr(
        firstDefined(
          bootstrapHeader.hide_topnav_links,
          bootstrapAppearance.hide_topnav_links,
          themeHeader.hideTopnavLinks,
          themeHeader.hide_topnav_links,
        ),
        false,
      ),

      "data-mk-hide-topnav-contacts": boolAttr(
        firstDefined(
          bootstrapHeader.hide_topnav_contacts,
          bootstrapAppearance.hide_topnav_contacts,
          themeHeader.hideTopnavContacts,
          themeHeader.hide_topnav_contacts,
        ),
        false,
      ),

      "data-mk-default-menu": boolAttr(
        firstDefined(
          bootstrapHeader.default_menu,
          bootstrapHeader.activate_default_menu,
          bootstrapAppearance.activate_default_menu,
          themeHeader.defaultMenu,
          themeHeader.default_menu,
          themeHeader.activate_default_menu,
        ),
        true,
      ),

      "data-mk-desktop-sidemenu": boolAttr(
        firstDefined(
          bootstrapHeader.desktop_sidemenu,
          bootstrapHeader.enable_desktop_sidemenu,
          bootstrapAppearance.enable_desktop_sidemenu,
          themeHeader.desktopSideMenu,
          themeHeader.desktop_sidemenu,
          themeHeader.enable_desktop_sidemenu,
        ),
        false,
      ),

      "data-mk-transparent-header":
        isHome && transparentHeaderEnabled ? "true" : "false",

      "data-mk-slider-overlay": isHome && sliderOverlayEnabled ? "true" : "false",

      "data-mk-animate-blocks": boolAttr(
        firstDefined(
          bootstrapAppearance.animate_blocks,
          storefront?.animateBlocks,
          storefront?.animate_blocks,
        ),
        false,
      ),

      "data-mk-enhanced-blocks-titles": boolAttr(
        firstDefined(
          bootstrapAppearance.enhanced_blocks_titles,
          storefront?.enhancedBlocksTitles,
          storefront?.enhanced_blocks_titles,
        ),
        false,
      ),

      "data-mk-enhanced-products-slider": boolAttr(
        firstDefined(
          bootstrapAppearance.enhanced_products_slider,
          storefront?.enhancedProductsSlider,
          storefront?.enhanced_products_slider,
        ),
        false,
      ),

      "data-mk-second-reviews": boolAttr(
        firstDefined(
          bootstrapAppearance.enable_second_reviews,
          storefront?.secondReviews,
          storefront?.enable_second_reviews,
        ),
        false,
      ),

      "data-mk-more-button-enabled": boolAttr(
        firstDefined(
          bootstrapAppearance.is_more_button_enabled,
          storefront?.moreButtonEnabled,
          storefront?.is_more_button_enabled,
        ),
        true,
      ),

      "data-mk-hide-products-slider-controls": boolAttr(
        firstDefined(
          bootstrapAppearance.hide_products_slider_controls,
          storefront?.hideProductsSliderControls,
          storefront?.hide_products_slider_controls,
        ),
        false,
      ),

      "data-mk-mobile-small-blocks-titles": boolAttr(
        firstDefined(
          bootstrapAppearance.mobile_small_blocks_titles,
          storefront?.mobileSmallBlocksTitles,
          storefront?.mobile_small_blocks_titles,
        ),
        false,
      ),

      "data-mk-disable-right-click":
        boolValue(bootstrapAppearance.content_copyright, false) ||
        boolValue(bootstrapAppearance.disable_right_click, false) ||
        boolValue(storefront?.disableRightClick, false) ||
        boolValue(storefront?.disable_right_click, false)
          ? "true"
          : "false",

      "data-mk-content-protected":
        boolValue(bootstrapAppearance.content_copyright, false) ||
        boolValue(bootstrapAppearance.disable_right_click, false) ||
        boolValue(storefront?.disableRightClick, false) ||
        boolValue(storefront?.disable_right_click, false)
          ? "true"
          : "false",
    }),
    [
      isDarkMode,
      bottomNavStyle,
      isHome,
      transparentHeaderEnabled,
      sliderOverlayEnabled,
      themeHeader,
      storefront,
      bootstrapHeader,
      bootstrapAppearance,
    ],
  );

  const openAuth = useCallback(() => {
    setAuthModalMounted(true);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
  }, []);

  const fetchMe = useCallback(
    async (options?: { signal?: AbortSignal; force?: boolean }) => {
      try {
        const next = await loadAuthState(Boolean(options?.force));

        if (options?.signal?.aborted) return;

        setAuthed(Boolean(next.authed));
        setCustomer(next.customer ?? null);
      } catch {
        if (options?.signal?.aborted) return;

        setAuthed(false);
        setCustomer(null);
      }
    },
    [],
  );

  const handleAuthChanged = useCallback(() => {
    clearAuthCache();
    void fetchMe({ force: true });
  }, [fetchMe]);

  const handleAuthed = useCallback(() => {
    clearAuthCache();
    void fetchMe({ force: true });
    window.dispatchEvent(new CustomEvent("auth:changed"));
  }, [fetchMe]);

  useEffect(() => {
    setRoutes(ROUTES as any);
  }, [setRoutes]);

  useEffect(() => {
    if (!pathname) return;
    setFromPath(pathname);
  }, [pathname, setFromPath]);

  useEffect(() => {
    const cached = getCachedAuthState();

    if (cached) {
      setAuthed(Boolean(cached.authed));
      setCustomer(cached.customer ?? null);
      return;
    }

    const controller = new AbortController();

    const cancelIdle = scheduleIdleTask(() => {
      void fetchMe({
        signal: controller.signal,
      });
    });

    return () => {
      controller.abort();
      cancelIdle();
    };
  }, [fetchMe]);

  useEffect(() => {
    function handleAuthOpen() {
      openAuth();
    }

    window.addEventListener("auth:open", handleAuthOpen);
    window.addEventListener("auth:changed", handleAuthChanged);

    return () => {
      window.removeEventListener("auth:open", handleAuthOpen);
      window.removeEventListener("auth:changed", handleAuthChanged);
    };
  }, [handleAuthChanged, openAuth]);

  const screenData = useMemo(() => {
    const base =
      data && typeof data === "object" && !Array.isArray(data) ? data : {};

    const bootstrapAnyForScreen: any = bootstrap || {};
    const baseTheme =
      base?.theme && typeof base.theme === "object" ? base.theme : {};
    const baseThemeOptions =
      baseTheme?.options && typeof baseTheme.options === "object"
        ? baseTheme.options
        : {};

    /*
     * مهم: يتم حقن الإعدادات الموحدة في بيانات كل شاشة.
     * بهذا لا تعتمد الرئيسية والتصنيف والمنتج والحساب على مصادر مختلفة.
     */
    const unifiedOptions = {
      ...runtime.appearance,
      ...runtime.rawOptions,
      ...baseThemeOptions,
    };

    return {
      ...base,
      bootstrap: base.bootstrap ?? bootstrap ?? null,
      currencies: base.currencies ?? bootstrapAnyForScreen.currencies ?? null,
      tax: base.tax ?? bootstrapAnyForScreen.tax ?? null,
      appearance: runtime.appearance,
      themeSettings: runtime.theme,
      themeRuntime: runtime,
      theme: {
        ...baseTheme,
        options: unifiedOptions,
        runtime: runtime.theme,
        bootstrap: baseTheme.bootstrap ?? bootstrap ?? null,
      },
    };
  }, [data, bootstrap, runtime]);

  const showBreadcrumbs = boolValue(
    firstDefined(
      bootstrapAppearance.is_breadcrumbs,
      storefront?.breadcrumbs,
      storefront?.is_breadcrumbs,
    ),
    true,
  );

  return (
    <>
      <div
        className="mk-desktop-shell mk-app-shell bs-unified-shell"
        data-basit-shell="unified"
        data-basit-bottom-nav={bottomNavEnabled ? "true" : "false"}
        style={shellStyle}
        {...shellDataAttrs}
      >
        <DesktopHeader
          theme={theme}
          bootstrap={bootstrap}
          authed={authed}
          customer={customer}
          onOpenAuth={openAuth}
          seoMode={seoMode}
          initialCartCount={initialCartCount}
          homeFirstSectionHasSlider={homeFirstSectionHasSlider}
        />

        {shouldShowSmartSearchOnDesktop(pathname) ? (
          <SmartSearchDesktopBar data={screenData} bootstrap={bootstrap} />
        ) : null}

        <main className="mk-desktop-main">
          <div className="mk-desktop-container">
            <StoreBreadcrumbs data={screenData} enabled={showBreadcrumbs} />

            {children ? (
              children
            ) : (
              <ScreenContainer data={screenData} routesOverride={ROUTES} />
            )}
          </div>
        </main>

        <Footer theme={theme} bootstrap={bootstrap} />

        <div className="bs-compact-navigation">
          {bottomNavEnabled ? (
            <BottomNav
              seoMode={seoMode}
              bootstrap={bootstrap}
              initialCartCount={initialCartCount}
            />
          ) : null}
          <InstallAppPrompt bootstrap={bootstrap} />
        </div>
      </div>

      {authModalMounted ? (
        <AuthModal open={authOpen} onClose={closeAuth} onAuthed={handleAuthed} />
      ) : null}
    </>
  );
}
