// FILE: apps/storefront/src/app/checkout/_components/MobileSummarySheet.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  ShoppingCart,
  Ticket,
} from "lucide-react";

type Summary = {
  cart_id: string;
  currency: string;
  subtotal: number;
  discount: number;
  shipping: number;
  payment_fee?: number;
  payment_method?: string | null;
  tax?: number;
  total: number;
  coupon: null | { code: string; discount: number };
};

type SummaryPatchEventDetail = {
  patch?: Partial<
    Pick<
      Summary,
      | "shipping"
      | "discount"
      | "payment_fee"
      | "payment_method"
      | "tax"
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
  order?: any;
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

function applyPatch(base: Summary, patch: Partial<Summary>): Summary {
  const next: Summary = { ...base, ...patch };

  const subtotal = n(next.subtotal);
  const shipping = n(next.shipping);
  const payment_fee = n(next.payment_fee);
  const discount = n(next.discount);
  const tax = n(next.tax);

  next.total = round2(
    Math.max(0, subtotal - discount) + shipping + payment_fee + tax,
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
      return `المنتج "${issue.product_name}" نفدت كميته. حدّث حقيبة التسوق للمتابعة.`;
    }

    return `المنتج "${issue.product_name}" لم تعد كميته المتاحة كافية. المطلوب ${issue.requested_qty} والمتاح الآن ${issue.available_qty}.`;
  }

  if (isCartEmptyError(j?.message_ar || j?.error)) {
    return "بعض المنتجات في طلبك لم تعد متاحة أو لم تعد قابلة للشراء، لذلك يلزم مراجعة السلة أولاً.";
  }

  return j?.message_ar || j?.error || "تعذر إتمام الطلب.";
}

function extractThankYouToken(j: any): string | null {
  const o = j?.order ?? j?.data?.order ?? null;
  const token =
    o?.public_token ??
    o?.publicToken ??
    o?.public_no ??
    o?.publicNo ??
    o?.order_number ??
    o?.orderNumber ??
    o?.order_no ??
    o?.orderNo ??
    null;

  if (token == null) return null;

  const value = String(token).trim();
  return value ? value : null;
}

function CheckoutSubmitOverlay() {
  return (
    <div className="fixed inset-0 z-[98] flex cursor-wait items-center justify-center bg-white/45 backdrop-blur-[1px] lg:hidden">
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-[12px] font-black text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
        جاري تأكيد الطلب...
      </div>
    </div>
  );
}

export default function MobileSummarySheet() {
  const [open, setOpen] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponErrorMsg, setCouponErrorMsg] = useState<string | null>(null);

  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState<StockIssue | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const currency = summary?.currency ?? "SAR";
  const hasTotals = Boolean(summary);

  const subtotal = summary ? n(summary.subtotal) : null;
  const shipping = summary ? n(summary.shipping) : null;
  const payment_fee = summary ? n(summary.payment_fee) : 0;
  const tax = summary ? n(summary.tax) : 0;
  const discount = summary ? n(summary.discount) : null;
  const total = summary ? n(summary.total) : null;

  const showPaymentFee = payment_fee > 0;
  const showTax = tax > 0;
  const hasCouponApplied = Boolean(summary?.coupon?.code);

  const fetchPrepare = useCallback(
    async (reason?: string, opts?: PrepareOptions) => {
      abortRef.current?.abort();

      const ac = new AbortController();
      abortRef.current = ac;

      const seq = ++seqRef.current;
      const soft = Boolean(opts?.soft);

      if (soft) {
        setSoftLoading(true);
      } else {
        setLoading(true);
      }

      try {
        const r = await fetch("/api/checkout/prepare", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: ac.signal,
          headers: { "Cache-Control": "no-store" },
        });

        const j = await r.json().catch(() => ({}));

        if (seq !== seqRef.current) return;

        if (!r.ok || !j?.ok) {
          throw new Error(
            j?.message_ar || j?.error || reason || "PREPARE_FAILED",
          );
        }

        const nextSummary: Summary = j.summary;
        setSummary(nextSummary);
        setStockIssue(null);

        if (nextSummary?.coupon?.code) {
          setCouponCode(String(nextSummary.coupon.code));
        } else {
          setCouponCode("");
        }

        setCouponErrorMsg(null);
      } catch (e: any) {
        if (e?.name === "AbortError") return;

        setSummary((prev) => prev ?? null);
      } finally {
        if (seq === seqRef.current) {
          if (soft) {
            setSoftLoading(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [],
  );

  const schedulePrepare = useCallback(
    (reason?: string, opts?: PrepareOptions, delay = 120) => {
      if (prepareTimerRef.current) {
        clearTimeout(prepareTimerRef.current);
      }

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
        setStockIssue(null);

        if (detail.summary?.coupon?.code) {
          setCouponCode(String(detail.summary.coupon.code));
        } else {
          setCouponCode("");
        }

        setCouponErrorMsg(null);
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

      window.removeEventListener(
        "checkout:refresh",
        onRefresh as EventListener,
      );
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

  useEffect(() => {
    if (canSubmit && submitErrorMsg === INCOMPLETE_CHECKOUT_MESSAGE) {
      setSubmitErrorMsg(null);
    }
  }, [canSubmit, submitErrorMsg]);

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code || couponBusy || submitBusy) return;

    setCouponBusy(true);
    setCouponErrorMsg(null);
    setSubmitErrorMsg(null);
    setStockIssue(null);

    try {
      const r = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
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

      setCouponErrorMsg(null);
    } catch (e: any) {
      setCouponErrorMsg(e?.message || "تعذر تطبيق الكوبون.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function removeCoupon() {
    if (couponBusy || submitBusy) return;

    setCouponBusy(true);
    setCouponErrorMsg(null);
    setSubmitErrorMsg(null);
    setStockIssue(null);

    try {
      const r = await fetch("/api/checkout/remove-coupon", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.message_ar || j?.error || "REMOVE_COUPON_FAILED");
      }

      const nextSummary: Summary = j.summary as Summary;
      setSummary(nextSummary);
      setCouponCode("");

      setCouponErrorMsg(null);
    } catch (e: any) {
      setCouponErrorMsg(e?.message || "تعذر إزالة الكوبون.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function submitOrder() {
    if (submitBusy) return;

    if (!canSubmit) {
      setOpen(true);
      setStockIssue(null);
      setSubmitErrorMsg(INCOMPLETE_CHECKOUT_MESSAGE);
      return;
    }

    if (!hasTotals) return;

    setSubmitBusy(true);
    setSubmitErrorMsg(null);
    setStockIssue(null);

    try {
      const r = await fetch("/api/checkout/submit", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const j = (await r.json().catch(() => ({}))) as ApiErrorResponse;

      if (!r.ok || !j?.ok) {
        if (j?.summary) {
          setSummary(j.summary);
        }

        if (j?.stock_issue) {
          setOpen(true);
          setStockIssue(j.stock_issue);
          setSubmitErrorMsg(buildReadableSubmitError(j));
          schedulePrepare("stock-issue", { soft: true }, 120);
          return;
        }

        throw new Error(buildReadableSubmitError(j));
      }

      const token = extractThankYouToken(j);

      if (!token) {
        throw new Error("ORDER_TOKEN_MISSING");
      }

      setOpen(false);
      window.location.href = `/thankyou/${encodeURIComponent(token)}`;
    } catch (e: any) {
      const msg =
        e?.message === "ORDER_TOKEN_MISSING"
          ? "تم إنشاء الطلب لكن لم يصل رقم الطلب من السيرفر."
          : e?.message || "تعذر إتمام الطلب.";

      setOpen(true);
      setSubmitErrorMsg(msg);
    } finally {
      if (mountedRef.current) {
        setSubmitBusy(false);
      }
    }
  }

  const isInitialLoading = loading && !summary;
  const summaryBusy = isInitialLoading || submitBusy || !hasTotals;
  const isIncompleteNotice = submitErrorMsg === INCOMPLETE_CHECKOUT_MESSAGE;

  const ctaLabel = useMemo(() => {
    if (submitBusy) return "جاري التأكيد...";
    if (isInitialLoading || !hasTotals) return "جاري التجهيز...";
    if (!canSubmit) return "أكمل الخطوات";
    return "تأكيد الدفع";
  }, [submitBusy, isInitialLoading, hasTotals, canSubmit]);

  return (
    <>
      {submitBusy ? <CheckoutSubmitOverlay /> : null}

      <div aria-hidden className="h-[102px] lg:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/97 shadow-[0_-14px_34px_rgba(15,23,42,0.11)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-7xl px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (submitBusy) return;
                setOpen(true);
              }}
              className="group flex h-[54px] min-w-0 items-center justify-between rounded-[23px] border border-zinc-200 bg-zinc-50/90 px-3 text-right shadow-[0_8px_22px_rgba(15,23,42,0.045)] transition active:scale-[0.99]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-full border border-zinc-200 bg-white px-1.5 text-[10px] font-black text-zinc-500"
                  >
                    {currency}
                  </Badge>

                  <span className="text-[10px] font-bold text-zinc-500">
                    إجمالي الطلب
                  </span>

                  {softLoading ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                  ) : null}
                </div>

                <div className="mt-0.5">
                  {total == null ? (
                    <span className="inline-block h-5 w-20 animate-pulse rounded-full bg-zinc-200" />
                  ) : (
                    <span
                      dir="ltr"
                      className="block truncate text-[17px] font-black leading-6 tracking-tight text-zinc-950"
                    >
                      {formatMoney(currency, total)}
                    </span>
                  )}
                </div>
              </div>

              <span className="ms-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 transition group-hover:bg-zinc-50">
                ↑
              </span>
            </button>

            <Button
              className={[
                "h-[54px] rounded-[23px] px-2 text-[13px] font-black text-white",
                "shadow-[0_12px_28px_rgba(15,23,42,0.2)] transition active:scale-[0.99]",
                canSubmit
                  ? "bg-zinc-950 hover:bg-zinc-800"
                  : "border border-zinc-800 bg-zinc-900 hover:bg-zinc-800",
                "disabled:bg-zinc-300 disabled:text-white disabled:shadow-none",
              ].join(" ")}
              disabled={summaryBusy}
              onClick={submitOrder}
            >
              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                {submitBusy || summaryBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : canSubmit ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}

                {ctaLabel}
              </span>
            </Button>
          </div>

          {submitErrorMsg && !open ? (
            <div
              className={[
                "mt-1.5 rounded-2xl px-3 py-1.5 text-center text-[11px] font-bold leading-5",
                isIncompleteNotice
                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                  : "bg-red-50 text-red-600",
              ].join(" ")}
            >
              {submitErrorMsg}
            </div>
          ) : null}
        </div>
      </div>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (submitBusy) return;
          setOpen(next);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[82svh] overflow-y-auto rounded-t-[28px] border-t border-zinc-200 bg-white p-0"
        >
          <div className="px-4 pb-4 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-200" />

            <SheetHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-black text-zinc-950">
                  تفاصيل الطلب
                </SheetTitle>

                <Badge
                  variant="secondary"
                  className="rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600"
                >
                  {currency}
                </Badge>
              </div>

              <div className="text-xs text-zinc-500">
                راجع ملخص الطلب قبل التأكيد
              </div>
            </SheetHeader>

            <div className="mt-4 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
              <div className="space-y-3 text-sm">
                <Row
                  label="ملخص السلة"
                  value={
                    subtotal == null ? null : formatMoney(currency, subtotal)
                  }
                />

                <Row
                  label="الشحن"
                  value={
                    shipping == null ? null : formatMoney(currency, shipping)
                  }
                />

                {showPaymentFee ? (
                  <Row
                    label="رسوم الدفع عند الاستلام"
                    value={formatMoney(currency, payment_fee)}
                  />
                ) : null}

                {showTax ? (
                  <Row label="الضريبة" value={formatMoney(currency, tax)} />
                ) : null}

                {discount != null && discount > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-500">خصم</div>

                    <div dir="ltr" className="font-black text-amber-800">
                      - {formatMoney(currency, discount)}
                    </div>
                  </div>
                ) : null}

                <Separator className="my-1 bg-zinc-200" />

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="font-black text-zinc-950">الإجمالي</div>

                    <div className="text-xs text-zinc-500">
                      شامل الشحن
                      {showPaymentFee ? " ورسوم الدفع" : ""}
                      {showTax ? " والضريبة" : ""}
                    </div>
                  </div>

                  {total == null ? (
                    <SkeletonText widthClass="w-28" heightClass="h-7" />
                  ) : (
                    <div
                      dir="ltr"
                      className="text-2xl font-black tracking-tight text-zinc-950"
                    >
                      {formatMoney(currency, total)}
                    </div>
                  )}
                </div>
              </div>

              {softLoading ? (
                <div className="mt-3 inline-flex w-full items-center justify-center gap-2 text-center text-[11px] font-bold text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري تحديث الملخص...
                </div>
              ) : null}
            </div>

            {stockIssue ? (
              <div className="mt-3 rounded-[22px] border border-amber-300/70 bg-amber-50 px-3.5 py-3 text-right">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-800 shadow-sm">
                    <AlertTriangle className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-amber-950">
                      تغير المخزون قبل إتمام الطلب
                    </div>

                    <div className="mt-0.5 text-[12px] leading-6 text-amber-800">
                      {submitErrorMsg}
                    </div>

                    <div className="mt-2 rounded-2xl border border-amber-200 bg-white/75 px-3 py-2 text-[12px] leading-6 text-amber-950">
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

                    <Button
                      type="button"
                      className="mt-3 h-10 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white hover:bg-zinc-800"
                      disabled={submitBusy}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("cart:changed"));
                        window.location.href = stockIssue.action_url || "/cart";
                      }}
                    >
                      <ShoppingCart className="me-2 h-4 w-4" />
                      تحديث حقيبة التسوق
                    </Button>
                  </div>
                </div>
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
                      أكمل العنوان، ثم الشحن، ثم طريقة الدفع لتفعيل زر تأكيد
                      الطلب.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <Ticket className="h-4 w-4" />
                  </span>

                  <div>
                    <div className="text-sm font-black text-zinc-950">
                      كوبون خصم
                    </div>

                    <div className="text-xs text-zinc-500">
                      يُطبّق مباشرة على الإجمالي
                    </div>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500"
                >
                  اختياري
                </Badge>
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="أدخل رمز الكوبون"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    if (couponErrorMsg) setCouponErrorMsg(null);
                  }}
                  className="h-11 rounded-2xl border-zinc-200 bg-white"
                  disabled={couponBusy || submitBusy}
                />

                <Button
                  className="h-11 rounded-2xl bg-zinc-950 px-5 text-[13px] font-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-white"
                  disabled={
                    submitBusy ||
                    couponBusy ||
                    (!hasCouponApplied && !couponCode.trim())
                  }
                  onClick={hasCouponApplied ? removeCoupon : applyCoupon}
                >
                  {couponBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasCouponApplied ? (
                    "إزالة"
                  ) : (
                    "تطبيق"
                  )}
                </Button>
              </div>

              {couponErrorMsg ? (
                <div className="mt-2 text-right text-[12px] text-red-600">
                  {couponErrorMsg}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <Button
                className={[
                  "h-12 w-full rounded-[24px] text-base font-black text-white",
                  "shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-[0.99]",
                  canSubmit
                    ? "bg-zinc-950 hover:bg-zinc-800"
                    : "border border-zinc-800 bg-zinc-900 hover:bg-zinc-800",
                  "disabled:bg-zinc-300 disabled:text-white disabled:shadow-none",
                ].join(" ")}
                disabled={summaryBusy}
                onClick={submitOrder}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {submitBusy || summaryBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : canSubmit ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <LockKeyhole className="h-4 w-4" />
                  )}

                  {ctaLabel}
                </span>
              </Button>

              {submitErrorMsg && !stockIssue ? (
                <div
                  className={[
                    "mt-2 rounded-2xl px-3 py-2 text-center text-[11px] font-bold leading-5",
                    isIncompleteNotice
                      ? "border border-amber-200 bg-amber-50 text-amber-800"
                      : "bg-red-50 text-red-600",
                  ].join(" ")}
                >
                  {submitErrorMsg}
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  دفع آمن
                </span>

                <Link
                  href="/cart"
                  className="inline-flex items-center gap-1 font-bold transition hover:text-zinc-950"
                >
                  رجوع للسلة <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-2 text-center text-[11px] leading-relaxed text-zinc-500">
                بالضغط على “تأكيد الدفع” سيتم إنشاء الطلب ومتابعته حسب بياناتك
                المختارة.
              </div>
            </div>

            <div className="h-6" />
          </div>
        </SheetContent>
      </Sheet>
    </>
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
      className={`animate-pulse rounded-full bg-zinc-200 ${widthClass} ${heightClass}`}
      aria-hidden
    />
  );
}

function formatMoney(currency: string, v: number) {
  return `${currency} ${Number(v).toLocaleString("en-US")}`;
}