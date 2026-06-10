type AnyRecord = Record<string, any>;

export type AppliedCartOffer = {
  id: string;
  title: string;
  offerType: string;
  discount: number;
  message: string;
  metric: "subtotal" | "item_count";
  minimum: number;
  rewardType: string;
};

export type CartOfferProgressTier = {
  min: number;
  label: string;
  type: string;
  value: number;
  maxDiscount?: number | null;
  reached: boolean;
};

export type CartOfferProgress = {
  offerId: string;
  title: string;
  message: string;
  metric: "subtotal" | "item_count";
  currentValue: number;
  progressPercent: number;
  nextTierMin: number | null;
  remainingToNextTier: number;
  activeTierMin: number | null;
  activeTierLabel: string | null;
  tiers: CartOfferProgressTier[];
  blockedByCoupon?: boolean;
};

export type CartOffersResult = {
  discount: number;
  messages: string[];
  appliedOffers: AppliedCartOffer[];
  progress?: CartOfferProgress | null;
};

type RuntimeCartOffer = {
  id: string;
  title: string;
  offerType: string;
  startsAt: string | null;
  endsAt: string | null;
  channels: unknown;
  conditions: AnyRecord;
  rewards: AnyRecord;
  applyWithCoupon: boolean;
  stackingPolicy: "best_only" | "allow_stack" | "priority_first";
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  priority: number;
  createdAt: string;
  message: string;
};

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

function safeArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "active", "enabled"].includes(text)) {
      return true;
    }
    if (["false", "0", "no", "off", "inactive", "disabled"].includes(text)) {
      return false;
    }
  }

  return fallback;
}

function positiveLimit(value: unknown) {
  if (value == null || value === "") return null;
  const num = Math.floor(n(value));
  return num > 0 ? num : null;
}

function normalizeStackingPolicy(
  value: unknown,
): RuntimeCartOffer["stackingPolicy"] {
  const policy = s(value).toLowerCase();
  if (policy === "allow_stack") return "allow_stack";
  if (policy === "priority_first") return "priority_first";
  return "best_only";
}

function metadataModuleIsCartOffers(metadata: unknown) {
  const meta = safeObject(metadata);
  return s(meta.module).toLowerCase() === "cart_offers";
}

function offerInDateRange(offer: RuntimeCartOffer, now: number) {
  const starts = offer.startsAt ? Date.parse(offer.startsAt) : null;
  const ends = offer.endsAt ? Date.parse(offer.endsAt) : null;

  if (starts != null && Number.isFinite(starts) && starts > now) return false;
  if (ends != null && Number.isFinite(ends) && ends < now) return false;

  return true;
}

function channelList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => s(item).toLowerCase()).filter(Boolean);
  }

  const obj = safeObject(value);
  if (!Object.keys(obj).length) return [];

  return Object.entries(obj)
    .filter(([, enabled]) => bool(enabled, false))
    .map(([key]) => s(key).toLowerCase())
    .filter(Boolean);
}

function offerMatchesChannel(offer: RuntimeCartOffer) {
  const channels = channelList(offer.channels);
  if (!channels.length) return true;

  return (
    channels.includes("storefront") ||
    channels.includes("web") ||
    channels.includes("all") ||
    channels.includes("both")
  );
}

async function countRedemptions(args: {
  sb: any;
  storeId: string;
  offerId: string;
  customerId: string;
}) {
  const totalR = await args.sb
    .from("store_special_offer_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", args.storeId)
    .eq("offer_id", args.offerId);

  const total = totalR.error ? 0 : Math.max(0, n(totalR.count));

  if (!args.customerId) return { total, perCustomer: 0 };

  const customerR = await args.sb
    .from("store_special_offer_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", args.storeId)
    .eq("offer_id", args.offerId)
    .eq("customer_id", args.customerId);

  return {
    total,
    perCustomer: customerR.error ? 0 : Math.max(0, n(customerR.count)),
  };
}

async function loadCartOffers(args: {
  sb: any;
  storeId: string;
}): Promise<RuntimeCartOffer[]> {
  const res = await args.sb
    .from("store_special_offers")
    .select(
      "id,title,offer_type,starts_at,ends_at,channels,conditions,rewards,apply_with_coupon,stacking_policy,usage_limit,usage_limit_per_customer,metadata,priority,message,created_at,status",
    )
    .eq("store_id", args.storeId)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (res.error || !Array.isArray(res.data)) return [];

  return res.data
    .filter((row: any) => metadataModuleIsCartOffers(row?.metadata))
    .map((row: any): RuntimeCartOffer => ({
      id: s(row?.id),
      title: s(row?.title) || "عرض سلة",
      offerType: s(row?.offer_type),
      startsAt: row?.starts_at ? String(row.starts_at) : null,
      endsAt: row?.ends_at ? String(row.ends_at) : null,
      channels: row?.channels,
      conditions: safeObject(row?.conditions),
      rewards: safeObject(row?.rewards),
      applyWithCoupon: bool(row?.apply_with_coupon, false),
      stackingPolicy: normalizeStackingPolicy(row?.stacking_policy),
      usageLimit: positiveLimit(row?.usage_limit),
      usageLimitPerCustomer: positiveLimit(row?.usage_limit_per_customer),
      priority: Math.floor(n(row?.priority) || 100),
      createdAt: s(row?.created_at),
      message: s(row?.message),
    }))
    .filter((offer: RuntimeCartOffer) => offer.id);
}

function readCartCondition(conditions: AnyRecord) {
  const cart = safeObject(conditions.cart);
  const metricRaw = s(cart.metric ?? conditions.metric).toLowerCase();
  const metric: "subtotal" | "item_count" =
    metricRaw === "item_count" ? "item_count" : "subtotal";

  const minimum = Math.max(
    0,
    n(
      cart.minimum ??
        cart.min ??
        conditions.minimum ??
        conditions.min ??
        conditions.minimumSubtotal ??
        conditions.minimum_subtotal,
    ),
  );

  return { metric, minimum };
}

function rewardType(value: unknown) {
  return s(value).toLowerCase();
}

function computeRewardDiscount(args: {
  reward: AnyRecord;
  eligibleAmount: number;
}) {
  const type = rewardType(args.reward.type ?? args.reward.rewardType);
  const value = Math.max(0, n(args.reward.value ?? args.reward.amount));
  const maxDiscountRaw = args.reward.maxDiscount ?? args.reward.max_discount;
  const maxDiscount = maxDiscountRaw == null ? null : Math.max(0, n(maxDiscountRaw));

  if (type === "percentage" || type === "percent" || type === "p") {
    let discount = args.eligibleAmount * (Math.min(100, value) / 100);
    if (maxDiscount != null && maxDiscount > 0) {
      discount = Math.min(discount, maxDiscount);
    }
    return {
      discount: round2(Math.min(args.eligibleAmount, discount)),
      rewardType: "percentage",
    };
  }

  if (type === "fixed_amount" || type === "fixed" || type === "f") {
    return {
      discount: round2(Math.min(args.eligibleAmount, value)),
      rewardType: "fixed_amount",
    };
  }

  if (type === "free_product") {
    const productId = s(args.reward.productId ?? args.reward.product_id);
    if (!productId) return { discount: 0, rewardType: "free_product" };
  }

  return { discount: 0, rewardType: type || "" };
}

function chooseDiscountTableTier(args: {
  tiers: any[];
  metricValue: number;
  eligibleAmount: number;
}) {
  const tiers = safeArray(args.tiers)
    .map((tier: any) => ({
      min: Math.max(0, n(tier?.min ?? tier?.minimum)),
      type: tier?.type ?? tier?.rewardType,
      value: tier?.value ?? tier?.amount,
      maxDiscount: tier?.maxDiscount ?? tier?.max_discount,
    }))
    .filter((tier) => tier.min > 0)
    .sort((a, b) => b.min - a.min);

  const tier = tiers.find((item) => args.metricValue >= item.min);
  if (!tier) return { discount: 0, minimum: 0, rewardType: "discount_table" };

  const reward = computeRewardDiscount({
    reward: {
      type: tier.type,
      value: tier.value,
      maxDiscount: tier.maxDiscount,
    },
    eligibleAmount: args.eligibleAmount,
  });

  return {
    discount: reward.discount,
    minimum: tier.min,
    rewardType: reward.rewardType,
  };
}

function normalizeProgressTiers(offer: RuntimeCartOffer) {
  const tiers = safeArray(offer.rewards.tiers)
    .map((tier: any) => {
      const type = rewardType(tier?.type ?? tier?.rewardType);
      const value = Math.max(0, n(tier?.value ?? tier?.amount));
      const min = Math.max(0, n(tier?.min ?? tier?.minimum));
      const maxDiscountRaw = tier?.maxDiscount ?? tier?.max_discount;
      const maxDiscount =
        maxDiscountRaw == null ? null : Math.max(0, n(maxDiscountRaw));

      if (!(min > 0) || !(value > 0)) return null;

      return {
        min,
        type: type || "percentage",
        value,
        maxDiscount,
      };
    })
    .filter(Boolean) as Array<{
    min: number;
    type: string;
    value: number;
    maxDiscount: number | null;
  }>;

  return tiers.sort((a, b) => a.min - b.min);
}

function isDiscountTableOffer(offer: RuntimeCartOffer) {
  const type = rewardType(offer.rewards.type ?? offer.rewards.rewardType);
  return type === "discount_table" || offer.offerType === "discount_table";
}

function progressTierLabel(tier: {
  type: string;
  value: number;
  maxDiscount: number | null;
}) {
  const type = rewardType(tier.type);

  if (type === "fixed_amount" || type === "fixed" || type === "f") {
    return `${round2(tier.value)} ر.س`;
  }

  if (type === "percentage" || type === "percent" || type === "p") {
    return `${round2(tier.value)}%`;
  }

  return String(round2(tier.value));
}

function buildCartOfferProgress(args: {
  offer: RuntimeCartOffer;
  subtotal: number;
  itemCount: number;
  couponApplied?: boolean;
}): CartOfferProgress | null {
  if (!isDiscountTableOffer(args.offer)) return null;

  const tiersRaw = normalizeProgressTiers(args.offer);
  if (!tiersRaw.length) return null;

  const condition = readCartCondition(args.offer.conditions);
  const currentValue = round2(
    Math.max(
      0,
      condition.metric === "item_count" ? args.itemCount : args.subtotal,
    ),
  );

  const highestTier = tiersRaw[tiersRaw.length - 1];
  const max = Math.max(1, highestTier.min);
  const progressPercent = round2(Math.max(0, Math.min(100, (currentValue / max) * 100)));

  const nextTier = tiersRaw.find((tier) => currentValue < tier.min) ?? null;
  const activeTier =
    [...tiersRaw].reverse().find((tier) => currentValue >= tier.min) ?? null;
  const blockedByCoupon = Boolean(args.couponApplied && !args.offer.applyWithCoupon);
  const nextLabel = nextTier ? progressTierLabel(nextTier) : "";
  const remainingToNextTier = nextTier
    ? round2(Math.max(0, nextTier.min - currentValue))
    : 0;

  const message = blockedByCoupon
    ? "هذا العرض لا يجتمع مع الكوبون الحالي"
    : nextTier
      ? condition.metric === "item_count"
        ? `أضف ${remainingToNextTier} منتجات للحصول على خصم ${nextLabel}`
        : `أضف ${remainingToNextTier} ر.س للحصول على خصم ${nextLabel}`
      : "تم الوصول لأعلى خصم في عرض السلة";

  return {
    offerId: args.offer.id,
    title: args.offer.title,
    message,
    metric: condition.metric,
    currentValue,
    progressPercent,
    nextTierMin: nextTier ? nextTier.min : null,
    remainingToNextTier,
    activeTierMin: activeTier ? activeTier.min : null,
    activeTierLabel: activeTier ? progressTierLabel(activeTier) : null,
    tiers: tiersRaw.map((tier) => ({
      min: tier.min,
      label: progressTierLabel(tier),
      type: tier.type,
      value: round2(tier.value),
      maxDiscount: tier.maxDiscount,
      reached: currentValue >= tier.min,
    })),
    ...(blockedByCoupon ? { blockedByCoupon } : {}),
  };
}

function computeOffer(args: {
  offer: RuntimeCartOffer;
  subtotal: number;
  itemCount: number;
  eligibleAmount: number;
}): AppliedCartOffer | null {
  const condition = readCartCondition(args.offer.conditions);
  const metricValue =
    condition.metric === "item_count" ? args.itemCount : args.subtotal;

  if (condition.minimum > 0 && metricValue < condition.minimum) return null;

  const rewardTypeName = rewardType(
    args.offer.rewards.type ?? args.offer.rewards.rewardType,
  );

  const computed =
    rewardTypeName === "discount_table"
      ? chooseDiscountTableTier({
          tiers: args.offer.rewards.tiers,
          metricValue,
          eligibleAmount: args.eligibleAmount,
        })
      : {
          ...computeRewardDiscount({
            reward: args.offer.rewards,
            eligibleAmount: args.eligibleAmount,
          }),
          minimum: condition.minimum,
        };

  const discount = round2(Math.max(0, Math.min(args.eligibleAmount, computed.discount)));
  if (discount <= 0) return null;

  const minimum = Math.max(condition.minimum, n(computed.minimum));
  const message =
    args.offer.message || `تم تطبيق عرض سلة: ${args.offer.title}`;

  return {
    id: args.offer.id,
    title: args.offer.title,
    offerType: args.offer.offerType || rewardTypeName,
    discount,
    message,
    metric: condition.metric,
    minimum,
    rewardType: computed.rewardType || rewardTypeName,
  };
}

function sortByPriority(a: RuntimeCartOffer, b: RuntimeCartOffer) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return s(a.createdAt).localeCompare(s(b.createdAt));
}

export async function calculateCartOffers(args: {
  sb: any;
  storeId: string;
  subtotal: number;
  itemCount: number;
  couponApplied?: boolean;
  customerId?: string | null;
  eligibleAmount?: number;
}): Promise<CartOffersResult> {
  const subtotal = round2(Math.max(0, n(args.subtotal)));
  const itemCount = Math.max(0, Math.floor(n(args.itemCount)));
  const eligibleAmount = round2(
    Math.max(0, Math.min(subtotal, n(args.eligibleAmount ?? subtotal))),
  );

  const offers = await loadCartOffers({ sb: args.sb, storeId: args.storeId });
  if (!offers.length) return { discount: 0, messages: [], appliedOffers: [] };

  const now = Date.now();
  const customerId = s(args.customerId);
  const candidates: Array<{ offer: RuntimeCartOffer; applied: AppliedCartOffer }> = [];
  const progressOffers: RuntimeCartOffer[] = [];

  for (const offer of offers) {
    if (!offerInDateRange(offer, now)) continue;
    if (!offerMatchesChannel(offer)) continue;

    const needsUsageCheck =
      offer.usageLimit != null || (offer.usageLimitPerCustomer != null && customerId);

    if (needsUsageCheck) {
      const counts = await countRedemptions({
        sb: args.sb,
        storeId: args.storeId,
        offerId: offer.id,
        customerId,
      });

      if (offer.usageLimit != null && counts.total >= offer.usageLimit) continue;
      if (
        offer.usageLimitPerCustomer != null &&
        customerId &&
        counts.perCustomer >= offer.usageLimitPerCustomer
      ) {
        continue;
      }
    }

    if (isDiscountTableOffer(offer) && normalizeProgressTiers(offer).length > 0) {
      progressOffers.push(offer);
    }

    if (subtotal <= 0 || eligibleAmount <= 0) continue;
    if (args.couponApplied && !offer.applyWithCoupon) continue;

    const applied = computeOffer({
      offer,
      subtotal,
      itemCount,
      eligibleAmount,
    });

    if (applied) candidates.push({ offer, applied });
  }

  const baseProgress = progressOffers.length
    ? buildCartOfferProgress({
        offer: progressOffers[0],
        subtotal,
        itemCount,
        couponApplied: args.couponApplied,
      })
    : null;

  if (!candidates.length) {
    return {
      discount: 0,
      messages: [],
      appliedOffers: [],
      progress: baseProgress,
    };
  }

  const hasAllowStack = candidates.some(
    (candidate) => candidate.offer.stackingPolicy === "allow_stack",
  );
  const hasPriorityFirst = candidates.some(
    (candidate) => candidate.offer.stackingPolicy === "priority_first",
  );

  let applied: AppliedCartOffer[];

  if (hasAllowStack) {
    let remaining = eligibleAmount;
    applied = [];

    for (const candidate of [...candidates].sort((a, b) =>
      sortByPriority(a.offer, b.offer),
    )) {
      if (remaining <= 0) break;
      const discount = round2(Math.min(remaining, candidate.applied.discount));
      if (discount <= 0) continue;
      applied.push({ ...candidate.applied, discount });
      remaining = round2(remaining - discount);
    }
  } else if (hasPriorityFirst) {
    applied = [[...candidates].sort((a, b) => sortByPriority(a.offer, b.offer))[0].applied];
  } else {
    applied = [
      [...candidates].sort((a, b) => {
        if (b.applied.discount !== a.applied.discount) {
          return b.applied.discount - a.applied.discount;
        }

        return sortByPriority(a.offer, b.offer);
      })[0].applied,
    ];
  }

  const discount = round2(
    Math.min(
      eligibleAmount,
      applied.reduce((sum, offer) => sum + Math.max(0, n(offer.discount)), 0),
    ),
  );

  const appliedDiscountTable = applied.find((offer) => {
    const source = offers.find((row) => row.id === offer.id);
    return source ? isDiscountTableOffer(source) : false;
  });

  const progressSource =
    (appliedDiscountTable
      ? offers.find((offer) => offer.id === appliedDiscountTable.id)
      : null) ??
    progressOffers[0] ??
    null;

  const progress = progressSource
    ? buildCartOfferProgress({
        offer: progressSource,
        subtotal,
        itemCount,
        couponApplied: args.couponApplied,
      })
    : null;

  return {
    discount,
    messages: applied.map((offer) => offer.message).map(s).filter(Boolean),
    appliedOffers: applied,
    progress,
  };
}

export async function recordCartOfferRedemptions(args: {
  sb: any;
  storeId: string;
  cartId: string;
  orderId: string;
  customerId?: string | null;
  currency: string;
  appliedOffers: AppliedCartOffer[];
}) {
  const rows = (Array.isArray(args.appliedOffers) ? args.appliedOffers : [])
    .filter((offer) => s(offer?.id) && n(offer?.discount) > 0)
    .map((offer) => ({
      store_id: args.storeId,
      offer_id: offer.id,
      cart_id: args.cartId,
      order_id: args.orderId,
      customer_id: s(args.customerId) || null,
      discount_amount: round2(n(offer.discount)),
      currency: s(args.currency) || "SAR",
      status: "applied",
      snapshot: offer,
      metadata: {
        module: "cart_offers",
        source: "storefront_checkout",
      },
    }));

  if (!rows.length) return { ok: true as const };

  const res = await args.sb.from("store_special_offer_redemptions").insert(rows);

  if (res.error) {
    return {
      ok: false as const,
      error: res.error.message || "CART_OFFER_REDEMPTION_FAILED",
    };
  }

  return { ok: true as const };
}
