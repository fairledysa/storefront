import "server-only";

import { controlDb } from "@/data/db/control-db.server";
import { getSeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import type {
  MalakBootstrapCurrencies,
  MalakBootstrapTax,
} from "@/themes/malak/bootstrap/types";

import type { BootstrapRequest } from "./bootstrap/bootstrap.types";
import type { ActiveMobileStoreApp } from "./store-app.server";

function text(value: unknown) {
  return String(value ?? "").trim();
}

export type MobileCommerceContext = {
  storeSlug: string;
  currencies: MalakBootstrapCurrencies;
  tax: MalakBootstrapTax;
};

export async function getMobileCommerceContext(
  app: ActiveMobileStoreApp,
  input: Pick<BootstrapRequest, "selectedCurrencyCode">,
): Promise<MobileCommerceContext> {
  const db = controlDb() as any;
  const { data: store, error } = await db
    .from("stores")
    .select(
      "id,slug,name,default_currency,description,logo_url,favicon_url",
    )
    .eq("id", app.storeId)
    .maybeSingle();

  if (error || !store?.id) {
    throw new Error(
      `[mobile-commerce] Unable to load store pricing context: ${error?.message ?? "STORE_NOT_FOUND"}`,
    );
  }

  const seoMode = await getSeoUrlMode(app.storeId);
  const bootstrap = await getMalakBootstrap({
    store: {
      id: text(store.id),
      slug: text(store.slug),
      name: text(store.name) || app.appNameAr,
      default_currency: text(store.default_currency) || "SAR",
      description: text(store.description) || null,
      logo_url: text(store.logo_url) || null,
      favicon_url: text(store.favicon_url) || null,
    },
    seoMode,
    selectedCurrencyCode: input.selectedCurrencyCode,
  });

  if (!bootstrap.currencies || !bootstrap.tax) {
    throw new Error("[mobile-commerce] Malak pricing context is incomplete.");
  }

  return {
    storeSlug: text(store.slug),
    currencies: bootstrap.currencies,
    tax: bootstrap.tax,
  };
}
