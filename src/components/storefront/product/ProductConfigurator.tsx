// FILE: apps/storefront/src/components/storefront/product/ProductConfigurator.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProductOptionValueRow = {
  id: string;
  name: string;
  display_value?: string | null;
  extra_price?: number | null;
  quantity?: number | null;
  is_default?: boolean | null;
  image_url?: string | null;
  sort_order?: number | null;
};

type ProductOptionRow = {
  id: string;
  name: string;
  is_required?: boolean | null;
  option_field_type?: string | null;
  display_type?: "text" | "image" | "color" | string | null;
  sort_order?: number | null;
  values?: ProductOptionValueRow[];
};

type ProductVariantRow = {
  id: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  sale_price?: number | null;
  stock_quantity?: number | null;
  unlimited_quantity?: boolean | null;
  is_default?: boolean | null;
  option_value_ids?: string[];
};

type ProductPricingRow = {
  currency?: string | null;
  price?: number | null;
  sale_price?: number | null;
} | null;

type ProductStockRow = {
  quantity?: number | null;
  unlimited_quantity?: boolean | null;
  hide_quantity?: boolean | null;
  maximum_quantity_per_order?: number | null;
} | null;

type ProductSEO = {
  currency?: string | null;
  price?: number | null;
  sale_price?: number | null;
  in_stock?: boolean | null;
} | null;

function fmtMoney(v: any) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function sortOptions(arr: ProductOptionRow[]) {
  const x = (arr || []).filter(Boolean);
  x.sort((a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0));
  for (const opt of x) {
    const vals = (opt.values || []).filter(Boolean);
    vals.sort(
      (a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
    );
    opt.values = vals;
  }
  return x;
}

function resolveVariant(
  variants: ProductVariantRow[],
  selected: Record<string, string | null>,
) {
  const chosenIds = Object.values(selected).filter(Boolean) as string[];
  const chosenSet = new Set(chosenIds);

  if (!variants.length) return null;

  const candidates = variants.filter((v) => {
    const ids = new Set((v.option_value_ids || []).filter(Boolean));
    for (const id of chosenSet) if (!ids.has(id)) return false;
    return true;
  });

  if (!candidates.length) return null;

  const def = candidates.find((v) => v.is_default);
  return def || candidates[0];
}

function buildDefaultSelection(options: ProductOptionRow[]) {
  const out: Record<string, string | null> = {};
  for (const opt of options) {
    const vals = opt.values || [];
    const def = vals.find((v) => v.is_default) || vals[0];
    out[opt.id] = def?.id ?? null;
  }
  return out;
}

function computeMaxQty(
  stock: ProductStockRow,
  variant: ProductVariantRow | null,
) {
  const globalMax =
    typeof stock?.maximum_quantity_per_order === "number"
      ? stock.maximum_quantity_per_order
      : null;

  if (variant) {
    if (variant.unlimited_quantity) return globalMax ?? 999;
    const vQty = Number(variant.stock_quantity ?? 0);
    return globalMax === null ? vQty : Math.min(globalMax, vQty);
  }

  if (stock?.unlimited_quantity) return globalMax ?? 999;
  const qty = Number(stock?.quantity ?? 0);
  return globalMax === null ? qty : Math.min(globalMax, qty);
}

/* ----------------------- helpers ----------------------- */

// ✅ فحص UUID (لأن DB عندك product_option_values.id UUID)
function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    x,
  );
}

/* ----------------------- metadata adapters ----------------------- */

function metadataEnabled(metadata: any) {
  return Boolean(
    metadata?.optionsEnabled ??
    metadata?.options_enabled ??
    metadata?.options_enabled_flag ??
    false,
  );
}

function coerceOptionsFromMetadata(metadata: any): ProductOptionRow[] {
  const raw = Array.isArray(metadata?.options) ? metadata.options : [];
  if (!raw.length) return [];

  return raw
    .map((o: any, idx: number) => {
      const values = Array.isArray(o?.values) ? o.values : [];
      return {
        id: String(o?.id ?? `meta-opt-${idx}`),
        name: String(o?.name ?? ""),
        is_required: true,
        option_field_type: "radio",
        display_type: String(o?.featureType ?? o?.display_type ?? "text"),
        sort_order: idx,
        values: values
          .map((v: any, vIdx: number) => ({
            id: String(v?.id ?? `meta-val-${idx}-${vIdx}`),
            name: String(v?.name ?? ""),
            display_value: v?.display_value ?? v?.displayValue ?? null,
            extra_price:
              typeof v?.extra_price === "number"
                ? v.extra_price
                : typeof v?.extraPrice === "number"
                  ? v.extraPrice
                  : null,
            quantity:
              typeof v?.quantity === "number" ? v.quantity : (v?.qty ?? null),
            is_default: Boolean(v?.isDefault ?? v?.is_default ?? false),
            image_url: v?.image_url ?? v?.imageUrl ?? null,
            sort_order:
              typeof v?.sort_order === "number"
                ? v.sort_order
                : typeof v?.sortOrder === "number"
                  ? v.sortOrder
                  : vIdx,
          }))
          .filter((x: any) => x.id && x.name),
      } as ProductOptionRow;
    })
    .filter(
      (x: any) => x.id && x.name && Array.isArray(x.values) && x.values.length,
    );
}

function coerceVariantsFromMetadata(metadata: any): ProductVariantRow[] {
  const raw = Array.isArray(metadata?.variants) ? metadata.variants : [];
  if (!raw.length) return [];

  return raw
    .map((v: any) => {
      const selections = Array.isArray(v?.selections) ? v.selections : [];
      const option_value_ids = selections
        .map((s: any) => s?.valueId)
        .filter(Boolean)
        .map((x: any) => String(x));

      return {
        id: String(v?.id),
        sku: v?.sku ?? null,
        barcode: v?.barcode ?? null,
        price: v?.price ?? null,
        sale_price: v?.discount ?? v?.sale_price ?? null,
        stock_quantity:
          typeof v?.qty === "number" ? v.qty : Number(v?.qty ?? 0),
        unlimited_quantity: false,
        is_default: Boolean(v?.is_default ?? v?.isDefault ?? false),
        option_value_ids,
      } as ProductVariantRow;
    })
    .filter((x: any) => x.id);
}

/* ----------------------- API helpers ----------------------- */

type CartApiNotice = {
  code: "ADDED_MAX_AVAILABLE" | "QTY_LIMIT_REACHED" | string;
  message: string;
  requested_add?: number;
  added_now?: number;
  in_cart_before?: number;
  in_cart_after?: number;
  available?: number | null;
  max_per_order?: number | null;
  can_add_next?: number | null;
};

type CartApiResponse = {
  data?: {
    cart_id?: string;
    item?: any;
    notice?: CartApiNotice | null;
    stock?: {
      available?: number | null;
      max_per_order?: number | null;
      in_cart_after?: number | null;
      added_now?: number | null;
    };
  };
  error?: string;
  message?: string;
};

async function postAddToCart(body: {
  product_id: string;
  variant_id: string | null;
  qty: number;
  selected_option_value_ids: string[];
}) {
  const r = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json: CartApiResponse = await r.json().catch(() => ({}) as any);

  if (!r.ok) {
    const err = json?.error || "ADD_TO_CART_FAILED";
    return { ok: false as const, error: err, raw: json };
  }

  return { ok: true as const, raw: json };
}

function friendlyServerError(code: string) {
  if (code === "VARIANT_NOT_FOUND" || code === "INVALID_VARIANT_FOR_PRODUCT")
    return "الخيار المحدد غير متوفر حالياً. جرّب اختياراً آخر.";
  if (code === "PRODUCT_NOT_FOUND") return "المنتج غير موجود.";
  return "تعذر إضافة المنتج للسلة.";
}

export default function ProductConfigurator({
  productId,
  currencyFallback,
  pricing,
  stock,
  options,
  variants,
  seo,
  metadata,
}: {
  productId: string;
  currencyFallback: string;
  pricing: ProductPricingRow;
  stock: ProductStockRow;
  options: ProductOptionRow[];
  variants: ProductVariantRow[];
  seo: ProductSEO;
  metadata?: Record<string, any> | null;
}) {
  const enabled = metadataEnabled(metadata);

  const optionsFinal = useMemo(() => {
    const fromDb = Array.isArray(options) ? options : [];
    if (fromDb.length) return fromDb;
    return coerceOptionsFromMetadata(metadata);
  }, [options, metadata]);

  const variantsFinal = useMemo(() => {
    const fromDb = Array.isArray(variants) ? variants : [];
    if (fromDb.length) return fromDb;
    return coerceVariantsFromMetadata(metadata);
  }, [variants, metadata]);

  const sortedOptions = useMemo(
    () => sortOptions(optionsFinal || []),
    [optionsFinal],
  );
  const vList = useMemo(
    () => (variantsFinal || []).filter(Boolean),
    [variantsFinal],
  );

  const currency = seo?.currency || pricing?.currency || currencyFallback;

  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const [qty, setQty] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hideTimerRef = useRef<any>(null);

  function flashNotice(msg: string, ms = 3000) {
    setNotice(msg);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setNotice(null), ms);
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sortedOptions.length) {
      setSelected({});
      return;
    }
    setSelected(buildDefaultSelection(sortedOptions));
  }, [sortedOptions]);

  const variant = useMemo(
    () => resolveVariant(vList, selected),
    [vList, selected],
  );

  const basePrice = variant?.price ?? pricing?.price ?? seo?.price ?? null;
  const salePrice =
    variant?.sale_price ?? pricing?.sale_price ?? seo?.sale_price ?? null;

  const inStock = useMemo(() => {
    if (variant) {
      if (variant.unlimited_quantity) return true;
      return Number(variant.stock_quantity ?? 0) > 0;
    }
    if (stock?.unlimited_quantity) return true;
    if (typeof stock?.quantity === "number") return stock.quantity > 0;
    if (seo?.in_stock === null || seo?.in_stock === undefined) return null;
    return !!seo.in_stock;
  }, [variant, stock, seo]);

  const maxQty = useMemo(() => computeMaxQty(stock, variant), [stock, variant]);

  useEffect(() => {
    if (qty > maxQty) setQty(Math.max(1, maxQty));
    if (qty < 1) setQty(1);
  }, [maxQty, qty]);

  function isSelectionComplete() {
    for (const opt of sortedOptions) {
      if (opt.is_required && !selected[opt.id]) return false;
    }
    return true;
  }

  async function onAddToCart() {
    setError(null);
    setNotice(null);

    if (!productId) {
      setError("productId غير موجود في الصفحة.");
      return;
    }

    if (!isSelectionComplete()) {
      setError("اختر جميع الخيارات المطلوبة أولاً.");
      return;
    }

    if (vList.length && !variant) {
      setError("التركيبة غير متاحة بهذا الاختيار.");
      return;
    }

    if (inStock === false) {
      setError("المنتج غير متوفر حالياً.");
      return;
    }

    if (maxQty <= 0) {
      setError("لا يوجد مخزون.");
      return;
    }

    // ✅ أهم تعديل: منع إرسال IDs ليست UUID (لأن DB عندك UUID فقط)
    const selectedIdsRaw = Object.values(selected).filter(Boolean) as string[];
    const bad = selectedIdsRaw.filter((id) => !isUuid(id));

    if (bad.length) {
      setError(
        "هذه الخيارات غير مربوطة بقاعدة البيانات (metadata). لازم يتم جلب الخيارات من DB حتى تنحفظ بشكل صحيح داخل السلة والطلبات.",
      );
      return;
    }

    setLoading(true);
    try {
      const selectedIds = selectedIdsRaw;

      const res = await postAddToCart({
        product_id: productId,
        variant_id: variant?.id ?? null,
        qty,
        selected_option_value_ids: selectedIds,
      });

      if (!res.ok) {
        setError(friendlyServerError(res.error));
        return;
      }

      const payload = res.raw?.data ?? {};
      const n: CartApiNotice | null = payload.notice ?? null;

      window.dispatchEvent(new CustomEvent("cart:changed"));

      if (n?.code === "ADDED_MAX_AVAILABLE") {
        flashNotice(n.message || "تمت إضافة المتاح فقط ✅", 4500);
        setQty(1);
        return;
      }

      if (n?.code === "QTY_LIMIT_REACHED") {
        flashNotice(n.message || "وصلت للحد الأقصى داخل السلة ✅", 4500);
        return;
      }

      flashNotice("تمت الإضافة للسلة ✅", 2500);
      setQty(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border bg-slate-50 p-5">
      {/* Price + Stock */}
      <div className="flex flex-wrap items-center gap-3">
        {salePrice ? (
          <>
            <div className="text-xl font-semibold text-slate-900">
              {fmtMoney(salePrice)} {currency}
            </div>
            {basePrice ? (
              <div className="text-sm text-slate-500 line-through">
                {fmtMoney(basePrice)} {currency}
              </div>
            ) : null}
          </>
        ) : basePrice ? (
          <div className="text-xl font-semibold text-slate-900">
            {fmtMoney(basePrice)} {currency}
          </div>
        ) : (
          <div className="text-sm text-slate-500">السعر غير متوفر</div>
        )}

        {inStock === null ? null : inStock ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
            متوفر
            {variant?.unlimited_quantity ? (
              <span className="mr-2">• مخزون غير محدود</span>
            ) : variant ? (
              <span className="mr-2">
                • المتاح: {Number(variant.stock_quantity ?? 0)}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
            غير متوفر
          </span>
        )}
      </div>

      {/* Options */}
      {sortedOptions.length ? (
        <div className="mt-5 space-y-4">
          {sortedOptions.map((opt) => (
            <div key={opt.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {opt.name}
                </div>
                {opt.is_required ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                    مطلوب
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(opt.values || []).map((v) => {
                  const active = selected[opt.id] === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setSelected((s) => ({ ...s, [opt.id]: v.id }))
                      }
                      className={[
                        "rounded-xl border px-3 py-2 text-xs",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "bg-white text-slate-800 hover:bg-slate-50",
                      ].join(" ")}
                      title={v.display_value || v.name}
                    >
                      <span className="inline-flex items-center gap-2">
                        {opt.display_type === "image" && v.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.image_url}
                            alt={v.display_value || v.name}
                            className="h-6 w-6 rounded-md border object-cover"
                          />
                        ) : null}
                        <span>{v.display_value || v.name}</span>
                        {v.extra_price && Number(v.extra_price) !== 0 ? (
                          <span
                            className={
                              active ? "text-white/80" : "text-slate-500"
                            }
                          >
                            (+{fmtMoney(v.extra_price)} {currency})
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Variant info */}
      {vList.length ? (
        <div className="mt-4 text-xs text-slate-600">
          {variant ? (
            <span>
              variant_id: <b>{variant.id}</b>
              {variant.sku ? (
                <span className="mr-2">• SKU: {variant.sku}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-red-700">اختر الخيارات لتحديد التركيبة.</span>
          )}
        </div>
      ) : null}

      {/* Qty + Add */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center overflow-hidden rounded-xl border bg-white">
          <button
            type="button"
            className="px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <div className="min-w-[48px] px-3 py-2 text-center text-sm">
            {qty}
          </div>
          <button
            type="button"
            className="px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAddToCart}
          disabled={loading || inStock === false || maxQty <= 0}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold",
            loading || inStock === false || maxQty <= 0
              ? "cursor-not-allowed bg-slate-300 text-slate-600"
              : "bg-slate-900 text-white hover:bg-slate-800",
          ].join(" ")}
        >
          {loading ? "جارٍ الإضافة..." : "إضافة للسلة"}
        </button>

        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="text-sm text-green-700">{notice}</div> : null}
      </div>

      {/* debug اختياري */}
      {/* <pre className="mt-4 text-xs">{JSON.stringify({ enabled, sortedOptions, vList }, null, 2)}</pre> */}
    </div>
  );
}
