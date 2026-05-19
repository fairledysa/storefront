// FILE: apps/storefront/src/app/checkout/_components/PaymentStep.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

type PaymentDisabledHelp =
  | {
      kind: "cod_untrusted_customer";
      title: string;
      message: string;
      records: Array<{
        store_name: string;
        reason_text: string;
        reason_note?: string | null;
        created_at?: string | null;
      }>;
    }
  | null;

type PaymentOption = {
  id: string;
  type: "cod" | "bank_transfer" | "provider";
  title: string;
  subtitle?: string | null;
  fee_text?: string | null;
  recommended?: boolean;
  disabled?: boolean;
  disabled_reason?: string | null;
  disabled_help?: PaymentDisabledHelp;
};

type ConfirmResult = {
  ok?: boolean;
  summary?: any;
  cart?: any;
  order?: any;
  state?: any;
};

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function dispatchCheckoutEvent(name: string, detail?: any) {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }, 0);
}

function pushSummary(summary: any) {
  if (summary) {
    dispatchCheckoutEvent("checkout:summaryPatch", {
      summary,
      reconcile: false,
    });
  } else {
    dispatchCheckoutEvent("checkout:refresh");
  }
}

function setSubmitEnabled(enabled: boolean) {
  dispatchCheckoutEvent("checkout:submitEnabled", { enabled });
}

function fmtDate(value?: string | null) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function humanizePaymentDisabledReason(reason?: string | null) {
  const value = String(reason ?? "").trim();

  if (!value) return "الدفع عند الاستلام غير متاح حاليًا.";

  const map: Record<string, string> = {
    NEED_SHIPPING: "اختر شركة الشحن أولًا لتأكيد توفر الدفع عند الاستلام.",
    COD_NOT_AVAILABLE: "الدفع عند الاستلام غير متاح مع طريقة الشحن المختارة.",

    COD_NOT_ENABLED_FOR_SHIPPING_RATE:
      "الدفع عند الاستلام غير مفعل لطريقة الشحن الحالية.",
    SHIPPING_RATE_NOT_FOUND: "طريقة الشحن الحالية غير متاحة.",
    SHIPPING_CARRIER_DISABLED: "طريقة الشحن الحالية غير مفعلة.",
    COD_NOT_AVAILABLE_FOR_PICKUP:
      "الدفع عند الاستلام غير متاح مع الاستلام من الفرع.",

    COD_MINIMUM_SUBTOTAL:
      "الدفع عند الاستلام غير متاح لأن إجمالي المشتريات أقل من الحد الأدنى.",
    COD_MIN_SUBTOTAL:
      "الدفع عند الاستلام غير متاح لأن إجمالي المشتريات أقل من الحد الأدنى.",

    COD_MAXIMUM_SUBTOTAL:
      "الدفع عند الاستلام غير متاح لأن إجمالي المشتريات أعلى من الحد الأعلى.",
    COD_MAX_SUBTOTAL:
      "الدفع عند الاستلام غير متاح لأن إجمالي المشتريات أعلى من الحد الأعلى.",

    COD_MAXIMUM_WEIGHT:
      "الدفع عند الاستلام غير متاح لأن وزن المنتجات في السلة أعلى من الحد المسموح.",
    COD_MAXIMUM_WEIGHT_KG:
      "الدفع عند الاستلام غير متاح لأن وزن المنتجات في السلة أعلى من الحد المسموح.",
    COD_MAX_WEIGHT:
      "الدفع عند الاستلام غير متاح لأن وزن المنتجات في السلة أعلى من الحد المسموح.",

    COD_PRODUCT_EXCLUDED:
      "الدفع عند الاستلام غير متاح لأن السلة تحتوي على منتج مستثنى.",
    COD_EXCLUDED_PRODUCT:
      "الدفع عند الاستلام غير متاح لأن السلة تحتوي على منتج مستثنى.",

    COD_CATEGORY_EXCLUDED:
      "الدفع عند الاستلام غير متاح لأن السلة تحتوي على منتج من تصنيف مستثنى.",
    COD_EXCLUDED_CATEGORY:
      "الدفع عند الاستلام غير متاح لأن السلة تحتوي على منتج من تصنيف مستثنى.",

    COD_UNTRUSTED_CUSTOMER: "الدفع عند الاستلام غير متاح لك مؤقتًا.",
    COD_BLOCKED_CUSTOMER: "الدفع عند الاستلام غير متاح لك مؤقتًا.",

    COD_RESTRICTED: "الدفع عند الاستلام غير متاح حسب قيود المتجر.",
    COD_RESTRICTION_FAILED: "الدفع عند الاستلام غير متاح حسب قيود المتجر.",
  };

  return map[value] || "الدفع عند الاستلام غير متاح حسب قيود المتجر.";
}

async function fetchPaymentOptionsFresh() {
  const r = await fetch("/api/checkout/payment/options", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
    },
  });

  const j = await safeJson(r);

  if (!r.ok) {
    throw new Error(j?.message_ar || j?.error || "PAYMENT_OPTIONS_FAILED");
  }

  return Array.isArray(j?.options) ? (j.options as PaymentOption[]) : [];
}

export type PaymentStepProps = {
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  onEdit: () => void;
  onConfirm: (result?: ConfirmResult | null) => void | Promise<void>;
  confirmedId?: string;
};

function PaymentSkeleton() {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2.5">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={[
            "rounded-[18px] px-3 py-3 sm:rounded-[20px] sm:border sm:border-zinc-200 sm:bg-white sm:p-3.5",
            "border border-transparent bg-transparent",
          ].join(" ")}
        >
          <div className="h-4 w-36 animate-pulse rounded-full bg-zinc-100" />
          <div className="mt-2 h-3 w-44 animate-pulse rounded-full bg-zinc-100" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

export default function PaymentStep({
  isActive,
  isDone,
  isLocked,
  onEdit,
  onConfirm,
  confirmedId,
}: PaymentStepProps) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [method, setMethod] = useState<string>(confirmedId ?? "");
  const [syncedMethod, setSyncedMethod] = useState<string>(confirmedId ?? "");

  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [helpModal, setHelpModal] = useState<PaymentDisabledHelp>(null);

  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  const syncSeqRef = useRef(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<string>(confirmedId ?? "");

  function pickDefaultMethod(list: PaymentOption[], current?: string) {
    if (current && list.some((x) => x.id === current && !x.disabled)) {
      return current;
    }

    const rec = list.find((x) => x.recommended && !x.disabled);
    const first = list.find((x) => !x.disabled);

    return (rec ?? first)?.id ?? "";
  }

  async function loadOptions() {
    if (isLocked || !isActive) return;

    const seq = ++loadSeqRef.current;

    setLoading(true);
    setErrorMsg("");
    setSubmitEnabled(false);

    try {
      const list = await fetchPaymentOptionsFresh();

      if (!mountedRef.current || seq !== loadSeqRef.current) return;

      setOptions(list);

      setMethod((current) => {
        if (confirmedId) return confirmedId;

        const next = pickDefaultMethod(list, current);

        if (next && lastSyncedRef.current !== next) {
          setSyncedMethod("");
        }

        return next;
      });
    } catch (e: any) {
      if (!mountedRef.current || seq !== loadSeqRef.current) return;

      setOptions([]);
      setMethod("");
      setSyncedMethod("");
      setErrorMsg(e?.message || "تعذر تحميل طرق الدفع.");
      setSubmitEnabled(false);
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }

  async function syncPaymentMethod(nextId: string, opts?: { force?: boolean }) {
    if (isLocked || !isActive) return null;
    if (!nextId) return null;

    const row = options.find((x) => x.id === nextId);
    if (!row || row.disabled) return null;

    if (!opts?.force && lastSyncedRef.current === nextId) {
      setSyncedMethod(nextId);
      return { ok: true, summary: null } as ConfirmResult;
    }

    const seq = ++syncSeqRef.current;

    setSavingId(nextId);
    setSubmitEnabled(false);
    setErrorMsg("");

    try {
      const r = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ payment_method: nextId }),
      });

      const j = (await safeJson(r)) as ConfirmResult | any;

      if (!mountedRef.current || seq !== syncSeqRef.current) return null;

      if (!r.ok || !j?.ok) {
        setErrorMsg(j?.message_ar || j?.error || "تعذر اعتماد طريقة الدفع.");
        setSyncedMethod("");
        setSubmitEnabled(false);
        return null;
      }

      lastSyncedRef.current = nextId;
      setSyncedMethod(nextId);
      setErrorMsg("");
      pushSummary(j?.summary ?? null);

      return j as ConfirmResult;
    } finally {
      if (mountedRef.current && seq === syncSeqRef.current) {
        setSavingId("");
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSeqRef.current += 1;
      syncSeqRef.current += 1;

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (confirmedId) {
      setMethod(confirmedId);
      setSyncedMethod(confirmedId);
      lastSyncedRef.current = confirmedId;
    }
  }, [confirmedId]);

  useEffect(() => {
    if (isLocked || !isActive) {
      setSubmitEnabled(false);
      return;
    }

    void loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isActive]);

  useEffect(() => {
    const enabled = Boolean(
      isDone &&
        isActive &&
        !isLocked &&
        method &&
        syncedMethod === method &&
        !loading &&
        !busy &&
        !savingId,
    );

    setSubmitEnabled(enabled);
  }, [isDone, isActive, isLocked, method, syncedMethod, loading, busy, savingId]);

  useEffect(() => {
    if (!isActive || isLocked || isDone || loading || busy || savingId) return;
    if (!method || syncedMethod === method || options.length === 0) return;

    const row = options.find((x) => x.id === method);
    if (!row || row.disabled) return;

    setSubmitEnabled(false);

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;

      void syncPaymentMethod(method).then((result) => {
        if (!mountedRef.current) return;

        if (!result?.ok) {
          setSyncedMethod("");
          return;
        }

        if (result.summary) {
          pushSummary(result.summary);
        }
      });
    }, 80);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, options, isActive, isLocked, isDone, loading, busy]);

  const picked = useMemo(() => {
    const id = confirmedId ?? method;
    return options.find((m) => m.id === id);
  }, [confirmedId, method, options]);

  function onPick(nextId: string) {
    if (isLocked || !isActive || isDone || busy || loading || savingId) return;

    const row = options.find((x) => x.id === nextId);
    if (!nextId || !row || row.disabled) return;

    setMethod(nextId);
    setSyncedMethod("");
    setErrorMsg("");
    setSubmitEnabled(false);
  }

  async function confirmPayment() {
    const id = method;
    if (!id) return;

    const row = options.find((x) => x.id === id);
    if (!row || row.disabled) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    setBusy(true);
    setSubmitEnabled(false);
    setErrorMsg("");

    try {
      const result =
        syncedMethod === id && lastSyncedRef.current === id
          ? ({ ok: true, summary: null } as ConfirmResult)
          : await syncPaymentMethod(id, {
              force: lastSyncedRef.current !== id,
            });

      if (!result?.ok) {
        setSyncedMethod("");
        return;
      }

      if (result.summary) {
        pushSummary(result.summary);
      }

      await onConfirm(result);
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  if (isDone && picked) {
    return (
      <StepShell
        title="الدفع"
        subtitle="تم اختيار طريقة الدفع — يمكنك تعديلها قبل التأكيد"
        icon={<CreditCard className="h-5 w-5 text-zinc-800" />}
        isActive={isActive}
        isDone
        isLocked={false}
        onEdit={busy || Boolean(savingId) ? undefined : onEdit}
      >
        <div className="rounded-[18px] border border-amber-700/25 bg-[#fffaf1] px-3 py-3 sm:rounded-[22px] sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="text-sm font-black text-zinc-950">
              {picked.title}
            </div>

            <span className="rounded-full border border-amber-900/15 bg-white px-2 py-0.5 text-[11px] font-black text-stone-700 sm:text-[12px]">
              محدد
            </span>

            {picked.recommended ? (
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:text-[12px]">
                موصى به
              </span>
            ) : null}
          </div>

          {picked.subtitle ? (
            <div className="mt-1 text-[12px] leading-6 text-zinc-500 sm:text-[13px]">
              {picked.subtitle}
            </div>
          ) : null}

          {picked.fee_text ? (
            <div className="mt-2 inline-flex max-w-full rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] leading-5 text-zinc-500 sm:text-[12px]">
              {picked.fee_text}
            </div>
          ) : null}
        </div>
      </StepShell>
    );
  }

  const disabledUI = isLocked || !isActive || busy || Boolean(savingId);
  const isWorking = busy || Boolean(savingId);
  const canConfirmPayment = Boolean(
    method && syncedMethod === method && !isWorking && !loading,
  );

  return (
    <StepShell
      title="الدفع"
      subtitle={isLocked ? "أكمل الشحن أولًا" : "اختر طريقة الدفع المناسبة"}
      icon={<CreditCard className="h-5 w-5 text-zinc-800" />}
      isActive={isActive}
      isDone={false}
      isLocked={isLocked}
      rightChip={<span>الخطوة 3</span>}
    >
      {loading ? (
        <PaymentSkeleton />
      ) : errorMsg && options.length === 0 ? (
        <div className="rounded-[18px] border border-red-500/15 bg-red-500/5 px-4 py-4 text-center text-[13px] leading-6 text-red-700 sm:rounded-[20px]">
          {errorMsg}
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center sm:rounded-[20px]">
          <div className="text-sm font-black text-zinc-800">
            لا توجد طرق دفع متاحة
          </div>

          <div className="mt-1 text-[13px] leading-6 text-zinc-500">
            جرّب لاحقًا أو تواصل مع المتجر.
          </div>
        </div>
      ) : (
        <div
          className={[
            "grid gap-1.5 sm:grid-cols-2 sm:gap-2.5",
            disabledUI ? "pointer-events-none opacity-80" : "",
          ].join(" ")}
        >
          {options.map((option) => {
            const selected = option.id === method;
            const isSyncing = savingId === option.id;
            const disabledReason = humanizePaymentDisabledReason(
              option.disabled_reason,
            );

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (option.disabled) return;
                  onPick(option.id);
                }}
                className={[
                  "rounded-[18px] px-3 py-3 text-right transition active:scale-[0.997] sm:rounded-[22px] sm:border sm:p-3.5",
                  selected
                    ? "border border-amber-700/30 bg-[#fffaf1] shadow-none sm:shadow-[0_12px_32px_rgba(15,23,42,0.055)]"
                    : "border border-transparent bg-transparent hover:bg-zinc-50 sm:border-zinc-200 sm:bg-white",
                  option.disabled
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-500"
                    : "cursor-pointer",
                ].join(" ")}
                aria-disabled={option.disabled ? "true" : "false"}
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div
                    className={[
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-black",
                      selected
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-transparent",
                    ].join(" ")}
                  >
                    ✓
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                      <div className="min-w-0 max-w-full truncate text-sm font-black text-zinc-950">
                        {option.title}
                      </div>

                      {selected ? (
                        <span className="rounded-full border border-amber-900/15 bg-white px-2 py-0.5 text-[11px] font-black text-stone-700 sm:text-[12px]">
                          محدد
                        </span>
                      ) : null}

                      {option.recommended ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:bg-zinc-50 sm:text-[12px]">
                          موصى به
                        </span>
                      ) : null}
                    </div>

                    {!option.disabled && option.subtitle ? (
                      <div className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-zinc-500 sm:text-[13px]">
                        {option.subtitle}
                      </div>
                    ) : null}

                    {option.fee_text ? (
                      <div className="mt-2 inline-flex max-w-full rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] leading-5 text-zinc-500 sm:text-[12px]">
                        {option.fee_text}
                      </div>
                    ) : null}

                    {selected && isSyncing ? (
                      <div className="mt-2 inline-flex items-center gap-2 text-[12px] leading-5 text-zinc-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        جاري تثبيت طريقة الدفع...
                      </div>
                    ) : null}

                    {option.disabled ? (
                      <div className="mt-2 inline-flex max-w-full rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold leading-5 text-zinc-500 sm:text-[12px]">
                        {disabledReason}
                      </div>
                    ) : null}

                    {option.disabled &&
                    option.disabled_help?.kind ===
                      "cod_untrusted_customer" ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setHelpModal(option.disabled_help ?? null);
                        }}
                        className="mt-2 inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-black text-zinc-800 transition hover:bg-zinc-50 sm:text-[12px]"
                      >
                        معرفة السبب
                      </button>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && picked?.type === "bank_transfer" ? (
        <div className="mt-3 rounded-[18px] border border-zinc-200 bg-zinc-50/80 px-3 py-3 sm:rounded-[20px] sm:p-4">
          <div className="text-sm font-black text-zinc-950">
            بيانات التحويل البنكي
          </div>

          <div className="mt-1 text-[12px] leading-6 text-zinc-500 sm:text-[13px]">
            حوّل المبلغ إلى الحساب التالي، ثم أرسل صورة الإيصال لخدمة العملاء
            ليتم اعتماد طلبك.
          </div>

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 sm:p-3">
            <div className="text-[13px] font-black text-zinc-950">
              {picked.title}
            </div>

            {picked.subtitle ? (
              <div className="mt-1 text-[12px] leading-relaxed text-zinc-500 sm:text-[13px]">
                {picked.subtitle}
              </div>
            ) : (
              <div className="mt-1 text-[12px] text-zinc-500 sm:text-[13px]">
                لا توجد بيانات تحويل حالياً.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!loading && picked?.type === "provider" ? (
        <div className="mt-3 rounded-[18px] border border-zinc-200 bg-zinc-50/80 px-3 py-3 sm:rounded-[20px] sm:p-4">
          <div className="text-sm font-black text-zinc-950">بوابة الدفع</div>

          <div className="mt-1 text-[12px] leading-6 text-zinc-500 sm:text-[13px]">
            عند تأكيد الطلب سيتم تحويلك إلى بوابة دفع آمنة لإكمال العملية.
          </div>
        </div>
      ) : null}

      {errorMsg && options.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-red-500/15 bg-red-500/5 px-3 py-2 text-center text-[12px] leading-5 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <Button
        className="mt-3 h-11 w-full rounded-[18px] bg-zinc-950 text-[14px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition hover:bg-zinc-800 active:scale-[0.99] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none sm:mt-4 sm:h-12 sm:rounded-[20px] sm:text-[15px]"
        type="button"
        disabled={isLocked || !isActive || loading || !canConfirmPayment}
        onClick={confirmPayment}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isWorking ? "جاري تثبيت طريقة الدفع..." : "اعتماد طريقة الدفع"}
        </span>
      </Button>

    {helpModal ? (
  <div
    dir="rtl"
    className="fixed inset-0 z-[9999] grid place-items-center bg-zinc-950/55 px-4 py-6"
  >
    <button
      type="button"
      aria-label="إغلاق"
      className="absolute inset-0 cursor-default"
      onClick={() => setHelpModal(null)}
    />

    <div className="relative flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[30px] border border-zinc-200 bg-white text-right shadow-[0_35px_100px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 bg-[#fffaf1] px-6 py-5">
        <div className="min-w-0">
          <div className="text-[18px] font-black leading-7 text-zinc-950">
            {helpModal.title}
          </div>

          <div className="mt-1 text-[12px] font-bold text-zinc-500">
            سجل الدفع عند الاستلام
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHelpModal(null)}
          aria-label="إغلاق"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white text-2xl leading-none text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
        >
          ×
        </button>
      </div>

      <div className="overflow-auto px-5 py-5">
        <div className="rounded-[18px] border border-amber-700/20 bg-[#fffaf1] px-4 py-4 text-[13px] font-bold leading-8 text-stone-700">
          {helpModal.message}
        </div>

        <div className="mt-4 grid gap-3">
          {helpModal.records.map((record, index) => (
            <div
              key={`${record.store_name}-${index}`}
              className="grid min-h-[116px] grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-[20px] border border-zinc-200 bg-white p-4"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-[13px] font-black text-zinc-500">
                {index + 1}
              </div>

              <div className="min-w-0 text-right">
                <div className="text-[15px] font-black leading-7 text-zinc-950">
                  {record.store_name}
                </div>

                <div className="mt-1 text-[13px] font-black leading-6 text-zinc-500">
                  {record.reason_text}
                </div>

                {record.reason_note ? (
                  <div className="mt-1 text-[12px] font-bold leading-6 text-zinc-500">
                    {record.reason_note}
                  </div>
                ) : null}

                {record.created_at ? (
                  <div className="mt-2 text-[11px] font-bold leading-5 text-zinc-400">
                    {fmtDate(record.created_at)}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setHelpModal(null)}
          className="mt-5 h-12 w-full rounded-[18px] bg-zinc-950 text-[14px] font-black text-white transition hover:bg-zinc-800"
        >
          فهمت
        </button>
      </div>
    </div>
  </div>
) : null}
    </StepShell>
  );
}