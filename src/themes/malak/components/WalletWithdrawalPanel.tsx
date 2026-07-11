"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Building2, CheckCircle2, Clock3, Loader2, RefreshCcw, X, XCircle } from "lucide-react";

type WithdrawalItem = {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  status: string;
  bank_name: string;
  account_holder_name: string;
  iban: string;
  customer_note?: string | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  transfer_reference?: string | null;
  requested_at?: string | null;
  paid_at?: string | null;
};

type Props = {
  enabled: boolean;
  availableBalance: number;
  currency: string;
  minimumAmount?: number;
  processingDays?: number;
  compact?: boolean;
  disabled?: boolean;
};

const labels: Record<string, string> = {
  pending: "قيد المراجعة",
  under_review: "تحت المراجعة",
  approved: "تمت الموافقة",
  paid: "تم التحويل",
  rejected: "مرفوض",
  cancelled: "ملغي",
  failed: "تعذر التنفيذ",
};

function money(value: number, currency: string) {
  return `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(value) || 0)} ${currency}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function messageFromError(error: string) {
  const map: Record<string, string> = {
    WALLET_WITHDRAWAL_DISABLED: "طلبات السحب غير مفعلة في هذا المتجر.",
    WITHDRAWAL_AMOUNT_BELOW_MINIMUM: "المبلغ أقل من الحد الأدنى المسموح.",
    WITHDRAWAL_AMOUNT_ABOVE_MAXIMUM: "المبلغ أكبر من الحد الأعلى المسموح.",
    INSUFFICIENT_WALLET_BALANCE: "رصيد المحفظة غير كافٍ.",
    IBAN_REQUIRED: "أدخل رقم الآيبان.",
    INVALID_WITHDRAWAL_DATA: "تحقق من جميع بيانات طلب السحب.",
  };
  return map[error] || "تعذر تنفيذ العملية. حاول مرة أخرى.";
}

export default function WalletWithdrawalPanel({
  enabled,
  availableBalance,
  currency,
  minimumAmount = 50,
  processingDays = 3,
  compact = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ amount: "", bank_name: "", account_holder_name: "", iban: "", customer_note: "" });

  const canRequest = enabled && !disabled && availableBalance >= minimumAmount;
  const normalizedIban = form.iban.replace(/\s+/g, "").toUpperCase();
  const amount = Number(form.amount);
  const validAmount = Number.isFinite(amount) && amount >= minimumAmount && amount <= availableBalance;
  const validIban = /^SA\d{22}$/.test(normalizedIban);
  const canSubmit = validAmount && validIban && form.bank_name.trim().length >= 2 && form.account_holder_name.trim().length >= 2;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/account/wallet/withdrawals", { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "WITHDRAWALS_LOAD_FAILED");
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setError("تعذر تحميل طلبات السحب.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeRequest = useMemo(() => items.find((item) => ["pending", "under_review", "approved"].includes(item.status)), [items]);

  async function submit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account/wallet/withdrawals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          bank_name: form.bank_name.trim(),
          account_holder_name: form.account_holder_name.trim(),
          iban: normalizedIban,
          customer_note: form.customer_note.trim() || null,
          idempotency_key: `customer-withdrawal:${crypto.randomUUID()}`,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "WITHDRAWAL_CREATE_FAILED");
      setSuccess("تم إرسال طلب السحب وحجز المبلغ حتى تتم مراجعته.");
      setForm({ amount: "", bank_name: "", account_holder_name: "", iban: "", customer_note: "" });
      await load();
    } catch (err) {
      setError(messageFromError(err instanceof Error ? err.message : ""));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/account/wallet/withdrawals", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel", idempotency_key: `customer-withdrawal-cancel:${id}:${crypto.randomUUID()}` }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "WITHDRAWAL_CANCEL_FAILED");
      setSuccess("تم إلغاء الطلب وإعادة المبلغ إلى رصيدك المتاح.");
      await load();
    } catch {
      setError("تعذر إلغاء الطلب.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "mk-mwallet__btn mk-mwallet__btn--soft" : "mk-wallet-action mk-wallet-action--soft"}
        disabled={!enabled || disabled}
        onClick={() => setOpen(true)}
        title={!enabled ? "السحب غير مفعل حاليًا" : undefined}
      >
        <Building2 size={17} />
        <span>طلب سحب</span>
        {compact && !enabled ? <small>غير متاح</small> : null}
      </button>

      {open && mounted ? createPortal(
        <div
          className="wallet-withdrawal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="طلب سحب الرصيد"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="wallet-withdrawal-modal" dir="rtl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="wallet-withdrawal-head">
              <div>
                <h2>طلب سحب الرصيد</h2>
                <p>يُحجز المبلغ فورًا ويُعاد تلقائيًا عند رفض أو إلغاء الطلب.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="wallet-withdrawal-summary">
              <div><span>الرصيد المتاح</span><strong>{money(availableBalance, currency)}</strong></div>
              <div><span>الحد الأدنى</span><strong>{money(minimumAmount, currency)}</strong></div>
              <div><span>مدة المعالجة المتوقعة</span><strong>{processingDays} أيام</strong></div>
            </div>

            {error ? <div className="wallet-withdrawal-alert is-error"><AlertCircle size={17} />{error}</div> : null}
            {success ? <div className="wallet-withdrawal-alert is-success"><CheckCircle2 size={17} />{success}</div> : null}

            {activeRequest ? (
              <div className="wallet-withdrawal-active">
                <Clock3 size={18} />
                <div><strong>لديك طلب نشط حاليًا</strong><span>{money(activeRequest.amount, activeRequest.currency)} · {labels[activeRequest.status]}</span></div>
              </div>
            ) : null}

            <div className="wallet-withdrawal-grid">
              <label><span>المبلغ</span><input type="number" min={minimumAmount} max={availableBalance} step="0.01" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} placeholder={`من ${minimumAmount}`} /></label>
              <label><span>اسم البنك</span><input value={form.bank_name} onChange={(e) => setForm((v) => ({ ...v, bank_name: e.target.value }))} placeholder="مثال: مصرف الراجحي" /></label>
              <label><span>اسم صاحب الحساب</span><input value={form.account_holder_name} onChange={(e) => setForm((v) => ({ ...v, account_holder_name: e.target.value }))} placeholder="كما هو مسجل لدى البنك" /></label>
              <label><span>رقم الآيبان</span><input dir="ltr" value={form.iban} onChange={(e) => setForm((v) => ({ ...v, iban: e.target.value.toUpperCase() }))} placeholder="SA0000000000000000000000" /></label>
              <label className="is-wide"><span>ملاحظة اختيارية</span><textarea value={form.customer_note} onChange={(e) => setForm((v) => ({ ...v, customer_note: e.target.value }))} rows={3} /></label>
            </div>

            <button type="button" className="wallet-withdrawal-submit" disabled={!canRequest || !canSubmit || saving || !!activeRequest} onClick={submit}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Building2 size={18} />}
              إرسال طلب السحب
            </button>

            <div className="wallet-withdrawal-history">
              <div className="wallet-withdrawal-history-head"><h3>طلباتك السابقة</h3><button type="button" onClick={() => void load()} disabled={loading}><RefreshCcw size={15} /> تحديث</button></div>
              {loading ? <div className="wallet-withdrawal-empty"><Loader2 className="animate-spin" size={18} /> جارٍ التحميل...</div> : items.length === 0 ? <div className="wallet-withdrawal-empty">لا توجد طلبات سحب حتى الآن.</div> : items.map((item) => (
                <article key={item.id} className="wallet-withdrawal-item">
                  <div><strong>{money(item.amount, item.currency)}</strong><span>{labels[item.status] || item.status} · {formatDate(item.requested_at)}</span></div>
                  <div className="wallet-withdrawal-item-side"><span>{item.bank_name}</span>{item.status === "pending" ? <button type="button" onClick={() => void cancel(item.id)} disabled={busyId === item.id}>{busyId === item.id ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />} إلغاء</button> : null}</div>
                  {item.rejection_reason ? <p>سبب الرفض: {item.rejection_reason}</p> : null}
                  {item.transfer_reference ? <p>مرجع التحويل: {item.transfer_reference}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
