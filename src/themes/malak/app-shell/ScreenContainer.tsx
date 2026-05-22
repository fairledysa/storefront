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

function text(value: unknown) {
  return String(value ?? "").trim();
}

function isPlainObject(value: any) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function routeExists(routes: any, key: string) {
  if (!routes || !key) return false;
  return Boolean(routes[key]?.component);
}

function inferRouteFromData(data: any) {
  if (!isPlainObject(data)) return "";

  if (isPlainObject(data.product)) return "product";
  if (isPlainObject(data.category)) return "category";

  const route = text(data.route);
  if (route) return route;

  return "";
}

function inferRouteFromPathname(pathname: string | null) {
  const path = text(pathname || "/");
  const lower = path.toLowerCase();

  if (!path || path === "/") return "home";

  if (lower === "/categories" || lower.startsWith("/categories?")) {
    return "categories";
  }

  if (lower === "/cart" || lower.startsWith("/cart?")) {
    return "cart";
  }

  if (lower === "/account" || lower.startsWith("/account?")) {
    return "account";
  }

  if (lower === "/account/orders" || lower.startsWith("/account/orders?")) {
    return "orders";
  }

  if (lower.startsWith("/account/orders/")) {
    return "order_details";
  }

  if (lower === "/account/addresses" || lower.startsWith("/account/addresses?")) {
    return "addresses";
  }

  if (
    lower === "/account/gift-balance" ||
    lower.startsWith("/account/gift-balance?")
  ) {
    return "giftbalance";
  }

  if (lower === "/account/favorites" || lower.startsWith("/account/favorites?")) {
    return "favorites";
  }

  if (lower === "/account/refer" || lower.startsWith("/account/refer?")) {
    return "refer";
  }

  if (lower === "/account/rewards" || lower.startsWith("/account/rewards?")) {
    return "rewards";
  }

  if (lower === "/account/tickets" || lower.startsWith("/account/tickets?")) {
    return "tickets";
  }

  if (lower === "/account/wallet" || lower.startsWith("/account/wallet?")) {
    return "wallet";
  }

  if (
    lower.includes("/product/") ||
    lower.includes("/products/") ||
    lower.includes("/p/") ||
    /\/p\d+(?:\/)?$/.test(lower)
  ) {
    return "product";
  }

  if (
    lower.includes("/category/") ||
    lower.includes("/categories/") ||
    lower.includes("/c/") ||
    /\/c\d+(?:\/)?$/.test(lower)
  ) {
    return "category";
  }

  return "";
}

export default function ScreenContainer({ data }: Props) {
  const pathname = usePathname();

  const currentKey = useNavStack((s) => s.current());
  const routes = useNavStack((s) => s.routes);
  const setFromPath = useNavStack((s) => s.setFromPath);
  const seoMode = useNavStack((s) => s.seoMode);

  const effectiveKey = useMemo(() => {
    const routesAny = routes as any;

    const dataRoute = inferRouteFromData(data);
    if (routeExists(routesAny, dataRoute)) return dataRoute;

    const manualPathRoute = inferRouteFromPathname(pathname);
    if (routeExists(routesAny, manualPathRoute)) return manualPathRoute;

    const stackPathRoute = pathname
      ? resolveRouteKeyFromPath(pathname, routesAny)
      : null;

    if (stackPathRoute && routeExists(routesAny, stackPathRoute)) {
      return stackPathRoute;
    }

    if (currentKey && routeExists(routesAny, currentKey)) {
      return currentKey;
    }

    return "home";
  }, [data, pathname, routes, currentKey]);

  useEffect(() => {
    if (!pathname) return;
    setFromPath(pathname);
  }, [pathname, setFromPath]);

  const Screen = useMemo(() => {
    const routesAny = routes as any;
    return routesAny?.[effectiveKey]?.component ?? null;
  }, [routes, effectiveKey]);

  if (!Screen) return null;

  return (
    <main className="mk-screen-container" data-mk-screen={effectiveKey}>
      <Screen seoMode={seoMode} mode={seoMode} data={data} />
    </main>
  );
}