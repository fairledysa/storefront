// FILE: apps/storefront/src/themes/malak/bootstrap/get-malak-bootstrap.ts

import "server-only";

import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { getCategoriesTree } from "@/data/catalog/categories";
import {
  buildCategoryHref,
  buildProductHref as buildStoreProductHref,
} from "@/lib/seo/build-store-href";
import { supabaseAdmin } from "@/data/store/supabase.server";
import type { SeoUrlMode } from "@/data/store/settings";
import { createDefaultMalakBootstrap } from "./defaults";

import type {
  MalakBootstrap,
  MalakBootstrapPwa,
  MalakBootstrapCategory,
  MalakBootstrapCurrencies,
  MalakBootstrapCurrency,
  MalakBootstrapFooterLink,
  MalakBootstrapHelpItem,
  MalakBootstrapMarketing,
  MalakBootstrapMarketingSearchGroup,
  MalakBootstrapMarketingSearchItem,
  MalakBootstrapMegaMenuBanner,
  MalakBootstrapMegaMenuCategorySettings,
  MalakBootstrapMegaMenuValue,
  MalakBootstrapRatingSettings,
  MalakBootstrapSocial,
  MalakBootstrapTax,
  MalakBootstrapTaxRate,
} from "./types";

type StoreInput = {
  id: string;
  slug?: string | null;
  name: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  description?: string | null;
  default_currency?: string | null;
};

type AnyCategory = {
  id?: string;
  name?: string;
  slug?: string | null;
  public_no?: number | string | null;
  short_url?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  depth?: number | null;
  path?: string | null;
  href?: string | null;
  image?: { url?: string | null; alt?: string | null } | null;
  children?: AnyCategory[];
};

type StoreSettingsMap = {
  profile: Record<string, any>;
  support: Record<string, any>;
  social: Record<string, any>;
  app: Record<string, any>;
  pwa: Record<string, any>;
  ratingSettings: Record<string, any>;
};

type FooterPageRow = {
  id: string;
  title: string;
  seo_slug: string;
  sort_order: number;
};

type StoreCurrencyRow = {
  currency_code?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  symbol?: string | null;
  decimal_digits?: number | string | null;
  is_enabled?: boolean | null;
  is_default?: boolean | null;
  sort_order?: number | string | null;
  metadata?: Record<string, any> | string | null;
};

type StoreTaxSettingsRow = {
  enabled?: boolean | number | string | null;
  tax_number?: string | null;
  tax_certificate_url?: string | null;
  show_tax_number_in_footer?: boolean | number | string | null;
  show_tax_certificate_icon?: boolean | number | string | null;
  prices_include_tax?: boolean | number | string | null;
  shipping_include_tax?: boolean | number | string | null;
  tax_label?: string | null;
  metadata?: Record<string, any> | string | null;
};

type StoreTaxRateRow = {
  country_code?: string | null;
  country_name_ar?: string | null;
  country_name_en?: string | null;
  rate?: number | string | null;
  is_active?: boolean | number | string | null;
  sort_order?: number | string | null;
  metadata?: Record<string, any> | string | null;
};

const MEGA_MENU_SETTING_SLUG = "mega_menu";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  if (value && typeof value === "object") {
    const obj = value as any;

    if ("enabled" in obj) return bool(obj.enabled, fallback);
    if ("is_enabled" in obj) return bool(obj.is_enabled, fallback);
    if ("checked" in obj) return bool(obj.checked, fallback);
    if ("value" in obj) return bool(obj.value, fallback);
  }

  return fallback;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}
function normalizePwaSettings(
  value: Record<string, any>,
  args: {
    storeName: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor: string;
    backgroundColor: string;
  },
): MalakBootstrapPwa {
  const source = safeObject(value);
  const hasConfig = Object.keys(source).length > 0;

  const iconSource = safeObject(source.icon);
  const splashSource = safeObject(source.splash);
  const onboardingSource = safeObject(source.onboarding);
  const installSource = safeObject(source.install_prompt);

  const appName = s(source.app_name) || args.storeName;
  const shortName = (s(source.short_name) || appName).slice(0, 18);

  const fallbackIcon = s(args.faviconUrl) || s(args.logoUrl);

  const slides = Array.isArray(onboardingSource.slides)
    ? onboardingSource.slides
        .map((slide: any, index: number) => {
          const row = safeObject(slide);

          return {
            id: s(row.id) || `slide-${index + 1}`,
            enabled: bool(row.enabled, true),
            image: s(row.image),
            title: s(row.title),
            description: s(row.description),
            sort_order: Number.isFinite(Number(row.sort_order))
              ? Number(row.sort_order)
              : index + 1,
          };
        })
        .filter((slide) => slide.enabled || slide.image || slide.title)
    : [];

  return {
    enabled: bool(source.enabled, hasConfig),

    app_name: appName,
    short_name: shortName,

    theme_color: s(source.theme_color) || args.primaryColor || "#0D3B45",
    background_color:
      s(source.background_color) || args.backgroundColor || "#FFFFFF",

    language: s(source.language) || "ar",

    icon: {
      source: s(iconSource.source) || fallbackIcon,
      apple_180: s(iconSource.apple_180) || s(iconSource.source) || fallbackIcon,
      pwa_192: s(iconSource.pwa_192) || s(iconSource.source) || fallbackIcon,
      pwa_512: s(iconSource.pwa_512) || s(iconSource.source) || fallbackIcon,
      maskable_512:
        s(iconSource.maskable_512) || s(iconSource.source) || fallbackIcon,
    },

    splash: {
      enabled: bool(splashSource.enabled, hasConfig),
      image: s(splashSource.image),
      background_color:
        s(splashSource.background_color) ||
        s(source.theme_color) ||
        args.primaryColor ||
        "#0D3B45",
      duration: splashSource.duration === "normal" ? "normal" : "short",
    },

    onboarding: {
      enabled: bool(onboardingSource.enabled, hasConfig),
      version: Math.max(1, Number(onboardingSource.version || 1) || 1),
      slides,
    },

    install_prompt: {
      enabled: bool(installSource.enabled, hasConfig),
      android_enabled: bool(installSource.android_enabled, true),
      ios_enabled: bool(installSource.ios_enabled, true),
      title: s(installSource.title) || "ثبّت المتجر كتطبيق",
      description:
        s(installSource.description) ||
        "احصل على تجربة أسرع وأسهل من شاشة جوالك.",
    },
  };
}
function pickSettingValue(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return undefined;
}

function settingBool(
  source: Record<string, any>,
  keys: string[],
  fallback: boolean,
) {
  const value = pickSettingValue(source, keys);
  return bool(value, fallback);
}

function settingNumber(
  source: Record<string, any>,
  keys: string[],
  fallback: number,
  min?: number,
  max?: number,
) {
  const value = pickSettingValue(source, keys);
  const n = Number(value);

  let out = Number.isFinite(n) ? n : fallback;

  if (typeof min === "number") out = Math.max(min, out);
  if (typeof max === "number") out = Math.min(max, out);

  return out;
}

function settingText(
  source: Record<string, any>,
  keys: string[],
  fallback: string,
) {
  const value = pickSettingValue(source, keys);
  return s(value) || fallback;
}

function settingStringArray(
  source: Record<string, any>,
  keys: string[],
  fallback: string[],
) {
  const value = pickSettingValue(source, keys);

  if (Array.isArray(value)) {
    return value.map((item) => s(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = s(value);
    if (!trimmed) return fallback;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => s(item)).filter(Boolean);
      }
    } catch {}

    return trimmed
      .split(",")
      .map((item) => s(item))
      .filter(Boolean);
  }

  return fallback;
}

function normalizeRatingSettings(
  sourceValue: Record<string, any>,
  fallbackValue?: MalakBootstrapRatingSettings,
): MalakBootstrapRatingSettings {
  const source = safeObject(sourceValue);

  const fallback: MalakBootstrapRatingSettings = fallbackValue ?? {
    publishTestimonials: true,
    publishRatings: true,
    allowAttachImages: false,
    allowLikes: false,
    showRatingSummary: true,
    showRecommendation: true,
    allowContactSupport: false,
    allowUpdate: false,
    allowUpdatePeriod: 7,

    testimonialsEnabled: true,
    shippingEnabled: true,
    productsEnabled: true,
    allowHiddenNames: false,
    displayTestimonials: true,
    displayCustomerReviews: true,
    displayProductReviewsOnApp: false,

    orderStatuses: ["completed", "delivered"],
    thanksMessage: "شكراً لوقتك\nونتمنى لك تسوق ممتع",

    ratingEnabled: true,
    ratingHoursPeriod: 168,
    channels: ["email"],
    ratingMessageTitle: "نتمنى أن نعرف رأيك في الطلب",
    ratingMessage: "ياليت نعرف رأيك في الطلب من خلال الرابط: {url}",
  };

  return {
    publishTestimonials: settingBool(
      source,
      ["publishTestimonials", "publish_testimonials"],
      fallback.publishTestimonials,
    ),
    publishRatings: settingBool(
      source,
      ["publishRatings", "publish_ratings"],
      fallback.publishRatings,
    ),
    allowAttachImages: settingBool(
      source,
      ["allowAttachImages", "allow_attach_images"],
      fallback.allowAttachImages,
    ),
    allowLikes: settingBool(
      source,
      ["allowLikes", "allow_likes"],
      fallback.allowLikes,
    ),
    showRatingSummary: settingBool(
      source,
      ["showRatingSummary", "show_rating_summary"],
      fallback.showRatingSummary,
    ),
    showRecommendation: settingBool(
      source,
      ["showRecommendation", "show_recommendation"],
      fallback.showRecommendation,
    ),
    allowContactSupport: settingBool(
      source,
      ["allowContactSupport", "allow_contact_support"],
      fallback.allowContactSupport,
    ),
    allowUpdate: settingBool(
      source,
      ["allowUpdate", "allow_update"],
      fallback.allowUpdate,
    ),
    allowUpdatePeriod: settingNumber(
      source,
      ["allowUpdatePeriod", "allow_update_period"],
      fallback.allowUpdatePeriod,
      0,
      365,
    ),

    testimonialsEnabled: settingBool(
      source,
      ["testimonialsEnabled", "testimonials_enabled"],
      fallback.testimonialsEnabled,
    ),
    shippingEnabled: settingBool(
      source,
      ["shippingEnabled", "shipping_enabled"],
      fallback.shippingEnabled,
    ),
    productsEnabled: settingBool(
      source,
      ["productsEnabled", "products_enabled"],
      fallback.productsEnabled,
    ),
    allowHiddenNames: settingBool(
      source,
      ["allowHiddenNames", "allow_hidden_names"],
      fallback.allowHiddenNames,
    ),
    displayTestimonials: settingBool(
      source,
      ["displayTestimonials", "display_testimonials"],
      fallback.displayTestimonials,
    ),
    displayCustomerReviews: settingBool(
      source,
      ["displayCustomerReviews", "display_customer_reviews"],
      fallback.displayCustomerReviews,
    ),
    displayProductReviewsOnApp: settingBool(
      source,
      ["displayProductReviewsOnApp", "display_product_reviews_on_app"],
      fallback.displayProductReviewsOnApp,
    ),

    orderStatuses: settingStringArray(
      source,
      ["orderStatuses", "order_statuses"],
      fallback.orderStatuses,
    ),
    thanksMessage: settingText(
      source,
      ["thanksMessage", "thanks_message"],
      fallback.thanksMessage,
    ),

    ratingEnabled: settingBool(
      source,
      ["ratingEnabled", "rating_enabled"],
      fallback.ratingEnabled,
    ),
    ratingHoursPeriod: settingNumber(
      source,
      ["ratingHoursPeriod", "rating_hours_period"],
      fallback.ratingHoursPeriod,
      0,
      8760,
    ),
    channels: settingStringArray(
      source,
      ["channels", "ratingMessageChannels", "rating_message_channel_type"],
      fallback.channels,
    ),
    ratingMessageTitle: settingText(
      source,
      ["ratingMessageTitle", "rating_message_title"],
      fallback.ratingMessageTitle,
    ),
    ratingMessage: settingText(
      source,
      ["ratingMessage", "rating_message"],
      fallback.ratingMessage,
    ),
  };
}

function findThemeOption(source: any, key: string): any {
  if (!source || typeof source !== "object") return undefined;

  if (Object.prototype.hasOwnProperty.call(source, key)) {
    return source[key];
  }

  for (const value of Object.values(source)) {
    if (!value || typeof value !== "object") continue;

    const found = findThemeOption(value, key);
    if (found !== undefined) return found;
  }

  return undefined;
}

function themeOptionText(
  source: Record<string, any>,
  key: string,
  fallback = "",
) {
  const value = findThemeOption(source, key);

  if (value && typeof value === "object") {
    if ("value" in value) return s((value as any).value) || fallback;
    if ("url" in value) return s((value as any).url) || fallback;
    if ("src" in value) return s((value as any).src) || fallback;
  }

  return s(value) || fallback;
}

function themeOptionBool(
  source: Record<string, any>,
  key: string,
  fallback: boolean,
) {
  const value = findThemeOption(source, key);
  return bool(value, fallback);
}

function themeOptionNumber(
  source: Record<string, any>,
  key: string,
  fallback: number,
  min?: number,
  max?: number,
) {
  const value = findThemeOption(source, key);

  let n: number;

  if (value && typeof value === "object") {
    if ("value" in value) {
      n = Number((value as any).value);
    } else {
      n = Number(value);
    }
  } else {
    n = Number(value);
  }

  if (!Number.isFinite(n)) n = fallback;

  if (typeof min === "number") n = Math.max(min, n);
  if (typeof max === "number") n = Math.min(max, n);

  return n;
}

function themeOptionSide(
  source: Record<string, any>,
  key: string,
  fallback: "left" | "right",
): "left" | "right" {
  const value = themeOptionText(source, key, fallback);
  return value === "left" ? "left" : "right";
}

function themeOptionSliderBackgroundSize(
  source: Record<string, any>,
  key: string,
  fallback: "cover" | "contain" | "fill",
): "cover" | "contain" | "fill" {
  const value = themeOptionText(source, key, fallback);

  if (value === "contain" || value === "fill" || value === "cover") {
    return value;
  }

  return fallback;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeCurrencyCode(value: unknown) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function makeCurrencyCookieName(storeId: string) {
  return `mk_currency_${s(storeId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function readCookieValue(name: string) {
  try {
    const cookieStoreMaybe = cookies();
    const cookieStore =
      typeof (cookieStoreMaybe as any)?.then === "function"
        ? await cookieStoreMaybe
        : cookieStoreMaybe;

    return s((cookieStore as any)?.get?.(name)?.value);
  } catch {
    return "";
  }
}

function readCurrencyRate(metadata: Record<string, any>) {
  const raw =
    metadata.rate ??
    metadata.exchange_rate ??
    metadata.exchangeRate ??
    metadata.conversion_rate ??
    metadata.conversionRate;

  const rate = Number(raw);

  if (!Number.isFinite(rate) || rate <= 0) return 1;

  return rate;
}

function currencyFallbackName(code: string) {
  return code || "SAR";
}

function currencyFallbackSymbol(code: string) {
  return code || "SAR";
}

function toCurrencyItem(
  row: StoreCurrencyRow,
  fallbackCode: string,
  index: number,
): MalakBootstrapCurrency | null {
  const code = normalizeCurrencyCode(row.currency_code) || fallbackCode;
  if (!code) return null;

  const metadata = safeObject(row.metadata);
  const decimalDigits = Number(row.decimal_digits ?? 2);
  const sortOrder = Number(row.sort_order ?? index);

  const nameAr = s(row.name_ar) || currencyFallbackName(code);
  const nameEn = s(row.name_en) || null;
  const symbol = s(row.symbol) || currencyFallbackSymbol(code);

  return {
    code,
    currency_code: code,

    symbol,

    name: nameAr,
    name_ar: nameAr,
    name_en: nameEn,

    rate: readCurrencyRate(metadata),

    decimal_digits: Number.isFinite(decimalDigits)
      ? Math.max(0, Math.min(4, decimalDigits))
      : 2,
    decimals: Number.isFinite(decimalDigits)
      ? Math.max(0, Math.min(4, decimalDigits))
      : 2,

    is_default: bool(row.is_default, false),

    is_enabled: bool(row.is_enabled, true),
    enabled: bool(row.is_enabled, true),

    sort_order: Number.isFinite(sortOrder) ? sortOrder : index,
  };
}

function createFallbackCurrency(codeValue: string): MalakBootstrapCurrency {
  const code = normalizeCurrencyCode(codeValue) || "SAR";

  return {
    code,
    currency_code: code,

    symbol: currencyFallbackSymbol(code),

    name: currencyFallbackName(code),
    name_ar: currencyFallbackName(code),
    name_en: null,

    rate: 1,

    decimal_digits: 2,
    decimals: 2,

    is_default: true,

    is_enabled: true,
    enabled: true,

    sort_order: 0,
  };
}

function normalizeStoreCurrencies(args: {
  storeId: string;
  rows: StoreCurrencyRow[];
  storeDefaultCurrency?: string | null;
  selectedCurrencyCode?: string | null;
}): MalakBootstrapCurrencies {
  const cookieName = makeCurrencyCookieName(args.storeId);
  const fallbackCode = normalizeCurrencyCode(args.storeDefaultCurrency) || "SAR";

  const items = (Array.isArray(args.rows) ? args.rows : [])
    .map((row, index) => toCurrencyItem(row, fallbackCode, index))
    .filter(Boolean)
    .filter((item) => (item as MalakBootstrapCurrency).enabled)
    .sort(
      (a, b) =>
        Number((a as MalakBootstrapCurrency).sort_order ?? 0) -
        Number((b as MalakBootstrapCurrency).sort_order ?? 0),
    ) as MalakBootstrapCurrency[];

  if (!items.length) {
    const fallback = createFallbackCurrency(fallbackCode);

    return {
      enabled: false,
      has_multiple: false,

      default_code: fallback.code,
      active_code: fallback.code,
      selected_code: fallback.code,

      selected_cookie_name: cookieName,

      items: [fallback],

      default_currency: fallback,
      active_currency: fallback,
    };
  }

  const explicitDefault =
    items.find((item) => item.is_default) ||
    items.find((item) => item.code === fallbackCode) ||
    items[0];

  const defaultCode = explicitDefault?.code || fallbackCode;

  const selectedCode = normalizeCurrencyCode(args.selectedCurrencyCode);
  const activeCurrency =
    (selectedCode && items.find((item) => item.code === selectedCode)) ||
    explicitDefault ||
    items[0];

  const defaultCurrency =
    items.find((item) => item.code === defaultCode) || explicitDefault || items[0];

  return {
    enabled: true,
    has_multiple: items.length > 1,

    default_code: defaultCurrency.code,
    active_code: activeCurrency.code,
    selected_code: activeCurrency.code,

    selected_cookie_name: cookieName,

    items,

    default_currency: defaultCurrency,
    active_currency: activeCurrency,
  };
}

/* =========================
   Store Tax
   ========================= */

function normalizeTaxCountryCode(value: unknown) {
  const code = s(value).toUpperCase();

  if (!code) return "";
  if (code === "ALL") return "ALL";

  return /^[A-Z]{2}$/.test(code) ? code : "";
}

function toTaxRateNumber(value: unknown) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(100, n));
}

function toSortOrder(value: unknown, fallback: number) {
  const n = Number(value ?? fallback);

  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function normalizeTaxRateRow(
  row: StoreTaxRateRow,
  index: number,
): MalakBootstrapTaxRate | null {
  const countryCode = normalizeTaxCountryCode(row.country_code);

  if (!countryCode) return null;

  const countryNameAr =
    s(row.country_name_ar) ||
    (countryCode === "ALL" ? "كل الدول" : countryCode);

  const countryNameEn =
    s(row.country_name_en) ||
    (countryCode === "ALL" ? "All Countries" : countryCode);

  const sortOrder = toSortOrder(row.sort_order, index);
  const isActive = bool(row.is_active, true);

  return {
    country_code: countryCode,
    countryCode,

    country_name_ar: countryNameAr,
    countryNameAr: countryNameAr,

    country_name_en: countryNameEn || null,
    countryNameEn: countryNameEn || null,

    rate: toTaxRateNumber(row.rate),

    is_active: isActive,
    isActive,

    sort_order: sortOrder,
    sortOrder,

    metadata: safeObject(row.metadata),
  };
}

function chooseDefaultTaxRate(
  rates: MalakBootstrapTaxRate[],
): MalakBootstrapTaxRate | null {
  const activeRates = rates.filter((rate) => rate.is_active && rate.rate > 0);

  return (
    activeRates.find((rate) => rate.country_code === "SA") ||
    activeRates.find((rate) => rate.country_code === "ALL") ||
    activeRates[0] ||
    rates.find((rate) => rate.country_code === "SA") ||
    rates.find((rate) => rate.country_code === "ALL") ||
    rates[0] ||
    null
  );
}

function normalizeStoreTax(args: {
  settings?: StoreTaxSettingsRow | null;
  rates?: StoreTaxRateRow[] | null;
}): MalakBootstrapTax {
  const settings = args.settings ?? null;

  const rates = (Array.isArray(args.rates) ? args.rates : [])
    .map((row, index) => normalizeTaxRateRow(row, index))
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number((a as MalakBootstrapTaxRate).sort_order ?? 0) -
        Number((b as MalakBootstrapTaxRate).sort_order ?? 0),
    ) as MalakBootstrapTaxRate[];

  const defaultRateRow = chooseDefaultTaxRate(rates);

  const enabled = bool(settings?.enabled, false);
  const label = s(settings?.tax_label) || "VAT";

  const taxNumber = s(settings?.tax_number) || null;
  const certificateUrl = s(settings?.tax_certificate_url) || null;

  const pricesIncludeTax = bool(settings?.prices_include_tax, false);
  const shippingIncludeTax = bool(settings?.shipping_include_tax, false);

  const showTaxNumberInFooter = bool(
    settings?.show_tax_number_in_footer,
    false,
  );

  const showTaxCertificateIcon = bool(
    settings?.show_tax_certificate_icon,
    false,
  );

  const defaultRate = Number(defaultRateRow?.rate ?? 0);
  const effectiveRate = enabled ? defaultRate : 0;

  return {
    enabled,

    tax_label: label,
    taxLabel: label,
    label,

    tax_number: taxNumber,
    taxNumber,

    tax_certificate_url: certificateUrl,
    taxCertificateUrl: certificateUrl,

    certificate_url: certificateUrl,
    certificateUrl,

    prices_include_tax: pricesIncludeTax,
    pricesIncludeTax,

    shipping_include_tax: shippingIncludeTax,
    shippingIncludeTax,

    show_tax_number_in_footer: showTaxNumberInFooter,
    showTaxNumberInFooter,

    show_tax_certificate_icon: showTaxCertificateIcon,
    showTaxCertificateIcon,

    default_country_code: defaultRateRow?.country_code ?? null,
    defaultCountryCode: defaultRateRow?.country_code ?? null,

    default_rate: defaultRate,
    defaultRate,

    effective_rate: effectiveRate,
    effectiveRate,

    rate: effectiveRate,

    rates,

    metadata: safeObject(settings?.metadata),
  };
}

async function loadStoreTaxRaw(storeId: string): Promise<MalakBootstrapTax> {
  const sb: any = supabaseAdmin();

  const [
    { data: settings, error: settingsError },
    { data: rates, error: ratesError },
  ] = await Promise.all([
    sb
      .from("store_tax_settings")
      .select(
        "enabled,tax_number,tax_certificate_url,show_tax_number_in_footer,show_tax_certificate_icon,prices_include_tax,shipping_include_tax,tax_label,metadata,created_at,updated_at",
      )
      .eq("store_id", storeId)
      .maybeSingle(),

    sb
      .from("store_tax_rates")
      .select(
        "country_code,country_name_ar,country_name_en,rate,is_active,sort_order,metadata,created_at,updated_at",
      )
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("country_code", { ascending: true }),
  ]);

  if (settingsError || ratesError) {
    return normalizeStoreTax({
      settings: null,
      rates: [],
    });
  }

  return normalizeStoreTax({
    settings: settings as StoreTaxSettingsRow | null,
    rates: Array.isArray(rates) ? (rates as StoreTaxRateRow[]) : [],
  });
}

const storeTaxCache = new Map<string, () => Promise<MalakBootstrapTax>>();

function loadStoreTax(storeId: string): Promise<MalakBootstrapTax> {
  const key = `store-tax:${storeId}`;

  let fn = storeTaxCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadStoreTaxRaw(storeId),
      ["malak-store-tax", storeId],
      { revalidate: 60 },
    );

    storeTaxCache.set(key, fn);
  }

  return fn();
}

function themeVersionSlug(versionId: string) {
  return `theme_version:${versionId}:theme_options`;
}

function themeVersionMainInfoSlug(versionId: string) {
  return `theme_version:${versionId}:main_info`;
}

async function loadThemeVersionMainInfoRaw(args: {
  storeId: string;
  versionId?: string | null;
}) {
  const versionId =
    s(args.versionId) && s(args.versionId) !== "published"
      ? s(args.versionId)
      : await resolvePublishedThemeVersionId(args.storeId);

  if (!versionId) return {};

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,created_at,updated_at")
    .eq("store_id", args.storeId)
    .eq("slug", themeVersionMainInfoSlug(versionId))
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return {};

  return safeObject(data?.value);
}

const themeVersionMainInfoCache = new Map<
  string,
  () => Promise<Record<string, any>>
>();

function loadThemeVersionMainInfo(args: {
  storeId: string;
  versionId?: string | null;
}) {
  const versionKey = s(args.versionId) || "published";
  const key = `theme-version-main-info:${args.storeId}:${versionKey}`;

  let fn = themeVersionMainInfoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        loadThemeVersionMainInfoRaw({
          storeId: args.storeId,
          versionId: args.versionId,
        }),
      ["malak-theme-version-main-info", args.storeId, versionKey],
      { revalidate: 60 },
    );

    themeVersionMainInfoCache.set(key, fn);
  }

  return fn();
}

function normalizeExternalUrl(value: string) {
  const v = s(value);
  if (!v) return "";

  if (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("whatsapp:") ||
    v.startsWith("/")
  ) {
    return v;
  }

  return `https://${v}`;
}

function normalizeInternalPath(value: string) {
  const v = s(value);
  if (!v) return "";

  if (v.startsWith("http://") || v.startsWith("https://")) {
    return v;
  }

  return v.startsWith("/") ? v : `/${v}`;
}

function normalizeSearchHref(query: string) {
  const q = s(query);
  if (!q) return "/search";

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("sort", "newest");

  return `/search?${params.toString()}`;
}

function normalizeSocialUrl(platform: string, value: string) {
  const v = s(value);
  if (!v) return "";

  if (v.startsWith("http://") || v.startsWith("https://")) {
    return v;
  }

  const clean = v.replace(/^@+/, "");

  if (platform === "instagram") return `https://instagram.com/${clean}`;
  if (platform === "x") return `https://x.com/${clean}`;
  if (platform === "snapchat") return `https://snapchat.com/add/${clean}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${clean}`;
  if (platform === "youtube") return `https://youtube.com/${clean}`;
  if (platform === "facebook") return `https://facebook.com/${clean}`;

  return normalizeExternalUrl(v);
}

function makeFallbackId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function toCategoryNode(
  row: AnyCategory,
  seoMode: SeoUrlMode,
): MalakBootstrapCategory | null {
  const id = s(row?.id);
  const name = s(row?.name);

  if (!id || !name) return null;

  const publicNo = Number(row?.public_no ?? 0);
  const shortUrl = row?.short_url ?? null;

  const href =
    row?.href ||
    buildCategoryHref({
      mode: seoMode,
      slugNameAr: name,
      slugNameEn: row?.slug || name,
      publicNo: Number.isFinite(publicNo) ? publicNo : 0,
      shortCode: shortUrl,
    });

  const children = Array.isArray(row.children)
    ? row.children
        .map((child) => toCategoryNode(child, seoMode))
        .filter(Boolean)
    : [];

  return {
    id,
    name,
    slug: row.slug ?? null,
    href,
    public_no: Number.isFinite(publicNo) ? publicNo : null,
    short_url: shortUrl,
    parent_id: row.parent_id ?? null,
    sort_order: row.sort_order ?? null,
    depth: row.depth ?? null,
    path: row.path ?? null,
    image: row.image?.url
      ? {
          url: row.image.url,
          alt: row.image.alt ?? name,
        }
      : null,
    children: children as MalakBootstrapCategory[],
  };
}

function normalizeCategoriesTree(
  tree: unknown,
  seoMode: SeoUrlMode,
): MalakBootstrapCategory[] {
  if (!Array.isArray(tree)) return [];

  return tree
    .map((row) => toCategoryNode(row as AnyCategory, seoMode))
    .filter(Boolean) as MalakBootstrapCategory[];
}

type CategoryHrefIndex = {
  byId: Map<string, string>;
  byPublicNo: Map<string, string>;
  bySlug: Map<string, string>;
  byShortUrl: Map<string, string>;
};

function categoryLookupKey(value: unknown) {
  return s(value).replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
}

function createCategoryHrefIndex(
  categories: MalakBootstrapCategory[],
): CategoryHrefIndex {
  const index: CategoryHrefIndex = {
    byId: new Map(),
    byPublicNo: new Map(),
    bySlug: new Map(),
    byShortUrl: new Map(),
  };

  function add(category: MalakBootstrapCategory) {
    const href = s(category.href);
    if (!href) return;

    const id = categoryLookupKey(category.id);
    if (id) index.byId.set(id, href);

    const publicNo = Number(category.public_no ?? 0);
    if (Number.isFinite(publicNo) && publicNo > 0) {
      index.byPublicNo.set(String(publicNo), href);
    }

    const slug = categoryLookupKey(category.slug);
    if (slug) index.bySlug.set(slug, href);

    const shortUrl = categoryLookupKey(category.short_url);
    if (shortUrl) index.byShortUrl.set(shortUrl, href);

    if (Array.isArray(category.children)) {
      category.children.forEach(add);
    }
  }

  categories.forEach(add);

  return index;
}

function findCategoryHrefInIndex(
  index: CategoryHrefIndex | undefined,
  value: string,
) {
  if (!index) return "";

  const key = categoryLookupKey(value);
  if (!key) return "";

  if (isUuid(key)) return index.byId.get(key) || "";
  if (/^\d+$/.test(key)) return index.byPublicNo.get(key) || "";

  return index.bySlug.get(key) || index.byShortUrl.get(key) || "";
}

async function loadActiveThemeOptionsRaw(storeId: string) {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_themes")
    .select("settings,updated_at,created_at")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return {};

  return safeObject(data?.settings);
}

const activeThemeOptionsCache = new Map<
  string,
  () => Promise<Record<string, any>>
>();

function loadActiveThemeOptions(storeId: string) {
  const key = `active-theme-options:${storeId}`;

  let fn = activeThemeOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadActiveThemeOptionsRaw(storeId),
      ["malak-active-theme-options", storeId],
      { revalidate: 60 },
    );

    activeThemeOptionsCache.set(key, fn);
  }

  return fn();
}

async function resolvePublishedThemeVersionIdRaw(storeId: string) {
  const sb: any = supabaseAdmin();

  const { data: themeRow, error: themeError } = await sb
    .from("themes")
    .select("id,catalog_theme_id,code")
    .eq("code", "malak")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (themeError || !themeRow?.catalog_theme_id) return null;

  const { data: versionRow, error: versionError } = await sb
    .from("store_theme_versions")
    .select("id,store_id,theme_id,status,is_default,last_updated_at,created_at")
    .eq("store_id", storeId)
    .eq("theme_id", themeRow.catalog_theme_id)
    .eq("status", "published")
    .order("is_default", { ascending: false })
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError || !versionRow?.id) return null;

  return String(versionRow.id);
}

const publishedThemeVersionCache = new Map<string, () => Promise<string | null>>();

function resolvePublishedThemeVersionId(storeId: string) {
  const key = `published-theme-version:${storeId}`;

  let fn = publishedThemeVersionCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => resolvePublishedThemeVersionIdRaw(storeId),
      ["malak-published-theme-version", storeId],
      { revalidate: 60 },
    );

    publishedThemeVersionCache.set(key, fn);
  }

  return fn();
}

async function loadThemeVersionOptionsRaw(args: {
  storeId: string;
  versionId?: string | null;
}) {
  const versionId =
    s(args.versionId) && s(args.versionId) !== "published"
      ? s(args.versionId)
      : await resolvePublishedThemeVersionId(args.storeId);

  if (!versionId) return {};

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,created_at,updated_at")
    .eq("store_id", args.storeId)
    .eq("slug", themeVersionSlug(versionId))
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return {};

  return safeObject(data?.value);
}

const themeVersionOptionsCache = new Map<
  string,
  () => Promise<Record<string, any>>
>();

function loadThemeVersionOptions(args: {
  storeId: string;
  versionId?: string | null;
}) {
  const versionKey = s(args.versionId) || "published";
  const key = `theme-version-options:${args.storeId}:${versionKey}`;

  let fn = themeVersionOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        loadThemeVersionOptionsRaw({
          storeId: args.storeId,
          versionId: args.versionId,
        }),
      ["malak-theme-version-options", args.storeId, versionKey],
      { revalidate: 60 },
    );

    themeVersionOptionsCache.set(key, fn);
  }

  return fn();
}

async function loadStoreSettingsMapRaw(
  storeId: string,
): Promise<StoreSettingsMap> {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,created_at,updated_at")
    .eq("store_id", storeId)
     .in("slug", [
      "profile",
      "store.profile",
      "store.support",
      "store.social",
      "store.app",
      "rating_settings",
      "store.rating_settings",
      "rating.settings",
    ])
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

    if (error || !Array.isArray(data)) {
    return {
      profile: {},
      support: {},
      social: {},
      app: {},
       pwa: {},
      ratingSettings: {},
    };
  }

  const bySlug = new Map<string, any>();

  for (const row of data) {
    const slug = s(row?.slug);
    if (!slug) continue;
    if (bySlug.has(slug)) continue;
    bySlug.set(slug, safeObject(row?.value));
  }

  return {
    profile: safeObject(bySlug.get("profile") ?? bySlug.get("store.profile")),
    support: safeObject(bySlug.get("store.support")),
    social: safeObject(bySlug.get("store.social")),
    app: safeObject(bySlug.get("store.app")),
    pwa: safeObject(bySlug.get("app/pwa")),
        ratingSettings: safeObject(
      bySlug.get("rating_settings") ??
        bySlug.get("store.rating_settings") ??
        bySlug.get("rating.settings"),
    ),
  };
}

const storeSettingsMapCache = new Map<string, () => Promise<StoreSettingsMap>>();

function loadStoreSettingsMap(storeId: string): Promise<StoreSettingsMap> {
  const key = `store-settings-map:${storeId}`;

  let fn = storeSettingsMapCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadStoreSettingsMapRaw(storeId),
      ["malak-store-settings-map", storeId],
      { revalidate: 60 },
    );

    storeSettingsMapCache.set(key, fn);
  }

  return fn();
}

async function loadStoreCurrenciesRaw(
  storeId: string,
): Promise<StoreCurrencyRow[]> {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_currencies")
    .select(
      "currency_code,name_ar,name_en,symbol,decimal_digits,is_enabled,is_default,sort_order,metadata,created_at,updated_at",
    )
    .eq("store_id", storeId)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data)) return [];

  return data as StoreCurrencyRow[];
}

const storeCurrenciesCache = new Map<
  string,
  () => Promise<StoreCurrencyRow[]>
>();

function loadStoreCurrencies(storeId: string): Promise<StoreCurrencyRow[]> {
  const key = `store-currencies:${storeId}`;

  let fn = storeCurrenciesCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadStoreCurrenciesRaw(storeId),
      ["malak-store-currencies", storeId],
      { revalidate: 60 },
    );

    storeCurrenciesCache.set(key, fn);
  }

  return fn();
}

async function loadFooterPagesRaw(storeId: string): Promise<FooterPageRow[]> {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_pages")
    .select("id,title,seo_slug,sort_order,created_at")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("show_in_footer", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row: any) => ({
      id: s(row?.id),
      title: s(row?.title),
      seo_slug: s(row?.seo_slug),
      sort_order: Number(row?.sort_order ?? 0),
    }))
    .filter((row) => row.id && row.title && row.seo_slug);
}

const footerPagesCache = new Map<string, () => Promise<FooterPageRow[]>>();

function loadFooterPages(storeId: string): Promise<FooterPageRow[]> {
  const key = `footer-pages:${storeId}`;

  let fn = footerPagesCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadFooterPagesRaw(storeId),
      ["malak-footer-pages", storeId],
      { revalidate: 60 },
    );

    footerPagesCache.set(key, fn);
  }

  return fn();
}

async function loadMegaMenuSettingsRaw(
  storeId: string,
): Promise<Record<string, any>> {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,created_at,updated_at")
    .eq("store_id", storeId)
    .eq("slug", MEGA_MENU_SETTING_SLUG)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      categories: {},
    };
  }

  return safeObject(data.value);
}

const megaMenuSettingsCache = new Map<
  string,
  () => Promise<Record<string, any>>
>();

function loadMegaMenuSettings(storeId: string): Promise<Record<string, any>> {
  const key = `mega-menu:${storeId}`;

  let fn = megaMenuSettingsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadMegaMenuSettingsRaw(storeId),
      ["malak-mega-menu", storeId],
      { revalidate: 60 },
    );

    megaMenuSettingsCache.set(key, fn);
  }

  return fn();
}

async function resolveCategoryHref(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  value: string;
  categoryHrefIndex?: CategoryHrefIndex;
}) {
  const value = s(args.value);
  if (!value) return "";

  const indexedHref = findCategoryHrefInIndex(args.categoryHrefIndex, value);
  if (indexedHref) return indexedHref;

  const sb: any = supabaseAdmin();

  let query = sb
    .from("categories")
    .select("id,name,slug,public_no,short_url")
    .eq("store_id", args.storeId)
    .limit(1);

  if (isUuid(value)) {
    query = query.eq("id", value);
  } else if (/^\d+$/.test(value)) {
    query = query.eq("public_no", Number(value));
  } else {
    query = query.eq("slug", value.replace(/^\/+/, ""));
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data?.id) {
    return normalizeInternalPath(value);
  }

  const publicNo = Number(data?.public_no ?? 0);
  const name = s(data?.name);

  return buildCategoryHref({
    mode: args.seoMode,
    slugNameAr: name,
    slugNameEn: s(data?.slug) || name,
    publicNo: Number.isFinite(publicNo) ? publicNo : 0,
    shortCode: s(data?.short_url) || null,
  });
}

async function resolveProductHref(args: {
  storeId: string;
  value: string;
  seoMode: SeoUrlMode;
}) {
  const value = s(args.value);
  if (!value) return "";

  const sb: any = supabaseAdmin();

  async function findProduct(selectColumns: string, withShortUrl: boolean) {
    if (isUuid(value)) {
      return await sb
        .from("products")
        .select(selectColumns)
        .eq("store_id", args.storeId)
        .eq("id", value)
        .limit(1)
        .maybeSingle();
    }

    if (/^\d+$/.test(value)) {
      return await sb
        .from("products")
        .select(selectColumns)
        .eq("store_id", args.storeId)
        .eq("public_no", Number(value))
        .limit(1)
        .maybeSingle();
    }

    if (withShortUrl) {
      const byShortUrl = await sb
        .from("products")
        .select(selectColumns)
        .eq("store_id", args.storeId)
        .eq("short_url", value.replace(/^\/+/, ""))
        .limit(1)
        .maybeSingle();

      if (!byShortUrl.error && byShortUrl.data?.id) {
        return byShortUrl;
      }
    }

    return await sb
      .from("products")
      .select(selectColumns)
      .eq("store_id", args.storeId)
      .ilike("name", value)
      .limit(1)
      .maybeSingle();
  }

  let result = await findProduct(
    "id,name,slug,seo_slug,public_no,short_url",
    true,
  );

  if (result.error) {
    result = await findProduct("id,name,public_no", false);
  }

  const data = result.data;

  if (result.error || !data?.id) {
    return normalizeInternalPath(value);
  }

  const publicNo = Number(data?.public_no ?? 0);
  const shortCode = s(data?.short_url).replace(/^\/+/, "");

  if (!shortCode && (!Number.isFinite(publicNo) || publicNo <= 0)) {
    return `/product/${data.id}`;
  }

  const slugAr = s(data?.seo_slug) || s(data?.slug) || s(data?.name);
  const slugEn = s(data?.slug) || s(data?.seo_slug) || s(data?.name);

  return buildStoreProductHref({
    mode: args.seoMode,
    slugNameAr: slugAr,
    slugNameEn: slugEn,
    publicNo: Number.isFinite(publicNo) ? publicNo : 0,
    shortCode: shortCode || null,
  });
}

async function resolveMegaMenuBannerHref(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  value: string;
  categoryHrefIndex?: CategoryHrefIndex;
}) {
  const value = s(args.value);
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  if (value.startsWith("/")) return value;

  if (isUuid(value) || /^\d+$/.test(value)) {
    return await resolveCategoryHref({
      storeId: args.storeId,
      seoMode: args.seoMode,
      value,
      categoryHrefIndex: args.categoryHrefIndex,
    });
  }

  if (value.includes(".")) {
    return normalizeExternalUrl(value);
  }

  return normalizeInternalPath(value);
}

async function normalizeMegaMenuValue(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  value: any;
  categories: MalakBootstrapCategory[];
  categoryHrefIndex?: CategoryHrefIndex;
}): Promise<MalakBootstrapMegaMenuValue> {
  const source = safeObject(args.value);
  const sourceCategories = safeObject(source.categories);

  const allowedRootIds = new Set(
    args.categories
      .filter((category) => !category.parent_id)
      .map((category) => String(category.id)),
  );

  const categories: Record<string, MalakBootstrapMegaMenuCategorySettings> = {};

  for (const [categoryId, rawSettings] of Object.entries(sourceCategories)) {
    const cleanCategoryId = s(categoryId);
    if (!cleanCategoryId) continue;
    if (allowedRootIds.size > 0 && !allowedRootIds.has(cleanCategoryId)) {
      continue;
    }

    const settings = safeObject(rawSettings);

    const layout =
      settings.layout === "links_with_banners"
        ? "links_with_banners"
        : "links_only";

    const rawBanners = Array.isArray(settings.banners) ? settings.banners : [];

    const banners: MalakBootstrapMegaMenuBanner[] = [];

    for (let index = 0; index < rawBanners.length; index += 1) {
      const rawBanner = rawBanners[index];

      const imageUrl = s((rawBanner as any)?.image_url);
      if (!imageUrl) continue;

      const rawHref = s((rawBanner as any)?.href);
      const href = await resolveMegaMenuBannerHref({
        storeId: args.storeId,
        seoMode: args.seoMode,
        value: rawHref,
        categoryHrefIndex: args.categoryHrefIndex,
      });

      banners.push({
        id:
          s((rawBanner as any)?.id) ||
          makeFallbackId(`mega-menu-${cleanCategoryId}`, index),
        title: s((rawBanner as any)?.title),
        image_url: imageUrl,
        href,
        sort_order: Number.isFinite(Number((rawBanner as any)?.sort_order))
          ? Number((rawBanner as any)?.sort_order)
          : index,
        is_enabled:
          typeof (rawBanner as any)?.is_enabled === "boolean"
            ? Boolean((rawBanner as any)?.is_enabled)
            : true,
      });
    }

    categories[cleanCategoryId] = {
      enabled: bool(settings.enabled, false),
      layout,
      banners: banners.sort(
        (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      ),
    };
  }

  return {
    categories,
  };
}

/* =========================
   Marketing Tools
   ========================= */

type MarketingLinkType =
  | "external"
  | "internal"
  | "product"
  | "category"
  | "page"
  | "";

function isMarketingLinkType(
  value: string,
): value is Exclude<MarketingLinkType, ""> {
  return (
    value === "external" ||
    value === "internal" ||
    value === "product" ||
    value === "category" ||
    value === "page"
  );
}

function readMarketingLink(row: Record<string, any>) {
  const link = safeObject(row.link);

  const rawType =
    s(link.type) ||
    s(row.link_type) ||
    s(row.linkType) ||
    s(row.target_type) ||
    s(row.targetType) ||
    s(row.url_type) ||
    s(row.urlType);

  const type: MarketingLinkType = isMarketingLinkType(rawType) ? rawType : "";

  const value =
    s(link.value) ||
    s(link.id) ||
    s(link.href) ||
    s(link.url) ||
    s(row.link_value) ||
    s(row.linkValue) ||
    s(row.target_value) ||
    s(row.targetValue) ||
    s(row.url_value) ||
    s(row.urlValue) ||
    s(row.value);

  const label =
    s(link.label) ||
    s(link.name) ||
    s(link.title) ||
    s(row.link_label) ||
    s(row.linkLabel) ||
    s(row.selected_label) ||
    s(row.selectedLabel) ||
    s(row.title) ||
    s(row.label) ||
    s(row.name);

  return {
    type,
    value,
    label,
  };
}

function readMarketingItemTitle(row: Record<string, any>) {
  const link = readMarketingLink(row);

  return (
    s(row.title) ||
    s(row.label) ||
    s(row.name) ||
    s(row.keyword) ||
    s(row.text) ||
    link.label
  );
}

function readMarketingItemSubtitle(row: Record<string, any>) {
  return s(row.subtitle) || s(row.description);
}

function readMarketingItemImage(row: Record<string, any>) {
  return (
    s(row.image_url) ||
    s(row.imageUrl) ||
    s(row.img) ||
    s(row.logo_url) ||
    s(row.logoUrl) ||
    s(row.image)
  );
}

function readMarketingDisplayType(row: Record<string, any>, linkType: string) {
  return (
    s(row.item_type) ||
    s(row.itemType) ||
    s(row.display_type) ||
    s(row.displayType) ||
    s(row.kind) ||
    s(row.type) ||
    (linkType === "product" ? "product" : "") ||
    (linkType === "category" ? "category" : "") ||
    "keyword"
  );
}

function readMarketingDirectHref(row: Record<string, any>) {
  return s(row.href) || s(row.url);
}

async function resolveMarketingItemHref(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  row: Record<string, any>;
  title: string;
  categoryHrefIndex?: CategoryHrefIndex;
}) {
  const link = readMarketingLink(args.row);
  const directHref = readMarketingDirectHref(args.row);

  if (link.type === "product") {
    return await resolveProductHref({
      storeId: args.storeId,
      seoMode: args.seoMode,
      value: link.value || directHref,
    });
  }

  if (link.type === "category") {
    return await resolveCategoryHref({
      storeId: args.storeId,
      seoMode: args.seoMode,
      value: link.value || directHref,
      categoryHrefIndex: args.categoryHrefIndex,
    });
  }

  if (link.type === "external") {
    return normalizeExternalUrl(link.value || directHref);
  }

  if (link.type === "internal") {
    return normalizeInternalPath(link.value || directHref);
  }

  if (link.type === "page") {
    const value = s(link.value || directHref);
    if (!value) return "";

    if (value.startsWith("/")) return value;
    return `/p/${value}`;
  }

  if (
    directHref.startsWith("http://") ||
    directHref.startsWith("https://") ||
    directHref.startsWith("mailto:") ||
    directHref.startsWith("tel:") ||
    directHref.startsWith("whatsapp:")
  ) {
    return directHref;
  }

  if (directHref.startsWith("/")) return directHref;

  if (directHref) return normalizeInternalPath(directHref);

  return normalizeSearchHref(args.title);
}

async function normalizeMarketingSearchItem(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  row: any;
  index: number;
  categoryHrefIndex?: CategoryHrefIndex;
}): Promise<MalakBootstrapMarketingSearchItem | null> {
  const row = safeObject(args.row);
  const link = readMarketingLink(row);

  const title = readMarketingItemTitle(row);
  const subtitle = readMarketingItemSubtitle(row);
  const imageUrl = readMarketingItemImage(row);
  const icon = s(row.icon) || s(row.icon_name) || s(row.iconName);
  const type = readMarketingDisplayType(row, link.type);

  if (!title && !imageUrl && !icon) return null;

  const href = await resolveMarketingItemHref({
    storeId: args.storeId,
    seoMode: args.seoMode,
    row,
    title,
    categoryHrefIndex: args.categoryHrefIndex,
  });

  if (!href) return null;

  const sortOrder = Number(row.sort_order ?? row.sortOrder ?? args.index);

  return {
    id: s(row.id) || makeFallbackId("marketing-search-item", args.index),
    title,
    label: s(row.label) || title,
    name: s(row.name),
    subtitle,
    description: s(row.description),
    href,
    url: href,
    image_url: imageUrl || null,
    imageUrl: imageUrl || null,
    img: imageUrl || null,
    logo_url: imageUrl || null,
    icon: icon || null,
    type,
    enabled: bool(row.enabled ?? row.is_enabled, true),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : args.index,
  };
}

async function normalizeMarketingSearchGroup(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  row: any;
  index: number;
  categoryHrefIndex?: CategoryHrefIndex;
}): Promise<MalakBootstrapMarketingSearchGroup | null> {
  const row = safeObject(args.row);
  const rawItems = Array.isArray(row.items) ? row.items : [];

  const items = (
    await Promise.all(
      rawItems.map((item, index) =>
        normalizeMarketingSearchItem({
          storeId: args.storeId,
          seoMode: args.seoMode,
          row: item,
          index,
          categoryHrefIndex: args.categoryHrefIndex,
        }),
      ),
    )
  )
    .filter(Boolean)
    .filter((item) => (item as MalakBootstrapMarketingSearchItem).enabled)
    .sort(
      (a, b) =>
        Number((a as MalakBootstrapMarketingSearchItem).sort_order ?? 0) -
        Number((b as MalakBootstrapMarketingSearchItem).sort_order ?? 0),
    ) as MalakBootstrapMarketingSearchItem[];

  if (!items.length) return null;

  const sortOrder = Number(row.sort_order ?? row.sortOrder ?? args.index);

  return {
    id: s(row.id) || makeFallbackId("marketing-search-group", args.index),
    title: s(row.title) || s(row.name) || "مجموعة بحث",
    name: s(row.name),
    description: s(row.description),
    style: s(row.style) || "chips",
    enabled: bool(row.enabled ?? row.is_enabled, true),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : args.index,
    items,
  };
}

async function buildLegacyMarketingSearchGroups(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  searchSource: Record<string, any>;
  categoryHrefIndex?: CategoryHrefIndex;
}) {
  const groups: MalakBootstrapMarketingSearchGroup[] = [];

  const popularSearches = Array.isArray(args.searchSource.popularSearches)
    ? args.searchSource.popularSearches
    : Array.isArray(args.searchSource.popular_searches)
      ? args.searchSource.popular_searches
      : [];

  const popularBrands = Array.isArray(args.searchSource.popularBrands)
    ? args.searchSource.popularBrands
    : Array.isArray(args.searchSource.popular_brands)
      ? args.searchSource.popular_brands
      : [];
  const showPopularSearches = bool(
    args.searchSource.showPopularSearches ??
      args.searchSource.show_popular_searches,
    popularSearches.length > 0,
  );

  const showPopularBrands = bool(
    args.searchSource.showPopularBrands ?? args.searchSource.show_popular_brands,
    popularBrands.length > 0,
  );

  if (showPopularSearches && popularSearches.length > 0) {
    const items = (
      await Promise.all(
        popularSearches.map((item: any, index: number) => {
          const row = {
            ...safeObject(item),
            title: s(item?.title) || s(item?.label),
            label: s(item?.label) || s(item?.title),
            item_type: "keyword",
          };

          return normalizeMarketingSearchItem({
            storeId: args.storeId,
            seoMode: args.seoMode,
            row,
            index,
            categoryHrefIndex: args.categoryHrefIndex,
          });
        }),
      )
    )
      .filter(Boolean)
      .filter((item) => (item as MalakBootstrapMarketingSearchItem).enabled)
      .sort(
        (a, b) =>
          Number((a as MalakBootstrapMarketingSearchItem).sort_order ?? 0) -
          Number((b as MalakBootstrapMarketingSearchItem).sort_order ?? 0),
      ) as MalakBootstrapMarketingSearchItem[];

    if (items.length) {
      groups.push({
        id: "popular-searches",
        title: s(args.searchSource.popularSearchesTitle) || "الأكثر بحثًا",
        name: "popular-searches",
        description: s(args.searchSource.popularSearchesDescription),
        style: s(args.searchSource.popularSearchesStyle) || "chips",
        enabled: true,
        sort_order: 10,
        items,
      });
    }
  }

  if (showPopularBrands && popularBrands.length > 0) {
    const items = (
      await Promise.all(
        popularBrands.map((item: any, index: number) => {
          const row = {
            ...safeObject(item),
            title: s(item?.title) || s(item?.name) || s(item?.label),
            label: s(item?.label) || s(item?.name) || s(item?.title),
            name: s(item?.name) || s(item?.label) || s(item?.title),
            image_url: s(item?.image_url) || s(item?.imageUrl) || s(item?.img),
            item_type: "brand",
          };

          return normalizeMarketingSearchItem({
            storeId: args.storeId,
            seoMode: args.seoMode,
            row,
            index,
            categoryHrefIndex: args.categoryHrefIndex,
          });
        }),
      )
    )
      .filter(Boolean)
      .filter((item) => (item as MalakBootstrapMarketingSearchItem).enabled)
      .sort(
        (a, b) =>
          Number((a as MalakBootstrapMarketingSearchItem).sort_order ?? 0) -
          Number((b as MalakBootstrapMarketingSearchItem).sort_order ?? 0),
      ) as MalakBootstrapMarketingSearchItem[];

    if (items.length) {
      groups.push({
        id: "popular-brands",
        title: s(args.searchSource.popularBrandsTitle) || "العلامات التجارية",
        name: "popular-brands",
        description: s(args.searchSource.popularBrandsDescription),
        style: s(args.searchSource.popularBrandsStyle) || "circles",
        enabled: true,
        sort_order: 20,
        items,
      });
    }
  }

  return groups;
}

async function normalizeMarketingValue(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  value: any;
  categoryHrefIndex?: CategoryHrefIndex;
}): Promise<MalakBootstrapMarketing> {
  const source = safeObject(args.value);
  const searchSource = safeObject(source.search);

  const hasSearchConfig = Object.keys(searchSource).length > 0;

  const groupsSource = Array.isArray(searchSource.groups)
    ? searchSource.groups
    : [];

  const groups = groupsSource.length
    ? (
        await Promise.all(
          groupsSource.map((group, index) =>
            normalizeMarketingSearchGroup({
              storeId: args.storeId,
              seoMode: args.seoMode,
              row: group,
              index,
              categoryHrefIndex: args.categoryHrefIndex,
            }),
          ),
        )
      )
        .filter(Boolean)
        .filter((group) => (group as MalakBootstrapMarketingSearchGroup).enabled)
        .sort(
          (a, b) =>
            Number((a as MalakBootstrapMarketingSearchGroup).sort_order ?? 0) -
            Number((b as MalakBootstrapMarketingSearchGroup).sort_order ?? 0),
        )
    : await buildLegacyMarketingSearchGroups({
        storeId: args.storeId,
        seoMode: args.seoMode,
        searchSource,
        categoryHrefIndex: args.categoryHrefIndex,
      });

  const cleanGroups = groups as MalakBootstrapMarketingSearchGroup[];

  return {
    search: {
      enabled: bool(
        searchSource.enabled,
        Boolean(hasSearchConfig && cleanGroups.length > 0),
      ),
      title: s(searchSource.title) || "أداة البحث",
      placeholder: s(searchSource.placeholder) || "مالذي تبحث عنه ؟",
      groups: cleanGroups,
    },
  };
}

async function resolveAnnouncementHref(args: {
  storeId: string;
  seoMode: SeoUrlMode;
  linkType: string;
  linkValue: string;
  oldLink?: string;
  categoryHrefIndex?: CategoryHrefIndex;
}) {
  const linkType = s(args.linkType);
  const linkValue = s(args.linkValue);
  const oldLink = s(args.oldLink);

  if (!linkType || linkType === "none" || linkType === "no_link") {
    return "";
  }

  if (linkType === "external") {
    return normalizeExternalUrl(linkValue || oldLink);
  }

  if (linkType === "internal") {
    return normalizeInternalPath(linkValue || oldLink);
  }

  if (linkType === "page") {
    const v = linkValue || oldLink;
    if (!v) return "";
    if (v.startsWith("/")) return v;
    return `/p/${v}`;
  }

  if (linkType === "discounts" || linkType === "offers") {
    return "/offers";
  }

  if (linkType === "category") {
    return await resolveCategoryHref({
      storeId: args.storeId,
      seoMode: args.seoMode,
      value: linkValue || oldLink,
      categoryHrefIndex: args.categoryHrefIndex,
    });
  }

  if (linkType === "product") {
    return await resolveProductHref({
      storeId: args.storeId,
      seoMode: args.seoMode,
      value: linkValue || oldLink,
    });
  }

  return normalizeInternalPath(linkValue || oldLink);
}

function buildHelpItems(support: Record<string, any>): MalakBootstrapHelpItem[] {
  const phone = s(support.phone);

  const whatsapp =
    s(support.whatsapp) ||
    s(support.whatsapp_pending) ||
    s(support.whatsapp_number) ||
    s(support.whatsapp_url);

  const telegram = s(support.telegram);
  const email = s(support.email);

  const phoneTitle = s(support.phone_title) || "الاتصال المباشر";
  const whatsappTitle = s(support.whatsapp_title) || "واتساب";
  const telegramTitle = s(support.telegram_title) || "تيليجرام";
  const emailTitle = s(support.email_title) || "البريد الإلكتروني";

  const phoneIcon = s(support.phone_icon) || "Phone01";
  const whatsappIcon = s(support.whatsapp_icon) || "Whatsapp";
  const telegramIcon = s(support.telegram_icon) || "Telegram";
  const emailIcon = s(support.email_icon) || "Mail01";

  const items: MalakBootstrapHelpItem[] = [];

  if (phone) {
    items.push({
      title: phoneTitle,
      value: phone,
      icon: phoneIcon,
      href: `tel:${phone.replace(/\s+/g, "")}`,
    });
  }

  if (whatsapp) {
    if (whatsapp.startsWith("http://") || whatsapp.startsWith("https://")) {
      items.push({
        title: whatsappTitle,
        value: whatsapp,
        icon: whatsappIcon,
        href: whatsapp,
      });
    } else {
      const clean = whatsapp.replace(/[^\d+]/g, "");
      const waNumber = clean.replace(/^\+/, "");

      if (waNumber) {
        items.push({
          title: whatsappTitle,
          value: whatsapp,
          icon: whatsappIcon,
          href: `https://wa.me/${waNumber}`,
        });
      }
    }
  }

  if (email) {
    items.push({
      title: emailTitle,
      value: email,
      icon: emailIcon,
      href: `mailto:${email}`,
    });
  }

  if (telegram) {
    items.push({
      title: telegramTitle,
      value: telegram,
      icon: telegramIcon,
      href: normalizeExternalUrl(
        telegram.startsWith("@")
          ? `https://t.me/${telegram.replace(/^@+/, "")}`
          : telegram,
      ),
    });
  }

  return items.filter((item) => item.title && item.value && item.href);
}

function buildSocials(social: Record<string, any>): MalakBootstrapSocial[] {
  const rows: Array<{
    key: string;
    labelKey: string;
    iconKey: string;
  }> = [
    { key: "instagram", labelKey: "instagram_label", iconKey: "instagram_icon" },
    { key: "x", labelKey: "x_label", iconKey: "x_icon" },
    { key: "snapchat", labelKey: "snapchat_label", iconKey: "snapchat_icon" },
    { key: "tiktok", labelKey: "tiktok_label", iconKey: "tiktok_icon" },
    { key: "youtube", labelKey: "youtube_label", iconKey: "youtube_icon" },
    { key: "facebook", labelKey: "facebook_label", iconKey: "facebook_icon" },
  ];

  return rows
    .map((row) => {
      const raw = s(social[row.key]);
      const href = normalizeSocialUrl(row.key, raw);

      if (!href) return null;

      return {
        label: s(social[row.labelKey]) || row.key,
        icon: s(social[row.iconKey]),
        href,
      };
    })
    .filter(Boolean) as MalakBootstrapSocial[];
}

function buildHelpCenterItem(
  footerSettings: Record<string, any>,
): MalakBootstrapHelpItem | null {
  const title = s(footerSettings.help_center_title);
  const url = s(footerSettings.help_center_url);
  const icon = s(footerSettings.help_center_icon) || "HelpCircle";

  if (!title || !url) return null;

  const href = normalizeExternalUrl(url);
  if (!href) return null;

  return {
    title,
    value: url,
    icon,
    href,
  };
}

function mergeHelpCenterIntoItems(args: {
  helpItems: MalakBootstrapHelpItem[];
  footerSettings: Record<string, any>;
}) {
  const helpCenter = buildHelpCenterItem(args.footerSettings);
  const items = Array.isArray(args.helpItems) ? [...args.helpItems] : [];

  if (!helpCenter) return items;

  const centerHref = s(helpCenter.href).toLowerCase();

  const exists = items.some((item) => {
    const title = s(item.title).toLowerCase();
    const href = s(item.href).toLowerCase();

    return (
      title.includes("مركز") ||
      title.includes("help") ||
      (centerHref && href === centerHref)
    );
  });

  if (!exists) items.push(helpCenter);

  return items;
}

function pageSlugFromRow(page: FooterPageRow) {
  const seoSlug = s(page.seo_slug);

  if (seoSlug) return seoSlug;

  const titleSlug = s(page.title)
    .toLowerCase()
    .replace(/[\\?#%]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/^-+|-+$/g, "");

  return titleSlug || page.id;
}

function buildFooterPageLinks(
  pages: FooterPageRow[],
): MalakBootstrapFooterLink[] {
  return pages.map((page, index) => {
    const slug = pageSlugFromRow(page);

    return {
      id: `store-page-${page.id}`,
      label: page.title,
      href: `/p/${slug}`,
      group: "store_pages",
      sort_order: Number(page.sort_order ?? (index + 1) * 10),
    };
  });
}

function isOldManualStorePageLink(item: MalakBootstrapFooterLink) {
  const label = s(item.label);
  const href = s(item.href).toLowerCase();
  const group = s(item.group);

  if (group === "store_pages") return true;

  const oldManualHrefs = new Set([
    "/company",
    "/careers",
    "/terms",
    "/returns",
    "/privacy",
  ]);

  const oldManualLabels = new Set([
    "موقع الشركة",
    "الوظائف",
    "الشروط والأحكام",
    "سياسة الإستبدال والإسترجاع",
    "سياسة الاستبدال والاسترجاع",
    "الخصوصية",
  ]);

  if (oldManualHrefs.has(href)) return true;
  if (oldManualLabels.has(label)) return true;

  return false;
}

function cleanOldManualStorePageLinks(items: MalakBootstrapFooterLink[]) {
  return items.filter((item) => !isOldManualStorePageLink(item));
}

function injectFooterPagesUnderBlog(args: {
  columns: {
    title: string;
    items: MalakBootstrapFooterLink[];
  }[];
  pages: FooterPageRow[];
  storeName: string;
}) {
  const pageLinks = buildFooterPageLinks(args.pages);

  const columns = args.columns.map((column) => ({
    ...column,
    items: Array.isArray(column.items) ? [...column.items] : [],
  }));

  const storeName = s(args.storeName);

  let storeColumnIndex = columns.findIndex((column) => {
    return s(column.title) === storeName;
  });

  if (storeColumnIndex < 0) {
    storeColumnIndex = columns.findIndex((column) =>
      column.items.some((item) => {
        return s(item.label) === "المدونة" || s(item.href) === "/blog";
      }),
    );
  }

  if (storeColumnIndex < 0) return columns;

  const target = columns[storeColumnIndex];
  const cleanItems = cleanOldManualStorePageLinks(target.items);

  const blogIndex = cleanItems.findIndex((item) => {
    return s(item.label) === "المدونة" || s(item.href) === "/blog";
  });

  if (blogIndex >= 0) {
    target.items = [
      ...cleanItems.slice(0, blogIndex + 1),
      ...pageLinks,
      ...cleanItems.slice(blogIndex + 1),
    ];
  } else {
    target.items = [...pageLinks, ...cleanItems];
  }

  columns[storeColumnIndex] = target;

  return columns;
}

function mergeFooterColumns(args: {
  baseColumns: {
    title: string;
    items: MalakBootstrapFooterLink[];
  }[];
  categories: MalakBootstrapCategory[];
  footerSettings: Record<string, any>;
}) {
  const columnsFromSettings = args.footerSettings.columns;

  if (Array.isArray(columnsFromSettings)) {
    return columnsFromSettings
      .map((column: any, columnIndex: number) => {
        const title = s(column?.title);

        const items = Array.isArray(column?.items)
          ? column.items
              .map((item: any, itemIndex: number) => ({
                id:
                  s(item?.id) ||
                  `footer-link-${columnIndex + 1}-${itemIndex + 1}`,
                label: s(item?.label),
                href: normalizeInternalPath(s(item?.href)),
                group: s(item?.group) || null,
                sort_order: Number(item?.sort_order ?? (itemIndex + 1) * 10),
              }))
              .filter(
                (item: MalakBootstrapFooterLink) => item.label && item.href,
              )
          : [];

        return {
          title,
          items,
        };
      })
      .filter((column: { title: string; items: MalakBootstrapFooterLink[] }) => {
        return column.title || column.items.length > 0;
      });
  }

  const categoryItems: MalakBootstrapFooterLink[] = args.categories
    .slice(0, 8)
    .map((category, index) => ({
      id: category.id,
      label: category.name,
      href: category.href,
      group: "categories",
      sort_order: (index + 1) * 10,
    }));

  const base = Array.isArray(args.baseColumns) ? args.baseColumns : [];

  if (!categoryItems.length) return base;

  const categoryColumnTitle = s(args.footerSettings.categories_column_title);

  if (!categoryColumnTitle) return base;

  const withoutOldCategories = base.filter(
    (column) => s(column.title) !== categoryColumnTitle,
  );

  return [
    {
      title: categoryColumnTitle,
      items: categoryItems,
    },
    ...withoutOldCategories,
  ];
}

/* =========================
   Cached bootstrap stable parts
   ========================= */

const categoriesTreeCache = new Map<string, () => Promise<unknown>>();

function loadMalakCategoriesTree(storeId: string) {
  const key = `malak-categories-tree:${storeId}:depth-3`;

  let fn = categoriesTreeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getCategoriesTree({
          store_id: storeId,
          max_depth: 3,
        }),
      ["malak-categories-tree", storeId, "depth-3"],
      { revalidate: 60 },
    );

    categoriesTreeCache.set(key, fn);
  }

  return fn();
}

export async function getMalakBootstrap(input: {
  store: StoreInput;
  seoMode: SeoUrlMode;
  themeOptions?: Record<string, any> | null;
  version_id?: string | null;
}): Promise<MalakBootstrap> {
  const base = createDefaultMalakBootstrap({
    store: input.store,
    seoMode: input.seoMode,
  });

  const providedThemeOptions = input.themeOptions
    ? safeObject(input.themeOptions)
    : null;

  const themeOptionsPromise = providedThemeOptions
    ? Promise.resolve(providedThemeOptions)
    : loadThemeVersionOptions({
        storeId: input.store.id,
        versionId: input.version_id,
      }).then(async (versionOptions) => {
        if (Object.keys(versionOptions).length > 0) return versionOptions;

        return await loadActiveThemeOptions(input.store.id);
      });

  const mainInfoPromise = loadThemeVersionMainInfo({
    storeId: input.store.id,
    versionId: input.version_id,
  });

  const currencyCookieName = makeCurrencyCookieName(input.store.id);
  const selectedCurrencyPromise = readCookieValue(currencyCookieName);

  const [
    categoriesTree,
    storeSettings,
    resolvedThemeOptions,
    resolvedMainInfo,
    footerPages,
    megaMenuRaw,
    currencyRows,
    selectedCurrencyCode,
    storeTax,
  ] = await Promise.all([
    loadMalakCategoriesTree(input.store.id),
    loadStoreSettingsMap(input.store.id),
    themeOptionsPromise,
    mainInfoPromise,
    loadFooterPages(input.store.id),
    loadMegaMenuSettings(input.store.id),
    loadStoreCurrencies(input.store.id),
    selectedCurrencyPromise,
    loadStoreTax(input.store.id),
  ]);

  const normalizedCategories = normalizeCategoriesTree(
    categoriesTree,
    input.seoMode,
  );

  const categoryHrefIndex = createCategoryHrefIndex(normalizedCategories);

  const normalizedMegaMenu = await normalizeMegaMenuValue({
    storeId: input.store.id,
    seoMode: input.seoMode,
    value: megaMenuRaw,
    categories: normalizedCategories,
    categoryHrefIndex,
  });

  const themeOptions = safeObject(resolvedThemeOptions);
  const mainInfo = safeObject(resolvedMainInfo);

  const mainPrimaryColor =
    s(mainInfo.primary_color) ||
    s(mainInfo.primaryColor) ||
    themeOptionText(themeOptions, "primary_color", "#000000");

  const mainFont =
    s(mainInfo.font) ||
    s(mainInfo.font_family) ||
    s(mainInfo.fontFamily) ||
    themeOptionText(themeOptions, "font", "tajawal");

  const currencies = normalizeStoreCurrencies({
    storeId: input.store.id,
    rows: currencyRows,
    storeDefaultCurrency: input.store.default_currency,
    selectedCurrencyCode,
  });

  const normalizedMarketing = await normalizeMarketingValue({
    storeId: input.store.id,
    seoMode: input.seoMode,
    value: themeOptions.marketing,
    categoryHrefIndex,
  });

  const headerAndFooter = safeObject(themeOptions.header_and_footer);

  const headerSettings = safeObject(headerAndFooter.header);
  const announcementSettings = safeObject(headerAndFooter.announcement);
  const footerSettings = safeObject(headerAndFooter.footer);
  const businessCertificateSettings = safeObject(
    headerAndFooter.business_certificate,
  );

  const profile = storeSettings.profile;
  const support = storeSettings.support;
  const social = storeSettings.social;
  const app = storeSettings.app;
  const ratingSettings = normalizeRatingSettings(
    storeSettings.ratingSettings,
    base.ratingSettings,
  );

  const profileLogoUrl = s(profile.logo_url);
  const profileFaviconUrl = s(profile.favicon_url);
  const profileDescription = s(profile.description);

  const finalLogoUrl =
    profileLogoUrl || s(input.store.logo_url) || base.store.logo_url || null;

  const finalFaviconUrl =
    profileFaviconUrl ||
    s(input.store.favicon_url) ||
    base.store.favicon_url ||
    null;

  const sloganEnabled = bool(headerSettings.slogan_enabled, false);
  const sloganText = s(headerSettings.slogan_text);
  const sloganIcon =
    s(headerSettings.slogan_icon) ||
    s(headerSettings.slogan_icon_name) ||
    "StarAward01";

  const announcementLinkType =
    s(announcementSettings.link_type) ||
    (s(announcementSettings.link) ? "internal" : "no_link");

  const announcementHref = await resolveAnnouncementHref({
    storeId: input.store.id,
    seoMode: input.seoMode,
    linkType: announcementLinkType,
    linkValue: s(announcementSettings.link_value),
    oldLink: s(announcementSettings.link),
    categoryHrefIndex,
  });

  const helpTitle = s(footerSettings.help_title);
  const helpSubtitle = s(footerSettings.help_subtitle);
  const helpCenterTitle = s(footerSettings.help_center_title);
  const helpCenterUrl = s(footerSettings.help_center_url);
  const helpBackgroundColor = s(footerSettings.help_background_color);
  const helpTextColor = s(footerSettings.help_text_color);
  const copyrightText = s(footerSettings.copyright_text);

  const helpItems = mergeHelpCenterIntoItems({
    helpItems: buildHelpItems(support),
    footerSettings,
  });

  const socials = buildSocials(social);

  const baseColumnsWithCategories = mergeFooterColumns({
    baseColumns: base.footer.columns,
    categories: normalizedCategories,
    footerSettings,
  });

  const finalColumns = injectFooterPagesUnderBlog({
    columns: baseColumnsWithCategories,
    pages: footerPages,
    storeName: input.store.name,
  });

  const footerStorePages = buildFooterPageLinks(footerPages);

  const appearance = {
    primary_color: mainPrimaryColor,
    brand_color: mainPrimaryColor,
    accent_color: mainPrimaryColor,

    font: mainFont,
    font_family: mainFont,

    arabic_numbers: themeOptionBool(themeOptions, "arabic_numbers", false),
    content_copyright: themeOptionBool(
      themeOptions,
      "content_copyright",
      false,
    ),
    display_copyright: themeOptionBool(
      themeOptions,
      "display_copyright",
      false,
    ),
    is_breadcrumbs: themeOptionBool(themeOptions, "is_breadcrumbs", true),
    is_equal_cart_height: themeOptionBool(
      themeOptions,
      "is_equal_cart_height",
      true,
    ),
    equal_cart_height_type: themeOptionText(
      themeOptions,
      "equal_cart_height_type",
      "full",
    ),

    trans_header: themeOptionBool(themeOptions, "trans_header", false),
    slider_has_overlay: themeOptionBool(
      themeOptions,
      "slider_has_overlay",
      true,
    ),
    reversed_logo: themeOptionText(themeOptions, "reversed_logo", ""),
    show_reversed_logo: themeOptionBool(
      themeOptions,
      "show_reversed_logo",
      true,
    ),
    show_reversed_logo_in_footer: themeOptionBool(
      themeOptions,
      "show_reversed_logo_in_footer",
      true,
    ),
    show_original_logo_on_scroll: themeOptionBool(
      themeOptions,
      "show_original_logo_on_scroll",
      true,
    ),
    animate_blocks: themeOptionBool(themeOptions, "animate_blocks", false),
    enable_second_reviews: themeOptionBool(
      themeOptions,
      "enable_second_reviews",
      true,
    ),
    enhanced_products_slider: themeOptionBool(
      themeOptions,
      "enhanced_products_slider",
      true,
    ),
    hide_products_slider_controls: themeOptionBool(
      themeOptions,
      "hide_products_slider_controls",
      false,
    ),
    enhanced_blocks_titles: themeOptionBool(
      themeOptions,
      "enhanced_blocks_titles",
      true,
    ),
    mobile_small_blocks_titles: themeOptionBool(
      themeOptions,
      "mobile_small_blocks_titles",
      true,
    ),
    disable_right_click: themeOptionBool(
      themeOptions,
      "disable_right_click",
      false,
    ),
    is_more_button_enabled: themeOptionBool(
      themeOptions,
      "is_more_button_enabled",
      true,
    ),

    product_image_height: themeOptionNumber(
      themeOptions,
      "product_image_height",
      30,
      5,
      30,
    ),
    products_per_row: themeOptionNumber(
      themeOptions,
      "products_per_row",
      4,
      2,
      8,
    ),
    enable_switch_image_on_hover: themeOptionBool(
      themeOptions,
      "enable_switch_image_on_hover",
      false,
    ),
    productcard_options: themeOptionBool(
      themeOptions,
      "productcard_options",
      false,
    ),
    hover_style: themeOptionText(
      themeOptions,
      "hover_style",
      "on_image_hover",
    ),
    fit_slider_products: themeOptionBool(
      themeOptions,
      "fit_slider_products",
      true,
    ),
    disable_products_lazyload: themeOptionBool(
      themeOptions,
      "disable_products_lazyload",
      false,
    ),
    show_normal_countdown: themeOptionBool(
      themeOptions,
      "show_normal_countdown",
      false,
    ),
    enable_shine_animation: themeOptionBool(
      themeOptions,
      "enable_shine_animation",
      false,
    ),
    enable_zoom_animation: themeOptionBool(
      themeOptions,
      "enable_zoom_animation",
      true,
    ),
    mobile_mini_products: themeOptionBool(
      themeOptions,
      "mobile_mini_products",
      true,
    ),
    one_line_name: themeOptionBool(themeOptions, "one_line_name", true),
    show_subtitle_on_mini: themeOptionBool(
      themeOptions,
      "show_subtitle_on_mini",
      false,
    ),
    mini_top_promotion: themeOptionBool(
      themeOptions,
      "mini_top_promotion",
      false,
    ),
    free_images_height: themeOptionBool(
      themeOptions,
      "free_images_height",
      false,
    ),
    enhanced_add_btn_in_mobile: themeOptionBool(
      themeOptions,
      "enhanced_add_btn_in_mobile",
      true,
    ),
    enhanced_add_btn_bg: themeOptionText(
      themeOptions,
      "enhanced_add_btn_bg",
      "#d5c4a8",
    ),
    enhanced_add_btn_color: themeOptionText(
      themeOptions,
      "enhanced_add_btn_color",
      "#000000",
    ),
    hide_quickview_on_mobile: themeOptionBool(
      themeOptions,
      "hide_quickview_on_mobile",
      false,
    ),
    auto_play_products_slider: themeOptionBool(
      themeOptions,
      "auto_play_products_slider",
      true,
    ),
    vertical_fixed_products: themeOptionBool(
      themeOptions,
      "vertical_fixed_products",
      true,
    ),
    rounded_cards: themeOptionBool(themeOptions, "rounded_cards", true),
    show_discount: themeOptionBool(themeOptions, "show_discount", false),
    show_rating: themeOptionBool(themeOptions, "show_rating", true),
    show_rating_count: themeOptionBool(
      themeOptions,
      "show_rating_count",
      false,
    ),
    disable_out_products: themeOptionBool(
      themeOptions,
      "disable_out_products",
      false,
    ),
    products_has_border: themeOptionBool(
      themeOptions,
      "products_has_border",
      true,
    ),
    product_border_color: themeOptionText(
      themeOptions,
      "product_border_color",
      "#d5c4a8",
    ),
    primary_product_buttons: themeOptionBool(
      themeOptions,
      "primary_product_buttons",
      true,
    ),

    dark_mode_switcher: themeOptionBool(
      themeOptions,
      "dark_mode_switcher",
      false,
    ),
    dark_mode: themeOptionBool(themeOptions, "dark_mode", false),

    store_bg: themeOptionText(themeOptions, "store_bg", "#ffffff"),
    store_bg_secondary: themeOptionText(
      themeOptions,
      "store_bg_secondary",
      "#ffffff",
    ),
    store_text_color: themeOptionText(
      themeOptions,
      "store_text_color",
      "#000000",
    ),
    store_text_color_secondary: themeOptionText(
      themeOptions,
      "store_text_color_secondary",
      "#292929",
    ),
    header_bg: themeOptionText(themeOptions, "header_bg", "#ffffff"),
    header_text_color: themeOptionText(
      themeOptions,
      "header_text_color",
      "#000000",
    ),
    product_bg: themeOptionText(themeOptions, "product_bg", "#ffffff"),
    product_promo_bg: themeOptionText(
      themeOptions,
      "product_promo_bg",
      "#000000",
    ),

    store_bg_dark: themeOptionText(themeOptions, "store_bg_dark", "#111111"),
    store_bg_secondary_dark: themeOptionText(
      themeOptions,
      "store_bg_secondary_dark",
      "#181818",
    ),
    store_text_color_dark: themeOptionText(
      themeOptions,
      "store_text_color_dark",
      "#ffffff",
    ),
    store_text_color_secondary_dark: themeOptionText(
      themeOptions,
      "store_text_color_secondary_dark",
      "#d4d4d4",
    ),
    header_bg_dark: themeOptionText(
      themeOptions,
      "header_bg_dark",
      "#111111",
    ),
    header_text_color_dark: themeOptionText(
      themeOptions,
      "header_text_color_dark",
      "#ffffff",
    ),
    footer_bg_dark: themeOptionText(
      themeOptions,
      "footer_bg_dark",
      "#111111",
    ),
    footer_text_color_dark: themeOptionText(
      themeOptions,
      "footer_text_color_dark",
      "#ffffff",
    ),
    bottom_footer_bg_dark: themeOptionText(
      themeOptions,
      "bottom_footer_bg_dark",
      "#000000",
    ),
    product_bg_dark: themeOptionText(
      themeOptions,
      "product_bg_dark",
      "#111111",
    ),

    scroll_top_enabled: themeOptionBool(
      themeOptions,
      "scroll_top_enabled",
      true,
    ),
    scroll_top_position: themeOptionSide(
      themeOptions,
      "scroll_top_position",
      "left",
    ),

    wa_enabled: themeOptionBool(themeOptions, "wa_enabled", false),
    wa_number:
      themeOptionText(themeOptions, "wa_number", "") ||
      s(support.whatsapp) ||
      s(support.whatsapp_pending) ||
      s(support.whatsapp_number),
    wa_btn_bg: themeOptionText(themeOptions, "wa_btn_bg", "#22c55e"),
    wa_btn_text_color: themeOptionText(
      themeOptions,
      "wa_btn_text_color",
      "#ffffff",
    ),
    wa_btn_text: themeOptionText(themeOptions, "wa_btn_text", "تواصل معنا"),
    interactive_wa: themeOptionBool(themeOptions, "interactive_wa", false),
    wa_position: themeOptionSide(themeOptions, "wa_position", "right"),

    header_logo_width: themeOptionNumber(
      themeOptions,
      "header_logo_width",
      0,
      0,
      300,
    ),
    header_logo_height: themeOptionNumber(
      themeOptions,
      "header_logo_height",
      48,
      0,
      120,
    ),
    enable_desktop_sidemenu: themeOptionBool(
      themeOptions,
      "enable_desktop_sidemenu",
      false,
    ),
    centered_logo: themeOptionBool(themeOptions, "centered_logo", true),
    mobile_only_centered_logo: themeOptionBool(
      themeOptions,
      "mobile_only_centered_logo",
      true,
    ),
    header_is_sticky: themeOptionBool(
      themeOptions,
      "header_is_sticky",
      true,
    ),
    hide_topnav: themeOptionBool(themeOptions, "hide_topnav", false),
    hide_topnav_links: themeOptionBool(
      themeOptions,
      "hide_topnav_links",
      false,
    ),
    hide_topnav_contacts: themeOptionBool(
      themeOptions,
      "hide_topnav_contacts",
      false,
    ),
    topnav_is_dark: themeOptionBool(themeOptions, "topnav_is_dark", false),
    activate_default_menu: themeOptionBool(
      themeOptions,
      "activate_default_menu",
      true,
    ),

    footer_logo_width: themeOptionNumber(
      themeOptions,
      "footer_logo_width",
      0,
      0,
      300,
    ),
    footer_logo_height: themeOptionNumber(
      themeOptions,
      "footer_logo_height",
      64,
      0,
      120,
    ),
    enable_bottom_nav: themeOptionBool(
      themeOptions,
      "enable_bottom_nav",
      false,
    ),
    footer_is_dark: themeOptionBool(themeOptions, "footer_is_dark", false),
    footer_bg: themeOptionText(themeOptions, "footer_bg", "#3b3b3b"),
    footer_text_color: themeOptionText(
      themeOptions,
      "footer_text_color",
      "#ffffff",
    ),
    bottom_footer_bg: themeOptionText(
      themeOptions,
      "bottom_footer_bg",
      "#1c1c1c",
    ),
    show_basic_footer: themeOptionBool(
      themeOptions,
      "show_basic_footer",
      false,
    ),
    enhanced_links: themeOptionBool(themeOptions, "enhanced_links", true),
    links_with_bullits: themeOptionBool(
      themeOptions,
      "links_with_bullits",
      false,
    ),
    enhanced_social_icons: themeOptionBool(
      themeOptions,
      "enhanced_social_icons",
      true,
    ),
    rounded_contacts: themeOptionBool(
      themeOptions,
      "rounded_contacts",
      true,
    ),
    mini_sbc: themeOptionBool(themeOptions, "mini_sbc", false),
    footer_show_newsletter: themeOptionBool(
      themeOptions,
      "footer_show_newsletter",
      false,
    ),
    show_footer_logos: themeOptionBool(
      themeOptions,
      "show_footer_logos",
      false,
    ),
  };
  const pwa = normalizePwaSettings(storeSettings.pwa, {
    storeName: input.store.name,
    logoUrl: finalLogoUrl,
    faviconUrl: finalFaviconUrl,
    primaryColor: mainPrimaryColor,
    backgroundColor: appearance.store_bg || "#ffffff",
  });
  return {
    ...base,

    store: {
      ...base.store,
      id: input.store.id,
      slug: input.store.slug ?? base.store.slug ?? null,
      name: input.store.name,
      logo_url: finalLogoUrl,
      favicon_url: finalFaviconUrl,
      description: profileDescription || input.store.description || null,
    },

    seoMode: input.seoMode,

    currencies,

    tax: storeTax,
pwa,
    appearance,

    header: {
      ...base.header,

      logo_url: finalLogoUrl,
      logo_alt: input.store.name || base.header.logo_alt || "Logo",
      favicon_url: finalFaviconUrl,

      slogan: sloganEnabled && sloganText ? sloganText : null,
      slogan_icon: sloganIcon,
      show_slogan: sloganEnabled,

      show_search: bool(headerSettings.search_enabled, base.header.show_search),
      show_account: bool(headerSettings.show_account, base.header.show_account),
      show_cart: bool(headerSettings.show_cart, base.header.show_cart),
      show_categories: bool(
        headerSettings.show_categories,
        base.header.show_categories,
      ),

      background_color: appearance.header_bg,
      text_color: appearance.header_text_color,

      header_bg: appearance.header_bg,
      header_text_color: appearance.header_text_color,

      sticky_header: appearance.header_is_sticky,
      header_is_sticky: appearance.header_is_sticky,

      centered_logo: appearance.centered_logo,
      mobile_only_centered_logo: appearance.mobile_only_centered_logo,

      hide_topnav: appearance.hide_topnav,
      hide_topnav_links: appearance.hide_topnav_links,
      hide_topnav_contacts: appearance.hide_topnav_contacts,

      topnav_dark: appearance.topnav_is_dark,
      topnav_is_dark: appearance.topnav_is_dark,

      default_menu: appearance.activate_default_menu,
      activate_default_menu: appearance.activate_default_menu,

      desktop_sidemenu: appearance.enable_desktop_sidemenu,
      enable_desktop_sidemenu: appearance.enable_desktop_sidemenu,

      transparent_header: appearance.trans_header,
      trans_header: appearance.trans_header,

      slider_overlay: appearance.slider_has_overlay,
      slider_has_overlay: appearance.slider_has_overlay,

      logo_width: appearance.header_logo_width,
      logo_height: appearance.header_logo_height,
      header_logo_width: appearance.header_logo_width,
      header_logo_height: appearance.header_logo_height,

      reversed_logo: appearance.reversed_logo || null,
      show_reversed_logo: appearance.show_reversed_logo,
      show_reversed_logo_in_footer: appearance.show_reversed_logo_in_footer,
      show_original_logo_on_scroll: appearance.show_original_logo_on_scroll,
    },

    announcement: {
      enabled: Boolean(
        bool(announcementSettings.enabled, false) &&
          (s(announcementSettings.title) ||
            s(announcementSettings.content) ||
            s(announcementSettings.text)),
      ),
      icon: s(announcementSettings.icon) || null,
      title: s(announcementSettings.title),
      content: s(announcementSettings.content) || s(announcementSettings.text),
      text: s(announcementSettings.text) || s(announcementSettings.content),
      href: announcementHref,
      link_type: announcementLinkType,
      link_value: s(announcementSettings.link_value),
      link_label: s(announcementSettings.link_label),
      ends_at: s(announcementSettings.ends_at) || null,
      pages: s(announcementSettings.pages),
      text_color: s(announcementSettings.text_color),
      background_color: s(announcementSettings.background_color),
    },

    navigation: {
      categories: normalizedCategories,
      mega_menu: normalizedMegaMenu,
    },

    marketing: normalizedMarketing,
    ratingSettings,
    product: {
      options: {
        show_singleSelection: themeOptionBool(
          themeOptions,
          "show_singleSelection",
          base.product?.options.show_singleSelection ?? false,
        ),
        show_multipleOption: themeOptionBool(
          themeOptions,
          "show_multipleOption",
          base.product?.options.show_multipleOption ?? false,
        ),

        enable_add_product_toast: themeOptionBool(
          themeOptions,
          "enable_add_product_toast",
          base.product?.options.enable_add_product_toast ?? true,
        ),

        activate_zoom: themeOptionBool(
          themeOptions,
          "activate_zoom",
          base.product?.options.activate_zoom ?? false,
        ),

        enhanced_brand_senction: themeOptionBool(
          themeOptions,
          "enhanced_brand_senction",
          base.product?.options.enhanced_brand_senction ?? false,
        ),

        thumbs_bottom: themeOptionBool(
          themeOptions,
          "thumbs_bottom",
          base.product?.options.thumbs_bottom ?? true,
        ),
        disable_thumbs_in_mobile: themeOptionBool(
          themeOptions,
          "disable_thumbs_in_mobile",
          base.product?.options.disable_thumbs_in_mobile ?? false,
        ),

        show_payments_in_product_single: themeOptionBool(
          themeOptions,
          "show_payments_in_product_single",
          base.product?.options.show_payments_in_product_single ?? true,
        ),
        show_category_in_product_single: themeOptionBool(
          themeOptions,
          "show_category_in_product_single",
          base.product?.options.show_category_in_product_single ?? false,
        ),

        hide_ratings: themeOptionBool(
          themeOptions,
          "hide_ratings",
          base.product?.options.hide_ratings ?? false,
        ),

        replace_slider_text: themeOptionBool(
          themeOptions,
          "replace_slider_text",
          base.product?.options.replace_slider_text ?? true,
        ),

        hide_countdown: themeOptionBool(
          themeOptions,
          "hide_countdown",
          base.product?.options.hide_countdown ?? false,
        ),
        show_discounted_amount: themeOptionBool(
          themeOptions,
          "show_discounted_amount",
          base.product?.options.show_discounted_amount ?? true,
        ),

        update_both_prices: themeOptionBool(
          themeOptions,
          "update_both_prices",
          base.product?.options.update_both_prices ?? false,
        ),
        hide_top_price: themeOptionBool(
          themeOptions,
          "hide_top_price",
          base.product?.options.hide_top_price ?? false,
        ),

        top_details_tabs: themeOptionBool(
          themeOptions,
          "top_details_tabs",
          base.product?.options.top_details_tabs ?? true,
        ),
        mini_offers_box: themeOptionBool(
          themeOptions,
          "mini_offers_box",
          base.product?.options.mini_offers_box ?? true,
        ),

        show_product_features: themeOptionBool(
          themeOptions,
          "show_product_features",
          base.product?.options.show_product_features ?? false,
        ),
        show_sidebar: themeOptionBool(
          themeOptions,
          "show_sidebar",
          base.product?.options.show_sidebar ?? false,
        ),

        show_sticky_product: themeOptionBool(
          themeOptions,
          "show_sticky_product",
          base.product?.options.show_sticky_product ?? true,
        ),
        sticky_add_to_cart: themeOptionBool(
          themeOptions,
          "sticky_add_to_cart",
          base.product?.options.sticky_add_to_cart ?? true,
        ),

        show_tags: themeOptionBool(
          themeOptions,
          "show_tags",
          base.product?.options.show_tags ?? true,
        ),

        slider_background_size: themeOptionSliderBackgroundSize(
          themeOptions,
          "slider_background_size",
          base.product?.options.slider_background_size ?? "cover",
        ),
      },
    },

    footer: {
      ...base.footer,

      enabled: bool(footerSettings.enabled, base.footer.enabled),

      help: {
        title: helpTitle,
        subtitle: helpSubtitle,
        center_title: helpCenterTitle,
        center_url: helpCenterUrl,
        background_color: helpBackgroundColor,
        text_color: helpTextColor,
      },

      help_title: helpTitle,
      help_subtitle: helpSubtitle,
      help_center_title: helpCenterTitle,
      help_center_url: helpCenterUrl,
      help_background_color: helpBackgroundColor,
      help_text_color: helpTextColor,

      help_items: helpItems,

      columns: finalColumns,

      store_pages: footerStorePages,

      floating_actions: {
        scroll_top_enabled: appearance.scroll_top_enabled,
        scroll_top_position: appearance.scroll_top_position,

        wa_enabled: Boolean(appearance.wa_enabled && s(appearance.wa_number)),
        wa_number: s(appearance.wa_number),
        wa_btn_bg: appearance.wa_btn_bg,
        wa_btn_text_color: appearance.wa_btn_text_color,
        wa_btn_text: appearance.wa_btn_text,
        interactive_wa: appearance.interactive_wa,
        wa_position: appearance.wa_position,

        phone_btn_enabled: themeOptionBool(
          themeOptions,
          "phone_btn_enabled",
          false,
        ),
        phone_number:
          themeOptionText(themeOptions, "phone_btn_number", "") ||
          themeOptionText(themeOptions, "phone_number", "") ||
          s(support.phone),
        phone_position: themeOptionSide(
          themeOptions,
          "phone_position",
          appearance.wa_position,
        ),
      },

      options: {
        footer_logo_width: appearance.footer_logo_width,
        footer_logo_height: appearance.footer_logo_height,

        enable_bottom_nav: appearance.enable_bottom_nav,

        footer_is_dark: appearance.footer_is_dark,
        footer_bg: appearance.footer_bg,
        footer_text_color: appearance.footer_text_color,
        bottom_footer_bg: appearance.bottom_footer_bg,

        show_basic_footer: appearance.show_basic_footer,

        enhanced_links: appearance.enhanced_links,
        links_with_bullits: appearance.links_with_bullits,

        enhanced_social_icons: appearance.enhanced_social_icons,
        rounded_contacts: appearance.rounded_contacts,

        mini_sbc: appearance.mini_sbc,

        footer_show_newsletter: appearance.footer_show_newsletter,
        show_footer_logos: appearance.show_footer_logos,
      },

      socials: bool(footerSettings.show_social, true) ? socials : [],

      app: {
        ios: s(app.ios),
        android: s(app.android),
      },

      business_certificate: {
        enabled: bool(businessCertificateSettings.enabled, false),
        title: s(businessCertificateSettings.title),
        image_url: s(businessCertificateSettings.image_url),
        link: normalizeExternalUrl(s(businessCertificateSettings.link)),
      },

      payments: bool(footerSettings.show_payments, true)
        ? base.footer.payments
        : [],

      copyright: copyrightText || null,
      copyright_text: copyrightText || null,

      commercial_register: s(footerSettings.commercial_register) || null,
      tax_number:
        storeTax.enabled &&
        storeTax.show_tax_number_in_footer &&
        storeTax.tax_number
          ? storeTax.tax_number
          : null,

      show_payments: bool(footerSettings.show_payments, true),
      show_apps: bool(footerSettings.show_apps, true),
      show_social: bool(footerSettings.show_social, true),
    },
  } as MalakBootstrap & {
    appearance: Record<string, any>;
  };
}