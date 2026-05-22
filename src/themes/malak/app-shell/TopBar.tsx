// FILE: apps/storefront/src/themes/malak/app-shell/TopBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/icon/Icon";
import CurrencySwitcher from "./_components/CurrencySwitcher";
import type { ThemeAdapterOutput } from "../types";
import type { MalakBootstrap } from "../bootstrap/types";

type Props = {
  theme: ThemeAdapterOutput;
  bootstrap?: MalakBootstrap;
  isHome?: boolean;
  onSearchOpen?: () => void;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const out = text(value);
    if (out) return out;
  }

  return "";
}

export default function TopBar({
  theme,
  bootstrap,
  isHome = false,
  onSearchOpen,
}: Props) {
  const [scrolled, setScrolled] = useState(false);

  const header = bootstrap?.header;
  const store = bootstrap?.store;

  const showSearch = header?.show_search !== false;

  const logoUrl = pickText(header?.logo_url, store?.logo_url);
  const logoAlt = pickText(header?.logo_alt, store?.name, "Logo");
  const storeName = pickText(store?.name);

  const sloganText =
    header?.show_slogan !== false ? pickText(header?.slogan) : "";

  const searchPlaceholder = pickText(
    bootstrap?.marketing?.search?.placeholder,
  );

  const hasBrand = Boolean(logoUrl || storeName);
  const shouldShowSearch = showSearch && Boolean(onSearchOpen);

  const hasCurrencySwitcher = useMemo(() => {
    const currencies = bootstrap?.currencies;

    if (!currencies?.has_multiple) return false;

    const enabledItems = Array.isArray(currencies.items)
      ? currencies.items.filter((item) => item?.enabled !== false)
      : [];

    return enabledItems.length > 1;
  }, [bootstrap?.currencies]);

  useEffect(() => {
    if (!isHome) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        setScrolled(y > 70);
        ticking = false;
      });
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  if (!isHome) return null;

  if (!hasBrand && !sloganText && !shouldShowSearch && !hasCurrencySwitcher) {
    return null;
  }

  return (
    <header
      dir="rtl"
      className={`mk-home-topbar ${scrolled ? "is-scrolled" : ""}`}
      data-mk-theme={theme.ui.darkMode ? "dark" : "light"}
    >
      <div className="mk-home-topbar__inner">
        <div className="mk-home-topbar__row1">
          {hasBrand ? (
            <Link
              href="/"
              prefetch={true}
              className="mk-home-topbar__brand"
              aria-label={logoAlt || storeName}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt || storeName}
                  className="mk-home-topbar__logo"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <span className="mk-home-topbar__storeName">{storeName}</span>
              )}
            </Link>
          ) : (
            <span className="mk-home-topbar__sideSpace" aria-hidden="true" />
          )}

          <div className="mk-home-topbar__center">
            {sloganText ? (
              <div className="mk-home-topbar__delivery">
                <span className="mk-home-topbar__deliveryText">
                  {sloganText}
                </span>
              </div>
            ) : null}
          </div>

          {hasCurrencySwitcher ? (
            <div className="mk-home-topbar__currency">
              <CurrencySwitcher
                storeId={store?.id}
                currencies={bootstrap?.currencies ?? null}
              />
            </div>
          ) : (
            <span className="mk-home-topbar__sideSpace" aria-hidden="true" />
          )}
        </div>

        {sloganText ? (
          <div className="mk-home-topbar__ship">
            <span className="mk-home-topbar__shipDot" />
            <span className="mk-home-topbar__shipText">{sloganText}</span>
          </div>
        ) : null}

        {shouldShowSearch ? (
          <div className="mk-home-topbar__row2">
            <button
              type="button"
              className="mk-home-topbar__search"
              onClick={onSearchOpen}
              aria-label="فتح البحث"
            >
              <span className="mk-home-topbar__searchIcon" aria-hidden="true">
                <Icon icon={"Search01" as any} size={18} />
              </span>

              {searchPlaceholder ? (
                <span className="mk-home-topbar__searchPlaceholder">
                  {searchPlaceholder}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}