// FILE: apps/storefront/src/themes/malak/app-shell/BottomNav.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import Icon from "@/components/icon/Icon";
import { BOTTOM_NAV_ITEMS } from "../app-navigation/bottom-nav.config";
import { useNavStack } from "../app-navigation/stack";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../bootstrap/types";

type Props = {
  seoMode?: SeoUrlMode;
  bootstrap?: MalakBootstrap;
};

export default function BottomNav(_props: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const reset = useNavStack((s) => s.reset);

  return (
    <nav dir="rtl" className="mk-tabbar" aria-label="Bottom navigation">
      <div className="mk-tabbar__inner">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const href = item.href;

          const active =
            pathname === href ||
            (href !== "/" && pathname?.startsWith(href + "/"));

          return (
            <button
              key={`${item.label}-${href}`}
              type="button"
              onClick={() => {
                if (item.type === "screen") {
                  reset(item.key);
                }

                router.push(href);
              }}
              className={`mk-tab-item ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
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