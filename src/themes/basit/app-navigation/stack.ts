// FILE: apps/storefront/src/themes/basit/app-navigation/stack.ts
"use client";

import { create } from "zustand";
import type { SeoUrlMode } from "@/data/store/settings";

type RouteDef = { key: string; path?: string; component: any };
type RoutesMap = Record<string, RouteDef>;

type NavStackState = {
  routes: RoutesMap | null;
  stack: string[];

  seoMode: SeoUrlMode;
  setSeoMode: (mode: SeoUrlMode) => void;

  setRoutes: (routes: RoutesMap) => void;

  reset: (key: string) => void;
  push: (key: string) => void;
  replace: (key: string) => void;
  pop: () => void;

  current: () => string;
  setCurrent: (key: string) => void;

  setFromPath: (pathname: string) => void;
  getKeyForPath: (pathname: string) => string | null;
};

function cleanPath(p: string) {
  const x = String(p || "/").split("?")[0].split("#")[0];
  const y = x.startsWith("/") ? x : "/" + x;
  return y === "" ? "/" : y;
}

function matchPattern(pattern: string, pathname: string) {
  const p = cleanPath(pattern);
  const u = cleanPath(pathname);

  if (p === "/" && u === "/") return true;

  const ps = p.split("/").filter(Boolean);
  const us = u.split("/").filter(Boolean);

  if (ps.length !== us.length) return false;

  for (let i = 0; i < ps.length; i++) {
    const a = ps[i]!;
    const b = us[i]!;
    if (a.startsWith(":")) continue;
    if (a !== b) return false;
  }

  return true;
}

function matchNamedArKey(pathname: string): "category" | "product" | null {
  const u = cleanPath(pathname);

  if (/^\/.+\/c\d+\/?$/.test(u)) return "category";
  if (/^\/.+\/p\d+\/?$/.test(u)) return "product";

  return null;
}

function matchShortKey(pathname: string): "category" | "product" | null {
  const u = cleanPath(pathname);

  if (/^\/category\/[^\/]+\/?$/.test(u)) return "category";
  if (/^\/product\/[^\/]+\/?$/.test(u)) return "product";

  return null;
}

function matchRootShortProductKey(pathname: string): "product" | null {
  const u = cleanPath(pathname);

  if (!/^\/[0-9A-Za-z]+\/?$/.test(u)) return null;

  const seg = u.replace(/^\/|\/$/g, "").toLowerCase();

  const reserved = new Set([
    "",
    "ar",
    "en",
    "category",
    "categories",
    "product",
    "products",
    "cart",
    "checkout",
    "account",
    "auth",
    "api",
    "brands",
    "brand",
    "search",
    "thankyou",
    "pages",
    "p",
  ]);

  if (reserved.has(seg)) return null;

  return "product";
}

export function resolveRouteKeyFromPath(
  pathname: string,
  routes?: RoutesMap | null,
) {
  const path = cleanPath(pathname);

  if (routes) {
    for (const k of Object.keys(routes)) {
      const r = routes[k]!;
      if (!r.path) continue;
      if (cleanPath(r.path) === path) return r.key;
    }

    for (const k of Object.keys(routes)) {
      const r = routes[k]!;
      if (!r.path) continue;
      if (r.path.includes(":") && matchPattern(r.path, path)) return r.key;
    }
  }

  if (path === "/") return "home";
  if (path === "/search") return "search";
  if (path === "/cart") return "cart";
  if (path === "/categories") return "categories";
  if (path === "/account") return "account";
  if (path === "/account/orders") return "orders";
  if (path === "/account/addresses") return "addresses";
  if (path === "/account/favorites") return "favorites";
  if (path === "/account/wallet") return "wallet";
  if (path === "/account/rewards") return "rewards";
  if (path === "/account/refer") return "refer";
  if (path === "/account/tickets") return "tickets";
  if (path === "/account/gift-balance") return "gift_balance";
  if (/^\/account\/orders\/[^/]+\/?$/.test(path)) return "order_details";

  const namedKey = matchNamedArKey(path);
  if (namedKey) return namedKey;

  const shortKey = matchShortKey(path);
  if (shortKey) return shortKey;

  const rootShortProductKey = matchRootShortProductKey(path);
  if (rootShortProductKey) return rootShortProductKey;

  return null;
}

export const useNavStack = create<NavStackState>((set, get) => ({
  routes: null,
  stack: ["home"],

  seoMode: "named_ar",
  setSeoMode: (mode) => set({ seoMode: mode }),

  setRoutes: (routes) => set({ routes }),

  reset: (key) => set({ stack: [key] }),

  push: (key) =>
    set((state) => {
      const base = state.stack.length ? state.stack : ["home"];
      const last = base[base.length - 1];

      if (last === key) return { stack: base };

      return { stack: [...base, key] };
    }),

  replace: (key) =>
    set((state) => {
      const base = state.stack.length ? state.stack : ["home"];
      return { stack: [...base.slice(0, base.length - 1), key] };
    }),

  pop: () =>
    set((state) => {
      const base = state.stack.length ? state.stack : ["home"];
      if (base.length <= 1) return { stack: ["home"] };
      return { stack: base.slice(0, -1) };
    }),

  current: () => {
    const stack = get().stack;
    return stack[stack.length - 1] || "home";
  },

  setCurrent: (key) =>
    set((state) => {
      const base = state.stack.length ? state.stack : ["home"];
      const next = [...base];
      next[next.length - 1] = key;
      return { stack: next };
    }),

  getKeyForPath: (pathname) => {
    return resolveRouteKeyFromPath(pathname, get().routes);
  },

  setFromPath: (pathname) => {
    const key = get().getKeyForPath(pathname);
    if (!key) return;

    const cur = get().current();
    if (cur === key) return;

    get().replace(key);
  },
}));