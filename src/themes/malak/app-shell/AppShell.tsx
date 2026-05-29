// FILE: apps/storefront/src/themes/malak/app-shell/AppShell.tsx

"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import MobileShell from "./MobileShell";
import DesktopShell from "./DesktopShell";
import ProductFavoritesRuntime from "@/themes/malak/components/product-favorites/ProductFavoritesRuntime";
import ProductCartRuntime from "@/themes/malak/components/product-cart/ProductCartRuntime";
import ToastProvider from "./_components/ToastProvider";
import MobileNavigationTransition from "./_components/MobileNavigationTransition";

import type { ThemeAdapterOutput } from "../types";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../bootstrap/types";
import { useNavStack } from "../app-navigation/stack";

const ProductQuickView = dynamic(
  () => import("@/themes/malak/components/product-quick-view/ProductQuickView"),
  {
    ssr: false,
    loading: () => null,
  },
);

type Props = {
  theme: ThemeAdapterOutput;
  seoMode: SeoUrlMode;
  data?: any;
  children?: ReactNode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
};

const DEFAULT_PRODUCT_CARD = {
  imageHeightPx: 480,
  imageFit: "contain" as const,
  productsPerRow: 4,

  switchImageOnHover: false,
  showOptions: false,
  hoverStyle: "on_image_hover" as const,

  fitSliderProducts: true,
  disableLazyload: false,

  showCountdown: false,
  showNormalCountdown: false,

  shineOnHover: false,
  zoomOnHover: true,

  mobileMiniProducts: true,
  oneLineName: true,
  showSubtitleOnMini: false,
  miniTopPromotion: false,
  freeImagesHeight: false,

  enhancedAddButtonInMobile: true,
  enhancedMobileAddButton: true,

  addButtonBg: "#d5c4a8",
  addButtonColor: "#000000",

  hideQuickviewOnMobile: false,

  autoPlayProductsSlider: true,
  verticalFixedProducts: true,

  roundedCards: true,
  showDiscount: false,
  showRating: true,
  showRatingCount: false,

  disableOutProductsEffect: false,

  hasBorder: true,
  borderColor: "#d5c4a8",

  primaryProductButtons: true,

  productPromoBg: "#000000",
  promoBg: "#000000",

  background: "#ffffff",
};

const DEFAULT_HEADER = {
  logoWidthPx: 0,
  logoHeightPx: 48,

  desktopSideMenu: false,
  centeredLogo: true,
  mobileOnlyCenteredLogo: true,
  stickyHeader: true,

  hideTopnav: false,
  hideTopnavLinks: false,
  hideTopnavContacts: false,
  topnavDark: false,

  defaultMenu: false,
};

const DEFAULT_STOREFRONT = {
  transparentHeader: false,
  sliderOverlay: true,

  reversedLogoUrl: null as string | null,
  showReversedLogo: true,
  showReversedLogoInFooter: true,
  showOriginalLogoOnScroll: true,

  animateBlocks: false,
  secondReviews: true,
  enhancedProductsSlider: true,
  hideProductsSliderControls: false,
  enhancedBlocksTitles: true,
  mobileSmallBlocksTitles: true,

  disableRightClick: false,
  moreButtonEnabled: true,
};

const CUSTOM_CSS_STYLE_ID = "mk-store-custom-css";
const CUSTOM_JS_SCRIPT_ID = "mk-store-custom-js";

const MAX_CUSTOM_CSS_SIZE = 300 * 1024;
const MAX_CUSTOM_JS_SIZE = 150 * 1024;

const ROUTE_PROGRESS_DELAY = 70;
const ROUTE_SPINNER_DELAY = 460;
const ROUTE_HIDE_DELAY = 140;
const ROUTE_FALLBACK_TIMEOUT = 6500;
const PREFETCH_INTENT_DELAY = 90;
const MAX_PREFETCHED_LINKS = 80;

function pickColor(value: any, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cssPx(value: any, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return `${fallback}px`;
  return `${n}px`;
}

function toBool(value: any, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled"].includes(text)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(text)) return false;
  }

  return Boolean(value);
}

function toPositiveNumber(value: any, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toProductImageFit(value: any, fallback: any) {
  const text = String(value ?? "").trim();

  if (text === "cover") return "cover";
  if (text === "contain") return "contain";
  if (text === "fill") return "fill";
  if (text === "full") return "contain";

  return fallback;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function resolveFontFamily(value: any, fallback?: any) {
  const raw = String(value ?? "").trim();
  const key = raw.toLowerCase();

  if (!raw) {
    return (
      String(fallback ?? "").trim() ||
      'system-ui, -apple-system, "Segoe UI", Arial, sans-serif'
    );
  }

  if (raw.includes(",") || raw.startsWith("var(")) return raw;

  const fonts: Record<string, string> = {
    tajawal: '"Tajawal", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    cairo: '"Cairo", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    almarai:
      '"Almarai", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    rubik: '"Rubik", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    lusail: '"Lusail", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  };

  return fonts[key] || raw;
}

function primaryContrast(value: any) {
  let hex = String(value ?? "").trim();

  if (!hex.startsWith("#")) return "#ffffff";

  hex = hex.replace("#", "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }

  if (hex.length !== 6) return "#ffffff";

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  if (![r, g, b].every(Number.isFinite)) return "#ffffff";

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.58 ? "#111827" : "#ffffff";
}

function isHomePath(pathname: string | null) {
  const path = String(pathname || "/").trim();
  return path === "/" || path === "";
}

function isModifiedClick(event: MouseEvent) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function isSkippableHref(href: string) {
  const value = String(href || "").trim().toLowerCase();

  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("sms:") ||
    value.startsWith("whatsapp:") ||
    value.startsWith("javascript:")
  );
}

function isBlockedRoutePath(path: string) {
  const value = String(path || "").trim();

  return (
    value === "/cart" ||
    value.startsWith("/cart?") ||
    value === "/checkout" ||
    value.startsWith("/checkout/") ||
    value.startsWith("/checkout?") ||
    value === "/account" ||
    value.startsWith("/account/") ||
    value.startsWith("/account?") ||
    value.startsWith("/thankyou/") ||
    value.startsWith("/api/")
  );
}

function hasBlockedCustomCode(value: string, blocked: string[]) {
  const lower = String(value ?? "").toLowerCase();
  return blocked.some((item) => lower.includes(item));
}

function resolveBootstrapCustomCss(bootstrapAny: any) {
  const customCode = bootstrapAny?.customCode || {};
  const enabled = toBool(customCode.enabled, false);
  const css = String(customCode.css ?? "");

  if (!enabled) return "";
  if (!css.trim()) return "";
  if (css.length > MAX_CUSTOM_CSS_SIZE) return "";

  if (
    hasBlockedCustomCode(css, [
      "<script",
      "</script",
      "</style",
      "javascript:",
      "expression(",
    ])
  ) {
    return "";
  }

  return css;
}

function resolveBootstrapCustomJs(bootstrapAny: any) {
  const customCode = bootstrapAny?.customCode || {};
  const enabled = toBool(customCode.js_enabled, false);
  const js = String(customCode.js ?? "");

  if (!enabled) return "";
  if (!js.trim()) return "";
  if (js.length > MAX_CUSTOM_JS_SIZE) return "";

  if (
    hasBlockedCustomCode(js, [
      "<script",
      "</script",
      "</style",
      "document.cookie",
      "eval(",
      "new function(",
    ])
  ) {
    return "";
  }

  return js;
}

function NavigationTransition({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const pathnameRef = useRef(pathname);
  const startedRef = useRef(false);
  const activeRef = useRef(false);

  const prefetchedRef = useRef<Set<string>>(new Set());

  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (spinnerTimerRef.current) {
      clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = null;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  }, []);

  const setActiveState = useCallback((value: boolean) => {
    activeRef.current = value;
    setActive(value);
  }, []);

  const finish = useCallback(() => {
    if (!startedRef.current && !activeRef.current) return;

    startedRef.current = false;

    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (spinnerTimerRef.current) {
      clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = null;
    }

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (!activeRef.current) {
      setActiveState(false);
      setShowSpinner(false);
      setLeaving(false);
      return;
    }

    setLeaving(true);

    hideTimerRef.current = setTimeout(() => {
      setActiveState(false);
      setShowSpinner(false);
      setLeaving(false);
      hideTimerRef.current = null;
    }, ROUTE_HIDE_DELAY);
  }, [setActiveState]);

  const start = useCallback(() => {
    clearTimers();

    startedRef.current = true;
    setLeaving(false);
    setShowSpinner(false);

    progressTimerRef.current = setTimeout(() => {
      setActiveState(true);
      progressTimerRef.current = null;
    }, ROUTE_PROGRESS_DELAY);

    spinnerTimerRef.current = setTimeout(() => {
      if (startedRef.current) {
        setShowSpinner(true);
      }

      spinnerTimerRef.current = null;
    }, ROUTE_SPINNER_DELAY);

    fallbackTimerRef.current = setTimeout(() => {
      finish();
    }, ROUTE_FALLBACK_TIMEOUT);
  }, [clearTimers, finish, setActiveState]);

  const getInternalHref = useCallback((anchor: HTMLAnchorElement) => {
    const rawHref = anchor.getAttribute("href") || "";
    if (isSkippableHref(rawHref)) return "";

    let url: URL;

    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return "";
    }

    if (url.origin !== window.location.origin) return "";

    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      url.hash
    ) {
      return "";
    }

    const path = `${url.pathname}${url.search}`;

    if (!path || path === `${window.location.pathname}${window.location.search}`) {
      return "";
    }

    if (isBlockedRoutePath(path)) return "";

    return path;
  }, []);

  const prefetchAnchor = useCallback(
    (anchor: HTMLAnchorElement | null, immediate = false) => {
      if (!enabled || !anchor) return;

      const href = getInternalHref(anchor);
      if (!href) return;

      if (prefetchedRef.current.has(href)) return;

      const run = () => {
        if (prefetchedRef.current.has(href)) return;

        if (prefetchedRef.current.size >= MAX_PREFETCHED_LINKS) {
          prefetchedRef.current.clear();
        }

        prefetchedRef.current.add(href);

        try {
          router.prefetch(href);
        } catch {
          // ignore
        }
      };

      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current);
        prefetchTimerRef.current = null;
      }

      if (immediate) {
        run();
        return;
      }

      prefetchTimerRef.current = setTimeout(() => {
        run();
        prefetchTimerRef.current = null;
      }, PREFETCH_INTENT_DELAY);
    },
    [enabled, getInternalHref, router],
  );

  useEffect(() => {
    if (!enabled) return;
    if (pathnameRef.current === pathname) return;

    pathnameRef.current = pathname;

    const timer = window.setTimeout(() => {
      finish();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, pathname, finish]);

  useEffect(() => {
    if (!enabled) return;

    function getAnchorFromEvent(event: Event) {
      const target = event.target as Element | null;
      return target?.closest?.("a[href]") as HTMLAnchorElement | null;
    }

    function handleIntent(event: Event) {
      const anchor = getAnchorFromEvent(event);
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noRouter === "true") return;
      if (anchor.getAttribute("data-router") === "false") return;

      prefetchAnchor(anchor, false);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = getAnchorFromEvent(event);
      if (!anchor) return;

      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noRouter === "true") return;
      if (anchor.getAttribute("data-router") === "false") return;

      const rawHref = anchor.getAttribute("href") || "";
      if (isSkippableHref(rawHref)) return;

      let url: URL;

      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      ) {
        return;
      }

      const routePath = `${url.pathname}${url.search}`;
      if (isBlockedRoutePath(routePath)) return;

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextPath === currentPath) return;

      event.preventDefault();

      prefetchAnchor(anchor, true);
      start();

      router.push(nextPath);
    }

    function handlePopState() {
      start();
    }

    document.addEventListener("pointerover", handleIntent, true);
    document.addEventListener("touchstart", handleIntent, true);
    document.addEventListener("focusin", handleIntent, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("pointerover", handleIntent, true);
      document.removeEventListener("touchstart", handleIntent, true);
      document.removeEventListener("focusin", handleIntent, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [enabled, router, start, clearTimers, prefetchAnchor]);

  if (!enabled) return null;

  return (
    <>
      {active ? (
        <>
          <div
            className={[
              "mk-route-progress",
              leaving ? "mk-route-progress--leaving" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <span className="mk-route-progress__bar" />
          </div>

          {showSpinner ? (
            <div
              className={[
                "mk-route-loader",
                leaving ? "mk-route-loader--leaving" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            >
              <span className="mk-route-loader__spinner" />
            </div>
          ) : null}
        </>
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .mk-route-progress {
              position: fixed;
              inset-inline: 0;
              top: 0;
              z-index: 9999;
              height: 2px;
              pointer-events: none;
              overflow: hidden;
              background: rgba(15, 23, 42, 0.04);
              opacity: 1;
              transition: opacity 140ms ease;
            }

            .mk-route-progress--leaving {
              opacity: 0;
            }

            .mk-route-progress__bar {
              position: absolute;
              inset-block: 0;
              inset-inline-start: 0;
              width: 38%;
              border-radius: 999px;
              background: linear-gradient(
                90deg,
                rgba(15, 23, 42, 0),
                rgba(15, 23, 42, 0.72),
                rgba(15, 23, 42, 0)
              );
              animation: mkRouteProgressBar 700ms cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }

            .mk-route-loader {
              position: fixed;
              inset-inline: 0;
              top: var(--mk-route-loader-top, 150px);
              bottom: 0;
              z-index: 350;
              display: grid;
              place-items: center;
              pointer-events: none;
              background: rgba(255, 255, 255, 0.3);
              backdrop-filter: blur(0.5px);
              opacity: 1;
              transition: opacity 140ms ease;
            }

            .mk-route-loader--leaving {
              opacity: 0;
            }

            .mk-route-loader__spinner {
              width: 28px;
              height: 28px;
              border-radius: 999px;
              border: 2px solid rgba(15, 23, 42, 0.08);
              border-top-color: rgba(15, 23, 42, 0.28);
              animation: mkRouteSpinner 580ms linear infinite;
            }

            @keyframes mkRouteProgressBar {
              0% {
                transform: translateX(-120%);
              }

              100% {
                transform: translateX(270%);
              }
            }

            @keyframes mkRouteSpinner {
              to {
                transform: rotate(360deg);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .mk-route-progress__bar,
              .mk-route-loader__spinner {
                animation: none;
              }
            }
          `,
        }}
      />
    </>
  );
}

export default function AppShell({
  theme,
  seoMode,
  data,
  children,
  bootstrap,
  initialCartCount = 0,
}: Props) {
  const pathname = usePathname();

  const reset = useNavStack((state) => state.reset);
  const setSeoMode = useNavStack((state) => state.setSeoMode);

  const isMobile = theme.device === "mobile";

  const themeAny: any = theme || {};
  const themeUi: any = themeAny.ui || {};
  const themeHeader: any = themeAny.header || {};
  const themeStorefront: any = themeAny.storefront || {};

  const bootstrapAny: any = bootstrap || {};
  const bootstrapHeader: any = bootstrapAny.header || {};
  const bootstrapAppearance: any = bootstrapAny.appearance || {};
  const customCode: any = bootstrapAny.customCode || {};

  const customCss = useMemo(
    () =>
      resolveBootstrapCustomCss({
        customCode,
      }),
    [customCode.enabled, customCode.css],
  );

  const customJs = useMemo(
    () =>
      resolveBootstrapCustomJs({
        customCode,
      }),
    [customCode.js_enabled, customCode.js],
  );

  const isDarkMode = Boolean(themeUi.darkMode);
  const isHome = isHomePath(pathname);

  const colors: any = themeUi.colors || {};

  const productCard = useMemo(() => {
    const appearance = bootstrapAppearance as Record<string, any>;

    const themeProductCard = (themeAny.productCard || {}) as Record<
      string,
      any
    >;

    const base = {
      ...DEFAULT_PRODUCT_CARD,
      ...themeProductCard,
    };

    const productImageHeightUnits = toPositiveNumber(
      appearance.product_image_height,
      Number(base.imageHeightPx || DEFAULT_PRODUCT_CARD.imageHeightPx) / 16,
    );

    return {
      ...base,

      imageHeightPx: Math.min(30, Math.max(5, productImageHeightUnits)) * 16,

      imageFit: toProductImageFit(
        appearance.equal_cart_height_type,
        base.imageFit,
      ),

      productsPerRow: Math.min(
        8,
        Math.max(
          2,
          toPositiveNumber(appearance.products_per_row, base.productsPerRow),
        ),
      ),

      switchImageOnHover: toBool(
        appearance.enable_switch_image_on_hover,
        base.switchImageOnHover,
      ),

      showOptions: toBool(appearance.productcard_options, base.showOptions),

      hoverStyle: appearance.hover_style || base.hoverStyle,

      fitSliderProducts: toBool(
        appearance.fit_slider_products,
        base.fitSliderProducts,
      ),

      disableLazyload: toBool(
        appearance.disable_products_lazyload,
        base.disableLazyload,
      ),

      showCountdown: toBool(
        appearance.show_normal_countdown,
        base.showCountdown,
      ),

      showNormalCountdown: toBool(
        appearance.show_normal_countdown,
        base.showNormalCountdown,
      ),

      shineOnHover: toBool(
        appearance.enable_shine_animation,
        base.shineOnHover,
      ),

      zoomOnHover: toBool(appearance.enable_zoom_animation, base.zoomOnHover),

      mobileMiniProducts: toBool(
        appearance.mobile_mini_products,
        base.mobileMiniProducts,
      ),

      oneLineName: toBool(appearance.one_line_name, base.oneLineName),

      showSubtitleOnMini: toBool(
        appearance.show_subtitle_on_mini,
        base.showSubtitleOnMini,
      ),

      miniTopPromotion: toBool(
        appearance.mini_top_promotion,
        base.miniTopPromotion,
      ),

      freeImagesHeight: toBool(
        appearance.free_images_height,
        base.freeImagesHeight,
      ),

      enhancedAddButtonInMobile: toBool(
        appearance.enhanced_add_btn_in_mobile,
        base.enhancedAddButtonInMobile,
      ),

      enhancedMobileAddButton: toBool(
        appearance.enhanced_add_btn_in_mobile,
        base.enhancedMobileAddButton,
      ),

      addButtonBg: appearance.enhanced_add_btn_bg || base.addButtonBg,

      addButtonColor: appearance.enhanced_add_btn_color || base.addButtonColor,

      hideQuickviewOnMobile: toBool(
        appearance.hide_quickview_on_mobile,
        base.hideQuickviewOnMobile,
      ),

      autoPlayProductsSlider: toBool(
        appearance.auto_play_products_slider,
        base.autoPlayProductsSlider,
      ),

      verticalFixedProducts: toBool(
        appearance.vertical_fixed_products,
        base.verticalFixedProducts,
      ),

      roundedCards: toBool(appearance.rounded_cards, base.roundedCards),

      showDiscount: toBool(appearance.show_discount, base.showDiscount),

      showRating: toBool(appearance.show_rating, base.showRating),

      showRatingCount: toBool(
        appearance.show_rating_count,
        base.showRatingCount,
      ),

      disableOutProductsEffect: toBool(
        appearance.disable_out_products,
        base.disableOutProductsEffect,
      ),

      hasBorder: toBool(appearance.products_has_border, base.hasBorder),

      borderColor: appearance.product_border_color || base.borderColor,

      primaryProductButtons: toBool(
        appearance.primary_product_buttons,
        base.primaryProductButtons,
      ),

      productPromoBg: appearance.product_promo_bg || base.productPromoBg,

      promoBg: appearance.product_promo_bg || base.promoBg,

      background: appearance.product_bg || base.background,
    };
  }, [bootstrapAppearance, themeAny.productCard]);

  const header = useMemo(() => {
    const base = {
      ...DEFAULT_HEADER,
      ...themeHeader,
    };

    return {
      ...base,

      logoWidthPx: Number(
        firstDefined(
          bootstrapHeader.logo_width,
          bootstrapHeader.header_logo_width,
          bootstrapAppearance.header_logo_width,
          themeHeader.logoWidthPx,
          themeHeader.logoWidth,
          themeHeader.logo_width,
          themeHeader.header_logo_width,
          base.logoWidthPx,
        ),
      ),

      logoHeightPx: Number(
        firstDefined(
          bootstrapHeader.logo_height,
          bootstrapHeader.header_logo_height,
          bootstrapAppearance.header_logo_height,
          themeHeader.logoHeightPx,
          themeHeader.logoHeight,
          themeHeader.logo_height,
          themeHeader.header_logo_height,
          base.logoHeightPx,
        ),
      ),

      desktopSideMenu: toBool(
        firstDefined(
          bootstrapHeader.desktop_sidemenu,
          bootstrapHeader.enable_desktop_sidemenu,
          bootstrapAppearance.enable_desktop_sidemenu,
          themeHeader.desktopSideMenu,
          themeHeader.desktop_sidemenu,
          themeHeader.enable_desktop_sidemenu,
        ),
        base.desktopSideMenu,
      ),

      centeredLogo: toBool(
        firstDefined(
          bootstrapHeader.centered_logo,
          bootstrapAppearance.centered_logo,
          themeHeader.centeredLogo,
          themeHeader.centered_logo,
        ),
        base.centeredLogo,
      ),

      mobileOnlyCenteredLogo: toBool(
        firstDefined(
          bootstrapHeader.mobile_only_centered_logo,
          bootstrapAppearance.mobile_only_centered_logo,
          themeHeader.mobileOnlyCenteredLogo,
          themeHeader.mobile_only_centered_logo,
        ),
        base.mobileOnlyCenteredLogo,
      ),

      stickyHeader: toBool(
        firstDefined(
          bootstrapHeader.sticky_header,
          bootstrapHeader.header_is_sticky,
          bootstrapAppearance.header_is_sticky,
          themeHeader.stickyHeader,
          themeHeader.sticky_header,
          themeHeader.header_is_sticky,
        ),
        base.stickyHeader,
      ),

      hideTopnav: toBool(
        firstDefined(
          bootstrapHeader.hide_topnav,
          bootstrapAppearance.hide_topnav,
          themeHeader.hideTopnav,
          themeHeader.hide_topnav,
        ),
        base.hideTopnav,
      ),

      hideTopnavLinks: toBool(
        firstDefined(
          bootstrapHeader.hide_topnav_links,
          bootstrapAppearance.hide_topnav_links,
          themeHeader.hideTopnavLinks,
          themeHeader.hide_topnav_links,
        ),
        base.hideTopnavLinks,
      ),

      hideTopnavContacts: toBool(
        firstDefined(
          bootstrapHeader.hide_topnav_contacts,
          bootstrapAppearance.hide_topnav_contacts,
          themeHeader.hideTopnavContacts,
          themeHeader.hide_topnav_contacts,
        ),
        base.hideTopnavContacts,
      ),

      topnavDark: toBool(
        firstDefined(
          bootstrapHeader.topnav_dark,
          bootstrapHeader.topnav_is_dark,
          bootstrapAppearance.topnav_is_dark,
          themeHeader.topnavDark,
          themeHeader.topnav_dark,
          themeHeader.topnav_is_dark,
        ),
        base.topnavDark,
      ),

      defaultMenu: toBool(
        firstDefined(
          bootstrapHeader.default_menu,
          bootstrapHeader.activate_default_menu,
          bootstrapAppearance.activate_default_menu,
          themeHeader.defaultMenu,
          themeHeader.default_menu,
          themeHeader.activate_default_menu,
        ),
        base.defaultMenu,
      ),
    };
  }, [bootstrapAppearance, bootstrapHeader, themeHeader]);

  const storefront = useMemo(() => {
    const base = {
      ...DEFAULT_STOREFRONT,
      ...themeStorefront,
    };

    return {
      ...base,

      transparentHeader:
        isHome &&
        toBool(
          firstDefined(
            bootstrapHeader.transparent_header,
            bootstrapHeader.trans_header,
            bootstrapAppearance.trans_header,
            themeStorefront.transparentHeader,
            themeStorefront.transparent_header,
            themeStorefront.trans_header,
          ),
          base.transparentHeader,
        ),

      sliderOverlay:
        isHome &&
        toBool(
          firstDefined(
            bootstrapHeader.slider_overlay,
            bootstrapHeader.slider_has_overlay,
            bootstrapAppearance.slider_has_overlay,
            themeStorefront.sliderOverlay,
            themeStorefront.slider_overlay,
            themeStorefront.slider_has_overlay,
          ),
          base.sliderOverlay,
        ),

      animateBlocks: toBool(
        firstDefined(
          bootstrapAppearance.animate_blocks,
          themeStorefront.animateBlocks,
          themeStorefront.animate_blocks,
        ),
        base.animateBlocks,
      ),

      secondReviews: toBool(
        firstDefined(
          bootstrapAppearance.enable_second_reviews,
          themeStorefront.secondReviews,
          themeStorefront.enable_second_reviews,
        ),
        base.secondReviews,
      ),

      enhancedProductsSlider: toBool(
        firstDefined(
          bootstrapAppearance.enhanced_products_slider,
          themeStorefront.enhancedProductsSlider,
          themeStorefront.enhanced_products_slider,
        ),
        base.enhancedProductsSlider,
      ),

      hideProductsSliderControls: toBool(
        firstDefined(
          bootstrapAppearance.hide_products_slider_controls,
          themeStorefront.hideProductsSliderControls,
          themeStorefront.hide_products_slider_controls,
        ),
        base.hideProductsSliderControls,
      ),

      enhancedBlocksTitles: toBool(
        firstDefined(
          bootstrapAppearance.enhanced_blocks_titles,
          themeStorefront.enhancedBlocksTitles,
          themeStorefront.enhanced_blocks_titles,
        ),
        base.enhancedBlocksTitles,
      ),

      mobileSmallBlocksTitles: toBool(
        firstDefined(
          bootstrapAppearance.mobile_small_blocks_titles,
          themeStorefront.mobileSmallBlocksTitles,
          themeStorefront.mobile_small_blocks_titles,
        ),
        base.mobileSmallBlocksTitles,
      ),

      disableRightClick: toBool(
        firstDefined(
          bootstrapAppearance.disable_right_click,
          themeStorefront.disableRightClick,
          themeStorefront.disable_right_click,
        ),
        base.disableRightClick,
      ),

      moreButtonEnabled: toBool(
        firstDefined(
          bootstrapAppearance.is_more_button_enabled,
          themeStorefront.moreButtonEnabled,
          themeStorefront.is_more_button_enabled,
        ),
        base.moreButtonEnabled,
      ),
    };
  }, [bootstrapAppearance, bootstrapHeader, isHome, themeStorefront]);

  const showNormalCountdown =
    Boolean(productCard.showCountdown) ||
    Boolean(productCard.showNormalCountdown);

  const enhancedMobileAddButton =
    Boolean(productCard.enhancedAddButtonInMobile) ||
    Boolean(productCard.enhancedMobileAddButton);

  const productPromoBg = pickColor(
    productCard.productPromoBg || productCard.promoBg,
    "#000000",
  );

  const desktopCenteredLogo =
    Boolean(header.centeredLogo) && !Boolean(header.mobileOnlyCenteredLogo);

  useEffect(() => {
    setSeoMode(seoMode);
  }, [seoMode, setSeoMode]);

  useEffect(() => {
    const route = String(data?.route ?? "").trim();
    if (!route) return;

    reset(route);
  }, [data?.route, reset]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const mode = isDarkMode ? "dark" : "light";

    root.setAttribute("data-malak-theme", mode);
    root.setAttribute("data-mk-theme", mode);

    body.setAttribute("data-malak-theme", mode);
    body.setAttribute("data-mk-theme", mode);

    return () => {
      root.removeAttribute("data-malak-theme");
      root.removeAttribute("data-mk-theme");

      body.removeAttribute("data-malak-theme");
      body.removeAttribute("data-mk-theme");
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (!storefront.disableRightClick) return;

    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const stopKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (
        event.key === "F12" ||
        (event.ctrlKey && key === "u") ||
        (event.ctrlKey && key === "s") ||
        (event.ctrlKey && key === "c") ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", stop);
    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("keydown", stopKeys);

    return () => {
      document.removeEventListener("contextmenu", stop);
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("keydown", stopKeys);
    };
  }, [storefront.disableRightClick]);

  useEffect(() => {
    const current = document.getElementById(CUSTOM_JS_SCRIPT_ID);
    if (current) current.remove();

    if (!customJs) return;

    const script = document.createElement("script");

    script.id = CUSTOM_JS_SCRIPT_ID;
    script.type = "text/javascript";
    script.dataset.malakCustomJs = "true";

    script.text = `
      ;(function () {
        try {
          ${customJs}
          window.dispatchEvent(new CustomEvent("mk:custom-js-loaded"));
        } catch (error) {
          console.error("[Malak custom JS]", error);
        }
      })();
    `;

    document.body.appendChild(script);

    return () => {
      const node = document.getElementById(CUSTOM_JS_SCRIPT_ID);
      if (node === script) node.remove();
    };
  }, [customJs]);

  const shellStyle = useMemo(() => {
    const primary = pickColor(
      firstDefined(
        bootstrapAppearance.primary_color,
        bootstrapAppearance.brand_color,
        bootstrapAppearance.accent_color,
        colors.primary,
      ),
      "#000000",
    );

    const primaryText = primaryContrast(primary);

    const fontFamily = resolveFontFamily(
      firstDefined(
        bootstrapAppearance.font_family,
        bootstrapAppearance.font,
        themeUi.font,
      ),
      themeUi.font,
    );

    const pageBg = isDarkMode
      ? pickColor(
          firstDefined(bootstrapAppearance.store_bg_dark, colors.storeBgDark),
          "#00333a",
        )
      : pickColor(
          firstDefined(bootstrapAppearance.store_bg, colors.storeBg),
          "#ffffff",
        );

    const pageBgSecondary = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.store_bg_secondary_dark,
            colors.storeBgSecondaryDark,
          ),
          "#005840",
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.store_bg_secondary,
            colors.storeBgSecondary,
          ),
          "#ffffff",
        );

    const textMain = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.store_text_color_dark,
            colors.textDark,
          ),
          "#ffffff",
        )
      : pickColor(
          firstDefined(bootstrapAppearance.store_text_color, colors.text),
          "#000000",
        );

    const textMuted = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.store_text_color_secondary_dark,
            colors.textSecondaryDark,
          ),
          "#cbd5e1",
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.store_text_color_secondary,
            colors.textSecondary,
          ),
          "#292929",
        );

    const headerBg = isDarkMode
      ? pickColor(
          firstDefined(bootstrapAppearance.header_bg_dark, colors.headerBgDark),
          "#4d3932",
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.header_bg,
            bootstrapHeader.header_bg,
            bootstrapHeader.background_color,
            colors.headerBg,
          ),
          "#ffffff",
        );

    const headerText = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.header_text_color_dark,
            colors.headerTextDark,
          ),
          textMain,
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.header_text_color,
            bootstrapHeader.header_text_color,
            bootstrapHeader.text_color,
            colors.headerText,
            colors.headerTextColor,
          ),
          textMain,
        );

    const footerBg = isDarkMode
      ? pickColor(
          firstDefined(bootstrapAppearance.footer_bg_dark, colors.footerBgDark),
          "#4d3932",
        )
      : pickColor(
          firstDefined(bootstrapAppearance.footer_bg, colors.footerBg),
          "#ffffff",
        );

    const footerText = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.footer_text_color_dark,
            colors.footerTextDark,
          ),
          "#6bbcc6",
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.footer_text_color,
            colors.footerText,
            colors.footerTextColor,
          ),
          textMain,
        );

    const bottomFooterBg = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.bottom_footer_bg_dark,
            colors.bottomFooterBgDark,
          ),
          "#000000",
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.bottom_footer_bg,
            colors.bottomFooterBg,
          ),
          footerBg,
        );

    const productBg = isDarkMode
      ? pickColor(
          firstDefined(
            bootstrapAppearance.product_bg_dark,
            colors.productBgDark,
          ),
          "#0e0f0f",
        )
      : pickColor(
          firstDefined(
            bootstrapAppearance.product_bg,
            colors.productBg,
            productCard.background,
          ),
          "#ffffff",
        );

    const dropdownBg = isDarkMode ? productBg : "#ffffff";

    const dropdownSideBg = isDarkMode
      ? pageBgSecondary
      : "color-mix(in srgb, #ffffff 94%, var(--mk-color-primary) 6%)";

    const dropdownText = isDarkMode ? textMain : "#111827";
    const dropdownMuted = isDarkMode ? textMuted : "#64748b";

    const searchBg = isDarkMode ? productBg : "#ffffff";

    const searchInputBg = isDarkMode
      ? "color-mix(in srgb, var(--mk-bg-dropdown) 92%, var(--mk-text-dropdown) 8%)"
      : "color-mix(in srgb, #ffffff 88%, var(--mk-color-primary) 12%)";

    const searchText = isDarkMode ? textMain : "#111827";
    const searchMuted = isDarkMode ? textMuted : "#64748b";

    const topnavBg = header.topnavDark
      ? "#111827"
      : "color-mix(in srgb, var(--mk-bg-header) 92%, var(--mk-color-primary) 8%)";

    const topnavText = header.topnavDark ? "#ffffff" : headerText;

    return {
      "--mk-color-primary": primary,
      "--mk-primary": primary,
      "--mk-accent": primary,
      "--mk-primary-contrast": primaryText,
      "--mk-primary-soft":
        "color-mix(in srgb, var(--mk-color-primary) 10%, transparent)",
      "--mk-primary-border":
        "color-mix(in srgb, var(--mk-color-primary) 24%, transparent)",
      "--mk-primary-hover":
        "color-mix(in srgb, var(--mk-color-primary) 88%, #000000 12%)",

      "--mk-bg-page": pageBg,
      "--mk-bg-page-secondary": pageBgSecondary,

      "--mk-bg-header": headerBg,
      "--mk-text-header": headerText,

      "--mk-bg-topnav": topnavBg,
      "--mk-text-topnav": topnavText,

      "--mk-bg-footer": footerBg,
      "--mk-bg-footer-bottom": bottomFooterBg,
      "--mk-text-footer": footerText,

      "--mk-bg-product": productBg,
      "--mk-bg-card": productBg,
      "--mk-bg-surface": productBg,
      "--mk-bg-soft": pageBgSecondary,

      "--mk-text-main": textMain,
      "--mk-text-muted": textMuted,

      "--mk-bg-dropdown": dropdownBg,
      "--mk-bg-dropdown-side": dropdownSideBg,
      "--mk-text-dropdown": dropdownText,
      "--mk-text-dropdown-muted": dropdownMuted,

      "--mk-bg-search": searchBg,
      "--mk-bg-search-input": searchInputBg,
      "--mk-text-search": searchText,
      "--mk-text-search-muted": searchMuted,

      "--mk-header-logo-width":
        Number(header.logoWidthPx) > 0 ? `${header.logoWidthPx}px` : "auto",

      "--mk-header-logo-height": cssPx(header.logoHeightPx, 48),
      "--mk-header-logo-max-width": "300px",
      "--mk-header-logo-max-height": "120px",

      "--mk-border-soft": isDarkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(15,23,42,0.08)",

      "--mk-border-medium": isDarkMode
        ? "rgba(255,255,255,0.12)"
        : "rgba(15,23,42,0.12)",

      "--mk-border-strong": isDarkMode
        ? "rgba(255,255,255,0.18)"
        : "rgba(15,23,42,0.18)",

      "--mk-font-family": fontFamily,

      "--malak-bg": pageBg,
      "--malak-bg-secondary": pageBgSecondary,
      "--malak-text": textMain,
      "--malak-text-secondary": textMuted,
      "--malak-header-bg": headerBg,
      "--malak-header-text": headerText,
      "--malak-footer-bg": footerBg,
      "--malak-footer-text": footerText,
      "--malak-product-bg": productBg,
      "--malak-primary": primary,
      "--malak-font": fontFamily,
      "--mk-product-card-bg": productBg,

      "--mk-product-card-border-color": productCard.hasBorder
        ? productCard.borderColor
        : "transparent",

      "--mk-product-card-radius": productCard.roundedCards ? "24px" : "0px",
      "--mk-product-card-radius-mobile": productCard.roundedCards
        ? "21px"
        : "0px",

      "--mk-product-image-height": `${productCard.imageHeightPx}px`,
      "--mk-product-image-fit": productCard.imageFit,
      "--mk-products-per-row": String(productCard.productsPerRow),

      "--mk-product-promo-bg": productPromoBg,

      "--mk-product-add-button-bg": productCard.primaryProductButtons
        ? primary
        : productCard.addButtonBg,

      "--mk-product-add-button-color": productCard.primaryProductButtons
        ? primaryText
        : productCard.addButtonColor,

      "--mk-product-add-button-hover-bg": productCard.primaryProductButtons
        ? "var(--mk-primary-hover)"
        : productCard.addButtonBg,

      "--mk-product-add-button-hover-color": productCard.primaryProductButtons
        ? primaryText
        : productCard.addButtonColor,
    } as CSSProperties;
  }, [
    bootstrapAppearance,
    bootstrapHeader,
    colors,
    header,
    isDarkMode,
    productCard,
    productPromoBg,
    themeUi.font,
  ]);

  return (
    <div
      className="mk-root mk-app-shell"
      data-theme-mode={isDarkMode ? "dark" : "light"}
      data-malak-theme={isDarkMode ? "dark" : "light"}
      data-mk-theme={isDarkMode ? "dark" : "light"}
      data-mk-device={theme.device}
      data-mk-header-sticky={header.stickyHeader ? "true" : "false"}
      data-mk-header-centered={desktopCenteredLogo ? "true" : "false"}
      data-mk-header-mobile-centered={
        header.mobileOnlyCenteredLogo ? "true" : "false"
      }
      data-mk-desktop-sidemenu={header.desktopSideMenu ? "true" : "false"}
      data-mk-default-menu={header.defaultMenu ? "true" : "false"}
      data-mk-hide-topnav={header.hideTopnav ? "true" : "false"}
      data-mk-hide-topnav-links={header.hideTopnavLinks ? "true" : "false"}
      data-mk-hide-topnav-contacts={
        header.hideTopnavContacts ? "true" : "false"
      }
      data-mk-topnav-dark={header.topnavDark ? "true" : "false"}
      data-mk-transparent-header={
        storefront.transparentHeader ? "true" : "false"
      }
      data-mk-slider-overlay={storefront.sliderOverlay ? "true" : "false"}
      data-mk-animate-blocks={storefront.animateBlocks ? "true" : "false"}
      data-mk-second-reviews={storefront.secondReviews ? "true" : "false"}
      data-mk-enhanced-products-slider={
        storefront.enhancedProductsSlider ? "true" : "false"
      }
      data-mk-hide-products-slider-controls={
        storefront.hideProductsSliderControls ? "true" : "false"
      }
      data-mk-enhanced-blocks-titles={
        storefront.enhancedBlocksTitles ? "true" : "false"
      }
      data-mk-mobile-small-blocks-titles={
        storefront.mobileSmallBlocksTitles ? "true" : "false"
      }
      data-mk-disable-right-click={
        storefront.disableRightClick ? "true" : "false"
      }
      data-mk-more-button-enabled={
        storefront.moreButtonEnabled ? "true" : "false"
      }
      data-mk-show-rating={productCard.showRating ? "true" : "false"}
      data-mk-show-rating-count={productCard.showRatingCount ? "true" : "false"}
      data-mk-show-discount={productCard.showDiscount ? "true" : "false"}
      data-mk-disable-out-products-effect={
        productCard.disableOutProductsEffect ? "true" : "false"
      }
      data-mk-product-zoom={productCard.zoomOnHover ? "true" : "false"}
      data-mk-product-shine={productCard.shineOnHover ? "true" : "false"}
      data-mk-rounded-cards={productCard.roundedCards ? "true" : "false"}
      data-mk-products-border={productCard.hasBorder ? "true" : "false"}
      data-mk-switch-image-on-hover={
        productCard.switchImageOnHover ? "true" : "false"
      }
      data-mk-productcard-options={productCard.showOptions ? "true" : "false"}
      data-mk-product-hover-style={productCard.hoverStyle}
      data-mk-fit-slider-products={
        productCard.fitSliderProducts ? "true" : "false"
      }
      data-mk-disable-products-lazyload={
        productCard.disableLazyload ? "true" : "false"
      }
      data-mk-show-normal-countdown={showNormalCountdown ? "true" : "false"}
      data-mk-mobile-mini-products={
        productCard.mobileMiniProducts ? "true" : "false"
      }
      data-mk-one-line-product-name={productCard.oneLineName ? "true" : "false"}
      data-mk-show-subtitle-on-mini={
        productCard.showSubtitleOnMini ? "true" : "false"
      }
      data-mk-mini-top-promotion={
        productCard.miniTopPromotion ? "true" : "false"
      }
      data-mk-free-images-height={
        productCard.freeImagesHeight ? "true" : "false"
      }
      data-mk-enhanced-add-btn-mobile={
        enhancedMobileAddButton ? "true" : "false"
      }
      data-mk-hide-quickview-mobile={
        productCard.hideQuickviewOnMobile ? "true" : "false"
      }
      data-mk-auto-play-products-slider={
        productCard.autoPlayProductsSlider ? "true" : "false"
      }
      data-mk-vertical-fixed-products={
        productCard.verticalFixedProducts ? "true" : "false"
      }
      data-mk-primary-product-buttons={
        productCard.primaryProductButtons ? "true" : "false"
      }
      style={shellStyle}
    >
      {customCss ? (
        <style
          id={CUSTOM_CSS_STYLE_ID}
          data-malak-custom-css="true"
          dangerouslySetInnerHTML={{
            __html: customCss,
          }}
        />
      ) : null}

      <MobileNavigationTransition enabled={isMobile} />
      <NavigationTransition enabled={!isMobile} />

      {isMobile ? (
        <MobileShell
          theme={theme}
          seoMode={seoMode}
          data={data}
          bootstrap={bootstrap}
          initialCartCount={initialCartCount}
        >
          {children}
        </MobileShell>
      ) : (
        <DesktopShell
          theme={theme}
          seoMode={seoMode}
          data={data}
          bootstrap={bootstrap}
          initialCartCount={initialCartCount}
        >
          {children}
        </DesktopShell>
      )}

      <ProductCartRuntime currencies={bootstrap?.currencies ?? null} />
      <ProductFavoritesRuntime />
      <ProductQuickView />
      <ToastProvider />
    </div>
  );
}