// FILE: apps/storefront/src/themes/malak/app-shell/BottomNav.tsx
"use client";

import { useMemo } from "react";
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

  const cartCount = normalizeCount(initialCartCount);

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

  return (
    <nav dir="rtl" className="mk-tabbar" aria-label="التنقل السفلي">
      <div className="mk-tabbar__inner">
        {items.map((item) => {
          const href = item.href;
          const searchAction = isSearchAction(href, item.label);
          const active = searchAction ? false : isActivePath(pathname, href);

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

                if (item.type === "screen") {
                  reset(item.key);
                }

                router.push(href);
              }}
              className={["mk-tab-item", active ? "active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
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