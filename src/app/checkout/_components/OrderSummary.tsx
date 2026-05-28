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
  items?: SummaryItem[];
  subtotal: number;
  discount: number;
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
};

type ActionLock = "coupon" | "submit" | null;

const INCOMPLETE_CHECKOUT_MESSAGE =
  "أكمل بيانات العنوان والشحن والدفع لتأكيد الطلب.";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
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

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [couponCode, setCouponCode] = useState(() =>
    initial?.coupon?.code ? String(initial.coupon.code) : "",
  );
  const [couponBusy, setCouponBusy] = useState(false);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState<StockIssue | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const hasInitialSummaryRef = useRef(Boolean(initial));
  const actionLockRef = useRef<ActionLock>(null);
  const stockIssueRef = useRef<StockIssue | null>(null);

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
  const total = hasTotals ? summary!.total : null;
  const currency = summary?.currency ?? "SAR";
  const hasCouponApplied = Boolean(summary?.coupon?.code);

  const fetchPrepare = useCallback(
    async (reason?: string, opts?: PrepareOptions) => {
      if (actionLockRef.current) return;

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
      if (actionLockRef.current) return;

      if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);

      prepareTimerRef.current = setTimeout(() => {
        prepareTimerRef.current = null;
        if (!mountedRef.current) return;
        if (actionLockRef.current) return;
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

    window.addEventListener("checkout:refresh", onRefresh as EventListener);
    window.addEventListener(
      "checkout:summaryPatch",
      onSummaryPatch as EventListener,
    );
    window.addEventListener(
      "checkout:submitEnabled",
      onSubmitEnabled as EventListener,
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

      clearQueuedPrepare();
    };
  }, [fetchPrepare, schedulePrepare]);

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
      setDrawerOpen(true);
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
      setDrawerOpen(true);
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
      softLoading ||
      actionLockRef.current === "coupon" ||
      actionLockRef.current === "submit"
    ) {
      return;
    }

    if (!canSubmit) {
      setErrorMsg(INCOMPLETE_CHECKOUT_MESSAGE);
      setStockIssueState(null);
      setDrawerOpen(true);
      return;
    }

    if (submitBusy || loading || !hasTotals) return;

    clearQueuedPrepare();

    actionLockRef.current = "submit";
    setSubmitBusy(true);
    setErrorMsg(null);
    setStockIssueState(null);

    try {
      const r = await fetch("/api/checkout/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({}),
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        if (j?.stock_issue) {
          setStockIssueState(j.stock_issue);
          setErrorMsg(buildReadableSubmitError(j));
          setDrawerOpen(true);
          schedulePrepare("stock-issue", { soft: true }, 120);
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
      setDrawerOpen(true);
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
        softLoading ||
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
  }, [
    canSubmit,
    loading,
    softLoading,
    submitBusy,
    couponBusy,
    hasTotals,
    summary,
  ]);

  const isInitialLoading = loading && !summary;
  const showSkeleton = isInitialLoading;
  const showPaymentFee = paymentFee != null && paymentFee > 0;
  const showOrderOptionsFee = orderOptionsFee != null && orderOptionsFee > 0;
  const showTaxRow = !showSkeleton && tax != null && tax > 0;
  const isIncompleteNotice = errorMsg === INCOMPLETE_CHECKOUT_MESSAGE;

  const paymentActionBusy = submitBusy || couponBusy || softLoading;

  const submitButtonLabel = useMemo(() => {
    if (submitBusy) return "جاري تأكيد الطلب";
    if (couponBusy) return hasCouponApplied ? "جاري إزالة الكوبون" : "جاري تطبيق الكوبون";
    if (softLoading) return "جاري تحديث الطلب";
    if (isInitialLoading || !hasTotals) return "جاري تجهيز الطلب";
    return "تأكيد الدفع";
  }, [
    submitBusy,
    couponBusy,
    hasCouponApplied,
    softLoading,
    isInitialLoading,
    hasTotals,
  ]);

  return (
    <>
      {submitBusy ? <SubmitFreezeOverlay /> : null}

      <section className="co-summary">
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
              <strong dir="ltr">{formatMoney(currency, total)}</strong>
            )}

            <button
              type="button"
              className={[
                "co-coupon-link",
                hasCouponApplied ? "is-applied" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setDrawerOpen(true)}
            >
              {hasCouponApplied
                ? `تم تطبيق كوبون ${summary?.coupon?.code}`
                : "لديك كوبون تخفيض؟"}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="co-summary__details"
          onClick={() => setDrawerOpen(true)}
        >
          تفاصيل الطلب
          <ChevronDown size={15} />
        </button>
      </section>

      {drawerOpen ? (
        <div className="co-drawer-layer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="co-drawer-backdrop"
            aria-label="إغلاق تفاصيل الطلب"
            onClick={() => setDrawerOpen(false)}
          />

          <aside className="co-drawer">
            <div className="co-drawer__head">
              <button
                type="button"
                className="co-drawer__close"
                aria-label="إغلاق"
                onClick={() => setDrawerOpen(false)}
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
                        currency={currency}
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
                  <Row
                    label={
                      showTaxRow
                        ? "مجموع المنتجات بدون ضريبة"
                        : "مجموع المنتجات"
                    }
                    value={
                      showSkeleton || subtotal == null
                        ? null
                        : formatMoney(currency, subtotal)
                    }
                  />

                  {showTaxRow ? (
                    <Row
                      label="ضريبة القيمة المضافة"
                      value={formatMoney(currency, tax ?? 0)}
                    />
                  ) : null}

                  {!showSkeleton && discount != null && discount > 0 ? (
                    <div className="co-total-row is-discount">
                      <span>الخصم</span>
                      <strong dir="ltr">
                        - {formatMoney(currency, discount)}
                      </strong>
                    </div>
                  ) : null}

                  <Row
                    label="الشحن"
                    value={
                      showSkeleton || shipping == null
                        ? null
                        : formatMoney(currency, shipping)
                    }
                  />

                  {showPaymentFee ? (
                    <Row
                      label="رسوم الدفع عند الاستلام"
                      value={formatMoney(currency, paymentFee ?? 0)}
                    />
                  ) : null}

                  {showOrderOptionsFee ? (
                    <>
                      <Row
                        label="خيارات الطلب"
                        value={formatMoney(currency, orderOptionsFee ?? 0)}
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
                                key={item.option_id ?? item.optionId ?? item.name}
                              >
                                <span>{item.name || "خيار الطلب"}</span>
                                <strong dir="ltr">
                                  +{" "}
                                  {formatMoney(
                                    currency,
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
                      <strong dir="ltr">{formatMoney(currency, total)}</strong>
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
                    disabled={couponBusy || loading || submitBusy || softLoading}
                  />

                  <button
                    type="button"
                    disabled={
                      loading ||
                      submitBusy ||
                      softLoading ||
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

              <button
                type="button"
                className={[
                  "co-pay-btn co-pay-btn--drawer",
                  canSubmit && !paymentActionBusy ? "is-ready" : "is-disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={loading || submitBusy || couponBusy || softLoading || !hasTotals}
                onClick={submitOrder}
              >
                {submitBusy || loading || couponBusy || softLoading ? (
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
  currency,
}: {
  item: SummaryItem;
  currency: string;
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
        <p>الكمية: {qty}</p>
      </div>

      <div dir="ltr" className="co-summary-item__price">
        {formatMoney(currency, lineTotal)}
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

function formatMoney(currency: string, v: number) {
  return `${currency} ${Number(v).toLocaleString("en-US")}`;
}