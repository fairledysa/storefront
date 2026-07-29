import type { MalakBootstrapCurrencies, MalakBootstrapTax } from "@/themes/malak/bootstrap/types";

export type MobilePlatform = "ios" | "android" | "web";

export type AppEnvironment = "development" | "preview" | "production";

export type BootstrapRequest = {
  publicAppId: string | null;
  appVersion: string;
  appEnvironment: AppEnvironment;
  platform: MobilePlatform;
  locale: string;
  timezone: string;
  requestId: string;
  selectedCurrencyCode: string | null;
};

export type BootstrapJsonObject = Record<string, unknown>;

export type BootstrapPayload = {
  public_app_id: string;
  app_name_ar: string;
  app_name_en: string | null;
  config_version: number;
  branding: BootstrapJsonObject;
  features: BootstrapJsonObject;
  navigation: BootstrapJsonObject;
  versions: BootstrapJsonObject;
  maintenance: BootstrapJsonObject;
  legal_links: BootstrapJsonObject;
  contact_links: BootstrapJsonObject;
  currencies: MalakBootstrapCurrencies;
  tax: MalakBootstrapTax;
};
