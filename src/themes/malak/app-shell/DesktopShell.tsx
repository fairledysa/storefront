// FILE: apps/storefront/src/themes/malak/app-shell/DesktopShell.tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import DesktopHeader from "./_components/DesktopHeader";
import Footer from "./Footer";
import ScreenContainer from "./ScreenContainer";
import AuthModal from "./_components/AuthModal";

import type { ThemeAdapterOutput } from "../types";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../bootstrap/types";

import { useNavStack } from "../app-navigation/stack";
import { ROUTES } from "../app-navigation/routes";

type Props = {
  theme: ThemeAdapterOutput;
  seoMode: SeoUrlMode;
  data?: any;
  children?: ReactNode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
};

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
type AuthCacheValue = {
  authed: boolean;
  customer: any;
  expiresAt: number;
};

let authCache: AuthCacheValue | null = null;
let authPending: Promise<AuthCacheValue> | null = null;

function scheduleIdleTask(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const w = window as any;

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(callback, { timeout: 1500 });

    return () => {
      if (typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(id);
      }
    };
  }

  const id = window.setTimeout(callback, 450);

  return () => {
    window.clearTimeout(id);
  };
}

async function loadAuthState(force = false): Promise<AuthCacheValue> {
  const now = Date.now();

  if (!force && authCache && authCache.expiresAt > now) {
    return authCache;
  }

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
        expiresAt: Date.now() + 60_000,
      };

      authCache = next;

      return next;
    })
    .catch(() => {
      const next: AuthCacheValue = {
        authed: false,
        customer: null,
        expiresAt: Date.now() + 10_000,
      };

      authCache = next;

      return next;
    })
    .finally(() => {
      authPending = null;
    });

  return authPending;
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

  const setRoutes = useNavStack((state) => state.setRoutes);
  const setFromPath = useNavStack((state) => state.setFromPath);

  const [authOpen, setAuthOpen] = useState(false);
const [authed, setAuthed] = useState(() => Boolean(authCache?.authed));
const [customer, setCustomer] = useState<any>(() => authCache?.customer ?? null);

  const storefront: any = (theme as any)?.storefront || {};
  const themeHeader: any = (theme as any)?.header || {};
  const themeUi: any = (theme as any)?.ui || {};

  const bootstrapAny: any = bootstrap || {};
  const bootstrapHeader: any = bootstrapAny?.header || {};
  const bootstrapAppearance: any = bootstrapAny?.appearance || {};

  const isDarkMode = Boolean(themeUi?.darkMode);
  const isHome = isHomePath(pathname);

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

  const storeBgSecondary = cssColor(
    firstDefined(
      isDarkMode
        ? bootstrapAppearance.store_bg_secondary_dark
        : bootstrapAppearance.store_bg_secondary,
      bootstrapAppearance.store_bg_secondary,
      themeUi.backgroundSecondary,
      themeUi.background_secondary,
      themeUi.store_bg_secondary,
    ),
  );

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
    0,
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
    48,
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
      vars["--mk-bg-main"] = storeBg;
      vars["--mk-bg-body"] = storeBg;
    }

    if (storeBgSecondary) {
      vars["--mk-bg-soft"] = storeBgSecondary;
      vars["--mk-bg-muted"] = storeBgSecondary;
      vars["--mk-bg-section"] = storeBgSecondary;
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
      vars["--mk-bg-card"] = productBg;
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
    logoWidth,
    logoHeight,
  ]);

  const shellDataAttrs = useMemo(
    () => ({
      "data-mk-theme": isDarkMode ? "dark" : "light",

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

      "data-mk-disable-right-click": boolAttr(
        firstDefined(
          bootstrapAppearance.disable_right_click,
          storefront?.disableRightClick,
          storefront?.disable_right_click,
        ),
        false,
      ),
    }),
    [
      isDarkMode,
      isHome,
      transparentHeaderEnabled,
      sliderOverlayEnabled,
      themeHeader,
      storefront,
      bootstrapHeader,
      bootstrapAppearance,
    ],
  );

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

  useEffect(() => {
    setRoutes(ROUTES as any);
  }, [setRoutes]);

  useEffect(() => {
    if (!pathname) return;
    setFromPath(pathname);
  }, [pathname, setFromPath]);

 useEffect(() => {
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
      setAuthOpen(true);
    }

  function handleAuthChanged() {
  void fetchMe({ force: true });
}

    window.addEventListener("auth:open", handleAuthOpen);
    window.addEventListener("auth:changed", handleAuthChanged);

    return () => {
      window.removeEventListener("auth:open", handleAuthOpen);
      window.removeEventListener("auth:changed", handleAuthChanged);
    };
  }, [fetchMe]);

  const screenData = useMemo(() => {
  const base =
    data && typeof data === "object" && !Array.isArray(data) ? data : {};

  const bootstrapAnyForScreen: any = bootstrap || {};

  return {
    ...base,
    bootstrap: base.bootstrap ?? bootstrap ?? null,
    currencies: base.currencies ?? bootstrapAnyForScreen.currencies ?? null,
    tax: base.tax ?? bootstrapAnyForScreen.tax ?? null,
  };
}, [data, bootstrap]);

  return (
    <>
      <div
        className="mk-desktop-shell mk-app-shell"
        style={shellStyle}
        {...shellDataAttrs}
      >
        <DesktopHeader
          theme={theme}
          bootstrap={bootstrap}
          authed={authed}
          customer={customer}
          onOpenAuth={() => setAuthOpen(true)}
          seoMode={seoMode}
          initialCartCount={initialCartCount}
        />

        <main className="mk-desktop-main">
          <div className="mk-desktop-container">
            {children ? children : <ScreenContainer data={screenData} />}
          </div>
        </main>

        <Footer theme={theme} bootstrap={bootstrap} />
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      onAuthed={() => {
  void fetchMe({ force: true });
  window.dispatchEvent(new CustomEvent("auth:changed"));
}}
      />
    </>
  );
}