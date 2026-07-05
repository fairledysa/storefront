// FILE: apps/storefront/src/app/(store)/api/invoice/[token]/route.ts
// Public invoice download for the thank-you page.
// The route is deliberately protected by the unpredictable order public_token;
// it never accepts a numeric order id or order number.

import { ImageResponse } from "next/og";
import { createElement, type ReactElement, type ReactNode } from "react";
import { deflateSync, inflateSync } from "node:zlib";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DbRecord = Record<string, any>;
type InvoiceSettings = {
  issueMode: "elyaia" | "custom";
  customStoreTitle: string;
  showStoreTitle: boolean;
  showLogo: boolean;
  logoSize: number;
  logoPosition: "right" | "center" | "left";
  showStoreAddress: boolean;
  showProductImage: boolean;
  showProductDescription: boolean;
  showInvoiceBarcode: boolean;
  showProductBarcode: boolean;
  showSku: boolean;
  showGtin: boolean;
  showMpn: boolean;
  showZeroTaxFields: boolean;
  primaryFontWeight: "bold" | "normal";
  secondaryFontWeight: "bold" | "normal";
  textColor: string;
  watermarkUrl: string;
  watermarkOpacity: number;
  stampUrl: string;
  stampOpacity: number;
  stampPosition: "bottom-right" | "bottom-center" | "bottom-left";
  footerText: string;
};

type InvoiceItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  description: string;
  sku: string;
  gtin: string;
  mpn: string;
  barcode: string;
  imageUrl: string;
};

type InvoiceModel = {
  store: {
    name: string;
    logoUrl: string;
    address: string;
    email: string;
    phone: string;
    taxNumber: string;
    taxLabel: string;
  };
  order: {
    invoiceNo: string;
    orderNo: string;
    publicNo: string;
    createdAt: string;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    shippingCarrier: string;
    shippingAddress: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    subtotal: number;
    shipping: number;
    discount: number;
    tax: number;
    total: number;
  };
  items: InvoiceItem[];
  settings: InvoiceSettings;
};

type PngPage = {
  width: number;
  height: number;
  rgb: Buffer;
};

const SETTINGS_SLUG = "invoice_settings";
const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PDF_WIDTH = 595.28;
const PDF_HEIGHT = 841.89;
const FONT_URLS = [
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf",
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf",
];

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  issueMode: "elyaia",
  customStoreTitle: "",
  showStoreTitle: true,
  showLogo: true,
  logoSize: 32,
  logoPosition: "center",
  showStoreAddress: true,
  showProductImage: false,
  showProductDescription: true,
  showInvoiceBarcode: false,
  showProductBarcode: false,
  showSku: true,
  showGtin: false,
  showMpn: false,
  showZeroTaxFields: false,
  primaryFontWeight: "bold",
  secondaryFontWeight: "normal",
  textColor: "#111827",
  watermarkUrl: "",
  watermarkOpacity: 20,
  stampUrl: "",
  stampOpacity: 35,
  stampPosition: "bottom-right",
  footerText: "شكراً لتسوقك من متجرنا، نتمنى لك يوماً رائعاً.",
};

let arabicFontPromise: Promise<ArrayBuffer> | null = null;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: unknown) {
  return Math.round(n(value) * 100) / 100;
}

function safeObject(value: unknown): DbRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as DbRecord;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as DbRecord;
      }
    } catch {}
  }

  return {};
}

function safeArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = n(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const text = s(value) as T;
  return allowed.includes(text) ? text : fallback;
}

function normalizeInvoiceSettings(value: unknown): InvoiceSettings {
  const raw = safeObject(value);
  const issueMode = s(raw.issueMode);

  return {
    issueMode: issueMode === "custom" ? "custom" : "elyaia",
    customStoreTitle: s(raw.customStoreTitle).slice(0, 120),
    showStoreTitle: bool(raw.showStoreTitle, true),
    showLogo: bool(raw.showLogo, true),
    logoSize: clamp(raw.logoSize, 18, 80, 32),
    logoPosition: oneOf(raw.logoPosition, ["right", "center", "left"], "center"),
    showStoreAddress: bool(raw.showStoreAddress, true),
    showProductImage: bool(raw.showProductImage, false),
    showProductDescription: bool(raw.showProductDescription, true),
    showInvoiceBarcode: bool(raw.showInvoiceBarcode, false),
    showProductBarcode: bool(raw.showProductBarcode, false),
    showSku: bool(raw.showSku, true),
    showGtin: bool(raw.showGtin, false),
    showMpn: bool(raw.showMpn, false),
    showZeroTaxFields: bool(raw.showZeroTaxFields, false),
    primaryFontWeight: oneOf(raw.primaryFontWeight, ["bold", "normal"], "bold"),
    secondaryFontWeight: oneOf(raw.secondaryFontWeight, ["bold", "normal"], "normal"),
    textColor: isHexColor(s(raw.textColor)) ? s(raw.textColor) : "#111827",
    watermarkUrl: s(raw.watermarkUrl).slice(0, 1000),
    watermarkOpacity: clamp(raw.watermarkOpacity, 0, 100, 20),
    stampUrl: s(raw.stampUrl).slice(0, 1000),
    stampOpacity: clamp(raw.stampOpacity, 0, 100, 35),
    stampPosition: oneOf(
      raw.stampPosition,
      ["bottom-right", "bottom-center", "bottom-left"],
      "bottom-right",
    ),
    footerText: s(raw.footerText || DEFAULT_INVOICE_SETTINGS.footerText).slice(0, 300),
  };
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value);
}

function stripHtml(value: unknown, max = 180) {
  return s(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, max)
    .trim();
}

function selectedOptionsText(value: unknown) {
  return safeArray(value)
    .map((row) => {
      const item = safeObject(row);
      const label = firstText(item.name, item.label, item.option_name);
      const choice = firstText(item.value, item.label, item.name);
      if (label && choice && label !== choice) return `${label}: ${choice}`;
      return choice || label;
    })
    .filter(Boolean)
    .join("، ");
}

function money(value: number, currency: string) {
  return `${currency || "SAR"} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(round2(value))}`;
}

function dateText(value: unknown) {
  const raw = s(value);
  if (!raw) return "-";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function paymentMethodLabel(method: unknown) {
  const value = s(method);
  if (value === "cod") return "الدفع عند الاستلام";
  if (value === "bank_transfer") return "تحويل بنكي";
  if (value.startsWith("provider:")) return "دفع إلكتروني";
  return value || "طريقة الدفع المسجلة";
}

function paymentStatusLabel(status: unknown) {
  const value = s(status);
  if (value === "paid") return "مدفوع";
  if (value === "unpaid") return "غير مدفوع / قيد المعالجة";
  if (value === "failed") return "فشل الدفع";
  if (value === "refunded") return "تم الاسترجاع";
  return value || "قيد المعالجة";
}

function formatAddress(source: unknown) {
  const value = safeObject(source);
  const direct = firstText(
    value.full_address,
    value.fullAddress,
    value.address,
    value.address_line1,
    value.addressLine1,
    value.location,
  );

  const parts = [
    direct,
    firstText(value.district, value.district_name, value.districtName),
    firstText(value.city, value.city_name, value.cityName),
    firstText(value.country, value.country_name, value.countryName),
  ].filter(Boolean);

  return Array.from(new Set(parts)).join("، ");
}

function profileAddress(profile: DbRecord) {
  const direct = firstText(
    profile.address,
    profile.full_address,
    profile.fullAddress,
    profile.address_line1,
    profile.addressLine1,
    profile.location,
  );

  if (direct) return direct;

  return [
    firstText(profile.district, profile.district_name, profile.districtName),
    firstText(profile.city, profile.city_name, profile.cityName),
    firstText(profile.country, profile.country_name, profile.countryName),
  ]
    .filter(Boolean)
    .join("، ");
}

function safeHttpUrl(value: unknown) {
  const url = s(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

async function loadArabicFont() {
  if (!arabicFontPromise) {
    arabicFontPromise = (async () => {
      let lastError: unknown = null;

      for (const url of FONT_URLS) {
        try {
          const response = await fetch(url, { cache: "force-cache" });
          if (!response.ok) throw new Error(`FONT_HTTP_${response.status}`);

          const font = await response.arrayBuffer();
          if (font.byteLength > 0) return font;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("INVOICE_FONT_UNAVAILABLE");
    })();
  }

  return await arabicFontPromise;
}

async function toEmbeddedImage(value: unknown) {
  const url = safeHttpUrl(value);
  if (!url) return "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return "";

    const type = s(response.headers.get("content-type")).toLowerCase();
    if (!type.startsWith("image/")) return "";

    const declaredLength = n(response.headers.get("content-length"));
    if (declaredLength > 2_500_000) return "";

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 2_500_000) return "";

    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function barcode(value: string, small = false): ReactNode | null {
  const clean = s(value);
  if (!clean) return null;

  let seed = 0;
  for (const char of clean) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;

  const bars = Array.from({ length: small ? 30 : 42 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return {
      width: 2 + (seed % 4),
      visible: index < 3 || index > (small ? 26 : 38) || seed % 5 !== 0,
    };
  });

  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        direction: "ltr",
      },
    },
    [
      createElement(
        "div",
        {
          key: "bars",
          style: { display: "flex", height: small ? 24 : 36, alignItems: "stretch" },
        },
        bars.map((bar, index) =>
          createElement("span", {
            key: index,
            style: {
              display: "flex",
              width: bar.width,
              backgroundColor: bar.visible ? "#111827" : "transparent",
            },
          }),
        ),
      ),
      createElement(
        "span",
        {
          key: "value",
          style: { fontSize: small ? 11 : 13, color: "#475569", letterSpacing: 1 },
        },
        clean,
      ),
    ],
  );
}

function keyValue(label: string, value: string, key: string) {
  if (!s(value)) return null;

  return createElement(
    "div",
    {
      key,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      },
    },
    [
      createElement(
        "span",
        { key: "label", style: { color: "#64748b", fontSize: 17 } },
        label,
      ),
      createElement(
        "span",
        {
          key: "value",
          style: { color: "#0f172a", fontSize: 18, fontWeight: 700, overflow: "hidden" },
        },
        value,
      ),
    ],
  );
}

function splitItems(items: InvoiceItem[], settings: InvoiceSettings) {
  const rowWeight = settings.showProductImage ? 1.45 : settings.showProductDescription ? 1.18 : 1;
  const firstWithTotals = Math.max(3, Math.floor(6 / rowWeight));
  const firstWithoutTotals = Math.max(5, Math.floor(9 / rowWeight));
  const laterWithTotals = Math.max(4, Math.floor(7 / rowWeight));
  const middleCapacity = Math.max(6, Math.floor(12 / rowWeight));

  if (items.length <= firstWithTotals) return [items];

  const pages: InvoiceItem[][] = [];
  let remaining = [...items];
  pages.push(remaining.splice(0, firstWithoutTotals));

  while (remaining.length > laterWithTotals) {
    pages.push(remaining.splice(0, middleCapacity));
  }

  pages.push(remaining);
  return pages;
}

function invoicePage(args: {
  model: InvoiceModel;
  items: InvoiceItem[];
  pageNumber: number;
  pageCount: number;
  showOrderDetails: boolean;
  showTotals: boolean;
  images: Map<string, string>;
}): ReactElement {
  const { model, items, pageNumber, pageCount, showOrderDetails, showTotals, images } = args;
  const { settings, order, store } = model;
  const primaryWeight = settings.primaryFontWeight === "bold" ? 700 : 400;
  const secondaryWeight = settings.secondaryFontWeight === "bold" ? 700 : 400;
  const invoiceStoreName =
    settings.issueMode === "custom" && settings.customStoreTitle
      ? settings.customStoreTitle
      : store.name;
  const logo = images.get("logo") || "";
  const watermark = images.get("watermark") || "";
  const stamp = images.get("stamp") || "";

  const logoPosition =
    settings.logoPosition === "right"
      ? "flex-end"
      : settings.logoPosition === "left"
        ? "flex-start"
        : "center";

  const heading = (text: string, key: string) =>
    createElement(
      "div",
      {
        key,
        style: {
          display: "flex",
          fontSize: 22,
          fontWeight: primaryWeight,
          color: settings.textColor,
          marginBottom: 14,
        },
      },
      text,
    );

  const itemRows = items.map((item, index) => {
    const image = images.get(`item:${item.id}`) || "";
    const meta = [
      settings.showSku && item.sku ? `SKU: ${item.sku}` : "",
      settings.showGtin && item.gtin ? `GTIN: ${item.gtin}` : "",
      settings.showMpn && item.mpn ? `MPN: ${item.mpn}` : "",
    ]
      .filter(Boolean)
      .join("  •  ");

    return createElement(
      "div",
      {
        key: item.id || `${item.name}-${index}`,
        style: {
          display: "flex",
          width: "100%",
          padding: "16px 0",
          borderBottom: "1px solid #e2e8f0",
          alignItems: "center",
          direction: "rtl",
          minHeight: settings.showProductImage ? 92 : 72,
        },
      },
      [
        createElement(
          "div",
          {
            key: "product",
            style: {
              display: "flex",
              width: "54%",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            },
          },
          [
            settings.showProductImage && image
              ? createElement("img", {
                  key: "image",
                  src: image,
                  width: 62,
                  height: 62,
                  style: {
                    display: "flex",
                    width: 62,
                    height: 62,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    flexShrink: 0,
                  },
                })
              : null,
            createElement(
              "div",
              {
                key: "text",
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 0,
                  flex: 1,
                },
              },
              [
                createElement(
                  "span",
                  {
                    key: "name",
                    style: { fontSize: 19, fontWeight: primaryWeight, color: settings.textColor },
                  },
                  item.name || "منتج",
                ),
                settings.showProductDescription && item.description
                  ? createElement(
                      "span",
                      {
                        key: "description",
                        style: { fontSize: 14, color: "#64748b", lineHeight: 1.4 },
                      },
                      item.description,
                    )
                  : null,
                meta
                  ? createElement(
                      "span",
                      {
                        key: "meta",
                        style: { fontSize: 12, color: "#475569", direction: "ltr" },
                      },
                      meta,
                    )
                  : null,
                settings.showProductBarcode && item.barcode
                  ? createElement(
                      "div",
                      { key: "barcode", style: { display: "flex", marginTop: 3, alignSelf: "flex-start" } },
                      barcode(item.barcode, true),
                    )
                  : null,
              ].filter(Boolean),
            ),
          ].filter(Boolean),
        ),
        createElement(
          "div",
          {
            key: "qty",
            style: { display: "flex", width: "12%", justifyContent: "center", fontSize: 17, color: settings.textColor },
          },
          String(item.qty),
        ),
        createElement(
          "div",
          {
            key: "unit",
            style: { display: "flex", width: "16%", justifyContent: "center", fontSize: 16, color: settings.textColor, direction: "ltr" },
          },
          money(item.unitPrice, item.currency || order.currency),
        ),
        createElement(
          "div",
          {
            key: "total",
            style: { display: "flex", width: "18%", justifyContent: "flex-end", fontSize: 17, fontWeight: primaryWeight, color: settings.textColor, direction: "ltr" },
          },
          money(item.totalPrice, item.currency || order.currency),
        ),
      ],
    );
  });

  const totals = [
    ["الإجمالي الفرعي", order.subtotal, false],
    ["الشحن", order.shipping, order.shipping <= 0],
    ["الخصم", order.discount, order.discount <= 0],
    [store.taxLabel || "ضريبة القيمة المضافة", order.tax, order.tax <= 0 && !settings.showZeroTaxFields],
  ].filter(([, , hidden]) => !hidden) as Array<[string, number, boolean]>;

  const stampStyle: DbRecord = {
    position: "absolute",
    bottom: 86,
    width: 110,
    height: 110,
    objectFit: "contain",
    opacity: settings.stampOpacity / 100,
  };

  if (settings.stampPosition === "bottom-left") stampStyle.left = 54;
  else if (settings.stampPosition === "bottom-center") stampStyle.left = 565;
  else stampStyle.right = 54;

  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "54px",
        position: "relative",
        backgroundColor: "#ffffff",
        color: settings.textColor,
        fontFamily: "InvoiceArabic",
        direction: "rtl",
      },
    },
    [
      watermark
        ? createElement("img", {
            key: "watermark",
            src: watermark,
            width: 560,
            height: 560,
            style: {
              position: "absolute",
              display: "flex",
              top: 420,
              left: 340,
              width: 560,
              height: 560,
              objectFit: "contain",
              opacity: settings.watermarkOpacity / 100,
            },
          })
        : null,
      createElement(
        "div",
        {
          key: "content",
          style: {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            position: "relative",
          },
        },
        [
          createElement(
            "header",
            {
              key: "header",
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 22,
                borderBottom: "2px solid #e2e8f0",
              },
            },
            [
              createElement(
                "div",
                {
                  key: "store",
                  style: { display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 },
                },
                [
                  settings.showStoreTitle
                    ? createElement(
                        "div",
                        { key: "name", style: { display: "flex", fontSize: 26, fontWeight: primaryWeight } },
                        invoiceStoreName,
                      )
                    : null,
                  createElement(
                    "div",
                    { key: "title", style: { display: "flex", fontSize: 17, color: "#64748b" } },
                    "فاتورة مبيعات",
                  ),
                  store.taxNumber
                    ? createElement(
                        "div",
                        { key: "tax", style: { display: "flex", fontSize: 14, color: "#475569", direction: "ltr" } },
                        `${store.taxLabel}: ${store.taxNumber}`,
                      )
                    : null,
                ].filter(Boolean),
              ),
              settings.showLogo
                ? createElement(
                    "div",
                    {
                      key: "logoWrap",
                      style: { display: "flex", width: 220, justifyContent: logoPosition, alignItems: "center" },
                    },
                    logo
                      ? createElement("img", {
                          src: logo,
                          width: Math.max(72, settings.logoSize * 3),
                          height: Math.max(72, settings.logoSize * 3),
                          style: {
                            display: "flex",
                            width: Math.max(72, settings.logoSize * 3),
                            height: Math.max(72, settings.logoSize * 3),
                            objectFit: "contain",
                          },
                        })
                      : createElement(
                          "div",
                          {
                            style: {
                              display: "flex",
                              width: Math.max(72, settings.logoSize * 3),
                              height: Math.max(72, settings.logoSize * 3),
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 14,
                              backgroundColor: "#0f172a",
                              color: "#ffffff",
                              fontWeight: primaryWeight,
                              fontSize: 18,
                            },
                          },
                          invoiceStoreName.slice(0, 2),
                        ),
                  )
                : null,
            ].filter(Boolean),
          ),
          createElement(
            "section",
            {
              key: "invoiceMeta",
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "24px 0",
                gap: 22,
              },
            },
            [
              createElement(
                "div",
                { key: "date", style: { display: "flex", flexDirection: "column", gap: 7, width: "48%" } },
                [
                  createElement("span", { key: "label", style: { fontSize: 16, color: "#64748b" } }, "تاريخ الطلب"),
                  createElement("strong", { key: "value", style: { fontSize: 18, fontWeight: primaryWeight } }, dateText(order.createdAt)),
                ],
              ),
              createElement(
                "div",
                { key: "numbers", style: { display: "flex", flexDirection: "column", gap: 6, width: "52%", alignItems: "flex-end" } },
                [
                  createElement("strong", { key: "invoice", style: { fontSize: 22, fontWeight: primaryWeight, direction: "ltr" } }, `INV-${order.invoiceNo}`),
                  createElement("span", { key: "order", style: { fontSize: 16, color: "#475569", direction: "ltr" } }, `ORDER #${order.orderNo}`),
                  settings.showInvoiceBarcode
                    ? createElement("div", { key: "barcode", style: { display: "flex", marginTop: 3 } }, barcode(`INV-${order.invoiceNo}`))
                    : null,
                ].filter(Boolean),
              ),
            ],
          ),
          showOrderDetails
            ? createElement(
                "section",
                {
                  key: "parties",
                  style: { display: "flex", gap: 18, padding: "18px 0 24px", borderTop: "1px solid #e2e8f0" },
                },
                [
                  createElement(
                    "div",
                    {
                      key: "from",
                      style: { display: "flex", flexDirection: "column", gap: 8, width: "50%", padding: 18, borderRadius: 14, backgroundColor: "#f8fafc" },
                    },
                    [
                      heading("مصدره من", "heading"),
                      settings.showStoreTitle ? keyValue("المتجر", invoiceStoreName, "name") : null,
                      settings.showStoreAddress && store.address ? keyValue("العنوان", store.address, "address") : null,
                      store.email ? keyValue("البريد الإلكتروني", store.email, "email") : null,
                      store.phone ? keyValue("الجوال", store.phone, "phone") : null,
                    ].filter(Boolean),
                  ),
                  createElement(
                    "div",
                    {
                      key: "to",
                      style: { display: "flex", flexDirection: "column", gap: 8, width: "50%", padding: 18, borderRadius: 14, backgroundColor: "#f8fafc" },
                    },
                    [
                      heading("مصدره إلى", "heading"),
                      keyValue("العميل", order.customerName || "-", "customer"),
                      order.shippingAddress ? keyValue("عنوان الشحن", order.shippingAddress, "shipping") : null,
                      order.customerEmail ? keyValue("البريد الإلكتروني", order.customerEmail, "email") : null,
                      order.customerPhone ? keyValue("الجوال", order.customerPhone, "phone") : null,
                    ].filter(Boolean),
                  ),
                ],
              )
            : null,
          createElement(
            "section",
            { key: "items", style: { display: "flex", flexDirection: "column", flex: 1, paddingTop: 8 } },
            [
              createElement(
                "div",
                {
                  key: "thead",
                  style: {
                    display: "flex",
                    width: "100%",
                    padding: "13px 0",
                    backgroundColor: "#f1f5f9",
                    borderTop: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                    color: "#334155",
                    fontSize: 16,
                    fontWeight: primaryWeight,
                    direction: "rtl",
                  },
                },
                [
                  createElement("span", { key: "product", style: { display: "flex", width: "54%", paddingRight: 10 } }, "المنتج"),
                  createElement("span", { key: "qty", style: { display: "flex", width: "12%", justifyContent: "center" } }, "الكمية"),
                  createElement("span", { key: "price", style: { display: "flex", width: "16%", justifyContent: "center" } }, "السعر"),
                  createElement("span", { key: "total", style: { display: "flex", width: "18%", justifyContent: "flex-end", paddingLeft: 10 } }, "المجموع"),
                ],
              ),
              ...itemRows,
            ],
          ),
          showTotals
            ? createElement(
                "section",
                {
                  key: "totals",
                  style: { display: "flex", justifyContent: "space-between", gap: 24, paddingTop: 24 },
                },
                [
                  createElement(
                    "div",
                    { key: "info", style: { display: "flex", flexDirection: "column", gap: 7, width: "50%", color: "#475569", fontSize: 15 } },
                    [
                      createElement("span", { key: "payment" }, `طريقة الدفع: ${paymentMethodLabel(order.paymentMethod)}`),
                      createElement("span", { key: "paymentStatus" }, `حالة الدفع: ${paymentStatusLabel(order.paymentStatus)}`),
                      order.shippingCarrier
                        ? createElement("span", { key: "shipping" }, `شركة الشحن: ${order.shippingCarrier}`)
                        : null,
                    ].filter(Boolean),
                  ),
                  createElement(
                    "div",
                    { key: "rows", style: { display: "flex", flexDirection: "column", width: "50%", gap: 8 } },
                    [
                      ...totals.map(([label, value], index) =>
                        createElement(
                          "div",
                          {
                            key: `${label}-${index}`,
                            style: { display: "flex", justifyContent: "space-between", color: "#334155", fontSize: 17 },
                          },
                          [
                            createElement("span", { key: "label" }, label),
                            createElement("strong", { key: "value", style: { direction: "ltr", fontWeight: secondaryWeight } },
                              label === "الخصم" ? `- ${money(value, order.currency)}` : value <= 0 && label === "الشحن" ? "مجاني" : money(value, order.currency),
                            ),
                          ],
                        ),
                      ),
                      createElement(
                        "div",
                        {
                          key: "final",
                          style: {
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 5,
                            paddingTop: 12,
                            borderTop: "2px solid #0f172a",
                            color: settings.textColor,
                            fontSize: 22,
                            fontWeight: primaryWeight,
                          },
                        },
                        [
                          createElement("span", { key: "label" }, "الإجمالي"),
                          createElement("strong", { key: "value", style: { direction: "ltr", fontWeight: primaryWeight } }, money(order.total, order.currency)),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            : null,
          createElement(
            "footer",
            {
              key: "footer",
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 22,
                paddingTop: 16,
                borderTop: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: 14,
              },
            },
            [
              createElement("span", { key: "text" }, settings.footerText || DEFAULT_INVOICE_SETTINGS.footerText),
              createElement("span", { key: "page", style: { direction: "ltr" } }, `${pageNumber} / ${pageCount}`),
            ],
          ),
        ].filter(Boolean),
      ),
      stamp
        ? createElement("img", {
            key: "stamp",
            src: stamp,
            width: 110,
            height: 110,
            style: { display: "flex", ...stampStyle },
          })
        : null,
    ].filter(Boolean),
  );
}

function readPng(buffer: Buffer): PngPage {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("INVOICE_IMAGE_INVALID");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  const idat: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("INVOICE_IMAGE_TRUNCATED");

    const chunk = buffer.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) {
    throw new Error("INVOICE_IMAGE_UNSUPPORTED");
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const expected = height * (stride + 1);
  if (raw.length < expected) throw new Error("INVOICE_IMAGE_TRUNCATED");

  const scanlines = Buffer.alloc(height * stride);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = raw[sourceOffset++];
    const rowOffset = row * stride;

    for (let x = 0; x < stride; x += 1) {
      const value = raw[sourceOffset++];
      const left = x >= channels ? scanlines[rowOffset + x - channels] : 0;
      const up = row > 0 ? scanlines[rowOffset - stride + x] : 0;
      const upLeft = row > 0 && x >= channels ? scanlines[rowOffset - stride + x - channels] : 0;

      if (filter === 0) scanlines[rowOffset + x] = value;
      else if (filter === 1) scanlines[rowOffset + x] = (value + left) & 255;
      else if (filter === 2) scanlines[rowOffset + x] = (value + up) & 255;
      else if (filter === 3) scanlines[rowOffset + x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        scanlines[rowOffset + x] = (value + predictor) & 255;
      } else {
        throw new Error("INVOICE_IMAGE_FILTER_UNSUPPORTED");
      }
    }
  }

  const rgb = Buffer.alloc(width * height * 3);
  for (let pixel = 0, output = 0; pixel < width * height; pixel += 1, output += 3) {
    const input = pixel * channels;
    const alpha = channels === 4 ? scanlines[input + 3] : 255;
    rgb[output] = Math.round((scanlines[input] * alpha + 255 * (255 - alpha)) / 255);
    rgb[output + 1] = Math.round((scanlines[input + 1] * alpha + 255 * (255 - alpha)) / 255);
    rgb[output + 2] = Math.round((scanlines[input + 2] * alpha + 255 * (255 - alpha)) / 255);
  }

  return { width, height, rgb };
}

function buildPdf(pages: PngPage[]) {
  const buffers: Buffer[] = [];
  const offsets: number[] = [];
  let position = 0;

  const push = (value: Buffer | string) => {
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "binary");
    buffers.push(buffer);
    position += buffer.length;
  };

  const object = (id: number, body: Buffer | string) => {
    offsets[id] = position;
    push(`${id} 0 obj\n`);
    push(body);
    push("\nendobj\n");
  };

  const pageIds = pages.map((_, index) => 3 + index * 3);
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const contentsId = pageId + 1;
    const imageId = pageId + 2;
    const imageName = `Im${index + 1}`;
    const contents = Buffer.from(
      `q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/${imageName} Do\nQ\n`,
      "ascii",
    );
    const compressed = deflateSync(page.rgb, { level: 9 });

    object(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentsId} 0 R >>`,
    );
    object(contentsId, Buffer.concat([Buffer.from(`<< /Length ${contents.length} >>\nstream\n`, "ascii"), contents, Buffer.from("endstream", "ascii")]));
    object(
      imageId,
      Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`,
          "ascii",
        ),
        compressed,
        Buffer.from("\nendstream", "ascii"),
      ]),
    );
  });

  const xrefOffset = position;
  push(`xref\n0 ${offsets.length}\n`);
  push("0000000000 65535 f \n");
  for (let id = 1; id < offsets.length; id += 1) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.concat(buffers);
}

async function loadInvoice(token: string): Promise<InvoiceModel | null> {
  const ctx = await resolveStoreContext();
  if (!ctx.store?.id) return null;

  const storeId = ctx.store.id;
  const [ordersDb, storeDb] = await Promise.all([getOrdersDb(storeId), getStoreDb(storeId)]);
  const orders: any = ordersDb;
  const store: any = storeDb;

  const orderR = await orders
    .from("orders")
    .select(
      [
        "id",
        "store_id",
        "customer_id",
        "order_number",
        "public_no",
        "public_token",
        "invoice_no",
        "currency",
        "subtotal",
        "shipping_amount",
        "tax_amount",
        "discount_amount",
        "total_amount",
        "payment_method",
        "payment_status",
        "created_at",
        "shipping_address",
        "shipping_snapshot",
      ].join(","),
    )
    .eq("store_id", storeId)
    .eq("public_token", token)
    .maybeSingle();

  if (orderR.error || !orderR.data?.id) return null;
  const order = orderR.data as DbRecord;

  const [itemsR, settingR, taxR, customerR] = await Promise.all([
    orders
      .from("order_items")
      .select(
        [
          "id",
          "product_id",
          "variant_id",
          "name",
          "sku",
          "qty",
          "currency",
          "unit_price",
          "total_price",
          "selected_options",
          "created_at",
        ].join(","),
      )
      .eq("store_id", storeId)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    store
      .from("store_settings")
      .select("slug,value,updated_at")
      .eq("store_id", storeId)
      .in("slug", [SETTINGS_SLUG, "store.profile", "profile", "store.support"])
      .order("updated_at", { ascending: false }),
    store
      .from("store_tax_settings")
      .select("tax_number,tax_label")
      .eq("store_id", storeId)
      .maybeSingle(),
    order.customer_id
      ? orders
          .from("customers")
          .select("full_name,email,phone_e164")
          .eq("id", order.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];
  const productIds = Array.from(new Set(items.map((item: DbRecord) => s(item.product_id)).filter(Boolean)));
  const variantIds = Array.from(new Set(items.map((item: DbRecord) => s(item.variant_id)).filter(Boolean)));

  const [productsR, mediaR, variantsR] = await Promise.all([
    productIds.length
      ? store
          .from("products")
          .select("id,description")
          .eq("store_id", storeId)
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? store
          .from("product_media")
          .select("product_id,original_url,is_default,sort_order")
          .eq("store_id", storeId)
          .eq("media_kind", "image")
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? store
          .from("product_variants")
          .select("id,sku,barcode,gtin,mpn")
          .in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const settingRows = Array.isArray(settingR.data) ? settingR.data : [];
  const firstSetting = (slugs: string[]) => {
    for (const slug of slugs) {
      const row = settingRows.find((item: DbRecord) => s(item.slug) === slug);
      if (row) return safeObject(row.value);
    }
    return {};
  };

  const invoiceSettings = normalizeInvoiceSettings(firstSetting([SETTINGS_SLUG]));
  const profile = firstSetting(["store.profile", "profile"]);
  const support = firstSetting(["store.support"]);
  const productsById = new Map<string, DbRecord>(
    safeArray(productsR.data).map((row: DbRecord) => [s(row.id), row]),
  );
  const variantsById = new Map<string, DbRecord>(
    safeArray(variantsR.data).map((row: DbRecord) => [s(row.id), row]),
  );
  const imagesByProduct = new Map<string, DbRecord>();

  for (const row of safeArray(mediaR.data)) {
    const productId = s(row.product_id);
    if (!productId) continue;
    const previous = imagesByProduct.get(productId);
    const score = (row.is_default ? 0 : 1000) + n(row.sort_order);
    const previousScore = previous ? (previous.is_default ? 0 : 1000) + n(previous.sort_order) : Number.POSITIVE_INFINITY;
    if (!previous || score < previousScore) imagesByProduct.set(productId, row);
  }

  const shippingAddress = safeObject(order.shipping_address);
  const snapshot = safeObject(order.shipping_snapshot);
  const checkoutSnapshot = safeObject(snapshot.checkout);
  const customer = safeObject(customerR.data);

  const invoiceItems: InvoiceItem[] = items.map((item: DbRecord, index: number) => {
    const product = productsById.get(s(item.product_id)) || {};
    const variant = variantsById.get(s(item.variant_id)) || {};
    const image = imagesByProduct.get(s(item.product_id)) || {};
    const options = selectedOptionsText(item.selected_options);
    const description = options || stripHtml(product.description);

    return {
      id: s(item.id) || `${s(item.product_id)}-${index}`,
      name: firstText(item.name, "منتج"),
      qty: Math.max(1, Math.floor(n(item.qty) || 1)),
      unitPrice: round2(item.unit_price),
      totalPrice: round2(item.total_price),
      currency: firstText(item.currency, order.currency, ctx.store?.default_currency, "SAR"),
      description,
      sku: firstText(item.sku, variant.sku),
      gtin: firstText(variant.gtin),
      mpn: firstText(variant.mpn),
      barcode: firstText(variant.barcode, variant.gtin, item.sku),
      imageUrl: safeHttpUrl(image.original_url),
    };
  });

  const orderShippingCarrier = firstText(
    snapshot.carrier_name,
    snapshot.shipping_carrier_name,
    snapshot.shipping_method_name,
    checkoutSnapshot.carrier_name,
    checkoutSnapshot.shipping_method_name,
  );

  return {
    store: {
      name: firstText(ctx.store.name, "المتجر"),
      logoUrl: safeHttpUrl(firstText(ctx.store.logo_url, profile.logo_url)),
      address: profileAddress(profile),
      email: firstText(support.email, profile.email, profile.support_email),
      phone: firstText(support.phone, support.whatsapp, profile.phone),
      taxNumber: firstText(taxR.data?.tax_number),
      taxLabel: firstText(taxR.data?.tax_label, "الرقم الضريبي"),
    },
    order: {
      invoiceNo: firstText(order.invoice_no, order.order_number, order.public_no, order.id),
      orderNo: firstText(order.public_no, order.order_number, order.invoice_no, order.id),
      publicNo: firstText(order.public_no),
      createdAt: firstText(order.created_at),
      currency: firstText(order.currency, ctx.store.default_currency, "SAR"),
      paymentMethod: firstText(order.payment_method, checkoutSnapshot.payment_method),
      paymentStatus: firstText(order.payment_status),
      shippingCarrier: orderShippingCarrier,
      shippingAddress: formatAddress(shippingAddress),
      customerName: firstText(shippingAddress.recipient_name, shippingAddress.name, shippingAddress.full_name, customer.full_name),
      customerEmail: firstText(shippingAddress.email, customer.email),
      customerPhone: firstText(shippingAddress.phone_e164, shippingAddress.phone, customer.phone_e164),
      subtotal: round2(order.subtotal),
      shipping: round2(order.shipping_amount),
      discount: round2(order.discount_amount),
      tax: round2(order.tax_amount),
      total: round2(order.total_amount),
    },
    items: invoiceItems,
    settings: invoiceSettings,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token?: string }> },
) {
  try {
    const params = await context.params;
    const token = s(params?.token);

    // Checkout currently creates public order tokens with six characters.
    // Keep accepting future longer tokens too, while rejecting malformed paths.
    if (!/^[A-Za-z0-9_-]{5,160}$/.test(token)) {
      return new Response("Not found", { status: 404 });
    }

    const model = await loadInvoice(token);
    if (!model) return new Response("Not found", { status: 404 });

    const imageRequests: Array<[string, string]> = [];
    if (model.settings.showLogo && model.store.logoUrl) imageRequests.push(["logo", model.store.logoUrl]);
    if (model.settings.watermarkUrl) imageRequests.push(["watermark", model.settings.watermarkUrl]);
    if (model.settings.stampUrl) imageRequests.push(["stamp", model.settings.stampUrl]);
    if (model.settings.showProductImage) {
      for (const item of model.items) {
        if (item.imageUrl) imageRequests.push([`item:${item.id}`, item.imageUrl]);
      }
    }

    const embeddedImages = new Map<string, string>();
    await Promise.all(
      imageRequests.map(async ([key, url]) => {
        const embedded = await toEmbeddedImage(url);
        if (embedded) embeddedImages.set(key, embedded);
      }),
    );

    const font = await loadArabicFont();
    const itemPages = splitItems(model.items.length ? model.items : [
      {
        id: "empty",
        name: "لا توجد منتجات في الطلب",
        qty: 0,
        unitPrice: 0,
        totalPrice: 0,
        currency: model.order.currency,
        description: "",
        sku: "",
        gtin: "",
        mpn: "",
        barcode: "",
        imageUrl: "",
      },
    ], model.settings);

    const pngPages: PngPage[] = [];
    for (let index = 0; index < itemPages.length; index += 1) {
      const image = new ImageResponse(
        invoicePage({
          model,
          items: itemPages[index],
          pageNumber: index + 1,
          pageCount: itemPages.length,
          showOrderDetails: index === 0,
          showTotals: index === itemPages.length - 1,
          images: embeddedImages,
        }),
        {
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          fonts: [
            {
              name: "InvoiceArabic",
              data: font,
              weight: 400,
              style: "normal",
            },
          ],
        },
      );

      pngPages.push(readPng(Buffer.from(await image.arrayBuffer())));
    }

    const pdf = buildPdf(pngPages);
    const filename = `invoice-${model.order.invoiceNo.replace(/[^A-Za-z0-9_-]/g, "") || "order"}.pdf`;

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[storefront-invoice-download]", error);
    return new Response("تعذر إنشاء الفاتورة حالياً", { status: 500 });
  }
}
