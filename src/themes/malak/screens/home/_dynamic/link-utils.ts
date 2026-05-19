// FILE: apps/storefront/src/themes/malak/screens/home/_dynamic/link-utils.ts

import { buildCategoryHref as buildStoreCategoryHref } from "@/lib/seo/build-store-href";
import type { HomeDynamicItem } from "./types";
import {
  getFieldValue,
  getImageFromValue,
  getLinkFromImageValue,
  isLikelyImageUrl,
  s,
} from "./utils";
import {
  buildProductHref as buildStoreProductHrefFromProduct,
  getAllProductsRaw,
  getProductId,
  getProductMap,
} from "./product-utils";

type AnyCategory = {
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  label?: string | null;
  slug?: string | null;
  public_no?: string | number | null;
  publicNo?: string | number | null;
  short_url?: string | null;
  shortUrl?: string | null;
  href?: string | null;
  children?: AnyCategory[];
};

function isObject(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenCategories(rows: any[]): AnyCategory[] {
  const result: AnyCategory[] = [];

  for (const row of rows || []) {
    if (!isObject(row)) continue;

    result.push(row as AnyCategory);

    if (Array.isArray(row.children) && row.children.length) {
      result.push(...flattenCategories(row.children));
    }
  }

  return result;
}

function objectValues(value: any): any[] {
  if (!isObject(value)) return [];
  return Object.values(value).filter(Boolean);
}

function getCategoriesFromPossibleData(data: any): AnyCategory[] {
  const buckets = [
    data?.linkedCategoriesById,
    data?.linked_categories_by_id,

    data?.categories,
    data?.navigation?.categories,
    data?.bootstrap?.navigation?.categories,
    data?.theme?.navigation?.categories,
    data?.storefront?.navigation?.categories,

    data?.themeData?.categories,
    data?.themeData?.navigation?.categories,
    data?.theme_data?.categories,
    data?.theme_data?.navigation?.categories,

    data?.data?.categories,
    data?.data?.navigation?.categories,
    data?.pageData?.categories,
    data?.pageData?.navigation?.categories,
    data?.homepage?.categories,
    data?.homepage?.navigation?.categories,
  ];

  const rows: AnyCategory[] = [];

  for (const bucket of buckets) {
    if (!bucket) continue;

    if (Array.isArray(bucket)) {
      rows.push(...flattenCategories(bucket));
      continue;
    }

    if (isObject(bucket)) {
      rows.push(...flattenCategories(objectValues(bucket)));
    }
  }

  const seen = new Set<string>();

  return rows.filter((row) => {
    const key =
      s(row?.id) ||
      s(row?.public_no ?? row?.publicNo) ||
      s(row?.slug) ||
      s(row?.href) ||
      s(row?.short_url ?? row?.shortUrl);

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function addCategoryToMap(
  map: Record<string, AnyCategory>,
  category: AnyCategory,
) {
  if (!category || typeof category !== "object") return;

  const keys = [
    s(category.id),
    s(category.public_no ?? category.publicNo),
    s(category.slug),
    s(category.href),
    s(category.short_url ?? category.shortUrl),
  ].filter(Boolean);

  for (const key of keys) {
    if (!map[key]) map[key] = category;
  }
}

export function getCategoryMap(data: any): Record<string, AnyCategory> {
  const map: Record<string, AnyCategory> = {};

  const directMaps = [data?.linkedCategoriesById, data?.linked_categories_by_id];

  for (const direct of directMaps) {
    if (!isObject(direct)) continue;

    for (const [key, value] of Object.entries(direct)) {
      if (!isObject(value)) continue;

      const category = value as AnyCategory;
      map[s(key)] = category;
      addCategoryToMap(map, category);
    }
  }

  for (const category of getCategoriesFromPossibleData(data)) {
    addCategoryToMap(map, category);
  }

  return map;
}

function normalizeLinkType(linkValue: any): string {
  if (!isObject(linkValue)) return "";

  if (linkValue.link) {
    const nested = normalizeLinkType(linkValue.link);
    if (nested) return nested;
  }

  return s(
    linkValue.type ||
      linkValue.link_type ||
      linkValue.linkType ||
      linkValue.kind ||
      linkValue.target_type ||
      linkValue.targetType ||
      linkValue.url_type ||
      linkValue.urlType,
  ).toLowerCase();
}

function normalizeLinkId(linkValue: any): string {
  if (linkValue === null || linkValue === undefined) return "";

  if (typeof linkValue === "string" || typeof linkValue === "number") {
    return s(linkValue);
  }

  if (!isObject(linkValue)) return "";

  if (linkValue.link) {
    const nested = normalizeLinkId(linkValue.link);
    if (nested) return nested;
  }

  const value =
    linkValue.value ??
    linkValue.id ??
    linkValue.product_id ??
    linkValue.productId ??
    linkValue.category_id ??
    linkValue.categoryId ??
    linkValue.target_id ??
    linkValue.targetId ??
    linkValue.uuid ??
    linkValue.public_no ??
    linkValue.publicNo ??
    linkValue.slug ??
    linkValue.href ??
    linkValue.url ??
    linkValue.target;

  if (typeof value === "string" || typeof value === "number") {
    return s(value);
  }

  if (isObject(value)) {
    return s(
      value.value ??
        value.id ??
        value.uuid ??
        value.product_id ??
        value.productId ??
        value.category_id ??
        value.categoryId ??
        value.public_no ??
        value.publicNo ??
        value.slug ??
        value.href ??
        value.url ??
        value.target,
    );
  }

  return "";
}

function isDirectUrl(value: string): boolean {
  const text = s(value);

  return (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("/") ||
    text.startsWith("#") ||
    text.startsWith("mailto:") ||
    text.startsWith("tel:") ||
    text.startsWith("whatsapp:")
  );
}

function normalizeDirectUrl(value: string): string {
  const text = s(value);
  if (!text) return "#";

  if (isDirectUrl(text)) return text;

  return text;
}

function looksLikeCategoryObject(value: any): boolean {
  if (!isObject(value)) return false;

  return Boolean(
    value.id ||
      value.category_id ||
      value.categoryId ||
      value.public_no ||
      value.publicNo ||
      value.slug ||
      value.name ||
      value.title ||
      value.label,
  );
}

function findCategoryByValue(data: any, value: string): AnyCategory | null {
  const id = s(value);
  if (!id) return null;

  const map = getCategoryMap(data);
  if (map[id]) return map[id];

  const categories = getCategoriesFromPossibleData(data);

  return (
    categories.find((category) => {
      return (
        s(category?.id) === id ||
        s(category?.public_no ?? category?.publicNo) === id ||
        s(category?.slug) === id ||
        s(category?.href) === id ||
        s(category?.short_url ?? category?.shortUrl) === id
      );
    }) || null
  );
}

function resolveCategoryHref(
  category: AnyCategory,
  idFallback: string,
  seoMode: any,
): string {
  const mode = seoMode || "named_ar";

  const name = s(category?.name || category?.title || category?.label);
  const slug = s(category?.slug);
  const publicNo = Number(category?.public_no ?? category?.publicNo ?? 0);
  const shortUrl = category?.short_url ?? category?.shortUrl ?? null;
  const existingHref = s(category?.href);

  if (Number.isFinite(publicNo) && publicNo > 0) {
    return buildStoreCategoryHref({
      mode,
      slugNameAr: name || slug || idFallback,
      slugNameEn: slug || name || idFallback,
      publicNo,
      shortCode: shortUrl,
    });
  }

  if (existingHref && existingHref !== "#") {
    return existingHref;
  }

  return "#";
}

export function isLinkLikeValue(value: any): boolean {
  if (!value) return false;

  if (typeof value === "string" || typeof value === "number") {
    return isDirectUrl(s(value));
  }

  if (!isObject(value)) return false;

  if (value.link) return isLinkLikeValue(value.link);

  const type = normalizeLinkType(value);
  const rawValue = normalizeLinkId(value);

  return Boolean(
    rawValue &&
      (type === "product" ||
        type === "category" ||
        type === "external" ||
        type === "internal" ||
        type === "page" ||
        value.href ||
        value.url ||
        value.target),
  );
}

export function getLinkValueFromValues(values: any) {
  const candidates = [
    values?.field_13,
    values?.field_10,
    values?.field_9,
    values?.field_8,
    values?.field_7,
    values?.field_4,

    values?.button_link,
    values?.buttonLink,
    values?.product_link,
    values?.productLink,
    values?.category_link,
    values?.categoryLink,
    values?.cta_link,
    values?.ctaLink,
    values?.link,
    values?.href,
    values?.target,
    values?.url,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (isObject(candidate) && candidate.link) {
      if (isLinkLikeValue(candidate.link)) return candidate.link;
    }

    if (isLinkLikeValue(candidate)) return candidate;
  }

  return "";
}

export function getButtonTextFromValues(values: any) {
  const candidates = [
    values?.field_8,
    values?.field_7,
    values?.field_6,
    values?.button_text,
    values?.buttonText,
    values?.cta_text,
    values?.ctaText,
    values?.button_label,
    values?.buttonLabel,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    if (Array.isArray(raw)) continue;
    if (isLinkLikeValue(raw)) continue;

    if (isObject(raw)) {
      const text =
        s(raw.text) ||
        s(raw.button_text) ||
        s(raw.buttonText) ||
        s(raw.title) ||
        s(raw.name) ||
        s(raw.label) ||
        "";

      if (text) return text;
      continue;
    }

    const text = s(raw);
    if (text) return text;
  }

  return "";
}

export function resolveLinkHref(linkValue: any, data: any, seoMode: any): string {
  if (!linkValue) return "#";

  if (typeof linkValue === "string" || typeof linkValue === "number") {
    const raw = s(linkValue);
    if (!raw) return "#";

    const normalized = raw.replace(/^https?:\/\/[^/]+/i, "");

    const categoryLegacyMatch =
      normalized.match(/^\/c\/([^/?#]+)(?:[/?#].*)?$/i) ||
      normalized.match(/^\/category\/([^/?#]+)(?:[/?#].*)?$/i) ||
      normalized.match(/^\/categories\/([^/?#]+)(?:[/?#].*)?$/i);

    if (categoryLegacyMatch?.[1]) {
      const categoryKey = decodeURIComponent(categoryLegacyMatch[1]);
      const category = findCategoryByValue(data, categoryKey);

      if (category) {
        return resolveCategoryHref(category, categoryKey, seoMode);
      }
    }

    const productLegacyMatch =
      normalized.match(/^\/p\/([^/?#]+)(?:[/?#].*)?$/i) ||
      normalized.match(/^\/product\/([^/?#]+)(?:[/?#].*)?$/i) ||
      normalized.match(/^\/products\/([^/?#]+)(?:[/?#].*)?$/i);

    if (productLegacyMatch?.[1]) {
      const productKey = decodeURIComponent(productLegacyMatch[1]);

      const product =
        getProductMap(data)?.[productKey] ||
        getAllProductsRaw(data).find((item) => getProductId(item) === productKey);

      if (product) {
        return buildStoreProductHrefFromProduct(product, seoMode);
      }
    }

    const category = findCategoryByValue(data, raw);

    if (category) {
      return resolveCategoryHref(category, raw, seoMode);
    }

    return normalizeDirectUrl(raw);
  }

  if (typeof linkValue !== "object" || Array.isArray(linkValue)) return "#";

  if (linkValue.link) {
    return resolveLinkHref(linkValue.link, data, seoMode);
  }

  const type = s(
    linkValue?.type ||
      linkValue?.link_type ||
      linkValue?.linkType ||
      linkValue?.kind ||
      linkValue?.target_type ||
      linkValue?.targetType,
  ).toLowerCase();

  const id =
    s(linkValue?.value) ||
    s(linkValue?.id) ||
    s(linkValue?.product_id) ||
    s(linkValue?.productId) ||
    s(linkValue?.category_id) ||
    s(linkValue?.categoryId) ||
    s(linkValue?.target_id) ||
    s(linkValue?.targetId) ||
    s(linkValue?.target);

  if (type === "external") {
    return s(linkValue?.value || linkValue?.href || linkValue?.url) || "#";
  }

  if (type === "internal" || type === "page") {
    return normalizeDirectUrl(
      s(linkValue?.value || linkValue?.href || linkValue?.url),
    );
  }

  if (type === "product") {
    if (!id) return "#";

    const product =
      getProductMap(data)?.[id] ||
      getAllProductsRaw(data).find((item) => getProductId(item) === id);

    if (!product) return "#";

    return buildStoreProductHrefFromProduct(product, seoMode);
  }

  if (type === "category") {
    if (!id) return "#";

    const category = findCategoryByValue(data, id);

    if (!category) return "#";

    return resolveCategoryHref(category, id, seoMode);
  }

  if (linkValue.href || linkValue.target || linkValue.url) {
    return resolveLinkHref(
      linkValue.href ?? linkValue.target ?? linkValue.url,
      data,
      seoMode,
    );
  }

  return "#";
}

function textFromValue(value: any): string {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return s(value);
  }

  if (!isObject(value)) return "";

  if (isLinkLikeValue(value)) {
    return s(value.label || value.title || value.name);
  }

  return s(
    value.text ||
      value.title ||
      value.name ||
      value.label ||
      value.value ||
      "",
  );
}

export function resolveLinkTitle(row: any, linkValue: any, index: number) {
  return (
    textFromValue(row?.title) ||
    textFromValue(row?.label) ||
    textFromValue(row?.name) ||
    textFromValue(row?.field_2) ||
    textFromValue(row?.field_3) ||
    textFromValue(row?.field_4) ||
    textFromValue(linkValue?.label) ||
    textFromValue(linkValue?.title) ||
    textFromValue(linkValue?.name) ||
    `عنصر ${index + 1}`
  );
}

export function resolveRowDescription(row: any) {
  return (
    textFromValue(row?.description) ||
    textFromValue(row?.subtitle) ||
    textFromValue(row?.sub_title) ||
    textFromValue(row?.text) ||
    ""
  );
}

export function resolveRowImage(row: any) {
  const image =
    s(row?.image) ||
    s(row?.image_url) ||
    s(row?.imageUrl) ||
    s(row?.src) ||
    s(row?.field_1);

  return isLikelyImageUrl(image) ? image : getImageFromValue(row?.field_1);
}

export function resolveRowLink(row: any) {
  const candidates = [
    row?.link,
    row?.href,
    row?.target,
    row?.url,

    row?.button_link,
    row?.buttonLink,
    row?.cta_link,
    row?.ctaLink,

    row?.field_13,
    row?.field_10,
    row?.field_7,
    row?.field_4,
    row?.field_3,
    row?.field_2,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isLinkLikeValue(candidate)) return candidate;
  }

  return "";
}

export function getRows(section: any) {
  const values = section?.values;

  if (!values || typeof values !== "object") return [];

  const preferred =
    values?.items ||
    values?.rows ||
    values?.banners ||
    values?.links ||
    values?.images ||
    values?.field_1 ||
    values?.field_2 ||
    values?.field_3 ||
    values?.field_4 ||
    values?.field_5 ||
    values?.field_6 ||
    values?.field_7 ||
    values?.field_8 ||
    values?.field_9 ||
    values?.field_10 ||
    values?.field_11 ||
    values?.field_12;

  if (Array.isArray(preferred)) {
    return preferred;
  }

  for (const value of Object.values(values)) {
    if (Array.isArray(value)) return value;
  }

  const rows: any[] = [];

  Object.entries(values).forEach(([key, value], index) => {
    const image = getImageFromValue(value);

    if (!image) return;

    rows.push({
      title: isObject(value)
        ? s((value as any).title) || s((value as any).label) || ""
        : "",
      image,
      link: getLinkFromImageValue(value),
      field_key: key,
      sort_order: index,
    });
  });

  return rows;
}

export function mapSectionItems(section: any, data: any, seoMode: any) {
  const rows = getRows(section);

  return rows
    .map((row: any, index: number) => {
      const linkValue = resolveRowLink(row);

      return {
        title: resolveLinkTitle(row, linkValue, index),
        description: resolveRowDescription(row),
        src: resolveRowImage(row),
        href: resolveLinkHref(linkValue, data, seoMode),
      };
    })
    .filter((item: HomeDynamicItem) => item.src);
}

export function getCountdownButton(values: any) {
  const raw = getFieldValue(values, [
    "field_4",
    "button",
    "cta",
    "action",
    "button_value",
    "buttonValue",
  ]);

  if (raw && typeof raw === "object") {
    return {
      text:
        s(raw.text) ||
        s(raw.label) ||
        s(raw.title) ||
        s(raw.name) ||
        s(raw.button_text) ||
        s(raw.buttonText) ||
        s(raw.value) ||
        "",
      link:
        raw.link ??
        raw.href ??
        raw.target ??
        raw.url ??
        raw.button_link ??
        raw.buttonLink ??
        "",
    };
  }

  return {
    text:
      s(raw) ||
      s(values?.button_text) ||
      s(values?.buttonText) ||
      s(values?.btn_text) ||
      s(values?.btnText) ||
      s(values?.cta_text) ||
      s(values?.ctaText),
    link:
      getFieldValue(values, [
        "button_link",
        "buttonLink",
        "btn_link",
        "btnLink",
        "cta_link",
        "ctaLink",
        "link",
        "href",
        "target",
        "url",
      ]) || "",
  };
}