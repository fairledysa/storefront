// FILE: apps/storefront/src/themes/basit/app-shell/_components/DesktopMegaNav.tsx

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Icon from "@/components/icon/Icon";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../../bootstrap/types";

const MegaMenu = dynamic(() => import("./MegaMenu"), {
  ssr: false,
  loading: () => null,
});

const AccountMenu = dynamic(() => import("./AccountMenu"), {
  ssr: false,
  loading: () => null,
});

const CurrencySwitcher = dynamic(() => import("./CurrencySwitcher"), {
  ssr: false,
  loading: () => null,
});

type MarketingNavigation = {
  type: string;
  label: string;
  href: string;
  icon?: string;
};

type Props = {
  className?: string;
  authed: boolean;
  customer: any;
  onOpenAuth: () => void;
  theme?: any;
  seoMode: SeoUrlMode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
  compactActionsOnly?: boolean;
};

function safeNumber(x: any) {
  const n = Number(x ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function readEventQty(event: Event) {
  const detail = (event as CustomEvent<any>).detail || {};

  return (
    safeNumber(detail.qty) ||
    safeNumber(detail.addedQty) ||
    safeNumber(detail.added_qty) ||
    safeNumber(detail.count) ||
    1
  );
}

function readCartCountPayload(json: any) {
  return safeNumber(
    json?.count ??
      json?.cartCount ??
      json?.cart_count ??
      json?.total ??
      json?.data?.count ??
      json?.data?.cartCount ??
      json?.data?.cart_count ??
      json?.data?.total,
  );
}

function hasChildren(category: any) {
  return Array.isArray(category?.children) && category.children.length > 0;
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

export default function DesktopMegaNav({
  className = "",
  authed,
  customer,
  onOpenAuth,
  seoMode,
  theme,
  bootstrap,
  initialCartCount = 0,
  compactActionsOnly = false,
}: Props) {
  const tree = bootstrap?.navigation?.categories ?? [];
  const megaMenu = (bootstrap as any)?.navigation?.mega_menu;
  const header = theme?.header || {};
  const currencies = bootstrap?.currencies;

  const showCurrencySwitcher = Boolean(
    currencies?.has_multiple &&
      Array.isArray(currencies.items) &&
      currencies.items.length > 1,
  );

  const roots = useMemo(() => {
    return Array.isArray(tree) ? tree : [];
  }, [tree]);

  const hasAnyMegaContent = roots.length > 0;

  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [overlayTop, setOverlayTop] = useState(0);
  const [cartCount, setCartCount] = useState(() =>
    safeNumber(initialCartCount),
  );
  const [marketingNavigation, setMarketingNavigation] =
    useState<MarketingNavigation[]>([]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const cartSyncTimer = useRef<number | null>(null);

  const OPEN_DELAY = 60;
  const CLOSE_DELAY = 140;
  const CART_SYNC_DELAY = 220;

  useEffect(() => {
    setCartCount(safeNumber(initialCartCount));
  }, [initialCartCount]);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/catalog/marketing-navigation", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
        setMarketingNavigation(
          items
            .map((item: any) => ({
              type: s(item?.type),
              label: s(item?.label),
              href: s(item?.href),
              icon: s(item?.icon),
            }))
            .filter((item: MarketingNavigation) => item.label && item.href),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setMarketingNavigation([]);
      });

    return () => controller.abort();
  }, []);

  const loadCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart/count", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);
      const nextCount = readCartCountPayload(json);

      setCartCount(nextCount);
    } catch {
      // لا نصفر العداد عند فشل الشبكة حتى لا يختفي الرقم غلط.
    }
  }, []);

  const scheduleCartSync = useCallback(() => {
    if (cartSyncTimer.current) {
      window.clearTimeout(cartSyncTimer.current);
    }

    cartSyncTimer.current = window.setTimeout(() => {
      cartSyncTimer.current = null;
      void loadCartCount();
    }, CART_SYNC_DELAY);
  }, [loadCartCount]);

  useEffect(() => {
    const onOptimisticAdd = (event: Event) => {
      const qty = readEventQty(event);
      setCartCount((current) => safeNumber(current + qty));
    };

    const onIncrement = (event: Event) => {
      const qty = readEventQty(event);
      setCartCount((current) => safeNumber(current + qty));
    };

    const onDecrement = (event: Event) => {
      const qty = readEventQty(event);
      setCartCount((current) => Math.max(0, safeNumber(current) - qty));
    };

    const onSet = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {};
      const count =
        detail.count ?? detail.cartCount ?? detail.cart_count ?? detail.total;

      setCartCount(safeNumber(count));
    };

    const onChange = () => {
      scheduleCartSync();
    };

    window.addEventListener("cart:optimistic-add", onOptimisticAdd);
    window.addEventListener("cart:count:increment", onIncrement);
    window.addEventListener("cart:count:decrement", onDecrement);
    window.addEventListener("cart:count:set", onSet);
    window.addEventListener("cart:changed", onChange);

    return () => {
      window.removeEventListener("cart:optimistic-add", onOptimisticAdd);
      window.removeEventListener("cart:count:increment", onIncrement);
      window.removeEventListener("cart:count:decrement", onDecrement);
      window.removeEventListener("cart:count:set", onSet);
      window.removeEventListener("cart:changed", onChange);

      if (cartSyncTimer.current) {
        window.clearTimeout(cartSyncTimer.current);
        cartSyncTimer.current = null;
      }
    };
  }, [scheduleCartSync]);

  function clearTimers() {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);

    openTimer.current = null;
    closeTimer.current = null;
  }

  function calcOverlayTop() {
    const root = rootRef.current;
    if (!root) return;

    const headerBottom = root.closest(".mk-header__bottom") as HTMLElement | null;
    const headerEl = root.closest(".mk-header") as HTMLElement | null;

    const target = headerBottom || headerEl || root;
    const rect = target.getBoundingClientRect();

    const top = Math.max(0, Math.round(rect.bottom) - 1);

    setOverlayTop(top);
  }

  function openAllSoon() {
    if (!hasAnyMegaContent) {
      clearTimers();
      setOpen(false);
      setShowAll(true);
      setActiveRootId(null);
      return;
    }

    clearTimers();

    openTimer.current = window.setTimeout(() => {
      calcOverlayTop();
      setShowAll(true);
      setActiveRootId(null);
      setOpen(true);
    }, OPEN_DELAY);
  }

  function openRootSoon(root: any) {
    if (!hasChildren(root)) {
      clearTimers();
      setOpen(false);
      setShowAll(false);
      setActiveRootId(null);
      return;
    }

    clearTimers();

    openTimer.current = window.setTimeout(() => {
      calcOverlayTop();
      setShowAll(false);
      setActiveRootId(String(root.id));
      setOpen(true);
    }, OPEN_DELAY);
  }

  function closeSoon() {
    clearTimers();

    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, CLOSE_DELAY);
  }

  function closeNow() {
    clearTimers();
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeNow();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    calcOverlayTop();

    const onResize = () => calcOverlayTop();
    const onScroll = () => calcOverlayTop();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const megaCategories = useMemo(() => {
    if (!Array.isArray(tree)) return [];

    if (showAll) {
      return tree;
    }

    if (!activeRootId) return [];

    return tree.filter((root: any) => {
      return String(root.id) === String(activeRootId);
    });
  }, [tree, showAll, activeRootId]);

  const showAllMega = open && showAll && hasAnyMegaContent;
  const showRootMega = open && !showAll && Boolean(activeRootId);

  if (compactActionsOnly) {
    return (
      <div
        ref={rootRef}
        dir="ltr"
        className={["mk-desktop-nav", "mk-desktop-nav--compact-actions", className].filter(Boolean).join(" ")}
      >
        <div className="mk-desktop-nav__left">
          <Link
            href="/cart"
            prefetch={false}
            aria-label={cartCount > 0 ? `الذهاب إلى السلة، عدد المنتجات ${cartCount}` : "الذهاب إلى السلة"}
            className="mk-desktop-nav__iconLink mk-desktop-nav__cart"
            data-mk-cart-target="true"
            data-mk-cart-button="true"
            data-mk-cart-icon="true"
            data-mk-cart-count={cartCount}
          >
            <Icon icon="ShoppingBag02" size={23} />
            {cartCount > 0 ? (
              <span className="mk-desktop-nav__cartBadge" data-mk-cart-count-badge>{cartCount}</span>
            ) : null}
          </Link>

          <Link href="/account/favorites" prefetch={false} className="mk-desktop-nav__iconLink" aria-label="المفضلة">
            <Icon icon="Favourite" size={22} />
          </Link>

          <AccountMenu authed={authed} customer={customer} onOpenAuth={onOpenAuth} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      dir="ltr"
      className={["mk-desktop-nav", className].filter(Boolean).join(" ")}
      data-mk-desktop-sidemenu={header.desktopSideMenu ? "true" : "false"}
      data-mk-default-menu={header.defaultMenu ? "true" : "false"}
      style={
        {
          "--mk-desktop-overlay-top": `${overlayTop}px`,
        } as CSSProperties
      }
    >
      <div dir="ltr" className="mk-desktop-nav__left">
        <Link
          href="/cart"
          prefetch={false}
          aria-label={
            cartCount > 0
              ? `الذهاب إلى السلة، عدد المنتجات ${cartCount}`
              : "الذهاب إلى السلة"
          }
          className="mk-desktop-nav__iconLink mk-desktop-nav__cart"
          data-mk-cart-target="true"
          data-mk-cart-button="true"
          data-mk-cart-icon="true"
          data-mk-cart-count={cartCount}
        >
          <Icon icon="ShoppingBag02" size={25} />

          {cartCount > 0 ? (
            <span className="mk-desktop-nav__cartBadge" data-mk-cart-count-badge>
              {cartCount}
            </span>
          ) : null}
        </Link>

        <span className="mk-vdiv" />

        <button
          type="button"
          className="mk-desktop-nav__iconButton"
          aria-label="الإشعارات"
        >
          <Icon icon="Notification01" size={25} />
        </button>

        <span className="mk-vdiv" />

        <AccountMenu
          authed={authed}
          customer={customer}
          onOpenAuth={onOpenAuth}
        />

        <span className="mk-vdiv" />

        <div className="mk-desktop-nav__deliveryCurrency" dir="rtl">
          {showCurrencySwitcher ? (
            <>
              <span className="mk-vdiv mk-vdiv--currency" />

              <CurrencySwitcher
                storeId={bootstrap?.store?.id}
                currencies={currencies}
              />
            </>
          ) : null}
        </div>
      </div>

      <div dir="rtl" className="mk-desktop-nav__right">
        <button
          type="button"
          className="mk-desktop-nav__menuButton"
          aria-label="القائمة"
          onMouseEnter={
            header.desktopSideMenu && hasAnyMegaContent
              ? () => {
                  openAllSoon();
                }
              : undefined
          }
          onClick={() => {
            if (!hasAnyMegaContent) {
              closeNow();
              return;
            }

            calcOverlayTop();
            setShowAll(true);
            setActiveRootId(null);
            setOpen((value) => !(value && showAll));
          }}
        >
          <Icon icon="Menu01" size={18} />
        </button>

        {tree.length > 0 && header.defaultMenu && hasAnyMegaContent ? (
          <div
            className="mk-desktop-nav__itemWrap"
            onMouseEnter={() => {
              openAllSoon();
            }}
            onMouseLeave={closeSoon}
          >
            <button
              type="button"
              className="mk-desktop-nav__linkButton"
              aria-expanded={showAllMega}
              aria-haspopup="dialog"
              onClick={() => {
                calcOverlayTop();
                setShowAll(true);
                setActiveRootId(null);
                setOpen((value) => !(value && showAll));
              }}
              onFocus={() => {
                calcOverlayTop();
                setShowAll(true);
                setActiveRootId(null);
                setOpen(true);
              }}
            >
              <span>جميع الأقسام</span>
              <span className="mk-desktop-nav__chevron">▾</span>

              {showAllMega ? (
                <span className="mk-desktop-nav__underline" />
              ) : null}
            </button>

            {showAllMega ? (
              <button
                type="button"
                aria-label="Close categories overlay"
                className="mk-desktop-nav__overlay"
                onClick={closeNow}
              />
            ) : null}

            {showAllMega ? (
              <div
                className="mk-desktop-nav__megaWrap"
                onMouseEnter={() => {
                  clearTimers();
                  setOpen(true);
                  setShowAll(true);
                  setActiveRootId(null);
                }}
                onMouseLeave={closeSoon}
              >
                <MegaMenu
                  categories={megaCategories}
                  megaMenu={megaMenu}
                  showSide={true}
                  initialActiveId={null}
                  onNavigate={closeNow}
                  seoMode={seoMode}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {roots.map((root: any) => {
          const href = s(root.href) || "/";
          const rootHasChildren = hasChildren(root);
          const rootName = s(root.name);
          const isNewArrivalRoot = /وصل\s*حديث/i.test(rootName);
          const visibleMarketingItems = marketingNavigation.filter(
            (item) => !(item.type === "new_arrival" && roots.some((entry: any) => /وصل\s*حديث/i.test(s(entry?.name)))),
          );

          const marketingLinks = isNewArrivalRoot ? visibleMarketingItems.map((item) => (
            <Link
              key={`marketing-${item.type}`}
              href={item.href}
              prefetch={false}
              className="mk-desktop-nav__rootLink mk-desktop-nav__rootLink--marketing"
              onMouseEnter={() => {
                clearTimers();
                setOpen(false);
                setShowAll(false);
                setActiveRootId(null);
              }}
              onFocus={() => {
                closeNow();
                setShowAll(false);
                setActiveRootId(null);
              }}
            >
              {item.icon ? <span aria-hidden="true" className="mk-desktop-nav__marketingIcon">{item.icon}</span> : null}
              <span>{item.label}</span>
            </Link>
          )) : null;

          const isActiveRoot = showRootMega && rootHasChildren && String(activeRootId) === String(root.id);

          if (!rootHasChildren) {
            return (
              <Fragment key={root.id}>
                {marketingLinks}
                <Link
                  href={href}
                  prefetch={false}
                  className="mk-desktop-nav__rootLink"
                  onMouseEnter={() => {
                    clearTimers();
                    setOpen(false);
                    setShowAll(false);
                    setActiveRootId(null);
                  }}
                  onFocus={() => {
                    closeNow();
                    setShowAll(false);
                    setActiveRootId(null);
                  }}
                >
                  {root.name}
                </Link>
              </Fragment>
            );
          }

          return (
            <Fragment key={root.id}>
              {marketingLinks}
              <div
                className="mk-desktop-nav__itemWrap"
                onMouseEnter={() => openRootSoon(root)}
                onMouseLeave={closeSoon}
              >
                <Link href={href} prefetch={false} className="mk-desktop-nav__rootLink" onFocus={() => openRootSoon(root)}>
                  {root.name}
                  {isActiveRoot ? <span className="mk-desktop-nav__underline" /> : null}
                </Link>

                {isActiveRoot ? (
                  <>
                    <button type="button" aria-label="Close categories overlay" className="mk-desktop-nav__overlay" onClick={closeNow} />
                    <div
                      className="mk-desktop-nav__megaWrap"
                      onMouseEnter={() => {
                        clearTimers();
                        setOpen(true);
                        setShowAll(false);
                        setActiveRootId(String(root.id));
                      }}
                      onMouseLeave={closeSoon}
                    >
                      <MegaMenu categories={megaCategories} megaMenu={megaMenu} showSide={false} initialActiveId={activeRootId} onNavigate={closeNow} seoMode={seoMode} />
                    </div>
                  </>
                ) : null}
              </div>
            </Fragment>
          );
        })}

        {!roots.some((root: any) => /وصل\s*حديث/i.test(s(root?.name)))
          ? marketingNavigation.map((item) => (
              <Link key={`marketing-fallback-${item.type}`} href={item.href} prefetch={false} className="mk-desktop-nav__rootLink mk-desktop-nav__rootLink--marketing">
                {item.icon ? <span aria-hidden="true" className="mk-desktop-nav__marketingIcon">{item.icon}</span> : null}
                <span>{item.label}</span>
              </Link>
            ))
          : null}
      </div>
    </div>
  );
}