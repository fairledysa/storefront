// FILE: apps/storefront/src/themes/malak/screens-mobile/home/HomeMobileScreen.tsx
"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";

import type {
  HomeDynamicItem,
  HomeDynamicSection,
  TestimonialItem,
  TestimonialNameMode,
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
  fetchStoreTestimonialsPage,
  formatTestimonialDate,
  getAdvancedCollectionProducts,
  getAdvancedCollectionTabs,
  getCountdownContent,
  getCountdownParts,
  getFaqContent,
  getFeaturedMosaicOfferContent,
  getProductsTabs,
  getSectionValues,
  getStatsHeroSplitContent,
  getTestimonialsContent,
  isAdvancedProductsCollectionSection,
  isBannersSliderSection,
  isCircleLinksSection,
  isCountdownOfferSection,
  isDoubleBannerSection,
  isFaqSection,
  isFeaturedMosaicOfferSection,
  isProductsTabsSection,
  isResponsiveHeroSliderSection,
  isSmartSearchSection,
  isSquareLinksSection,
  isStatsHeroSplitSection,
  isStatsSection,
  isTestimonialsSection,
  isHtmlContentSection,
  isTripleBannerSection,
  isWideBannerSection,
  maskCustomerName,
} from "../../screens/home/_dynamic/section-utils";

import SmartSearchFromData from "../../components/smart-search/SmartSearchFromData";
import HtmlThemeSections from "../../components/theme-page-tools/HtmlThemeSections";

import MobileHero, {
  type MobileHeroSlide,
} from "./_components/MobileHero";

type Props = {
  data?: any;
  seoMode?: any;
};

type ImageLinksGridLayout = "2" | "3" | "3_inline" | "4" | "4_inline";

type MobileCircleLinkItem = {
  id: string;
  src: string;
  title: string;
  href: string;
};

function normalizeImageLinksGridLayout(value: unknown): ImageLinksGridLayout {
  const layout = s(value);

  if (layout === "3_inline") return "3_inline";
  if (layout === "4_inline") return "4_inline";
  if (layout === "4") return "4";
  if (layout === "3") return "3";

  return "2";
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

function getBooleanFlag(value: any, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;

  const raw = s(value).toLowerCase();

  if (!raw) return fallback;

  return (
    raw === "1" ||
    raw === "true" ||
    raw === "yes" ||
    raw === "on" ||
    raw === "enabled"
  );
}

function resolveGridHref(linkValue: any, data: any, seoMode: any) {
  if (!linkValue) return "#";

  const href = resolveLinkHref(linkValue, data, seoMode);
  return href || "#";
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

function firstNonEmptyImage(values: unknown[]) {
  for (const value of values) {
    const image = s(value);
    if (image) return image;
  }

  return "";
}

function getMediaThumbnail(product: any) {
  const media = Array.isArray(product?.media) ? product.media : [];

  const sorted = media
    .slice()
    .filter((item: any) => {
      return (
        s(item?.thumbnail_url) ||
        s(item?.thumbnailUrl) ||
        s(item?.card_image_url) ||
        s(item?.cardImageUrl) ||
        s(item?.medium_url) ||
        s(item?.mediumUrl) ||
        s(item?.url) ||
        s(item?.original_url) ||
        s(item?.originalUrl)
      );
    })
    .sort((a: any, b: any) => {
      const aDefault = a?.is_default ? 0 : 1;
      const bDefault = b?.is_default ? 0 : 1;

      if (aDefault !== bDefault) return aDefault - bDefault;

      return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
    });

  const first = sorted[0];

  return firstNonEmptyImage([
    first?.thumbnail_url,
    first?.thumbnailUrl,
    first?.card_image_url,
    first?.cardImageUrl,
    first?.medium_url,
    first?.mediumUrl,
    first?.url,
    first?.original_url,
    first?.originalUrl,
  ]);
}

function getPreferredRawProductImage(product: any) {
  return firstNonEmptyImage([
    product?.cardImageUrl,
    product?.card_image_url,
    product?.thumbnailUrl,
    product?.thumbnail_url,
    product?.imageOptimizedUrl,
    product?.image_optimized_url,
    product?.optimizedImageUrl,
    product?.optimized_image_url,
    product?.mediumImageUrl,
    product?.medium_image_url,
    product?.medium_url,
    product?.mediumUrl,
    getMediaThumbnail(product),
    product?.imageUrl,
    product?.image_url,
    product?.image,
    product?.original_url,
    product?.originalUrl,
  ]);
}

function getPreferredVmProductImage(product: any) {
  return firstNonEmptyImage([
    product?.cardImageUrl,
    product?.card_image_url,
    product?.thumbnailUrl,
    product?.thumbnail_url,
    product?.imageOptimizedUrl,
    product?.image_optimized_url,
    product?.optimizedImageUrl,
    product?.optimized_image_url,
    product?.mediumImageUrl,
    product?.medium_image_url,
    product?.medium_url,
    product?.mediumUrl,
    product?.imageUrl,
    product?.image_url,
    product?.image,
    product?.original_url,
    product?.originalUrl,
  ]);
}

function normalizeProductCard(args: {
  product: any;
  currencies?: any;
  tax?: any;
}): ProductCardVM | null {
  const product = args.product;
  if (!product) return null;

  const href = getProductHref(product);
  const preferredRawImage = getPreferredRawProductImage(product);

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

  const currentVmImage = getPreferredVmProductImage(vm as any);
  const finalImage = currentVmImage || preferredRawImage;

  return {
    ...(vm as any),
    cardImageUrl: s((vm as any)?.cardImageUrl) || preferredRawImage || finalImage,
    card_image_url:
      s((vm as any)?.card_image_url) || preferredRawImage || finalImage,
    thumbnailUrl: s((vm as any)?.thumbnailUrl) || preferredRawImage || finalImage,
    thumbnail_url:
      s((vm as any)?.thumbnail_url) || preferredRawImage || finalImage,
    imageOptimizedUrl:
      s((vm as any)?.imageOptimizedUrl) || preferredRawImage || finalImage,
    image_optimized_url:
      s((vm as any)?.image_optimized_url) || preferredRawImage || finalImage,
  } as ProductCardVM;
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

  const formatted = new Intl.NumberFormat("ar-SA-u-nu-latn", {
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

/* =========================================================
   Mobile only circle links
   ========================================================= */

function isMobileCircleLinksSection(section: HomeDynamicSection) {
  const key = s(section.key);
  const slug = s(section.slug);
  const renderKey = s(section.renderKey);
  const rawKey = s(section.raw?.key);
  const rawSlug = s(section.raw?.slug);
  const rawId = s(section.raw?.id);

  return (
    key === "mobile_circle_links" ||
    slug === "mobile_circle_links" ||
    renderKey === "mobile_circle_links" ||
    rawKey === "mobile_circle_links" ||
    rawSlug === "mobile_circle_links" ||
    rawId === "mobile_circle_links"
  );
}

function shouldMergeMobileCircleLinks(section: HomeDynamicSection) {
  const values = getSectionValues(section);
  return getBooleanFlag(values?.field_2, true);
}

function shouldShowMobileCircleLabels(section: HomeDynamicSection) {
  const values = getSectionValues(section);
  return getBooleanFlag(values?.field_3, true);
}

function getMobileCircleLinksItems(
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
): MobileCircleLinkItem[] {
  const values = getSectionValues(section);

  const rows = Array.isArray(values?.field_1)
    ? values.field_1
    : Array.isArray(values?.items)
      ? values.items
      : Array.isArray(values?.links)
        ? values.links
        : [];

  return rows
    .map((row: any, index: number) => {
      const image =
        getImageFromValue(row?.field_1) ||
        getImageFromValue(row?.image) ||
        getImageFromValue(row?.src);

      if (!image) return null;

      const title =
        getTextValue(row, ["field_2", "title", "name", "label"]) ||
        cleanDynamicText(row?.field_2) ||
        cleanDynamicText(row?.title) ||
        "";

      const linkValue =
        row?.field_3 || row?.link || row?.href || row?.url || null;

      return {
        id: s(row?.id) || `${section.id}-mobile-circle-${index}`,
        src: image,
        title,
        href: linkValue ? resolveGridHref(linkValue, data, seoMode) : "#",
      };
    })
    .filter(Boolean) as MobileCircleLinkItem[];
}

function MobileCircleLinksSection({
  section,
  data,
  seoMode,
  merged = false,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
  merged?: boolean;
}) {
  const items = getMobileCircleLinksItems(section, data, seoMode);
  const showLabels = shouldShowMobileCircleLabels(section);

  if (!items.length) return null;

  return (
    <section
      className={[
        "mk-mobile-app-circles",
        merged ? "mk-mobile-app-circles--merged" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      dir="rtl"
    >
      <div className="mk-mobile-app-circles__rail">
        {items.map((item, index) => (
          <a
            key={item.id}
            href={item.href || "#"}
            className="mk-mobile-app-circles__item"
            aria-label={item.title || `رابط ${index + 1}`}
          >
            <span className="mk-mobile-app-circles__image">
              <img
                src={item.src}
                alt={item.title || `رابط ${index + 1}`}
                loading={index < 4 ? "eager" : "lazy"}
                decoding="async"
              />
            </span>

            {showLabels && item.title ? (
              <span className="mk-mobile-app-circles__title">
                {item.title}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   Hero
   ========================================================= */

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
    .filter(Boolean) as MobileHeroSlide[];

  if (!slides.length) return null;

  return <MobileHero slides={slides} />;
}

/* =========================================================
   Banners
   ========================================================= */

function getMobileBannersSliderItems(
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
) {
  const values = getSectionValues(section);

  const rows = Array.isArray(values?.field_1)
    ? values.field_1
    : Array.isArray(values?.banners)
      ? values.banners
      : Array.isArray(values?.items)
        ? values.items
        : [];

  const fromRows = rows
    .map((row: any, index: number) => {
      const mobileImage =
        getImageFromValue(row?.field_3) ||
        getImageFromValue(row?.mobile_image) ||
        getImageFromValue(row?.mobileImage);

      const desktopImage =
        getImageFromValue(row?.field_1) ||
        getImageFromValue(row?.image) ||
        getImageFromValue(row?.desktop_image) ||
        getImageFromValue(row?.desktopImage);

      const src = mobileImage || desktopImage;

      if (!src) return null;

      const linkValue = row?.field_2 || row?.link || row?.href || row?.url || "";

      const title =
        getTextValue(row, ["field_4", "title", "label", "name"]) ||
        cleanDynamicText(row?.title) ||
        section.title ||
        `banner-${index + 1}`;

      return {
        src,
        href: linkValue ? resolveLinkHref(linkValue, data, seoMode) : "#",
        title,
      };
    })
    .filter(Boolean) as HomeDynamicItem[];

  if (fromRows.length) return fromRows;

  return Array.isArray(section.items) ? section.items : [];
}

function MobileBannersSection({
  section,
  data,
  seoMode,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
}) {
  const items = getMobileBannersSliderItems(section, data, seoMode);

  if (!items.length) return null;

  return (
    <section className="mk-mobile-home-section mk-mobile-home-section--banners-slider">
      <div className="mk-mobile-banners-scroll">
        {items.map((item, index) => (
          <a
            key={`${item.src}-${item.href}-${index}`}
            href={item.href || "#"}
            className="mk-mobile-banner-card mk-mobile-banner-card--slider"
            aria-label={item.title || section.title || `banner-${index + 1}`}
          >
            <img
              src={item.src}
              alt={item.title || section.title || "banner"}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
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
  data,
  seoMode,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
}) {
  const values = getSectionValues(section);
  const firstItem = Array.isArray(section.items) ? section.items[0] : null;

  const mobileImage =
    getImageFromValue(values?.field_6) ||
    getImageFromValue(values?.mobile_image) ||
    getImageFromValue(values?.mobileImage);

  const desktopImage =
    getImageFromValue(values?.field_1) ||
    getImageFromValue((firstItem as any)?.src) ||
    "";

  const image = mobileImage || desktopImage;

  const title =
    getTextValue(values, ["field_2", "title", "heading"]) ||
    cleanDynamicText((firstItem as any)?.title) ||
    section.title ||
    "wide-banner";

  const description =
    getTextValue(values, ["field_3", "description", "subtitle", "text"]) ||
    cleanDynamicText((firstItem as any)?.description);

  const linkValue =
    values?.field_4 ||
    (firstItem as any)?.link ||
    (firstItem as any)?.href ||
    null;

  const href = linkValue
    ? resolveGridHref(linkValue, data, seoMode)
    : s((firstItem as any)?.href) || "#";

  if (!image) return null;

  return (
    <section className="mk-mobile-home-section mk-mobile-home-section--wide-banner">
      <div className="mk-mobile-wide-stack">
        <a
          href={href || "#"}
          className="mk-mobile-banner-card mk-mobile-banner-card--wide"
          aria-label={title || description || section.title || "wide-banner"}
        >
          <img
            src={image}
            alt={title || description || section.title || "wide banner"}
            loading="lazy"
            decoding="async"
            className="mk-mobile-banner-img mk-mobile-banner-img--wide"
          />
        </a>
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
  const visibleItems = Array.isArray(items) ? items.slice(0, limit) : [];

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
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={item.title || `banner-${index + 1}`}
          >
            <img
              src={item.src}
              alt={item.title || "banner"}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
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

/* =========================================================
   Image links grid
   ========================================================= */

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
        ]
          .filter(Boolean)
          .join(" ")}
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

/* =========================================================
   Circle / Square links
   ========================================================= */

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

  const safeItems = Array.isArray(items) ? items : [];

  if (!safeItems.length) return null;

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
        {safeItems.map((item, index) => {
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
                  loading={index < 4 ? "eager" : "lazy"}
                  decoding="async"
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

/* =========================================================
   Stats
   ========================================================= */

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
              decoding="async"
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

function MobileStatsHeroSplitSection({
  section,
}: {
  section: HomeDynamicSection;
}) {
  const content = getStatsHeroSplitContent(section);

  if (
    !content.eyebrow &&
    !content.title &&
    !content.highlightedTitle &&
    !content.description &&
    !content.stats.length
  ) {
    return null;
  }

  return (
    <section className="mk-mobile-shs" dir="rtl">
      <div className="mk-mobile-shs__inner">
        <div className="mk-mobile-shs__content">
          {content.eyebrow ? (
            <span className="mk-mobile-shs__eyebrow">{content.eyebrow}</span>
          ) : null}

          {content.title || content.highlightedTitle ? (
            <h2 className="mk-mobile-shs__title">
              {content.title ? <span>{content.title}</span> : null}
              {content.highlightedTitle ? (
                <em>{content.highlightedTitle}</em>
              ) : null}
            </h2>
          ) : null}

          {content.description ? (
            <p className="mk-mobile-shs__desc">{content.description}</p>
          ) : null}
        </div>

        {content.stats.length ? (
          <div className="mk-mobile-shs__stats">
            {content.stats.slice(0, 4).map((item: any, index: number) => {
              const icon = s(item?.icon);

              return (
                <article
                  key={`${item.value}-${item.label}-${index}`}
                  className="mk-mobile-shs__card"
                >
                  {icon ? (
                    <span
                      className="mk-mobile-shs__icon"
                      style={{
                        background: item.iconBg || "var(--mk-color-primary)",
                        borderColor: item.iconBorder || "transparent",
                      }}
                    >
                      <DynamicThemeIcon name={icon} />
                    </span>
                  ) : null}

                  <div className="mk-mobile-shs__number" dir="ltr">
                    {item.value}
                  </div>

                  {item.label ? (
                    <p className="mk-mobile-shs__label">{item.label}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* =========================================================
   Countdown
   ========================================================= */

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

    if (!content.target) return;

    const timer = window.setInterval(() => {
      setParts(getCountdownParts(content.target));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [content.target]);

  if (!content.image) return null;

  const href = content.buttonHref
    ? resolveLinkHref(content.buttonHref, data, seoMode)
    : "#";

  const labels = content.labels || {};

  return (
    <section className="mk-mobile-offer">
      <div className="mk-mobile-offer__card">
        <img
          src={content.image}
          alt={content.title || section.title || "offer"}
          loading="lazy"
          decoding="async"
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
                label={s(labels.days) || "يوم"}
              />
              <MobileCountdownCircle
                value={parts.hours}
                label={s(labels.hours) || "ساعة"}
              />
              <MobileCountdownCircle
                value={parts.minutes}
                label={s(labels.minutes) || "دقيقة"}
              />
              <MobileCountdownCircle
                value={parts.seconds}
                label={s(labels.seconds) || "ثانية"}
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

/* =========================================================
   Products
   ========================================================= */

function MobileProductCard({
  product,
  index = 0,
}: {
  product: ProductCardVM;
  index?: number;
}) {
  const item: any = product || {};

  const title = s(item.title);
  const href = s(item.href) || "#";
  const imageUrl = getPreferredVmProductImage(item);
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
            decoding="async"
            width={336}
            height={350}
            sizes="(max-width: 767px) 50vw, 168px"
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
  const isSingleTab = tabs.length === 1;

  const activeTitle = s((activeTab as any)?.title);
  const activeDescription = s((activeTab as any)?.description);

  const products = normalizeProductCards({
    products: activeTab.products,
    currencies,
    tax,
    limit: (activeTab as any).limit || 12,
  });

  return (
    <section
      className={[
        "mk-mobile-products mk-mobile-products--tabs",
        isSingleTab
          ? "mk-mobile-products--single-tab"
          : "mk-mobile-products--multi-tabs",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isSingleTab ? (
        activeTitle || activeDescription ? (
          <div className="mk-mobile-products-single-head">
            {activeTitle ? (
              <h2 className="mk-mobile-products-single-title">
                {activeTitle}
              </h2>
            ) : null}

            {activeDescription ? (
              <p className="mk-mobile-products-single-desc">
                {activeDescription}
              </p>
            ) : null}
          </div>
        ) : null
      ) : (
        <>
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
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {tab.title}
                </button>
              );
            })}
          </div>

          {activeDescription ? (
            <p className="mk-mobile-products-tabs-desc">
              {activeDescription}
            </p>
          ) : null}
        </>
      )}

      {products.length ? (
        <div className="mk-mobile-products-grid">
          {products.map((product, index) => (
            <MobileProductCard
              key={`${s((product as any).id) || "product"}-${index}`}
              product={product}
              index={index}
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

  const visibleRawProducts = tabsEnabled
    ? activeTab?.products || []
    : rawProducts;

  const products = normalizeProductCards({
    products: visibleRawProducts,
    currencies,
    tax,
    limit: 12,
  });

  if (!title && !description && !image && !products.length) return null;

  return (
    <section className="mk-mobile-advanced-products">
      <div className="mk-mobile-advanced-products__shell">
        {title || description ? (
          <div className="mk-mobile-advanced-products__head">
            {title ? (
              <h2 className="mk-mobile-advanced-products__title">{title}</h2>
            ) : null}

            {description ? (
              <p className="mk-mobile-advanced-products__desc">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        {image ? (
          <div className="mk-mobile-advanced-products__media">
            <img
              src={image}
              alt={title || description || section.title || "collection"}
              loading="lazy"
              decoding="async"
              className="mk-mobile-advanced-products__img"
            />
          </div>
        ) : null}

        {tabsEnabled && tabs.length ? (
          <div className="mk-mobile-advanced-products__tabsWrap">
            <div className="mk-mobile-advanced-products__tabs" dir="rtl">
              {tabs.map((tab) => {
                const active = tab.id === activeTab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    className={[
                      "mk-mobile-advanced-products__tab",
                      active ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {tab.title}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {products.length ? (
          <div className="mk-mobile-advanced-products__grid">
            {products.map((product, index) => (
              <MobileProductCard
                key={`${s((product as any).id) || "product"}-${index}`}
                product={product}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="mk-mobile-products-empty">لا توجد منتجات لعرضها</div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   Featured mosaic offer
   ========================================================= */

function MobileFeaturedMosaicOfferSection({
  section,
  data,
  seoMode,
}: {
  section: HomeDynamicSection;
  data: any;
  seoMode: any;
}) {
  const content = getFeaturedMosaicOfferContent(section, data, seoMode);

  const mainImage = s(content?.mainImage);
  const mainHref = s(content?.productHref) || "#";
  const mainTitle = s(content?.title) || section.title || "عرض مميز";

  const sideCards = Array.isArray(content?.sideImages)
    ? content.sideImages
        .map((item: any, index: number) => {
          const image = s(item?.image);
          if (!image) return null;

          return {
            id: `${section.id}-side-${index}`,
            image,
            href: s(item?.href) || "#",
            title:
              s(item?.alt) ||
              s(content?.title) ||
              section.title ||
              `عرض ${index + 1}`,
          };
        })
        .filter(Boolean)
    : [];

  const allSideCards = sideCards as Array<{
    id: string;
    image: string;
    href: string;
    title: string;
  }>;

  const fallbackHero = !mainImage && allSideCards.length ? allSideCards[0] : null;

  const hero = mainImage
    ? {
        id: `${section.id}-main`,
        image: mainImage,
        href: mainHref,
        title: mainTitle,
      }
    : fallbackHero;

  const railCards = mainImage ? allSideCards : allSideCards.slice(1);

  if (!hero) return null;

  function renderRailCard(card: {
    id: string;
    image: string;
    href: string;
    title: string;
  }) {
    const body = (
      <img
        src={card.image}
        alt={card.title || "عرض"}
        loading="lazy"
        decoding="async"
        className="mk-mobile-offer-stack__railImg"
      />
    );

    if (card.href && card.href !== "#") {
      return (
        <a
          key={card.id}
          href={card.href}
          className="mk-mobile-offer-stack__railCard"
          aria-label={card.title || "عرض"}
        >
          {body}
        </a>
      );
    }

    return (
      <div key={card.id} className="mk-mobile-offer-stack__railCard">
        {body}
      </div>
    );
  }

  const heroBody = (
    <img
      src={hero.image}
      alt={hero.title || "عرض مميز"}
      loading="lazy"
      decoding="async"
      className="mk-mobile-offer-stack__heroImg"
    />
  );

  return (
    <section className="mk-mobile-offer-stack" dir="rtl">
      <div className="mk-mobile-offer-stack__inner">
        {hero.href && hero.href !== "#" ? (
          <a
            href={hero.href}
            className="mk-mobile-offer-stack__hero"
            aria-label={hero.title || "عرض مميز"}
          >
            {heroBody}
          </a>
        ) : (
          <div className="mk-mobile-offer-stack__hero">{heroBody}</div>
        )}

        {railCards.length ? (
          <div className="mk-mobile-offer-stack__rail">
            {railCards.slice(0, 8).map((card) => renderRailCard(card))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* =========================================================
   FAQ
   ========================================================= */

function MobileFaqSection({ section }: { section: HomeDynamicSection }) {
  const content = getFaqContent(section);

  if (!content.title && !content.description && !content.items.length) {
    return null;
  }

  return (
    <section className="mk-mobile-faq" dir="rtl">
      <div className="mk-mobile-faq__inner">
        {content.title || content.description ? (
          <div className="mk-mobile-faq__head">
            {content.title ? (
              <h2 className="mk-mobile-faq__title">{content.title}</h2>
            ) : null}

            {content.description ? (
              <p className="mk-mobile-faq__desc">{content.description}</p>
            ) : null}
          </div>
        ) : null}

        {content.items.length ? (
          <div className="mk-mobile-faq__list">
            {content.items.map((item: any, index: number) => {
              const question = s(item?.question);
              const answer = s(item?.answer);

              if (!question && !answer) return null;

              return (
                <details
                  key={`${question || "faq"}-${index}`}
                  className="mk-mobile-faq__item"
                  open={index === 0}
                >
                  <summary className="mk-mobile-faq__question">
                    <span>{question || `سؤال ${index + 1}`}</span>
                    <i aria-hidden="true">+</i>
                  </summary>

                  {answer ? (
                    <div className="mk-mobile-faq__answer">{answer}</div>
                  ) : null}
                </details>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* =========================================================
   Testimonials
   ========================================================= */

function MobileStarsView({ rating }: { rating: number }) {
  const fullStars = Math.round(Math.min(5, Math.max(0, rating || 0)));

  return (
    <div
      className="mk-mobile-testimonials__stars"
      aria-label={`${fullStars} من 5`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index}>{index < fullStars ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function MobileTestimonialCard({
  item,
  nameMode,
  showDate,
}: {
  item: TestimonialItem;
  nameMode: TestimonialNameMode;
  showDate: boolean;
}) {
  const displayName =
    nameMode === "masked" ? maskCustomerName(item.name) : item.name;

  return (
    <article className="mk-mobile-testimonial-card">
      <div className="mk-mobile-testimonial-card__head">
        <div className="mk-mobile-testimonial-card__avatar">
          {item.avatar ? (
            <img
              src={item.avatar}
              alt={displayName || "عميل"}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span>{s(displayName).slice(0, 1) || "ع"}</span>
          )}
        </div>

        <div className="mk-mobile-testimonial-card__person">
          <h3>{displayName || "عميل"}</h3>

          {item.role ? <p>{item.role}</p> : null}

          {showDate && item.createdAt ? (
            <time dateTime={item.createdAt}>
              {formatTestimonialDate(item.createdAt)}
            </time>
          ) : null}
        </div>
      </div>

      {item.text ? (
        <p className="mk-mobile-testimonial-card__text">{item.text}</p>
      ) : null}

      <MobileStarsView rating={item.rating} />
    </article>
  );
}

function MobileTestimonialsSection({
  section,
  data,
}: {
  section: HomeDynamicSection;
  data: any;
}) {
  const content = getTestimonialsContent(section, data);

  const [open, setOpen] = useState(false);
  const [modalItems, setModalItems] = useState<TestimonialItem[]>([]);
  const [modalOffset, setModalOffset] = useState(0);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const visibleItems = content.items.slice(0, content.limit);

  async function loadModalItems(reset = false) {
    if (modalLoading) return;

    const nextOffset = reset ? 0 : modalOffset;

    try {
      setModalLoading(true);
      setModalError("");

      const result = await fetchStoreTestimonialsPage({
        limit: content.loadMoreLimit,
        offset: nextOffset,
      });

      setModalItems((current) =>
        reset ? result.items : [...current, ...result.items],
      );

      setModalHasMore(result.hasMore);
      setModalOffset(
        typeof result.nextOffset === "number"
          ? result.nextOffset
          : nextOffset + result.items.length,
      );
    } catch (error: any) {
      setModalError(error?.message || "تعذر تحميل التقييمات");
    } finally {
      setModalLoading(false);
    }
  }

  async function openModal() {
    setOpen(true);
    setModalItems([]);
    setModalOffset(0);
    setModalHasMore(false);
    setModalError("");

    await loadModalItems(true);
  }

  if (!content.title && !content.description && !visibleItems.length) {
    return null;
  }

  return (
    <section className="mk-mobile-testimonials" dir="rtl">
      <div className="mk-mobile-testimonials__inner">
        {content.title || content.description ? (
          <div className="mk-mobile-testimonials__head">
            <span className="mk-mobile-testimonials__eyebrow">
              تقييمات العملاء
            </span>

            {content.title ? (
              <h2 className="mk-mobile-testimonials__title">
                {content.title}
              </h2>
            ) : null}

            {content.description ? (
              <p className="mk-mobile-testimonials__desc">
                {content.description}
              </p>
            ) : null}
          </div>
        ) : null}

        {visibleItems.length ? (
          <div className="mk-mobile-testimonials__rail">
            {visibleItems.map((item) => (
              <div key={item.id} className="mk-mobile-testimonials__slide">
                <MobileTestimonialCard
                  item={item}
                  nameMode={content.nameMode}
                  showDate={content.showDate}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mk-mobile-testimonials__empty">
            لا توجد تقييمات لعرضها حالياً
          </div>
        )}

        {content.showAllButton ? (
          <div className="mk-mobile-testimonials__actions">
            <button
              type="button"
              className="mk-mobile-testimonials__button"
              onClick={openModal}
            >
              {content.buttonText || "عرض المزيد"}
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          className="mk-mobile-testimonials-modal"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="mk-mobile-testimonials-modal__backdrop"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
          />

          <div className="mk-mobile-testimonials-modal__sheet">
            <div className="mk-mobile-testimonials-modal__handle" />

            <div className="mk-mobile-testimonials-modal__head">
              <div>
                <span>تقييمات العملاء</span>
                <h3>{content.title || "كل التقييمات"}</h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="mk-mobile-testimonials-modal__body">
              {modalItems.map((item) => (
                <MobileTestimonialCard
                  key={`modal-${item.id}`}
                  item={item}
                  nameMode={content.nameMode}
                  showDate={content.showDate}
                />
              ))}

              {modalLoading && !modalItems.length ? (
                <div className="mk-mobile-testimonials-modal__status">
                  جاري تحميل التقييمات...
                </div>
              ) : null}

              {modalError ? (
                <div className="mk-mobile-testimonials-modal__status">
                  {modalError}
                </div>
              ) : null}

              {!modalLoading && !modalError && !modalItems.length ? (
                <div className="mk-mobile-testimonials-modal__status">
                  لا توجد تقييمات لعرضها حالياً
                </div>
              ) : null}

              {modalHasMore ? (
                <div className="mk-mobile-testimonials-modal__more">
                  <button
                    type="button"
                    disabled={modalLoading}
                    onClick={() => loadModalItems(false)}
                  >
                    {modalLoading ? "جاري التحميل..." : "عرض المزيد"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* =========================================================
   Renderer
   ========================================================= */

function MobileDynamicSectionRenderer({
  section,
  sectionIndex = 0,
  data,
  seoMode,
  currencies,
  tax,
}: {
  section: HomeDynamicSection;
  sectionIndex?: number;
  data: any;
  seoMode: any;
  currencies?: any;
  tax?: any;
}) {
  if (isSmartSearchSection(section)) {
    return (
      <SmartSearchFromData
        data={data}
        bootstrap={data?.bootstrap}
        variant="hero"
        section={section.raw}
        sectionIndex={sectionIndex}
      />
    );
  }

  if (isResponsiveHeroSliderSection(section)) {
    return (
      <MobileResponsiveHeroSliderSection
        section={section}
        data={data}
        seoMode={seoMode}
      />
    );
  }

  if (isMobileCircleLinksSection(section)) {
    return (
      <MobileCircleLinksSection
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

  if (isFeaturedMosaicOfferSection(section)) {
    return (
      <MobileFeaturedMosaicOfferSection
        section={section}
        data={data}
        seoMode={seoMode}
      />
    );
  }

  if (isStatsHeroSplitSection(section)) {
    return <MobileStatsHeroSplitSection section={section} />;
  }

  if (isStatsSection(section)) {
    return <MobileStatsSection section={section} />;
  }

  if (isFaqSection(section)) {
    return <MobileFaqSection section={section} />;
  }

  if (isTestimonialsSection(section)) {
    return <MobileTestimonialsSection section={section} data={data} />;
  }

  if (isCircleLinksSection(section)) {
    return (
      <MobileLinksSection
        section={section}
        items={section.items || []}
        variant="circle"
      />
    );
  }

  if (isSquareLinksSection(section)) {
    return (
      <MobileLinksSection
        section={section}
        items={section.items || []}
        variant="square"
      />
    );
  }

  if (isTripleBannerSection(section)) {
    return (
      <MobileGridBannersSection
        section={section}
        items={section.items || []}
        limit={3}
      />
    );
  }

  if (isDoubleBannerSection(section)) {
    return (
      <MobileGridBannersSection
        section={section}
        items={section.items || []}
        limit={2}
      />
    );
  }

  if (isWideBannerSection(section)) {
    return (
      <MobileWideBannerSection
        section={section}
        data={data}
        seoMode={seoMode}
      />
    );
  }

  if (isBannersSliderSection(section)) {
    return (
      <MobileBannersSection section={section} data={data} seoMode={seoMode} />
    );
  }

  if ((section.items || []).length) {
    return (
      <MobileBannersSection section={section} data={data} seoMode={seoMode} />
    );
  }

  return null;
}

/* =========================================================
   Screen
   ========================================================= */

export default function HomeMobileScreen({ data, seoMode }: Props) {
  const dynamicSections = useMemo(() => {
    return buildDynamicSections(data, seoMode);
  }, [data, seoMode]);

  const currencies = useMemo(() => {
    return resolveCurrenciesFromData(data);
  }, [data]);

  const tax = useMemo(() => {
    return resolveTaxFromData(data);
  }, [data]);

  const mergedMobileCircleSection = useMemo(() => {
    return dynamicSections.find(
      (section) =>
        isMobileCircleLinksSection(section) &&
        shouldMergeMobileCircleLinks(section),
    );
  }, [dynamicSections]);

  const hasResponsiveHero = useMemo(() => {
    return dynamicSections.some((section) =>
      isResponsiveHeroSliderSection(section),
    );
  }, [dynamicSections]);

  let didInjectMergedCircles = false;

  return (
    <div className="mk-mobile-home">
      {dynamicSections.map((section, sectionIndex) => {
        if (isHtmlContentSection(section)) {
          return (
            <HtmlThemeSections
              key={section.id}
              data={{ ...data, theme: { ...(data?.theme || {}), options: { homepage: { sections: [section.raw] } } } }}
              pageKey="homepage"
            />
          );
        }

        const shouldSkipMergedCircle =
          hasResponsiveHero &&
          mergedMobileCircleSection?.id === section.id &&
          shouldMergeMobileCircleLinks(section);

        if (shouldSkipMergedCircle) {
          return null;
        }

        const node = (
          <MobileDynamicSectionRenderer
            key={section.id}
            section={section}
            sectionIndex={sectionIndex}
            data={data}
            seoMode={seoMode}
            currencies={currencies}
            tax={tax}
          />
        );

        if (
          !didInjectMergedCircles &&
          mergedMobileCircleSection &&
          isResponsiveHeroSliderSection(section)
        ) {
          didInjectMergedCircles = true;

          return (
            <Fragment key={`${section.id}-with-mobile-circles`}>
              {node}

              <MobileCircleLinksSection
                section={mergedMobileCircleSection}
                data={data}
                seoMode={seoMode}
                merged
              />
            </Fragment>
          );
        }

        return node;
      })}
    </div>
  );
}