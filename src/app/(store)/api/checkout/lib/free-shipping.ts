// FILE: apps/storefront/src/app/(store)/api/checkout/lib/free-shipping.ts

type Mode = "all" | "include";

type FreeShippingRuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  minimum_subtotal: number | string | null;

  countries_mode: Mode | string | null;
  cities_mode: Mode | string | null;
  products_mode: Mode | string | null;
  categories_mode: Mode | string | null;
  carriers_mode: Mode | string | null;
  customer_groups_mode: Mode | string | null;

  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number | string | null;
};

export type FreeShippingEvaluation = {
  applied: boolean;
  available: boolean;
  ruleId: string | null;
  ruleName: string | null;
  minimumSubtotal: number;
  remaining: number;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function mode(value: unknown): Mode {
  return s(value) === "include" ? "include" : "all";
}

function uniq(values: unknown[]) {
  return Array.from(new Set(values.map((value) => s(value)).filter(Boolean)));
}

function asSet(values?: string[]) {
  return new Set((values ?? []).map(String).filter(Boolean));
}

function emptyEvaluation(): FreeShippingEvaluation {
  return {
    applied: false,
    available: false,
    ruleId: null,
    ruleName: null,
    minimumSubtotal: 0,
    remaining: 0,
  };
}

function isNowInside(rule: FreeShippingRuleRow, nowMs: number) {
  const startsAt = s(rule.starts_at);
  const endsAt = s(rule.ends_at);

  if (startsAt) {
    const startMs = Date.parse(startsAt);
    if (Number.isFinite(startMs) && startMs > nowMs) return false;
  }

  if (endsAt) {
    const endMs = Date.parse(endsAt);
    if (Number.isFinite(endMs) && endMs < nowMs) return false;
  }

  return true;
}

async function loadRuleLinks(args: {
  sb: any;
  storeId: string;
  table: string;
  column: string;
  ruleIds: string[];
}) {
  const map = new Map<string, string[]>();

  if (!args.ruleIds.length) return map;

  const { data, error } = await args.sb
    .from(args.table)
    .select(`rule_id,${args.column}`)
    .eq("store_id", args.storeId)
    .in("rule_id", args.ruleIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const ruleId = s(row?.rule_id);
    const value = s(row?.[args.column]);

    if (!ruleId || !value) continue;

    if (!map.has(ruleId)) map.set(ruleId, []);
    map.get(ruleId)!.push(value);
  }

  return map;
}

function passScopedId(args: {
  mode: unknown;
  selectedIds: string[];
  currentId?: string | null;
}) {
  if (mode(args.mode) !== "include") return true;

  const currentId = s(args.currentId);
  if (!currentId) return false;

  return asSet(args.selectedIds).has(currentId);
}

function passProductScope(args: {
  mode: unknown;
  selectedIds: string[];
  productIds: string[];
}) {
  if (mode(args.mode) !== "include") return true;

  const selected = asSet(args.selectedIds);
  if (!selected.size) return false;
  if (!args.productIds.length) return false;

  /*
    مهم:
    إذا القاعدة على منتجات محددة، يكفي وجود منتج واحد محدد داخل السلة.
    السابق كان يستخدم every، وهذا يعني لازم كل منتجات السلة تكون مختارة،
    وهذا يخلي الشحن المجاني يفشل إذا أضفت منتج ثاني مع المنتج المشمول.
  */
  return args.productIds.some((productId) => selected.has(productId));
}

function passCategoryScope(args: {
  mode: unknown;
  selectedIds: string[];
  productIds: string[];
  categoryIdsByProductId: Map<string, Set<string>>;
}) {
  if (mode(args.mode) !== "include") return true;

  const selected = asSet(args.selectedIds);
  if (!selected.size) return false;
  if (!args.productIds.length) return false;

  /*
    نفس منطق المنتجات:
    إذا القاعدة على تصنيفات محددة، يكفي أن يوجد منتج واحد في السلة
    ينتمي لتصنيف مشمول بالقاعدة.
  */
  return args.productIds.some((productId) => {
    const productCategories = args.categoryIdsByProductId.get(productId);

    if (!productCategories?.size) return false;

    for (const categoryId of productCategories) {
      if (selected.has(categoryId)) return true;
    }

    return false;
  });
}

function passCustomerGroupScope(args: {
  mode: unknown;
  selectedIds: string[];
  customerGroupIds: Set<string>;
}) {
  if (mode(args.mode) !== "include") return true;

  const selected = asSet(args.selectedIds);
  if (!selected.size) return false;
  if (!args.customerGroupIds.size) return false;

  for (const groupId of args.customerGroupIds) {
    if (selected.has(groupId)) return true;
  }

  return false;
}

export async function loadFreeShippingEvaluator(args: {
  sb: any;
  storeId: string;
  subtotal: number;
  countryId?: string | null;
  cityId?: string | null;
  customerId?: string | null;
  productIds?: string[];
  minimumSubtotalToCartCurrency?: (amount: number) => number;
}) {
  const storeId = s(args.storeId);
  const subtotal = round2(Math.max(0, n(args.subtotal)));
  const countryId = s(args.countryId);
  const cityId = s(args.cityId);
  const customerId = s(args.customerId);
  const productIds = uniq(args.productIds ?? []);

  const rulesR = await args.sb
    .from("store_free_shipping_rules")
    .select(
      [
        "id",
        "name",
        "enabled",
        "minimum_subtotal",
        "countries_mode",
        "cities_mode",
        "products_mode",
        "categories_mode",
        "carriers_mode",
        "customer_groups_mode",
        "starts_at",
        "ends_at",
        "priority",
      ].join(","),
    )
    .eq("store_id", storeId)
    .eq("enabled", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (rulesR.error) throw new Error(rulesR.error.message);

  const rules = Array.isArray(rulesR.data)
    ? (rulesR.data as FreeShippingRuleRow[])
    : [];

  const ruleIds = rules.map((rule) => s(rule.id)).filter(Boolean);

  if (!rules.length || !ruleIds.length) {
    return {
      hasRules: false,
      evaluate: (): FreeShippingEvaluation => emptyEvaluation(),
    };
  }

  const [
    countryLinks,
    cityLinks,
    productLinks,
    categoryLinks,
    carrierLinks,
    groupLinks,
  ] = await Promise.all([
    loadRuleLinks({
      sb: args.sb,
      storeId,
      table: "store_free_shipping_rule_countries",
      column: "country_id",
      ruleIds,
    }),
    loadRuleLinks({
      sb: args.sb,
      storeId,
      table: "store_free_shipping_rule_cities",
      column: "city_id",
      ruleIds,
    }),
    loadRuleLinks({
      sb: args.sb,
      storeId,
      table: "store_free_shipping_rule_products",
      column: "product_id",
      ruleIds,
    }),
    loadRuleLinks({
      sb: args.sb,
      storeId,
      table: "store_free_shipping_rule_categories",
      column: "category_id",
      ruleIds,
    }),
    loadRuleLinks({
      sb: args.sb,
      storeId,
      table: "store_free_shipping_rule_carriers",
      column: "store_shipping_carrier_id",
      ruleIds,
    }),
    loadRuleLinks({
      sb: args.sb,
      storeId,
      table: "store_free_shipping_rule_customer_groups",
      column: "customer_group_id",
      ruleIds,
    }),
  ]);

  const categoryIdsByProductId = new Map<string, Set<string>>();

  const needsCategoryCheck = rules.some(
    (rule) => mode(rule.categories_mode) === "include",
  );

  if (needsCategoryCheck && productIds.length) {
    const pcR = await args.sb
      .from("product_categories")
      .select("product_id,category_id")
      .in("product_id", productIds);

    if (pcR.error) throw new Error(pcR.error.message);

    for (const row of pcR.data ?? []) {
      const productId = s(row?.product_id);
      const categoryId = s(row?.category_id);

      if (!productId || !categoryId) continue;

      if (!categoryIdsByProductId.has(productId)) {
        categoryIdsByProductId.set(productId, new Set<string>());
      }

      categoryIdsByProductId.get(productId)!.add(categoryId);
    }
  }

  const customerGroupIds = new Set<string>();

  const needsCustomerGroupCheck = rules.some(
    (rule) => mode(rule.customer_groups_mode) === "include",
  );

  if (needsCustomerGroupCheck && customerId) {
    const gmR = await args.sb
      .from("customer_group_members")
      .select("group_id,store_id")
      .eq("customer_id", customerId);

    if (gmR.error) throw new Error(gmR.error.message);

    for (const row of gmR.data ?? []) {
      const rowStoreId = s(row?.store_id);
      const groupId = s(row?.group_id);

      if (!groupId) continue;
      if (rowStoreId && rowStoreId !== storeId) continue;

      customerGroupIds.add(groupId);
    }
  }

  return {
    hasRules: true,

    evaluate(input?: {
      storeShippingCarrierId?: string | null;
    }): FreeShippingEvaluation {
      const nowMs = Date.now();
      const storeShippingCarrierId = s(input?.storeShippingCarrierId);

      let nearestNotReachedRule: FreeShippingEvaluation | null = null;

      for (const rule of rules) {
        const ruleId = s(rule.id);
        if (!ruleId) continue;
        if (rule.enabled === false) continue;
        if (!isNowInside(rule, nowMs)) continue;

        if (
          !passScopedId({
            mode: rule.countries_mode,
            selectedIds: countryLinks.get(ruleId) ?? [],
            currentId: countryId,
          })
        ) {
          continue;
        }

        if (
          !passScopedId({
            mode: rule.cities_mode,
            selectedIds: cityLinks.get(ruleId) ?? [],
            currentId: cityId,
          })
        ) {
          continue;
        }

        if (
          !passScopedId({
            mode: rule.carriers_mode,
            selectedIds: carrierLinks.get(ruleId) ?? [],
            currentId: storeShippingCarrierId,
          })
        ) {
          continue;
        }

        if (
          !passProductScope({
            mode: rule.products_mode,
            selectedIds: productLinks.get(ruleId) ?? [],
            productIds,
          })
        ) {
          continue;
        }

        if (
          !passCategoryScope({
            mode: rule.categories_mode,
            selectedIds: categoryLinks.get(ruleId) ?? [],
            productIds,
            categoryIdsByProductId,
          })
        ) {
          continue;
        }

        if (
          !passCustomerGroupScope({
            mode: rule.customer_groups_mode,
            selectedIds: groupLinks.get(ruleId) ?? [],
            customerGroupIds,
          })
        ) {
          continue;
        }

        const minRaw = Math.max(0, n(rule.minimum_subtotal));
        const minConverted = round2(
          Math.max(
            0,
            args.minimumSubtotalToCartCurrency
              ? args.minimumSubtotalToCartCurrency(minRaw)
              : minRaw,
          ),
        );

        if (subtotal < minConverted) {
          const remaining = round2(Math.max(0, minConverted - subtotal));

          if (
            !nearestNotReachedRule ||
            remaining < nearestNotReachedRule.remaining
          ) {
            nearestNotReachedRule = {
              applied: false,
              available: true,
              ruleId,
              ruleName: s(rule.name) || "شحن مجاني",
              minimumSubtotal: minConverted,
              remaining,
            };
          }

          continue;
        }

        return {
          applied: true,
          available: true,
          ruleId,
          ruleName: s(rule.name) || "شحن مجاني",
          minimumSubtotal: minConverted,
          remaining: 0,
        };
      }

      return nearestNotReachedRule || emptyEvaluation();
    },
  };
}