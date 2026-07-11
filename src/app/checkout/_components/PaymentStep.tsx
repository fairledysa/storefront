// FILE: apps/storefront/src/app/checkout/_components/PaymentStep.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
import { CreditCard, Loader2, WalletCards } from "lucide-react";
import PaymentMethodsPanel, {
  fallbackPaymentTitle,
  paymentPatchKey,
  readPaymentFee,
  type PaymentOption,
} from "./PaymentMethodsPanel";

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

type BankTransferReceipt = {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

type BankTransferPayload = {
  bankAccountId: string;
  senderAccountName: string;
  receiptUrl: string;
  receiptFilename: string;
  receiptMimeType: string;
  receiptSizeBytes: number;
};

const BANK_RECEIPT_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function s(x: any) {
  return String(x ?? "").trim();
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

function setBankTransferPayload(payload: BankTransferPayload | null) {
  dispatchCheckoutEvent("checkout:bankTransferPayload", { payload });
}

function requestOrderReview() {
  dispatchCheckoutEvent("checkout:openSummary");
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

async function uploadBankTransferReceipt(file: File) {
  const form = new FormData();
  form.append("kind", "product-attachment");
  form.append("file", file);

  const r = await fetch("/api/uploads/r2/put", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });

  const j = await safeJson(r);

  if (!r.ok || !j?.ok) {
    throw new Error(j?.message || j?.message_ar || j?.error || "تعذر رفع إيصال التحويل.");
  }

  const url = s(j.publicUrl) || s(j.public_url);

  if (!url) {
    throw new Error("تم رفع الصورة لكن لم يصل رابط الإيصال.");
  }

  return {
    url,
    filename: s(j.fileName) || file.name,
    mimeType: s(j.fileType) || file.type,
    sizeBytes: Number(j.fileSize ?? file.size) || file.size,
  } satisfies BankTransferReceipt;
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
  const [senderAccountName, setSenderAccountName] = useState("");
  const [receipt, setReceipt] = useState<BankTransferReceipt | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAvailable, setWalletAvailable] = useState(0);
  const [walletPending, setWalletPending] = useState(0);
  const [walletCurrency, setWalletCurrency] = useState("SAR");
  const [walletCheckoutEnabled, setWalletCheckoutEnabled] = useState(false);
  const [walletPartialEnabled, setWalletPartialEnabled] = useState(false);
  const [walletUseEnabled, setWalletUseEnabled] = useState(false);
  const [walletRequestedAmount, setWalletRequestedAmount] = useState("");
  const [checkoutTotal, setCheckoutTotal] = useState(0);

  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  const saveSeqRef = useRef(0);
  const saveAbortRef = useRef<AbortController | null>(null);
  const lastSyncedRef = useRef<string>(initialSyncedId);
  const lastPatchedRef = useRef("");
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const maxWalletApplicable = Math.max(0, Math.min(walletAvailable, checkoutTotal || walletAvailable));
  const parsedWalletRequestedAmount = Math.max(0, Number(walletRequestedAmount) || 0);
  const walletApplied = walletUseEnabled
    ? Math.max(0, Math.min(maxWalletApplicable, parsedWalletRequestedAmount || maxWalletApplicable))
    : 0;
  const walletCoversOrder = checkoutTotal > 0 && walletApplied >= checkoutTotal;
  const walletRemainingAmount = Math.max(0, checkoutTotal - walletApplied);

  const selectedOption = useMemo(() => {
    return options.find((m) => m.id === method) ?? null;
  }, [method, options]);

  const isBankTransferSelected = selectedOption?.type === "bank_transfer";
  const bankAccountId = s(selectedOption?.bank_details?.id);
  const bankTransferReady =
    !isBankTransferSelected ||
    Boolean(bankAccountId && s(senderAccountName) && receipt?.url);

  const bankTransferPayload = useMemo<BankTransferPayload | null>(() => {
    if (!isBankTransferSelected || !bankTransferReady || !receipt) return null;

    return {
      bankAccountId,
      senderAccountName: s(senderAccountName),
      receiptUrl: receipt.url,
      receiptFilename: receipt.filename,
      receiptMimeType: receipt.mimeType,
      receiptSizeBytes: receipt.sizeBytes,
    };
  }, [
    bankAccountId,
    bankTransferReady,
    isBankTransferSelected,
    receipt,
    senderAccountName,
    walletCoversOrder,
  ]);

  function canSubmitPaymentOption(option?: PaymentOption | null) {
    if (!option || option.disabled) return false;
    if (option.type !== "bank_transfer") return true;

    return Boolean(
      s(option.bank_details?.id) && s(senderAccountName) && receipt?.url,
    );
  }

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
        setSubmitEnabled(canSubmitPaymentOption(selected));
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
      setSubmitEnabled(canSubmitPaymentOption(row));
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

  async function handleReceiptFile(file: File | null | undefined) {
    if (!file || receiptUploading || submitSaving) return;

    const mime = s(file.type).toLowerCase();

    if (!BANK_RECEIPT_MIMES.has(mime)) {
      setReceiptError("صيغة الإيصال غير مدعومة. الصيغ المسموحة: JPG أو PNG أو WEBP.");
      return;
    }

    setReceiptUploading(true);
    setReceiptError("");

    try {
      const nextReceipt = await uploadBankTransferReceipt(file);

      if (!mountedRef.current) return;

      setReceipt(nextReceipt);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setReceipt(null);
      setReceiptError(e?.message || "تعذر رفع إيصال التحويل.");
    } finally {
      if (mountedRef.current) {
        setReceiptUploading(false);
      }

      if (receiptInputRef.current) {
        receiptInputRef.current.value = "";
      }
    }
  }

  function clearReceipt() {
    setReceipt(null);
    setReceiptError("");

    if (receiptInputRef.current) {
      receiptInputRef.current.value = "";
    }
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
    setSubmitEnabled(canSubmitPaymentOption(row));
  }

  async function saveSelectedPayment(nextId: string): Promise<boolean> {
    const row = options.find((x) => x.id === nextId);

    if (!row || row.disabled) {
      setSavingId("");
      setSubmitSaving(false);
      setSubmitEnabled(false);
      return false;
    }

    const seq = ++saveSeqRef.current;
    const ac = new AbortController();

    saveAbortRef.current?.abort();
    saveAbortRef.current = ac;

    setSavingId(nextId);
    setSubmitSaving(true);
    setErrorMsg("");

    const patchKey = paymentPatchKey(row);
    lastPatchedRef.current = patchKey;

    patchPaymentSummary(row);
    setSubmitEnabled(canSubmitPaymentOption(row));

    try {
      const result = await persistPaymentMethod(nextId, ac.signal);

      if (!mountedRef.current || seq !== saveSeqRef.current) return false;

      if (!result?.ok) {
        setErrorMsg("تعذر حفظ طريقة الدفع. حاول مرة أخرى.");
        setSubmitEnabled(false);
        refreshSummary();
        return false;
      }

      await onConfirm(result);
      setSubmitEnabled(canSubmitPaymentOption(row));
      return true;
    } catch (e: any) {
      if (e?.name === "AbortError") return false;
      if (!mountedRef.current || seq !== saveSeqRef.current) return false;

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

      return false;
    } finally {
      if (mountedRef.current && seq === saveSeqRef.current) {
        setSavingId("");
        setSubmitSaving(false);
      }
    }
  }

  async function confirmPaymentAndContinue() {
    if (isLocked || !isActive || loading || submitSaving) return;

    const selected = options.find((x) => x.id === method);

    if (!selected || selected.disabled) {
      setErrorMsg("اختر طريقة دفع صحيحة أولًا.");
      setSubmitEnabled(false);
      return;
    }

    if (selected.type === "bank_transfer" && !bankTransferReady) {
      setErrorMsg("أكمل اسم صاحب الحساب وارفع إيصال التحويل قبل تأكيد الدفع.");
      setSubmitEnabled(false);
      return;
    }

    setErrorMsg("");

    const patchKey = paymentPatchKey(selected);
    lastPatchedRef.current = patchKey;

    patchPaymentSummary(selected);
    setSubmitEnabled(canSubmitPaymentOption(selected));

    if (lastSyncedRef.current === method) {
      await onConfirm({
        ok: true,
        state: { payment_method: method },
      });
      requestOrderReview();
      return;
    }

    const saved = await saveSelectedPayment(method);

    if (saved) {
      requestOrderReview();
    }
  }


  useEffect(() => {
    if (isLocked || !isActive) return;

    let cancelled = false;

    async function loadWalletSummary() {
      setWalletLoading(true);

      try {
        const response = await fetch("/api/account/wallet", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });

        const payload = await safeJson(response);

        if (cancelled) return;

        if (!response.ok || !payload?.ok) {
          setWalletAvailable(0);
          setWalletPending(0);
          setWalletCheckoutEnabled(false);
          return;
        }

        setWalletAvailable(Math.max(0, Number(payload?.wallet?.available_balance ?? 0) || 0));
        setWalletPending(Math.max(0, Number(payload?.wallet?.pending_balance ?? 0) || 0));
        setWalletCurrency(s(payload?.wallet?.currency) || "SAR");
        setWalletCheckoutEnabled(
          Boolean(payload?.settings?.wallet_enabled && payload?.settings?.checkout_enabled),
        );
        setWalletPartialEnabled(Boolean(payload?.settings?.partial_payment_enabled));
      } catch {
        if (cancelled) return;
        setWalletAvailable(0);
        setWalletPending(0);
        setWalletCheckoutEnabled(false);
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    }

    void loadWalletSummary();

    return () => {
      cancelled = true;
    };
  }, [isActive, isLocked]);

  useEffect(() => {
    const onWalletState = (event: Event) => {
      const detail = (event as CustomEvent<{
        useWallet?: boolean;
        requestedAmount?: number;
        total?: number;
      }>).detail;

      if (!detail) return;
      setWalletUseEnabled(Boolean(detail.useWallet));
      setWalletRequestedAmount(
        Number.isFinite(Number(detail.requestedAmount))
          ? String(Math.max(0, Number(detail.requestedAmount)))
          : "",
      );
      setCheckoutTotal(Math.max(0, Number(detail.total) || 0));
    };

    window.addEventListener("checkout:walletState", onWalletState as EventListener);

    dispatchCheckoutEvent("checkout:walletStateRequest");

    return () => {
      window.removeEventListener("checkout:walletState", onWalletState as EventListener);
    };
  }, []);

  function updateWalletSelection(nextUseWallet: boolean, nextAmount: number) {
    const normalizedAmount = Math.max(0, Math.min(maxWalletApplicable, nextAmount || maxWalletApplicable));

    setWalletUseEnabled(nextUseWallet);
    setWalletRequestedAmount(nextUseWallet ? String(normalizedAmount) : "");

    dispatchCheckoutEvent("checkout:walletSelection", {
      useWallet: nextUseWallet,
      amount: nextUseWallet ? normalizedAmount : 0,
    });
  }

  useEffect(() => {
    if (!walletUseEnabled) return;
    if (walletApplied === parsedWalletRequestedAmount) return;

    setWalletRequestedAmount(String(walletApplied));
  }, [walletApplied, walletUseEnabled, parsedWalletRequestedAmount]);

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
    setBankTransferPayload(bankTransferPayload);

    return () => {
      setBankTransferPayload(null);
    };
  }, [bankTransferPayload]);

  useEffect(() => {
    if (isLocked || !isActive || loading) return;

    if (walletCoversOrder) {
      setSubmitEnabled(true);
      return;
    }

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

    setSubmitEnabled(canSubmitPaymentOption(selected));
  }, [
    isLocked,
    isActive,
    loading,
    method,
    options,
    receipt?.url,
    senderAccountName,
  ]);

  const picked = useMemo(() => {
    const id = confirmedId ?? method;
    return options.find((m) => m.id === id);
  }, [confirmedId, method, options]);

  const submitDisabled =
    isLocked ||
    !isActive ||
    loading ||
    submitSaving ||
    receiptUploading ||
    (!walletCoversOrder && !method) ||
    (!walletCoversOrder && !selectedOption) ||
    (!walletCoversOrder && Boolean(selectedOption?.disabled)) ||
    (!walletCoversOrder && !bankTransferReady);

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
      {errorMsg && options.length === 0 && !loading ? (
        <div className="co-field-error">{errorMsg}</div>
      ) : null}


      <section className="co-payment-wallet-notice" aria-live="polite">
        <div className="co-payment-wallet-notice__icon">
          <WalletCards size={21} />
        </div>

        <div className="co-payment-wallet-notice__content">
          <div className="co-payment-wallet-notice__head">
            <strong>رصيد محفظتك</strong>
            <span dir="ltr">
              {walletLoading
                ? "جاري التحميل..."
                : `${walletAvailable.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ${walletCurrency}`}
            </span>
          </div>

          <p>
            {walletCheckoutEnabled && walletAvailable > 0
              ? "يمكنك استخدام الرصيد كاملًا أو جزئيًا، ثم إكمال المتبقي بإحدى طرق الدفع أدناه."
              : walletCheckoutEnabled
                ? "لا يوجد رصيد متاح حاليًا لاستخدامه في هذا الطلب."
                : "الدفع من المحفظة غير متاح لهذا المتجر حاليًا."}
          </p>

          {walletCheckoutEnabled && walletAvailable > 0 ? (
            <div className="co-wallet-checkout co-wallet-checkout--inline">
              <label className="co-wallet-checkout__toggle">
                <input
                  type="checkbox"
                  checked={walletUseEnabled}
                  disabled={walletLoading || submitSaving || loading}
                  onChange={(event) => {
                    updateWalletSelection(
                      event.target.checked,
                      event.target.checked ? maxWalletApplicable : 0,
                    );
                  }}
                />
                <span>استخدام الرصيد في هذا الطلب</span>
              </label>

              {walletUseEnabled ? (
                <div className="co-wallet-checkout__amount">
                  <label htmlFor="payment-step-wallet-amount">المبلغ المستخدم</label>
                  <input
                    id="payment-step-wallet-amount"
                    inputMode="decimal"
                    value={walletRequestedAmount}
                    disabled={!walletPartialEnabled || submitSaving || loading}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setWalletRequestedAmount(raw);
                      dispatchCheckoutEvent("checkout:walletSelection", {
                        useWallet: true,
                        amount: Math.max(0, Math.min(maxWalletApplicable, Number(raw) || 0)),
                      });
                    }}
                    onBlur={() => updateWalletSelection(true, walletApplied)}
                  />

                  <div className="co-wallet-checkout__summary">
                    <span>المستخدم من المحفظة</span>
                    <strong dir="ltr">{walletApplied.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} {walletCurrency}</strong>
                  </div>
                  <div className="co-wallet-checkout__summary">
                    <span>المتبقي للدفع</span>
                    <strong dir="ltr">{walletRemainingAmount.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} {walletCurrency}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!walletLoading && walletPending > 0 ? (
            <small dir="ltr">
              الرصيد المعلّق: {walletPending.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} {walletCurrency}
            </small>
          ) : null}
        </div>
      </section>

      {!walletCoversOrder ? (
      <PaymentMethodsPanel
        options={options}
        selectedId={method}
        loading={loading}
        disabled={isLocked || !isActive || submitSaving}
        savingId={savingId}
        submitSaving={submitSaving}
        onSelect={(nextId) => choosePayment(nextId)}
      />
      ) : (
        <div className="co-payment-wallet-covered">
          تم تغطية كامل قيمة الطلب من رصيد المحفظة، ولا تحتاج إلى اختيار وسيلة دفع أخرى.
        </div>
      )}

      {isBankTransferSelected ? (
        <div className="co-bank-proof">
          <div className="co-bank-proof__head">
            <strong>معلومات بعد التحويل</strong>
            <p>
              يجب إرفاق صورة من إيصال التحويل البنكي واسم الحساب الذي قام
              بالتحويل حتى يتم قبول الطلب.
            </p>
          </div>

          <label className="co-bank-proof__field">
            <span>اسم صاحب الحساب الذي تم التحويل منه *</span>
            <span>اسم صاحب الحساب المحوّل منه</span>
            <input
              value={senderAccountName}
              onChange={(event) => {
                setSenderAccountName(event.target.value);
                setErrorMsg("");
              }}
              placeholder="أدخل الاسم"
              disabled={submitSaving || receiptUploading}
            />
          </label>

          <div className="co-bank-proof__upload">
            <div>
              <strong>الرجاء إرفاق صورة الإيصال</strong>
              <p>JPG أو PNG أو WEBP</p>
            </div>

            <input
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(event) => {
                void handleReceiptFile(event.target.files?.[0]);
              }}
              disabled={submitSaving || receiptUploading}
            />

            {receipt ? (
              <div className="co-bank-proof__file">
                <a href={receipt.url} target="_blank" rel="noreferrer">
                  <img src={receipt.url} alt="" />
                </a>
                <div>
                  <span>{receipt.filename}</span>
                  <small>{Math.ceil(receipt.sizeBytes / 1024)} KB</small>
                </div>
                <button
                  type="button"
                  onClick={clearReceipt}
                  disabled={submitSaving || receiptUploading}
                >
                  حذف
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="co-bank-proof__pick"
              onClick={() => receiptInputRef.current?.click()}
              disabled={submitSaving || receiptUploading}
            >
              {receiptUploading ? (
                <>
                  <Loader2 className="co-spin" size={14} />
                  جاري الرفع...
                </>
              ) : receipt ? (
                "تغيير الصورة"
              ) : (
                "رفع صورة الإيصال"
              )}
            </button>
          </div>

          {receiptError ? (
            <div className="co-bank-proof__error">{receiptError}</div>
          ) : null}
        </div>
      ) : null}

      {errorMsg && options.length > 0 ? (
        <div className="co-field-error">{errorMsg}</div>
      ) : null}

      {!loading && (options.length > 0 || walletCoversOrder) ? (
        <button
          type="button"
          className="co-payment-final-btn"
          disabled={submitDisabled}
          onClick={() => {
            void confirmPaymentAndContinue();
          }}
        >
          {submitSaving ? <Loader2 className="co-spin" size={16} /> : null}
          {submitSaving ? "جاري حفظ طريقة الدفع..." : "متابعة لمراجعة الطلب"}
        </button>
      ) : null}
    </StepShell>
  );
}
