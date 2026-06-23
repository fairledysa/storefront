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
import InstallAppPrompt from "./_components/InstallAppPrompt";

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

function isMobileInternalRoute(pathname: string | null) {
  const path = cleanPath(pathname);

  return (
    path === "/login" ||
    path === "/categories" ||
    path === "/cart" ||
    path === "/account" ||
    path.startsWith("/account/")
  );
}

function getWindowPath() {
  if (typeof window === "undefined") return "/";
  return cleanPath(window.location.pathname);
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
  const [localPath, setLocalPath] = useState(() => cleanPath(pathname || "/"));

  useEffect(() => {
    if (!pathname) return;
    setLocalPath(cleanPath(pathname));
  }, [pathname]);

  useEffect(() => {
    function handleMobilePathChange(event: Event) {
      const detail = (event as CustomEvent<{ href?: string }>).detail;
      const nextPath = cleanPath(detail?.href || getWindowPath());

      setLocalPath(nextPath);
      setFromPath(nextPath);
    }

    function handlePopState() {
      const nextPath = getWindowPath();

      setLocalPath(nextPath);
      setFromPath(nextPath);
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
  }, [setFromPath]);

  const effectivePath = cleanPath(localPath || pathname || "/");
  const forceScreenContainer = isMobileInternalRoute(effectivePath);

  const forcedRoute = forceScreenContainer
    ? ""
    : String(data?.route ?? "").trim();

  const effectiveKey = useMemo(() => {
    if (forcedRoute) return forcedRoute;

    const keyFromPath = effectivePath
      ? resolveRouteKeyFromPath(effectivePath, MOBILE_ROUTES as any)
      : null;

    return keyFromPath || currentKey || "home";
  }, [forcedRoute, effectivePath, currentKey]);

  const isHome = effectiveKey === "home";
  const isAuthScreen = effectiveKey === "login" || effectivePath === "/login";

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

      pwa:
        currentBootstrap.pwa ??
        incomingBootstrap.pwa ??
        source.pwa ??
        null,
    };

    return {
      ...source,

      route: forceScreenContainer ? effectiveKey : source.route,

      bootstrap: mergedBootstrap,

      currencies:
        source.currencies ??
        mergedBootstrap.currencies ??
        bootstrap?.currencies ??
        null,

      tax:
        source.tax ?? mergedBootstrap.tax ?? bootstrap?.tax ?? null,

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

      pwa: source.pwa ?? mergedBootstrap.pwa ?? bootstrap?.pwa ?? null,
    };
  }, [data, bootstrap, forceScreenContainer, effectiveKey]);

  const shellBootstrap = dataWithBootstrap.bootstrap as MalakBootstrap | undefined;

  const showSearch = shellBootstrap?.header?.show_search !== false;

  const searchPlaceholder = String(
    shellBootstrap?.marketing?.search?.placeholder ?? "",
  ).trim();

  const searchGroups = Array.isArray(shellBootstrap?.marketing?.search?.groups)
    ? shellBootstrap.marketing.search.groups
    : undefined;

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
    if (!effectivePath) return;
    setFromPath(effectivePath);
  }, [effectivePath, setFromPath]);

  useEffect(() => {
    function handleAuthOpen() {
      if (isAuthScreen) return;
      setAuthOpen(true);
    }

    function handleAuthChanged() {
      void fetchMe();
    }

    function handleSearchOpen() {
      if (!showSearch || isAuthScreen) return;
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
  }, [showSearch, isAuthScreen]);

  return (
    <>
      <div
        className="mk-mobile-shell"
        data-mk-theme={theme?.ui?.darkMode ? "dark" : "light"}
        data-mk-route={effectiveKey}
        data-mk-auth-screen={isAuthScreen ? "true" : "false"}
      >
        {!isAuthScreen ? (
          <TopBar
            theme={theme}
            bootstrap={shellBootstrap}
            isHome={isHome}
            onSearchOpen={
              showSearch
                ? () => {
                    setSearchOpen(true);
                  }
                : undefined
            }
          />
        ) : null}

        <div className="mk-mobile-content">
          <div className="mk-mobile-screen-slot">
            {forceScreenContainer ? (
              <ScreenContainer data={dataWithBootstrap} />
            ) : children ? (
              children
            ) : (
              <ScreenContainer data={dataWithBootstrap} />
            )}
          </div>

          {!isAuthScreen ? <Footer bootstrap={shellBootstrap} /> : null}
        </div>

        {!isAuthScreen ? (
          <>
            <BottomNav
              seoMode={seoMode}
              bootstrap={shellBootstrap}
              initialCartCount={initialCartCount}
            />

            <InstallAppPrompt bootstrap={shellBootstrap} />

            <SearchOverlay
              open={searchOpen && showSearch}
              onOpenChange={setSearchOpen}
              placeholder={searchPlaceholder}
              groups={searchGroups}
              currencies={shellBootstrap?.currencies ?? null}
              tax={shellBootstrap?.tax ?? null}
            />
          </>
        ) : null}
      </div>

      {!isAuthScreen ? (
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthed={() => {
            void fetchMe();
            window.dispatchEvent(new CustomEvent("auth:changed"));
          }}
        />
      ) : null}
    </>
  );
}
