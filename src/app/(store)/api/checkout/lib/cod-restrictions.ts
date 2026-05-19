// FILE: apps/storefront/src/app/(store)/api/checkout/lib/cod-restrictions.ts

type CodRestrictionReason =
  | "COD_UNTRUSTED_CUSTOMER"
  | "COD_MINIMUM_SUBTOTAL"
  | "COD_MAXIMUM_SUBTOTAL"
  | "COD_MAXIMUM_WEIGHT"
  | "COD_PRODUCT_EXCLUDED"
  | "COD_CATEGORY_EXCLUDED";

type CartItemRow = {
  id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  qty?: number | string | null;
};

type CodRestrictionRow = {
  store_id: string;
  minimum_subtotal: number | string | null;
  maximum_subtotal: number | string | null;
  maximum_weight_kg: number | string | null;
  block_untrusted_customers?: boolean | null;
  untrusted_min_store_count?: number | string | null;
  metadata?: Record<string, any> | string | null;
};

export type CodUntrustedCustomerRecord = {
  store_id: string;
  store_name: string;
  reason_code: string;
  reason_text: string;
  reason_note: string | null;
  created_at: string | null;
  is_current_store: boolean;
};

export type CodUntrustedCustomerSummary = {
  active_record_count: number;
  active_store_count: number;
  threshold: number;

  is_untrusted: boolean;
  should_block_cod: boolean;

  current_store_blocked: boolean;
  platform_untrusted_blocked: boolean;
  current_store_record: CodUntrustedCustomerRecord | null;

  latest_reason_code: string | null;
  latest_reason_text: string | null;
  latest_reason_note: string | null;
  latest_at: string | null;

  records: CodUntrustedCustomerRecord[];
  reasons: Array<{
    reason_code: string;
    reason_text: string;
    count: number;
  }>;
};

export type CodRestrictionEvaluation = {
  configured: boolean;
  allowed: boolean;
  reason: CodRestrictionReason | null;

  cartSubtotal: number;
  minimumSubtotal: number | null;
  maximumSubtotal: number | null;
  remainingToMinimum: number;

  cartWeightKg: number;
  maximumWeightKg: number | null;

  excludedProductId: string | null;
  excludedCategoryId: string | null;

  blockUntrustedCustomers: boolean;
  untrustedMinStoreCount: number;
  untrustedCustomerSummary: CodUntrustedCustomerSummary | null;
};

const REASON_LABELS: Record<string, string> = {
  no_response: "العميل لا يجيب عند التواصل",
  not_serious_payment: "العميل غير جاد في الدفع",
  not_serious_receiving: "العميل غير جاد في استلام الطلب",
  other: "أخرى",
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

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

function positiveOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;

  return num;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => s(value)).filter(Boolean)));
}

function reasonText(reasonCode?: string | null, reasonNote?: string | null) {
  const code = s(reasonCode);
  const note = s(reasonNote);

  if (code === "other" && note) return note;

  return REASON_LABELS[code] || "سجل غير محدد";
}

function toKg(weight: unknown, unit: unknown) {
  const value = n(weight, 0);
  if (!(value > 0)) return 0;

  const u = s(unit || "kg").toLowerCase();

  if (u === "g" || u === "gram" || u === "grams") return value / 1000;

  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") {
    return value * 0.45359237;
  }

  if (u === "oz" || u === "ounce" || u === "ounces") {
    return value * 0.0283495231;
  }

  return value;
}

function normalizeThreshold(value: unknown) {
  const raw = Math.floor(n(value, 3));
  return Math.max(1, raw || 3);
}

function emptyEvaluation(args?: {
  cartSubtotal?: number;
  blockUntrustedCustomers?: boolean;
  untrustedMinStoreCount?: number;
  untrustedCustomerSummary?: CodUntrustedCustomerSummary | null;
}): CodRestrictionEvaluation {
  return {
    configured: false,
    allowed: true,
    reason: null,

    cartSubtotal: round2(Math.max(0, n(args?.cartSubtotal))),
    minimumSubtotal: null,
    maximumSubtotal: null,
    remainingToMinimum: 0,

    cartWeightKg: 0,
    maximumWeightKg: null,

    excludedProductId: null,
    excludedCategoryId: null,

    blockUntrustedCustomers: Boolean(args?.blockUntrustedCustomers),
    untrustedMinStoreCount: normalizeThreshold(args?.untrustedMinStoreCount ?? 3),
    untrustedCustomerSummary: args?.untrustedCustomerSummary ?? null,
  };
}

async function loadIds(args: {
  sb: any;
  table: string;
  column: string;
  storeId: string;
}) {
  const { data, error } = await args.sb
    .from(args.table)
    .select(args.column)
    .eq("store_id", args.storeId);

  if (error) throw new Error(error.message);

  return uniq(
    (data ?? []).map((row: any) => s(row?.[args.column])).filter(Boolean),
  );
}

async function loadCartItems(args: {
  sb: any;
  storeId: string;
  cartId: string;
}) {
  const { data, error } = await args.sb
    .from("cart_items")
    .select("id,product_id,variant_id,qty")
    .eq("store_id", args.storeId)
    .eq("cart_id", args.cartId);

  if (error) throw new Error(error.message);

  return Array.isArray(data) ? (data as CartItemRow[]) : [];
}

async function computeCartWeightKg(args: {
  sb: any;
  productIds: string[];
  variantIds: string[];
  items: CartItemRow[];
}) {
  if (!args.items.length || !args.productIds.length) return 0;

  const productWeightById = new Map<string, number>();
  const variantWeightById = new Map<string, number>();

  const productWeightsR = await args.sb
    .from("product_shipping")
    .select("product_id,weight,weight_unit")
    .in("product_id", args.productIds);

  if (productWeightsR.error) throw new Error(productWeightsR.error.message);

  for (const row of productWeightsR.data ?? []) {
    const productId = s(row?.product_id);
    if (!productId) continue;

    productWeightById.set(productId, toKg(row?.weight, row?.weight_unit));
  }

  if (args.variantIds.length) {
    const variantWeightsR = await args.sb
      .from("product_variants")
      .select("id,weight,weight_unit")
      .in("id", args.variantIds);

    if (variantWeightsR.error) throw new Error(variantWeightsR.error.message);

    for (const row of variantWeightsR.data ?? []) {
      const variantId = s(row?.id);
      if (!variantId) continue;

      variantWeightById.set(variantId, toKg(row?.weight, row?.weight_unit));
    }
  }

  let total = 0;

  for (const item of args.items) {
    const productId = s(item.product_id);
    const variantId = s(item.variant_id);

    const qtyValue = Number(item?.qty ?? 1);
    const qty = Math.max(
      1,
      Math.floor(Number.isFinite(qtyValue) ? qtyValue : 1),
    );

    const variantWeight = variantId ? variantWeightById.get(variantId) : 0;
    const productWeight = productId ? productWeightById.get(productId) : 0;

    total += Math.max(0, variantWeight || productWeight || 0) * qty;
  }

  return round2(total);
}

async function findExcludedCategory(args: {
  sb: any;
  productIds: string[];
  excludedCategoryIds: string[];
}) {
  if (!args.productIds.length || !args.excludedCategoryIds.length) {
    return null;
  }

  const { data, error } = await args.sb
    .from("product_categories")
    .select("product_id,category_id")
    .in("product_id", args.productIds)
    .in("category_id", args.excludedCategoryIds)
    .limit(1);

  if (error) throw new Error(error.message);

  const first = Array.isArray(data) ? data[0] : null;
  return s(first?.category_id) || null;
}

async function loadUntrustedCustomerSummary(args: {
  sb: any;
  storeId: string;
  customerId: string;
  threshold: number;
  blockUntrustedCustomers: boolean;
}): Promise<CodUntrustedCustomerSummary | null> {
  const storeId = s(args.storeId);
  const customerId = s(args.customerId);
  const threshold = normalizeThreshold(args.threshold);
  const blockUntrustedCustomers = Boolean(args.blockUntrustedCustomers);

  if (!storeId || !customerId) return null;

  const recordsR = await args.sb
    .from("customer_reputation_records")
    .select(
      [
        "id",
        "store_id",
        "customer_id",
        "order_id",
        "reason_code",
        "reason_note",
        "status",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (recordsR.error) throw new Error(recordsR.error.message);

  const records = Array.isArray(recordsR.data) ? recordsR.data : [];
  const storeIds = uniq(records.map((row: any) => s(row.store_id)));

  const storeNameById = new Map<string, string>();

  if (storeIds.length) {
    const storesR = await args.sb
      .from("stores")
      .select("id,name")
      .in("id", storeIds);

    if (storesR.error) throw new Error(storesR.error.message);

    for (const store of storesR.data ?? []) {
      const id = s(store?.id);
      if (!id) continue;

      storeNameById.set(id, s(store?.name) || "متجر");
    }
  }

  const latestRecord = records[0] || null;

  const reasonsMap = new Map<
    string,
    {
      reason_code: string;
      reason_text: string;
      count: number;
    }
  >();

  const normalizedRecords: CodUntrustedCustomerRecord[] = records.map(
    (row: any) => {
      const recordStoreId = s(row.store_id);
      const code = s(row.reason_code) || "other";
      const text = reasonText(code, row.reason_note);

      const old = reasonsMap.get(code);

      reasonsMap.set(code, {
        reason_code: code,
        reason_text: text,
        count: (old?.count || 0) + 1,
      });

      return {
        store_id: recordStoreId,
        store_name: storeNameById.get(recordStoreId) || "متجر",
        reason_code: code,
        reason_text: text,
        reason_note: s(row.reason_note) || null,
        created_at: row.created_at ?? null,
        is_current_store: recordStoreId === storeId,
      };
    },
  );

  normalizedRecords.sort((a, b) => {
    if (a.is_current_store && !b.is_current_store) return -1;
    if (!a.is_current_store && b.is_current_store) return 1;

    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;

    return bt - at;
  });

  const activeStoreCount = storeIds.length;
  const isUntrusted = activeStoreCount >= threshold;

  const currentStoreRecord =
    normalizedRecords.find((record) => record.is_current_store) ?? null;

  const currentStoreBlocked = Boolean(currentStoreRecord);

  const platformUntrustedBlocked =
    !currentStoreBlocked && blockUntrustedCustomers && isUntrusted;

  return {
    active_record_count: records.length,
    active_store_count: activeStoreCount,
    threshold,

    is_untrusted: isUntrusted,
    should_block_cod: currentStoreBlocked || platformUntrustedBlocked,

    current_store_blocked: currentStoreBlocked,
    platform_untrusted_blocked: platformUntrustedBlocked,
    current_store_record: currentStoreRecord,

    latest_reason_code: latestRecord ? s(latestRecord.reason_code) : null,
    latest_reason_text: latestRecord
      ? reasonText(latestRecord.reason_code, latestRecord.reason_note)
      : null,
    latest_reason_note: latestRecord ? s(latestRecord.reason_note) || null : null,
    latest_at: latestRecord?.created_at ?? null,

    records: normalizedRecords,
    reasons: Array.from(reasonsMap.values()),
  };
}

export async function evaluateCodRestrictions(args: {
  sb: any;
  storeId: string;
  cartId: string;
  cartSubtotal: number;
  customerId?: string | null;
  toCartCurrency?: (amount: number) => number;
}): Promise<CodRestrictionEvaluation> {
  const storeId = s(args.storeId);
  const cartId = s(args.cartId);
  const customerId = s(args.customerId);
  const cartSubtotal = round2(Math.max(0, n(args.cartSubtotal)));

  if (!storeId || !cartId) {
    return emptyEvaluation({ cartSubtotal });
  }

  const restrictionsR = await args.sb
    .from("store_cod_restrictions")
    .select(
      [
        "store_id",
        "minimum_subtotal",
        "maximum_subtotal",
        "maximum_weight_kg",
        "block_untrusted_customers",
        "untrusted_min_store_count",
        "metadata",
      ].join(","),
    )
    .eq("store_id", storeId)
    .maybeSingle();

  if (restrictionsR.error && restrictionsR.error.code !== "PGRST116") {
    throw new Error(restrictionsR.error.message);
  }

  const row = restrictionsR.data as CodRestrictionRow | null;
  const metadata = safeObject(row?.metadata);

  const blockUntrustedCustomers = Boolean(row?.block_untrusted_customers);
  const untrustedMinStoreCount = normalizeThreshold(
    row?.untrusted_min_store_count ??
      metadata.untrusted_min_store_count ??
      metadata.untrustedMinStoreCount ??
      3,
  );

  const untrustedCustomerSummary = customerId
    ? await loadUntrustedCustomerSummary({
        sb: args.sb,
        storeId,
        customerId,
        threshold: untrustedMinStoreCount,
        blockUntrustedCustomers,
      })
    : null;

  if (!row?.store_id) {
    const base = emptyEvaluation({
      cartSubtotal,
      blockUntrustedCustomers,
      untrustedMinStoreCount,
      untrustedCustomerSummary,
    });

    if (untrustedCustomerSummary?.should_block_cod) {
      return {
        ...base,
        allowed: false,
        reason: "COD_UNTRUSTED_CUSTOMER",
      };
    }

    return base;
  }

  const convert = args.toCartCurrency || ((amount: number) => amount);

  const minimumRaw = Math.max(0, n(row.minimum_subtotal, 0));
  const maximumRaw = positiveOrNull(row.maximum_subtotal);
  const maximumWeightKg = positiveOrNull(row.maximum_weight_kg);

  const minimumSubtotal =
    minimumRaw > 0 ? round2(Math.max(0, convert(minimumRaw))) : null;

  const maximumSubtotal =
    maximumRaw != null ? round2(Math.max(0, convert(maximumRaw))) : null;

  const baseEvaluation: CodRestrictionEvaluation = {
    configured: true,
    allowed: true,
    reason: null,

    cartSubtotal,
    minimumSubtotal,
    maximumSubtotal,
    remainingToMinimum: 0,

    cartWeightKg: 0,
    maximumWeightKg,

    excludedProductId: null,
    excludedCategoryId: null,

    blockUntrustedCustomers,
    untrustedMinStoreCount,
    untrustedCustomerSummary,
  };

  if (untrustedCustomerSummary?.should_block_cod) {
    return {
      ...baseEvaluation,
      allowed: false,
      reason: "COD_UNTRUSTED_CUSTOMER",
    };
  }

  if (minimumSubtotal != null && cartSubtotal < minimumSubtotal) {
    return {
      ...baseEvaluation,
      allowed: false,
      reason: "COD_MINIMUM_SUBTOTAL",
      remainingToMinimum: round2(Math.max(0, minimumSubtotal - cartSubtotal)),
    };
  }

  if (maximumSubtotal != null && cartSubtotal > maximumSubtotal) {
    return {
      ...baseEvaluation,
      allowed: false,
      reason: "COD_MAXIMUM_SUBTOTAL",
    };
  }

  const items = await loadCartItems({
    sb: args.sb,
    storeId,
    cartId,
  });

  const productIds = uniq(items.map((item) => s(item.product_id)));
  const variantIds = uniq(items.map((item) => s(item.variant_id)));

  const [excludedProductIds, excludedCategoryIds] = await Promise.all([
    loadIds({
      sb: args.sb,
      storeId,
      table: "store_cod_restriction_excluded_products",
      column: "product_id",
    }),

    loadIds({
      sb: args.sb,
      storeId,
      table: "store_cod_restriction_excluded_categories",
      column: "category_id",
    }),
  ]);

  if (excludedProductIds.length && productIds.length) {
    const excludedProductsSet = new Set(excludedProductIds);
    const matchedProductId = productIds.find((id) => excludedProductsSet.has(id));

    if (matchedProductId) {
      return {
        ...baseEvaluation,
        allowed: false,
        reason: "COD_PRODUCT_EXCLUDED",
        excludedProductId: matchedProductId,
      };
    }
  }

  if (excludedCategoryIds.length && productIds.length) {
    const excludedCategoryId = await findExcludedCategory({
      sb: args.sb,
      productIds,
      excludedCategoryIds,
    });

    if (excludedCategoryId) {
      return {
        ...baseEvaluation,
        allowed: false,
        reason: "COD_CATEGORY_EXCLUDED",
        excludedCategoryId,
      };
    }
  }

  if (maximumWeightKg != null) {
    const cartWeightKg = await computeCartWeightKg({
      sb: args.sb,
      productIds,
      variantIds,
      items,
    });

    if (cartWeightKg > maximumWeightKg) {
      return {
        ...baseEvaluation,
        allowed: false,
        reason: "COD_MAXIMUM_WEIGHT",
        cartWeightKg,
      };
    }

    return {
      ...baseEvaluation,
      cartWeightKg,
    };
  }

  return baseEvaluation;
}