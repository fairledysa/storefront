// FILE: apps/storefront/src/themes/malak/app-shell/_components/DesktopMegaNav.tsx

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Icon from "@/components/icon/Icon";
import MegaMenu from "./MegaMenu";
import AccountMenu from "./AccountMenu";
import CurrencySwitcher from "./CurrencySwitcher";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../../bootstrap/types";

type Props = {
  className?: string;
  authed: boolean;
  customer: any;
  onOpenAuth: () => void;
  theme?: any;
  seoMode: SeoUrlMode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
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

function hasChildren(category: any) {
  return Array.isArray(category?.children) && category.children.length > 0;
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeInternalPrefetchHref(value: unknown) {
  const href = s(value);

  if (!href) return "";
  if (href === "#") return "";
  if (href.startsWith("#")) return "";

  if (href.startsWith("http://")) return "";
  if (href.startsWith("https://")) return "";
  if (href.startsWith("mailto:")) return "";
  if (href.startsWith("tel:")) return "";
  if (href.startsWith("sms:")) return "";
  if (href.startsWith("whatsapp:")) return "";
  if (href.startsWith("javascript:")) return "";

  return href.startsWith("/") ? href : `/${href}`;
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
}: Props) {
  const router = useRouter();

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
    const arr = Array.isArray(tree) ? tree : [];
    return arr.slice(0, 5);
  }, [tree]);

  const rootsWithChildren = useMemo(() => {
    const arr = Array.isArray(tree) ? tree : [];
    return arr.filter((category: any) => hasChildren(category));
  }, [tree]);

  const hasAnyMegaContent = rootsWithChildren.length > 0;

  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [overlayTop, setOverlayTop] = useState(0);
  const [cartCount, setCartCount] = useState(() =>
    safeNumber(initialCartCount),
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const cartSyncTimer = useRef<number | null>(null);
  const prefetchTimer = useRef<number | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const OPEN_DELAY = 60;
  const CLOSE_DELAY = 140;

  const prefetchHref = useCallback(
    (value: unknown) => {
      const href = normalizeInternalPrefetchHref(value);
      if (!href) return;
      if (prefetchedRef.current.has(href)) return;

      prefetchedRef.current.add(href);

      try {
        router.prefetch(href);
      } catch {
        //
      }
    },
    [router],
  );

  const prefetchCategory = useCallback(
    (category: any) => {
      prefetchHref(category?.href);

      const children = Array.isArray(category?.children)
        ? category.children
        : [];

      children.slice(0, 4).forEach((child: any) => {
        prefetchHref(child?.href);
      });
    },
    [prefetchHref],
  );

  useEffect(() => {
    if (prefetchTimer.current) {
      window.clearTimeout(prefetchTimer.current);
      prefetchTimer.current = null;
    }

    prefetchTimer.current = window.setTimeout(() => {
      prefetchTimer.current = null;

      prefetchHref("/cart");

      roots.forEach((root: any) => {
        prefetchHref(root?.href);
      });
    }, 700);

    return () => {
      if (prefetchTimer.current) {
        window.clearTimeout(prefetchTimer.current);
        prefetchTimer.current = null;
      }
    };
  }, [roots, prefetchHref]);

  useEffect(() => {
    setCartCount(safeNumber(initialCartCount));
  }, [initialCartCount]);

  const loadCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data?.items)
          ? json.data.items
          : [];

      const total = items.reduce((sum: number, item: any) => {
        return sum + Number(item?.qty ?? item?.quantity ?? item?.count ?? 0);
      }, 0);

      setCartCount(safeNumber(total));
    } catch {
      setCartCount(0);
    }
  }, []);

  const scheduleCartSync = useCallback(() => {
    if (cartSyncTimer.current) {
      window.clearTimeout(cartSyncTimer.current);
    }

    cartSyncTimer.current = window.setTimeout(() => {
      cartSyncTimer.current = null;
      void loadCart();
    }, 180);
  }, [loadCart]);

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
    const header = root.closest(".mk-header") as HTMLElement | null;

    const target = headerBottom || header || root;
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
    prefetchCategory(root);

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
      return tree.filter((category: any) => hasChildren(category));
    }

    if (!activeRootId) return [];

    return tree.filter((r: any) => {
      return String(r.id) === String(activeRootId) && hasChildren(r);
    });
  }, [tree, showAll, activeRootId]);

  const showAllMega = open && showAll && hasAnyMegaContent;
  const showRootMega = open && !showAll && Boolean(activeRootId);

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
          onMouseEnter={() => prefetchHref("/cart")}
          onFocus={() => prefetchHref("/cart")}
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
                  roots.slice(0, 5).forEach((root: any) => {
                    prefetchCategory(root);
                  });

                  openAllSoon();
                }
              : undefined
          }
          onClick={() => {
            if (!hasAnyMegaContent) {
              closeNow();
              return;
            }

            roots.slice(0, 5).forEach((root: any) => {
              prefetchCategory(root);
            });

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
              roots.slice(0, 5).forEach((root: any) => {
                prefetchCategory(root);
              });

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
                roots.slice(0, 5).forEach((root: any) => {
                  prefetchCategory(root);
                });

                calcOverlayTop();
                setShowAll(true);
                setActiveRootId(null);
                setOpen((value) => !(value && showAll));
              }}
              onFocus={() => {
                roots.slice(0, 5).forEach((root: any) => {
                  prefetchCategory(root);
                });

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
          const href = root.href || "/";
          const rootHasChildren = hasChildren(root);

          const isActiveRoot =
            showRootMega &&
            rootHasChildren &&
            String(activeRootId) === String(root.id);

          if (!rootHasChildren) {
            return (
              <Link
                key={root.id}
                href={href}
                className="mk-desktop-nav__rootLink"
                onMouseEnter={() => {
                  prefetchCategory(root);
                  clearTimers();
                  setOpen(false);
                  setShowAll(false);
                  setActiveRootId(null);
                }}
                onFocus={() => {
                  prefetchCategory(root);
                  closeNow();
                  setShowAll(false);
                  setActiveRootId(null);
                }}
              >
                {root.name}
              </Link>
            );
          }

          return (
            <div
              key={root.id}
              className="mk-desktop-nav__itemWrap"
              onMouseEnter={() => openRootSoon(root)}
              onMouseLeave={closeSoon}
            >
              <Link
                href={href}
                className="mk-desktop-nav__rootLink"
                onMouseEnter={() => prefetchCategory(root)}
                onFocus={() => openRootSoon(root)}
              >
                {root.name}

                {isActiveRoot ? (
                  <span className="mk-desktop-nav__underline" />
                ) : null}
              </Link>

              {isActiveRoot ? (
                <>
                  <button
                    type="button"
                    aria-label="Close categories overlay"
                    className="mk-desktop-nav__overlay"
                    onClick={closeNow}
                  />

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
                    <MegaMenu
                      categories={megaCategories}
                      megaMenu={megaMenu}
                      showSide={false}
                      initialActiveId={activeRootId}
                      onNavigate={closeNow}
                      seoMode={seoMode}
                    />
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}