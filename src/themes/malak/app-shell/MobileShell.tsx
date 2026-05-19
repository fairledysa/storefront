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

import { MOBILE_ROUTES } from "../app-navigation/routes.mobile";
import {
  resolveRouteKeyFromPath,
  useNavStack,
} from "../app-navigation/stack";
import type { SeoUrlMode } from "@/data/store/settings";

type Props = {
  theme: ThemeAdapterOutput;
  seoMode: SeoUrlMode;
  data?: any;
  children?: ReactNode;
  bootstrap?: MalakBootstrap;
};

export default function MobileShell({
  theme,
  seoMode,
  data,
  children,
  bootstrap,
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
  }, []);

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
          onSearchOpen={() => setSearchOpen(true)}
        />

        <div className="mk-mobile-content">
          {children ? children : <ScreenContainer data={data} />}

          <Footer bootstrap={bootstrap} />
        </div>

        <BottomNav seoMode={seoMode} bootstrap={bootstrap} />

        <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
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