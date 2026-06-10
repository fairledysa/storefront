// FILE: apps/storefront/src/app/(store)/api/checkout/lib/special-offers.ts

type AnyRecord = Record<string, any>;

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function round2(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function safeObject(value: unknown): AnyRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as AnyRecord;
      }
    } catch {}
  }

  return {};
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => s(item)).filter(Boolean)));
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const num = n(value);
    if (Number.isFinite(num) && num > 0) return num;
  }

  return 0;
}

function isModeSelected(value: unknown) {
  const mode = s(value).toLowerCase();

  return [
    "selected",
    "include",
    "included",
    "specific",
    "products",
    "categories",
    "brands",
    "tags",
    "selected_products",
    "selected_categories",
    "selected_brands",
    "selected_tags",
  ].includes(mode);
}

function normalizeScopeMode(value: unknown) {
  const mode = s(value).toLowerCase();

  if (!mode) return "";
  if (["target", "targets", "targeted"].includes(mode)) return "targets";
  if (["all", "all_products", "كل المنتجات"].includes(mode)) return "all";

  if (["same", "same_products", "same_product", "نفس المنتجات"].includes(mode)) {
    return "same_products";
  }

  if (["product", "products", "selected_products"].includes(mode)) {
    return "products";
  }

  if (["category", "categories", "selected_categories"].includes(mode)) {
    return "categories";
  }

  if (["brand", "brands", "selected_brands"].includes(mode)) {
    return "brands";
  }

  if (["tag", "tags", "selected_tags"].includes(mode)) return "tags";

  return mode;
}

export type SpecialOfferCartLine = {
  id: string;
  product_id: string;
  variant_id?: string | null;
  qty: number;
  unit_price: number;
};

export type AppliedSpecialOffer = {
  id: string;
  title: string;
  offer_type: string;
  discount: number;
  message: string | null;
};

export type SpecialOfferLineAdjustment = {
  cartItemId: string;
  productId: string;
  discount: number;
  label: string;
  offerId: string;
  offerTitle: string;
  offerType: string;
};

export type CartSpecialOffersResult = {
  discount: number;
  appliedOffers: AppliedSpecialOffer[];
  messages: string[];
  lineAdjustments: SpecialOfferLineAdjustment[];
};

type ProductContext = {
  productId: string;
  brandId: string;
  categoryIds: Set<string>;
  tagIds: Set<string>;
};

type RuntimeOffer = {
  id: string;
  title: string;
  offer_type: string;
  starts_at: string | null;
  ends_at: string | null;
  channels: AnyRecord | any[];
  customer_scope: AnyRecord;
  country_scope: AnyRecord;
  targets: AnyRecord;
  conditions: AnyRecord;
  rewards: AnyRecord;
  apply_with_coupon: boolean;
  stacking_policy: string;
  priority: number;
  message: string | null;
};

async function loadProductContexts(args: {
  sb: any;
  storeId: string;
  productIds: string[];
}): Promise<Map<string, ProductContext>> {
  const map = new Map<string, ProductContext>();

  for (const productId of args.productIds) {
    map.set(productId, {
      productId,
      brandId: "",
      categoryIds: new Set<string>(),
      tagIds: new Set<string>(),
    });
  }

  if (!args.productIds.length) return map;

  const [productsR, categoriesR, tagsR] = await Promise.all([
    args.sb
      .from("products")
      .select("id,brand_id")
      .eq("store_id", args.storeId)
      .in("id", args.productIds),

    args.sb
      .from("product_categories")
      .select("product_id,category_id")
      .in("product_id", args.productIds),

    args.sb
      .from("product_tag_links")
      .select("product_id,tag_id")
      .in("product_id", args.productIds),
  ]);

  if (!productsR.error && Array.isArray(productsR.data)) {
    for (const row of productsR.data) {
      const productId = s(row?.id);
      const ctx = productId ? map.get(productId) : null;
      if (ctx) ctx.brandId = s(row?.brand_id);
    }
  }

  if (!categoriesR.error && Array.isArray(categoriesR.data)) {
    for (const row of categoriesR.data) {
      const productId = s(row?.product_id);
      const categoryId = s(row?.category_id);
      const ctx = productId ? map.get(productId) : null;
      if (ctx && categoryId) ctx.categoryIds.add(categoryId);
    }
  }

  if (!tagsR.error && Array.isArray(tagsR.data)) {
    for (const row of tagsR.data) {
      const productId = s(row?.product_id);
      const tagId = s(row?.tag_id);
      const ctx = productId ? map.get(productId) : null;
      if (ctx && tagId) ctx.tagIds.add(tagId);
    }
  }

  return map;
}

async function loadCustomerGroupIds(args: {
  sb: any;
  storeId: string;
  customerId: string;
}): Promise<Set<string>> {
  if (!args.customerId) return new Set<string>();

  const res = await args.sb
    .from("customer_group_members")
    .select("group_id")
    .eq("store_id", args.storeId)
    .eq("customer_id", args.customerId);

  if (res.error || !Array.isArray(res.data)) return new Set<string>();

  return new Set<string>(
    res.data.map((row: any) => s(row?.group_id)).filter(Boolean),
  );
}

async function loadActiveOffers(args: {
  sb: any;
  storeId: string;
}): Promise<RuntimeOffer[]> {
  const res = await args.sb
    .from("store_special_offers")
    .select(
      "id,title,offer_type,starts_at,ends_at,channels,customer_scope,country_scope,targets,conditions,rewards,apply_with_coupon,stacking_policy,priority,message,status",
    )
    .eq("store_id", args.storeId)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (res.error || !Array.isArray(res.data)) return [];

  return res.data.map((row: any): RuntimeOffer => ({
    id: s(row?.id),
    title: s(row?.title) || "عرض خاص",
    offer_type: s(row?.offer_type),
    starts_at: row?.starts_at ? String(row.starts_at) : null,
    ends_at: row?.ends_at ? String(row.ends_at) : null,
    channels: Array.isArray(row?.channels) ? row.channels : safeObject(row?.channels),
    customer_scope: safeObject(row?.customer_scope),
    country_scope: safeObject(row?.country_scope),
    targets: safeObject(row?.targets),
    conditions: safeObject(row?.conditions),
    rewards: safeObject(row?.rewards),
    apply_with_coupon: row?.apply_with_coupon === true,
    stacking_policy: s(row?.stacking_policy) || "best_only",
    priority: Math.floor(n(row?.priority) || 100),
    message: s(row?.message) || null,
  }));
}

function offerInDateRange(offer: RuntimeOffer, now: number) {
  const starts = offer.starts_at ? Date.parse(offer.starts_at) : null;
  const ends = offer.ends_at ? Date.parse(offer.ends_at) : null;

  if (starts != null && Number.isFinite(starts) && starts > now) return false;
  if (ends != null && Number.isFinite(ends) && ends < now) return false;

  return true;
}

function offerMatchesChannel(offer: RuntimeOffer) {
  const raw = offer.channels;

  if (Array.isArray(raw)) {
    if (!raw.length) return true;

    const channels = raw.map((item) => s(item).toLowerCase()).filter(Boolean);

    return (
      channels.includes("storefront") ||
      channels.includes("web") ||
      channels.includes("all") ||
      channels.includes("both")
    );
  }

  const enabled = safeObject(raw);
  if (!Object.keys(enabled).length) return true;

  return (
    enabled.storefront === true ||
    enabled.web === true ||
    enabled.all === true ||
    enabled.both === true
  );
}

function offerMatchesCountry(args: {
  offer: RuntimeOffer;
  countryId: string;
}) {
  const scope = args.offer.country_scope;
  const mode = s(scope.mode).toLowerCase();

  if (!mode || mode === "all") return true;

  const ids = stringArray(
    scope.countryIds ?? scope.country_ids ?? scope.countries ?? scope.ids,
  );

  if (!ids.length) return false;
  if (!args.countryId) return false;

  return ids.includes(args.countryId);
}

function offerMatchesCustomer(args: {
  offer: RuntimeOffer;
  customerId: string;
  customerGroupIds: Set<string>;
}) {
  const scope = args.offer.customer_scope;
  const mode = s(scope.mode).toLowerCase();

  if (!mode || mode === "all") return true;

  const groupIds = stringArray(
    scope.groupIds ?? scope.group_ids ?? scope.customerGroupIds ?? scope.ids,
  );

  if (!groupIds.length) return false;
  if (!args.customerId) return false;

  return groupIds.some((id) => args.customerGroupIds.has(id));
}

function contextMatchesArrays(args: {
  ctx: ProductContext | undefined;
  productIds?: string[];
  categoryIds?: string[];
  brandIds?: string[];
  tagIds?: string[];
}) {
  const ctx = args.ctx;
  if (!ctx) return false;

  if (args.productIds?.length && args.productIds.includes(ctx.productId)) {
    return true;
  }

  if (args.categoryIds?.length) {
    for (const categoryId of args.categoryIds) {
      if (ctx.categoryIds.has(categoryId)) return true;
    }
  }

  if (args.brandIds?.length && ctx.brandId && args.brandIds.includes(ctx.brandId)) {
    return true;
  }

  if (args.tagIds?.length) {
    for (const tagId of args.tagIds) {
      if (ctx.tagIds.has(tagId)) return true;
    }
  }

  return false;
}

function targetArrays(targets: AnyRecord) {
  return {
    productIds: stringArray(targets.productIds ?? targets.product_ids ?? targets.products),
    categoryIds: stringArray(
      targets.categoryIds ?? targets.category_ids ?? targets.categories,
    ),
    brandIds: stringArray(targets.brandIds ?? targets.brand_ids ?? targets.brands),
    tagIds: stringArray(targets.tagIds ?? targets.tag_ids ?? targets.tags),
  };
}

function lineMatchesTargets(args: {
  line: SpecialOfferCartLine;
  offer: RuntimeOffer;
  contexts: Map<string, ProductContext>;
}) {
  const targets = args.offer.targets;
  const arrays = targetArrays(targets);

  const hasExplicitTargets =
    arrays.productIds.length > 0 ||
    arrays.categoryIds.length > 0 ||
    arrays.brandIds.length > 0 ||
    arrays.tagIds.length > 0;

  const hasSelectedMode =
    isModeSelected(targets.productsMode ?? targets.products_mode) ||
    isModeSelected(targets.categoriesMode ?? targets.categories_mode) ||
    isModeSelected(targets.brandsMode ?? targets.brands_mode) ||
    isModeSelected(targets.tagsMode ?? targets.tags_mode);

  if (!hasExplicitTargets && !hasSelectedMode) return true;
  if (!hasExplicitTargets && hasSelectedMode) return false;

  return contextMatchesArrays({
    ctx: args.contexts.get(args.line.product_id),
    ...arrays,
  });
}

function readScopeArrays(scope: AnyRecord, prefix = "") {
  const p = prefix ? `${prefix}` : "";

  return {
    productIds: stringArray(
      scope[`${p}ProductIds`] ?? scope[`${p}productIds`] ?? scope.productIds,
    ),
    categoryIds: stringArray(
      scope[`${p}CategoryIds`] ?? scope[`${p}categoryIds`] ?? scope.categoryIds,
    ),
    brandIds: stringArray(
      scope[`${p}BrandIds`] ?? scope[`${p}brandIds`] ?? scope.brandIds,
    ),
    tagIds: stringArray(scope[`${p}TagIds`] ?? scope[`${p}tagIds`] ?? scope.tagIds),
  };
}

function lineMatchesScope(args: {
  line: SpecialOfferCartLine;
  offer: RuntimeOffer;
  contexts: Map<string, ProductContext>;
  scope: AnyRecord;
  mode: string;
  prefix?: "buy" | "get" | "";
  fallbackTargets?: boolean;
}) {
  const mode = normalizeScopeMode(args.mode);

  if (!mode || mode === "targets") {
    return args.fallbackTargets === false
      ? true
      : lineMatchesTargets({
          line: args.line,
          offer: args.offer,
          contexts: args.contexts,
        });
  }

  if (mode === "all") return true;

  const arrays = readScopeArrays(args.scope, args.prefix || "");
  const hasArrays =
    arrays.productIds.length ||
    arrays.categoryIds.length ||
    arrays.brandIds.length ||
    arrays.tagIds.length;

  if (!hasArrays) {
    return lineMatchesTargets({
      line: args.line,
      offer: args.offer,
      contexts: args.contexts,
    });
  }

  const ctx = args.contexts.get(args.line.product_id);

  if (mode === "products") {
    return Boolean(ctx && arrays.productIds.includes(ctx.productId));
  }

  if (mode === "categories") {
    if (!ctx) return false;
    return arrays.categoryIds.some((id) => ctx.categoryIds.has(id));
  }

  if (mode === "brands") {
    return Boolean(ctx?.brandId && arrays.brandIds.includes(ctx.brandId));
  }

  if (mode === "tags") {
    if (!ctx) return false;
    return arrays.tagIds.some((id) => ctx.tagIds.has(id));
  }

  return contextMatchesArrays({ ctx, ...arrays });
}

function flattenUnitPrices(lines: SpecialOfferCartLine[]) {
  const prices: number[] = [];

  for (const line of lines) {
    const qty = Math.max(0, Math.floor(n(line.qty)));
    const price = Math.max(0, n(line.unit_price));

    for (let i = 0; i < qty; i += 1) {
      prices.push(price);
    }
  }

  return prices.sort((a, b) => a - b);
}

function flattenRewardUnits(lines: SpecialOfferCartLine[]) {
  const units: Array<{
    cartItemId: string;
    productId: string;
    price: number;
  }> = [];

  for (const line of lines) {
    const qty = Math.max(0, Math.floor(n(line.qty)));
    const price = Math.max(0, n(line.unit_price));

    for (let i = 0; i < qty; i += 1) {
      units.push({
        cartItemId: line.id,
        productId: line.product_id,
        price,
      });
    }
  }

  return units.sort((a, b) => a.price - b.price);
}

function buildBuyXGetYResult(args: {
  offer: RuntimeOffer;
  units: Array<{ cartItemId: string; productId: string; price: number }>;
  discountForUnit: (price: number) => number;
}) {
  const byLine = new Map<string, SpecialOfferLineAdjustment>();
  let discount = 0;

  for (const unit of args.units) {
    const unitPrice = Math.max(0, n(unit.price));
    const unitDiscount = round2(Math.max(0, Math.min(unitPrice, args.discountForUnit(unitPrice))));

    if (unitDiscount <= 0) continue;

    discount += unitDiscount;

    const existing = byLine.get(unit.cartItemId);
    const nextDiscount = existing
      ? Math.min(existing.discount + unitDiscount, unitPrice * args.units.filter((x) => x.cartItemId === unit.cartItemId).length)
      : unitDiscount;

    byLine.set(unit.cartItemId, {
      cartItemId: unit.cartItemId,
      productId: unit.productId,
      discount: round2(nextDiscount),
      label: "هدية العرض",
      offerId: args.offer.id,
      offerTitle: args.offer.title,
      offerType: args.offer.offer_type,
    });
  }

  return {
    discount: round2(discount),
    lineAdjustments: Array.from(byLine.values()).filter((item) => item.discount > 0),
  };
}

function computeBuyXGetY(args: {
  offer: RuntimeOffer;
  items: SpecialOfferCartLine[];
  contexts: Map<string, ProductContext>;
}): { discount: number; lineAdjustments: SpecialOfferLineAdjustment[] } {
  const { offer } = args;
  const conditions = offer.conditions;
  const rewards = offer.rewards;

  const buyQuantity = Math.max(
    1,
    Math.floor(firstNumber(conditions.buyQuantity, conditions.buy_qty, conditions.x, 1)),
  );

  const getQuantity = Math.max(
    1,
    Math.floor(firstNumber(rewards.getQuantity, rewards.get_qty, rewards.y, 1)),
  );

  const buyMode = firstString(
    conditions.buyScope,
    conditions.buyFrom,
    conditions.scope,
    "targets",
  );

  const getMode = normalizeScopeMode(
    firstString(rewards.getScope, rewards.getFrom, rewards.scope, "same_products"),
  );

  const buyLines = args.items.filter((line) =>
    lineMatchesScope({
      line,
      offer,
      contexts: args.contexts,
      scope: conditions,
      mode: buyMode,
      prefix: "buy",
    }),
  );

  let rewardLines =
    getMode === "same_products"
      ? buyLines
      : args.items.filter((line) =>
          lineMatchesScope({
            line,
            offer,
            contexts: args.contexts,
            scope: rewards,
            mode: getMode || "targets",
            prefix: "get",
          }),
        );

  if (!rewardLines.length && getMode !== "same_products") {
    rewardLines = buyLines;
  }

  const buyCount = buyLines.reduce(
    (sum, line) => sum + Math.max(0, Math.floor(n(line.qty))),
    0,
  );

  const rewardCount = rewardLines.reduce(
    (sum, line) => sum + Math.max(0, Math.floor(n(line.qty))),
    0,
  );

  if (buyCount <= 0 || rewardCount <= 0) return { discount: 0, lineAdjustments: [] };

  const samePool =
    getMode === "same_products" ||
    rewardLines.every((line) => buyLines.some((buyLine) => buyLine.id === line.id));

  const groups = samePool
    ? Math.floor(buyCount / (buyQuantity + getQuantity))
    : Math.floor(buyCount / buyQuantity);

  if (groups <= 0) return { discount: 0, lineAdjustments: [] };

  const discountedUnits = Math.min(rewardCount, groups * getQuantity);
  if (discountedUnits <= 0) return { discount: 0, lineAdjustments: [] };

  const cheapest = flattenUnitPrices(rewardLines).slice(0, discountedUnits);
  const cheapestUnits = flattenRewardUnits(rewardLines).slice(0, discountedUnits);
  if (!cheapest.length || !cheapestUnits.length) return { discount: 0, lineAdjustments: [] };

  const rewardType = s(rewards.rewardType ?? rewards.type ?? "free").toLowerCase();
  const discountType = s(rewards.discountType ?? rewards.discount_type).toLowerCase();

  if (
    rewardType === "free" ||
    rewardType === "free_product" ||
    rewardType === "free_item" ||
    discountType === "free"
  ) {
    return buildBuyXGetYResult({
      offer,
      units: cheapestUnits,
      discountForUnit: (price) => price,
    });
  }

  if (discountType === "percentage" || discountType === "p") {
    const pct = Math.max(
      0,
      Math.min(100, firstNumber(rewards.discountValue, rewards.value, 100)),
    );

    return buildBuyXGetYResult({
      offer,
      units: cheapestUnits,
      discountForUnit: (price) => price * (pct / 100),
    });
  }

  if (discountType === "fixed_amount" || discountType === "fixed" || discountType === "f") {
    const perUnit = Math.max(0, firstNumber(rewards.discountValue, rewards.value, 0));

    return buildBuyXGetYResult({
      offer,
      units: cheapestUnits,
      discountForUnit: (price) => Math.min(price, perUnit),
    });
  }

  return { discount: 0, lineAdjustments: [] };
}

function eligibleTargetLines(args: {
  offer: RuntimeOffer;
  items: SpecialOfferCartLine[];
  contexts: Map<string, ProductContext>;
}) {
  return args.items.filter((line) =>
    lineMatchesTargets({ line, offer: args.offer, contexts: args.contexts }),
  );
}

function eligibleSubtotal(lines: SpecialOfferCartLine[]) {
  return round2(
    lines.reduce(
      (sum, line) =>
        sum +
        Math.max(0, n(line.unit_price)) * Math.max(0, Math.floor(n(line.qty))),
      0,
    ),
  );
}

function eligibleQuantity(lines: SpecialOfferCartLine[]) {
  return lines.reduce((sum, line) => sum + Math.max(0, Math.floor(n(line.qty))), 0);
}

function computeSimpleDiscount(args: {
  offer: RuntimeOffer;
  lines: SpecialOfferCartLine[];
  subtotal: number;
  convertStoreAmountToCartCurrency: (amount: number) => number;
}) {
  const { offer } = args;
  const conditions = offer.conditions;
  const rewards = offer.rewards;
  const subtotal = eligibleSubtotal(args.lines);
  const qty = eligibleQuantity(args.lines);

  if (subtotal <= 0 || qty <= 0) return 0;

  const minimumSubtotalRaw = firstNumber(
    conditions.minimumSubtotal,
    conditions.minimum_subtotal,
    conditions.minSubtotal,
    0,
  );

  const minimumSubtotal =
    minimumSubtotalRaw > 0 ? args.convertStoreAmountToCartCurrency(minimumSubtotalRaw) : 0;

  const minimumQuantity = Math.max(
    0,
    Math.floor(firstNumber(conditions.minimumQuantity, conditions.minQuantity, 0)),
  );

  if (minimumSubtotal > 0 && args.subtotal < minimumSubtotal) return 0;
  if (minimumQuantity > 0 && qty < minimumQuantity) return 0;

  if (offer.offer_type === "percentage") {
    const pct = Math.max(
      0,
      Math.min(100, firstNumber(rewards.discountValue, rewards.value, rewards.percent, 0)),
    );

    let discount = subtotal * (pct / 100);

    const maximumRaw = firstNumber(rewards.maximumAmount, rewards.maxAmount, 0);
    const maximum =
      maximumRaw > 0 ? args.convertStoreAmountToCartCurrency(maximumRaw) : 0;

    if (maximum > 0) discount = Math.min(discount, maximum);

    return round2(Math.min(subtotal, discount));
  }

  if (offer.offer_type === "fixed_amount") {
    const amountRaw = firstNumber(rewards.discountValue, rewards.value, rewards.amount, 0);
    const amount =
      amountRaw > 0 ? args.convertStoreAmountToCartCurrency(amountRaw) : 0;

    return round2(Math.min(subtotal, amount));
  }

  if (offer.offer_type === "fixed_price") {
    const fixedRaw = firstNumber(rewards.fixedPrice, rewards.price, rewards.value, 0);
    const fixedPrice =
      fixedRaw > 0 ? args.convertStoreAmountToCartCurrency(fixedRaw) : 0;

    if (fixedPrice <= 0) return 0;

    let discount = 0;

    for (const line of args.lines) {
      const unit = Math.max(0, n(line.unit_price));
      const lineQty = Math.max(0, Math.floor(n(line.qty)));

      if (unit > fixedPrice) {
        discount += (unit - fixedPrice) * lineQty;
      }
    }

    return round2(Math.min(subtotal, discount));
  }

  if (offer.offer_type === "discount_table") {
    const tiers = Array.isArray(conditions.tiers) ? conditions.tiers : [];

    const sorted = tiers
      .map((tier: any) => ({
        minQuantity: Math.max(0, Math.floor(n(tier?.minQuantity ?? tier?.min_quantity))),
        discountType: s(tier?.discountType ?? tier?.discount_type ?? "percentage").toLowerCase(),
        discountValue: Math.max(0, n(tier?.discountValue ?? tier?.discount_value ?? tier?.value)),
      }))
      .filter((tier) => tier.minQuantity > 0 && tier.discountValue > 0)
      .sort((a, b) => b.minQuantity - a.minQuantity);

    const tier = sorted.find((item) => qty >= item.minQuantity);
    if (!tier) return 0;

    if (
      tier.discountType === "fixed_amount" ||
      tier.discountType === "fixed" ||
      tier.discountType === "f"
    ) {
      return round2(
        Math.min(subtotal, args.convertStoreAmountToCartCurrency(tier.discountValue)),
      );
    }

    const pct = Math.max(0, Math.min(100, tier.discountValue));
    return round2(Math.min(subtotal, subtotal * (pct / 100)));
  }

  if (offer.offer_type === "category_offer") {
    const pct = Math.max(
      0,
      Math.min(100, firstNumber(rewards.discountValue, rewards.value, rewards.percent, 0)),
    );

    return round2(Math.min(subtotal, subtotal * (pct / 100)));
  }

  return 0;
}

export async function calculateCartSpecialOffers(args: {
  sb: any;
  storeId: string;
  items: SpecialOfferCartLine[];
  subtotal: number;
  couponApplied?: boolean;
  countryId?: string | null;
  customerId?: string | null;
  convertStoreAmountToCartCurrency?: (amount: number) => number;
}): Promise<CartSpecialOffersResult> {
  const items = Array.isArray(args.items)
    ? args.items
        .map((item) => ({
          id: s(item.id),
          product_id: s(item.product_id),
          variant_id: item.variant_id ? s(item.variant_id) : null,
          qty: Math.max(0, Math.floor(n(item.qty))),
          unit_price: Math.max(0, n(item.unit_price)),
        }))
        .filter((item) => item.id && item.product_id && item.qty > 0 && item.unit_price > 0)
    : [];

  if (!items.length || args.subtotal <= 0) {
    return { discount: 0, appliedOffers: [], messages: [], lineAdjustments: [] };
  }

  const productIds = Array.from(new Set(items.map((item) => item.product_id)));

  const [offers, contexts, customerGroupIds] = await Promise.all([
    loadActiveOffers({ sb: args.sb, storeId: args.storeId }),
    loadProductContexts({ sb: args.sb, storeId: args.storeId, productIds }),
    loadCustomerGroupIds({
      sb: args.sb,
      storeId: args.storeId,
      customerId: s(args.customerId),
    }),
  ]);

  if (!offers.length) return { discount: 0, appliedOffers: [], messages: [], lineAdjustments: [] };

  const now = Date.now();
  const convert = args.convertStoreAmountToCartCurrency || ((amount: number) => amount);

  const candidates: Array<
    AppliedSpecialOffer & { lineAdjustments: SpecialOfferLineAdjustment[] }
  > = [];

  for (const offer of offers) {
    if (!offer.id || !offer.offer_type) continue;
    if (!offerInDateRange(offer, now)) continue;
    if (!offerMatchesChannel(offer)) continue;
    if (args.couponApplied && !offer.apply_with_coupon) continue;

    if (!offerMatchesCountry({ offer, countryId: s(args.countryId) })) {
      continue;
    }

    if (
      !offerMatchesCustomer({
        offer,
        customerId: s(args.customerId),
        customerGroupIds,
      })
    ) {
      continue;
    }

    const targetLines = eligibleTargetLines({ offer, items, contexts });
    if (!targetLines.length) continue;

    let discount = 0;
    let lineAdjustments: SpecialOfferLineAdjustment[] = [];

    if (offer.offer_type === "buy_x_get_y") {
      const result = computeBuyXGetY({ offer, items, contexts });
      discount = result.discount;
      lineAdjustments = result.lineAdjustments;
    } else {
      discount = computeSimpleDiscount({
        offer,
        lines: targetLines,
        subtotal: args.subtotal,
        convertStoreAmountToCartCurrency: convert,
      });
    }

    discount = round2(Math.max(0, Math.min(discount, args.subtotal)));
    if (discount <= 0) continue;

    candidates.push({
      id: offer.id,
      title: offer.title,
      offer_type: offer.offer_type,
      discount,
      message: offer.message,
      lineAdjustments,
    });
  }

  if (!candidates.length) {
    return { discount: 0, appliedOffers: [], messages: [], lineAdjustments: [] };
  }

  const offerById = new Map<string, RuntimeOffer>();
  for (const offer of offers) {
    offerById.set(offer.id, offer);
  }

  const allowStack = candidates.some((offer) => {
    const source = offerById.get(offer.id);
    return source?.stacking_policy === "allow_stack";
  });

  let applied: Array<
    AppliedSpecialOffer & { lineAdjustments: SpecialOfferLineAdjustment[] }
  >;

  if (allowStack) {
    applied = candidates;
  } else {
    applied = [
      [...candidates].sort((a, b) => {
        if (b.discount !== a.discount) return b.discount - a.discount;

        const aSource = offerById.get(a.id);
        const bSource = offerById.get(b.id);

        return (aSource?.priority ?? 100) - (bSource?.priority ?? 100);
      })[0],
    ];
  }

  const total = round2(
    Math.min(
      args.subtotal,
      applied.reduce((sum, offer) => sum + Math.max(0, n(offer.discount)), 0),
    ),
  );

  return {
    discount: total,
    appliedOffers: applied.map(({ lineAdjustments, ...offer }) => offer),
    messages: applied
      .map((offer) => offer.message || offer.title)
      .map((text) => s(text))
      .filter(Boolean),
    lineAdjustments: applied.flatMap((offer) => offer.lineAdjustments),
  };
}
