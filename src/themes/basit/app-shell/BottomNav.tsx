// FILE: apps/storefront/src/themes/basit/app-shell/BottomNav.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Icon from "@/components/icon/Icon";
import { BOTTOM_NAV_ITEMS } from "../app-navigation/bottom-nav.config";
import { useNavStack } from "../app-navigation/stack";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../bootstrap/types";

type Props = {
  seoMode?: SeoUrlMode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
};

function normalizeCount(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return 0;

  return Math.floor(n);
}

function cleanPath(value: unknown) {
  const raw = String(value ?? "/").trim() || "/";

  let path = raw;

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      path = new URL(raw).pathname || "/";
    }
  } catch {
    path = raw;
  }

  path = path.split("?")[0]?.split("#")[0] || "/";
  path = path.replace(/\/+$/, "") || "/";

  return path;
}

function readQty(value: any, fallback = 1) {
  const direct =
    value?.qty ??
    value?.quantity ??
    value?.addedQty ??
    value?.added_qty ??
    value?.item?.qty ??
    value?.item?.quantity ??
    value?.detail?.qty ??
    value?.detail?.quantity;

  const n = Number(direct);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.floor(n);
}

function readCount(value: any) {
  return normalizeCount(
    value?.count ??
      value?.cartCount ??
      value?.cart_count ??
      value?.itemCount ??
      value?.item_count ??
      value?.total ??
      value?.total_items ??
      value?.data?.count ??
      value?.data?.cartCount ??
      value?.data?.cart_count ??
      value?.data?.itemCount ??
      value?.data?.item_count,
  );
}

function isActivePath(pathname: string | null, href: string) {
  const path = cleanPath(pathname);
  const target = cleanPath(href);

  if (target === "/") return path === "/";

  return path === target || path.startsWith(`${target}/`);
}

function isSearchAction(href: string, label: string) {
  const cleanHref = String(href || "").trim();
  const cleanLabel = String(label || "").trim();

  return cleanHref === "/search" || cleanLabel === "البحث";
}

function isMenuAction(item: any) {
  const key = String(item?.key || "").trim();
  const label = String(item?.label || "").trim();

  return key === "categories" || label === "الأقسام" || label === "القائمة";
}

function openMainMenu() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("mk:menu:open"));
}

function isProtectedAccountHref(href: string) {
  const path = cleanPath(href);
  return path === "/account" || path.startsWith("/account/");
}

function getWindowPath() {
  if (typeof window === "undefined") return "/";
  return cleanPath(window.location.pathname);
}

function openSmartSearch() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("mk:search:open"));
}

function isAuthedPayload(resOk: boolean, json: any) {
  return Boolean(
    resOk &&
      (json?.authed === true || json?.ok === true) &&
      (json?.customer || json?.user),
  );
}

async function fetchCustomerAuth() {
  try {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });

    const json = await res.json().catch(() => ({}));

    return isAuthedPayload(res.ok, json);
  } catch {
    return false;
  }
}

export default function BottomNav({ initialCartCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const reset = useNavStack((s) => s.reset);

  const [activePath, setActivePath] = useState(() => cleanPath(pathname || "/"));
  const [pendingHref, setPendingHref] = useState("");
  const [cartCount, setCartCount] = useState(() =>
    normalizeCount(initialCartCount),
  );

  const [authState, setAuthState] = useState<{
    checked: boolean;
    authed: boolean;
  }>({
    checked: false,
    authed: false,
  });

  const pendingRef = useRef(false);
  const requestedAccountHrefRef = useRef("");
  const bumpTimerRef = useRef<number | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

  const [cartBumped, setCartBumped] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    setActivePath(cleanPath(pathname));
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    async function warmAuth() {
      const authed = await fetchCustomerAuth();

      if (!alive) return;

      setAuthState({
        checked: true,
        authed,
      });

      const requestedHref = requestedAccountHrefRef.current;

      if (authed && requestedHref) {
        requestedAccountHrefRef.current = "";
        router.push(requestedHref);
      }
    }

    function handleAuthChanged() {
      void warmAuth();
    }

    void warmAuth();

    window.addEventListener("auth:changed", handleAuthChanged);

    return () => {
      alive = false;
      window.removeEventListener("auth:changed", handleAuthChanged);
    };
  }, [router]);

  useEffect(() => {
    function handleMobilePathChange(event: Event) {
      const detail = (event as CustomEvent<{ href?: string }>).detail;
      setActivePath(cleanPath(detail?.href || getWindowPath()));
    }

    function handlePopState() {
      setActivePath(getWindowPath());
    }

    window.addEventListener(
      "mk:mobile:pathchange",
      handleMobilePathChange as EventListener,
    );
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(
        "mk:mobile:pathchange",
        handleMobilePathChange as EventListener,
      );
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    for (const item of BOTTOM_NAV_ITEMS) {
      const href = String(item.href || "").trim();
      if (!href || href === "/search") continue;

      try {
        router.prefetch(href);
      } catch {
        // ignore
      }
    }

  }, [router]);

  useEffect(() => {
    function bumpBadge() {
      setCartBumped(true);

      if (bumpTimerRef.current) {
        window.clearTimeout(bumpTimerRef.current);
      }

      bumpTimerRef.current = window.setTimeout(() => {
        setCartBumped(false);
        bumpTimerRef.current = null;
      }, 620);
    }

    function handleOptimisticAdd(event: Event) {
      const detail = (event as CustomEvent<any>).detail;
      const qty = readQty(detail, 1);

      setCartCount((current) => normalizeCount(current + qty));
      bumpBadge();
    }

    function handleCountIncrement(event: Event) {
      const detail = (event as CustomEvent<any>).detail;
      const qty = readQty(detail, 1);

      setCartCount((current) => normalizeCount(current + qty));
      bumpBadge();
    }

    function handleCountDecrement(event: Event) {
      const detail = (event as CustomEvent<any>).detail;
      const qty = readQty(detail, 1);

      setCartCount((current) => normalizeCount(current - qty));
      bumpBadge();
    }

    function handleCountSet(event: Event) {
      const detail = (event as CustomEvent<any>).detail;

      if (typeof detail === "number" || typeof detail === "string") {
        setCartCount(normalizeCount(detail));
        bumpBadge();
        return;
      }

      setCartCount(readCount(detail));
      bumpBadge();
    }

    window.addEventListener("cart:optimistic-add", handleOptimisticAdd);
    window.addEventListener("cart:count:increment", handleCountIncrement);
    window.addEventListener("cart:count:decrement", handleCountDecrement);
    window.addEventListener("cart:count:set", handleCountSet);

    return () => {
      window.removeEventListener("cart:optimistic-add", handleOptimisticAdd);
      window.removeEventListener("cart:count:increment", handleCountIncrement);
      window.removeEventListener("cart:count:decrement", handleCountDecrement);
      window.removeEventListener("cart:count:set", handleCountSet);

      if (bumpTimerRef.current) {
        window.clearTimeout(bumpTimerRef.current);
      }
    };
  }, []);

  const items = useMemo(() => {
    return BOTTOM_NAV_ITEMS.map((item) => {
      if (item.type === "screen" && item.key === "cart") {
        return {
          ...item,
          badge: cartCount > 0 ? cartCount : undefined,
          bumped: cartBumped,
        };
      }

      return {
        ...item,
        badge: undefined,
        bumped: false,
      };
    });
  }, [cartCount, cartBumped]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      pendingRef.current = false;
      setPendingHref("");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  function releasePendingSoon() {
    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
    }

    pendingTimerRef.current = window.setTimeout(() => {
      pendingRef.current = false;
      setPendingHref("");
      pendingTimerRef.current = null;
    }, 90);
  }

  async function ensureCustomerAuthed() {
    if (authState.checked) return authState.authed;

    const authed = await fetchCustomerAuth();

    setAuthState({
      checked: true,
      authed,
    });

    return authed;
  }

  async function handleItemClick({
    item,
    href,
    active,
    searchAction,
    menuAction,
  }: {
    item: any;
    href: string;
    active: boolean;
    searchAction: boolean;
    menuAction: boolean;
  }) {
    if (searchAction) {
      openSmartSearch();
      return;
    }

    if (menuAction) {
      openMainMenu();
      return;
    }

    if (pendingRef.current) return;

    const protectedAccount = isProtectedAccountHref(href);

    if (!protectedAccount && active) return;

    pendingRef.current = true;
    setPendingHref(href);

    if (protectedAccount) {
      const authed = await ensureCustomerAuthed();

      if (!authed) {
        requestedAccountHrefRef.current = href;
        window.dispatchEvent(new CustomEvent("auth:open"));
        releasePendingSoon();
        return;
      }

      if (active) {
        releasePendingSoon();
        return;
      }
    }

    if (item.type === "screen") {
      reset(item.key);
    }

    try {
      router.prefetch(href);
    } catch {
      // ignore
    }

    router.push(href);
  }

  return (
    <nav dir="rtl" className="mk-tabbar" aria-label="التنقل السفلي">
      <div className="mk-tabbar__inner">
        {items.map((item) => {
          const href = item.href;
          const searchAction = isSearchAction(href, item.label);
          const menuAction = isMenuAction(item);
          const active = searchAction || menuAction ? false : isActivePath(activePath, href);
          const pending = Boolean(pendingHref && pendingHref === href);

          return (
            <button
              key={`${item.label}-${href}`}
              type="button"
              onClick={() => {
                void handleItemClick({
                  item,
                  href,
                  active,
                  searchAction,
                  menuAction,
                });
              }}
              className={[
                "mk-tab-item",
                active ? "active" : "",
                pending ? "is-pending" : "",
                item.bumped ? "is-cart-bumped" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              aria-disabled={pending ? "true" : undefined}
            >
              <span className="mk-tab-icon" aria-hidden="true">
                <Icon icon={item.icon as any} size={24} />

                {item.badge != null ? (
                  <span className="mk-tab-badge">{item.badge}</span>
                ) : null}
              </span>

              <span className="mk-tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
