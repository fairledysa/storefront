// FILE: apps/storefront/src/themes/malak/screens/home/_dynamic/utils.ts

export function s(v: any) {
  return String(v ?? "").trim();
}

export function lower(v: any) {
  return s(v).toLowerCase();
}

export function n(v: any, fallback = 0) {
  const x = Number(v ?? fallback);
  return Number.isFinite(x) ? x : fallback;
}

export function safeNum(v: any, fallback = 0) {
  const x = Number(v ?? fallback);
  return Number.isFinite(x) ? x : fallback;
}

export function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

export function boolValue(value: any, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const text = lower(value);

  if (text === "true" || text === "1" || text === "yes" || text === "on") {
    return true;
  }

  if (text === "false" || text === "0" || text === "no" || text === "off") {
    return false;
  }

  return fallback;
}

export function getValueText(value: any) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return "";

  if (typeof value === "string" || typeof value === "number") {
    return s(value);
  }

  if (typeof value === "object") {
    return (
      s(value.value) ||
      s(value.key) ||
      s(value.name) ||
      s(value.title) ||
      s(value.label) ||
      s(value.icon) ||
      ""
    );
  }

  return s(value);
}

export function getIconNameFromValue(value: any) {
  if (!value) return "";

  if (typeof value === "string") return s(value);

  if (typeof value === "object" && !Array.isArray(value)) {
    return (
      s(value.value) ||
      s(value.icon) ||
      s(value.name) ||
      s(value.key) ||
      s(value.label) ||
      ""
    );
  }

  return "";
}

export function getSortOrder(value: any, fallback: number) {
  const raw =
    value?.sort_order ??
    value?.sortOrder ??
    value?.order ??
    value?.position ??
    value?.display_order ??
    value?.displayOrder ??
    fallback;

  const x = Number(raw);
  return Number.isFinite(x) ? x : fallback;
}

export function sortRowsByAdminOrder<T = any>(rows: T[]) {
  return [...rows].sort((a: any, b: any) => {
    const aOrder = getSortOrder(a, 0);
    const bOrder = getSortOrder(b, 0);

    if (aOrder !== bOrder) return aOrder - bOrder;

    const aCreated = new Date(a?.created_at || a?.createdAt || 0).getTime();
    const bCreated = new Date(b?.created_at || b?.createdAt || 0).getTime();

    const safeA = Number.isFinite(aCreated) ? aCreated : 0;
    const safeB = Number.isFinite(bCreated) ? bCreated : 0;

    if (safeA !== safeB) return safeA - safeB;

    return 0;
  });
}

export function isLikelyImageUrl(value: any) {
  const text = s(value);

  if (!text) return false;

  return (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("/") ||
    text.startsWith("data:image/") ||
    /\.(png|jpg|jpeg|webp|gif|avif|svg)(\?.*)?$/i.test(text)
  );
}

export function getImageFromValue(value: any) {
  if (!value) return "";

  if (typeof value === "string") {
    return isLikelyImageUrl(value) ? s(value) : "";
  }

  if (typeof value !== "object") return "";

  const direct =
    s(value.image) ||
    s(value.image_url) ||
    s(value.imageUrl) ||
    s(value.src) ||
    s(value.file_url) ||
    s(value.fileUrl) ||
    s(value.original_url) ||
    s(value.url) ||
    s(value.thumbnail_url) ||
    s(value.thumbnailUrl) ||
    s(value.media?.[0]?.original_url) ||
    s(value.media?.[0]?.url) ||
    s(value.images?.[0]?.url) ||
    s(value.images?.[0]?.src);

  if (direct && isLikelyImageUrl(direct)) return direct;

  const valueText = s(value.value);
  if (isLikelyImageUrl(valueText)) return valueText;

  return "";
}

export function getLinkFromImageValue(value: any) {
  if (!value || typeof value !== "object") return "";

  return (
    value.link ??
    value.href ??
    value.target ??
    value.url_target ??
    value.urlTarget ??
    ""
  );
}

export function getFieldValue(values: any, keys: string[]) {
  for (const key of keys) {
    const value = values?.[key];

    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !s(value)) continue;

    return value;
  }

  return "";
}

export function getTextValue(values: any, keys: string[]) {
  const value = getFieldValue(values, keys);

  if (Array.isArray(value)) return "";

  if (value && typeof value === "object") {
    return (
      s(value.text) ||
      s(value.label) ||
      s(value.title) ||
      s(value.name) ||
      s(value.value) ||
      ""
    );
  }

  return s(value);
}

export function normalizeIds(value: any) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((x) => {
        if (typeof x === "string") return s(x);

        if (x && typeof x === "object") {
          return s(x.id) || s(x.value) || s(x.product_id) || s(x.category_id);
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const id =
      s(value.id) ||
      s(value.value) ||
      s(value.product_id) ||
      s(value.category_id);

    return id ? [id] : [];
  }

  return s(value) ? [s(value)] : [];
}

export function getPickerItems(value: any) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "object") {
    return [value];
  }

  return s(value) ? [value] : [];
}

export function getPickerItemId(item: any) {
  if (typeof item === "string") return s(item);

  if (item && typeof item === "object") {
    return (
      s(item.id) ||
      s(item.value) ||
      s(item.product_id) ||
      s(item.productId) ||
      s(item.uuid)
    );
  }

  return "";
}