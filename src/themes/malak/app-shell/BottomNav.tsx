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
  const pendingRef = useRef(false);

  const cartCount = normalizeCount(initialCartCount);
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

  const items = useMemo(() => {
    return BOTTOM_NAV_ITEMS.map((item) => {
      if (item.type === "screen" && item.key === "cart") {
        return {
          ...item,
          badge: cartCount > 0 ? cartCount : undefined,
        };
      }

      return {
        ...item,
        badge: undefined,
      };
    });
  }, [cartCount]);

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