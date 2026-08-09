// FILE: apps/storefront/src/themes/basit/app-shell/_components/DesktopHeader.tsx

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Icon from "@/components/icon/Icon";
import DesktopMegaNav from "./DesktopMegaNav";
import BasitMenuDrawer from "./BasitMenuDrawer";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../../bootstrap/types";

const CurrencySwitcher = dynamic(() => import("./CurrencySwitcher"), {
  ssr: false,
  loading: () => null,
});

const SearchOverlay = dynamic(() => import("./SearchOverlay"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  theme: any;
  bootstrap?: MalakBootstrap;
  authed: boolean;
  customer: any;
  onOpenAuth: () => void;
  seoMode: SeoUrlMode;
  initialCartCount?: number;
  homeFirstSectionHasSlider?: boolean;
  logoUrl?: string | null;
  logoAlt?: string;
  slogan?: string | null;
  className?: string;
};

function text(value: any) {
  return String(value ?? "").trim();
}

function pickText(...values: any[]) {
  for (const value of values) {
    const t = text(value);
    if (t) return t;
  }

  return "";
}

function pickBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  if (value && typeof value === "object") {
    if ("enabled" in value) return pickBool(value.enabled, fallback);
    if ("checked" in value) return pickBool(value.checked, fallback);
    if ("value" in value) return pickBool(value.value, fallback);
  }

  return fallback;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function normalizeHref(value: any) {
  const href = text(value);
  if (!href) return "";

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  return `/${href}`;
}

function isAnnouncementExpired(endsAt?: string | null) {
  const raw = text(endsAt);
  if (!raw) return false;

  const time = new Date(raw).getTime();
  if (!Number.isFinite(time)) return false;

  return Date.now() > time;
}

function normalizeAnnouncementPages(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => text(x).toLowerCase()).filter(Boolean);
  }

  const raw = text(value);
  if (!raw) return ["all"];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map((x) => text(x).toLowerCase()).filter(Boolean);
      }
    } catch {
      //
    }
  }

  return raw
    .split(",")
    .map((x) => text(x).toLowerCase())
    .filter(Boolean);
}

function isHomePath(pathname: string | null) {
  const path = text(pathname || "/");
  return path === "/" || path === "";
}

function isProductPath(pathname: string) {
  const p = text(pathname).toLowerCase();

  if (!p || p === "/") return false;

  return (
    p.includes("/product/") ||
    p.includes("/products/") ||
    /\/p[0-9]+(?:\/)?$/.test(p) ||
    /\/p\/[^/]+(?:\/)?$/.test(p)
  );
}

function isCategoryPath(pathname: string) {
  const p = text(pathname).toLowerCase();

  if (!p || p === "/") return false;

  return (
    p.includes("/category/") ||
    p.includes("/categories/") ||
    p.includes("/c/") ||
    /\/c[0-9]+(?:\/)?$/.test(p)
  );
}

function shouldShowAnnouncementOnPage(args: {
  pages: string[];
  pathname?: string;
}) {
  const pathname = text(args.pathname || "/") || "/";
  const pages = Array.isArray(args.pages) ? args.pages : ["all"];

  if (pages.length === 0) return true;
  if (pages.includes("all")) return true;

  if (
    (pathname === "/" || pathname === "") &&
    (pages.includes("home") || pages.includes("homepage"))
  ) {
    return true;
  }

  if (pathname.includes("/cart") && pages.includes("cart")) return true;
  if (pathname.includes("/account") && pages.includes("account")) return true;

  if (pages.includes("product") && isProductPath(pathname)) return true;
  if (pages.includes("category") && isCategoryPath(pathname)) return true;

  return false;
}

function AnnouncementBar({ bootstrap }: { bootstrap?: MalakBootstrap }) {
  const pathname = usePathname();
  const announcement = (bootstrap as any)?.announcement;

  const enabled = pickBool(announcement?.enabled, false);
  const title = text(announcement?.title);
  const content = pickText(announcement?.content, announcement?.text);
  const href = normalizeHref(announcement?.href);
  const icon = text(announcement?.icon) || "Notification01";
  const linkLabel = pickText(
    announcement?.link_label,
    href ? "عرض التفاصيل" : "",
  );

  const textColor = text(announcement?.text_color) || "#111827";
  const backgroundColor = text(announcement?.background_color) || "#bdf5ea";
  const expired = isAnnouncementExpired(announcement?.ends_at);

  const pages = useMemo(
    () => normalizeAnnouncementPages(announcement?.pages),
    [announcement?.pages],
  );

  const visibleOnPage = useMemo(() => {
    return shouldShowAnnouncementOnPage({
      pages,
      pathname: pathname || "/",
    });
  }, [pages, pathname]);

  const storageKey = useMemo(() => {
    return [
      "mk-announcement",
      title,
      content,
      href,
      textColor,
      backgroundColor,
      text(announcement?.ends_at),
      pages.join("|"),
    ].join(":");
  }, [
    title,
    content,
    href,
    textColor,
    backgroundColor,
    announcement?.ends_at,
    pages,
  ]);

  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const hidden = window.sessionStorage.getItem(storageKey) === "1";
      setDismissed(hidden);
    } catch {
      setDismissed(false);
    } finally {
      setReady(true);
    }
  }, [storageKey]);

  function handleDismiss() {
    setDismissed(true);

    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      //
    }
  }

  if (!ready) return null;
  if (!enabled) return null;
  if (expired) return null;
  if (dismissed) return null;
  if (!visibleOnPage) return null;
  if (!title && !content) return null;

  const inner = (
    <div className="mk-announcement__inner">
      <span className="mk-announcement__icon" aria-hidden="true">
        <Icon icon={icon as any} className="text-[18px]" />
      </span>

      <div className="mk-announcement__text">
        {title ? (
          <span className="mk-announcement__title">{title}</span>
        ) : null}

        {content ? (
          <span className="mk-announcement__body">{content}</span>
        ) : null}

        {href && linkLabel ? (
          <span className="mk-announcement__linkText">{linkLabel}</span>
        ) : null}
      </div>
    </div>
  );

  const contentNode = href ? (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mk-announcement__contentWrap"
      >
        {inner}
      </a>
    ) : (
      <Link href={href} prefetch={false} className="mk-announcement__contentWrap">
        {inner}
      </Link>
    )
  ) : (
    <div className="mk-announcement__contentWrap">{inner}</div>
  );

  return (
    <div
      className="mk-announcement"
      style={
        {
          "--mk-announcement-bg": backgroundColor,
          "--mk-announcement-text": textColor,
        } as CSSProperties
      }
    >
      <div className="mk-announcement__container">
        {contentNode}

        <button
          type="button"
          onClick={handleDismiss}
          className="mk-announcement__close"
          aria-label="إخفاء الإعلان"
          title="إخفاء الإعلان"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function DesktopHeader({
  theme,
  bootstrap,
  authed,
  customer,
  onOpenAuth,
  seoMode,
  initialCartCount = 0,
  homeFirstSectionHasSlider = false,
  logoUrl,
  logoAlt,
  slogan,
  className = "",
}: Props) {
  const pathname = usePathname();

  const header = (theme as any)?.header || {};
  const storefront = (theme as any)?.storefront || {};
  const bootstrapHeader: any = (bootstrap as any)?.header || {};
  const bootstrapAppearance: any = (bootstrap as any)?.appearance || {};
  const marketingSearch: any = (bootstrap as any)?.marketing?.search || {};

  const isHome = isHomePath(pathname);

  const headerStyle =
    pickText(
      bootstrapHeader.header_style,
      bootstrapAppearance.header_style,
      header?.headerStyle,
      header?.header_style,
    ).toLowerCase() === "full_width"
      ? "full_width"
      : "floating";

  const headerCorners =
    pickText(
      bootstrapHeader.header_corners,
      bootstrapAppearance.header_corners,
      header?.headerCorners,
      header?.header_corners,
    ).toLowerCase() === "square"
      ? "square"
      : "rounded";

  const sidebarBackgroundColor = pickText(
    bootstrapAppearance.sidebar_bg,
    bootstrapHeader.sidebar_bg,
    header?.sidebarBg,
    header?.sidebar_bg,
    "#ffffff",
  );

  const sidebarTextColor = pickText(
    bootstrapAppearance.sidebar_text_color,
    bootstrapHeader.sidebar_text_color,
    header?.sidebarTextColor,
    header?.sidebar_text_color,
    "#111111",
  );

  const showProductVideos = pickBool(
    firstDefined(
      bootstrapAppearance.enable_product_video_shorts,
      (bootstrap as any)?.theme?.settings?.enable_product_video_shorts,
      (bootstrap as any)?.theme?.options?.enable_product_video_shorts,
      (theme as any)?.settings?.enable_product_video_shorts,
      (theme as any)?.options?.enable_product_video_shorts,
    ),
    true,
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    function handleMenuOpen() {
      setMenuOpen(true);
    }

    window.addEventListener("mk:menu:open", handleMenuOpen);

    return () => {
      window.removeEventListener("mk:menu:open", handleMenuOpen);
    };
  }, []);

  const baseLogoUrl =
    bootstrap?.header?.logo_url ??
    bootstrap?.store?.logo_url ??
    logoUrl ??
    theme?.store?.logoUrl ??
    null;

  const reversedLogoUrl = pickText(
    bootstrapHeader.reversed_logo,
    bootstrapAppearance.reversed_logo,
    storefront?.reversedLogoUrl,
    storefront?.reversed_logo,
  );

  const showReversedLogo = pickBool(
    firstDefined(
      bootstrapHeader.show_reversed_logo,
      bootstrapAppearance.show_reversed_logo,
      storefront?.showReversedLogo,
      storefront?.show_reversed_logo,
    ),
    false,
  );

  const stickyHeader = pickBool(
    firstDefined(
      bootstrapHeader.sticky_header,
      bootstrapHeader.header_is_sticky,
      bootstrapAppearance.header_is_sticky,
      header?.stickyHeader,
      header?.sticky_header,
      header?.header_is_sticky,
    ),
    true,
  );

  const desktopSideMenu = pickBool(
    firstDefined(
      bootstrapHeader.desktop_sidemenu,
      bootstrapHeader.enable_desktop_sidemenu,
      bootstrapAppearance.enable_desktop_sidemenu,
      header?.desktopSideMenu,
      header?.desktop_sidemenu,
      header?.enable_desktop_sidemenu,
    ),
    false,
  );

  const defaultMenu = pickBool(
    firstDefined(
      bootstrapHeader.default_menu,
      bootstrapHeader.activate_default_menu,
      bootstrapAppearance.activate_default_menu,
      header?.defaultMenu,
      header?.default_menu,
      header?.activate_default_menu,
    ),
    true,
  );

  const topnavDark = pickBool(
    firstDefined(
      bootstrapHeader.topnav_dark,
      bootstrapHeader.topnav_is_dark,
      bootstrapAppearance.topnav_is_dark,
      header?.topnavDark,
      header?.topnav_dark,
      header?.topnav_is_dark,
    ),
    false,
  );

  const transparentHeader =
    isHome &&
    pickBool(
      firstDefined(
        bootstrapHeader.transparent_header,
        bootstrapHeader.trans_header,
        bootstrapAppearance.trans_header,
        storefront?.transparentHeader,
        storefront?.transparent_header,
        storefront?.trans_header,
      ),
      false,
    );

  const sliderOverlay =
    isHome &&
    pickBool(
      firstDefined(
        bootstrapHeader.slider_overlay,
        bootstrapHeader.slider_has_overlay,
        bootstrapAppearance.slider_has_overlay,
        storefront?.sliderOverlay,
        storefront?.slider_overlay,
        storefront?.slider_has_overlay,
      ),
      false,
    );

  // Theme options are global in Basit. When the merchant enables the
  // alternate header logo, use it consistently on every route.
  const useReversedLogo = Boolean(reversedLogoUrl) && showReversedLogo;

  // Keep the selected logo identical before and after scrolling.
  // Basit no longer has a separate "original logo on scroll" option.
  const activeLogoUrl = useReversedLogo ? reversedLogoUrl : baseLogoUrl;
  const safeLogoSrc = activeLogoUrl || "/rtl_logo.svg";

  const finalLogoAlt = pickText(
    bootstrap?.header?.logo_alt,
    logoAlt,
    bootstrap?.store?.name,
    theme?.store?.name,
    "Logo",
  );

  const finalSlogan = pickText(bootstrap?.header?.slogan, slogan);

  const finalSloganIcon = pickText(
    bootstrapHeader.slogan_icon,
    bootstrapHeader.slogan_icon_name,
    "StarAward01",
  );

  const showSearch = bootstrap?.header?.show_search !== false;

  const searchPlaceholder = pickText(
    marketingSearch?.placeholder,
    (bootstrap as any)?.search?.placeholder,
    "مالذي تبحث عنه ؟",
  );

  // مجموعات البحث بيانات ثابتة ولا يجب ربط ظهورها بمفتاح تفعيل آخر.
  // قد تكون المجموعات محفوظة بينما enabled غير موجود أو false في ثيم جديد.
  const searchGroups = Array.isArray(marketingSearch?.groups)
    ? marketingSearch.groups
    : Array.isArray((bootstrap as any)?.search?.groups)
      ? (bootstrap as any).search.groups
      : Array.isArray((bootstrap as any)?.smart_search?.groups)
        ? (bootstrap as any).smart_search.groups
        : undefined;

  const showSlogan =
    (bootstrap as any)?.header?.show_slogan !== false && Boolean(finalSlogan);

  const shouldTrackScroll =
    stickyHeader ||
    transparentHeader ||
    sliderOverlay;

  useEffect(() => {
    if (!shouldTrackScroll) {
      setCompact(false);
      return;
    }

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;

        setCompact((current) => {
          if (!current && y > 140) return true;
          if (current && y <= 8) return false;

          return current;
        });

        ticking = false;
      });
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [shouldTrackScroll]);

  return (
    <>
      <AnnouncementBar bootstrap={bootstrap} />

      <header
        dir="rtl"
        className={[
          "bs-brand-header",
          `bs-brand-header--${headerStyle === "full_width" ? "full-width" : "floating"}`,
          `bs-brand-header--corners-${headerCorners}`,
          compact ? "bs-brand-header--compact" : "",
          stickyHeader ? "bs-brand-header--sticky" : "",
          isHome ? "bs-brand-header--home" : "bs-brand-header--inner-page",
          searchOpen ? "bs-brand-header--search-open" : "",
          className,
        ].filter(Boolean).join(" ")}
        data-header-style={headerStyle}
        data-header-corners={headerCorners}
      >
        <div className="bs-brand-header__shell">
          <div className="bs-brand-header__actions">
            <DesktopMegaNav
              className="bs-brand-header__nav"
              theme={theme}
              bootstrap={bootstrap}
              authed={authed}
              customer={customer}
              onOpenAuth={onOpenAuth}
              seoMode={seoMode}
              initialCartCount={initialCartCount}
              compactActionsOnly
            />

            {showSearch ? (
              <SearchOverlay
                placeholder={searchPlaceholder}
                groups={searchGroups}
                currencies={bootstrap?.currencies}
                tax={bootstrap?.tax}
                onOpenChange={setSearchOpen}
                triggerVariant="icon"
              />
            ) : null}
          </div>

          <div className="bs-brand-header__brand">
            <span className="bs-brand-header__line" aria-hidden="true" />
            <Link href="/" prefetch={false} className="bs-brand-header__logo" aria-label={finalLogoAlt}>
              <img
                src={safeLogoSrc}
                alt={finalLogoAlt}
                className="bs-brand-header__logo-img"
                loading="eager"
                decoding="async"
              />
            </Link>
            <span className="bs-brand-header__line" aria-hidden="true" />
          </div>

          <div className="bs-brand-header__tools">
            {(bootstrap as any)?.currencies?.has_multiple ? (
              <CurrencySwitcher
                storeId={bootstrap?.store?.id}
                currencies={bootstrap?.currencies}
              />
            ) : (
              <span className="bs-brand-header__currencyText">
                {pickText((bootstrap as any)?.currencies?.selected?.code, (bootstrap as any)?.currencies?.default_code, "SAR")}
              </span>
            )}

            {showProductVideos ? (
              <Link
                href="/videos"
                prefetch={false}
                className="bs-brand-header__videosLink"
                aria-label="فيديوهات المنتجات"
                title="فيديوهات المنتجات"
              >
                <Icon icon={"Video01" as any} size={23} />
              </Link>
            ) : null}

            <button
              type="button"
              className="bs-brand-header__menuButton"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen(true);
              }}
              aria-label="فتح القائمة"
              aria-expanded={menuOpen}
            >
              <Icon icon="Menu01" size={24} />
            </button>
          </div>
        </div>
      </header>

      <BasitMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        bootstrap={bootstrap}
        seoMode={seoMode}
        backgroundColor={sidebarBackgroundColor}
        textColor={sidebarTextColor}
        showProductVideos={showProductVideos}
      />
    </>
  );
}
