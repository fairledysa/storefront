// FILE: apps/storefront/src/themes/malak/components/product-quick-view/ProductQuickView.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/icon/Icon";
import type { ProductCardItem } from "@/themes/malak/components/product-card/ProductCard";

type QuickViewItem = ProductCardItem & {
  [key: string]: any;
};

type PanState = {
  x: number;
  y: number;
};

type DragState = {
  startX: number;
  startY: number;
  panX: number;
  panY: number;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return fallback;
}

function readBoolMaybe(value: any): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-SA-u-nu-latn", {
    maximumFractionDigits: 0,
  }).format(value);
}

function hasDiscount(price?: number | null, compareAt?: number | null) {
  return (
    typeof price === "number" &&
    typeof compareAt === "number" &&
    compareAt > price
  );
}

function readMediaUrl(value: any) {
  if (!value) return "";
  if (typeof value === "string") return s(value);

  return (
    s(value.original_url) ||
    s(value.public_url) ||
    s(value.image_url) ||
    s(value.imageUrl) ||
    s(value.url) ||
    s(value.src) ||
    s(value.path) ||
    ""
  );
}

function isImageMedia(value: any) {
  if (!value || typeof value !== "object") return false;

  const kind = s(value.media_kind || value.kind || value.type).toLowerCase();

  return !kind || kind === "image";
}

function getSortedMediaImages(value: any): string[] {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .filter((row) => {
      if (typeof row === "string") return Boolean(s(row));
      return isImageMedia(row) && Boolean(readMediaUrl(row));
    })
    .sort((a: any, b: any) => {
      const ad = a?.is_default ? 1 : 0;
      const bd = b?.is_default ? 1 : 0;

      if (bd !== ad) return bd - ad;

      return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
    })
    .map((row) => readMediaUrl(row))
    .filter(Boolean);
}

function pushImage(out: string[], seen: Set<string>, value: any) {
  const url = readMediaUrl(value);
  if (!url || seen.has(url)) return;

  seen.add(url);
  out.push(url);
}

function getImages(item: QuickViewItem | null): string[] {
  if (!item) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  pushImage(out, seen, item.imageUrl);
  pushImage(out, seen, item.image_url);
  pushImage(out, seen, item.hoverImageUrl);
  pushImage(out, seen, item.hover_image_url);
  pushImage(out, seen, item.secondImageUrl);
  pushImage(out, seen, item.second_image_url);

  pushImage(out, seen, item.metadata?.imageUrl);
  pushImage(out, seen, item.metadata?.image_url);
  pushImage(out, seen, item.metadata?.hoverImageUrl);
  pushImage(out, seen, item.metadata?.hover_image_url);
  pushImage(out, seen, item.metadata?.secondImageUrl);
  pushImage(out, seen, item.metadata?.second_image_url);

  pushImage(out, seen, item.seo?.image);
  pushImage(out, seen, item.seo?.image_url);
  pushImage(out, seen, item.seo?.imageUrl);
  pushImage(out, seen, item.seo?.og_image_url);
  pushImage(out, seen, item.seo?.hoverImageUrl);
  pushImage(out, seen, item.seo?.hover_image_url);
  pushImage(out, seen, item.seo?.secondImageUrl);
  pushImage(out, seen, item.seo?.second_image_url);

  const buckets = [
    item.media,
    item.images,
    item.metadata?.media,
    item.metadata?.images,
    item.metadata?.gallery,
    item.metadata?.product_images,
    item.metadata?.seo?.media,
    item.metadata?.seo?.images,
    item.seo?.media,
    item.seo?.images,
  ];

  for (const bucket of buckets) {
    for (const url of getSortedMediaImages(bucket)) {
      pushImage(out, seen, url);
    }
  }

  return out;
}

function hasOptionValues(options: any[]) {
  return (Array.isArray(options) ? options : []).some(
    (option) => Array.isArray(option?.values) && option.values.length > 0,
  );
}

function getOptions(item: QuickViewItem | null): any[] {
  if (!item) return [];

  const direct = Array.isArray(item.options) ? item.options : [];
  if (hasOptionValues(direct)) return direct;

  const metadataOptions = item.metadata?.options;
  if (Array.isArray(metadataOptions) && hasOptionValues(metadataOptions)) {
    return metadataOptions;
  }

  const seoOptions = item.seo?.options || item.metadata?.seo?.options;
  if (Array.isArray(seoOptions) && hasOptionValues(seoOptions)) {
    return seoOptions;
  }

  return direct;
}

function getVariants(item: QuickViewItem | null): any[] {
  if (!item) return [];

  if (Array.isArray(item.variants) && item.variants.length) {
    return item.variants;
  }

  if (Array.isArray(item.metadata?.variants) && item.metadata.variants.length) {
    return item.metadata.variants;
  }

  if (Array.isArray(item.seo?.variants) && item.seo.variants.length) {
    return item.seo.variants;
  }

  if (
    Array.isArray(item.metadata?.seo?.variants) &&
    item.metadata.seo.variants.length
  ) {
    return item.metadata.seo.variants;
  }

  return [];
}

function optionLabel(value: any) {
  return (
    s(value?.label) ||
    s(value?.display_value) ||
    s(value?.displayValue) ||
    s(value?.name) ||
    s(value?.value) ||
    ""
  );
}

function optionTitle(option: any) {
  return s(option?.label) || s(option?.name) || s(option?.title) || "";
}

function normalizeOptionId(option: any, index: number) {
  return (
    s(option?.id) ||
    s(option?.option_id) ||
    s(option?.optionId) ||
    `option-${index}`
  );
}

function normalizeValueId(value: any, index: number) {
  return (
    s(value?.id) ||
    s(value?.value_id) ||
    s(value?.valueId) ||
    optionLabel(value) ||
    `value-${index}`
  );
}

function getOptionValues(option: any): any[] {
  return Array.isArray(option?.values) ? option.values : [];
}

function getVariantOptionValueIds(variant: any): string[] {
  const ids = new Set<string>();

  const arrays = [
    variant?.option_value_ids,
    variant?.optionValueIds,
    variant?.selected_option_value_ids,
    variant?.selectedOptionValueIds,
  ];

  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;

    for (const id of arr) {
      const value = s(id);
      if (value) ids.add(value);
    }
  }

  const optionValues = Array.isArray(variant?.option_values)
    ? variant.option_values
    : [];

  for (const value of optionValues) {
    const id =
      s(value?.id) ||
      s(value?.value_id) ||
      s(value?.valueId) ||
      s(value?.option_value_id) ||
      s(value?.optionValueId);

    if (id) ids.add(id);
  }

  const selections = Array.isArray(variant?.selections)
    ? variant.selections
    : [];

  for (const selection of selections) {
    const id =
      s(selection?.valueId) ||
      s(selection?.value_id) ||
      s(selection?.id) ||
      s(selection?.option_value_id) ||
      s(selection?.optionValueId);

    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function readProductUnlimited(item: QuickViewItem | null) {
  if (!item) return false;

  return readBool(
    firstDefined(
      item.stock?.unlimited_quantity,
      item.stock?.unlimitedQuantity,
      item.seo?.stock?.unlimited_quantity,
      item.seo?.stock?.unlimitedQuantity,
      item.metadata?.stock?.unlimited_quantity,
      item.metadata?.stock?.unlimitedQuantity,
      item.metadata?.unlimited_quantity,
      item.metadata?.unlimitedQuantity,
      item.metadata?.qtyUnlimited,
      item.metadata?.quantityUnlimited,
    ),
    false,
  );
}

function isSellableVariant(variant: any, productUnlimited: boolean) {
  if (productUnlimited) return true;

  const unlimited = readBool(
    firstDefined(
      variant?.unlimited_quantity,
      variant?.unlimitedQuantity,
      variant?.qtyUnlimited,
      variant?.quantityUnlimited,
      variant?.metadata?.unlimited_quantity,
      variant?.metadata?.unlimitedQuantity,
      variant?.metadata?.qtyUnlimited,
    ),
    false,
  );

  if (unlimited) return true;

  const qty = safeNum(
    firstDefined(
      variant?.stock_quantity,
      variant?.stockQuantity,
      variant?.quantity,
      variant?.qty,
      variant?.available_qty,
      variant?.availableQty,
      variant?.metadata?.stock_quantity,
      variant?.metadata?.stockQuantity,
      variant?.metadata?.quantity,
      variant?.metadata?.qty,
      variant?.metadata?.available_qty,
      variant?.metadata?.availableQty,
    ),
  );

  if (qty !== null) return qty > 0;

  const available = readBoolMaybe(
    firstDefined(
      variant?.available,
      variant?.is_available,
      variant?.isAvailable,
      variant?.in_stock,
      variant?.inStock,
      variant?.metadata?.available,
      variant?.metadata?.is_available,
      variant?.metadata?.isAvailable,
      variant?.metadata?.in_stock,
      variant?.metadata?.inStock,
    ),
  );

  if (available !== null) return available;

  return true;
}

function readValueQty(value: any) {
  return safeNum(
    firstDefined(
      value?.quantity,
      value?.qty,
      value?.stock_quantity,
      value?.stockQuantity,
      value?.available_qty,
      value?.availableQty,
      value?.metadata?.quantity,
      value?.metadata?.qty,
      value?.metadata?.stock_quantity,
      value?.metadata?.stockQuantity,
      value?.metadata?.available_qty,
      value?.metadata?.availableQty,
    ),
  );
}

function readValueUnlimited(value: any) {
  return readBoolMaybe(
    firstDefined(
      value?.unlimited_quantity,
      value?.unlimitedQuantity,
      value?.metadata?.unlimited_quantity,
      value?.metadata?.unlimitedQuantity,
      value?.metadata?.qtyUnlimited,
    ),
  );
}

function readValueAvailableFlag(value: any) {
  const disabled = readBoolMaybe(
    firstDefined(value?.disabled, value?.metadata?.disabled),
  );

  if (disabled === true) return false;

  return readBoolMaybe(
    firstDefined(
      value?.available,
      value?.is_available,
      value?.isAvailable,
      value?.in_stock,
      value?.inStock,
      value?.metadata?.available,
      value?.metadata?.is_available,
      value?.metadata?.isAvailable,
      value?.metadata?.in_stock,
      value?.metadata?.inStock,
    ),
  );
}

function selectedIdsFromRecord(
  options: any[],
  selected: Record<string, string>,
): string[] {
  const ids: string[] = [];

  options.forEach((option: any, optionIndex: number) => {
    const optionId = normalizeOptionId(option, optionIndex);
    const valueId = s(selected[optionId]);

    if (valueId) ids.push(valueId);
  });

  return ids;
}

function getValueIdsForOption(option: any): string[] {
  return getOptionValues(option)
    .map((value: any, index: number) => normalizeValueId(value, index))
    .filter((value: string) => Boolean(value));
}

function computeAllowedByOption(args: {
  item: QuickViewItem | null;
  options: any[];
  selected: Record<string, string>;
}): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const variants = getVariants(args.item);
  const productUnlimited = readProductUnlimited(args.item);

  if (!variants.length) return map;

  const sellableVariants = variants.filter((variant: any) =>
    isSellableVariant(variant, productUnlimited),
  );

  const selectedIds = selectedIdsFromRecord(args.options, args.selected);
  const selectedSet = new Set<string>(selectedIds.map(String));

  args.options.forEach((option: any, optionIndex: number) => {
    const optionId = normalizeOptionId(option, optionIndex);
    const values = getOptionValues(option);
    const currentOptionValueIds = new Set<string>(getValueIdsForOption(option));
    const allowed = new Set<string>();

    values.forEach((value: any, valueIndex: number) => {
      const valueId = normalizeValueId(value, valueIndex);
      if (!valueId) return;

      const testSelected = new Set<string>(Array.from(selectedSet));

      for (const oldId of Array.from(currentOptionValueIds)) {
        testSelected.delete(oldId);
      }

      testSelected.add(valueId);

      const ok = sellableVariants.some((variant: any) => {
        const variantIds = new Set<string>(getVariantOptionValueIds(variant));

        for (const selectedId of Array.from(testSelected)) {
          if (!variantIds.has(selectedId)) return false;
        }

        return true;
      });

      if (ok) allowed.add(valueId);
    });

    map.set(optionId, allowed);
  });

  return map;
}

function isUnavailableValue(args: {
  value: any;
  valueId: string;
  optionId: string;
  allowedByOption: Map<string, Set<string>>;
  variantsCount: number;
}) {
  if (args.variantsCount > 0) {
    const allowed = args.allowedByOption.get(args.optionId);
    if (allowed) return !allowed.has(args.valueId);
  }

  const unlimited = readValueUnlimited(args.value);
  if (unlimited === true) return false;

  const qty = readValueQty(args.value);
  if (qty !== null) return qty <= 0;

  const available = readValueAvailableFlag(args.value);
  if (available !== null) return !available;

  return false;
}

function buildDefaultSelection(
  item: QuickViewItem | null,
): Record<string, string> {
  const options = getOptions(item);
  const variants = getVariants(item);
  const productUnlimited = readProductUnlimited(item);
  const selected: Record<string, string> = {};

  const sellableVariants = variants.filter((variant: any) =>
    isSellableVariant(variant, productUnlimited),
  );

  const defaultVariant =
    sellableVariants.find((variant: any) => Boolean(variant?.is_default)) ||
    sellableVariants[0];

  const defaultVariantValueIds = new Set<string>(
    defaultVariant ? getVariantOptionValueIds(defaultVariant) : [],
  );

  options.forEach((option: any, optionIndex: number) => {
    const optionId = normalizeOptionId(option, optionIndex);
    const values = getOptionValues(option);

    if (!values.length) return;

    const fromVariant = values.find((value: any, valueIndex: number) => {
      const valueId = normalizeValueId(value, valueIndex);
      return valueId && defaultVariantValueIds.has(valueId);
    });

    if (fromVariant) {
      const valueIndex = values.indexOf(fromVariant);
      selected[optionId] = normalizeValueId(fromVariant, valueIndex);
      return;
    }

    const firstAvailable =
      values.find((value: any) => {
        const unlimited = readValueUnlimited(value);
        if (unlimited === true) return true;

        const qty = readValueQty(value);
        if (qty !== null) return qty > 0;

        const available = readValueAvailableFlag(value);
        if (available !== null) return available;

        return true;
      }) || values[0];

    if (firstAvailable) {
      const valueIndex = values.indexOf(firstAvailable);
      selected[optionId] = normalizeValueId(firstAvailable, valueIndex);
    }
  });

  return selected;
}

function resolveSelectedVariant(args: {
  item: QuickViewItem | null;
  options: any[];
  selected: Record<string, string>;
}) {
  const variants = getVariants(args.item);
  if (!variants.length) return null;

  const productUnlimited = readProductUnlimited(args.item);
  const selectedIds = selectedIdsFromRecord(args.options, args.selected).filter(
    Boolean,
  );

  if (!selectedIds.length) return null;

  const selectedSet = new Set<string>(selectedIds.map(String));

  const sellableVariants = variants.filter((variant: any) =>
    isSellableVariant(variant, productUnlimited),
  );

  return (
    sellableVariants.find((variant: any) => {
      const variantIds = getVariantOptionValueIds(variant).map(String);
      if (!variantIds.length) return false;

      if (variantIds.length !== selectedSet.size) return false;

      for (const id of variantIds) {
        if (!selectedSet.has(id)) return false;
      }

      return true;
    }) ?? null
  );
}

function resolveDisplayPrice(args: {
  item: QuickViewItem | null;
  selectedVariant: any;
}): {
  price: number | null;
  compareAtPrice: number | null;
} {
  const itemPrice = safeNum(args.item?.price);
  const itemCompareAt = safeNum(args.item?.compareAtPrice);

  const fallbackBase =
    itemCompareAt !== null && itemPrice !== null && itemCompareAt > itemPrice
      ? itemCompareAt
      : itemPrice;

  const fallbackSale =
    itemCompareAt !== null && itemPrice !== null && itemCompareAt > itemPrice
      ? itemPrice
      : null;

  const variantBaseRaw = safeNum(args.selectedVariant?.price);
  const variantSaleRaw = safeNum(args.selectedVariant?.sale_price);

  const base =
    variantBaseRaw !== null && variantBaseRaw > 0
      ? variantBaseRaw
      : fallbackBase;

  const sale =
    variantSaleRaw !== null && variantSaleRaw > 0
      ? variantSaleRaw
      : fallbackSale;

  const discounted =
    typeof sale === "number" &&
    typeof base === "number" &&
    sale > 0 &&
    sale < base;

  return {
    price: discounted ? sale : base,
    compareAtPrice: discounted ? base : null,
  };
}

function buildSelectedOptionsSnapshot(
  options: any[],
  selected: Record<string, string>,
): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];

  options.forEach((option: any, optionIndex: number) => {
    const optionId = normalizeOptionId(option, optionIndex);
    const selectedValueId = s(selected[optionId]);
    const title = optionTitle(option);
    const values = getOptionValues(option);

    if (!selectedValueId || !title) return;

    const hit = values.find((value: any, valueIndex: number) => {
      return normalizeValueId(value, valueIndex) === selectedValueId;
    });

    const label = optionLabel(hit);
    if (!label) return;

    out.push({
      name: title,
      value: label,
    });
  });

  return out;
}

export default function ProductQuickView() {
  const dragRef = useRef<DragState | null>(null);

  const [item, setItem] = useState<QuickViewItem | null>(null);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const open = Boolean(item);

  const images = useMemo(() => getImages(item), [item]);
  const image = images[activeImageIndex] || images[0] || "";
  const hasMultipleImages = images.length > 1;

  const options = useMemo(() => getOptions(item), [item]);
  const variants = useMemo(() => getVariants(item), [item]);

  const allowedByOption = useMemo(() => {
    return computeAllowedByOption({
      item,
      options,
      selected,
    });
  }, [item, options, selected]);

  const selectedVariant = useMemo(() => {
    return resolveSelectedVariant({
      item,
      options,
      selected,
    });
  }, [item, options, selected]);

  const selectedOptionValueIds = useMemo(() => {
    return selectedIdsFromRecord(options, selected);
  }, [options, selected]);

  const selectedOptionsSnapshot = useMemo(() => {
    return buildSelectedOptionsSnapshot(options, selected);
  }, [options, selected]);

  const resolvedPrice = useMemo(() => {
    return resolveDisplayPrice({
      item,
      selectedVariant,
    });
  }, [item, selectedVariant]);

  const price = resolvedPrice.price;
  const compareAtPrice = resolvedPrice.compareAtPrice;
  const discounted = hasDiscount(price, compareAtPrice);

  const baseOutOfStock = Boolean(item?.isOutOfStock);
  const needsVariant = options.length > 0 && variants.length > 0;
  const hasSelectedVariant = Boolean(selectedVariant?.id);
  const canAddToCart = !baseOutOfStock && (!needsVariant || hasSelectedVariant);

  function resetZoom() {
    dragRef.current = null;
    setIsDragging(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function goToImage(index: number) {
    if (!images.length) return;

    const nextIndex = Math.max(0, Math.min(index, images.length - 1));

    setActiveImageIndex(nextIndex);
    resetZoom();
  }

  function moveImage(direction: number) {
    if (!images.length) return;

    setActiveImageIndex((current) => {
      return (current + direction + images.length) % images.length;
    });

    resetZoom();
  }

  function zoomIn() {
    setZoom((value) => Math.min(3, Number((value + 0.5).toFixed(2))));
  }

  function zoomOut() {
    setZoom((value) => {
      const next = Math.max(1, Number((value - 0.5).toFixed(2)));

      if (next <= 1) {
        dragRef.current = null;
        setIsDragging(false);
        setPan({ x: 0, y: 0 });
      }

      return next;
    });
  }

  useEffect(() => {
    const onQuickView = (event: Event) => {
      const customEvent = event as CustomEvent<QuickViewItem>;
      const nextItem = customEvent.detail;

      if (!nextItem) return;

      setItem(nextItem);
      setQty(1);
      setActiveImageIndex(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
      dragRef.current = null;
      setSelected(buildDefaultSelection(nextItem));
    };

    window.addEventListener("product:quickview", onQuickView);

    return () => {
      window.removeEventListener("product:quickview", onQuickView);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setItem(null);
        return;
      }

      if (!hasMultipleImages) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveImage(-1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveImage(1);
      }
    };

    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, hasMultipleImages, images.length]);

  useEffect(() => {
    if (!images.length) {
      setActiveImageIndex(0);
      return;
    }

    if (activeImageIndex > images.length - 1) {
      setActiveImageIndex(0);
    }
  }, [images.length, activeImageIndex]);

  if (!item) return null;

  return (
    <div className="mk-qv" dir="rtl" role="dialog" aria-modal="true">
      <button
        type="button"
        className="mk-qv__backdrop"
        aria-label="إغلاق"
        onClick={() => setItem(null)}
      />

      <div className="mk-qv__panel">
        <button
          type="button"
          className="mk-qv__close"
          aria-label="إغلاق"
          onClick={() => setItem(null)}
        >
          ×
        </button>

        <div className="mk-qv__media">
          <div
            className={[
              "mk-qv__imageStage",
              zoom > 1 ? "is-zoomed" : "",
              isDragging ? "is-dragging" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={(event) => {
              if (zoom <= 1) return;

              dragRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                panX: pan.x,
                panY: pan.y,
              };

              setIsDragging(true);
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current || zoom <= 1) return;

              const nextX =
                dragRef.current.panX + (event.clientX - dragRef.current.startX);
              const nextY =
                dragRef.current.panY + (event.clientY - dragRef.current.startY);

              setPan({ x: nextX, y: nextY });
            }}
            onPointerUp={(event) => {
              dragRef.current = null;
              setIsDragging(false);
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              setIsDragging(false);
            }}
            onDoubleClick={() => {
              if (!image) return;

              if (zoom <= 1) {
                setZoom(2);
              } else {
                resetZoom();
              }
            }}
          >
            {image ? (
              <img
                className="mk-qv__image"
                src={image}
                alt={s(item.title) || "صورة المنتج"}
                draggable={false}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                }}
              />
            ) : (
              <div className="mk-qv__placeholder">لا توجد صورة</div>
            )}
          </div>

          {hasMultipleImages ? (
            <>
              <button
                type="button"
                className="mk-qv__nav mk-qv__nav--prev"
                aria-label="الصورة السابقة"
                onClick={() => moveImage(-1)}
              >
                <Icon icon={"ArrowRight01" as any} size={20} />
              </button>

              <button
                type="button"
                className="mk-qv__nav mk-qv__nav--next"
                aria-label="الصورة التالية"
                onClick={() => moveImage(1)}
              >
                <Icon icon={"ArrowLeft01" as any} size={20} />
              </button>
            </>
          ) : null}

          {image ? (
            <div className="mk-qv__zoomTools">
              <button
                type="button"
                aria-label="تكبير"
                onClick={zoomIn}
                disabled={zoom >= 3}
              >
                +
              </button>

              <button
                type="button"
                aria-label="تصغير"
                onClick={zoomOut}
                disabled={zoom <= 1}
              >
                −
              </button>

              <button
                type="button"
                aria-label="إعادة ضبط التكبير"
                onClick={resetZoom}
                disabled={zoom <= 1 && pan.x === 0 && pan.y === 0}
              >
                ↺
              </button>
            </div>
          ) : null}

          {hasMultipleImages ? (
            <div className="mk-qv__thumbs">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={[
                    "mk-qv__thumb",
                    index === activeImageIndex ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`الصورة ${index + 1}`}
                  onClick={() => goToImage(index)}
                >
                  <img src={src} alt="" draggable={false} />
                </button>
              ))}
            </div>
          ) : null}

          {baseOutOfStock ? (
            <div className="mk-qv__stockBadge">نفدت الكمية</div>
          ) : null}
        </div>

        <div className="mk-qv__body">
          {item.brand ? <div className="mk-qv__brand">{item.brand}</div> : null}

          <h2 className="mk-qv__title">{item.title}</h2>

          {item.subtitle ? (
            <div className="mk-qv__subtitle">{item.subtitle}</div>
          ) : null}

          {item.promotionTitle ? (
            <div className="mk-qv__promo">{item.promotionTitle}</div>
          ) : null}

          <div className="mk-qv__priceRow">
            <div className="mk-qv__price">
              {price !== null ? `${formatPrice(price)} ر.س` : "—"}
            </div>

            {discounted && compareAtPrice !== null ? (
              <div className="mk-qv__compare">
                {formatPrice(compareAtPrice)} ر.س
              </div>
            ) : null}
          </div>

          {options.length ? (
            <div className="mk-qv__options">
              {options.map((option: any, optionIndex: number) => {
                const optionId = normalizeOptionId(option, optionIndex);
                const title = optionTitle(option);
                const values = getOptionValues(option);

                if (!values.length) return null;

                return (
                  <div key={optionId} className="mk-qv__option">
                    {title ? (
                      <div className="mk-qv__optionTitle">{title}</div>
                    ) : null}

                    <div className="mk-qv__values">
                      {values.map((value: any, valueIndex: number) => {
                        const valueId = normalizeValueId(value, valueIndex);
                        const label = optionLabel(value);
                        const color = s(value?.color);
                        const unavailable = isUnavailableValue({
                          value,
                          valueId,
                          optionId,
                          allowedByOption,
                          variantsCount: variants.length,
                        });
                        const active = selected[optionId] === valueId;

                        return (
                          <button
                            key={valueId}
                            type="button"
                            disabled={unavailable}
                            className={[
                              "mk-qv__value",
                              color ? "mk-qv__value--color" : "",
                              active ? "is-active" : "",
                              unavailable ? "is-disabled" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={
                              unavailable ? `${label} - نفدت الكمية` : label
                            }
                            onClick={() => {
                              if (unavailable) return;

                              setSelected((prev) => ({
                                ...prev,
                                [optionId]: valueId,
                              }));
                            }}
                          >
                            {color ? (
                              <span style={{ background: color }} />
                            ) : (
                              label
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {needsVariant && !hasSelectedVariant ? (
            <div className="mk-qv__stockWarning">
              هذه التركيبة غير متوفرة أو نفدت الكمية.
            </div>
          ) : null}

          <div className="mk-qv__qtyRow">
            <button
              type="button"
              onClick={() => setQty((value) => Math.max(1, value - 1))}
            >
              −
            </button>

            <span>{qty}</span>

            <button
              type="button"
              onClick={() => setQty((value) => Math.max(1, value + 1))}
            >
              +
            </button>
          </div>

          <div className="mk-qv__actions">
            <button
              type="button"
              className="mk-qv__add"
              disabled={!canAddToCart}
              onClick={() => {
                if (!canAddToCart) return;

                window.dispatchEvent(
                  new CustomEvent("product:add-to-cart", {
                    detail: {
                      ...item,
                      qty,
                      quickView: true,
                      variantId: selectedVariant?.id
                        ? String(selectedVariant.id)
                        : null,
                      variant_id: selectedVariant?.id
                        ? String(selectedVariant.id)
                        : null,
                      selectedOptions: selectedOptionsSnapshot,
                      selected_options: selectedOptionsSnapshot,
                      selectedOptionValueIds,
                      selected_option_value_ids: selectedOptionValueIds,
                    },
                  }),
                );

                setItem(null);
              }}
            >
              <Icon icon={"ShoppingBasketAdd01" as any} size={18} />
              <span>{canAddToCart ? "أضف للسلة" : "نفدت الكمية"}</span>
            </button>

            <a className="mk-qv__details" href={item.href || "#"}>
              عرض التفاصيل
            </a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .mk-qv {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .mk-qv__backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(10px);
          cursor: pointer;
        }

        .mk-qv__panel {
          position: relative;
          z-index: 2;
          width: min(1040px, 100%);
          max-height: min(760px, calc(100vh - 36px));
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
          overflow: hidden;
          border-radius: 28px;
          background: #fff;
          box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
        }

        .mk-qv__close {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 20;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: #111827;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(10px);
        }

        .mk-qv__media {
          position: relative;
          min-height: 600px;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(255, 255, 255, 0.95),
              rgba(246, 246, 244, 0.9) 42%,
              rgba(241, 242, 244, 1)
            );
          overflow: hidden;
        }

        .mk-qv__imageStage {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: zoom-in;
          touch-action: pan-y;
          user-select: none;
        }

        .mk-qv__imageStage.is-zoomed {
          cursor: grab;
          touch-action: none;
        }

        .mk-qv__imageStage.is-dragging {
          cursor: grabbing;
        }

        .mk-qv__image {
          width: 100%;
          height: 100%;
          max-width: none;
          max-height: none;
          display: block;
          object-fit: contain;
          object-position: center;
          user-select: none;
          -webkit-user-drag: none;
          transition:
            transform 140ms ease,
            filter 180ms ease;
          will-change: transform;
        }

        .mk-qv__imageStage.is-dragging .mk-qv__image {
          transition: none;
        }

        .mk-qv__placeholder {
          width: 100%;
          height: 100%;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 900;
        }

        .mk-qv__nav {
          position: absolute;
          top: 50%;
          z-index: 12;
          width: 42px;
          height: 42px;
          transform: translateY(-50%);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: #111827;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(12px);
          transition:
            transform 160ms ease,
            background 160ms ease,
            box-shadow 160ms ease;
        }

        .mk-qv__nav:hover {
          transform: translateY(-50%) scale(1.05);
          background: #fff;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
        }

        .mk-qv__nav--prev {
          right: 14px;
        }

        .mk-qv__nav--next {
          left: 14px;
        }

        .mk-qv__zoomTools {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 13;
          height: 36px;
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
        }

        .mk-qv__zoomTools button {
          width: 38px;
          height: 36px;
          border: 0;
          border-inline-start: 1px solid rgba(15, 23, 42, 0.08);
          background: transparent;
          color: #111827;
          font-size: 15px;
          font-weight: 950;
          line-height: 1;
          cursor: pointer;
        }

        .mk-qv__zoomTools button:first-child {
          border-inline-start: 0;
        }

        .mk-qv__zoomTools button:hover:not(:disabled) {
          background: rgba(15, 23, 42, 0.045);
        }

        .mk-qv__zoomTools button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .mk-qv__thumbs {
          position: absolute;
          right: 12px;
          left: 12px;
          bottom: 12px;
          z-index: 12;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(14px);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .mk-qv__thumbs::-webkit-scrollbar {
          display: none;
        }

        .mk-qv__thumb {
          width: 48px;
          height: 58px;
          flex: 0 0 auto;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 0;
          background: #f8fafc;
          overflow: hidden;
          cursor: pointer;
          opacity: 0.7;
          transition:
            opacity 160ms ease,
            border-color 160ms ease,
            transform 160ms ease;
        }

        .mk-qv__thumb:hover {
          opacity: 1;
          transform: translateY(-1px);
        }

        .mk-qv__thumb.is-active {
          opacity: 1;
          border-color: #111827;
        }

        .mk-qv__thumb img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center top;
        }

        .mk-qv__stockBadge {
          position: absolute;
          right: 16px;
          bottom: 86px;
          z-index: 14;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 950;
          box-shadow: 0 14px 34px rgba(220, 38, 38, 0.22);
        }

        .mk-qv__body {
          min-width: 0;
          overflow-y: auto;
          padding: 34px 30px 26px;
        }

        .mk-qv__brand {
          width: fit-content;
          margin-bottom: 10px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #111827;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 900;
        }

        .mk-qv__title {
          margin: 0;
          color: #111827;
          font-size: 24px;
          font-weight: 1000;
          line-height: 1.35;
          letter-spacing: -0.03em;
        }

        .mk-qv__subtitle {
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.7;
        }

        .mk-qv__promo {
          width: fit-content;
          margin-top: 12px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 950;
        }

        .mk-qv__priceRow {
          margin-top: 18px;
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .mk-qv__price {
          color: #111827;
          font-size: 24px;
          font-weight: 1000;
          letter-spacing: -0.03em;
        }

        .mk-qv__compare {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 850;
          text-decoration: line-through;
        }

        .mk-qv__options {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mk-qv__option {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .mk-qv__optionTitle {
          color: #111827;
          font-size: 13px;
          font-weight: 950;
        }

        .mk-qv__values {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mk-qv__value {
          position: relative;
          min-width: 44px;
          min-height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 13px;
          background: #fff;
          color: #111827;
          padding: 0 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          overflow: hidden;
        }

        .mk-qv__value:hover {
          border-color: rgba(15, 23, 42, 0.28);
        }

        .mk-qv__value.is-active {
          border-color: #111827;
          background: #111827;
          color: #fff;
        }

        .mk-qv__value.is-disabled {
          cursor: not-allowed;
          border-color: rgba(220, 38, 38, 0.28);
          background: #fff1f2;
          color: rgba(153, 27, 27, 0.7);
          opacity: 0.75;
        }

        .mk-qv__value.is-disabled::after {
          content: "";
          position: absolute;
          left: 7px;
          right: 7px;
          top: 50%;
          height: 1.5px;
          border-radius: 999px;
          background: rgba(220, 38, 38, 0.9);
          transform: translateY(-50%) rotate(-12deg);
        }

        .mk-qv__value--color {
          width: 38px;
          min-width: 38px;
          padding: 0;
        }

        .mk-qv__value--color span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          margin: auto;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85);
        }

        .mk-qv__stockWarning {
          margin-top: 14px;
          border-radius: 14px;
          border: 1px solid rgba(220, 38, 38, 0.18);
          background: #fff1f2;
          color: #991b1b;
          padding: 11px 13px;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.7;
        }

        .mk-qv__qtyRow {
          width: fit-content;
          margin-top: 22px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 5px;
        }

        .mk-qv__qtyRow button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          background: #fff;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
        }

        .mk-qv__qtyRow span {
          min-width: 28px;
          text-align: center;
          color: #111827;
          font-size: 14px;
          font-weight: 950;
        }

        .mk-qv__actions {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 10px;
        }

        .mk-qv__add,
        .mk-qv__details {
          height: 48px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
        }

        .mk-qv__add {
          border: 0;
          background: #050816;
          color: #fff;
          cursor: pointer;
        }

        .mk-qv__add:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .mk-qv__details {
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: #fff;
          color: #111827;
        }

        @media (max-width: 820px) {
          .mk-qv {
            padding: 10px;
            align-items: flex-end;
          }

          .mk-qv__panel {
            max-height: calc(100vh - 20px);
            grid-template-columns: 1fr;
            border-radius: 24px;
          }

          .mk-qv__media {
            min-height: 340px;
            height: 46vh;
          }

          .mk-qv__placeholder {
            min-height: 340px;
          }

          .mk-qv__nav {
            width: 38px;
            height: 38px;
          }

          .mk-qv__zoomTools {
            top: 12px;
            right: 12px;
            height: 34px;
          }

          .mk-qv__zoomTools button {
            width: 36px;
            height: 34px;
          }

          .mk-qv__thumbs {
            right: 10px;
            left: 10px;
            bottom: 10px;
            justify-content: flex-start;
          }

          .mk-qv__thumb {
            width: 44px;
            height: 52px;
          }

          .mk-qv__stockBadge {
            bottom: 78px;
          }

          .mk-qv__body {
            padding: 22px 18px 18px;
          }

          .mk-qv__title {
            font-size: 20px;
          }

          .mk-qv__price {
            font-size: 21px;
          }

          .mk-qv__actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}