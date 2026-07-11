// FILE: apps/storefront/src/app/(store)/api/account/orders/[orderNo]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { getOrdersDb } from "@/data/db/orders-db.server";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ orderNo: string }> };

type ResolvedValue = {
  id: string;
  valueLabel: string;
  optionId?: string | null;
  optionName?: string | null;
};

type NormalizedOrderOptionChoice = {
  id: string | null;
  label: string;
  price_customer: number;
  priceCustomer: number;
  currency: string | null;
};

type NormalizedOrderOptionLine = {
  id: string;
  option_id: string | null;
  optionId: string | null;

  name: string;
  option_name: string;
  optionName: string;

  type: string;
  option_type: string;
  optionType: string;

  value: string | null;

  choice_ids: string[];
  choiceIds: string[];

  choices: NormalizedOrderOptionChoice[];

  metadata: Record<string, any>;
  snapshot: Record<string, any>;

  price_customer: number;
  priceCustomer: number;

  currency: string;
};

function pickToken(jar: Awaited<ReturnType<typeof cookies>>) {
  return (
    jar.get("elyaia_session")?.value ||
    jar.get("session")?.value ||
    jar.get("elyaiaSession")?.value ||
    ""
  );
}

function getSb() {
  return typeof (supabaseAdmin as any) === "function"
    ? (supabaseAdmin as any)()
    : (supabaseAdmin as any);
}

async function resolveCustomerId(
  sb: any,
  token: string,
): Promise<string | null> {
  const session = await Promise.resolve(verifySession(token) as any);

  if (session?.customer_id) return String(session.customer_id);

  const authUserId = session?.auth_user_id || session?.user_id || null;
  if (!authUserId) return null;

  const res = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", String(authUserId))
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);
  return res.data?.id ? String(res.data.id) : null;
}

function s(value: any) {
  return String(value ?? "").trim();
}

function n(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: any) {
  return Math.round(n(value) * 100) / 100;
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

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function parseOrderNo(raw: string) {
  const received = String(raw ?? "");
  const cleaned = received.trim().replace(/[^\d]/g, "");
  const num = Number.parseInt(cleaned, 10);

  return {
    received,
    cleaned,
    num: Number.isFinite(num) ? num : null,
  };
}

function uniqStr(arr: string[]) {
  return Array.from(
    new Set(
      arr
        .map((x) => String(x ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function shortId(id: string) {
  const value = String(id || "");
  return value.length > 8 ? value.slice(0, 8) : value;
}

function isUuidLike(x: any) {
  const value = String(x ?? "").trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

/* ------------------------- Product options / variants ------------------------ */

async function loadOptionValuesByIds(sb: any, ids: string[]) {
  const valueMap = new Map<string, ResolvedValue>();
  if (!ids.length) return valueMap;

  const tries: Array<{
    table: string;
    select: string;
    optionKeyCandidates: string[];
    matchKeyCandidates: string[];
  }> = [
    {
      table: "product_option_values",
      select:
        "id,name,display_value,option_id,product_option_id,option_value_id,value_id",
      optionKeyCandidates: ["option_id", "product_option_id"],
      matchKeyCandidates: ["id", "option_value_id", "value_id"],
    },
    {
      table: "product_option_value",
      select:
        "id,name,display_value,option_id,product_option_id,option_value_id,value_id",
      optionKeyCandidates: ["option_id", "product_option_id"],
      matchKeyCandidates: ["id", "option_value_id", "value_id"],
    },
    {
      table: "option_values",
      select:
        "id,name,display_value,option_id,product_option_id,option_value_id,value_id",
      optionKeyCandidates: ["option_id", "product_option_id"],
      matchKeyCandidates: ["id", "option_value_id", "value_id"],
    },
  ];

  let rows: any[] = [];
  let usedOptionKey: string | null = null;
  let usedMatchKey: string | null = null;

  async function tryIn(table: string, select: string, key: string) {
    const r = await sb.from(table).select(select).in(key, ids);
    if (r.error) return null;
    return Array.isArray(r.data) ? r.data : [];
  }

  for (const t of tries) {
    let data = await tryIn(t.table, t.select, "id");

    if (!data || data.length === 0) {
      data = await tryIn(t.table, t.select, "option_value_id");
      if (data && data.length) usedMatchKey = "option_value_id";
    }

    if (!data || data.length === 0) {
      data = await tryIn(t.table, t.select, "value_id");
      if (data && data.length) usedMatchKey = "value_id";
    }

    if (data && data.length) {
      rows = data;
      if (!usedMatchKey) usedMatchKey = "id";

      for (const key of t.optionKeyCandidates) {
        if (rows.some((x: any) => x?.[key])) {
          usedOptionKey = key;
          break;
        }
      }

      break;
    }
  }

  if (!rows.length || !usedMatchKey) return valueMap;

  for (const row of rows) {
    const matchId = row?.[usedMatchKey]
      ? String(row[usedMatchKey])
      : String(row.id);

    const valueLabel = String(row.display_value ?? row.name ?? "").trim();

    const optionId =
      usedOptionKey && row?.[usedOptionKey]
        ? String(row[usedOptionKey])
        : null;

    valueMap.set(matchId, {
      id: matchId,
      valueLabel: valueLabel || `خيار: ${shortId(matchId)}`,
      optionId,
      optionName: null,
    });
  }

  return valueMap;
}

async function loadOptionNames(sb: any, optionIds: string[]) {
  const map = new Map<string, string>();
  if (!optionIds.length) return map;

  const tries = [
    { table: "product_options", select: "id,name" },
    { table: "product_option", select: "id,name" },
    { table: "options", select: "id,name" },
  ];

  for (const table of tries) {
    const r = await sb.from(table.table).select(table.select).in("id", optionIds);
    if (r.error) continue;

    const rows = Array.isArray(r.data) ? r.data : [];

    for (const row of rows) {
      map.set(String(row.id), String(row.name ?? "").trim());
    }

    if (map.size) break;
  }

  return map;
}

async function loadVariantOptionsFallback(sb: any, variantIds: string[]) {
  const out = new Map<string, Array<{ name: string; value: string }>>();
  if (!variantIds.length) return out;

  const tries: Array<{ table: string; select: string }> = [
    {
      table: "product_variants",
      select: "id,title,options,option_values,attributes",
    },
    {
      table: "variants",
      select: "id,title,options,option_values,attributes",
    },
  ];

  let rows: any[] = [];

  for (const table of tries) {
    const r = await sb.from(table.table).select(table.select).in("id", variantIds);
    if (r.error) continue;

    rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length) break;
  }

  for (const variant of rows) {
    const variantId = String(variant.id);
    const parsed: Array<{ name: string; value: string }> = [];

    const arrCandidates = [variant.options, variant.option_values].filter(
      Boolean,
    );

    for (const cand of arrCandidates) {
      if (!Array.isArray(cand)) continue;

      for (const x of cand) {
        const name = String(x?.name ?? x?.option ?? x?.key ?? "").trim();
        const value = String(x?.value ?? x?.label ?? x?.val ?? "").trim();

        if (name && value) parsed.push({ name, value });
      }
    }

    if (!parsed.length && variant.attributes && typeof variant.attributes === "object") {
      for (const [key, val] of Object.entries(variant.attributes)) {
        const name = String(key).trim();
        const value = String(val ?? "").trim();

        if (name && value) parsed.push({ name, value });
      }
    }

    if (!parsed.length && variant.title) {
      const parts = String(variant.title)
        .split("/")
        .map((x: string) => x.trim())
        .filter(Boolean);

      for (const part of parts) {
        parsed.push({ name: "خيار", value: part });
      }
    }

    if (parsed.length) out.set(variantId, parsed);
  }

  return out;
}

function normalizeSelectedOptions(
  value: any,
): Array<{ name: string; value: string }> {
  if (!Array.isArray(value)) return [];

  const out: Array<{ name: string; value: string }> = [];

  for (const row of value) {
    const name = String(row?.name ?? "").trim();
    const val = String(row?.value ?? "").trim();

    if (name && val) {
      out.push({ name, value: val });
    }
  }

  return out;
}

function isMeaningfulSelectedOptions(
  arr: Array<{ name: string; value: string }>,
) {
  if (!arr.length) return false;

  for (const row of arr) {
    const name = String(row.name ?? "").trim();
    const value = String(row.value ?? "").trim();

    if (!name || !value) return false;
    if (value.startsWith("خيار:")) return false;
    if (/^[0-9a-f]{8}$/i.test(value)) return false;

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      return false;
    }
  }

  return true;
}

async function trySaveSelectedOptionsSnapshot(
  sb: any,
  itemId: string,
  selectedOptions: Array<{ name: string; value: string }>,
) {
  try {
    await sb
      .from("order_items")
      .update({ selected_options: selectedOptions })
      .eq("id", itemId);
  } catch {
    // ignore
  }
}

/* ------------------------------- Product images ------------------------------- */

async function loadProductImages(
  sb: any,
  storeId: string,
  productIds: string[],
) {
  const imageMap = new Map<
    string,
    {
      image_url: string | null;
      image_alt: string | null;
    }
  >();

  const ids = uniqStr(productIds);
  if (!ids.length) return imageMap;

  const selects = [
    {
      select:
        "product_id,original_url,thumbnail_url,alt,is_default,sort_order,media_kind",
      urlKeys: ["thumbnail_url", "original_url"],
      defaultKey: "is_default",
    },
    {
      select: "product_id,url,alt,is_primary,sort_order",
      urlKeys: ["url"],
      defaultKey: "is_primary",
    },
    {
      select: "product_id,original_url,thumbnail_url,is_default,sort_order",
      urlKeys: ["thumbnail_url", "original_url"],
      defaultKey: "is_default",
    },
  ];

  let rows: any[] = [];
  let urlKeys: string[] = ["thumbnail_url", "original_url"];
  let defaultKey = "is_default";

  for (const cfg of selects) {
    let q = sb
      .from("product_media")
      .select(cfg.select)
      .eq("store_id", storeId)
      .in("product_id", ids);

    if (cfg.select.includes("media_kind")) {
      q = q.eq("media_kind", "image");
    }

    const r = await q
      .order(cfg.defaultKey, { ascending: false })
      .order("sort_order", { ascending: true });

    if (!r.error && Array.isArray(r.data)) {
      rows = r.data;
      urlKeys = cfg.urlKeys;
      defaultKey = cfg.defaultKey;
      break;
    }
  }

  if (!rows.length) return imageMap;

  for (const media of rows) {
    const productId = media?.product_id ? String(media.product_id) : "";
    if (!productId || imageMap.has(productId)) continue;

    let url = "";

    for (const key of urlKeys) {
      url = String(media?.[key] ?? "").trim();
      if (url) break;
    }

    if (!url) continue;

    imageMap.set(productId, {
      image_url: url,
      image_alt: media?.alt ? String(media.alt) : null,
    });
  }

  void defaultKey;

  return imageMap;
}

/* ------------------------------- Order options ------------------------------- */

function normalizeChoice(choice: any, fallbackCurrency: string) {
  const label = firstText(choice?.label, choice?.name, choice?.value, choice?.title);

  return {
    id: choice?.id ? String(choice.id) : null,
    label,
    price_customer: round2(
      choice?.price_customer ??
        choice?.priceCustomer ??
        choice?.price ??
        choice?.amount ??
        0,
    ),
    priceCustomer: round2(
      choice?.price_customer ??
        choice?.priceCustomer ??
        choice?.price ??
        choice?.amount ??
        0,
    ),
    currency: s(choice?.currency) || fallbackCurrency || null,
  };
}

function collectOrderOptionChoiceIds(row: any) {
  const metadata = safeObject(row?.metadata);
  const snapshot = safeObject(row?.snapshot);

  return uniqStr([
    ...safeArray(row?.selected_choice_ids).map(String),
    ...safeArray(row?.selectedChoiceIds).map(String),
    ...safeArray(row?.choiceIds).map(String),

    ...safeArray(metadata.selected_choice_ids).map(String),
    ...safeArray(metadata.selectedChoiceIds).map(String),
    ...safeArray(metadata.choice_ids).map(String),
    ...safeArray(metadata.choiceIds).map(String),

    ...safeArray(snapshot.selected_choice_ids).map(String),
    ...safeArray(snapshot.selectedChoiceIds).map(String),
    ...safeArray(snapshot.choice_ids).map(String),
    ...safeArray(snapshot.choiceIds).map(String),
  ]);
}

function optionTypeFromRaw(row: any, optionDef?: any | null) {
  const metadata = safeObject(row?.metadata);
  const snapshot = safeObject(row?.snapshot);

  return (
    firstText(
      row?.option_type,
      row?.optionType,
      row?.type,
      row?.field_type,
      metadata.option_type,
      metadata.optionType,
      metadata.type,
      metadata.field_type,
      snapshot.option_type,
      snapshot.optionType,
      snapshot.type,
      snapshot.field_type,
      optionDef?.option_type,
      optionDef?.optionType,
      optionDef?.type,
      optionDef?.field_type,
    ) || "text"
  );
}

function optionNameFromRaw(row: any, optionDef?: any | null) {
  const metadata = safeObject(row?.metadata);
  const snapshot = safeObject(row?.snapshot);

  return (
    firstText(
      row?.option_name,
      row?.optionName,
      row?.label,
      row?.name,
      metadata.option_name,
      metadata.optionName,
      metadata.label,
      metadata.name,
      snapshot.option_name,
      snapshot.optionName,
      snapshot.label,
      snapshot.name,
      optionDef?.label,
      optionDef?.name,
      optionDef?.title,
    ) || "خيار الطلب"
  );
}

function optionValueFromRaw(args: {
  row: any;
  type: string;
  choices: NormalizedOrderOptionChoice[];
}) {
  const row = args.row;
  const type = s(args.type).toLowerCase();

  const metadata = safeObject(row?.metadata);
  const snapshot = safeObject(row?.snapshot);

  if (type === "appointment") {
    const date =
      firstText(
        row?.date,
        row?.date_value,
        row?.appointment_date,
        metadata.date,
        metadata.date_value,
        metadata.appointment_date,
        snapshot.date,
        snapshot.date_value,
        snapshot.appointment_date,
      ) || "";

    const from =
      firstText(
        row?.from,
        row?.time_from,
        row?.start_time,
        metadata.from,
        metadata.time_from,
        metadata.start_time,
        snapshot.from,
        snapshot.time_from,
        snapshot.start_time,
      ) || "";

    const to =
      firstText(
        row?.to,
        row?.time_to,
        row?.end_time,
        metadata.to,
        metadata.time_to,
        metadata.end_time,
        snapshot.to,
        snapshot.time_to,
        snapshot.end_time,
      ) || "";

    if (date && from && to) return `${date} من ${from} إلى ${to}`;
    if (date) return date;
  }

  const direct = firstText(
    row?.value,
    row?.answer,
    row?.answer_text,
    row?.text_value,
    row?.number_value,
    metadata.value,
    metadata.answer,
    metadata.answer_text,
    metadata.text_value,
    metadata.number_value,
    snapshot.value,
    snapshot.answer,
    snapshot.answer_text,
    snapshot.text_value,
    snapshot.number_value,
  );

  if (direct) return direct;

  if (args.choices.length > 0) {
    return args.choices.map((choice) => choice.label).filter(Boolean).join("، ");
  }

  return "";
}

async function loadOrderOptionDefinitions(sb: any, storeId: string, optionIds: string[]) {
  const optionMap = new Map<string, any>();
  const choicesMap = new Map<string, any[]>();

  const ids = uniqStr(optionIds);
  if (!ids.length) return { optionMap, choicesMap };

  const optionsR = await sb
    .from("store_order_options")
    .select("*")
    .eq("store_id", storeId)
    .in("id", ids);

  if (!optionsR.error && Array.isArray(optionsR.data)) {
    for (const option of optionsR.data) {
      const id = s(option?.id);
      if (id) optionMap.set(id, option);
    }
  }

  const choicesR = await sb
    .from("store_order_option_choices")
    .select("*")
    .eq("store_id", storeId)
    .in("option_id", ids)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!choicesR.error && Array.isArray(choicesR.data)) {
    for (const choice of choicesR.data) {
      const optionId = s(choice?.option_id);
      if (!optionId) continue;

      const list = choicesMap.get(optionId) ?? [];
      list.push(choice);
      choicesMap.set(optionId, list);
    }
  }

  return { optionMap, choicesMap };
}

async function loadOrderOptionsForOrder(args: {
  sb: any;
  storeId: string;
  orderId: string;
  fallbackCurrency: string;
}) {
  const selects = [
    [
      "id",
      "store_id",
      "order_id",
      "option_id",
      "option_name",
      "option_type",
      "type",
      "value",
      "answer",
      "answer_text",
      "text_value",
      "number_value",
      "date_value",
      "time_from",
      "time_to",
      "metadata",
      "snapshot",
      "choices_snapshot",
      "selected_choice_ids",
      "price_customer",
      "currency",
      "created_at",
    ].join(","),

    [
      "id",
      "store_id",
      "order_id",
      "option_id",
      "option_name",
      "option_type",
      "value",
      "metadata",
      "snapshot",
      "choices_snapshot",
      "price_customer",
      "currency",
      "created_at",
    ].join(","),

    [
      "id",
      "store_id",
      "order_id",
      "option_id",
      "option_name",
      "option_type",
      "value",
      "metadata",
      "price_customer",
      "currency",
      "created_at",
    ].join(","),

    [
      "id",
      "store_id",
      "order_id",
      "option_id",
      "value",
      "metadata",
      "price_customer",
      "currency",
      "created_at",
    ].join(","),

    [
      "id",
      "store_id",
      "order_id",
      "option_id",
      "value",
      "metadata",
      "created_at",
    ].join(","),

    ["id", "order_id", "option_id", "value", "created_at"].join(","),
  ];

  let rows: any[] = [];
  let lastError: any = null;

  for (const select of selects) {
    const r = await args.sb
      .from("order_option_answers")
      .select(select)
      .eq("store_id", args.storeId)
      .eq("order_id", args.orderId)
      .order("created_at", { ascending: true });

    if (!r.error) {
      rows = Array.isArray(r.data) ? r.data : [];
      lastError = null;
      break;
    }

    lastError = r.error;
  }

  if (lastError) {
    console.error("ORDER_OPTION_ANSWERS_LOOKUP_FAILED", lastError);
  }

  if (!rows.length) return [];

  const optionIds = uniqStr(
    rows.map((row: any) => s(row?.option_id || row?.optionId)),
  );

  const { optionMap, choicesMap } = await loadOrderOptionDefinitions(
    args.sb,
    args.storeId,
    optionIds,
  );

  const normalized = rows
    .map((row: any, index: number): NormalizedOrderOptionLine | null => {
      const metadata = safeObject(row?.metadata);
      const snapshot = safeObject(row?.snapshot);

      const optionId = s(row?.option_id || row?.optionId) || null;
      const optionDef = optionId ? optionMap.get(optionId) : null;

      const name = optionNameFromRaw(row, optionDef);
      const type = optionTypeFromRaw(row, optionDef);
      const rowCurrency = s(row?.currency) || args.fallbackCurrency || "SAR";

      const selectedChoiceIds = collectOrderOptionChoiceIds(row);

      const snapshotChoices =
        safeArray(row?.choices_snapshot).length > 0
          ? safeArray(row?.choices_snapshot)
          : safeArray(snapshot.choices).length > 0
            ? safeArray(snapshot.choices)
            : safeArray(metadata.choices).length > 0
              ? safeArray(metadata.choices)
              : safeArray(metadata.selected_choices).length > 0
                ? safeArray(metadata.selected_choices)
                : safeArray(metadata.selectedChoices);

      let choices = snapshotChoices
        .map((choice: any) => normalizeChoice(choice, rowCurrency))
        .filter((choice: NormalizedOrderOptionChoice) => Boolean(choice.label));

      if (!choices.length && optionId && selectedChoiceIds.length) {
        const allChoices = choicesMap.get(optionId) ?? [];
        const selectedSet = new Set(selectedChoiceIds.map(String));

        choices = allChoices
          .filter((choice: any) => selectedSet.has(String(choice?.id)))
          .map((choice: any) => normalizeChoice(choice, rowCurrency))
          .filter((choice: NormalizedOrderOptionChoice) =>
            Boolean(choice.label),
          );
      }

      const value = optionValueFromRaw({
        row,
        type,
        choices,
      });

      if (!name || (!value && choices.length === 0)) return null;

      const price =
        round2(row?.price_customer ?? row?.priceCustomer) ||
        round2(metadata.price_customer ?? metadata.priceCustomer) ||
        round2(snapshot.price_customer ?? snapshot.priceCustomer) ||
        choices.reduce(
          (sum: number, choice: NormalizedOrderOptionChoice) =>
            sum + round2(choice.price_customer),
          0,
        );

      const id =
        s(row?.id) ||
        s(row?.answer_id) ||
        s(row?.option_answer_id) ||
        `${optionId || name}-${index}`;

      return {
        id,

        option_id: optionId,
        optionId,

        name,
        option_name: name,
        optionName: name,

        type,
        option_type: type,
        optionType: type,

        value: value || null,

        choice_ids: selectedChoiceIds,
        choiceIds: selectedChoiceIds,

        choices,

        metadata,
        snapshot,

        price_customer: round2(price),
        priceCustomer: round2(price),

        currency: rowCurrency,
      };
    })
    .filter(Boolean) as NormalizedOrderOptionLine[];

  return normalized;
}

/* ------------------------------- Extra ------------------------------- */

async function loadCustomer(sb: any, customerId: string) {
  const r = await sb
    .from("customers")
    .select("id,full_name,email,city_id")
    .eq("id", customerId)
    .maybeSingle();

  if (r.error) throw new Error(r.error.message);
  return r.data || null;
}

async function loadAddressWithRefs(sb: any, addressId: string) {
  const addrR = await sb
    .from("customer_addresses")
    .select(
      [
        "id",
        "label",
        "recipient_name",
        "phone_e164",
        "country_id",
        "city_id",
        "district_id",
        "address_line1",
        "address_line2",
        "postal_code",
        "notes",
      ].join(","),
    )
    .eq("id", addressId)
    .maybeSingle();

  if (addrR.error) throw new Error(addrR.error.message);

  const addr = addrR.data;
  if (!addr?.id) return null;

  let countryName: string | null = null;
  let cityName: string | null = null;
  let districtName: string | null = null;

  if (addr.country_id) {
    const cR = await sb
      .from("ref_countries")
      .select("name_ar,name_en")
      .eq("id", String(addr.country_id))
      .maybeSingle();

    if (!cR.error && cR.data) {
      countryName = cR.data.name_ar || cR.data.name_en || null;
    }
  }

  if (addr.city_id) {
    const cR = await sb
      .from("ref_cities")
      .select("name_ar,name_en")
      .eq("id", String(addr.city_id))
      .maybeSingle();

    if (!cR.error && cR.data) {
      cityName = cR.data.name_ar || cR.data.name_en || null;
    }
  }

  if (addr.district_id) {
    const dR = await sb
      .from("ref_districts")
      .select("name_ar,name_en")
      .eq("id", String(addr.district_id))
      .maybeSingle();

    if (!dR.error && dR.data) {
      districtName = dR.data.name_ar || dR.data.name_en || null;
    }
  }

  const addressObj = {
    name: addr.recipient_name ?? null,
    phone: addr.phone_e164 ?? null,
    country: countryName,
    city: cityName,
    district: districtName,
    street: addr.address_line1 ?? null,
    address_line1: addr.address_line1 ?? null,
    address_line2: addr.address_line2 ?? null,
    postal_code: addr.postal_code ?? null,
    notes: addr.notes ?? null,
  };

  return {
    id: String(addr.id),
    label: addr.label ? String(addr.label) : null,
    address: addressObj,
  };
}

function couponCodeFromSnapshot(order: any) {
  const shippingSnapshot = safeObject(order?.shipping_snapshot);
  const checkout = safeObject(shippingSnapshot.checkout);
  const coupon = safeObject(checkout.coupon);

  return firstText(
    coupon.code,
    coupon.coupon_code,
    coupon.couponCode,
    shippingSnapshot.coupon_code,
    shippingSnapshot.couponCode,
  );
}

async function loadCouponForOrderCart(
  sb: any,
  storeId: string,
  cartId: string | null,
  order: any,
) {
  const fromSnapshot = couponCodeFromSnapshot(order);
  if (fromSnapshot) return { coupon_code: fromSnapshot };

  if (!cartId) return { coupon_code: null as string | null };

  const r = await sb
    .from("cart_coupons")
    .select("code,coupon_id,discount_amount")
    .eq("store_id", storeId)
    .eq("cart_id", cartId)
    .maybeSingle();

  if (r.error) return { coupon_code: null as string | null };

  return {
    coupon_code: r.data?.code ? String(r.data.code) : null,
  };
}

function shippingNameFromSnapshot(order: any) {
  const shippingSnapshot = safeObject(order?.shipping_snapshot);

  return firstText(
    shippingSnapshot.store_shipping_carrier_name,
    shippingSnapshot.carrier_name,
    shippingSnapshot.name,
    shippingSnapshot.display_name,
  );
}

async function loadShippingName(
  sb: any,
  storeId: string,
  shippingIdText: string | null,
  order: any,
) {
  const fromSnapshot = shippingNameFromSnapshot(order);
  if (fromSnapshot) return { shipping_name: fromSnapshot };

  const shippingId = String(shippingIdText ?? "").trim();
  if (!shippingId) return { shipping_name: null as string | null };

  if (!isUuidLike(shippingId)) {
    return { shipping_name: shippingId };
  }

  const rateR = await sb
    .from("store_shipping_rates")
    .select("id,store_shipping_carrier_id,eta_text,customer_price")
    .eq("store_id", storeId)
    .eq("id", shippingId)
    .maybeSingle();

  if (!rateR.error && rateR.data?.id) {
    const carrierId = rateR.data.store_shipping_carrier_id
      ? String(rateR.data.store_shipping_carrier_id)
      : null;

    if (carrierId) {
      const scR = await sb
        .from("store_shipping_carriers")
        .select("id,display_name,carrier_id,type")
        .eq("store_id", storeId)
        .eq("id", carrierId)
        .maybeSingle();

      if (!scR.error && scR.data?.id) {
        const display = scR.data.display_name
          ? String(scR.data.display_name)
          : "";

        if (display) return { shipping_name: display };

        if (scR.data.carrier_id) {
          const cR = await sb
            .from("shipping_carriers")
            .select("name,code")
            .eq("id", String(scR.data.carrier_id))
            .maybeSingle();

          if (!cR.error && cR.data?.name) {
            return { shipping_name: String(cR.data.name) };
          }
        }
      }
    }

    return { shipping_name: "شحن" };
  }

  const scR2 = await sb
    .from("store_shipping_carriers")
    .select("id,display_name,carrier_id,type")
    .eq("store_id", storeId)
    .eq("id", shippingId)
    .maybeSingle();

  if (!scR2.error && scR2.data?.id) {
    const display = scR2.data.display_name
      ? String(scR2.data.display_name)
      : "";

    if (display) return { shipping_name: display };

    if (scR2.data.carrier_id) {
      const cR = await sb
        .from("shipping_carriers")
        .select("name,code")
        .eq("id", String(scR2.data.carrier_id))
        .maybeSingle();

      if (!cR.error && cR.data?.name) {
        return { shipping_name: String(cR.data.name) };
      }
    }

    return { shipping_name: "شحن" };
  }

  return { shipping_name: null };
}

/* ---------------------------------- GET ---------------------------------- */

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const p = await ctx.params;
    const orderNoRaw = p?.orderNo ?? "";
    const parsed = parseOrderNo(orderNoRaw);

    if (!parsed.num) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_ORDER_NO",
          debug: {
            received: parsed.received,
            cleaned: parsed.cleaned,
            num: parsed.num,
            hint: "orderNo اللي وصل للـ API مو رقم صافي",
          },
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const storeCtx = await resolveStoreContext();
    const storeId = storeCtx?.store?.id;

    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "STORE_NOT_FOUND" },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const jar = await cookies();
    const token = pickToken(jar);

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const sb = getSb();
    const customerId = await resolveCustomerId(sb, token);

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const orderNoNum = parsed.num;

    const resOrder = await sb
      .from("orders")
      .select(
        [
          "id",
          "store_id",
          "customer_id",
          "order_number",
          "public_no",
          "status",
          "base_status_key",
          "store_status_id",
          "payment_status",
          "payment_method",
          "currency",
          "subtotal",
          "shipping_amount",
          "tax_amount",
          "discount_amount",
          "total_amount",
          "created_at",
          "updated_at",
          "shipping_address",
          "shipping_snapshot",
          "address_id",
          "shipping_id",
          "cart_id",
        ].join(","),
      )
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .or(`public_no.eq.${orderNoNum},order_number.eq.${orderNoNum}`)
      .maybeSingle();

    if (resOrder.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_LOOKUP_FAILED",
          detail: resOrder.error.message,
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const order = resOrder.data;

    if (!order?.id) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const resItems = await sb
      .from("order_items")
      .select(
        [
          "id",
          "order_id",
          "store_id",
          "product_id",
          "variant_id",
          "name",
          "sku",
          "qty",
          "currency",
          "unit_price",
          "total_price",
          "selected_option_value_ids",
          "selected_options",
          "created_at",
        ].join(","),
      )
      .eq("store_id", storeId)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (resItems.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_ITEMS_LOOKUP_FAILED",
          detail: resItems.error.message,
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const itemsRaw = Array.isArray(resItems.data) ? resItems.data : [];

    const productImageMap = await loadProductImages(
      sb,
      String(storeId),
      itemsRaw
        .map((item: any) => (item.product_id ? String(item.product_id) : ""))
        .filter(Boolean),
    );

    const allValueIds = uniqStr(
      itemsRaw.flatMap((item: any) =>
        Array.isArray(item.selected_option_value_ids)
          ? item.selected_option_value_ids.map(String).filter(Boolean)
          : [],
      ),
    );

    const valueMap = await loadOptionValuesByIds(sb, allValueIds);

    const optionIds = uniqStr(
      Array.from(valueMap.values())
        .map((value) => (value.optionId ? String(value.optionId) : ""))
        .filter(Boolean),
    );

    const optionNameMap = await loadOptionNames(sb, optionIds);

    for (const value of valueMap.values()) {
      if (value.optionId) {
        value.optionName = optionNameMap.get(String(value.optionId)) ?? null;
      }
    }

    const variantIds = uniqStr(
      itemsRaw
        .map((item: any) => (item.variant_id ? String(item.variant_id) : ""))
        .filter(Boolean),
    );

    const variantFallback = await loadVariantOptionsFallback(sb, variantIds);

    const items = await Promise.all(
      itemsRaw.map(async (item: any) => {
        const img = item.product_id
          ? productImageMap.get(String(item.product_id)) ?? null
          : null;

        const snap = normalizeSelectedOptions(item.selected_options);

        if (snap.length) {
          return {
            ...item,
            image_url: img?.image_url ?? null,
            image_alt: img?.image_alt ?? item.name ?? null,
            selected_options: snap,
          };
        }

        const ids: string[] = Array.isArray(item.selected_option_value_ids)
          ? (item.selected_option_value_ids as unknown[])
              .map(String)
              .filter(Boolean)
          : [];

        let selected_options: Array<{
          id?: string;
          name: string;
          value: string;
        }> = [];

        if (ids.length) {
          selected_options = ids.map((id: string) => {
            const value = valueMap.get(id);

            if (value) {
              return {
                id,
                name: value.optionName || "خيار",
                value: value.valueLabel,
              };
            }

            return {
              id,
              name: "خيار",
              value: `خيار: ${shortId(id)}`,
            };
          });
        }

        if ((!selected_options || !selected_options.length) && item.variant_id) {
          const fb = variantFallback.get(String(item.variant_id)) ?? [];

          if (fb.length) {
            selected_options = fb.map((x) => ({
              name: String(x.name || "خيار"),
              value: String(x.value || ""),
            }));
          }
        }

        const toSave = selected_options
          .map((x) => ({ name: x.name, value: x.value }))
          .filter((x) => x.name && x.value);

        if (isMeaningfulSelectedOptions(toSave)) {
          await trySaveSelectedOptionsSnapshot(sb, String(item.id), toSave);
        }

        return {
          ...item,
          image_url: img?.image_url ?? null,
          image_alt: img?.image_alt ?? item.name ?? null,
          selected_option_value_ids: ids,
          selected_options,
        };
      }),
    );

    const orderOptions = await loadOrderOptionsForOrder({
      sb,
      storeId: String(storeId),
      orderId: String(order.id),
      fallbackCurrency: String(order.currency ?? "SAR"),
    });

    const orderOptionsFee = round2(
      orderOptions.reduce(
        (sum: number, row: NormalizedOrderOptionLine) =>
          sum + n(row.price_customer),
        0,
      ),
    );

    const [customer, addrPack, couponPack, shipPack] = await Promise.all([
      order.customer_id
        ? loadCustomer(sb, String(order.customer_id))
        : Promise.resolve(null),

      order.address_id
        ? loadAddressWithRefs(sb, String(order.address_id))
        : Promise.resolve(null),

      loadCouponForOrderCart(
        sb,
        String(storeId),
        order.cart_id ? String(order.cart_id) : null,
        order,
      ),

      loadShippingName(
        sb,
        String(storeId),
        order.shipping_id ? String(order.shipping_id) : null,
        order,
      ),
    ]);

    // Financial wallet records live in the orders database/shard.
    // Using the store client here silently returned no row, so the customer
    // order page could not display the wallet-paid and remaining amounts.
    const ordersDb = await getOrdersDb(String(storeId));
    const walletPaymentR = await ordersDb
      .from("order_wallet_payments")
      .select("id,wallet_amount,external_amount,total_amount,currency,status,refunded_wallet_amount,captured_at,refunded_at")
      .eq("store_id", storeId)
      .eq("order_id", order.id)
      .maybeSingle();

    const walletPayment = !walletPaymentR.error ? walletPaymentR.data : null;
    const walletUsedAmount = round2(walletPayment?.wallet_amount);
    const walletRemainingAmount = round2(
      walletPayment?.external_amount ?? Math.max(0, round2(order.total_amount) - walletUsedAmount),
    );
    const walletRefundedAmount = round2(walletPayment?.refunded_wallet_amount);

    const orderWithOptions = {
      ...order,
      wallet_payment: walletPayment,
      walletPayment,
      wallet_used_amount: walletUsedAmount,
      wallet_remaining_amount: walletRemainingAmount,
      wallet_refunded_amount: walletRefundedAmount,

      order_options: orderOptions,
      orderOptions,

      order_options_fee: orderOptionsFee,
      orderOptionsFee: orderOptionsFee,
    };

    const extra = {
      customer: customer
        ? {
            name: customer.full_name ?? null,
            full_name: customer.full_name ?? null,
            email: customer.email ?? null,
          }
        : null,

      coupon_code: couponPack.coupon_code,
      shipping_name: shipPack.shipping_name,
      address_label: addrPack?.label ?? null,
      address: addrPack?.address ?? null,

      order_options: orderOptions,
      orderOptions,

      order_options_fee: orderOptionsFee,
      orderOptionsFee: orderOptionsFee,
    };

    return NextResponse.json(
      {
        ok: true,

        order: orderWithOptions,
        items,
        extra,

        order_options: orderOptions,
        orderOptions,

        order_options_fee: orderOptionsFee,
        orderOptionsFee: orderOptionsFee,

        options_debug: {
          value_ids_count: allValueIds.length,
          resolved_values_count: valueMap.size,
          resolved_option_names_count: optionNameMap.size,
          variant_fallback_count: variantFallback.size,
          snapshot_items_count: items.filter(
            (x: any) =>
              Array.isArray(x.selected_options) && x.selected_options.length,
          ).length,
          product_images_count: productImageMap.size,

          order_options_count: orderOptions.length,
          order_options_fee: orderOptionsFee,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNHANDLED",
        detail: e?.message ?? String(e),
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}