// FILE: apps/storefront/src/app/(store)/api/checkout/lib/order-options.ts

import "server-only";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

type OrderOptionType = "text" | "number" | "choices" | "appointment";

type StoreOrderOptionRow = {
  id: string;
  store_id?: string | null;
  type: OrderOptionType;
  name: string;
  description?: string | null;
  status?: string | boolean | null;
  is_required?: boolean | number | string | null;
  applies_to?: string | null;
  text_size?: "small" | "large" | null;
  allow_multiple?: boolean | number | string | null;
  price_customer?: number | string | null;
  metadata?: Record<string, any> | string | null;
  sort_order?: number | string | null;
};

type StoreOrderOptionChoiceRow = {
  id: string;
  option_id: string;
  label: string;
  price_customer?: number | string | null;
  price_customer_raw?: number | string | null;
  priceCustomerRaw?: number | string | null;
  price_customer_display?: number | string | null;
  priceCustomerDisplay?: number | string | null;
  currency?: string | null;
  cost?: number | string | null;
  weight_kg?: number | string | null;
  sort_order?: number | string | null;
  source?: "table" | "metadata" | "payload";
};

type CartOrderOptionAnswerInput = {
  option_id?: string | null;
  type?: OrderOptionType | string | null;
  value?: string | number | null;
  choice_ids?: string[] | null;
  metadata?: Record<string, any> | null;
};

export type CartOrderOptionSummaryLine = {
  option_id: string;
  optionId: string;
  type: OrderOptionType;
  name: string;
  value: string | null;
  choice_ids: string[];
  choiceIds: string[];
  choices: Array<{
    id: string;
    label: string;
    price_customer: number;
    priceCustomer: number;
    price_customer_raw?: number;
    priceCustomerRaw?: number;
  }>;
  metadata: Record<string, any>;
  price_customer: number;
  priceCustomer: number;
  currency: string;
};

type ApplicableOrderOption = StoreOrderOptionRow & {
  choices: StoreOrderOptionChoiceRow[];
  category_ids: string[];
};

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "active", "enabled"].includes(v)) return true;
    if (["false", "0", "no", "off", "inactive", "disabled"].includes(v)) return false;
  }

  return fallback;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

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

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => s(x)).filter(Boolean)));
}

function isUuidLike(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    s(x),
  );
}

function normalizeChoiceToken(value: any) {
  return s(value)
    .replace(/\u0640/g, "")
    .replace(/[\u061c\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeOptionType(value: any): OrderOptionType | null {
  const type = s(value) as OrderOptionType;

  if (
    type === "text" ||
    type === "number" ||
    type === "choices" ||
    type === "appointment"
  ) {
    return type;
  }

  return null;
}

function isActiveOption(option: StoreOrderOptionRow) {
  const status = option.status;

  if (status === undefined || status === null) return true;
  if (typeof status === "boolean") return status;

  const v = s(status).toLowerCase();

  if (!v) return true;

  return ["active", "published", "enabled", "true", "1"].includes(v);
}

function readOptionAppliesTo(option: StoreOrderOptionRow) {
  const meta = safeObject(option.metadata);

  return (
    s(option.applies_to) ||
    s(meta.applies_to) ||
    s(meta.appliesTo) ||
    s(meta.products_mode) ||
    s(meta.productsMode) ||
    "all"
  ).toLowerCase();
}

function appointmentConfig(
  option: StoreOrderOptionRow,
): Record<string, any> & { days: Record<string, any> } {
  const meta = safeObject(option.metadata);
  const appointment = safeObject(meta.appointment ?? meta.schedule ?? meta.booking);

  return {
    ...appointment,
    days: safeObject(appointment.days),
  };
}

function appointmentMode(option: StoreOrderOptionRow) {
  const config = appointmentConfig(option);
  const mode = s(config.scheduleMode ?? config.schedule_mode ?? config.mode);

  return mode === "days_times" || mode === "days-times" || mode === "daysAndTimes"
    ? "days_times"
    : "days";
}

function isoToday() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(`${baseISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getDayKeyFromDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  const day = d.getDay();

  if (day === 0) return "sunday";
  if (day === 1) return "monday";
  if (day === 2) return "tuesday";
  if (day === 3) return "wednesday";
  if (day === 4) return "thursday";
  if (day === 5) return "friday";

  return "saturday";
}

function readLeadDays(option: StoreOrderOptionRow) {
  const config = appointmentConfig(option);

  const raw =
    config.minimumLeadDays ??
    config.minimum_lead_days ??
    config.bookingLeadDays ??
    config.booking_lead_days ??
    config.reserveAfterDays ??
    config.reserve_after_days ??
    config.preparationDays ??
    config.preparation_days ??
    0;

  return Math.max(0, Math.floor(n(raw)));
}

function readMaxAdvanceDays(option: StoreOrderOptionRow) {
  const config = appointmentConfig(option);

  const raw =
    config.maxAdvanceDays ??
    config.max_advance_days ??
    config.maximumAdvanceDays ??
    config.maximum_advance_days ??
    config.availableForDays ??
    config.available_for_days ??
    null;

  if (raw === null || raw === undefined || raw === "") return null;

  const value = Math.floor(n(raw));

  return value > 0 ? value : null;
}

function exceptionDates(option: StoreOrderOptionRow) {
  const config = appointmentConfig(option);

  const raw = safeArray(
    config.exceptions ??
      config.disabledDates ??
      config.disabled_dates ??
      config.blockedDates ??
      config.blocked_dates,
  );

  const dates: string[] = [];

  for (const item of raw) {
    const date = s(item?.date ?? item?.day ?? item);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.push(date);
  }

  return new Set(dates);
}

function getRangesForDate(option: StoreOrderOptionRow, date: string) {
  if (!date) return [];

  const config = appointmentConfig(option);
  const dayKey = getDayKeyFromDate(date);
  const day = safeObject(config.days?.[dayKey]);

  if (day.enabled === false) return [];
  if (day.enabled === 0) return [];

  const ranges = safeArray(day.ranges ?? day.times ?? day.slots);

  return ranges
    .map((range: any) => ({
      from: s(range?.from ?? range?.start ?? range?.startTime),
      to: s(range?.to ?? range?.end ?? range?.endTime),
    }))
    .filter((range: { from: string; to: string }) => range.from && range.to);
}

function isDateAllowed(option: StoreOrderOptionRow, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const today = isoToday();
  const minDate = addDaysISO(today, readLeadDays(option));

  if (date < minDate) return false;

  const maxAdvanceDays = readMaxAdvanceDays(option);

  if (maxAdvanceDays != null) {
    const maxDate = addDaysISO(today, maxAdvanceDays);
    if (date > maxDate) return false;
  }

  if (exceptionDates(option).has(date)) return false;

  const config = appointmentConfig(option);
  const dayKey = getDayKeyFromDate(date);
  const day = safeObject(config.days?.[dayKey]);

  if (Object.keys(config.days).length === 0) return true;

  return bool(day.enabled, false);
}

function normalizeMetadata(value: any) {
  const meta = safeObject(value);

  const out: Record<string, any> = {};

  for (const [key, val] of Object.entries(meta)) {
    if (typeof val === "string") {
      out[key] = val.trim();
    } else {
      out[key] = val;
    }
  }

  return out;
}

function readCategoryIdsFromOptionMetadata(option: StoreOrderOptionRow) {
  const meta = safeObject(option.metadata);

  return uniq(
    safeArray(
      meta.category_ids ??
        meta.categoryIds ??
        meta.categories ??
        meta.selectedCategoryIds ??
        meta.selected_category_ids,
    ).map((x: any) => String(x)),
  );
}

function readRawChoicePrice(choice: any) {
  return Math.max(
    0,
    n(
      choice?.price_customer_raw ??
        choice?.priceCustomerRaw ??
        choice?.raw_price_customer ??
        choice?.rawPriceCustomer ??
        choice?.price_customer_base ??
        choice?.priceCustomerBase ??
        choice?.base_price_customer ??
        choice?.basePriceCustomer ??
        choice?.price_customer ??
        choice?.priceCustomer ??
        choice?.price ??
        choice?.amount ??
        0,
    ),
  );
}

function readChoiceRowsFromOptionMetadata(
  option: StoreOrderOptionRow,
): StoreOrderOptionChoiceRow[] {
  const meta = safeObject(option.metadata);

  const rawChoices = safeArray(
    meta.choices ??
      meta.choice_list ??
      meta.choiceList ??
      meta.options ??
      meta.items ??
      meta.values,
  );

  const rows: StoreOrderOptionChoiceRow[] = [];

  rawChoices.forEach((choice: any, index: number) => {
    const label = s(
      choice?.label ??
        choice?.name ??
        choice?.title ??
        choice?.value ??
        choice?.text,
    );

    if (!label) return;

    const id =
      s(choice?.id) ||
      s(choice?.choice_id) ||
      s(choice?.choiceId) ||
      s(choice?.value_id) ||
      s(choice?.valueId) ||
      label;

    const rawPrice = readRawChoicePrice(choice);

    rows.push({
      id,
      option_id: option.id,
      label,
      price_customer: rawPrice,
      price_customer_raw: rawPrice,
      price_customer_display:
        choice?.price_customer_display ??
        choice?.priceCustomerDisplay ??
        choice?.display_price_customer ??
        choice?.displayPriceCustomer ??
        choice?.price_customer ??
        choice?.priceCustomer ??
        rawPrice,
      cost: choice?.cost ?? 0,
      weight_kg: choice?.weight_kg ?? choice?.weightKg ?? 0,
      sort_order: choice?.sort_order ?? choice?.sortOrder ?? index,
      source: "metadata",
    });
  });

  return rows.sort((a, b) => n(a.sort_order) - n(b.sort_order));
}

function mergeChoicesForOption(args: {
  option: StoreOrderOptionRow;
  tableChoices: StoreOrderOptionChoiceRow[];
}) {
  const tableChoices = Array.isArray(args.tableChoices) ? args.tableChoices : [];
  const metadataChoices = readChoiceRowsFromOptionMetadata(args.option);

  const map = new Map<string, StoreOrderOptionChoiceRow>();

  for (const choice of tableChoices) {
    const id = s(choice.id);
    if (!id) continue;

    const rawPrice = readRawChoicePrice(choice);

    map.set(id, {
      ...choice,
      id,
      option_id: args.option.id,
      label: s(choice.label),
      price_customer: rawPrice,
      price_customer_raw: rawPrice,
      price_customer_display:
        choice.price_customer_display ??
        choice.priceCustomerDisplay ??
        choice.price_customer ??
        rawPrice,
      cost: choice.cost ?? 0,
      weight_kg: choice.weight_kg ?? 0,
      sort_order: choice.sort_order ?? 0,
      source: "table",
    });
  }

  for (const choice of metadataChoices) {
    const id = s(choice.id);
    if (!id || map.has(id)) continue;

    map.set(id, choice);
  }

  return Array.from(map.values()).filter((choice) => choice.id && choice.label);
}

async function loadCartProductIds(ordersDb: any, cartId: string) {
  const r = await ordersDb
    .from("cart_items")
    .select("product_id")
    .eq("cart_id", cartId);

  if (r.error) throw new Error(r.error.message);

  return uniq(
    (Array.isArray(r.data) ? r.data : []).map((row: any) => row.product_id),
  );
}

async function loadProductCategoryIds(args: {
  storeDb: any;
  storeId: string;
  productIds: string[];
}) {
  const productIds = uniq(args.productIds);
  if (productIds.length === 0) return [];

  const out: string[] = [];

  const pcR = await args.storeDb
    .from("product_categories")
    .select("product_id,category_id")
    .in("product_id", productIds);

  if (!pcR.error && Array.isArray(pcR.data)) {
    for (const row of pcR.data) out.push(s(row.category_id));
  }

  const cpR = await args.storeDb
    .from("category_products")
    .select("product_id,category_id")
    .in("product_id", productIds);

  if (!cpR.error && Array.isArray(cpR.data)) {
    for (const row of cpR.data) out.push(s(row.category_id));
  }

  return uniq(out);
}

async function loadOptionCategoryLinks(args: {
  storeDb: any;
  storeId: string;
  optionIds: string[];
}) {
  const optionIds = uniq(args.optionIds);
  const map = new Map<string, string[]>();

  if (optionIds.length === 0) return map;

  async function run(ids: string[]) {
    return await args.storeDb
      .from("store_order_option_categories")
      .select("option_id,category_id")
      .eq("store_id", args.storeId)
      .in("option_id", ids);
  }

  let r = await run(optionIds);

  if (r.error) {
    const uuidIds = optionIds.filter(isUuidLike);

    if (uuidIds.length > 0 && uuidIds.length !== optionIds.length) {
      r = await run(uuidIds);
    }
  }

  if (r.error || !Array.isArray(r.data)) return map;

  for (const row of r.data) {
    const optionId = s(row.option_id);
    const categoryId = s(row.category_id);

    if (!optionId || !categoryId) continue;

    const cur = map.get(optionId) ?? [];
    cur.push(categoryId);
    map.set(optionId, uniq(cur));
  }

  return map;
}

async function loadChoices(args: {
  storeDb: any;
  storeId: string;
  optionIds: string[];
}) {
  const optionIds = uniq(args.optionIds);
  const map = new Map<string, StoreOrderOptionChoiceRow[]>();

  if (optionIds.length === 0) return map;

  const selects = [
    "id,option_id,label,price_customer,cost,weight_kg,sort_order",
    "id,option_id,label,price_customer,sort_order",
    "id,option_id,label,sort_order",
  ];

  let lastError: any = null;

  async function run(select: string, ids: string[]) {
    return await args.storeDb
      .from("store_order_option_choices")
      .select(select)
      .eq("store_id", args.storeId)
      .in("option_id", ids)
      .order("sort_order", { ascending: true });
  }

  function collect(rows: any[]) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const optionId = s(row.option_id);
      if (!optionId) continue;

      const rawPrice = readRawChoicePrice(row);
      const list = map.get(optionId) ?? [];

      list.push({
        id: s(row.id),
        option_id: optionId,
        label: s(row.label),
        price_customer: rawPrice,
        price_customer_raw: rawPrice,
        price_customer_display: row.price_customer ?? rawPrice,
        cost: row.cost ?? 0,
        weight_kg: row.weight_kg ?? 0,
        sort_order: row.sort_order ?? 0,
        source: "table",
      });

      map.set(optionId, list);
    }
  }

  for (const select of selects) {
    let r = await run(select, optionIds);

    if (r.error) {
      const uuidIds = optionIds.filter(isUuidLike);

      if (uuidIds.length > 0 && uuidIds.length !== optionIds.length) {
        r = await run(select, uuidIds);
      }
    }

    if (!r.error) {
      collect(r.data);
      return map;
    }

    lastError = r.error;
  }

  if (lastError) throw new Error(lastError.message);

  return map;
}

async function loadRawActiveOptions(args: { storeDb: any; storeId: string }) {
  const selects = [
    "id,store_id,type,name,description,status,is_required,applies_to,text_size,allow_multiple,price_customer,metadata,sort_order",
    "id,store_id,type,name,description,status,is_required,text_size,allow_multiple,price_customer,metadata,sort_order",
    "id,store_id,type,name,description,is_required,text_size,allow_multiple,price_customer,metadata,sort_order",
  ];

  let lastError: any = null;

  for (const select of selects) {
    const r = await args.storeDb
      .from("store_order_options")
      .select(select)
      .eq("store_id", args.storeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!r.error) {
      const rows: StoreOrderOptionRow[] = (Array.isArray(r.data) ? r.data : [])
        .map((row: any): StoreOrderOptionRow | null => {
          const type = normalizeOptionType(row.type);

          if (!type) return null;

          return {
            ...row,
            id: s(row.id),
            type,
            name: s(row.name),
          };
        })
        .filter((row: StoreOrderOptionRow | null): row is StoreOrderOptionRow =>
          Boolean(row),
        )
        .filter((row: StoreOrderOptionRow) =>
          Boolean(row.id && row.name && isActiveOption(row)),
        );

      return rows;
    }

    lastError = r.error;
  }

  if (lastError) throw new Error(lastError.message);

  return [];
}

async function loadApplicableOrderOptions(args: {
  ordersDb: any;
  storeDb: any;
  storeId: string;
  cartId?: string;
  productIds?: string[];
}) {
  const productIds = args.productIds
    ? uniq(args.productIds)
    : args.cartId
      ? await loadCartProductIds(args.ordersDb, args.cartId)
      : [];

  const rawOptions = await loadRawActiveOptions({
    storeDb: args.storeDb,
    storeId: args.storeId,
  });

  const optionIds = rawOptions.map((option) => option.id);

  const [choicesByOption, linkedCategories, cartCategoryIds] =
    await Promise.all([
      loadChoices({
        storeDb: args.storeDb,
        storeId: args.storeId,
        optionIds,
      }),
      loadOptionCategoryLinks({
        storeDb: args.storeDb,
        storeId: args.storeId,
        optionIds,
      }),
      loadProductCategoryIds({
        storeDb: args.storeDb,
        storeId: args.storeId,
        productIds,
      }),
    ]);

  const cartCategorySet = new Set(cartCategoryIds);

  const options: ApplicableOrderOption[] = [];

  for (const option of rawOptions) {
    const appliesTo = readOptionAppliesTo(option);
    const categoryIds = uniq([
      ...(linkedCategories.get(option.id) ?? []),
      ...readCategoryIdsFromOptionMetadata(option),
    ]);

    const categoryRestricted =
      appliesTo === "categories" ||
      appliesTo === "category" ||
      appliesTo === "selected_categories" ||
      appliesTo === "include_categories";

    if (categoryRestricted) {
      if (categoryIds.length === 0) continue;

      const hit = categoryIds.some((categoryId) =>
        cartCategorySet.has(categoryId),
      );
      if (!hit) continue;
    }

    options.push({
      ...option,
      is_required: bool(option.is_required, false),
      allow_multiple: bool(option.allow_multiple, false),
      price_customer: Math.max(0, n(option.price_customer)),
      metadata: safeObject(option.metadata),
      choices: mergeChoicesForOption({
        option,
        tableChoices: choicesByOption.get(option.id) ?? [],
      }),
      category_ids: categoryIds,
    });
  }

  return options;
}

function readSelectedChoicesFromPayload(
  answer: CartOrderOptionAnswerInput | null | undefined,
): StoreOrderOptionChoiceRow[] {
  const metadata = safeObject(answer?.metadata);

  const raw = safeArray(
    metadata.selected_choices ??
      metadata.selectedChoices ??
      metadata.choices_snapshot ??
      metadata.choicesSnapshot,
  );

  const out: StoreOrderOptionChoiceRow[] = [];

  raw.forEach((choice: any, index: number) => {
    const label = s(
      choice?.label ??
        choice?.name ??
        choice?.title ??
        choice?.value ??
        choice?.text,
    );

    if (!label) return;

    const id =
      s(choice?.id) ||
      s(choice?.choice_id) ||
      s(choice?.choiceId) ||
      s(choice?.value_id) ||
      s(choice?.valueId) ||
      label;

    const rawPrice = readRawChoicePrice(choice);

    out.push({
      id,
      option_id: s(answer?.option_id),
      label,
      price_customer: rawPrice,
      price_customer_raw: rawPrice,
      price_customer_display:
        choice?.price_customer_display ??
        choice?.priceCustomerDisplay ??
        choice?.display_price_customer ??
        choice?.displayPriceCustomer ??
        choice?.price_customer ??
        choice?.priceCustomer ??
        rawPrice,
      currency: choice?.currency ?? null,
      cost: choice?.cost ?? 0,
      weight_kg: choice?.weight_kg ?? choice?.weightKg ?? 0,
      sort_order: choice?.sort_order ?? choice?.sortOrder ?? index,
      source: "payload",
    });
  });

  return out;
}

function splitChoiceValue(value: any) {
  return s(value)
    .split(/[,،]/g)
    .map((part) => s(part))
    .filter(Boolean);
}

function readAnswerChoiceCandidates(
  answer: CartOrderOptionAnswerInput | null | undefined,
) {
  const metadata = safeObject(answer?.metadata);
  const selectedPayloadChoices = readSelectedChoicesFromPayload(answer);

  return uniq([
    ...(Array.isArray(answer?.choice_ids) ? answer!.choice_ids!.map(String) : []),

    ...safeArray(
      metadata.selected_choice_ids ??
        metadata.selectedChoiceIds ??
        metadata.choice_ids ??
        metadata.choiceIds,
    ).map((x: any) => String(x)),

    ...selectedPayloadChoices.map((choice) => s(choice.id)),
    ...selectedPayloadChoices.map((choice) => s(choice.label)),

    ...splitChoiceValue(answer?.value),
  ]);
}

function addChoiceToLookup(
  lookup: Map<string, StoreOrderOptionChoiceRow>,
  choice: StoreOrderOptionChoiceRow,
) {
  const keys = uniq([
    s(choice.id),
    s(choice.label),
    normalizeChoiceToken(choice.id),
    normalizeChoiceToken(choice.label),
  ]);

  for (const key of keys) {
    if (key && !lookup.has(key)) {
      lookup.set(key, choice);
    }
  }
}

function pushUniqueChoice(
  list: StoreOrderOptionChoiceRow[],
  choice: StoreOrderOptionChoiceRow,
) {
  const choiceKey = s(choice.id) || normalizeChoiceToken(choice.label);

  if (!choiceKey) return;

  const exists = list.some((item) => {
    const itemKey = s(item.id) || normalizeChoiceToken(item.label);
    return itemKey === choiceKey;
  });

  if (!exists) {
    list.push(choice);
  }
}

function normalizeOneAnswer(args: {
  option: ApplicableOrderOption;
  answer: CartOrderOptionAnswerInput | null | undefined;
  requireFilled?: boolean;
}) {
  const { option, answer } = args;
  const type = option.type;
  const required = bool(option.is_required, false);
  const requireFilled = Boolean(args.requireFilled || required);

  const rawValue = s(answer?.value);
  const rawMetadata = normalizeMetadata(answer?.metadata);
  const rawChoiceCandidates = readAnswerChoiceCandidates(answer);

  if (type === "text") {
    if (!rawValue) {
      if (requireFilled) {
        return {
          ok: false as const,
          error: "ORDER_OPTION_REQUIRED",
          message_ar: `يرجى تعبئة خيار الطلب: ${option.name}`,
        };
      }

      return { ok: true as const, row: null };
    }

    const price = Math.max(0, n(option.price_customer));

    return {
      ok: true as const,
      row: {
        option_id: option.id,
        option_type: type,
        value: rawValue,
        choice_ids: [],
        metadata: {},
        price_customer: price,
        snapshot: {
          option_name: option.name,
          option_type: type,
          price_customer: price,
          choices: [],
        },
      },
    };
  }

  if (type === "number") {
    if (!rawValue) {
      if (requireFilled) {
        return {
          ok: false as const,
          error: "ORDER_OPTION_REQUIRED",
          message_ar: `يرجى تعبئة خيار الطلب: ${option.name}`,
        };
      }

      return { ok: true as const, row: null };
    }

    if (!Number.isFinite(Number(rawValue))) {
      return {
        ok: false as const,
        error: "ORDER_OPTION_NUMBER_INVALID",
        message_ar: `قيمة خيار الطلب غير صحيحة: ${option.name}`,
      };
    }

    const price = Math.max(0, n(option.price_customer));

    return {
      ok: true as const,
      row: {
        option_id: option.id,
        option_type: type,
        value: rawValue,
        choice_ids: [],
        metadata: {},
        price_customer: price,
        snapshot: {
          option_name: option.name,
          option_type: type,
          price_customer: price,
          choices: [],
        },
      },
    };
  }

  if (type === "choices") {
    const lookup = new Map<string, StoreOrderOptionChoiceRow>();

    for (const choice of option.choices) {
      addChoiceToLookup(lookup, choice);
    }

    const matchedChoices: StoreOrderOptionChoiceRow[] = [];

    for (const rawCandidate of rawChoiceCandidates) {
      const direct = lookup.get(s(rawCandidate));
      const normalized = lookup.get(normalizeChoiceToken(rawCandidate));
      const choice = direct ?? normalized;

      if (!choice) continue;

      pushUniqueChoice(matchedChoices, choice);
    }

    let finalChoices = bool(option.allow_multiple, false)
      ? matchedChoices
      : matchedChoices.slice(0, 1);

    if (rawChoiceCandidates.length > 0 && finalChoices.length === 0) {
      const payloadChoices = readSelectedChoicesFromPayload(answer);

      if (payloadChoices.length > 0) {
        finalChoices = bool(option.allow_multiple, false)
          ? payloadChoices
          : payloadChoices.slice(0, 1);
      }
    }

    if (rawChoiceCandidates.length > 0 && finalChoices.length === 0) {
      return {
        ok: false as const,
        error: "ORDER_OPTION_CHOICE_INVALID",
        message_ar: `اختيار غير صحيح في خيار الطلب: ${option.name}`,
      };
    }

    if (finalChoices.length === 0) {
      if (requireFilled) {
        return {
          ok: false as const,
          error: "ORDER_OPTION_REQUIRED",
          message_ar: `يرجى تعبئة خيار الطلب: ${option.name}`,
        };
      }

      return { ok: true as const, row: null };
    }

    const allChoiceIds = finalChoices.map((choice) => s(choice.id)).filter(Boolean);
    const dbChoiceIds = allChoiceIds.filter(isUuidLike);

    const choicesSnapshot = finalChoices.map((choice) => {
      const rawPrice = readRawChoicePrice(choice);

      return {
        id: s(choice.id),
        label: s(choice.label),
        price_customer: rawPrice,
        price_customer_raw: rawPrice,
        price_customer_display:
          choice.price_customer_display ??
          choice.priceCustomerDisplay ??
          choice.price_customer ??
          rawPrice,
      };
    });

    const price = round2(
      choicesSnapshot.reduce(
        (acc, choice) => acc + Math.max(0, n(choice.price_customer_raw)),
        0,
      ),
    );

    return {
      ok: true as const,
      row: {
        option_id: option.id,
        option_type: type,
        value: choicesSnapshot.map((choice) => choice.label).join(", "),
        choice_ids: dbChoiceIds,
        metadata: {
          selected_choice_ids: allChoiceIds,
          selected_choices: choicesSnapshot,
        },
        price_customer: price,
        snapshot: {
          option_name: option.name,
          option_type: type,
          price_customer: price,
          choices: choicesSnapshot,
        },
      },
    };
  }

  if (type === "appointment") {
    const date = s(rawMetadata.date);
    const mode = appointmentMode(option);

    if (!date) {
      if (requireFilled) {
        return {
          ok: false as const,
          error: "ORDER_OPTION_REQUIRED",
          message_ar: `يرجى تعبئة خيار الطلب: ${option.name}`,
        };
      }

      return { ok: true as const, row: null };
    }

    if (!isDateAllowed(option, date)) {
      return {
        ok: false as const,
        error: "ORDER_OPTION_APPOINTMENT_DATE_INVALID",
        message_ar: `الموعد المختار غير متاح في خيار الطلب: ${option.name}`,
      };
    }

    const meta: Record<string, any> = {
      date,
      mode,
    };

    let value = date;

    if (mode === "days_times") {
      const from = s(rawMetadata.from);
      const to = s(rawMetadata.to);

      if (!from || !to) {
        if (requireFilled) {
          return {
            ok: false as const,
            error: "ORDER_OPTION_APPOINTMENT_TIME_REQUIRED",
            message_ar: `يرجى اختيار وقت الموعد في خيار الطلب: ${option.name}`,
          };
        }

        return { ok: true as const, row: null };
      }

      const ranges = getRangesForDate(option, date);
      const found = ranges.some((range) => range.from === from && range.to === to);

      if (!found) {
        return {
          ok: false as const,
          error: "ORDER_OPTION_APPOINTMENT_TIME_INVALID",
          message_ar: `وقت الموعد المختار غير متاح في خيار الطلب: ${option.name}`,
        };
      }

      meta.from = from;
      meta.to = to;
      value = `${date} ${from}-${to}`;
    }

    const price = Math.max(0, n(option.price_customer));

    return {
      ok: true as const,
      row: {
        option_id: option.id,
        option_type: type,
        value,
        choice_ids: [],
        metadata: meta,
        price_customer: price,
        snapshot: {
          option_name: option.name,
          option_type: type,
          price_customer: price,
          choices: [],
        },
      },
    };
  }

  return { ok: true as const, row: null };
}

async function normalizeAnswersFromPayload(args: {
  ordersDb: any;
  storeDb: any;
  storeId: string;
  cartId: string;
  answers: CartOrderOptionAnswerInput[];
  requireAll?: boolean;
}) {
  const options = await loadApplicableOrderOptions({
    ordersDb: args.ordersDb,
    storeDb: args.storeDb,
    storeId: args.storeId,
    cartId: args.cartId,
  });

  const optionMap = new Map(options.map((option) => [option.id, option]));
  const answersByOption = new Map<string, CartOrderOptionAnswerInput>();

  for (const answer of Array.isArray(args.answers) ? args.answers : []) {
    const optionId = s(answer?.option_id);
    if (!optionId || !optionMap.has(optionId)) continue;

    answersByOption.set(optionId, answer);
  }

  const rows: any[] = [];

  for (const option of options) {
    const answer = answersByOption.get(option.id);
    const res = normalizeOneAnswer({
      option,
      answer,
      requireFilled: Boolean(args.requireAll),
    });

    if (!res.ok) return res;

    if (res.row) {
      rows.push(res.row);
    }
  }

  return {
    ok: true as const,
    rows,
    options,
  };
}

export async function saveCartOrderOptionsFromPayload(args: {
  sb?: any;
  storeId: string;
  cartId: string;
  answers: CartOrderOptionAnswerInput[];
  currency: string;
}) {
  const [ordersDb, storeDb] = await Promise.all([
    getOrdersDb(args.storeId),
    getStoreDb(args.storeId),
  ]);

  const normalized = await normalizeAnswersFromPayload({
    ordersDb,
    storeDb,
    storeId: args.storeId,
    cartId: args.cartId,
    answers: args.answers,
    requireAll: false,
  });

  if (!normalized.ok) return normalized;

  const del = await ordersDb
    .from("cart_order_option_answers")
    .delete()
    .eq("store_id", args.storeId)
    .eq("cart_id", args.cartId);

  if (del.error) {
    return {
      ok: false as const,
      error: "ORDER_OPTIONS_SAVE_FAILED",
      message_ar: del.error.message,
    };
  }

  if (normalized.rows.length > 0) {
    const now = new Date().toISOString();

    const ins = await ordersDb.from("cart_order_option_answers").insert(
      normalized.rows.map((row) => ({
        store_id: args.storeId,
        cart_id: args.cartId,
        option_id: row.option_id,
        option_type: row.option_type,
        value: row.value,
        choice_ids: row.choice_ids,
        metadata: row.metadata,
        snapshot: row.snapshot,
        price_customer: row.price_customer,
        currency: args.currency,
        created_at: now,
        updated_at: now,
      })),
    );

    if (ins.error) {
      return {
        ok: false as const,
        error: "ORDER_OPTIONS_SAVE_FAILED",
        message_ar: ins.error.message,
      };
    }
  }

  return {
    ok: true as const,
    rows: normalized.rows,
  };
}

async function loadSavedCartAnswers(args: {
  ordersDb: any;
  storeId: string;
  cartId: string;
}) {
  const r = await args.ordersDb
    .from("cart_order_option_answers")
    .select(
      "option_id,option_type,value,choice_ids,metadata,snapshot,price_customer,currency",
    )
    .eq("store_id", args.storeId)
    .eq("cart_id", args.cartId);

  if (r.error) throw new Error(r.error.message);

  return Array.isArray(r.data) ? r.data : [];
}

export async function ensureCartOrderOptionsValid(args: {
  sb?: any;
  storeId: string;
  cartId: string;
}) {
  const [ordersDb, storeDb] = await Promise.all([
    getOrdersDb(args.storeId),
    getStoreDb(args.storeId),
  ]);

  const saved = await loadSavedCartAnswers({
    ordersDb,
    storeId: args.storeId,
    cartId: args.cartId,
  });

  const answers: CartOrderOptionAnswerInput[] = saved.map((row: any) => ({
    option_id: row.option_id,
    type: row.option_type,
    value: row.value,
    choice_ids: Array.isArray(row.choice_ids) ? row.choice_ids : [],
    metadata: safeObject(row.metadata),
  }));

  const normalized = await normalizeAnswersFromPayload({
    ordersDb,
    storeDb,
    storeId: args.storeId,
    cartId: args.cartId,
    answers,
    requireAll: true,
  });

  if (!normalized.ok) return normalized;

  return {
    ok: true as const,
    rows: normalized.rows,
  };
}

export async function loadCartOrderOptionsSummary(args: {
  sb?: any;
  storeId: string;
  cartId: string;
  productIds: string[];
  targetCurrency: string;
  sourceCurrency: string;
  convertFromStoreCurrency: (amount: number) => number;
}) {
  const [ordersDb, storeDb] = await Promise.all([
    getOrdersDb(args.storeId),
    getStoreDb(args.storeId),
  ]);

  const options = await loadApplicableOrderOptions({
    ordersDb,
    storeDb,
    storeId: args.storeId,
    cartId: args.cartId,
    productIds: args.productIds,
  });

  const optionMap = new Map(options.map((option) => [option.id, option]));
  const saved = await loadSavedCartAnswers({
    ordersDb,
    storeId: args.storeId,
    cartId: args.cartId,
  });

  const lines: CartOrderOptionSummaryLine[] = [];

  for (const row of saved) {
    const optionId = s(row.option_id);
    const option = optionMap.get(optionId);

    if (!option) continue;

    const answer: CartOrderOptionAnswerInput = {
      option_id: optionId,
      type: row.option_type,
      value: row.value,
      choice_ids: Array.isArray(row.choice_ids) ? row.choice_ids : [],
      metadata: safeObject(row.metadata),
    };

    const normalized = normalizeOneAnswer({
      option,
      answer,
      requireFilled: false,
    });

    if (!normalized.ok || !normalized.row) continue;

    const rawPrice = Math.max(0, n(normalized.row.price_customer));
    const convertedPrice = round2(args.convertFromStoreCurrency(rawPrice));
    const snapshot = safeObject(normalized.row.snapshot);
    const choicesSnapshot = safeArray(snapshot.choices);

    lines.push({
      option_id: option.id,
      optionId: option.id,
      type: option.type,
      name: option.name,
      value: normalized.row.value ?? null,
      choice_ids: normalized.row.choice_ids,
      choiceIds: normalized.row.choice_ids,
      choices: choicesSnapshot.map((choice: any) => {
        const rawChoicePrice = Math.max(
          0,
          n(choice.price_customer_raw ?? choice.priceCustomerRaw ?? choice.price_customer),
        );

        const convertedChoicePrice = round2(
          args.convertFromStoreCurrency(rawChoicePrice),
        );

        return {
          id: s(choice.id),
          label: s(choice.label),
          price_customer: convertedChoicePrice,
          priceCustomer: convertedChoicePrice,
          price_customer_raw: rawChoicePrice,
          priceCustomerRaw: rawChoicePrice,
        };
      }),
      metadata: normalized.row.metadata,
      price_customer: convertedPrice,
      priceCustomer: convertedPrice,
      currency: args.targetCurrency,
    });
  }

  const fee = round2(lines.reduce((acc, line) => acc + n(line.price_customer), 0));

  return {
    lines,
    fee,
  };
}

export async function copyCartOrderOptionsToOrder(args: {
  sb?: any;
  storeId: string;
  cartId: string;
  orderId: string;
  targetCurrency: string;
  summaryOrderOptions?: CartOrderOptionSummaryLine[];
}) {
  const ordersDb = await getOrdersDb(args.storeId);

  const valid = await ensureCartOrderOptionsValid({
    storeId: args.storeId,
    cartId: args.cartId,
  });

  if (!valid.ok) return valid;

  const summaryByOption = new Map(
    (args.summaryOrderOptions ?? []).map((line) => [line.option_id, line]),
  );

  if (valid.rows.length === 0) {
    return { ok: true as const };
  }

  const now = new Date().toISOString();

  const rows = valid.rows.map((row: any) => {
    const summary = summaryByOption.get(row.option_id);
    const snapshot = safeObject(row.snapshot);
    const choices = safeArray(snapshot.choices);

    return {
      store_id: args.storeId,
      order_id: args.orderId,
      option_id: row.option_id,
      option_name: s(snapshot.option_name) || summary?.name || "",
      option_type: row.option_type,
      value: row.value ?? null,
      choice_ids: row.choice_ids ?? [],
      choices_snapshot: choices,
      metadata: row.metadata ?? {},
      snapshot,
      price_customer: summary
        ? summary.price_customer
        : Math.max(0, n(row.price_customer)),
      currency: args.targetCurrency,
      created_at: now,
    };
  });

  const ins = await ordersDb.from("order_option_answers").insert(rows);

  if (ins.error) {
    return {
      ok: false as const,
      error: "ORDER_OPTIONS_COPY_FAILED",
      message_ar: ins.error.message,
    };
  }

  return { ok: true as const };
}

export async function clearCartOrderOptions(args: {
  sb?: any;
  storeId: string;
  cartId: string;
}) {
  const ordersDb = await getOrdersDb(args.storeId);

  const r = await ordersDb
    .from("cart_order_option_answers")
    .delete()
    .eq("store_id", args.storeId)
    .eq("cart_id", args.cartId);

  if (r.error) {
    return {
      ok: false as const,
      error: r.error.message,
    };
  }

  return { ok: true as const };
}