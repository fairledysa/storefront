// FILE: apps/storefront/src/themes/malak/screens-mobile/home/HomeMobileScreen.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";

import type {
  HomeDynamicItem,
  HomeDynamicSection,
} from "../../screens/home/_dynamic/types";

import DynamicThemeIcon from "../../screens/home/_dynamic/icons";

import {
  getImageFromValue,
  getTextValue,
  getValueText,
  s,
} from "../../screens/home/_dynamic/utils";

import { resolveLinkHref } from "../../screens/home/_dynamic/link-utils";

import {
  buildDynamicSections,
  getAdvancedCollectionProducts,
  getAdvancedCollectionTabs,
  getCountdownContent,
  getCountdownParts,
  getProductsTabs,
  getSectionValues,
  isAdvancedProductsCollectionSection,
  isBannersSliderSection,
  isCircleLinksSection,
  isCountdownOfferSection,
  isDoubleBannerSection,
  isProductsTabsSection,
  isResponsiveHeroSliderSection,
  isSquareLinksSection,
  isStatsSection,
  isTripleBannerSection,
  isWideBannerSection,
} from "../../screens/home/_dynamic/section-utils";

type Props = {
  data?: any;
  seoMode?: any;
};

type ImageLinksGridLayout = "2" | "3" | "3_inline" | "4" | "4_inline";

function normalizeImageLinksGridLayout(value: unknown): ImageLinksGridLayout {
  const layout = s(value);

  if (layout === "3_inline") return "3_inline";
  if (layout === "4_inline") return "4_inline";
  if (layout === "4") return "4";
  if (layout === "3") return "3";

  return "2";
}

function resolveGridHref(linkValue: any, data: any, seoMode: any) {
  if (!linkValue) return "#";

  const href = resolveLinkHref(linkValue, data, seoMode);
  return href || "#";
}

function cleanDynamicText(value: any) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text === "[object Object]" ? "" : text;
  }

  if (typeof value === "object") {
    const text =
      getValueText(value?.text) ||
      getValueText(value?.title) ||
      getValueText(value?.name) ||
      getValueText(value?.label) ||
      getValueText(value?.value) ||
      "";

    return text === "[object Object]" ? "" : text;
  }

  const text = getValueText(value) || "";
  return text === "[object Object]" ? "" : text;
}

function resolveCurrenciesFromData(data: any) {
  return (
    data?.bootstrap?.currencies ||
    data?.currencies ||
    data?.store?.currencies ||
    data?.theme?.currencies ||
    data?.settings?.currencies ||
    null
  );
}

function resolveTaxFromData(data: any) {
  return (
    data?.bootstrap?.tax ||
    data?.theme?.bootstrap?.tax ||
    data?.themeData?.bootstrap?.tax ||
    data?.theme_data?.bootstrap?.tax ||
    data?.storefront?.bootstrap?.tax ||
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
    data?.themeOptions?.tax ||
    data?.theme_options?.tax ||
    null
  );
}

function getProductHref(product: any) {
  return (
    s(product?.href) ||
    s(product?.url) ||
    s(product?.permalink) ||
    s(product?.link) ||
    ""
  );
}

function normalizeProductCard(args: {
  product: any;
  currencies?: any;
  tax?: any;
}): ProductCardVM | null {
  const product = args.product;
  if (!product) return null;

  const href = getProductHref(product);

  const vm = toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...product,
      href: href || product?.href,
      showDashInstead: true,
    },
  } as any);

  if (!s((vm as any)?.id) && !s((vm as any)?.title)) return null;

  return vm;
}

function normalizeProductCards(args: {
  products: any[];
  currencies?: any;
  tax?: any;
  limit?: number;
}) {
  const rows = Array.isArray(args.products) ? args.products : [];
  const limit = Number(args.limit || 0);

  const slicedRows = limit > 0 ? rows.slice(0, limit) : rows;

  return slicedRows
    .map((product) =>
      normalizeProductCard({
        product,
        currencies: args.currencies,
        tax: args.tax,
      }),
    )
    .filter(Boolean) as ProductCardVM[];
}

function clampDecimals(value: unknown, fallback = 2) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function formatVmMoney(product: ProductCardVM, field: "price" | "compare") {
  const row: any = product || {};

  const direct =
    field === "price"
      ? s(
          row.priceText ||
            row.price_text ||
            row.priceFormatted ||
            row.price_formatted,
        )
      : s(
          row.comparePriceText ||
            row.compare_price_text ||
            row.compareAtPriceFormatted ||
            row.compare_at_price_formatted,
        );

  if (direct) return direct;

  const amount = field === "price" ? row.price : row.compareAtPrice;
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric <= 0) return "";

  if (field === "compare") {
    const price = Number(row.price);
    if (Number.isFinite(price) && numeric <= price) return "";
  }

  const decimals = clampDecimals(
    row.currencyDecimals ??
      row.currency_decimals ??
      row.decimal_digits ??
      row.decimals,
    2,
  );

  const symbol =
    s(row.currencySymbol) ||
    s(row.currency_symbol) ||
    s(row.symbol) ||
    s(row.currency_code) ||
    s(row.currencyCode) ||
    s(row.currency);

  const formatted = new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(numeric);

  return `${formatted}${symbol ? ` ${symbol}` : ""}`.trim();
}

function MobileSectionTitle({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  if (!title && !description) return null;

  return (
    <div className="mk-mobile-home-title">
      {title ? <h2 className="mk-mobile-home-title__main">{title}</h2> : null}

      {description ? (
        <p className="mk-mobile-home-title__desc">{description}</p>
      ) : null}
    </div>
  );
}

function MobileBannersSection({
  section,
  items,
}: {
  section: HomeDynamicSection;
  items: HomeDynamicItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="mk-mobile-home-section">
      <MobileSectionTitle title={section.title} />

      <div className="mk-mobile-banners-scroll">
        {items.map((item, index) => (
          <a
            key={`${item.src}-${item.href}-${index}`}
            href={item.href || "#"}
            className="mk-mobile-banner-card mk-mobile-banner-card--slider"
            aria-label={item.title || `banner-${index + 1}`}
          >
            <img
              src={item.src}
              alt={item.title || "banner"}
              loading={index === 0 ? "eager" : "lazy"}
              className="mk-mobile-banner-img mk-mobile-banner-img--wide"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

function MobileWideBannerSection({
  section,
  items,
}: {
  section: HomeDynamicSection;
  items: HomeDynamicItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="mk-mobile-home-section">
      <MobileSectionTitle title={section.title} />

      <div className="mk-mobile-wide-stack">
        {items.map((item, index) => (
          <a
            key={`${item.src}-${item.href}-${index}`}
            href={item.href || "#"}
            className="mk-mobile-banner-card mk-mobile-banner-card--wide"
            aria-label={item.title || `wide-banner-${index + 1}`}
          >
            <img
              src={item.src}
              alt={item.title || "wide banner"}
              loading={index === 0 ? "eager" : "lazy"}
              className="mk-mobile-banner-img mk-mobile-banner-img--wide"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

function MobileGridBannersSection({
  section,
  items,
  limit,
}: {
  section: HomeDynamicSection;
  items: HomeDynamicItem[];
  limit: number;
}) {
  const visibleItems = items.slice(0, limit);

  if (!visibleItems.length) return null;

  return (
    <section className="mk-mobile-home-section">
      <MobileSectionTitle title={section.title} />

      <div className="mk-mobile-grid-banners">
        {visibleItems.map((item, index) => (
          <a
            key={`${item.src}-${item.href}-${index}`}
            href={item.href || "#"}
            className={[
              "mk-mobile-banner-card",
              "mk-mobile-banner-card--grid",
              limit === 3 && index === 0
                ? "mk-mobile-banner-card--span"
                : "",
            ].join(" ")}
            aria-label={item.title || `banner-${index + 1}`}
          >
            <img
              src={item.src}
              alt={item.title || "banner"}
              loading={index === 0 ? "eager" : "lazy"}
              className={[
                "mk-mobile-banner-img",
                limit === 3 && index === 0
                  ? "mk-mobile-banner-img--wide"
                  : "mk-mobile-banner-img--square",
              ].join(" ")}
            />
          </a>
        ))}
      </div>
    </section>
  );
}

function MobileLinksSection({
  section,
  items,
  variant,
}: {
  section: HomeDynamicSection;
  items: HomeDynamicItem[];
  variant: "circle" | "square";
}) {
  const values = getSectionValues(section);

  const title =
    getTextValue(values, ["field_1", "title", "heading"]) || section.title;

  const description = getTextValue(values, [
    "field_2",
    "description",
    "subtitle",
    "sub_title",
    "text",
  ]);

  if (!items.length) return null;

  return (
    <section className="mk-mobile-home-section--lg">
      <MobileSectionTitle title={title} description={description} />

      <div
        className={[
          "mk-mobile-links-scroll",
          variant === "square"
            ? "mk-mobile-links-scroll--square"
            : "mk-mobile-links-scroll--circle",
        ].join(" ")}
      >
        {items.map((item, index) => {
          const itemTitle = cleanDynamicText(item.title);
          const itemDescription = cleanDynamicText(item.description);

          return (
            <a
              key={`${item.src}-${item.href}-${index}`}
              href={item.href || "#"}
              className={[
                "mk-mobile-link",
                variant === "square"
                  ? "mk-mobile-link--square"
                  : "mk-mobile-link--circle",
              ].join(" ")}
              aria-label={itemTitle || `link-${index + 1}`}
            >
              <span
                className={[
                  "mk-mobile-link__image",
                  variant === "square"
                    ? "mk-mobile-link__image--square"
                    : "mk-mobile-link__image--circle",
                ].join(" ")}
              >
                <img
                  src={item.src}
                  alt={itemTitle || "link"}
                  loading={index < 6 ? "eager" : "lazy"}
                />
              </span>

              {itemTitle ? (
                <span
                  className={[
                    "mk-mobile-link__title",
                    variant === "square"
                      ? "mk-mobile-link__title--square"
                      : "mk-mobile-link__title--circle",
                  ].join(" ")}
                >
                  {itemTitle}
                </span>
              ) : null}

              {variant === "circle" && itemDescription ? (
                <span className="mk-mobile-link__desc">{itemDescription}</span>
              ) : null}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function MobileStatsSection({ section }: { section: HomeDynamicSection }) {
  const values = getSectionValues(section);

  const eyebrow = getTextValue(values, ["field_1", "eyebrow", "badge"]);
  const title = getTextValue(values, ["field_2", "title", "heading"]);
  const description = getTextValue(values, [
    "field_3",
    "description",
    "subtitle",
    "text",
  ]);

  const image = getImageFromValue(values?.field_4);

  const bgColor = s(values?.field_5) || "#FFFFFF";
  const accentColor = s(values?.field_6) || "var(--mk-color-primary)";

  const rows = Array.isArray(values?.field_7) ? values.field_7 : [];

  const items = rows
    .map((row: any, index: number) => {
      const icon =
        s(row?.field_1?.value) ||
        s(row?.field_1?.icon) ||
        s(row?.field_1) ||
        s(row?.icon) ||
        "Store01";

      const value =
        getTextValue(row, ["field_2", "value", "number"]) ||
        s(row?.field_2) ||
        "";

      const label =
        getTextValue(row, ["field_3", "label", "title", "name"]) ||
        s(row?.field_3) ||
        "";

      const itemDescription =
        getTextValue(row, ["field_4", "description", "subtitle", "text"]) ||
        s(row?.field_4) ||
        "";

      if (!value && !label && !itemDescription && !icon) return null;

      return {
        id: s(row?.id) || `mobile-stat-${index}`,
        icon,
        value,
        label,
        description: itemDescription,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    icon: string;
    value: string;
    label: string;
    description: string;
  }>;

  if (!eyebrow && !title && !description && !image && !items.length) {
    return null;
  }

  return (
    <section className="mk-mobile-stats">
      <div className="mk-mobile-stats__card" style={{ background: bgColor }}>
        {image ? (
          <div className="mk-mobile-stats__imageBox">
            <img
              src={image}
              alt={title || "stats"}
              loading="lazy"
              className="mk-mobile-stats__image"
            />
          </div>
        ) : null}

        {eyebrow || title || description ? (
          <div className="mk-mobile-stats__head">
            {eyebrow ? (
              <div
                className="mk-mobile-stats__eyebrow"
                style={{ color: accentColor }}
              >
                {eyebrow}
              </div>
            ) : null}

            {title ? <h2 className="mk-mobile-stats__title">{title}</h2> : null}

            {description ? (
              <p className="mk-mobile-stats__desc">{description}</p>
            ) : null}
          </div>
        ) : null}

        {items.length ? (
          <div className="mk-mobile-stats__grid">
            {items.map((item) => (
              <article key={item.id} className="mk-mobile-stats__item">
                <div className="mk-mobile-stats__top">
                  <span
                    className="mk-mobile-stats__icon"
                    style={{ background: accentColor }}
                  >
                    <DynamicThemeIcon name={item.icon} className="text-lg" />
                  </span>

                  {item.value ? (
                    <div className="mk-mobile-stats__value" dir="ltr">
                      {item.value}
                    </div>
                  ) : null}
                </div>

                {item.label ? (
                  <h3 className="mk-mobile-stats__label">{item.label}</h3>
                ) : null}

                {item.description ? (
                  <p className="mk-mobile-stats__itemDesc">
                    {item.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MobileCountdownCircle({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="mk-mobile-countdown-circle">
      <div className="mk-mobile-countdown-circle__value" dir="ltr">
        {String(value).padStart(2, "0")}
      </div>
      <div className="mk-mobile-countdown-circle__label">{label}</div>
    </div>
  );
}

function MobileCountdownOfferSection({
  section,
  data,
  seoMode,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
}) {
  const content = getCountdownContent(section);
  const [parts, setParts] = useState(() => getCountdownParts(content.target));

  useEffect(() => {
    setParts(getCountdownParts(content.target));

    const timer = window.setInterval(() => {
      setParts(getCountdownParts(content.target));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [content.target]);

  if (!content.image) return null;

  const href = content.buttonHref
    ? resolveLinkHref(content.buttonHref, data, seoMode)
    : "#";

  return (
    <section className="mk-mobile-offer">
      <div className="mk-mobile-offer__card">
        <img
          src={content.image}
          alt={content.title || section.title || "offer"}
          loading="lazy"
          className="mk-mobile-offer__img"
        />

        <div className="mk-mobile-offer__shade" />

        <div className="mk-mobile-offer__content">
          {content.title ? (
            <h2 className="mk-mobile-offer__title">{content.title}</h2>
          ) : null}

          {content.subtitle ? (
            <p className="mk-mobile-offer__desc">{content.subtitle}</p>
          ) : null}

          {content.target ? (
            <div className="mk-mobile-offer__timer" dir="rtl">
              <MobileCountdownCircle
                value={parts.days}
                label={content.labels.days}
              />
              <MobileCountdownCircle
                value={parts.hours}
                label={content.labels.hours}
              />
              <MobileCountdownCircle
                value={parts.minutes}
                label={content.labels.minutes}
              />
              <MobileCountdownCircle
                value={parts.seconds}
                label={content.labels.seconds}
              />
            </div>
          ) : null}

          {content.buttonText ? (
            <a href={href || "#"} className="mk-mobile-offer__button">
              {content.buttonText}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MobileProductCard({ product }: { product: ProductCardVM }) {
  const item: any = product || {};

  const title = s(item.title);
  const href = s(item.href) || "#";
  const imageUrl = s(item.imageUrl || item.image_url || item.thumbnail_url);
  const brand = s(item.brand || item.brandName || item.brand_name);

  const priceText = formatVmMoney(product, "price");
  const compareText = formatVmMoney(product, "compare");

  return (
    <a href={href} className="mk-mobile-product-card">
      <div className="mk-mobile-product-card__imageBox">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || "product"}
            loading="lazy"
            className="mk-mobile-product-card__image"
          />
        ) : null}
      </div>

      <div className="mk-mobile-product-card__body">
        {brand ? (
          <div className="mk-mobile-product-card__brand">{brand}</div>
        ) : null}

        {title ? (
          <h3 className="mk-mobile-product-card__title">{title}</h3>
        ) : null}

        <div className="mk-mobile-product-card__priceRow">
          {compareText ? (
            <span className="mk-mobile-product-card__compare">
              {compareText}
            </span>
          ) : (
            <span />
          )}

          {priceText ? (
            <span className="mk-mobile-product-card__price" dir="rtl">
              {priceText}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}

function MobileProductsTabsSection({
  section,
  data,
  seoMode,
  currencies,
  tax,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
  currencies?: any;
  tax?: any;
}) {
  const tabs = useMemo(
    () => getProductsTabs(section, data, seoMode),
    [section, data, seoMode],
  );

  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!tabs.length) return;

    setActiveId((current) => {
      if (current && tabs.some((tab) => tab.id === current)) return current;
      return tabs[0].id;
    });
  }, [tabs]);

  if (!tabs.length) return null;

  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0];

  const products = normalizeProductCards({
    products: activeTab.products,
    currencies,
    tax,
    limit: activeTab.limit || 12,
  });

  return (
    <section className="mk-mobile-products">
      <MobileSectionTitle title={section.title || activeTab.title} />

      <div className="mk-mobile-products-tabs">
        {tabs.map((tab) => {
          const active = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={[
                "mk-mobile-products-tabs__btn",
                active ? "is-active" : "",
              ].join(" ")}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      {products.length ? (
        <div className="mk-mobile-products-grid">
          {products.map((product, index) => (
            <MobileProductCard
              key={`${s((product as any).id) || "product"}-${index}`}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="mk-mobile-products-empty">لا توجد منتجات لعرضها</div>
      )}
    </section>
  );
}

function MobileAdvancedProductsCollectionSection({
  section,
  data,
  seoMode,
  currencies,
  tax,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
  currencies?: any;
  tax?: any;
}) {
  const values = getSectionValues(section);

  const title = getTextValue(values, ["field_1", "title", "heading"]);
  const description = getTextValue(values, [
    "field_2",
    "description",
    "subtitle",
    "text",
  ]);

  const image = getImageFromValue(values?.field_3);
  const tabsEnabled = Boolean(values?.field_7);

  const tabs = useMemo(
    () =>
      tabsEnabled
        ? getAdvancedCollectionTabs(values, section, data, seoMode)
        : [],
    [tabsEnabled, values, section, data, seoMode],
  );

  const rawProducts = useMemo(
    () =>
      tabsEnabled ? [] : getAdvancedCollectionProducts(values, data, seoMode),
    [tabsEnabled, values, data, seoMode],
  );

  const [activeTabId, setActiveTabId] = useState("");

  useEffect(() => {
    if (!tabsEnabled || !tabs.length) return;

    setActiveTabId((current) => {
      if (current && tabs.some((tab) => tab.id === current)) return current;
      return tabs[0].id;
    });
  }, [tabsEnabled, tabs]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const visibleRawProducts = tabsEnabled ? activeTab?.products || [] : rawProducts;

  const products = normalizeProductCards({
    products: visibleRawProducts,
    currencies,
    tax,
    limit: 12,
  });

  if (!title && !description && !image && !products.length) return null;

  return (
    <section className="mk-mobile-products">
      <MobileSectionTitle
        title={title || section.title}
        description={description}
      />

      {image ? (
        <div className="mk-mobile-wide-stack">
          <div className="mk-mobile-banner-card mk-mobile-banner-card--wide">
            <img
              src={image}
              alt={title || section.title || "collection"}
              loading="lazy"
              className="mk-mobile-banner-img mk-mobile-banner-img--wide"
            />
          </div>
        </div>
      ) : null}

      {tabsEnabled && tabs.length ? (
        <div className="mk-mobile-products-tabs">
          {tabs.map((tab) => {
            const active = tab.id === activeTab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "mk-mobile-products-tabs__btn",
                  active ? "is-active" : "",
                ].join(" ")}
              >
                {tab.title}
              </button>
            );
          })}
        </div>
      ) : null}

      {products.length ? (
        <div className="mk-mobile-products-grid">
          {products.map((product, index) => (
            <MobileProductCard
              key={`${s((product as any).id) || "product"}-${index}`}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="mk-mobile-products-empty">لا توجد منتجات لعرضها</div>
      )}
    </section>
  );
}

function MobileResponsiveHeroSliderSection({
  section,
  data,
  seoMode,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
}) {
  const values = getSectionValues(section);

  const rows = Array.isArray(values?.field_1)
    ? values.field_1
    : Array.isArray(values?.slides)
      ? values.slides
      : Array.isArray(values?.items)
        ? values.items
        : [];

  const slides = rows
    .map((row: any, index: number) => {
      const title =
        getTextValue(row, ["field_1", "title", "heading"]) ||
        getValueText(row?.field_1) ||
        "";

      const description =
        getTextValue(row, ["field_2", "description", "subtitle", "text"]) ||
        getValueText(row?.field_2) ||
        "";

      const buttonText =
        getTextValue(row, ["field_3", "button_text", "buttonText", "cta"]) ||
        getValueText(row?.field_3) ||
        "";

      const linkValue =
        row?.field_4 ||
        row?.link ||
        row?.href ||
        row?.button_link ||
        row?.buttonLink ||
        "";

      const desktopImage =
        getImageFromValue(row?.field_5) ||
        getImageFromValue(row?.desktop_image) ||
        getImageFromValue(row?.desktopImage) ||
        getImageFromValue(row?.image);

      const mobileImage =
        getImageFromValue(row?.field_6) ||
        getImageFromValue(row?.mobile_image) ||
        getImageFromValue(row?.mobileImage) ||
        desktopImage;

      const image = mobileImage || desktopImage;

      if (!image) return null;

      return {
        id: s(row?.id) || `${section.id}-mobile-slide-${index}`,
        title,
        description,
        buttonText,
        href: linkValue ? resolveLinkHref(linkValue, data, seoMode) : "#",
        image,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    title: string;
    description: string;
    buttonText: string;
    href: string;
    image: string;
  }>;

  if (!slides.length) return null;

  return (
    <section dir="rtl" className="mk-mhero">
      <div className="mk-mhero__wrap">
        <Swiper
          className="mk-mhero__swiper"
          modules={[Pagination, Autoplay]}
          loop={slides.length > 1}
          centeredSlides
          slidesPerView={1}
          spaceBetween={10}
          autoplay={
            slides.length > 1
              ? { delay: 3500, disableOnInteraction: false }
              : false
          }
          pagination={slides.length > 1 ? { clickable: true } : false}
        >
          {slides.map((slide, index) => {
            const hasText =
              Boolean(slide.title) ||
              Boolean(slide.description) ||
              Boolean(slide.buttonText);

            return (
              <SwiperSlide key={slide.id} className="mk-mhero__slide">
                <div className="mk-mhero__slideInner">
                  <Link
                    href={slide.href || "#"}
                    className="mk-mhero__link"
                    aria-label={slide.title || `slide-${index + 1}`}
                  >
                    <img
                      className="mk-mhero__img"
                      src={slide.image}
                      alt={slide.title || `slide-${index + 1}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                    />

                    {hasText ? (
                      <div className="mk-mhero__content">
                        {slide.title ? (
                          <h2 className="mk-mhero__title">{slide.title}</h2>
                        ) : null}

                        {slide.description ? (
                          <p className="mk-mhero__desc">{slide.description}</p>
                        ) : null}

                        {slide.buttonText ? (
                          <span className="mk-mhero__button">
                            {slide.buttonText}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </Link>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}

function isImageLinksGridSection(section: HomeDynamicSection) {
  const key = s(section.key);
  const slug = s(section.slug);
  const renderKey = s(section.renderKey);
  const rawKey = s(section.raw?.key);
  const rawId = s(section.raw?.id);

  return (
    key === "image_links_grid" ||
    slug === "image_links_grid" ||
    renderKey === "image_links_grid" ||
    rawKey === "image_links_grid" ||
    rawId === "image_links_grid"
  );
}

function getMobileImageLinksGridItems(
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
) {
  const values = getSectionValues(section);
  const layout = normalizeImageLinksGridLayout(values?.field_1);

  const allItems = [
    {
      image: getImageFromValue(values?.field_2),
      alt: getTextValue(values, ["field_3"]) || s(values?.field_3),
      link: values?.field_4,
    },
    {
      image: getImageFromValue(values?.field_5),
      alt: getTextValue(values, ["field_6"]) || s(values?.field_6),
      link: values?.field_7,
    },
    {
      image: getImageFromValue(values?.field_8),
      alt: getTextValue(values, ["field_9"]) || s(values?.field_9),
      link: values?.field_10,
    },
    {
      image: getImageFromValue(values?.field_11),
      alt: getTextValue(values, ["field_12"]) || s(values?.field_12),
      link: values?.field_13,
    },
  ];

  const limit =
    layout === "4" || layout === "4_inline"
      ? 4
      : layout === "3" || layout === "3_inline"
        ? 3
        : 2;

  return {
    layout,
    items: allItems
      .slice(0, limit)
      .map((item, index) => ({
        id: `${section.id}-mobile-image-links-grid-${index + 1}`,
        src: item.image,
        alt: item.alt || section.title || `banner-${index + 1}`,
        href: resolveGridHref(item.link, data, seoMode),
      }))
      .filter((item) => item.src),
  };
}

function MobileImageLinksGridSection({
  section,
  data,
  seoMode,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
}) {
  const { layout, items } = getMobileImageLinksGridItems(section, data, seoMode);

  if (!items.length) return null;

  return (
    <section className="mk-mobile-home-section">
      <div
        className={[
          "mk-mobile-image-links-grid",
          layout === "2" ? "mk-mobile-image-links-grid--two" : "",
          layout === "3" ? "mk-mobile-image-links-grid--three" : "",
          layout === "3_inline"
            ? "mk-mobile-image-links-grid--three-inline"
            : "",
          layout === "4" ? "mk-mobile-image-links-grid--four" : "",
          layout === "4_inline"
            ? "mk-mobile-image-links-grid--four-inline"
            : "",
        ].join(" ")}
        dir="rtl"
      >
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={item.href || "#"}
            className="mk-mobile-image-links-grid__card"
            aria-label={item.alt || `image-link-${index + 1}`}
          >
            <img
              src={item.src}
              alt={item.alt || "banner"}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              className="mk-mobile-image-links-grid__img"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function MobileDynamicSectionRenderer({
  section,
  data,
  seoMode,
  currencies,
  tax,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
  currencies?: any;
  tax?: any;
}) {
  if (isResponsiveHeroSliderSection(section)) {
    return (
      <MobileResponsiveHeroSliderSection
        section={section}
        data={data}
        seoMode={seoMode}
      />
    );
  }

  if (isImageLinksGridSection(section)) {
    return (
      <MobileImageLinksGridSection
        section={section}
        data={data}
        seoMode={seoMode}
      />
    );
  }

  if (isCountdownOfferSection(section)) {
    return (
      <MobileCountdownOfferSection
        section={section}
        data={data}
        seoMode={seoMode}
      />
    );
  }

  if (isProductsTabsSection(section)) {
    return (
      <MobileProductsTabsSection
        section={section}
        data={data}
        seoMode={seoMode}
        currencies={currencies}
        tax={tax}
      />
    );
  }

  if (isAdvancedProductsCollectionSection(section)) {
    return (
      <MobileAdvancedProductsCollectionSection
        section={section}
        data={data}
        seoMode={seoMode}
        currencies={currencies}
        tax={tax}
      />
    );
  }

  if (isStatsSection(section)) {
    return <MobileStatsSection section={section} />;
  }

  if (isCircleLinksSection(section)) {
    return (
      <MobileLinksSection
        section={section}
        items={section.items}
        variant="circle"
      />
    );
  }

  if (isSquareLinksSection(section)) {
    return (
      <MobileLinksSection
        section={section}
        items={section.items}
        variant="square"
      />
    );
  }

  if (isTripleBannerSection(section)) {
    return (
      <MobileGridBannersSection
        section={section}
        items={section.items}
        limit={3}
      />
    );
  }

  if (isDoubleBannerSection(section)) {
    return (
      <MobileGridBannersSection
        section={section}
        items={section.items}
        limit={2}
      />
    );
  }

  if (isWideBannerSection(section)) {
    return <MobileWideBannerSection section={section} items={section.items} />;
  }

  if (isBannersSliderSection(section)) {
    return <MobileBannersSection section={section} items={section.items} />;
  }

  if (section.items.length) {
    return <MobileBannersSection section={section} items={section.items} />;
  }

  return null;
}

export default function HomeMobileScreen({ data, seoMode }: Props) {
  const dynamicSections = buildDynamicSections(data, seoMode);
  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);

  return (
    <div className="mk-mobile-home">
      {dynamicSections.map((section) => (
        <MobileDynamicSectionRenderer
          key={section.id}
          section={section}
          data={data}
          seoMode={seoMode}
          currencies={currencies}
          tax={tax}
        />
      ))}
    </div>
  );
}