// FILE: apps/storefront/src/app/checkout/_components/PaymentMethodsPanel.tsx

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export type PaymentDisabledHelp =
  | {
      kind: "cod_untrusted_customer";
      title: string;
      message: string;
      records: Array<{
        store_name: string;
        reason_text: string;
        reason_note?: string | null;
        created_at?: string | null;
        is_current_store?: boolean;
      }>;
    }
  | null;

export type PaymentOption = {
  id: string;
  type: "cod" | "bank_transfer" | "provider";
  title: string;
  subtitle?: string | null;
  fee_text?: string | null;
  fee_amount?: number | null;
  recommended?: boolean;
  disabled?: boolean;
  disabled_reason?: string | null;
  disabled_message?: string | null;
  disabled_help?: PaymentDisabledHelp;
  bank_details?: {
    id?: string;
    bank_name: string;
    account_holder: string;
    iban: string;
    note: string;
  } | null;
};

type Props = {
  options: PaymentOption[];
  selectedId?: string | null;
  loading?: boolean;
  disabled?: boolean;
  savingId?: string;
  submitSaving?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  showSelectedNote?: boolean;
  onSelect?: (id: string, option: PaymentOption) => void;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export function readPaymentFee(option?: PaymentOption | null) {
  if (!option || option.disabled) return 0;

  const fee = n(option.fee_amount);
  return fee > 0 ? fee : 0;
}

export function paymentPatchKey(option?: PaymentOption | null) {
  if (!option) return "";
  return `${option.id}:${readPaymentFee(option)}`;
}

export function fallbackPaymentTitle(id?: string | null) {
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

function formatDateText(value?: string | null) {
  const text = s(value);
  if (!text) return "";
  return text.slice(0, 10);
}

function humanizePaymentDisabledReason(reason?: string | null) {
  const value = s(reason);

  if (!value) return "طريقة الدفع غير متاحة حاليًا.";

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
    PAYMENT_PROVIDER_PENDING:
      "الدفع الإلكتروني لهذا النوع من روابط الدفع سيتم ربطه في المرحلة التالية.",
  };

  return map[value] || "طريقة الدفع غير متاحة حاليًا.";
}

function getPaymentBadge(option: PaymentOption) {
  if (option.type === "cod") return "عند الاستلام";
  if (option.type === "bank_transfer") return "تحويل";
  return "إلكتروني";
}

function PaymentSkeleton() {
  return (
    <div className="co-payment-list">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={`payment-skeleton-${index}`} className="co-payment-option is-skeleton">
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

function SelectedPaymentNote({ option }: { option: PaymentOption }) {
  if (option.type === "bank_transfer") {
    const bank = option.bank_details ?? null;
    const maskedIban = maskIban(bank?.iban);

    return (
      <div className="co-payment-note co-payment-note--bank">
        <strong>بيانات التحويل البنكي</strong>

        {bank ? (
          <p>
            {bank.bank_name} — {bank.account_holder}
            <br />
            {maskedIban || bank.iban}
          </p>
        ) : option.subtitle ? (
          <p>{option.subtitle}</p>
        ) : (
          <p>سيتم عرض بيانات التحويل بعد اختيار طريقة الدفع.</p>
        )}

        {bank?.note ? <small>{bank.note}</small> : null}
      </div>
    );
  }

  if (option.type === "provider") {
    return (
      <div className="co-payment-note">
        <strong>بوابة دفع آمنة</strong>
        <p>بعد تأكيد الدفع سيتم توجيهك لإكمال عملية الدفع الإلكتروني.</p>
      </div>
    );
  }

  if (option.type === "cod") {
    return (
      <div className="co-payment-note">
        <strong>الدفع عند الاستلام</strong>
        <p>
          سيتم تحصيل قيمة الطلب عند وصول الشحنة.
          {option.fee_text ? (
            <>
              <br />
              {option.fee_text}
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return null;
}

export default function PaymentMethodsPanel({
  options,
  selectedId,
  loading = false,
  disabled = false,
  savingId = "",
  submitSaving = false,
  emptyTitle = "لا توجد طرق دفع متاحة",
  emptyText = "جرّب لاحقًا أو تواصل مع المتجر.",
  showSelectedNote = true,
  onSelect,
}: Props) {
  const [helpModal, setHelpModal] = useState<PaymentDisabledHelp>(null);

  const rows = Array.isArray(options) ? options : [];
  const selectedOption = rows.find((option) => option.id === selectedId) ?? null;

  if (loading) {
    return <PaymentSkeleton />;
  }

  if (!rows.length) {
    return (
      <div className="co-empty-small">
        <strong>{emptyTitle}</strong>
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <>
      <div className="co-payment-list">
        {rows.map((option) => {
          const selected = option.id === selectedId;
          const clickable = Boolean(!disabled && !option.disabled && onSelect);
          const isFinalizing = submitSaving && savingId === option.id;

          const disabledText =
            s(option.disabled_message) ||
            humanizePaymentDisabledReason(option.disabled_reason);

          return (
            <div
              key={option.id}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : -1}
              aria-disabled={option.disabled || disabled ? "true" : "false"}
              data-selected={selected ? "true" : "false"}
              className={[
                "co-payment-option",
                selected ? "is-selected" : "",
                option.disabled || disabled ? "is-disabled" : "",
                isFinalizing ? "is-loading" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!clickable) return;
                onSelect?.(option.id, option);
              }}
              onKeyDown={(event) => {
                if (!clickable) return;
                if (event.key !== "Enter" && event.key !== " ") return;

                event.preventDefault();
                onSelect?.(option.id, option);
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
                    {disabledText}
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

      {showSelectedNote && selectedOption ? (
        <SelectedPaymentNote option={selectedOption} />
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
                        <small>{formatDateText(record.created_at)}</small>
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
    </>
  );
}
