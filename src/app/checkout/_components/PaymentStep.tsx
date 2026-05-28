// FILE: apps/storefront/src/app/checkout/_components/PaymentStep.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
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
  fee_amount?: number | null;
  recommended?: boolean;
  disabled?: boolean;
  disabled_reason?: string | null;
  disabled_help?: PaymentDisabledHelp;
  bank_details?: {
    bank_name: string;
    account_holder: string;
    iban: string;
    note: string;
  } | null;
};

type ConfirmResult = {
  ok?: boolean;
  summary?: any;
  cart?: any;
  order?: any;
  state?: any;
};

export type PaymentStepProps = {
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  onEdit: () => void;
  onConfirm: (result?: ConfirmResult | null) => void | Promise<void>;
  confirmedId?: string;
};

type SaveOptions = {
  submitAfter?: boolean;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

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
  if (!summary) return;

  dispatchCheckoutEvent("checkout:summaryPatch", {
    summary,
    reconcile: false,
  });
}

function refreshSummary() {
  dispatchCheckoutEvent("checkout:refresh");
}

function setSubmitEnabled(enabled: boolean) {
  dispatchCheckoutEvent("checkout:submitEnabled", { enabled });
}

function requestSubmitOrder() {
  dispatchCheckoutEvent("checkout:submitOrder");
}

function readPaymentFee(option?: PaymentOption | null) {
  if (!option || option.disabled) return 0;

  const fee = n(option.fee_amount);
  return fee > 0 ? fee : 0;
}

function paymentPatchKey(option?: PaymentOption | null) {
  if (!option) return "";
  return `${option.id}:${readPaymentFee(option)}`;
}

function patchPaymentSummary(option: PaymentOption) {
  dispatchCheckoutEvent("checkout:summaryPatch", {
    patch: {
      payment_fee: readPaymentFee(option),
      payment_method: option.id,
    },
    reconcile: false,
  });
}

function clearPaymentSummaryPatch() {
  dispatchCheckoutEvent("checkout:summaryPatch", {
    patch: {
      payment_fee: 0,
      payment_method: null,
    },
    reconcile: false,
  });
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
  const value = s(reason);

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

function fallbackPaymentTitle(id?: string) {
  const value = s(id);

  if (value === "cod") return "الدفع عند الاستلام";
  if (value === "bank_transfer") return "تحويل بنكي";

  if (value.startsWith("provider:")) {
    const code = value.replace("provider:", "").trim();
    return code ? `الدفع الإلكتروني (${code})` : "الدفع الإلكتروني";
  }

  return "طريقة دفع محفوظة";
}

function maskIban(value?: string | null) {
  const iban = s(value).replace(/\s+/g, "");
  if (!iban) return "";
  if (iban.length <= 10) return iban;

  return `${iban.slice(0, 6)}…${iban.slice(-4)}`;
}

function getPaymentBadge(option: PaymentOption) {
  if (option.type === "cod") return "عند الاستلام";
  if (option.type === "bank_transfer") return "تحويل";
  return "إلكتروني";
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

function PaymentSkeleton() {
  return (
    <div className="co-payment-list">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="co-payment-option is-skeleton">
          <span className="co-payment-radio" />

          <div className="co-payment-main">
            <span className="co-skeleton co-skeleton--title" />
            <span className="co-skeleton co-skeleton--line" />
          </div>
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
  const initialSyncedId = isDone && confirmedId ? confirmedId : "";

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PaymentOption[]>([]);

  const [method, setMethod] = useState<string>(initialSyncedId);
  const [savingId, setSavingId] = useState("");
  const [submitSaving, setSubmitSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [helpModal, setHelpModal] = useState<PaymentDisabledHelp>(null);

  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  const saveSeqRef = useRef(0);
  const saveAbortRef = useRef<AbortController | null>(null);
  const lastSyncedRef = useRef<string>(initialSyncedId);
  const lastPatchedRef = useRef("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSeqRef.current += 1;
      saveSeqRef.current += 1;
      saveAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isDone && confirmedId) {
      setMethod(confirmedId);
      lastSyncedRef.current = confirmedId;
      return;
    }

    if (!isDone) {
      lastSyncedRef.current = "";
    }
  }, [confirmedId, isDone]);

  useEffect(() => {
    if (isLocked || !isActive) {
      if (!isDone) setSubmitEnabled(false);
      return;
    }

    void loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isActive]);

  useEffect(() => {
    if (isLocked || !isActive || loading) return;

    if (!method || !options.length) {
      setSubmitEnabled(false);
      return;
    }

    const selected = options.find((option) => option.id === method);

    if (!selected || selected.disabled) {
      setSubmitEnabled(false);
      return;
    }

    const patchKey = paymentPatchKey(selected);

    if (lastPatchedRef.current !== patchKey) {
      lastPatchedRef.current = patchKey;
      patchPaymentSummary(selected);
    }

    setSubmitEnabled(true);
  }, [isLocked, isActive, loading, method, options]);

  async function loadOptions() {
    const seq = ++loadSeqRef.current;

    setLoading(true);
    setErrorMsg("");

    if (!isDone) {
      setSubmitEnabled(false);
    }

    try {
      const list = await fetchPaymentOptionsFresh();

      if (!mountedRef.current || seq !== loadSeqRef.current) return;

      const enabledIds = new Set(
        list.filter((option) => !option.disabled).map((option) => option.id),
      );

      const currentMethod = s(method);
      const confirmedMethod = isDone && confirmedId ? s(confirmedId) : "";

      let nextMethod = "";

      if (currentMethod && enabledIds.has(currentMethod)) {
        nextMethod = currentMethod;
      } else if (confirmedMethod && enabledIds.has(confirmedMethod)) {
        nextMethod = confirmedMethod;
      }

      setOptions(list);
      setMethod(nextMethod);

      const selected = list.find((option) => option.id === nextMethod);

      if (selected && !selected.disabled) {
        const patchKey = paymentPatchKey(selected);
        lastPatchedRef.current = patchKey;
        patchPaymentSummary(selected);
        setSubmitEnabled(true);
      } else {
        lastPatchedRef.current = "";
        clearPaymentSummaryPatch();
        setSubmitEnabled(false);
      }
    } catch (e: any) {
      if (!mountedRef.current || seq !== loadSeqRef.current) return;

      setOptions([]);
      setMethod("");
      lastPatchedRef.current = "";
      setErrorMsg(e?.message || "تعذر تحميل طرق الدفع.");
      setSubmitEnabled(false);
      clearPaymentSummaryPatch();
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }

  async function persistPaymentMethod(nextId: string, signal: AbortSignal) {
    if (!nextId) return null;

    const row = options.find((x) => x.id === nextId);
    if (!row || row.disabled) return null;

    if (lastSyncedRef.current === nextId) {
      patchPaymentSummary(row);
      setSubmitEnabled(true);
      return { ok: true, summary: null } as ConfirmResult;
    }

    const r = await fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal,
      body: JSON.stringify({
        payment_method: nextId,
        include_summary: false,
      }),
    });

    const j = (await safeJson(r)) as ConfirmResult | any;

    if (!r.ok || !j?.ok) {
      const msg = j?.message_ar || j?.error || "تعذر حفظ طريقة الدفع.";
      throw new Error(msg);
    }

    lastSyncedRef.current = nextId;

    if (j?.summary) {
      pushSummary(j.summary);
    }

    return j as ConfirmResult;
  }

  function choosePayment(nextId: string) {
    if (isLocked || !isActive || loading || submitSaving) return;

    const row = options.find((x) => x.id === nextId);
    if (!row || row.disabled) return;

    saveAbortRef.current?.abort();

    setMethod(nextId);
    setErrorMsg("");
    setSavingId("");
    setSubmitSaving(false);

    const patchKey = paymentPatchKey(row);
    lastPatchedRef.current = patchKey;

    patchPaymentSummary(row);
    setSubmitEnabled(true);
  }

  async function saveSelectedPayment(nextId: string, opts?: SaveOptions) {
    const row = options.find((x) => x.id === nextId);

    if (!row || row.disabled) {
      setSavingId("");
      setSubmitSaving(false);
      setSubmitEnabled(false);
      return;
    }

    const seq = ++saveSeqRef.current;
    const ac = new AbortController();

    saveAbortRef.current?.abort();
    saveAbortRef.current = ac;

    setSavingId(nextId);
    setSubmitSaving(Boolean(opts?.submitAfter));
    setErrorMsg("");

    const patchKey = paymentPatchKey(row);
    lastPatchedRef.current = patchKey;

    patchPaymentSummary(row);
    setSubmitEnabled(true);

    try {
      const result = await persistPaymentMethod(nextId, ac.signal);

      if (!mountedRef.current || seq !== saveSeqRef.current) return;

      if (!result?.ok) {
        setErrorMsg("تعذر حفظ طريقة الدفع. حاول مرة أخرى.");
        setSubmitEnabled(false);
        refreshSummary();
        return;
      }

      await onConfirm(result);
      setSubmitEnabled(true);

      if (opts?.submitAfter) {
        window.setTimeout(() => {
          requestSubmitOrder();
        }, 80);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (!mountedRef.current || seq !== saveSeqRef.current) return;

      const rollbackId = lastSyncedRef.current || "";
      const rollbackOption = options.find((x) => x.id === rollbackId);

      setMethod(rollbackId);
      setErrorMsg(e?.message || "تعذر حفظ طريقة الدفع. حاول مرة أخرى.");
      setSubmitEnabled(false);

      if (rollbackOption && !rollbackOption.disabled) {
        const rollbackPatchKey = paymentPatchKey(rollbackOption);
        lastPatchedRef.current = rollbackPatchKey;
        patchPaymentSummary(rollbackOption);
      } else {
        lastPatchedRef.current = "";
        clearPaymentSummaryPatch();
        refreshSummary();
      }
    } finally {
      if (mountedRef.current && seq === saveSeqRef.current) {
        setSavingId("");
        setSubmitSaving(false);
      }
    }
  }

  async function confirmPaymentAndSubmit() {
    if (isLocked || !isActive || loading || submitSaving) return;

    const selected = options.find((x) => x.id === method);

    if (!selected || selected.disabled) {
      setErrorMsg("اختر طريقة دفع صحيحة أولًا.");
      setSubmitEnabled(false);
      return;
    }

    setErrorMsg("");

    const patchKey = paymentPatchKey(selected);
    lastPatchedRef.current = patchKey;

    patchPaymentSummary(selected);
    setSubmitEnabled(true);

    if (lastSyncedRef.current === method) {
      requestSubmitOrder();
      return;
    }

    await saveSelectedPayment(method, { submitAfter: true });
  }

  const picked = useMemo(() => {
    const id = confirmedId ?? method;
    return options.find((m) => m.id === id);
  }, [confirmedId, method, options]);

  const selectedOption = useMemo(() => {
    return options.find((m) => m.id === method) ?? null;
  }, [method, options]);

  const selectedBankDetails =
    selectedOption?.type === "bank_transfer" ? selectedOption.bank_details : null;

  const selectedBankMaskedIban = maskIban(selectedBankDetails?.iban);

  const submitDisabled =
    isLocked ||
    !isActive ||
    loading ||
    submitSaving ||
    !method ||
    !selectedOption ||
    Boolean(selectedOption.disabled);

  if (isDone && !isActive) {
    return (
      <StepShell
        title="الدفع"
        subtitle="تم اختيار طريقة الدفع"
        icon={<CreditCard size={18} />}
        isActive={isActive}
        isDone
        isLocked={false}
        onEdit={onEdit}
      >
        <div className="co-saved-row co-saved-row--payment">
          <span className="co-saved-row__icon">
            <CreditCard size={18} />
          </span>

          <div className="co-saved-row__main">
            <strong>
              {picked?.title || fallbackPaymentTitle(confirmedId || method)}
            </strong>

            {picked?.subtitle ? <p>{picked.subtitle}</p> : null}

            {picked?.fee_text ? <p>{picked.fee_text}</p> : null}
          </div>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      title="الدفع"
      subtitle={isLocked ? "أكمل الشحن أولًا" : "اختر طريقة الدفع المناسبة"}
      icon={<CreditCard size={18} />}
      isActive={isActive}
      isDone={false}
      isLocked={isLocked}
      onEdit={isDone ? onEdit : undefined}
      rightChip={<span>الحالية</span>}
    >
      {loading ? (
        <PaymentSkeleton />
      ) : errorMsg && options.length === 0 ? (
        <div className="co-field-error">{errorMsg}</div>
      ) : options.length === 0 ? (
        <div className="co-empty-small">
          <strong>لا توجد طرق دفع متاحة</strong>
          <span>جرّب لاحقًا أو تواصل مع المتجر.</span>
        </div>
      ) : (
        <div className="co-payment-list">
          {options.map((option) => {
            const selected = option.id === method;
            const isFinalizing = submitSaving && savingId === option.id;
            const disabledReason = humanizePaymentDisabledReason(
              option.disabled_reason,
            );

            return (
              <div
                key={option.id}
                role="button"
                tabIndex={option.disabled ? -1 : 0}
                aria-disabled={option.disabled ? "true" : "false"}
                data-selected={selected ? "true" : "false"}
                className={[
                  "co-payment-option",
                  selected ? "is-selected" : "",
                  option.disabled ? "is-disabled" : "",
                  isFinalizing ? "is-loading" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (option.disabled) return;
                  choosePayment(option.id);
                }}
                onKeyDown={(event) => {
                  if (option.disabled) return;
                  if (event.key !== "Enter" && event.key !== " ") return;

                  event.preventDefault();
                  choosePayment(option.id);
                }}
              >
                <span className="co-payment-radio" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>

                <div className="co-payment-main">
                  <div className="co-payment-title">
                    <strong>{option.title}</strong>

                    <div className="co-payment-badges">
                      <em>{getPaymentBadge(option)}</em>

                      {option.recommended ? <em>موصى به</em> : null}

                      {selected ? <span>محدد</span> : null}
                    </div>
                  </div>

                  {option.subtitle ? <p>{option.subtitle}</p> : null}

                  {option.fee_text ? <small>{option.fee_text}</small> : null}

                  {selected && isFinalizing ? (
                    <small className="co-inline-loader">
                      <Loader2 size={13} className="co-spin" />
                      جاري تجهيز الدفع...
                    </small>
                  ) : null}

                  {option.disabled ? (
                    <small className="co-payment-disabled-text">
                      {disabledReason}
                    </small>
                  ) : null}

                  {option.disabled &&
                  option.disabled_help?.kind === "cod_untrusted_customer" ? (
                    <button
                      type="button"
                      className="co-payment-help-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        setHelpModal(option.disabled_help ?? null);
                      }}
                    >
                      معرفة السبب
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && selectedOption?.type === "bank_transfer" ? (
        <div className="co-payment-note co-payment-note--bank">
          <strong>بيانات التحويل البنكي</strong>

          {selectedBankDetails ? (
            <p>
              {selectedBankDetails.bank_name} —{" "}
              {selectedBankDetails.account_holder}
              <br />
              {selectedBankMaskedIban || selectedBankDetails.iban}
            </p>
          ) : selectedOption.subtitle ? (
            <p>{selectedOption.subtitle}</p>
          ) : (
            <p>سيتم عرض بيانات التحويل بعد اختيار طريقة الدفع.</p>
          )}
        </div>
      ) : null}

      {!loading && selectedOption?.type === "provider" ? (
        <div className="co-payment-note">
          <strong>بوابة دفع آمنة</strong>
          <p>بعد تأكيد الطلب سيتم توجيهك لإكمال عملية الدفع الإلكتروني.</p>
        </div>
      ) : null}

      {!loading && selectedOption?.type === "cod" ? (
        <div className="co-payment-note">
          <strong>الدفع عند الاستلام</strong>
          <p>
            سيتم تحصيل قيمة الطلب عند وصول الشحنة.
            {selectedOption.fee_text ? (
              <>
                <br />
                {selectedOption.fee_text}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {errorMsg && options.length > 0 ? (
        <div className="co-field-error">{errorMsg}</div>
      ) : null}

      {!loading && options.length > 0 ? (
        <button
          type="button"
          className="co-payment-final-btn"
          disabled={submitDisabled}
          onClick={() => {
            void confirmPaymentAndSubmit();
          }}
        >
          {submitSaving ? <Loader2 className="co-spin" size={16} /> : null}
          {submitSaving ? "جاري تجهيز الدفع..." : "تأكيد الدفع"}
        </button>
      ) : null}

      {helpModal ? (
        <div className="co-modal-layer" dir="rtl">
          <button
            type="button"
            aria-label="إغلاق"
            className="co-modal-backdrop"
            onClick={() => setHelpModal(null)}
          />

          <div className="co-modal">
            <div className="co-modal__head">
              <div>
                <strong>{helpModal.title}</strong>
                <p>سجل الدفع عند الاستلام</p>
              </div>

              <button
                type="button"
                onClick={() => setHelpModal(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="co-modal__body">
              <div className="co-alert co-alert--warning">
                {helpModal.message}
              </div>

              <div className="co-modal-records">
                {helpModal.records.map((record, index) => (
                  <div key={`${record.store_name}-${index}`}>
                    <span>{index + 1}</span>

                    <div>
                      <strong>{record.store_name}</strong>
                      <p>{record.reason_text}</p>

                      {record.reason_note ? <p>{record.reason_note}</p> : null}

                      {record.created_at ? (
                        <small>{fmtDate(record.created_at)}</small>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="co-btn co-btn--dark co-btn--full"
                onClick={() => setHelpModal(null)}
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