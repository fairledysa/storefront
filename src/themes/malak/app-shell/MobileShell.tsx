// FILE: apps/storefront/src/themes/malak/app-shell/MobileShell.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import ScreenContainer from "./ScreenContainer";
import AuthModal from "./_components/AuthModal";
import SearchOverlay from "./SearchOverlay";

import type { ThemeAdapterOutput } from "../types";
import type { MalakBootstrap } from "../bootstrap/types";
import type { SeoUrlMode } from "@/data/store/settings";

import { MOBILE_ROUTES } from "../app-navigation/routes.mobile";
import {
  resolveRouteKeyFromPath,
  useNavStack,
} from "../app-navigation/stack";

type Props = {
  theme: ThemeAdapterOutput;
  seoMode: SeoUrlMode;
  data?: any;
  children?: ReactNode;
  bootstrap?: MalakBootstrap;
  initialCartCount?: number;
};

function safeObject(value: any) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanPath(value: unknown) {
  const path = String(value ?? "/").trim() || "/";
  return path.replace(/\/+$/, "") || "/";
}

function isMobileInternalRoute(pathname: string | null) {
  const path = cleanPath(pathname);

  return path === "/categories";
}

export default function MobileShell({
  theme,
  seoMode,
  data,
  children,
  bootstrap,
  initialCartCount = 0,
}: Props) {
  const pathname = usePathname();

  const setRoutes = useNavStack((s) => s.setRoutes);
  const setFromPath = useNavStack((s) => s.setFromPath);
  const currentKey = useNavStack((s) => s.current());
  const setSeoMode = useNavStack((s) => s.setSeoMode);

  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const forcedRoute = String(data?.route ?? "").trim();

  const effectiveKey = useMemo(() => {
    if (forcedRoute) return forcedRoute;

    const keyFromPath = pathname
      ? resolveRouteKeyFromPath(pathname, MOBILE_ROUTES as any)
      : null;

    return keyFromPath || currentKey || "home";
  }, [forcedRoute, pathname, currentKey]);

  const isHome = effectiveKey === "home";

  const showSearch = bootstrap?.header?.show_search !== false;

  const searchPlaceholder = String(
    bootstrap?.marketing?.search?.placeholder ?? "",
  ).trim();

  const searchGroups = Array.isArray(bootstrap?.marketing?.search?.groups)
    ? bootstrap.marketing.search.groups
    : undefined;

  const dataWithBootstrap = useMemo(() => {
    const source = safeObject(data);
    const currentBootstrap = safeObject(source.bootstrap);
    const incomingBootstrap = safeObject(bootstrap);

    const mergedBootstrap = {
      ...currentBootstrap,
      ...incomingBootstrap,

      currencies:
        currentBootstrap.currencies ??
        incomingBootstrap.currencies ??
        source.currencies ??
        null,

      tax:
        currentBootstrap.tax ??
        incomingBootstrap.tax ??
        source.tax ??
        null,

      navigation:
        currentBootstrap.navigation ??
        incomingBootstrap.navigation ??
        source.navigation ??
        null,

      marketing:
        currentBootstrap.marketing ??
        incomingBootstrap.marketing ??
        source.marketing ??
        null,

      header:
        currentBootstrap.header ??
        incomingBootstrap.header ??
        source.header ??
        null,

      store:
        currentBootstrap.store ??
        incomingBootstrap.store ??
        source.store ??
        null,
    };

    return {
      ...source,

      bootstrap: mergedBootstrap,

      currencies:
        source.currencies ??
        mergedBootstrap.currencies ??
        bootstrap?.currencies ??
        null,

      tax:
        source.tax ??
        mergedBootstrap.tax ??
        bootstrap?.tax ??
        null,

      navigation:
        source.navigation ??
        mergedBootstrap.navigation ??
        bootstrap?.navigation ??
        null,

      marketing:
        source.marketing ??
        mergedBootstrap.marketing ??
        bootstrap?.marketing ??
        null,
    };
  }, [data, bootstrap]);

  const forceScreenContainer = isMobileInternalRoute(pathname);

  async function fetchMe() {
    try {
      await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
    } catch {}
  }

  useEffect(() => {
    setRoutes(MOBILE_ROUTES as any);
  }, [setRoutes]);

  useEffect(() => {
    setSeoMode(seoMode);
  }, [seoMode, setSeoMode]);

  useEffect(() => {
    if (!pathname) return;
    setFromPath(pathname);
  }, [pathname, setFromPath]);

  useEffect(() => {
    function handleAuthOpen() {
      setAuthOpen(true);
    }

    function handleAuthChanged() {
      void fetchMe();
    }

    function handleSearchOpen() {
      if (!showSearch) return;
      setSearchOpen(true);
    }

    window.addEventListener("auth:open", handleAuthOpen);
    window.addEventListener("auth:changed", handleAuthChanged);
    window.addEventListener("mk:search:open", handleSearchOpen);

    return () => {
      window.removeEventListener("auth:open", handleAuthOpen);
      window.removeEventListener("auth:changed", handleAuthChanged);
      window.removeEventListener("mk:search:open", handleSearchOpen);
    };
  }, [showSearch]);

  return (
    <>
      <div
        className="mk-mobile-shell"
        data-mk-theme={theme?.ui?.darkMode ? "dark" : "light"}
        data-mk-route={effectiveKey}
      >
        <TopBar
          theme={theme}
          bootstrap={bootstrap}
          isHome={isHome}
          onSearchOpen={
            showSearch
              ? () => {
                  setSearchOpen(true);
                }
              : undefined
          }
        />

        <div className="mk-mobile-content">
          {forceScreenContainer ? (
            <ScreenContainer data={dataWithBootstrap} />
          ) : children ? (
            children
          ) : (
            <ScreenContainer data={dataWithBootstrap} />
          )}

          <Footer bootstrap={bootstrap} />
        </div>

        <BottomNav
          seoMode={seoMode}
          bootstrap={bootstrap}
          initialCartCount={initialCartCount}
        />

        <SearchOverlay
          open={searchOpen && showSearch}
          onOpenChange={setSearchOpen}
          placeholder={searchPlaceholder}
          groups={searchGroups}
          currencies={bootstrap?.currencies ?? null}
          tax={bootstrap?.tax ?? null}
        />
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => {
          void fetchMe();
          window.dispatchEvent(new CustomEvent("auth:changed"));
        }}
      />
    </>
  );
}