// FILE: apps/storefront/src/themes/malak/app-shell/TopBar.tsx
"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/icon/Icon";
import type { ThemeAdapterOutput } from "../types";
import type { MalakBootstrap } from "../bootstrap/types";

type Props = {
  theme: ThemeAdapterOutput;
  bootstrap?: MalakBootstrap;
  isHome?: boolean;
  onSearchOpen?: () => void;
};

export default function TopBar({
  theme,
  bootstrap,
  isHome = false,
  onSearchOpen,
}: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(y > 70);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  if (!isHome) return null;

  const shippingText =
    bootstrap?.header?.slogan || "شحن سريع وعروض يومية";

  return (
    <header
      dir="rtl"
      className={`mk-home-topbar ${scrolled ? "is-scrolled" : ""}`}
      data-mk-theme={theme.ui.darkMode ? "dark" : "light"}
    >
      <div className="mk-home-topbar__inner">
        <div className="mk-home-topbar__row1">
          <div className="mk-home-topbar__icons">
            <button
              type="button"
              className="mk-home-ibtn"
              aria-label="الإشعارات"
            >
              <Icon icon={"Notification01" as any} size={20} />
            </button>

            <button
              type="button"
              className="mk-home-ibtn"
              aria-label="الأقسام"
            >
              <Icon icon={"MenuSquare" as any} size={20} />
            </button>
          </div>

          <button
            type="button"
            className="mk-home-topbar__delivery"
            aria-label="تغيير التوصيل"
          >
            <span className="mk-home-topbar__deliveryText">توصيل إلى</span>
            <span
              className="mk-home-topbar__deliveryChevron"
              aria-hidden="true"
            >
              <Icon icon={"ArrowDown01" as any} size={16} />
            </span>
          </button>

          <button type="button" className="mk-home-ibtn" aria-label="الموقع">
            <Icon icon={"Location01" as any} size={18} />
          </button>
        </div>

        <div className="mk-home-topbar__ship">
          <span className="mk-home-topbar__shipDot" />
          <span className="mk-home-topbar__shipText">{shippingText}</span>
        </div>

        <div className="mk-home-topbar__row2">
          <button
            type="button"
            className="mk-home-topbar__search"
            onClick={() => {
              if (onSearchOpen) {
                onSearchOpen();
                return;
              }

              window.dispatchEvent(new CustomEvent("mk:search:open"));
            }}
            aria-label="فتح البحث"
          >
            <span className="mk-home-topbar__searchIcon" aria-hidden="true">
              <Icon icon={"Search01" as any} size={18} />
            </span>

            <span className="mk-home-topbar__searchPlaceholder">بحث...</span>
          </button>
        </div>
      </div>
    </header>
  );
}