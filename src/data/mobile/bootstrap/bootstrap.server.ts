import "server-only";

import { getMobileCommerceContext } from "../commerce-context.server";
import { resolveActiveMobileStoreApp } from "../store-app.server";
import type { BootstrapPayload, BootstrapRequest } from "./bootstrap.types";

export async function getMobileBootstrap(
  input: BootstrapRequest,
): Promise<BootstrapPayload> {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const commerce = await getMobileCommerceContext(app, input);

  return {
    public_app_id: app.publicAppId,
    app_name_ar: app.appNameAr,
    app_name_en: app.appNameEn,
    config_version: app.configVersion,
    branding: app.branding,
    features: app.features,
    navigation: app.navigation,
    versions: app.versions,
    maintenance: app.maintenance,
    legal_links: app.legalLinks,
    contact_links: app.contactLinks,
    currencies: commerce.currencies,
    tax: commerce.tax,
  };
}
