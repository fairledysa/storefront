// FILE: apps/storefront/src/themes/malak/screens/product/_components/ProductInfo.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ProductCountdown from "@/themes/malak/components/product-countdown/ProductCountdown";
import type { StoreOptions } from "@/lib/store-options";
import type {
  MalakBootstrapPayment,
  MalakBootstrapProductOptions,
} from "../../../bootstrap/types";

type ProductTagItem = {
  id?: string;
  name: string;
  slug?: string | null;
  href?: string | null;
};

type ProductSizeGuideItem = {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  categoryIds: string[];
  sortOrder: number;
};

type Props = {
  name?: string;
  subtitle?: string | null;
  promotionTitle?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  sizeGuides?: ProductSizeGuideItem[];

  currencySymbol?: string | null;
  currencyDecimals?: number | string | null;
  tax?: any;
  saleEnd?: string | null;
  showSaleCountdown?: boolean;
  brand?: string | null;
  brandLogo?: string | null;
  categories?: Array<{ id: string; name: string; href?: string | null }>;
  payments?: MalakBootstrapPayment[];
  options?: any[];
  selectedOptionValueIds?: string[];
  allowedByOption?: Map<string, Set<string>>;
  onSelectOption?: (optionId: string, valueId: string) => void;

  shipping?: {
    requires_shipping?: boolean;
    weight?: number | null;
    weight_unit?: string | null;
  } | null;

  identifiers?: {
    sku?: string | null;
    mpn?: string | null;
    gtin?: string | null;
  } | null;

  tags?: ProductTagItem[];
  storeOptions: StoreOptions;
  productOptions: MalakBootstrapProductOptions;
  purchaseCount?: number | null;
  productCategoryIds?: string[];
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function clampDecimals(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(n || 0));
}

function formatMoney(n: number, currencySymbol?: string | null, decimals?: any) {
  const symbol = s(currencySymbol);
  const digits = clampDecimals(decimals);

  const amount = formatNumber(n, digits);

  if (!symbol) return amount;

  return `${amount} ${symbol}`;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function boolValue(value: any, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled"].includes(v)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(v)) return false;
  }

  return fallback;
}

function isTaxIncluded(tax: any) {
  if (!tax || typeof tax !== "object" || Array.isArray(tax)) return false;

  const enabled = boolValue(
    firstDefined(
      tax.enabled,
      tax.is_enabled,
      tax.isEnabled,
      tax.active,
      tax.is_active,
      tax.isActive,
      tax.vat_enabled,
      tax.vatEnabled,
    ),
    false,
  );

  const included = boolValue(
    firstDefined(
      tax.isIncludedInPrice,
      tax.is_included_in_price,
      tax.displayLabel ? true : undefined,
      tax.display_label ? true : undefined,

      tax.pricesIncludeTax,
      tax.prices_include_tax,

      tax.included,
      tax.is_included,
      tax.isIncluded,
      tax.included_in_price,
      tax.includedInPrice,
      tax.tax_included,
      tax.taxIncluded,
      tax.vat_included,
      tax.vatIncluded,
    ),
    false,
  );

  const rate = Number(
    firstDefined(
      tax.rate,
      tax.effective_rate,
      tax.effectiveRate,
      tax.default_rate,
      tax.defaultRate,
      0,
    ),
  );

  return enabled && (included || (Number.isFinite(rate) && rate > 0));
}

function Money({
  value,
  currencySymbol,
  currencyDecimals,
}: {
  value: number;
  currencySymbol?: string | null;
  currencyDecimals?: number | string | null;
}) {
  return (
    <bdi dir="ltr">
      {formatMoney(value, currencySymbol, currencyDecimals)}
    </bdi>
  );
}

function calcDiscount(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return null;

  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct > 0 ? `خصم ${pct}%` : null;
}

function hasRealDiscount(price?: number | null, compareAt?: number | null) {
  return (
    typeof price === "number" &&
    typeof compareAt === "number" &&
    compareAt > price
  );
}

function optionKind(opt: any): "single" | "multiple" {
  const raw = String(
    opt?.option_field_type || opt?.field_type || opt?.type || "",
  )
    .trim()
    .toLowerCase();

  if (
    raw.includes("multi") ||
    raw.includes("checkbox") ||
    raw === "multiple" ||
    raw === "checkbox_group"
  ) {
    return "multiple";
  }

  return "single";
}

function optionDisplayType(opt: any): "text" | "color" | "image" {
  const raw = String(
    opt?.featureType ||
      opt?.feature_type ||
      opt?.displayType ||
      opt?.display_type ||
      "",
  )
    .trim()
    .toLowerCase();

  if (raw === "color" || raw === "colour" || raw === "swatch") {
    return "color";
  }

  if (raw === "image" || raw === "thumbnail" || raw === "thumb") {
    return "image";
  }

  return "text";
}

function readOptionColor(value: any) {
  const text = firstText(value?.colorHex, value?.color);

  if (!text) return "";

  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
    text,
  )
    ? text
    : "";
}

function readOptionImage(value: any) {
  return firstText(value?.imageUrl, value?.image_url, value?.image);
}

function normalizeTagSlug(value: unknown) {
  let raw = s(value);

  if (!raw) return "";

  try {
    raw = decodeURIComponent(raw);
  } catch {}

  return raw
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/^\/+/, "")
    .replace(/^tags\/+/i, "")
    .replace(/^tag\/+/i, "")
    .replace(/[\\?#%]+/g, "")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tagLabel(tag: ProductTagItem) {
  return s(tag?.name);
}

function tagHref(tag: ProductTagItem) {
  const explicitHref = s(tag?.href);
  if (explicitHref) return explicitHref;

  const slug = normalizeTagSlug(tag?.slug || tag?.name);
  if (!slug) return "";

  return `/tags/${encodeURIComponent(slug)}`;
}

function paymentLabelFromSrc(src: string) {
  const file = String(src ?? "").split("/").pop() || "";
  const name = file.split(".")[0] || "";

  const labels: Record<string, string> = {
    gpay: "GPay",
    googlepay: "GPay",
    google_pay: "GPay",
    "google-pay": "GPay",
    stc: "STC Pay",
    stcpay: "STC Pay",
    stc_pay: "STC Pay",
    "stc-bank": "STC Pay",
    amex: "AMEX",
    tabby: "Tabby",
    applepay: "Apple Pay",
    apple_pay: "Apple Pay",
    "apple-pay": "Apple Pay",
    tamara: "Tamara",
    mastercard: "Mastercard",
    master_card: "Mastercard",
    "master-card": "Mastercard",
    visa: "Visa",
    mada: "Mada",
    express: "Express Pay",
    "express-pay": "Express Pay",
  };

  return labels[name.toLowerCase()] || name || "دفع";
}

function splitSizeGuideText(value: string) {
  return String(value ?? "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ProductInfo({
  name = "اسم المنتج",
  subtitle = null,
  promotionTitle = null,
  price = null,
  compareAtPrice = null,
  currencySymbol = null,
  currencyDecimals = 0,
  tax = null,
  saleEnd = null,
  showSaleCountdown = false,
  brand = null,
  brandLogo = null,
  categories = [],
  payments = [],
  options = [],
  selectedOptionValueIds = [],
  allowedByOption = new Map<string, Set<string>>(),
  onSelectOption,
  shipping = null,
  identifiers = null,
  tags = [],
  storeOptions,
  productOptions,
  purchaseCount = null,
  productCategoryIds = [],
  sizeGuides = [],
}: Props) {
  const safePrice = typeof price === "number" ? price : null;
  const safeCompare =
    typeof compareAtPrice === "number" ? compareAtPrice : null;

  const discountLabel =
    safePrice != null && productOptions.show_discounted_amount
      ? calcDiscount(safePrice, safeCompare)
      : null;

  const selectedSet = new Set((selectedOptionValueIds ?? []).map(String));
  const hasBrandBlock = Boolean(brand || brandLogo);

  const shouldShowCountdown =
    hasRealDiscount(safePrice, safeCompare) &&
    Boolean(saleEnd) &&
    Boolean(showSaleCountdown) &&
    !productOptions.hide_countdown;

  const showWeight = storeOptions?.switches?.showWeight ?? true;
  const showSku = storeOptions?.switches?.showProductSku ?? true;
  const showHsCode = storeOptions?.switches?.hsCodeEnabled ?? false;
  const showDash = storeOptions?.switches?.showDashInstead ?? true;
  const priceStartFrom = storeOptions?.switches?.priceStartFrom ?? false;

  const showTaxIncludedNote =
    safePrice != null && Number(safePrice) > 0 && !productOptions.hide_top_price;
  Boolean(
    tax?.enabled ||
      tax?.isIncludedInPrice ||
      tax?.is_included_in_price ||
      tax?.displayLabel ||
      tax?.display_label ||
      Number(tax?.rate ?? tax?.effective_rate ?? tax?.effectiveRate ?? 0) > 0,
  );

  const hasWeightBox = Boolean(showWeight && shipping?.weight != null);

  const hasIdentifiersBox = Boolean(
    (showSku && identifiers?.sku) ||
      (showHsCode && identifiers?.mpn) ||
      identifiers?.gtin,
  );

  const purchaseCountEnabled =
    storeOptions?.productPurchaseCount?.enabled ?? true;

  const purchaseCountSelectedCategoriesOnly =
    storeOptions?.productPurchaseCount?.selectedCategoriesOnly ?? false;

  const purchaseCountCategoryIds = Array.isArray(
    storeOptions?.productPurchaseCount?.categoryIds,
  )
    ? storeOptions.productPurchaseCount.categoryIds.map(String).filter(Boolean)
    : [];

  const normalizedProductCategoryIds = Array.isArray(productCategoryIds)
    ? productCategoryIds.map(String).filter(Boolean)
    : [];

  const purchaseCountMatchesCategory =
    !purchaseCountSelectedCategoriesOnly ||
    purchaseCountCategoryIds.length === 0 ||
    purchaseCountCategoryIds.some((id) =>
      normalizedProductCategoryIds.includes(String(id)),
    );

  const purchaseCountIsActive =
    purchaseCountEnabled || purchaseCountSelectedCategoriesOnly;

  const canShowPurchaseCount =
    purchaseCountIsActive &&
    purchaseCountMatchesCategory &&
    typeof purchaseCount === "number" &&
    Number.isFinite(purchaseCount) &&
    purchaseCount > 0;

  const showTags =
    productOptions.show_tags && Array.isArray(tags) && tags.length > 0;

  const showCategories =
    productOptions.show_category_in_product_single &&
    Array.isArray(categories) &&
    categories.length > 0;

  const showPayments =
    productOptions.show_payments_in_product_single &&
    Array.isArray(payments) &&
    payments.length > 0;

  const [activeSizeGuideId, setActiveSizeGuideId] = useState("");
  const [sizeGuidePortalReady, setSizeGuidePortalReady] = useState(false);

  useEffect(() => {
    setSizeGuidePortalReady(true);
  }, []);

  useEffect(() => {
    if (!activeSizeGuideId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveSizeGuideId("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSizeGuideId]);

  const visibleSizeGuides = useMemo(() => {
    return (Array.isArray(sizeGuides) ? sizeGuides : []).filter(
      (item) => item && item.id && item.title,
    );
  }, [sizeGuides]);

  const activeSizeGuide =
    visibleSizeGuides.find((item) => item.id === activeSizeGuideId) || null;

  const activeSizeGuideTextLines = useMemo(() => {
    return activeSizeGuide?.contentText
      ? splitSizeGuideText(activeSizeGuide.contentText)
      : [];
  }, [activeSizeGuide]);

  return (
    <div
      dir="rtl"
      className={[
        "mk-pinfo",
        productOptions.enhanced_brand_senction
          ? "mk-pinfo--enhanced-brand"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasBrandBlock ? (
        <div className="mk-pinfo-brand">
          {brandLogo ? (
            <div className="mk-pinfo-brand__logo">
              <img src={brandLogo} alt={brand || "brand"} />
            </div>
          ) : null}

          {brand ? (
            <div className="mk-pinfo-brand__name">
              {productOptions.enhanced_brand_senction ? (
                <span className="mk-pinfo-brand__badge">أصلي 100%</span>
              ) : null}

              <span>{brand}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mk-pinfo-title">{name}</div>

      {subtitle || promotionTitle ? (
        <div className="mk-pinfo-pills">
          {subtitle ? <span className="mk-pinfo-pill">{subtitle}</span> : null}

          {promotionTitle ? (
            <span className="mk-pinfo-pill mk-pinfo-pill--promo">
              {promotionTitle}
            </span>
          ) : null}
        </div>
      ) : null}

      {showCategories ? (
        <div className="mk-pinfo-categories">
          {categories.map((cat) => {
            const href = String(cat.href ?? "").trim();

            return href ? (
              <Link
                key={`cat-${cat.id}`}
                href={href}
                className="mk-pinfo-category"
              >
                {cat.name}
              </Link>
            ) : (
              <span key={`cat-${cat.id}`} className="mk-pinfo-category">
                {cat.name}
              </span>
            );
          })}
        </div>
      ) : null}

      {showTags ? (
        <div className="mk-pinfo-tags">
          {tags.map((tag) => {
            const label = tagLabel(tag);
            const href = tagHref(tag);

            if (!label) return null;

            return href ? (
              <Link
                key={`tag-${tag.id || label}`}
                href={href}
                className="mk-pinfo-tag"
              >
                {label}
              </Link>
            ) : (
              <span key={`tag-${tag.id || label}`} className="mk-pinfo-tag">
                {label}
              </span>
            );
          })}
        </div>
      ) : null}

      {canShowPurchaseCount ? (
        <div className="mk-pinfo-purchaseCount">
          تم شراء هذا المنتج {formatNumber(purchaseCount, 0)} مرة
        </div>
      ) : null}

      {!productOptions.hide_top_price ? (
        <div className="mk-pinfo-priceRow">
          <div className="mk-pinfo-price">
            {safePrice != null ? (
              Number(safePrice) <= 0 && showDash ? (
                "—"
              ) : (
                <>
                  {priceStartFrom ? "يبدأ من " : ""}
                  <Money
                    value={safePrice}
                    currencySymbol={currencySymbol}
                    currencyDecimals={currencyDecimals}
                  />
                </>
              )
            ) : showDash ? (
              "—"
            ) : (
              ""
            )}
          </div>

          {productOptions.show_discounted_amount &&
          safePrice != null &&
          safeCompare != null &&
          safeCompare > safePrice ? (
            <div className="mk-pinfo-compare">
              <Money
                value={safeCompare}
                currencySymbol={currencySymbol}
                currencyDecimals={currencyDecimals}
              />
            </div>
          ) : null}

          {discountLabel ? (
            <div className="mk-pinfo-discount">{discountLabel}</div>
          ) : (
            <span className="mk-pinfo-priceSpacer" />
          )}
        </div>
      ) : null}

      {showTaxIncludedNote ? (
        <div className="mk-pinfo-taxNote">شامل الضريبة</div>
      ) : null}

      {shouldShowCountdown && saleEnd ? (
        <div className="mk-pinfo-countdown">
          <ProductCountdown target={saleEnd} />
        </div>
      ) : null}

      {hasWeightBox ? (
        <div className="mk-pinfo-metaBox">
          {showWeight && shipping?.weight != null ? (
            <div>
              الوزن: {shipping.weight} {shipping.weight_unit || "kg"}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasIdentifiersBox ? (
        <div className="mk-pinfo-metaBox">
          {showSku && identifiers?.sku ? (
            <div>SKU: {identifiers.sku}</div>
          ) : null}

          {showHsCode && identifiers?.mpn ? (
            <div>HS: {identifiers.mpn}</div>
          ) : null}

          {identifiers?.gtin ? <div>GTIN: {identifiers.gtin}</div> : null}
        </div>
      ) : null}

      <div className="mk-pinfo-options">
        {(Array.isArray(options) ? options : []).map((opt: any) => {
          const optionId = String(opt?.id ?? "");
          const optionName = String(opt?.name ?? "").trim();
          const values = Array.isArray(opt?.values) ? opt.values : [];

          if (!optionId || !optionName || values.length === 0) return null;

          const kind = optionKind(opt);
          const displayType = optionDisplayType(opt);
          const enhanced =
            kind === "multiple"
              ? productOptions.show_multipleOption
              : productOptions.show_singleSelection;

          const allowed = allowedByOption.get(optionId);

          return (
            <div
              key={`opt-${optionId}`}
              className={[
                "mk-pinfo-option",
                `mk-pinfo-option--${kind}`,
                enhanced ? "mk-pinfo-option--enhanced" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="mk-pinfo-option__label">{optionName}</div>

              <div className="mk-pinfo-option__values">
                {values.map((v: any) => {
                  const valueId = String(v?.id ?? "");
                  const label = String(v?.display_value ?? v?.name ?? "").trim();

                  if (!valueId || !label) return null;

                  const active = selectedSet.has(valueId);
                  const disabled = allowed ? !allowed.has(valueId) : false;
                  const color = displayType === "color" ? readOptionColor(v) : "";
                  const image = displayType === "image" ? readOptionImage(v) : "";
                  const visualType = color ? "color" : image ? "image" : "text";

                  return (
                    <button
                      key={`val-${optionId}-${valueId}`}
                      type="button"
                      disabled={disabled}
                      title={disabled ? `${label} - نفدت الكمية` : label}
                      aria-label={disabled ? `${label} - نفدت الكمية` : label}
                      onClick={() => {
                        if (disabled) return;
                        onSelectOption?.(optionId, valueId);
                      }}
                      className={[
                        "mk-pinfo-option__btn",
                        visualType === "color"
                          ? "mk-pinfo-option__btn--color"
                          : "",
                        visualType === "image"
                          ? "mk-pinfo-option__btn--image"
                          : "",
                        active ? "is-active" : "",
                        disabled ? "is-disabled is-soldout" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {visualType === "color" ? (
                        <span
                          className="mk-pinfo-option__swatch"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                      ) : null}

                      {visualType === "image" ? (
                        <span className="mk-pinfo-option__image">
                          <img src={image} alt="" loading="lazy" />
                        </span>
                      ) : null}

                      <span className="mk-pinfo-option__btnText">{label}</span>

                      {disabled ? (
                        <span className="mk-pinfo-option__soldoutText">
                          نفد
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {visibleSizeGuides.length ? (
        <div className="mk-pinfo-sizeGuides">
          <div className="mk-pinfo-sizeGuides__list">
            {visibleSizeGuides.map((guide) => (
              <button
                key={`size-guide-${guide.id}`}
                type="button"
                className="mk-pinfo-sizeGuideBtn"
                onClick={() => setActiveSizeGuideId(guide.id)}
              >
                <span>{guide.title}</span>
                <b>عرض</b>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sizeGuidePortalReady && activeSizeGuide
        ? createPortal(
            <div
              className="mk-sizeGuideModalOverlay"
              role="presentation"
              onClick={() => setActiveSizeGuideId("")}
            >
              <div
                className="mk-sizeGuideModal"
                role="dialog"
                aria-modal="true"
                aria-label={activeSizeGuide.title}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mk-sizeGuideModal__head">
                  <button
                    type="button"
                    className="mk-sizeGuideModal__close"
                    onClick={() => setActiveSizeGuideId("")}
                    aria-label="إغلاق"
                  >
                    ×
                  </button>

                  <h2>{activeSizeGuide.title}</h2>
                </div>

                <div className="mk-sizeGuideModal__body">
                  {activeSizeGuide.contentHtml ? (
                    <div
                      className="mk-sizeGuideModal__content"
                      dangerouslySetInnerHTML={{
                        __html: activeSizeGuide.contentHtml,
                      }}
                    />
                  ) : activeSizeGuideTextLines.length ? (
                    <div className="mk-sizeGuideModal__content">
                      {activeSizeGuideTextLines.map((line, index) => (
                        <p key={`size-guide-line-${index}`}>{line}</p>
                      ))}
                    </div>
                  ) : activeSizeGuide.contentText ? (
                    <div className="mk-sizeGuideModal__content">
                      <p>{activeSizeGuide.contentText}</p>
                    </div>
                  ) : (
                    <div className="mk-sizeGuideModal__empty">
                      لا توجد تفاصيل لجدول المقاسات.
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {showPayments ? (
        <div className="mk-pinfo-payments">
          <div className="mk-pinfo-payments__title">وسائل الدفع</div>

          <div className="mk-pinfo-payments__logos">
            {payments.map((p: any, index) => {
              const src = String(p?.image_url || p?.src || p?.url || "").trim();
              if (!src) return null;

              return (
                <span
                  key={`payment-${src}-${index}`}
                  className="mk-pinfo-paymentLogo"
                  title={p?.label || paymentLabelFromSrc(src)}
                >
                  <img src={src} alt={p?.label || paymentLabelFromSrc(src)} />
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
