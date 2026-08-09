// FILE: apps/storefront/src/theme-engine/runtime/pages/render-cart.tsx

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { resolveTheme } from "@/theme-engine/runtime/resolve-theme";
import {
  renderTemplate,
  type StorefrontTemplate,
} from "@/theme-engine/runtime/render-template";
import type { ThemeCode } from "@/theme-engine/types";

function normalizeThemeCode(value: any): ThemeCode {
  const code = String(value ?? "").trim();

  if (code === "malak") return "malak";
  if (code === "basit") return "basit";
  if (code === "classic") return "classic";

  return "classic";
}

function resolveTemplateFromRoute(route: string): StorefrontTemplate {
  switch (route) {
    case "cart":
      return "cart";

    case "account":
      return "account";

    case "orders":
      return "account/orders";

    case "order_details":
      return "account/order-details";

    case "addresses":
      return "account/addresses";

    case "wallet":
      return "account/wallet";

    case "rewards":
      return "account/rewards";

    case "gift_balance":
      return "account/gift-balance";

    case "tickets":
      return "account/tickets";

    case "refer":
      return "account/refer";

    case "favorites":
      return "account/favorites";

    case "thankyou":
      return "cart";

    default:
      return "cart";
  }
}

export async function renderCartPage(args: {
  store: any;
  store_id: string;
  preview: boolean;
  data?: any;
}) {
  const ctx = await resolveStoreContext();

  let themeCode = normalizeThemeCode(
    ctx?.theme?.theme_key || (ctx as any)?.theme?.key || "classic",
  );

  let themeSettings =
    ctx?.theme?.options && typeof ctx.theme.options === "object"
      ? ctx.theme.options
      : {};

  if (args.preview) {
    const previewTheme = await resolveTheme({
      store_id: args.store_id,
      preview: true,
    });

    if (previewTheme.code === "basit") {
      themeCode = "basit";
      themeSettings = previewTheme.settings;
    }
  }

  const route = String(args.data?.route ?? "cart").trim() || "cart";
  const template = resolveTemplateFromRoute(route);

  return await renderTemplate({
    template,
    themeCode,
    store: {
      id: args.store.id,
      slug: args.store.slug,
      name: args.store.name,
      logo_url: args.store.logo_url ?? null,
      favicon_url: args.store.favicon_url ?? null,
    },
    theme: {
      code: themeCode,
      settings: themeSettings,
    },
    sections: [],
    data: args.data ?? null,
    children: null,
  });
}
