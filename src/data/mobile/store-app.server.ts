import "server-only";

import { controlDb } from "@/data/db/control-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

import { BootstrapError } from "./bootstrap/bootstrap.errors";
import type { BootstrapJsonObject } from "./bootstrap/bootstrap.types";

const STORE_APP_COLUMNS = [
  "store_id",
  "public_app_id",
  "app_name_ar",
  "app_name_en",
  "status",
  "is_active",
  "config_version",
  "branding",
  "features",
  "navigation",
  "versions",
  "maintenance",
  "legal_links",
  "contact_links",
].join(",");

export type ActiveMobileStoreApp = {
  storeId: string;
  publicAppId: string;
  appNameAr: string;
  appNameEn: string | null;
  configVersion: number;
  branding: BootstrapJsonObject;
  features: BootstrapJsonObject;
  navigation: BootstrapJsonObject;
  versions: BootstrapJsonObject;
  maintenance: BootstrapJsonObject;
  legalLinks: BootstrapJsonObject;
  contactLinks: BootstrapJsonObject;
};

export function asMobileConfigObject(value: unknown): BootstrapJsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as BootstrapJsonObject)
    : {};
}

function toActiveMobileStoreApp(app: any): ActiveMobileStoreApp {
  return {
    storeId: String(app.store_id),
    publicAppId: String(app.public_app_id),
    appNameAr: String(app.app_name_ar ?? "تطبيق المتجر"),
    appNameEn: typeof app.app_name_en === "string" ? app.app_name_en : null,
    configVersion: Math.max(1, Number(app.config_version ?? 1)),
    branding: asMobileConfigObject(app.branding),
    features: asMobileConfigObject(app.features),
    navigation: asMobileConfigObject(app.navigation),
    versions: asMobileConfigObject(app.versions),
    maintenance: asMobileConfigObject(app.maintenance),
    legalLinks: asMobileConfigObject(app.legal_links),
    contactLinks: asMobileConfigObject(app.contact_links),
  };
}

export async function resolveActiveMobileStoreApp(
  publicAppId?: string | null,
): Promise<ActiveMobileStoreApp> {
  const db = controlDb() as any;
  const cleanPublicAppId = String(publicAppId ?? "").trim();
  const storeContext = await resolveStoreContext();
  const hostStoreId = storeContext.store?.id
    ? String(storeContext.store.id)
    : null;

  let query = db.from("store_apps").select(STORE_APP_COLUMNS);

  if (cleanPublicAppId) {
    query = query.eq("public_app_id", cleanPublicAppId);
  } else if (hostStoreId) {
    query = query.eq("store_id", hostStoreId);
  } else {
    throw new BootstrapError(
      400,
      "STORE_APP_ID_REQUIRED",
      "Unable to determine the store app.",
    );
  }

  const { data: app, error } = await query.maybeSingle();

  if (error || !app) {
    throw new BootstrapError(
      404,
      "STORE_APP_NOT_FOUND",
      "App configuration was not found.",
    );
  }

  if (hostStoreId && String(app.store_id) !== hostStoreId) {
    throw new BootstrapError(
      404,
      "STORE_APP_NOT_FOUND",
      "App configuration was not found.",
    );
  }

  if (app.status !== "active" || app.is_active !== true) {
    throw new BootstrapError(
      403,
      "STORE_APP_INACTIVE",
      "This app is not available.",
    );
  }

  const resolvedStore = storeContext.store;
  if (resolvedStore && String(resolvedStore.id) === String(app.store_id)) {
    if (resolvedStore.status !== "active") {
      throw new BootstrapError(
        403,
        "STORE_INACTIVE",
        "This store is not available.",
      );
    }

    return toActiveMobileStoreApp(app);
  }

  const { data: store, error: storeError } = await db
    .from("stores")
    .select("status")
    .eq("id", app.store_id)
    .maybeSingle();

  if (storeError || !store) {
    throw new BootstrapError(
      404,
      "STORE_APP_NOT_FOUND",
      "App configuration was not found.",
    );
  }

  if (store.status !== "active") {
    throw new BootstrapError(
      403,
      "STORE_INACTIVE",
      "This store is not available.",
    );
  }

  return toActiveMobileStoreApp(app);
}
