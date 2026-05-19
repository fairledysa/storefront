// FILE: apps/storefront/src/themes/malak/app-shell/ScreenContainer.tsx
"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  resolveRouteKeyFromPath,
  useNavStack,
} from "../app-navigation/stack";

type Props = {
  data?: any;
};

export default function ScreenContainer({ data }: Props) {
  const pathname = usePathname();

  const currentKey = useNavStack((s) => s.current());
  const routes = useNavStack((s) => s.routes);
  const setFromPath = useNavStack((s) => s.setFromPath);
  const seoMode = useNavStack((s) => s.seoMode);

  const forcedRoute = String(data?.route ?? "").trim();

  const effectiveKey = useMemo(() => {
    if (forcedRoute) return forcedRoute;

    const keyFromPath = pathname
      ? resolveRouteKeyFromPath(pathname, routes)
      : null;

    return keyFromPath || currentKey || "home";
  }, [forcedRoute, pathname, routes, currentKey]);

  useEffect(() => {
    if (!pathname) return;
    setFromPath(pathname);
  }, [pathname, setFromPath]);

  const Screen = useMemo(() => {
    return routes?.[effectiveKey]?.component ?? null;
  }, [routes, effectiveKey]);

  if (!Screen) return null;

  return (
    <main className="mk-screen-container" data-mk-screen={effectiveKey}>
      <Screen seoMode={seoMode} mode={seoMode} data={data} />
    </main>
  );
}