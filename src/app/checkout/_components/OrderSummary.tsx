// FILE: apps/storefront/src/app/checkout/_components/OrderSummary.tsx

"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  X,
} from "lucide-react";
import CartOfferProgressBar from "@/themes/malak/components/cart-offers/CartOfferProgressBar";

type SummaryItem = {
  id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  line_key: string;
  unit_price: number;
  title: string;
  image_url: string | null;
};

type AppliedSpecialOffer = {
  id?: string;
  title?: string;
  offer_type?: string;
  offerType?: string;
  discount?: number;
  message?: string | null;
};

type SpecialOfferLineAdjustment = {
  cartItemId?: string;
  productId?: string;
  discount?: number;
  label?: string;
  offerId?: string;
  offerTitle?: string;
  offerType?: string;
};

type SummaryItemOfferBadge = {
  discount: number;
  title: string;
  label: string;
};

type OrderOptionSummaryLine = {
  option_id?: string;
  optionId?: string;
  type?: string;
  name?: string;
  value?: string | null;
  price_customer?: number;
  priceCustomer?: number;
  currency?: string;
};

type Summary = {
  cart_id: string;

  currency: string;
  currency_code?: string;
  currencyCode?: string;

  currency_symbol?: string;
  currencySymbol?: string;
  symbol?: string;

  currency_decimals?: number;
  currencyDecimals?: number;
  decimal_digits?: number;
  decimalDigits?: number;

  items?: SummaryItem[];
  subtotal: number;
  discount: number;
  coupon_discount?: number;
  couponDiscount?: number;
  cart_offers_discount?: number;
  cartOffersDiscount?: number;
  cart_offers?: {
    discount?: number;
    messages?: string[];
    appliedOffers?: any[];
    applied_offers?: any[];
    progress?: any;
  };
  cartOffers?: {
    discount?: number;
    messages?: string[];
    appliedOffers?: any[];
    applied_offers?: any[];
    progress?: any;
  };
  cart_offer_progress?: any;
  cartOfferProgress?: any;
  special_offers_discount?: number;
  specialOffersDiscount?: number;
  applied_special_offers?: AppliedSpecialOffer[];
  appliedSpecialOffers?: AppliedSpecialOffer[];
  special_offer_messages?: string[];
  specialOfferMessages?: string[];
  special_offer_line_adjustments?: SpecialOfferLineAdjustment[];
  specialOfferLineAdjustments?: SpecialOfferLineAdjustment[];
  lineAdjustments?: SpecialOfferLineAdjustment[];
  shipping: number;
  payment_fee?: number;
  payment_method?: string | null;
  order_options_fee?: number;
  orderOptionsFee?: number;
  order_options?: OrderOptionSummaryLine[];
  orderOptions?: OrderOptionSummaryLine[];
  tax: number;
  total: number;
  coupon: null | { code: string; discount: number };
};

type SummaryPatchEventDetail = {
  patch?: Partial<
    Pick<
      Summary,
      | "shipping"
      | "tax"
      | "discount"
      | "payment_fee"
      | "payment_method"
      | "order_options_fee"
      | "orderOptionsFee"
      | "total"
    >
  >;
  summary?: Summary;
  reconcile?: boolean;
};

type StockIssue = {
  kind: "product" | "variant";
  product_id: string;
  variant_id: string | null;
  product_name: string;
  requested_qty: number;
  available_qty: number;
  action_url?: string;
};

type ApiErrorResponse = {
  ok?: boolean;
  error?: string;
  message_ar?: string;
  summary?: Summary;
  stock_issue?: StockIssue;
  order?: {
    id?: string;
    public_token?: string;
    public_no?: number | string;
  };
};

type PrepareOptions = {
  soft?: boolean;
  force?: boolean;
};

type ActionLock = "coupon" | "submit" | null;

type BankTransferPayload = {
  bankAccountId: string;
  senderAccountName: string;
  receiptUrl: string;
  receiptFilename: string;
  receiptMimeType: string;
  receiptSizeBytes: number;
};

type MoneyFormatInfo = {
  code: string;
  symbol: string;
  decimals: number;
};

type CheckoutTrackingItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
  product_id: string;
  variant_id: string | null;
  line_key?: string;
  image_url?: string | null;
};

type CheckoutTrackingEvent = {
  name: "begin_checkout";
  currency: string;
  value: number;
  items: CheckoutTrackingItem[];
  source: "malak_storefront";
  device: "desktop" | "mobile";
  route: "checkout";
  path: string;
  payload: Record<string, any>;
};

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const INCOMPLETE_CHECKOUT_MESSAGE =
  "أكمل بيانات العنوان والشحن والدفع لتأكيد الطلب.";

const DRAWER_CLOSE_MS = 240;

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function s(x: any) {
  return String(x ?? "").trim();
}

function clampDecimals(value: any, fallback = 2) {
  const raw = value ?? fallback;
  const num = Number(raw);

  if (!Number.isFinite(num)) return fallback;

  return Math.max(0, Math.min(4, Math.floor(num)));
}

function cleanCurrencyCode(value: unknown, fallback = "SAR") {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function fallbackDecimalsByCurrency(code: string) {
  const value = s(code).toUpperCase();

  if (value === "YER") return 0;
  if (value === "JPY") return 0;
  if (value === "KRW") return 0;

  return 2;
}

function readMoneyFormat(summary: Summary | null): MoneyFormatInfo {
  const code =
    s(summary?.currency_code) ||
    s(summary?.currencyCode) ||
    s(summary?.currency) ||
    "SAR";

  const symbol =
    s(summary?.currency_symbol) ||
    s(summary?.currencySymbol) ||
    s(summary?.symbol) ||
    code;

  const rawDecimals =
    summary?.currency_decimals ??
    summary?.currencyDecimals ??
    summary?.decimal_digits ??
    summary?.decimalDigits;

  return {
    code,
    symbol,
    decimals: clampDecimals(rawDecimals, fallbackDecimalsByCurrency(code)),
  };
}

function getCurrentPath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

function getTrackingDevice(): "desktop" | "mobile" {
  if (typeof window === "undefined") return "desktop";

  return window.matchMedia("(max-width: 767px)").matches
    ? "mobile"
    : "desktop";
}

function buildCheckoutTrackingItems(summary: Summary): CheckoutTrackingItem[] {
  const rows = Array.isArray(summary.items) ? summary.items : [];

  return rows
    .map((item) => {
      const productId = s(item.product_id) || s(item.id);
      const itemName = s(item.title) || "المنتج";

      if (!productId || !itemName) return null;

      const qty = Math.max(1, Math.floor(n(item.qty) || 1));
      const price = round2(n(item.unit_price));

      return {
        item_id: productId,
        item_name: itemName,
        ...(item.variant_id ? { item_variant: s(item.variant_id) } : {}),
        price,
        quantity: qty,
        product_id: productId,
        variant_id: item.variant_id ? s(item.variant_id) : null,
        line_key: s(item.line_key) || undefined,
        image_url: item.image_url || null,
      };
    })
    .filter(Boolean) as CheckoutTrackingItem[];
}

function buildBeginCheckoutEvent(summary: Summary): CheckoutTrackingEvent | null {
  const items = buildCheckoutTrackingItems(summary);

  if (!summary?.cart_id || !items.length) return null;

  const money = readMoneyFormat(summary);
  const currency = cleanCurrencyCode(money.code);
  const couponCode = s(summary.coupon?.code);

  return {
    name: "begin_checkout",
    currency,
    value: round2(n(summary.total)),
    items,
    source: "malak_storefront",
    device: getTrackingDevice(),
    route: "checkout",
    path: getCurrentPath(),
    payload: {
      cart_id: s(summary.cart_id),
      item_count: items.reduce((sum, item) => sum + n(item.quantity), 0),
      subtotal: round2(n(summary.subtotal)),
      discount: round2(n(summary.discount)),
      shipping: round2(n(summary.shipping)),
      tax: round2(n(summary.tax)),
      payment_fee: round2(n(summary.payment_fee)),
      order_options_fee: round2(readOrderOptionsFee(summary)),
      total: round2(n(summary.total)),
      ...(couponCode ? { coupon: couponCode } : {}),
    },
  };
}

function buildGoogleBeginCheckoutPayload(event: CheckoutTrackingEvent) {
  const coupon = s(event.payload?.coupon);

  return {
    currency: event.currency,
    value: event.value,
    items: event.items,
    ...(coupon ? { coupon } : {}),
  };
}

function pushBeginCheckoutToDataLayer(event: CheckoutTrackingEvent) {
  if (typeof window === "undefined") return;

  const ecommerce = buildGoogleBeginCheckoutPayload(event);

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: "mk_tracking_event",
    mk_event_name: event.name,
    mk_google_event_name: "begin_checkout",
    mk_source: event.source,
    mk_device: event.device,
    mk_route: event.route,
    mk_path: event.path,
    ecommerce,
    payload: event.payload,
  });
}

function dispatchBeginCheckoutUnifiedEvent(event: CheckoutTrackingEvent) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("mk:tracking:event", {
      detail: event,
    }),
  );

  window.dispatchEvent(
    new CustomEvent("elyaia:tracking:event", {
      detail: event,
    }),
  );
}

function sendBeginCheckoutToGoogle(event: CheckoutTrackingEvent) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "begin_checkout", buildGoogleBeginCheckoutPayload(event));
}

function sendBeginCheckoutTracking(summary: Summary) {
  const event = buildBeginCheckoutEvent(summary);

  if (!event) return;

  dispatchBeginCheckoutUnifiedEvent(event);
  pushBeginCheckoutToDataLayer(event);
  sendBeginCheckoutToGoogle(event);
}

function readOrderOptionsFee(summary: Partial<Summary>) {
  return n(summary.order_options_fee ?? summary.orderOptionsFee);
}

function readOrderOptions(summary: Partial<Summary> | null | undefined) {
  const a = summary?.order_options;
  const b = summary?.orderOptions;

  if (Array.isArray(a)) return a;
  if (Array.isArray(b)) return b;

  return [];
}

function readCouponDiscount(summary: Partial<Summary> | null | undefined) {
  return n(summary?.coupon_discount ?? summary?.couponDiscount);
}

function readSpecialOffersDiscount(summary: Partial<Summary> | null | undefined) {
  return n(summary?.special_offers_discount ?? summary?.specialOffersDiscount);
}

function readCartOffersDiscount(summary: Partial<Summary> | null | undefined) {
  return n(
    summary?.cart_offers_discount ??
      summary?.cartOffersDiscount ??
      summary?.cartOffers?.discount ??
      summary?.cart_offers?.discount,
  );
}

function readCartOfferMessages(summary: Partial<Summary> | null | undefined) {
  const source =
    summary?.cartOffers && typeof summary.cartOffers === "object"
      ? summary.cartOffers
      : summary?.cart_offers && typeof summary.cart_offers === "object"
        ? summary.cart_offers
        : {};

  const messages = Array.isArray(source?.messages) ? source.messages : [];
  const applied = Array.isArray(source?.appliedOffers)
    ? source.appliedOffers
    : Array.isArray(source?.applied_offers)
      ? source.applied_offers
      : [];

  return Array.from(
    new Set([
      ...messages.map(s).filter(Boolean),
      ...applied
        .map((offer: any) => s(offer?.message) || s(offer?.title))
        .filter(Boolean),
    ]),
  );
}

function readCartOfferProgress(summary: Partial<Summary> | null | undefined) {
  return (
    summary?.cartOfferProgress ??
    summary?.cart_offer_progress ??
    summary?.cartOffers?.progress ??
    summary?.cart_offers?.progress ??
    null
  );
}

function readAppliedSpecialOffers(
  summary: Partial<Summary> | null | undefined,
) {
  const snake = summary?.applied_special_offers;
  const camel = summary?.appliedSpecialOffers;

  if (Array.isArray(snake)) return snake;
  if (Array.isArray(camel)) return camel;

  return [];
}

function readSpecialOfferMessages(
  summary: Partial<Summary> | null | undefined,
) {
  const snake = summary?.special_offer_messages;
  const camel = summary?.specialOfferMessages;

  if (Array.isArray(snake)) return snake.map(s).filter(Boolean);
  if (Array.isArray(camel)) return camel.map(s).filter(Boolean);

  return [];
}

function readSpecialOfferLineAdjustments(
  summary: Partial<Summary> | null | undefined,
) {
  const direct = summary?.lineAdjustments;
  const snake = summary?.special_offer_line_adjustments;
  const camel = summary?.specialOfferLineAdjustments;

  if (Array.isArray(direct)) return direct;
  if (Array.isArray(snake)) return snake;
  if (Array.isArray(camel)) return camel;

  return [];
}

function buildSpecialOfferDetails(summary: Summary | null) {
  if (!summary) return [];

  const details: string[] = [];
  const seen = new Set<string>();

  const add = (value: string) => {
    const text = s(value);
    if (!text) return;
    const key = text.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    details.push(text);
  };

  for (const offer of readAppliedSpecialOffers(summary)) {
    const title = s(offer?.title) || s(offer?.message);
    if (title) add(`تم تطبيق عرض: ${title}`);
  }

  for (const message of readSpecialOfferMessages(summary)) {
    add(`تم تطبيق عرض: ${message}`);
  }

  const itemById = new Map<string, SummaryItem>();
  for (const item of Array.isArray(summary.items) ? summary.items : []) {
    itemById.set(s(item.id), item);
  }

  for (const adjustment of readSpecialOfferLineAdjustments(summary)) {
    if (n(adjustment?.discount) <= 0) continue;

    const item = itemById.get(s(adjustment?.cartItemId));
    const productName = s(item?.title);
    const offerTitle = s(adjustment?.offerTitle);

    if (productName) {
      add(`هدية العرض: ${productName}`);
    } else if (offerTitle) {
      add(`هدية العرض بسبب: ${offerTitle}`);
    }
  }

  return details;
}

function buildSpecialOfferItemBadges(summary: Summary | null) {
  const badges = new Map<string, SummaryItemOfferBadge>();

  if (!summary || !Array.isArray(summary.items)) return badges;

  const adjustments = readSpecialOfferLineAdjustments(summary).filter(
    (adjustment) => n(adjustment?.discount) > 0,
  );

  for (const item of summary.items) {
    const itemId = s(item.id);
    const productId = s(item.product_id);
    const matched = adjustments.filter((adjustment) => {
      const adjustmentCartItemId = s(adjustment?.cartItemId);
      const adjustmentProductId = s(adjustment?.productId);

      return (
        adjustmentCartItemId === itemId ||
        (!adjustmentCartItemId && adjustmentProductId === productId)
      );
    });

    if (!itemId || !matched.length) continue;

    const first = matched[0];

    badges.set(itemId, {
      discount: matched.reduce(
        (sum, adjustment) => sum + n(adjustment?.discount),
        0,
      ),
      title: s(first?.offerTitle),
      label: s(first?.label) || "هدية العرض",
    });
  }

  return badges;
}

function applyPatch(base: Summary, patch: Partial<Summary>): Summary {
  const next: Summary = { ...base, ...patch };

  const subtotal = n(next.subtotal);
  const shipping = n(next.shipping);
  const paymentFee = n(next.payment_fee);
  const orderOptionsFee = readOrderOptionsFee(next);
  const discount = n(next.discount);
  const tax = n(next.tax);

  next.order_options_fee = orderOptionsFee;
  next.orderOptionsFee = orderOptionsFee;

  next.total = round2(
    Math.max(0, subtotal - discount) +
      shipping +
      paymentFee +
      orderOptionsFee +
      tax,
  );

  return next;
}

function isCartEmptyError(message: string | null | undefined) {
  const v = String(message ?? "").trim().toUpperCase();

  return (
    v === "CART_EMPTY" ||
    v.includes("CART_EMPTY") ||
    v === "سلة المشتريات فارغة." ||
    v.includes("سلة المشتريات فارغة")
  );
}

function buildReadableSubmitError(j: ApiErrorResponse) {
  if (j?.stock_issue) {
    const issue = j.stock_issue;

    if (n(issue.available_qty) <= 0) {
      return `المنتج "${issue.product_name}" نفدت كميته. حدّث السلة للمتابعة.`;
    }

    return `المنتج "${issue.product_name}" لم تعد كميته كافية. المطلوب ${issue.requested_qty} والمتاح الآن ${issue.available_qty}.`;
  }

  if (isCartEmptyError(j?.message_ar || j?.error)) {
    return "بعض المنتجات في طلبك لم تعد متاحة، لذلك يلزم مراجعة السلة أولًا.";
  }

  if (j?.error === "ORDER_OPTION_REQUIRED") {
    return j.message_ar || "يرجى تعبئة خيارات الطلب المطلوبة قبل تأكيد الطلب.";
  }

  return j?.message_ar || j?.error || "تعذر تأكيد الطلب.";
}

function SubmitFreezeOverlay() {
  return (
    <div className="co-busy-overlay co-busy-overlay--top">
      <div className="co-busy-pill">
        <Loader2 className="co-spin" size={16} />
        جاري تأكيد الطلب...
      </div>
    </div>
  );
}

export default function OrderSummary({
  initialSummary = null,
}: {
  initialSummary?: Summary | null;
}) {
  const initial = initialSummary?.cart_id ? initialSummary : null;

  const [summary, setSummary] = useState<Summary | null>(() => initial);
  const [loading, setLoading] = useState(() => !initial);
  const [softLoading, setSoftLoading] = useState(false);

  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);

  const [couponCode, setCouponCode] = useState(() =>
    initial?.coupon?.code ? String(initial.coupon.code) : "",
  );
  const [couponBusy, setCouponBusy] = useState(false);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState<StockIssue | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [bankTransferPayload, setBankTransferPayload] =
    useState<BankTransferPayload | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const hasInitialSummaryRef = useRef(Boolean(initial));
  const actionLockRef = useRef<ActionLock>(null);
  const stockIssueRef = useRef<StockIssue | null>(null);
  const sentBeginCheckoutRef = useRef<Set<string>>(new Set());

  const drawerOpen = drawerMounted && !drawerClosing;

  function setStockIssueState(value: StockIssue | null) {
    stockIssueRef.current = value;
    setStockIssue(value);
  }

  function clearQueuedPrepare() {
    if (prepareTimerRef.current) {
      clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }

    abortRef.current?.abort();
    abortRef.current = null;
  }

  const clearDrawerCloseTimer = useCallback(() => {
    if (drawerCloseTimerRef.current) {
      clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
  }, []);

  const openDrawer = useCallback(() => {
    clearDrawerCloseTimer();
    setDrawerMounted(true);
    setDrawerClosing(false);
  }, [clearDrawerCloseTimer]);

  const closeDrawer = useCallback(() => {
    if (!drawerMounted || drawerClosing) return;

    clearDrawerCloseTimer();
    setDrawerClosing(true);

    drawerCloseTimerRef.current = setTimeout(() => {
      drawerCloseTimerRef.current = null;

      if (!mountedRef.current) return;

      setDrawerMounted(false);
      setDrawerClosing(false);
    }, DRAWER_CLOSE_MS);
  }, [clearDrawerCloseTimer, drawerClosing, drawerMounted]);

  const money = useMemo(() => readMoneyFormat(summary), [summary]);

  const items = useMemo(
    () => (Array.isArray(summary?.items) ? summary.items : []),
    [summary?.items],
  );

  const orderOptions = useMemo(() => readOrderOptions(summary), [summary]);

  const itemCount = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Math.max(1, Math.floor(n(item.qty) || 1)),
        0,
      ),
    [items],
  );

  const itemCountText = useMemo(() => {
    if (loading && !summary) return "جاري التجهيز...";
    if (itemCount === 1) return "منتج واحد";
    if (itemCount === 2) return "منتجان";
    return `${itemCount} منتجات`;
  }, [itemCount, loading, summary]);

  const hasTotals = Boolean(summary);
  const subtotal = hasTotals ? summary!.subtotal : null;
  const tax = hasTotals ? summary!.tax : null;
  const shipping = hasTotals ? summary!.shipping : null;
  const paymentFee = hasTotals ? n(summary!.payment_fee) : null;
  const orderOptionsFee = hasTotals ? readOrderOptionsFee(summary!) : null;
  const discount = hasTotals ? summary!.discount : null;
  const couponDiscount = hasTotals ? readCouponDiscount(summary!) : 0;
  const specialOffersDiscount = hasTotals
    ? readSpecialOffersDiscount(summary!)
    : 0;
  const cartOffersDiscount = hasTotals ? readCartOffersDiscount(summary!) : 0;
  const cartOfferMessages = useMemo(
    () => readCartOfferMessages(summary),
    [summary],
  );
  const cartOfferProgress = useMemo(
    () => readCartOfferProgress(summary),
    [summary],
  );
  const unclassifiedDiscount = Math.max(
    0,
    n(discount) - couponDiscount - specialOffersDiscount - cartOffersDiscount,
  );
  const specialOfferDetails = useMemo(
    () => buildSpecialOfferDetails(summary),
    [summary],
  );
  const specialOfferItemBadges = useMemo(
    () => buildSpecialOfferItemBadges(summary),
    [summary],
  );
  const total = hasTotals ? summary!.total : null;
  const hasCouponApplied = Boolean(summary?.coupon?.code);

  const fetchPrepare = useCallback(
    async (reason?: string, opts?: PrepareOptions) => {
      const force = Boolean(opts?.force);

      if (actionLockRef.current && !force) return;

      abortRef.current?.abort();

      const ac = new AbortController();
      abortRef.current = ac;

      const seq = ++seqRef.current;
      const soft = Boolean(opts?.soft);

      if (soft) setSoftLoading(true);
      else setLoading(true);

      if (!soft && !stockIssueRef.current) {
        setErrorMsg(null);
      }

      try {
        const r = await fetch("/api/checkout/prepare", {
          method: "GET",
          signal: ac.signal,
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Cache-Control": "no-store" },
        });

        const j = (await r.json().catch(() => ({}))) as any;

        if (seq !== seqRef.current) return;

        if (!r.ok || !j?.ok) {
          const raw =
            j?.message_ar ||
            j?.error ||
            (reason ? `PREPARE_FAILED:${reason}` : "PREPARE_FAILED");

          throw new Error(raw);
        }

        const nextSummary: Summary = j.summary;

        setSummary(nextSummary);

        if (!stockIssueRef.current) {
          setStockIssueState(null);
          setErrorMsg(null);
        }

        if (nextSummary?.coupon?.code) {
          setCouponCode(String(nextSummary.coupon.code));
        } else {
          setCouponCode("");
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;

        const raw = e?.message || "PREPARE_FAILED";

        if (!stockIssueRef.current) {
          setErrorMsg(raw);
        }

        if (!soft) setSummary(null);
      } finally {
        if (seq === seqRef.current) {
          if (soft) setSoftLoading(false);
          else setLoading(false);
        }
      }
    },
    [],
  );

  const schedulePrepare = useCallback(
    (reason?: string, opts?: PrepareOptions, delay = 120) => {
      const force = Boolean(opts?.force);

      if (actionLockRef.current && !force) return;

      if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);

      prepareTimerRef.current = setTimeout(() => {
        prepareTimerRef.current = null;
        if (!mountedRef.current) return;
        if (actionLockRef.current && !force) return;
        void fetchPrepare(reason, opts);
      }, delay);
    },
    [fetchPrepare],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!hasInitialSummaryRef.current) {
      void fetchPrepare("mount");
    } else {
      setLoading(false);
    }

    const onRefresh = () => {
      if (actionLockRef.current) return;
      schedulePrepare("refresh", { soft: true }, 120);
    };

    const onSummaryPatch = (evt: Event) => {
      const e = evt as CustomEvent<SummaryPatchEventDetail>;
      const detail = e?.detail || {};

      if (detail.summary) {
        setSummary(detail.summary);

        if (!stockIssueRef.current) {
          setErrorMsg(null);
          setStockIssueState(null);
        }

        if (detail.summary?.coupon?.code) {
          setCouponCode(String(detail.summary.coupon.code));
        } else {
          setCouponCode("");
        }
      }

      if (detail.patch) {
        setSummary((prev) => {
          if (!prev) return prev;
          return applyPatch(prev, detail.patch as Partial<Summary>);
        });
      }

      const reconcile = detail.reconcile !== false;

      if (reconcile && !actionLockRef.current) {
        schedulePrepare("reconcile", { soft: true }, 260);
      }
    };

    const onSubmitEnabled = (evt: Event) => {
      const e = evt as CustomEvent<{ enabled?: boolean }>;
      setCanSubmit(Boolean(e?.detail?.enabled));
    };

    const onBankTransferPayload = (evt: Event) => {
      const e = evt as CustomEvent<{ payload?: BankTransferPayload | null }>;
      setBankTransferPayload(e?.detail?.payload ?? null);
    };

    window.addEventListener("checkout:refresh", onRefresh as EventListener);
    window.addEventListener(
      "checkout:summaryPatch",
      onSummaryPatch as EventListener,
    );
    window.addEventListener(
      "checkout:submitEnabled",
      onSubmitEnabled as EventListener,
    );
    window.addEventListener(
      "checkout:bankTransferPayload",
      onBankTransferPayload as EventListener,
    );

    return () => {
      mountedRef.current = false;

      window.removeEventListener("checkout:refresh", onRefresh as EventListener);
      window.removeEventListener(
        "checkout:summaryPatch",
        onSummaryPatch as EventListener,
      );
      window.removeEventListener(
        "checkout:submitEnabled",
        onSubmitEnabled as EventListener,
      );
      window.removeEventListener(
        "checkout:bankTransferPayload",
        onBankTransferPayload as EventListener,
      );

      clearQueuedPrepare();
      clearDrawerCloseTimer();
    };
  }, [clearDrawerCloseTimer, fetchPrepare, schedulePrepare]);

  useEffect(() => {
    if (!summary?.cart_id) return;
    if (!Array.isArray(summary.items) || summary.items.length <= 0) return;

    const key = `${summary.cart_id}|${getCurrentPath()}`;

    if (sentBeginCheckoutRef.current.has(key)) return;

    sentBeginCheckoutRef.current.add(key);
    sendBeginCheckoutTracking(summary);
  }, [summary]);

  useEffect(() => {
    if (!drawerMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerMounted]);

  useEffect(() => {
    if (!drawerMounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeDrawer();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDrawer, drawerMounted]);

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();

    if (!code || couponBusy || submitBusy || actionLockRef.current) return;

    clearQueuedPrepare();

    actionLockRef.current = "coupon";
    setCouponBusy(true);
    setSoftLoading(false);
    setErrorMsg(null);
    setStockIssueState(null);

    try {
      const r = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ code }),
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.message_ar || j?.error || "APPLY_COUPON_FAILED");
      }

      const nextSummary: Summary = j.summary as Summary;

      setSummary(nextSummary);
      setErrorMsg(null);
      setStockIssueState(null);

      if (nextSummary?.coupon?.code) {
        setCouponCode(String(nextSummary.coupon.code));
      } else {
        setCouponCode("");
      }

      window.dispatchEvent(new CustomEvent("checkout:couponChanged"));
    } catch (e: any) {
      setErrorMsg(e?.message || "تعذر تطبيق الكوبون.");
      setStockIssueState(null);
      openDrawer();
    } finally {
      if (actionLockRef.current === "coupon") {
        actionLockRef.current = null;
      }

      if (mountedRef.current) {
        setCouponBusy(false);
      }
    }
  }

  async function removeCoupon() {
    if (couponBusy || submitBusy || actionLockRef.current) return;

    clearQueuedPrepare();

    actionLockRef.current = "coupon";
    setCouponBusy(true);
    setSoftLoading(false);
    setErrorMsg(null);
    setStockIssueState(null);

    try {
      const r = await fetch("/api/checkout/remove-coupon", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.message_ar || j?.error || "REMOVE_COUPON_FAILED");
      }

      const nextSummary: Summary = j.summary as Summary;

      setSummary(nextSummary);
      setCouponCode("");
      setErrorMsg(null);
      setStockIssueState(null);

      window.dispatchEvent(new CustomEvent("checkout:couponChanged"));
    } catch (e: any) {
      setErrorMsg(e?.message || "تعذر إزالة الكوبون.");
      setStockIssueState(null);
      openDrawer();
    } finally {
      if (actionLockRef.current === "coupon") {
        actionLockRef.current = null;
      }

      if (mountedRef.current) {
        setCouponBusy(false);
      }
    }
  }

  async function submitOrder() {
    if (
      couponBusy ||
      actionLockRef.current === "coupon" ||
      actionLockRef.current === "submit"
    ) {
      return;
    }

    if (!canSubmit) {
      setErrorMsg(INCOMPLETE_CHECKOUT_MESSAGE);
      setStockIssueState(null);
      openDrawer();
      return;
    }

    if (submitBusy || loading || !hasTotals) return;

    clearQueuedPrepare();

    actionLockRef.current = "submit";
    setSubmitBusy(true);
    setSoftLoading(false);
    setErrorMsg(null);
    setStockIssueState(null);

    try {
      const r = await fetch("/api/checkout/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          payment_method: summary?.payment_method ?? null,
          ...(bankTransferPayload
            ? { bankTransfer: bankTransferPayload }
            : {}),
        }),
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        if (j?.stock_issue) {
          setStockIssueState(j.stock_issue);
          setErrorMsg(buildReadableSubmitError(j));
          openDrawer();
          schedulePrepare("stock-issue", { soft: true, force: true }, 120);
          return;
        }

        throw new Error(buildReadableSubmitError(j));
      }

      const token = j?.order?.public_token ? String(j.order.public_token) : "";

      if (!token) {
        throw new Error("تم إنشاء الطلب لكن لم يتم استلام رقم التتبع للعرض.");
      }

      window.location.href = `/thankyou/${encodeURIComponent(token)}`;
    } catch (e: any) {
      setErrorMsg(e?.message || "تعذر تأكيد الطلب.");
      setStockIssueState(null);
      openDrawer();
    } finally {
      if (actionLockRef.current === "submit") {
        actionLockRef.current = null;
      }

      if (mountedRef.current) {
        setSubmitBusy(false);
      }
    }
  }

  useEffect(() => {
    const onSubmitOrder = () => {
      if (
        couponBusy ||
        actionLockRef.current === "coupon" ||
        actionLockRef.current === "submit"
      ) {
        return;
      }

      void submitOrder();
    };

    window.addEventListener("checkout:submitOrder", onSubmitOrder);

    return () => {
      window.removeEventListener("checkout:submitOrder", onSubmitOrder);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, loading, submitBusy, couponBusy, hasTotals, summary]);

  const isInitialLoading = loading && !summary;
  const showSkeleton = isInitialLoading;
  const showPaymentFee = paymentFee != null && paymentFee > 0;
  const showOrderOptionsFee = orderOptionsFee != null && orderOptionsFee > 0;
  const showTaxRow = !showSkeleton && tax != null && tax > 0;
  const isIncompleteNotice = errorMsg === INCOMPLETE_CHECKOUT_MESSAGE;

  const paymentActionBusy = submitBusy || couponBusy;

  const submitButtonLabel = useMemo(() => {
    if (submitBusy) return "جاري تأكيد الطلب";
    if (couponBusy) {
      return hasCouponApplied ? "جاري إزالة الكوبون" : "جاري تطبيق الكوبون";
    }
    if (isInitialLoading || !hasTotals) return "جاري تجهيز الطلب";
    return "تأكيد الدفع";
  }, [submitBusy, couponBusy, hasCouponApplied, isInitialLoading, hasTotals]);

  const submitDisabledHint = useMemo(() => {
    if (submitBusy || couponBusy || loading || !hasTotals || canSubmit) {
      return "";
    }

    if (errorMsg && isIncompleteNotice) return errorMsg;

    return "يرجى اختيار عنوان الشحن وطريقة الدفع للمتابعة";
  }, [
    canSubmit,
    couponBusy,
    errorMsg,
    hasTotals,
    isIncompleteNotice,
    loading,
    submitBusy,
  ]);

  return (
    <>
      {submitBusy ? <SubmitFreezeOverlay /> : null}

      <section className="co-summary-wrapper">
        <div className="co-summary">
          <div className="co-summary__main">
            <div className="co-summary__right">
              <span className="co-summary__icon">
                <ShoppingCart size={22} />
              </span>

              <div className="co-summary__title">
                <h1>إجمالي الطلب</h1>
                <p>
                  {itemCountText}
                  {softLoading ? <span>يتم التحديث...</span> : null}
                </p>
              </div>

              <div className="co-summary__thumbs" aria-hidden>
                {items.slice(0, 3).map((item) => (
                  <span key={item.id}>
                    {item.image_url ? (
                      <img src={item.image_url} alt="" />
                    ) : (
                      <Package size={15} />
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="co-summary__left">
              {showSkeleton || total == null ? (
                <span className="co-skeleton co-skeleton--total" />
              ) : (
                <strong dir="ltr">{formatMoney(money, total)}</strong>
              )}

              {submitDisabledHint ? (
                <div className="co-submit-hint">{submitDisabledHint}</div>
              ) : null}

              <button
                type="button"
                className={[
                  "co-coupon-link",
                  hasCouponApplied ? "is-applied" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={openDrawer}
              >
                {hasCouponApplied
                  ? `تم تطبيق كوبون ${summary?.coupon?.code}`
                  : "لديك كوبون تخفيض؟"}
              </button>
            </div>
          </div>
        </div>

        <div className="co-summary__toggle-bg">
          <div className="co-summary__toggle">
            <button
              type="button"
              className="co-summary__details"
              aria-expanded={drawerOpen}
              onClick={openDrawer}
            >
              تفاصيل الطلب
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </section>

      {drawerMounted ? (
        <div
          className={[
            "co-drawer-layer",
            drawerClosing ? "is-closing" : "is-open",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="co-drawer-backdrop"
            aria-label="إغلاق تفاصيل الطلب"
            onClick={closeDrawer}
          />

          <aside className="co-drawer">
            <div className="co-drawer__head">
              <button
                type="button"
                className="co-drawer__close"
                aria-label="إغلاق"
                onClick={closeDrawer}
              >
                <X size={20} />
              </button>
              <div>
                <h2>تفاصيل الطلب</h2>
                <p>راجع المنتجات والإجمالي قبل التأكيد</p>
              </div>
            </div>

            <div className="co-drawer__body">
              {errorMsg && !stockIssue ? (
                <div
                  className={[
                    "co-submit-error",
                    isIncompleteNotice ? "co-submit-error--warning" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {errorMsg}
                </div>
              ) : null}

              {stockIssue ? (
                <div className="co-stock-alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>تغير المخزون قبل إتمام الطلب</strong>
                    <p>{errorMsg}</p>

                    <div className="co-stock-alert__box">
                      <div>المنتج: {stockIssue.product_name}</div>
                      <div>الكمية المطلوبة: {stockIssue.requested_qty}</div>
                      <div>المتاح الآن: {stockIssue.available_qty}</div>
                    </div>

                    <button
                      type="button"
                      className="co-btn co-btn--dark co-btn--full"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("cart:changed"));
                        window.location.href = stockIssue.action_url || "/cart";
                      }}
                    >
                      تحديث السلة
                    </button>
                  </div>
                </div>
              ) : null}

              <section className="co-drawer-section">
                <h3>المنتجات</h3>

                {showSkeleton ? (
                  <div className="co-drawer-loading">
                    <Loader2 className="co-spin" size={15} />
                    جاري تحميل المنتجات...
                  </div>
                ) : items.length > 0 ? (
                  <div className="co-summary-items">
                    {items.map((item) => (
                      <SummaryItemRow
                        key={item.id}
                        item={item}
                        money={money}
                        offerBadge={specialOfferItemBadges.get(s(item.id))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="co-empty-small">لا توجد منتجات في الملخص</div>
                )}
              </section>

              <section className="co-drawer-section">
                <h3>ملخص السلة</h3>

                <div className="co-totals">
                  {!showSkeleton ? (
                    <CartOfferProgressBar
                      progress={cartOfferProgress}
                      currencySymbol={money.symbol}
                      currencyDecimals={money.decimals}
                      variant="compact"
                    />
                  ) : null}

                  <Row
                    label={
                      showTaxRow
                        ? "مجموع المنتجات بدون ضريبة"
                        : "مجموع المنتجات"
                    }
                    value={
                      showSkeleton || subtotal == null
                        ? null
                        : formatMoney(money, subtotal)
                    }
                  />

                  {showTaxRow ? (
                    <Row
                      label="ضريبة القيمة المضافة"
                      value={formatMoney(money, tax ?? 0)}
                    />
                  ) : null}

                  {!showSkeleton && couponDiscount > 0 ? (
                    <div className="co-total-row is-discount">
                      <span>كوبون الخصم</span>
                      <strong dir="ltr">
                        - {formatMoney(money, couponDiscount)}
                      </strong>
                    </div>
                  ) : null}

                  {!showSkeleton && specialOffersDiscount > 0 ? (
                    <div className="co-special-offers-block">
                      <div className="co-total-row is-discount co-total-row--special-offer">
                        <span>العروض الخاصة</span>
                        <strong dir="ltr">
                          - {formatMoney(money, specialOffersDiscount)}
                        </strong>
                      </div>

                      {specialOfferDetails.length > 0 ? (
                        <div className="co-special-offers-details">
                          {specialOfferDetails.slice(0, 4).map((detail) => (
                            <div key={detail}>{detail}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!showSkeleton && cartOffersDiscount > 0 ? (
                    <div className="co-special-offers-block">
                      <div className="co-total-row is-discount co-total-row--special-offer">
                        <span>عروض السلة</span>
                        <strong dir="ltr">
                          - {formatMoney(money, cartOffersDiscount)}
                        </strong>
                      </div>

                      {cartOfferMessages.length > 0 ? (
                        <div className="co-special-offers-details">
                          {cartOfferMessages.slice(0, 3).map((detail) => (
                            <div key={detail}>{detail}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!showSkeleton &&
                  unclassifiedDiscount > 0 &&
                  couponDiscount <= 0 &&
                  specialOffersDiscount <= 0 &&
                  cartOffersDiscount <= 0 ? (
                    <div className="co-total-row is-discount">
                      <span>الخصم</span>
                      <strong dir="ltr">
                        - {formatMoney(money, unclassifiedDiscount)}
                      </strong>
                    </div>
                  ) : null}

                  <Row
                    label="الشحن"
                    value={
                      showSkeleton || shipping == null
                        ? null
                        : formatMoney(money, shipping)
                    }
                  />

                  {showPaymentFee ? (
                    <Row
                      label="رسوم الدفع عند الاستلام"
                      value={formatMoney(money, paymentFee ?? 0)}
                    />
                  ) : null}

                  {showOrderOptionsFee ? (
                    <>
                      <Row
                        label="خيارات الطلب"
                        value={formatMoney(money, orderOptionsFee ?? 0)}
                      />

                      {orderOptions.length > 0 ? (
                        <div className="co-order-options-mini">
                          {orderOptions
                            .filter(
                              (item) =>
                                n(item.price_customer ?? item.priceCustomer) >
                                0,
                            )
                            .map((item) => (
                              <div
                                key={
                                  item.option_id ?? item.optionId ?? item.name
                                }
                              >
                                <span>{item.name || "خيار الطلب"}</span>
                                <strong dir="ltr">
                                  +{" "}
                                  {formatMoney(
                                    money,
                                    n(
                                      item.price_customer ??
                                        item.priceCustomer,
                                    ),
                                  )}
                                </strong>
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <div className="co-total-line">
                    <span>إجمالي الطلب</span>

                    {showSkeleton || total == null ? (
                      <span className="co-skeleton co-skeleton--money" />
                    ) : (
                      <strong dir="ltr">{formatMoney(money, total)}</strong>
                    )}
                  </div>
                </div>
              </section>

              <section className="co-drawer-section">
                <div className="co-coupon-head">
                  <Ticket size={17} />
                  <h3>كوبون خصم</h3>
                  <span>اختياري</span>
                </div>

                <div className="co-coupon-form">
                  <input
                    placeholder="أدخل رمز الكوبون"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (isIncompleteNotice) setErrorMsg(null);
                    }}
                    disabled={couponBusy || loading || submitBusy}
                  />

                  <button
                    type="button"
                    disabled={
                      loading ||
                      submitBusy ||
                      couponBusy ||
                      (!hasCouponApplied && !couponCode.trim())
                    }
                    onClick={hasCouponApplied ? removeCoupon : applyCoupon}
                  >
                    {couponBusy ? (
                      <Loader2 className="co-spin" size={15} />
                    ) : hasCouponApplied ? (
                      "إزالة"
                    ) : (
                      "تطبيق"
                    )}
                  </button>
                </div>
              </section>

              {submitDisabledHint ? (
                <div className="co-submit-hint co-submit-hint--drawer">
                  {submitDisabledHint}
                </div>
              ) : null}

              <button
                type="button"
                className={[
                  "co-pay-btn co-pay-btn--drawer",
                  canSubmit && !paymentActionBusy ? "is-ready" : "is-disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={loading || submitBusy || couponBusy || !hasTotals}
                onClick={submitOrder}
              >
                {submitBusy || loading || couponBusy ? (
                  <Loader2 className="co-spin" size={16} />
                ) : null}
                {submitButtonLabel}
              </button>

              <Link href="/cart" className="co-back-cart">
                رجوع للسلة
                <ArrowLeft size={14} />
              </Link>

              <div className="co-secure-note">
                <ShieldCheck size={15} />
                دفع آمن ومشفّر
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

const SummaryItemRow = memo(function SummaryItemRow({
  item,
  money,
  offerBadge,
}: {
  item: SummaryItem;
  money: MoneyFormatInfo;
  offerBadge?: SummaryItemOfferBadge;
}) {
  const qty = Math.max(1, Math.floor(n(item.qty) || 1));
  const lineTotal = round2(n(item.unit_price) * qty);

  return (
    <div className="co-summary-item">
      <div className="co-summary-item__image">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Package size={18} />
        )}

        <span>{qty}</span>
      </div>

      <div className="co-summary-item__info">
        <strong>{item.title}</strong>
        {offerBadge ? (
          <div className="co-summary-item__offer">
            <span className="co-summary-item__offer-badge">
              {offerBadge.label}
            </span>
            {offerBadge.title ? (
              <span className="co-summary-item__offer-title">
                بسبب عرض: {offerBadge.title}
              </span>
            ) : null}
          </div>
        ) : null}
        <p>الكمية: {qty}</p>
      </div>

      <div dir="ltr" className="co-summary-item__price">
        {formatMoney(money, lineTotal)}
      </div>
    </div>
  );
});

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="co-total-row">
      <span>{label}</span>

      {value == null ? (
        <span className="co-skeleton co-skeleton--money" />
      ) : (
        <strong dir="ltr">{value}</strong>
      )}
    </div>
  );
}

function formatMoney(info: MoneyFormatInfo, v: number) {
  const decimals = clampDecimals(info.decimals, 2);
  const value = Number.isFinite(Number(v)) ? Number(v) : 0;

  const rounded =
    decimals <= 0 ? Math.round(value) : Number(value.toFixed(decimals));

  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${info.code} ${formatted}`;
}
