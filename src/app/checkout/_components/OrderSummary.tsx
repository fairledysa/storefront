// FILE: apps/storefront/src/app/checkout/_components/OrderSummary.tsx
"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Lock,
  LockKeyhole,
  Package,
  ShieldCheck,
  ShoppingCart,
  Ticket,
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

const INCOMPLETE_CHECKOUT_MESSAGE = "أكمل العنوان والشحن وطريقة الدفع أولًا.";

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
  const payment_fee = n(next.payment_fee);
  const order_options_fee = readOrderOptionsFee(next);
  const discount = n(next.discount);
  const tax = n(next.tax);

  next.order_options_fee = order_options_fee;
  next.orderOptionsFee = order_options_fee;

  next.total = round2(
    Math.max(0, subtotal - discount) +
      shipping +
      payment_fee +
      order_options_fee +
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

function buildReadablePrepareError(raw: string | null | undefined) {
  if (isCartEmptyError(raw)) {
    return "بعض المنتجات في هذه السلة لم تعد متاحة، أو تم إخفاؤها من المتجر، لذلك لا يمكن إكمال الطلب حالياً.";
  }

  return raw || "تعذر تحديث ملخص الطلب حالياً.";
}

function buildReadableSubmitError(j: ApiErrorResponse) {
  if (j?.stock_issue) {
    const issue = j.stock_issue;

    if (n(issue.available_qty) <= 0) {
      return `المنتج "${issue.product_name}" نفدت كميته. حدّث حقيبة التسوق للمتابعة.`;
    }

    return `المنتج "${issue.product_name}" لم تعد كميته المتاحة كافية. المطلوب ${issue.requested_qty} والمتاح الآن ${issue.available_qty}.`;
  }

  if (isCartEmptyError(j?.message_ar || j?.error)) {
    return "بعض المنتجات في طلبك لم تعد متاحة أو لم تعد قابلة للشراء، لذلك يلزم مراجعة السلة أولاً.";
  }

  if (j?.error === "ORDER_OPTION_REQUIRED") {
    return j.message_ar || "يرجى تعبئة خيارات الطلب المطلوبة قبل تأكيد الطلب.";
  }

  return j?.message_ar || j?.error || "SUBMIT_FAILED";
}

function SubmitFreezeOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-white/45 backdrop-blur-[1px]">
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-[12px] font-black text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
        جاري تأكيد الطلب...
      </div>
    </div>
  );
}

function CheckoutUnavailableCard({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-amber-300/70 bg-amber-50/85 p-4 text-right">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-amber-950">
            تعذر متابعة إتمام الطلب
          </div>

          <div className="mt-1 text-[13px] leading-6 text-amber-900">
            {message}
          </div>

          <div className="mt-3 rounded-2xl border border-amber-200 bg-white/75 px-3 py-3 text-[12px] leading-6 text-amber-950">
            قد يكون السبب أن المنتج:
            <div className="mt-1 space-y-1">
              <div>• تم إخفاؤه من الإدارة.</div>
              <div>• لم يعد ظاهرًا في الويب.</div>
              <div>• نفدت كميته أثناء وجودك في صفحة الدفع.</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/cart"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              <ShoppingCart className="h-4 w-4" />
              الانتقال إلى سلة التسوق
            </Link>

            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState<StockIssue | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

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

  const hasTotals = Boolean(summary);
  const subtotal = hasTotals ? summary!.subtotal : null;
  const tax = hasTotals ? summary!.tax : null;
  const shipping = hasTotals ? summary!.shipping : null;
  const payment_fee = hasTotals ? n(summary!.payment_fee) : null;
  const order_options_fee = hasTotals ? readOrderOptionsFee(summary!) : null;
  const discount = hasTotals ? summary!.discount : null;
  const total = hasTotals ? summary!.total : null;
  const currency = summary?.currency ?? "SAR";
  const hasCouponApplied = Boolean(summary?.coupon?.code);

  const isUnavailableState =
    !loading && !summary && (isCartEmptyError(errorMsg) || Boolean(errorMsg));

  const fetchPrepare = useCallback(
    async (reason?: string, opts?: PrepareOptions) => {
      abortRef.current?.abort();

      const ac = new AbortController();
      abortRef.current = ac;

      const seq = ++seqRef.current;
      const soft = Boolean(opts?.soft);

      if (soft) setSoftLoading(true);
      else setLoading(true);

      if (!soft) setErrorMsg(null);

      try {
        const r = await fetch("/api/checkout/prepare", {
          method: "GET",
          signal: ac.signal,
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
        setStockIssue(null);
        setErrorMsg(null);

        if (nextSummary?.coupon?.code) {
          setCouponCode(String(nextSummary.coupon.code));
        } else {
          setCouponCode("");
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;

        const raw = e?.message || "PREPARE_FAILED";
        setErrorMsg(raw);

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
      if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);

      prepareTimerRef.current = setTimeout(() => {
        prepareTimerRef.current = null;
        if (!mountedRef.current) return;
        void fetchPrepare(reason, opts);
      }, delay);
    },
    [fetchPrepare],
  );

  useEffect(() => {
    mountedRef.current = true;

    void fetchPrepare("mount");

    const onRefresh = () => {
      schedulePrepare("refresh", { soft: true }, 120);
    };

    const onSummaryPatch = (evt: Event) => {
      const e = evt as CustomEvent<SummaryPatchEventDetail>;
      const detail = e?.detail || {};

      if (detail.summary) {
        setSummary(detail.summary);
        setErrorMsg(null);
        setStockIssue(null);

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

      if (reconcile) {
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

      if (prepareTimerRef.current) {
        clearTimeout(prepareTimerRef.current);
        prepareTimerRef.current = null;
      }

      abortRef.current?.abort();
    };
  }, [fetchPrepare, schedulePrepare]);

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setCouponBusy(true);
    setErrorMsg(null);
    setStockIssue(null);

    try {
      const r = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.message_ar || j?.error || "APPLY_COUPON_FAILED");
      }

      const nextSummary: Summary = j.summary as Summary;
      setSummary(nextSummary);

      if (nextSummary?.coupon?.code) {
        setCouponCode(String(nextSummary.coupon.code));
      } else {
        setCouponCode("");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "APPLY_COUPON_FAILED");
    } finally {
      setCouponBusy(false);
    }
  }

  async function removeCoupon() {
    setCouponBusy(true);
    setErrorMsg(null);
    setStockIssue(null);

    try {
      const r = await fetch("/api/checkout/remove-coupon", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.message_ar || j?.error || "REMOVE_COUPON_FAILED");
      }

      const nextSummary: Summary = j.summary as Summary;
      setSummary(nextSummary);
      setCouponCode("");
    } catch (e: any) {
      setErrorMsg(e?.message || "REMOVE_COUPON_FAILED");
    } finally {
      setCouponBusy(false);
    }
  }

  async function submitOrder() {
    if (!canSubmit) {
      setErrorMsg(INCOMPLETE_CHECKOUT_MESSAGE);
      return;
    }

    setSubmitBusy(true);
    setErrorMsg(null);
    setStockIssue(null);

    try {
      const r = await fetch("/api/checkout/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        if (j?.stock_issue) {
          setStockIssue(j.stock_issue);
          setErrorMsg(buildReadableSubmitError(j));
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
      setErrorMsg(e?.message || "SUBMIT_FAILED");
    } finally {
      setSubmitBusy(false);
    }
  }

  const couponButtonLabel = useMemo(() => {
    if (hasCouponApplied) return "إزالة";
    return "تطبيق";
  }, [hasCouponApplied]);

  const isInitialLoading = loading && !summary;
  const showSkeleton = isInitialLoading;
  const showPaymentFee = payment_fee != null && payment_fee > 0;
  const showOrderOptionsFee = order_options_fee != null && order_options_fee > 0;
  const showTaxRow = !showSkeleton && tax != null && tax > 0;
  const isIncompleteNotice = errorMsg === INCOMPLETE_CHECKOUT_MESSAGE;

  const submitButtonLabel = useMemo(() => {
    if (submitBusy) return "جاري تأكيد الطلب...";
    if (isInitialLoading || !hasTotals) return "جاري التجهيز...";
    if (!canSubmit) return "أكمل الخطوات أولًا";
    return "تأكيد الدفع";
  }, [submitBusy, isInitialLoading, hasTotals, canSubmit]);

  return (
    <>
      {submitBusy ? <SubmitFreezeOverlay /> : null}

      <Card className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5">
          <div className="rounded-[26px] border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[18px] font-black tracking-tight text-zinc-950">
                  ملخص الطلب
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] leading-5 text-zinc-500">
                  <span>
                    {showSkeleton ? "جاري تجهيز الملخص..." : `${itemCount} منتجات`}
                  </span>

                  {softLoading && summary ? (
                    <>
                      <span className="text-zinc-300">•</span>
                      <span
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-zinc-500"
                        aria-live="polite"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        تحديث الملخص
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {!isUnavailableState ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-bold text-zinc-500 shadow-sm">
                    <Lock className="h-3.5 w-3.5 text-zinc-700" />
                    آمن
                  </span>

                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-bold text-zinc-500 shadow-sm">
                    {currency}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

          {isUnavailableState ? (
            <CheckoutUnavailableCard
              message={buildReadablePrepareError(errorMsg)}
            />
          ) : (
            <>
              {stockIssue ? (
                <div className="mb-4 rounded-[24px] border border-amber-300/70 bg-amber-50/85 p-4 text-right">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-amber-950">
                        تغير المخزون قبل إتمام الطلب
                      </div>

                      <div className="mt-1 text-[13px] leading-6 text-amber-900">
                        {errorMsg}
                      </div>

                      <div className="mt-3 space-y-1 rounded-2xl border border-amber-200 bg-white/70 px-3 py-2 text-[12px] leading-6 text-amber-950">
                        <div>
                          <span className="font-bold">المنتج:</span>{" "}
                          {stockIssue.product_name}
                        </div>
                        <div>
                          <span className="font-bold">الكمية المطلوبة:</span>{" "}
                          {stockIssue.requested_qty}
                        </div>
                        <div>
                          <span className="font-bold">المتاح الآن:</span>{" "}
                          {stockIssue.available_qty}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl border-amber-300 bg-white font-black text-amber-950 hover:bg-amber-50"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("cart:changed"));
                            window.location.href = stockIssue.action_url || "/cart";
                          }}
                        >
                          تحديث حقيبة التسوق
                        </Button>

                        <Link
                          href={stockIssue.action_url || "/cart"}
                          className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 text-sm font-bold text-amber-950 transition hover:bg-amber-50"
                        >
                          العودة إلى السلة
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.035)]">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <div className="text-sm font-black text-zinc-950">المنتجات</div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      راجع المنتجات والكميات قبل التأكيد
                    </div>
                  </div>

                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-black text-zinc-500">
                    {showSkeleton ? "..." : itemCount}
                  </span>
                </div>

                {showSkeleton ? (
                  <div className="space-y-2.5">
                    <SummaryItemSkeleton />
                    <SummaryItemSkeleton />
                    <SummaryItemSkeleton />
                  </div>
                ) : items.length > 0 ? (
                  <div className="max-h-[244px] space-y-2 overflow-y-auto pe-1">
                    {items.map((item) => (
                      <SummaryItemRow key={item.id} item={item} currency={currency} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center">
                    <Package className="mx-auto h-5 w-5 text-zinc-400" />
                    <div className="mt-2 text-sm font-black text-zinc-700">
                      لا توجد منتجات في الملخص
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-4">
                <div className="space-y-2.5 text-[13px]">
                  <Row
                    label={
                      showTaxRow
                        ? "مجموع المنتجات (بدون ضريبة)"
                        : "مجموع المنتجات"
                    }
                    value={
                      showSkeleton
                        ? null
                        : subtotal == null
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-zinc-500">الخصم</div>
                      <div dir="ltr" className="font-black text-amber-800">
                        - {formatMoney(currency, discount)}
                      </div>
                    </div>
                  ) : null}

                  <Row
                    label="الشحن"
                    value={
                      showSkeleton
                        ? null
                        : shipping == null
                          ? null
                          : formatMoney(currency, shipping)
                    }
                  />

                  {showSkeleton ? (
                    <Row label="رسوم الدفع عند الاستلام" value={null} />
                  ) : showPaymentFee ? (
                    <Row
                      label="رسوم الدفع عند الاستلام"
                      value={formatMoney(currency, payment_fee ?? 0)}
                    />
                  ) : null}

                  {showSkeleton ? (
                    <Row label="خيارات الطلب" value={null} />
                  ) : showOrderOptionsFee ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-zinc-600">خيارات الطلب</div>
                        <div dir="ltr" className="font-black text-zinc-950">
                          {formatMoney(currency, order_options_fee ?? 0)}
                        </div>
                      </div>

                      {orderOptions.length > 0 ? (
                        <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
                          {orderOptions
                            .filter((item) => n(item.price_customer ?? item.priceCustomer) > 0)
                            .map((item) => (
                              <div
                                key={item.option_id ?? item.optionId ?? item.name}
                                className="flex items-center justify-between gap-2 text-[11px] leading-5"
                              >
                                <span className="truncate text-zinc-500">
                                  {item.name || "خيار الطلب"}
                                </span>
                                <span dir="ltr" className="font-black text-zinc-600">
                                  +{" "}
                                  {formatMoney(
                                    currency,
                                    n(item.price_customer ?? item.priceCustomer),
                                  )}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 rounded-[26px] bg-zinc-950 p-4 text-white shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-bold text-white/70">
                      الإجمالي
                    </div>
                    <div className="mt-0.5 text-[11px] leading-5 text-white/45">
                      {showTaxRow ? "شامل الضريبة والشحن" : "شامل الشحن"}
                      {showPaymentFee ? " ورسوم الدفع" : ""}
                      {showOrderOptionsFee ? " وخيارات الطلب" : ""}
                    </div>
                  </div>

                  {showSkeleton || total == null ? (
                    <div className="h-8 w-28 animate-pulse rounded-full bg-white/15" />
                  ) : (
                    <div
                      dir="ltr"
                      className="text-[30px] font-black tracking-tight text-white"
                    >
                      {formatMoney(currency, total)}
                    </div>
                  )}
                </div>
              </div>

              {showTaxRow ? (
                <div className="mt-2 text-center text-[11px] font-bold leading-5 text-zinc-500">
                  * الأسعار شاملة للضريبة
                </div>
              ) : null}

              {!canSubmit && hasTotals ? (
                <div className="mt-3 rounded-[22px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-right">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-800 shadow-sm">
                      <LockKeyhole className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-amber-950">
                        بقيت خطوات بسيطة
                      </div>
                      <div className="mt-0.5 text-[12px] leading-6 text-amber-800">
                        أكمل العنوان، ثم الشحن، ثم طريقة الدفع وخيارات الطلب المطلوبة لتفعيل تأكيد الطلب.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 rounded-[22px] border border-zinc-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700">
                      <Ticket className="h-4 w-4" />
                    </span>

                    <div>
                      <div className="text-sm font-black text-zinc-950">
                        كوبون خصم
                      </div>
                      <div className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                        يُطبّق مباشرة على الإجمالي
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-bold text-zinc-500">
                    اختياري
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="أدخل رمز الكوبون"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (isIncompleteNotice) setErrorMsg(null);
                    }}
                    className="h-10 rounded-2xl border-zinc-200 bg-white text-[13px] focus-visible:ring-2 focus-visible:ring-zinc-950/10"
                    disabled={couponBusy || loading || submitBusy}
                  />

                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl border-zinc-200 bg-white px-4 text-[13px] font-black text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.99]"
                    disabled={
                      loading ||
                      submitBusy ||
                      couponBusy ||
                      (!hasCouponApplied && !couponCode.trim())
                    }
                    onClick={hasCouponApplied ? removeCoupon : applyCoupon}
                  >
                    {couponBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      couponButtonLabel
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  className={[
                    "h-12 w-full rounded-[22px] text-[16px] font-black",
                    "text-white shadow-[0_16px_42px_rgba(15,23,42,0.22)]",
                    "transition hover:bg-zinc-800 active:scale-[0.99]",
                    canSubmit ? "bg-zinc-950" : "border border-zinc-800 bg-zinc-900",
                    "disabled:bg-zinc-300 disabled:text-white disabled:shadow-none",
                  ].join(" ")}
                  disabled={loading || submitBusy || !hasTotals}
                  onClick={submitOrder}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {submitBusy || loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : canSubmit ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <LockKeyhole className="h-4 w-4" />
                    )}

                    {submitButtonLabel}
                  </span>
                </Button>

                <div className="mt-2 text-center text-[11px] leading-relaxed text-zinc-500">
                  بالضغط على “تأكيد الدفع” سيتم إنشاء الطلب ومتابعته حسب بياناتك
                  المختارة.
                </div>

                {errorMsg && !stockIssue ? (
                  <div
                    className={[
                      "mt-2 rounded-2xl px-3 py-2 text-center text-[11px] font-bold leading-5",
                      isIncompleteNotice
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "border border-red-500/15 bg-red-500/5 text-red-700",
                    ].join(" ")}
                  >
                    {isCartEmptyError(errorMsg)
                      ? "تعذر إكمال الدفع لأن بعض المنتجات لم تعد متاحة."
                      : errorMsg}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  دفع آمن ومشفّر
                </span>

                <Link
                  href="/cart"
                  className="inline-flex items-center gap-1 font-bold transition hover:text-zinc-950"
                >
                  رجوع للسلة <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-white p-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.035)] transition hover:border-zinc-300">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-zinc-400">
              <Package className="h-5 w-5" />
            </div>
          )}

          <span className="absolute right-1 top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-zinc-950 px-1 text-[10px] font-black leading-none text-white">
            {qty}
          </span>
        </div>

        <div className="min-w-0">
          <div className="line-clamp-2 text-[13px] font-black leading-5 text-zinc-950">
            {item.title}
          </div>

          <div className="mt-0.5 text-[11px] leading-4 text-zinc-500">
            الكمية: {qty}
          </div>
        </div>
      </div>

      <div dir="ltr" className="shrink-0 text-[13px] font-black text-zinc-950">
        {formatMoney(currency, lineTotal)}
      </div>
    </div>
  );
});

function SummaryItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-white p-2.5">
      <div className="h-14 w-14 animate-pulse rounded-2xl bg-zinc-100" />

      <div className="min-w-0 flex-1">
        <div className="h-4 w-32 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-zinc-100" />
      </div>

      <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-100" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-zinc-500">{label}</div>

      {value == null ? (
        <SkeletonText widthClass="w-16" heightClass="h-4" />
      ) : (
        <div dir="ltr" className="font-black text-zinc-950">
          {value}
        </div>
      )}
    </div>
  );
}

function SkeletonText({
  widthClass,
  heightClass,
}: {
  widthClass: string;
  heightClass: string;
}) {
  return (
    <div
      className={[
        "animate-pulse rounded-full bg-zinc-200",
        widthClass,
        heightClass,
      ].join(" ")}
      aria-hidden
    />
  );
}

function formatMoney(currency: string, v: number) {
  return `${currency} ${Number(v).toLocaleString("en-US")}`;
}