// FILE: apps/storefront/src/themes/malak/app-shell/BottomNav.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Icon from "@/components/icon/Icon";
import { BOTTOM_NAV_ITEMS } from "../app-navigation/bottom-nav.config";
import { useNavStack } from "../app-navigation/stack";
import { startMobileNavigation } from "../app-navigation/mobile-navigation";
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
  const path = String(pathname || "/").trim() || "/";
  const target = String(href || "/").trim() || "/";

  if (target === "/") return path === "/";

  return path === target || path.startsWith(`${target}/`);
}

function isSearchAction(href: string, label: string) {
  const cleanHref = String(href || "").trim();
  const cleanLabel = String(label || "").trim();

  return cleanHref === "/search" || cleanLabel === "البحث";
}

function openSmartSearch() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("mk:search:open"));
}

export default function BottomNav({ initialCartCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const reset = useNavStack((s) => s.reset);

  const [pendingHref, setPendingHref] = useState("");
  const [cartCount, setCartCount] = useState(() =>
    normalizeCount(initialCartCount),
  );

  const pendingRef = useRef(false);
  const bumpTimerRef = useRef<number | null>(null);
  const [cartBumped, setCartBumped] = useState(false);

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

  return (
    <nav dir="rtl" className="mk-tabbar" aria-label="التنقل السفلي">
      <div className="mk-tabbar__inner">
        {items.map((item) => {
          const href = item.href;
          const searchAction = isSearchAction(href, item.label);
          const active = searchAction ? false : isActivePath(pathname, href);
          const pending = Boolean(pendingHref && pendingHref === href);

          return (
            <button
              key={`${item.label}-${href}`}
              type="button"
              onClick={() => {
                if (searchAction) {
                  openSmartSearch();
                  return;
                }

                if (active) return;
                if (pendingRef.current) return;

                pendingRef.current = true;
                setPendingHref(href);

                try {
                  router.prefetch(href);
                } catch {
                  // ignore
                }

                startMobileNavigation({
                  href,
                  source: "bottom-nav",
                });

                if (item.type === "screen") {
                  reset(item.key);
                }

                router.push(href);
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