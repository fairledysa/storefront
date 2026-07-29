// FILE: apps/storefront/src/app/(store)/api/cart/items/route.ts

import { NextResponse } from "next/server";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { isProductVisibleInWeb } from "@/data/catalog/products";
import {
  cartSessionCookie,
  getCartSessionId,
  getCartSessionIdFromCookie,
  getExistingOpenCart,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
  buildLineKey,
} from "../../_cart/cart.server";
import { GET as getCartPayload } from "../route";

export const dynamic = "force-dynamic";

const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
const MAX_IMAGES = 4;

type AddItemBody = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  selected_option_value_ids?: string[];
  selected_options?: Array<{ name: string; value: string }>;
};

type PatchBody =
  | { op: "inc"; cart_item_id: string; delta: number }
  | { op: "set_qty"; cart_item_id: string; qty: number }
  | {
      op: "set_variant";
      cart_item_id: string;
      selected_option_value_ids: string[];
      variant_id?: string | null;
      confirm_qty_reduction?: boolean;
      selected_options?: Array<{ name: string; value: string }>;
    };

type DeleteBody = { cart_item_id: string };

type StockInfo =
  | {
      ok: true;
      unlimited: boolean;
      available_qty: number;
      max_per_order: number | null;
    }
  | {
      ok: false;
      reason:
        | "PRODUCT_NOT_FOUND"
        | "VARIANT_NOT_FOUND"
        | "INVALID_VARIANT_FOR_PRODUCT";
    };

function clampQty(n: any) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.floor(x));
}
function s(value: unknown) {
  return String(value ?? "").trim();
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
async function readProductPrimaryImageUrl(args: {
  storeDb: any;
  storeId: string;
  productId: string;
}) {
  const result = await args.storeDb
    .from("product_media")
    .select("original_url,thumbnail_url,is_default,sort_order")
    .eq("store_id", args.storeId)
    .eq("product_id", args.productId)
    .eq("media_kind", "image")
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    return null;
  }

  return s(result.data?.thumbnail_url) || s(result.data?.original_url) || null;
}
async function readCartActor(args: { storeDb: any; cart: any }) {
  const userId = s(args.cart?.user_id);

  if (!userId) {
    return {
      type: "visitor" as const,
      name: "زائر",
    };
  }


  const byAuth = await args.storeDb
    .from("customers")
    .select("id,full_name,email")
    .eq("auth_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!byAuth.error && byAuth.data?.id) {
    return {
      type: "customer" as const,
      name: s(byAuth.data.full_name) || s(byAuth.data.email) || "عميل",
    };
  }

  if (isUuidLike(userId)) {
    const byId = await args.storeDb
      .from("customers")
      .select("id,full_name,email")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();

    if (!byId.error && byId.data?.id) {
      return {
        type: "customer" as const,
        name: s(byId.data.full_name) || s(byId.data.email) || "عميل",
      };
    }
  }

  return {
    type: "visitor" as const,
    name: "زائر",
  };
}
function clampDelta(n: any) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return 0;

  const v = Math.floor(x);
  if (v > 999) return 999;
  if (v < -999) return -999;

  return v;
}

function uniqStr(arr: any[]) {
  return Array.from(
    new Set((Array.isArray(arr) ? arr : []).map(String).filter(Boolean)),
  );
}

function shortId(id: string) {
  const value = String(id || "");
  return value.length > 8 ? value.slice(0, 8) : value;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled"].includes(text)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(text)) return false;
  }

  return fallback;
}

function toNumOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeMeta(value: any) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getMetadataVariants(metadata: any): any[] {
  const meta = safeMeta(metadata);
  return Array.isArray(meta.variants) ? meta.variants.filter(Boolean) : [];
}

function getVariantOptionValueIds(variant: any) {
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
      const value = String(id ?? "").trim();
      if (value) ids.add(value);
    }
  }

  const optionValues = Array.isArray(variant?.option_values)
    ? variant.option_values
    : [];

  for (const value of optionValues) {
    const id =
      String(value?.id ?? "").trim() ||
      String(value?.value_id ?? "").trim() ||
      String(value?.valueId ?? "").trim() ||
      String(value?.option_value_id ?? "").trim() ||
      String(value?.optionValueId ?? "").trim();

    if (id) ids.add(id);
  }

  const selections = Array.isArray(variant?.selections)
    ? variant.selections
    : [];

  for (const selection of selections) {
    const id =
      String(selection?.valueId ?? "").trim() ||
      String(selection?.value_id ?? "").trim() ||
      String(selection?.id ?? "").trim() ||
      String(selection?.option_value_id ?? "").trim() ||
      String(selection?.optionValueId ?? "").trim();

    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function findMetadataVariantById(metadata: any, variantId: string | null) {
  const id = String(variantId ?? "").trim();
  if (!id) return null;

  return (
    getMetadataVariants(metadata).find(
      (variant) => String(variant?.id ?? "").trim() === id,
    ) ?? null
  );
}

function resolveMetaVariantIdFromOptions(metadata: any, optionValueIds: string[]) {
  const selected = uniqStr(optionValueIds);
  if (!selected.length) return null;

  const selectedSet = new Set(selected);

  for (const variant of getMetadataVariants(metadata)) {
    const ids = getVariantOptionValueIds(variant);
    if (ids.length !== selectedSet.size) continue;

    const idsSet = new Set(ids);
    let ok = true;

    for (const id of selectedSet) {
      if (!idsSet.has(id)) {
        ok = false;
        break;
      }
    }

    if (ok) {
      const variantId = String(variant?.id ?? "").trim();
      if (variantId) return variantId;
    }
  }

  return null;
}

function resolveDefaultMetaVariantId(metadata: any) {
  const variants = getMetadataVariants(metadata);
  if (!variants.length) return null;

  const def =
    variants.find((variant) =>
      readBool(firstDefined(variant?.is_default, variant?.isDefault), false),
    ) ?? variants[0];

  const id = String(def?.id ?? "").trim();
  return id || null;
}

function readProductUnlimitedFromMeta(metadata: any) {
  const meta = safeMeta(metadata);
  const stock = safeMeta(meta.stock);

  return readBool(
    firstDefined(
      stock.unlimited_quantity,
      stock.unlimitedQuantity,
      meta.unlimited_quantity,
      meta.unlimitedQuantity,
      meta.qtyUnlimited,
      meta.quantityUnlimited,
    ),
    false,
  );
}

function readProductQtyFromMeta(metadata: any) {
  const meta = safeMeta(metadata);
  const stock = safeMeta(meta.stock);

  const qty = toNumOrNull(
    firstDefined(
      stock.quantity,
      stock.qty,
      meta.quantity,
      meta.qty,
      meta.base_qty_fallback,
      meta.baseQtyFallback,
    ),
  );

  return qty === null ? 0 : Math.max(0, Math.floor(qty));
}

function readVariantUnlimitedFromMeta(variant: any, productUnlimited: boolean) {
  if (productUnlimited) return true;

  return readBool(
    firstDefined(
      variant?.unlimited_quantity,
      variant?.unlimitedQuantity,
      variant?.unlimitedQty,
      variant?.qtyUnlimited,
      variant?.quantityUnlimited,
    ),
    false,
  );
}

function readVariantQtyFromMeta(variant: any) {
  const qty = toNumOrNull(
    firstDefined(
      variant?.stock_quantity,
      variant?.stockQuantity,
      variant?.quantity,
      variant?.qty,
      variant?.available_qty,
      variant?.availableQty,
    ),
  );

  return qty === null ? 0 : Math.max(0, Math.floor(qty));
}

function normalizeSelectedOptions(
  x: any,
): Array<{ name: string; value: string }> {
  if (!Array.isArray(x)) return [];

  const out: Array<{ name: string; value: string }> = [];

  for (const row of x) {
    const name = String(row?.name ?? "").trim();
    const value = String(row?.value ?? "").trim();

    if (name && value) {
      out.push({ name, value });
    }
  }

  return out;
}

function upsertSelectedOption(
  rows: Array<{ name: string; value: string }>,
  name: string,
  value: string,
) {
  const cleanName = String(name ?? "").trim();
  const cleanValue = String(value ?? "").trim();

  if (!cleanName || !cleanValue) return rows;

  const next = [...rows];
  const idx = next.findIndex((x) => String(x?.name ?? "").trim() === cleanName);

  if (idx >= 0) {
    next[idx] = { name: cleanName, value: cleanValue };
  } else {
    next.push({ name: cleanName, value: cleanValue });
  }

  return next;
}

function removeSelectedOption(
  rows: Array<{ name: string; value: string }>,
  name: string,
) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return rows;

  return rows.filter((x) => String(x?.name ?? "").trim() !== cleanName);
}

function readSelectedOptionValue(
  rows: Array<{ name: string; value: string }>,
  name: string,
): string | null {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return null;

  const hit = rows.find((x) => String(x?.name ?? "").trim() === cleanName);
  const value = String(hit?.value ?? "").trim();

  return value || null;
}

function mergeCustomSelectedOptions(
  baseRows: Array<{ name: string; value: string }>,
  incomingRows: Array<{ name: string; value: string }>,
) {
  let next = [...baseRows];

  next = removeSelectedOption(next, "ملاحظة");
  next = removeSelectedOption(next, "مرفق");
  next = removeSelectedOption(next, "__attachment_name");
  next = removeSelectedOption(next, "__attachment_type");
  next = removeSelectedOption(next, "__attachment_size");
  next = removeSelectedOption(next, "__attachment_url");
  next = removeSelectedOption(next, "__attachment_data_url");

  for (let i = 1; i <= MAX_IMAGES; i++) {
    next = removeSelectedOption(next, `__attachment_${i}_name`);
    next = removeSelectedOption(next, `__attachment_${i}_type`);
    next = removeSelectedOption(next, `__attachment_${i}_size`);
    next = removeSelectedOption(next, `__attachment_${i}_url`);
  }

  const noteValue = readSelectedOptionValue(incomingRows, "ملاحظة");
  if (noteValue) {
    next = upsertSelectedOption(next, "ملاحظة", noteValue);
  }

  const legacyAttachmentName =
    readSelectedOptionValue(incomingRows, "__attachment_name") ||
    readSelectedOptionValue(incomingRows, "مرفق");

  const legacyAttachmentType = readSelectedOptionValue(
    incomingRows,
    "__attachment_type",
  );

  const legacyAttachmentSize = readSelectedOptionValue(
    incomingRows,
    "__attachment_size",
  );

  const legacyAttachmentUrl =
    readSelectedOptionValue(incomingRows, "__attachment_url") ||
    readSelectedOptionValue(incomingRows, "__attachment_data_url");

  if (legacyAttachmentName || legacyAttachmentUrl) {
    if (legacyAttachmentName) {
      next = upsertSelectedOption(
        next,
        "__attachment_1_name",
        legacyAttachmentName,
      );
    }

    if (legacyAttachmentType) {
      next = upsertSelectedOption(
        next,
        "__attachment_1_type",
        legacyAttachmentType,
      );
    }

    if (legacyAttachmentSize) {
      next = upsertSelectedOption(
        next,
        "__attachment_1_size",
        legacyAttachmentSize,
      );
    }

    if (legacyAttachmentUrl) {
      next = upsertSelectedOption(
        next,
        "__attachment_1_url",
        legacyAttachmentUrl,
      );
    }
  }

  for (let i = 1; i <= MAX_IMAGES; i++) {
    const name = readSelectedOptionValue(incomingRows, `__attachment_${i}_name`);
    const type = readSelectedOptionValue(incomingRows, `__attachment_${i}_type`);
    const size = readSelectedOptionValue(incomingRows, `__attachment_${i}_size`);
    const url = readSelectedOptionValue(incomingRows, `__attachment_${i}_url`);

    if (!name && !url) continue;

    if (name) {
      next = upsertSelectedOption(next, `__attachment_${i}_name`, name);
    }

    if (type) {
      next = upsertSelectedOption(next, `__attachment_${i}_type`, type);
    }

    if (size) {
      next = upsertSelectedOption(next, `__attachment_${i}_size`, size);
    }

    if (url) {
      next = upsertSelectedOption(next, `__attachment_${i}_url`, url);
    }
  }

  return next;
}

function setCartCookieIfPresent(res: NextResponse, sid: string | null | undefined) {
  const cleanSid = String(sid ?? "").trim();

  if (!cleanSid) return res;

  const c = cartSessionCookie(cleanSid);

  res.cookies.set(c.name, c.value, {
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    path: c.path,
    secure: c.secure,
    maxAge: c.maxAge,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  });

  return res;
}

async function fullCartMutationResponse(
  req: Request,
  sid: string | null | undefined,
  extraData: Record<string, any>,
) {
  try {
    const cartRes = await getCartPayload(req);
    const payload = await cartRes.json();
    const data =
      payload?.data && typeof payload.data === "object" ? payload.data : {};

    const res = NextResponse.json(
      {
        ...payload,
        data: {
          ...data,
          ...extraData,
        },
      },
      {
        status: cartRes.status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return setCartCookieIfPresent(res, sid);
  } catch {
    const res = NextResponse.json(
      {
        data: extraData,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return setCartCookieIfPresent(res, sid);
  }
}

async function parseAddItemRequest(req: Request): Promise<{
  product_id: string;
  variant_id: string | null;
  qty: number;
  selected_option_value_ids: string[];
  selected_options_ui: Array<{ name: string; value: string }>;
}> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const product_id = String(form.get("product_id") ?? "").trim();
    const variantRaw = String(form.get("variant_id") ?? "").trim();
    const qty = clampQty(form.get("qty"));

    const selected_option_value_ids = form
      .getAll("selected_option_value_ids[]")
      .map((x) => String(x))
      .filter(Boolean);

    const selected_options_raw = String(form.get("selected_options") ?? "[]");

    let selected_options_ui: Array<{ name: string; value: string }> = [];

    try {
      selected_options_ui = normalizeSelectedOptions(
        JSON.parse(selected_options_raw),
      );
    } catch {
      selected_options_ui = [];
    }

    return {
      product_id,
      variant_id: variantRaw || null,
      qty,
      selected_option_value_ids,
      selected_options_ui,
    };
  }

  const body = (await req.json()) as AddItemBody;

  return {
    product_id: String(body.product_id || "").trim(),
    variant_id: body.variant_id ? String(body.variant_id) : null,
    qty: clampQty(body.qty),
    selected_option_value_ids: Array.isArray(body.selected_option_value_ids)
      ? body.selected_option_value_ids.map(String).filter(Boolean)
      : [],
    selected_options_ui: normalizeSelectedOptions(body.selected_options),
  };
}

function buildSelectedOptionsFromMetadata(
  metadata: any,
  optionValueIds: string[],
): Array<{ name: string; value: string }> {
  const ids = optionValueIds.map(String).filter(Boolean);
  if (!ids.length) return [];

  const out: Array<{ name: string; value: string }> = [];

  const optList = Array.isArray(metadata?.options) ? metadata.options : [];
  const valueMap = new Map<string, { optName: string; valueLabel: string }>();

  for (const opt of optList) {
    const optName = String(opt?.name ?? "").trim() || "خيار";
    const vals = Array.isArray(opt?.values) ? opt.values : [];

    for (const v of vals) {
      const vid = String(v?.id ?? "").trim();
      if (!vid) continue;

      const label =
        String(v?.display_value ?? v?.displayValue ?? v?.name ?? "").trim() ||
        `خيار: ${shortId(vid)}`;

      valueMap.set(vid, { optName, valueLabel: label });
    }
  }

  const varList = Array.isArray(metadata?.variants) ? metadata.variants : [];

  for (const v of varList) {
    const sels = Array.isArray(v?.selections) ? v.selections : [];

    for (const row of sels) {
      const vid =
        String(row?.valueId ?? "").trim() ||
        String(row?.value_id ?? "").trim() ||
        String(row?.id ?? "").trim();

      if (!vid) continue;
      if (valueMap.has(vid)) continue;

      const optName =
        String(row?.groupName ?? row?.name ?? row?.optionName ?? "خيار").trim() ||
        "خيار";

      const label =
        String(
          row?.valueName ??
            row?.value ??
            row?.display_value ??
            row?.displayValue ??
            row?.label ??
            "",
        ).trim() || `خيار: ${shortId(vid)}`;

      valueMap.set(vid, { optName, valueLabel: label });
    }
  }

  for (const id of ids) {
    const hit = valueMap.get(id);

    if (hit) {
      out.push({
        name: hit.optName,
        value: hit.valueLabel,
      });
    }
  }

  return out;
}

async function buildSelectedOptionsFromDb(
  storeDb: any,
  optionValueIds: string[],
): Promise<Array<{ name: string; value: string }>> {
  const ids = uniqStr(optionValueIds);
  if (!ids.length) return [];

  const povR = await storeDb
    .from("product_option_values")
    .select("id,option_id,name,display_value")
    .in("id", ids);

  if (povR.error) throw new Error(povR.error.message);

  const povRows: any[] = Array.isArray(povR.data) ? povR.data : [];
  if (!povRows.length) return [];

  const povMap = new Map<string, any>();

  for (const row of povRows) {
    povMap.set(String(row.id), row);
  }

  const optionIds = uniqStr(
    povRows.map((row) => (row.option_id ? String(row.option_id) : "")),
  );

  const optNameMap = new Map<string, string>();

  if (optionIds.length) {
    const optR = await storeDb
      .from("product_options")
      .select("id,name")
      .in("id", optionIds);

    if (optR.error) throw new Error(optR.error.message);

    const optRows: any[] = Array.isArray(optR.data) ? optR.data : [];

    for (const opt of optRows) {
      const id = String(opt.id);
      const name = String(opt.name ?? "").trim();

      if (id && name) {
        optNameMap.set(id, name);
      }
    }
  }

  const out: Array<{ name: string; value: string }> = [];

  for (const id of optionValueIds.map(String)) {
    const row = povMap.get(String(id));
    if (!row) continue;

    const optionName =
      (row.option_id ? optNameMap.get(String(row.option_id)) : null) || "خيار";

    const valueLabel = String(row.display_value ?? row.name ?? "").trim();
    if (!valueLabel) continue;

    out.push({
      name: String(optionName).trim() || "خيار",
      value: valueLabel,
    });
  }

  return out;
}

async function resolveVariantIdFromOptions(
  storeDb: any,
  args: { product_id: string; selected_option_value_ids: string[] },
): Promise<string | null> {
  const selected = (
    Array.isArray(args.selected_option_value_ids)
      ? args.selected_option_value_ids.map(String).filter(Boolean)
      : []
  ) as string[];

  if (selected.length === 0) return null;

  const vR = await storeDb
    .from("product_variants")
    .select("id")
    .eq("product_id", args.product_id);

  if (vR.error) throw new Error(vR.error.message);

  const variants = Array.isArray(vR.data) ? vR.data : [];
  if (variants.length === 0) return null;

  const variantIds = variants.map((v: any) => v.id);

  const linksR = await storeDb
    .from("variant_option_values")
    .select("variant_id,option_value_id")
    .in("variant_id", variantIds);

  if (linksR.error) throw new Error(linksR.error.message);

  const links = Array.isArray(linksR.data) ? linksR.data : [];
  const map = new Map<string, Set<string>>();

  for (const row of links) {
    const vid = String(row.variant_id);
    const oid = String(row.option_value_id);

    if (!map.has(vid)) {
      map.set(vid, new Set());
    }

    map.get(vid)!.add(oid);
  }

  const selectedSet = new Set(selected);

  for (const vid of variantIds) {
    const set = map.get(String(vid)) ?? new Set<string>();

    if (set.size !== selectedSet.size) continue;

    let ok = true;

    for (const oid of selectedSet) {
      if (!set.has(String(oid))) {
        ok = false;
        break;
      }
    }

    if (ok) return String(vid);
  }

  return null;
}

async function resolveDefaultVariantId(storeDb: any, product_id: string) {
  const vR = await storeDb
    .from("product_variants")
    .select("id,is_default,created_at")
    .eq("product_id", product_id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (vR.error) throw new Error(vR.error.message);

  return vR.data?.id ? String(vR.data.id) : null;
}

async function resolveDbVariantIdForCart(
  storeDb: any,
  args: { product_id: string; variant_id: string | null },
) {
  const variantId = String(args.variant_id ?? "").trim();
  if (!variantId) return null;

  const r = await storeDb
    .from("product_variants")
    .select("id,product_id")
    .eq("id", variantId)
    .limit(1)
    .maybeSingle();

  if (r.error) throw new Error(r.error.message);

  if (!r.data?.id) return null;
  if (String(r.data.product_id) !== String(args.product_id)) return null;

  return String(r.data.id);
}

async function syncCartActivityAndCount(ordersDb: any, cartId: string) {
  const itemsR = await ordersDb.from("cart_items").select("qty").eq("cart_id", cartId);

  if (itemsR.error) throw new Error(itemsR.error.message);

  const rows: Array<{ qty?: number | string | null }> = Array.isArray(
    itemsR.data,
  )
    ? itemsR.data
    : [];

  const item_count = rows.reduce((sum: number, row) => {
    const qty = Number(row?.qty ?? 0);
    return sum + (Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0);
  }, 0);

  const upR = await ordersDb
    .from("carts")
    .update({
      item_count,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", cartId);

  if (upR.error) throw new Error(upR.error.message);

  return item_count;
}

async function getStockInfoFast(
  storeDb: any,
  args: {
    product_id: string;
    variant_id: string | null;
    productMeta: any;
  },
): Promise<StockInfo> {
  const psR = await storeDb
    .from("product_stock")
    .select("quantity,unlimited_quantity,maximum_quantity_per_order")
    .eq("product_id", args.product_id)
    .limit(1)
    .maybeSingle();

  if (psR.error) throw new Error(psR.error.message);

  const stockRow = psR.data ?? null;

  const metaUnlimited = readProductUnlimitedFromMeta(args.productMeta);
  const productUnlimited =
    Boolean(stockRow?.unlimited_quantity ?? false) || metaUnlimited;

  const max_per_order =
    typeof stockRow?.maximum_quantity_per_order === "number"
      ? Math.max(1, Math.floor(stockRow.maximum_quantity_per_order))
      : null;

  if (args.variant_id) {
    const vR = await storeDb
      .from("product_variants")
      .select("id,product_id,stock_quantity,unlimited_quantity")
      .eq("id", args.variant_id)
      .limit(1)
      .maybeSingle();

    if (vR.error) throw new Error(vR.error.message);

    const v = vR.data ?? null;

    if (v?.id) {
      if (String(v.product_id) !== String(args.product_id)) {
        return { ok: false, reason: "INVALID_VARIANT_FOR_PRODUCT" };
      }

      const unlimited =
        productUnlimited || Boolean(v.unlimited_quantity ?? false);

      return {
        ok: true,
        unlimited,
        available_qty: unlimited
          ? 999999
          : Math.max(0, Number(v.stock_quantity ?? 0)),
        max_per_order,
      };
    }

    const mv = findMetadataVariantById(args.productMeta, args.variant_id);

    if (mv) {
      const unlimited = readVariantUnlimitedFromMeta(mv, productUnlimited);

      return {
        ok: true,
        unlimited,
        available_qty: unlimited ? 999999 : readVariantQtyFromMeta(mv),
        max_per_order,
      };
    }

    return { ok: false, reason: "VARIANT_NOT_FOUND" };
  }

  return {
    ok: true,
    unlimited: productUnlimited,
    available_qty: productUnlimited
      ? 999999
      : stockRow
        ? Math.max(0, Number(stockRow.quantity ?? 0))
        : readProductQtyFromMeta(args.productMeta),
    max_per_order,
  };
}

async function getCartItemOrThrow(
  ordersDb: any,
  cart_id: string,
  cart_item_id: string,
) {
  const r = await ordersDb
    .from("cart_items")
    .select(
      "id,cart_id,product_id,variant_id,qty,line_key,selected_option_value_ids,selected_options",
    )
    .eq("id", cart_item_id)
    .limit(1)
    .maybeSingle();

  if (r.error) throw new Error(r.error.message);
  if (!r.data?.id) throw new Error("CART_ITEM_NOT_FOUND");

  if (String(r.data.cart_id) !== String(cart_id)) {
    throw new Error("CART_ITEM_NOT_IN_CART");
  }

  return r.data;
}

function computeAllowedQty(args: {
  desiredQty: number;
  existingQtyInCartForThisLine: number;
  stock: Extract<StockInfo, { ok: true }>;
}) {
  const desired = Math.max(1, Math.floor(args.desiredQty));

  const maxByStock = args.stock.unlimited
    ? 999999
    : Math.max(0, args.stock.available_qty);

  const maxByPolicy =
    args.stock.max_per_order === null
      ? 999999
      : Math.max(1, args.stock.max_per_order);

  const hardMax = Math.max(0, Math.min(maxByStock, maxByPolicy));
  const finalQty = hardMax <= 0 ? 0 : Math.max(1, Math.min(desired, hardMax));

  return {
    finalQty,
    hardMax,
    wasLimited: finalQty !== desired,
    available: args.stock.unlimited ? null : args.stock.available_qty,
    max_per_order: args.stock.max_per_order,
  };
}

function buildQtyLimitReachedMessage(args: {
  stock: Extract<StockInfo, { ok: true }>;
  existingQty: number;
}) {
  const existingQty = Math.max(0, Math.floor(Number(args.existingQty || 0)));

  const availableQty = args.stock.unlimited
    ? null
    : Math.max(0, Math.floor(Number(args.stock.available_qty || 0)));

  const maxPerOrder =
    args.stock.max_per_order === null
      ? null
      : Math.max(1, Math.floor(Number(args.stock.max_per_order || 1)));

  if (availableQty !== null && availableQty <= 0) {
    return "المنتج غير متوفر حاليًا.";
  }

  if (availableQty !== null && existingQty > 0 && existingQty >= availableQty) {
    return `الكمية المتاحة ${availableQty} فقط، وهي موجودة بالفعل في سلتك.`;
  }

  if (maxPerOrder !== null && existingQty >= maxPerOrder) {
    return `وصلت للحد الأقصى المسموح لهذا المنتج داخل السلة (${maxPerOrder}).`;
  }

  if (availableQty !== null) {
    return `الكمية المتاحة لهذا المنتج ${availableQty} فقط.`;
  }

  return "وصلت للحد الأقصى المسموح لهذا المنتج داخل السلة.";
}

function buildPartialAddMessage(args: {
  stock: Extract<StockInfo, { ok: true }>;
  addedNow: number;
  existingQty: number;
  finalQty: number;
}) {
  const addedNow = Math.max(0, Math.floor(Number(args.addedNow || 0)));
  const existingQty = Math.max(0, Math.floor(Number(args.existingQty || 0)));
  const finalQty = Math.max(0, Math.floor(Number(args.finalQty || 0)));

  const availableQty = args.stock.unlimited
    ? null
    : Math.max(0, Math.floor(Number(args.stock.available_qty || 0)));

  const maxPerOrder =
    args.stock.max_per_order === null
      ? null
      : Math.max(1, Math.floor(Number(args.stock.max_per_order || 1)));

  if (availableQty !== null) {
    if (existingQty > 0) {
      return `الكمية المطلوبة أكبر من المتاح. تمت إضافة ${addedNow} فقط، وأصبح لديك ${finalQty} في السلة.`;
    }

    return `الكمية المطلوبة أكبر من المتاح. تمت إضافة ${addedNow} فقط من أصل الكمية المطلوبة.`;
  }

  if (maxPerOrder !== null && finalQty >= maxPerOrder) {
    return `تمت إضافة ${addedNow} فقط. الحد الأقصى المسموح لهذا المنتج ${maxPerOrder}.`;
  }

  return `تمت إضافة ${addedNow} فقط.`;
}

function buildQtyLimitedMessage(args: {
  stock: Extract<StockInfo, { ok: true }>;
  desiredQty: number;
  finalQty: number;
}) {
  const desiredQty = Math.max(1, Math.floor(Number(args.desiredQty || 1)));
  const finalQty = Math.max(0, Math.floor(Number(args.finalQty || 0)));

  const availableQty = args.stock.unlimited
    ? null
    : Math.max(0, Math.floor(Number(args.stock.available_qty || 0)));

  const maxPerOrder =
    args.stock.max_per_order === null
      ? null
      : Math.max(1, Math.floor(Number(args.stock.max_per_order || 1)));

  if (finalQty <= 0 || (availableQty !== null && availableQty <= 0)) {
    return "المنتج غير متوفر حاليًا، وتمت إزالته من السلة.";
  }

  if (availableQty !== null && desiredQty > finalQty) {
    return `لا يمكن زيادة الكمية إلى ${desiredQty}. المتاح حاليًا ${availableQty} فقط، وتم تحديث الكمية إلى ${finalQty}.`;
  }

  if (maxPerOrder !== null && desiredQty > finalQty) {
    return `لا يمكن زيادة الكمية إلى ${desiredQty}. الحد الأقصى المسموح لهذا المنتج ${maxPerOrder}، وتم تحديث الكمية إلى ${finalQty}.`;
  }

  return `تم تحديث الكمية إلى ${finalQty} حسب المتاح.`;
}

function buildQtyWillBeReducedMessage(args: {
  available: number | null;
  max_per_order: number | null;
  desiredQty: number;
  finalQty: number;
}) {
  const desiredQty = Math.max(1, Math.floor(Number(args.desiredQty || 1)));
  const finalQty = Math.max(0, Math.floor(Number(args.finalQty || 0)));

  if (finalQty <= 0) {
    return "هذه الخيارات غير متوفرة حاليًا. لا يمكن حفظ التعديل.";
  }

  if (args.available !== null) {
    return `الكمية التي اخترتها (${desiredQty}) أكبر من المتاح لهذه الخيارات. المتاح حاليًا ${finalQty} فقط. هل توافق على تحديث الكمية إلى ${finalQty}؟`;
  }

  if (args.max_per_order !== null) {
    return `الكمية التي اخترتها (${desiredQty}) أكبر من الحد المسموح لهذا المنتج. هل توافق على تحديث الكمية إلى ${finalQty}؟`;
  }

  return `الكمية المطلوبة غير متوفرة. هل توافق على تحديث الكمية إلى ${finalQty}؟`;
}

function buildMergedQtyLimitedMessage(args: {
  available: number | null;
  max_per_order: number | null;
  desiredQty: number;
  finalQty: number;
}) {
  const desiredQty = Math.max(1, Math.floor(Number(args.desiredQty || 1)));
  const finalQty = Math.max(0, Math.floor(Number(args.finalQty || 0)));

  if (args.available !== null) {
    return `تم دمج المنتجين في سطر واحد، لكن الكمية المطلوبة (${desiredQty}) أكبر من المتاح. تم تحديث الكمية إلى ${finalQty}.`;
  }

  if (args.max_per_order !== null) {
    return `تم دمج المنتجين في سطر واحد، لكن الكمية المطلوبة (${desiredQty}) أكبر من الحد المسموح. تم تحديث الكمية إلى ${finalQty}.`;
  }

  return `تم دمج المنتجين في سطر واحد، وتم تحديث الكمية إلى ${finalQty}.`;
}

function buildVariantChangedQtyLimitedMessage(args: {
  available: number | null;
  max_per_order: number | null;
  finalQty: number;
}) {
  const finalQty = Math.max(0, Math.floor(Number(args.finalQty || 0)));

  if (args.available !== null) {
    return `تم تغيير الخيارات، لكن الكمية الحالية أكبر من المتاح لهذه الخيارات. تم تحديث الكمية إلى ${finalQty}.`;
  }

  if (args.max_per_order !== null) {
    return `تم تغيير الخيارات، لكن الكمية الحالية أكبر من الحد المسموح. تم تحديث الكمية إلى ${finalQty}.`;
  }

  return `تم تغيير الخيارات، وتم تحديث الكمية إلى ${finalQty}.`;
}

function cartNotFoundResponse() {
  return NextResponse.json(
    {
      error: "CART_NOT_FOUND",
      message: "السلة غير موجودة.",
    },
    { status: 404 },
  );
}

export async function POST(req: Request) {
  try {
    const parsed = await parseAddItemRequest(req);

    const product_id = parsed.product_id;
    let variant_id = parsed.variant_id;
    let selected_option_value_ids = parsed.selected_option_value_ids;

    const qtyToAdd = parsed.qty;
    const selected_options_ui = parsed.selected_options_ui;

    if (!product_id) {
      return NextResponse.json(
        { error: "Missing product_id" },
        { status: 400 },
      );
    }

    const store_id = await getStoreIdOrThrow(req);
    const sid = await getCartSessionId(req);

    const [ordersDb, storeDb] = await Promise.all([
      getOrdersDb(store_id),
      getStoreDb(store_id),
    ]);

    const cart = await getOrCreateOpenCart({ store_id, session_id: sid, request: req });

    const prodR = await storeDb
      .from("products")
      .select("id,name,status,metadata")
      .eq("id", product_id)
      .eq("store_id", store_id)
      .limit(1)
      .maybeSingle();

    if (prodR.error) throw new Error(prodR.error.message);

    if (!prodR.data?.id) {
      return NextResponse.json(
        {
          error: "PRODUCT_NOT_FOUND",
          message: "المنتج غير موجود.",
        },
        { status: 404 },
      );
    }

    if (
      !isProductVisibleInWeb({
        status: prodR.data?.status,
        metadata: prodR.data?.metadata,
      })
    ) {
      return NextResponse.json(
        {
          error: "PRODUCT_NOT_FOUND",
          message: "المنتج غير موجود.",
        },
        { status: 404 },
      );
    }
const productImageUrl = await readProductPrimaryImageUrl({
  storeDb,
  storeId: store_id,
  productId: product_id,
});
    const productMeta = prodR.data?.metadata ?? null;
    const metaVariants = getMetadataVariants(productMeta);

    const variantsCountR = await storeDb
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product_id);

    if (variantsCountR.error) throw new Error(variantsCountR.error.message);

    const hasDbVariants = (variantsCountR.count ?? 0) > 0;
    const hasMetaVariants = metaVariants.length > 0;
    const hasVariants = hasDbVariants || hasMetaVariants;

    if (hasVariants) {
      if (!variant_id && selected_option_value_ids.length > 0) {
        variant_id =
          (hasDbVariants
            ? await resolveVariantIdFromOptions(storeDb, {
                product_id,
                selected_option_value_ids,
              })
            : null) ||
          resolveMetaVariantIdFromOptions(productMeta, selected_option_value_ids);

        if (!variant_id) {
          return NextResponse.json(
            {
              error: "VARIANT_NOT_FOUND",
              message: "الخيارات المختارة غير متوفرة.",
            },
            { status: 400 },
          );
        }
      }

      if (!variant_id && selected_option_value_ids.length === 0) {
        variant_id =
          (hasDbVariants ? await resolveDefaultVariantId(storeDb, product_id) : null) ||
          resolveDefaultMetaVariantId(productMeta);

        if (!variant_id) {
          return NextResponse.json(
            {
              error: "VARIANT_REQUIRED",
              message: "اختر خيارات المنتج قبل الإضافة للسلة.",
            },
            { status: 400 },
          );
        }
      }

      if (variant_id && selected_option_value_ids.length === 0) {
        const mv = findMetadataVariantById(productMeta, variant_id);
        if (mv) {
          selected_option_value_ids = getVariantOptionValueIds(mv);
        }
      }
    }

    const stock = await getStockInfoFast(storeDb, {
      product_id,
      variant_id,
      productMeta,
    });

    if (!stock.ok) {
      return NextResponse.json(
        {
          error: stock.reason,
          message:
            stock.reason === "PRODUCT_NOT_FOUND"
              ? "المنتج غير موجود."
              : stock.reason === "VARIANT_NOT_FOUND"
                ? "التركيبة غير موجودة."
                : "التركيبة لا تتبع هذا المنتج.",
        },
        { status: stock.reason === "PRODUCT_NOT_FOUND" ? 404 : 400 },
      );
    }

    const cartVariantId = await resolveDbVariantIdForCart(storeDb, {
      product_id,
      variant_id,
    });

    const line_key = buildLineKey({
      product_id,
      variant_id,
      selected_option_value_ids,
    });

    const existingR = await ordersDb
      .from("cart_items")
      .select("id,qty")
      .eq("cart_id", cart.id)
      .eq("line_key", line_key)
      .limit(1)
      .maybeSingle();

    if (existingR.error) throw new Error(existingR.error.message);

    const existingQty = Math.max(0, Number(existingR.data?.qty ?? 0));

    const limitByStock = stock.unlimited
      ? 999999
      : Math.max(0, stock.available_qty - existingQty);

    const limitByMaxPerOrder =
      stock.max_per_order === null
        ? 999999
        : Math.max(0, stock.max_per_order - existingQty);

    const canAddNow = Math.max(
      0,
      Math.min(qtyToAdd, limitByStock, limitByMaxPerOrder),
    );

    if (canAddNow <= 0) {
      const res = NextResponse.json({
        data: {
          cart_id: cart.id,
          item: existingR.data?.id
            ? {
                id: existingR.data.id,
                qty: existingQty,
              }
            : null,
          notice: {
            code: "QTY_LIMIT_REACHED",
            message: buildQtyLimitReachedMessage({
              stock,
              existingQty,
            }),
            requested_add: qtyToAdd,
            added_now: 0,
            in_cart_before: existingQty,
            in_cart_after: existingQty,
            available: stock.unlimited ? null : stock.available_qty,
            max_per_order: stock.max_per_order,
          },
        },
      });

      return setCartCookieIfPresent(res, sid);
    }

    let selected_options: Array<{ name: string; value: string }> = [];

    if (selected_option_value_ids.length) {
      const fromDb = await buildSelectedOptionsFromDb(
        storeDb,
        selected_option_value_ids,
      );

      if (fromDb.length) {
        selected_options = fromDb;
      } else {
        const fromMeta = buildSelectedOptionsFromMetadata(
          productMeta,
          selected_option_value_ids,
        );

        selected_options = fromMeta.length ? fromMeta : [];
      }
    }

    selected_options = mergeCustomSelectedOptions(
      selected_options,
      selected_options_ui,
    );

    const finalQty = existingQty + canAddNow;
    let item: any;

    if (existingR.data?.id) {
      const upR = await ordersDb
        .from("cart_items")
        .update({
          qty: finalQty,
          ...(selected_options.length ? { selected_options } : {}),
        })
        .eq("id", existingR.data.id)
        .select("*")
        .single();

      if (upR.error) throw new Error(upR.error.message);

      item = upR.data;
    } else {
      const insR = await ordersDb
        .from("cart_items")
        .insert({
          store_id,
          cart_id: cart.id,
          product_id,
          variant_id: cartVariantId,
          qty: canAddNow,
          currency: String(cart.currency || "SAR"),
          line_key,
          selected_option_value_ids,
          ...(selected_options.length ? { selected_options } : {}),
        })
        .select("*")
        .single();

      if (insR.error) throw new Error(insR.error.message);

      item = insR.data;
    }

  const cartCount = await syncCartActivityAndCount(ordersDb, cart.id);

const isPartial = canAddNow < qtyToAdd;

    const res = NextResponse.json({
      cart_count: cartCount,
      cartCount,
      data: {
        cart_id: cart.id,
        cart_count: cartCount,
        cartCount,
        item,
        notice: isPartial
          ? {
              code: "ADDED_MAX_AVAILABLE",
              message: buildPartialAddMessage({
                stock,
                addedNow: canAddNow,
                existingQty,
                finalQty,
              }),
              requested_add: qtyToAdd,
              added_now: canAddNow,
              in_cart_before: existingQty,
              in_cart_after: finalQty,
              available: stock.unlimited ? null : stock.available_qty,
              max_per_order: stock.max_per_order,
            }
          : null,
        stock: {
          available: stock.unlimited ? null : stock.available_qty,
          max_per_order: stock.max_per_order,
          in_cart_after: finalQty,
          added_now: canAddNow,
        },
      },
    });

    return setCartCookieIfPresent(res, sid);
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    return NextResponse.json(
      {
        error: msg,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchBody;

    const store_id = await getStoreIdOrThrow(req);
    const sid = await getCartSessionIdFromCookie(req);

    const [ordersDb, storeDb] = await Promise.all([
      getOrdersDb(store_id),
      getStoreDb(store_id),
    ]);

    const cart = await getExistingOpenCart({ store_id, session_id: sid, request: req });

    if (!cart?.id) {
      return cartNotFoundResponse();
    }

    if (!body || typeof (body as any).op !== "string") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const op = (body as any).op as PatchBody["op"];
    const cart_item_id = String((body as any).cart_item_id || "").trim();

    if (!cart_item_id) {
      return NextResponse.json(
        { error: "Missing cart_item_id" },
        { status: 400 },
      );
    }

    const item0 = await getCartItemOrThrow(ordersDb, cart.id, cart_item_id);

    const visibleProductR = await storeDb
      .from("products")
      .select("id,name,status,metadata")
      .eq("id", String(item0.product_id))
      .eq("store_id", store_id)
      .limit(1)
      .maybeSingle();

    if (visibleProductR.error) throw new Error(visibleProductR.error.message);

    if (
      !visibleProductR.data?.id ||
      !isProductVisibleInWeb({
        status: visibleProductR.data?.status,
        metadata: visibleProductR.data?.metadata,
      })
    ) {
      await ordersDb.from("cart_items").delete().eq("id", item0.id);
      await syncCartActivityAndCount(ordersDb, cart.id);

      return NextResponse.json(
        {
          error: "PRODUCT_NOT_FOUND",
          message: "المنتج غير موجود.",
          removed_item_id: item0.id,
        },
        { status: 404 },
      );
    }

    if (op === "inc" || op === "set_qty") {
      const currentQty = Math.max(1, Number(item0.qty ?? 1));

      const desiredQty =
        op === "inc"
          ? Math.max(1, currentQty + clampDelta((body as any).delta))
          : clampQty((body as any).qty);

      const stock = await getStockInfoFast(storeDb, {
        product_id: String(item0.product_id),
        variant_id: item0.variant_id ? String(item0.variant_id) : null,
        productMeta: visibleProductR.data?.metadata ?? null,
      });

      if (!stock.ok) {
        await ordersDb.from("cart_items").delete().eq("id", item0.id);
        await syncCartActivityAndCount(ordersDb, cart.id);

        return NextResponse.json(
          {
            error: stock.reason,
            message:
              stock.reason === "PRODUCT_NOT_FOUND"
                ? "المنتج غير موجود."
                : "لا يمكن قراءة المخزون لهذا المنتج.",
            removed_item_id: item0.id,
          },
          { status: stock.reason === "PRODUCT_NOT_FOUND" ? 404 : 400 },
        );
      }

      const { finalQty, hardMax, wasLimited, available, max_per_order } =
        computeAllowedQty({
          desiredQty,
          existingQtyInCartForThisLine: 0,
          stock,
        });

      if (hardMax <= 0 || finalQty <= 0) {
        await ordersDb.from("cart_items").delete().eq("id", item0.id);
        await syncCartActivityAndCount(ordersDb, cart.id);

        const res = NextResponse.json({
          data: {
            cart_id: cart.id,
            removed_item_id: item0.id,
            notice: {
              code: "QTY_LIMITED_REMOVED",
              message: "المنتج غير متوفر حاليًا، وتمت إزالته من السلة.",
              desired: desiredQty,
              final: 0,
              available,
              max_per_order,
            },
            stock: {
              available,
              max_per_order,
              in_cart_after: 0,
            },
          },
        });

        return setCartCookieIfPresent(res, sid);
      }

      const upR = await ordersDb
        .from("cart_items")
        .update({ qty: finalQty })
        .eq("id", item0.id)
        .select("*")
        .single();

      if (upR.error) throw new Error(upR.error.message);

      await syncCartActivityAndCount(ordersDb, cart.id);

      return fullCartMutationResponse(req, sid, {
        cart_id: cart.id,
        item: upR.data,
        notice: wasLimited
          ? {
              code: "QTY_LIMITED",
              message: buildQtyLimitedMessage({
                stock,
                desiredQty,
                finalQty,
              }),
              desired: desiredQty,
              final: finalQty,
              available,
              max_per_order,
            }
          : null,
        stock: {
          available,
          max_per_order,
          in_cart_after: finalQty,
        },
      });
    }

    if (op === "set_variant") {
      const product_id = String(item0.product_id);
      const productMeta = visibleProductR.data?.metadata ?? null;
      const metaVariants = getMetadataVariants(productMeta);

      let selected_option_value_ids = Array.isArray(
        (body as any).selected_option_value_ids,
      )
        ? (body as any).selected_option_value_ids.map(String).filter(Boolean)
        : [];

      const selected_options_ui = normalizeSelectedOptions(
        (body as any).selected_options,
      );

      const confirmQtyReduction = Boolean(
        (body as any).confirm_qty_reduction ?? false,
      );

      let variant_id: string | null = (body as any).variant_id
        ? String((body as any).variant_id)
        : null;

      const variantsCountR = await storeDb
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product_id);

      if (variantsCountR.error) throw new Error(variantsCountR.error.message);

      const hasDbVariants = (variantsCountR.count ?? 0) > 0;
      const hasMetaVariants = metaVariants.length > 0;
      const hasVariants = hasDbVariants || hasMetaVariants;

      if (!variant_id && selected_option_value_ids.length) {
        variant_id =
          (hasDbVariants
            ? await resolveVariantIdFromOptions(storeDb, {
                product_id,
                selected_option_value_ids,
              })
            : null) ||
          resolveMetaVariantIdFromOptions(productMeta, selected_option_value_ids);
      }

      if (variant_id && selected_option_value_ids.length === 0) {
        const mv = findMetadataVariantById(productMeta, variant_id);
        if (mv) {
          selected_option_value_ids = getVariantOptionValueIds(mv);
        }
      }

      if (hasVariants && !variant_id) {
        return NextResponse.json(
          {
            error: "VARIANT_NOT_FOUND",
            message: "الخيارات المختارة غير متوفرة.",
          },
          { status: 400 },
        );
      }

      const cartVariantId = await resolveDbVariantIdForCart(storeDb, {
        product_id,
        variant_id,
      });

      let selected_options: Array<{ name: string; value: string }> = [];

      if (selected_option_value_ids.length) {
        const fromDb = await buildSelectedOptionsFromDb(
          storeDb,
          selected_option_value_ids,
        );

        if (fromDb.length) {
          selected_options = fromDb;
        } else {
          const fromMeta = buildSelectedOptionsFromMetadata(
            productMeta,
            selected_option_value_ids,
          );

          selected_options = fromMeta.length ? fromMeta : [];
        }
      }

      selected_options = mergeCustomSelectedOptions(
        selected_options,
        selected_options_ui,
      );

      const new_line_key = buildLineKey({
        product_id,
        variant_id,
        selected_option_value_ids,
      });

      const otherR = await ordersDb
        .from("cart_items")
        .select("id,qty")
        .eq("cart_id", cart.id)
        .eq("line_key", new_line_key)
        .limit(1)
        .maybeSingle();

      if (otherR.error) throw new Error(otherR.error.message);

      const currentQty = Math.max(1, Number(item0.qty ?? 1));
      const otherId = otherR.data?.id ? String(otherR.data.id) : null;
      const otherQty = Math.max(0, Number(otherR.data?.qty ?? 0));

      const stock = await getStockInfoFast(storeDb, {
        product_id,
        variant_id,
        productMeta,
      });

      if (!stock.ok) {
        await ordersDb.from("cart_items").delete().eq("id", item0.id);
        await syncCartActivityAndCount(ordersDb, cart.id);

        return NextResponse.json(
          {
            error: stock.reason,
            message:
              stock.reason === "PRODUCT_NOT_FOUND"
                ? "المنتج غير موجود."
                : stock.reason === "VARIANT_NOT_FOUND"
                  ? "التركيبة غير موجودة."
                  : "تعذر التحقق من المخزون.",
            removed_item_id: item0.id,
          },
          { status: stock.reason === "PRODUCT_NOT_FOUND" ? 404 : 400 },
        );
      }

      if (otherId && otherId !== String(item0.id)) {
        const desiredMergedQty = otherQty + currentQty;

        const { finalQty, hardMax, wasLimited, available, max_per_order } =
          computeAllowedQty({
            desiredQty: desiredMergedQty,
            existingQtyInCartForThisLine: 0,
            stock,
          });

        if (hardMax <= 0 || finalQty <= 0) {
          await ordersDb.from("cart_items").delete().eq("id", item0.id);
          await syncCartActivityAndCount(ordersDb, cart.id);

          const res = NextResponse.json({
            data: {
              cart_id: cart.id,
              removed_item_id: item0.id,
              notice: {
                code: "QTY_LIMITED_REMOVED",
                message:
                  "هذه الخيارات غير متوفرة حاليًا، وتم حذف هذا السطر من السلة.",
                desired: desiredMergedQty,
                final: 0,
                available,
                max_per_order,
              },
              stock: {
                available,
                max_per_order,
                in_cart_after: 0,
              },
            },
          });

          return setCartCookieIfPresent(res, sid);
        }

        if (wasLimited && finalQty < desiredMergedQty && !confirmQtyReduction) {
          const res = NextResponse.json({
            data: {
              cart_id: cart.id,
              notice: {
                code: "QTY_WILL_BE_REDUCED",
                message: buildQtyWillBeReducedMessage({
                  available,
                  max_per_order,
                  desiredQty: desiredMergedQty,
                  finalQty,
                }),
                desired: desiredMergedQty,
                final: finalQty,
                available,
                max_per_order,
              },
              pending: {
                op: "set_variant",
                cart_item_id: item0.id,
                selected_option_value_ids,
                variant_id,
                confirm_qty_reduction: true,
                ...(selected_options.length ? { selected_options } : {}),
              },
            },
          });

          return setCartCookieIfPresent(res, sid);
        }

        const upOther = await ordersDb
          .from("cart_items")
          .update({
            qty: finalQty,
            ...(selected_options.length ? { selected_options } : {}),
          })
          .eq("id", otherId)
          .select("*")
          .single();

        if (upOther.error) throw new Error(upOther.error.message);

        const delOld = await ordersDb.from("cart_items").delete().eq("id", item0.id);
        if (delOld.error) throw new Error(delOld.error.message);

        await syncCartActivityAndCount(ordersDb, cart.id);

        const res = NextResponse.json({
          data: {
            cart_id: cart.id,
            item: upOther.data,
            merged: true,
            removed_item_id: item0.id,
            notice: wasLimited
              ? {
                  code: "MERGED_QTY_LIMITED",
                  message: buildMergedQtyLimitedMessage({
                    available,
                    max_per_order,
                    desiredQty: desiredMergedQty,
                    finalQty,
                  }),
                  desired: desiredMergedQty,
                  final: finalQty,
                  available,
                  max_per_order,
                }
              : {
                  code: "MERGED",
                  message: "تم دمج المنتجين في سطر واحد.",
                  desired: desiredMergedQty,
                  final: finalQty,
                  available,
                  max_per_order,
                },
            stock: {
              available,
              max_per_order,
              in_cart_after: finalQty,
            },
          },
        });

        return setCartCookieIfPresent(res, sid);
      }

      const { finalQty, hardMax, wasLimited, available, max_per_order } =
        computeAllowedQty({
          desiredQty: currentQty,
          existingQtyInCartForThisLine: 0,
          stock,
        });

      if (hardMax <= 0 || finalQty <= 0) {
        await ordersDb.from("cart_items").delete().eq("id", item0.id);
        await syncCartActivityAndCount(ordersDb, cart.id);

        const res = NextResponse.json({
          data: {
            cart_id: cart.id,
            removed_item_id: item0.id,
            notice: {
              code: "QTY_LIMITED_REMOVED",
              message: "هذه الخيارات غير متوفرة حاليًا، وتم حذف المنتج من السلة.",
              desired: currentQty,
              final: 0,
              available,
              max_per_order,
            },
            stock: {
              available,
              max_per_order,
              in_cart_after: 0,
            },
          },
        });

        return setCartCookieIfPresent(res, sid);
      }

      if (wasLimited && finalQty < currentQty && !confirmQtyReduction) {
        const res = NextResponse.json({
          data: {
            cart_id: cart.id,
            notice: {
              code: "QTY_WILL_BE_REDUCED",
              message: buildQtyWillBeReducedMessage({
                available,
                max_per_order,
                desiredQty: currentQty,
                finalQty,
              }),
              desired: currentQty,
              final: finalQty,
              available,
              max_per_order,
            },
            pending: {
              op: "set_variant",
              cart_item_id: item0.id,
              selected_option_value_ids,
              variant_id,
              confirm_qty_reduction: true,
              ...(selected_options.length ? { selected_options } : {}),
            },
          },
        });

        return setCartCookieIfPresent(res, sid);
      }

      const upSelf = await ordersDb
        .from("cart_items")
        .update({
          variant_id: cartVariantId,
          selected_option_value_ids,
          line_key: new_line_key,
          qty: finalQty,
          ...(selected_options.length ? { selected_options } : {}),
        })
        .eq("id", item0.id)
        .select("*")
        .single();

      if (upSelf.error) throw new Error(upSelf.error.message);

      await syncCartActivityAndCount(ordersDb, cart.id);

      const res = NextResponse.json({
        data: {
          cart_id: cart.id,
          item: upSelf.data,
          merged: false,
          notice: wasLimited
            ? {
                code: "VARIANT_CHANGED_QTY_LIMITED",
                message: buildVariantChangedQtyLimitedMessage({
                  available,
                  max_per_order,
                  finalQty,
                }),
                final: finalQty,
                available,
                max_per_order,
              }
            : {
                code: "VARIANT_CHANGED",
                message: "تم تحديث الخيارات.",
                final: finalQty,
                available,
                max_per_order,
              },
          stock: {
            available,
            max_per_order,
            in_cart_after: finalQty,
          },
        },
      });

      return setCartCookieIfPresent(res, sid);
    }

    return NextResponse.json({ error: "Unsupported op" }, { status: 400 });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    const status =
      msg === "CART_ITEM_NOT_FOUND" || msg === "CART_ITEM_NOT_IN_CART"
        ? 404
        : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as DeleteBody;

    const cart_item_id = String(body?.cart_item_id || "").trim();

    if (!cart_item_id) {
      return NextResponse.json(
        { error: "Missing cart_item_id" },
        { status: 400 },
      );
    }

    const store_id = await getStoreIdOrThrow(req);
    const sid = await getCartSessionIdFromCookie(req);
    const ordersDb = await getOrdersDb(store_id);

    const cart = await getExistingOpenCart({ store_id, session_id: sid, request: req });

    if (!cart?.id) {
      return cartNotFoundResponse();
    }

    const item0 = await getCartItemOrThrow(ordersDb, cart.id, cart_item_id);

    const delR = await ordersDb.from("cart_items").delete().eq("id", item0.id);

    if (delR.error) throw new Error(delR.error.message);

    await syncCartActivityAndCount(ordersDb, cart.id);

    return fullCartMutationResponse(req, sid, {
      cart_id: cart.id,
      removed_item_id: item0.id,
      notice: {
        code: "REMOVED",
        message: "تم حذف المنتج من السلة.",
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    const status =
      msg === "CART_ITEM_NOT_FOUND" || msg === "CART_ITEM_NOT_IN_CART"
        ? 404
        : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}
