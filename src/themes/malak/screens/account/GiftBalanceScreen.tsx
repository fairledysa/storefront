"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Gift,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import { useAccountCurrency } from "./account-currency";


type GiftRow = {
  id: string;
  direction: "sent" | "received";
  amount: number;
  currency: string;
  message: string | null;
  status: string;
  created_at: string | null;
  customer: { id: string; name: string; email?: string | null; phone?: string | null };
};

type GiftData = {
  settings: { wallet_enabled?: boolean; gifting_enabled?: boolean; gift_preset_amounts?: number[] };
  wallet: { currency: string; available_balance: number; status: string };
  gifts: GiftRow[];
};

function amountNumber(value: string) {
  const number = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function money(value: number, currency: string) {
  return `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function date(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    INVALID_GIFT_DATA: "أدخل مبلغًا صحيحًا ورقم جوال أو بريدًا للمستلم.",
    RECIPIENT_NOT_FOUND: "لم نجد عميلًا بهذا الجوال أو البريد داخل المتجر.",
    CANNOT_GIFT_TO_SELF: "لا يمكنك إهداء الرصيد إلى حسابك نفسه.",
    INSUFFICIENT_WALLET_BALANCE: "رصيد المحفظة غير كافٍ لإتمام الإهداء.",
    WALLET_GIFTING_DISABLED: "إهداء الرصيد غير مفعّل حاليًا.",
    CUSTOMER_WALLET_IS_NOT_ACTIVE: "محفظتك غير متاحة لإتمام العملية.",
  };
  return messages[code] || "تعذر إرسال الهدية. حاول مرة أخرى.";
}

export default function GiftBalanceScreen() {
  const accountCurrency = useAccountCurrency();
  const [data, setData] = useState<GiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/account/wallet/gifts", {
        cache: "no-store",
        credentials: "include",
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error(body?.error || "GIFTS_LOAD_FAILED");
      setData(body);
    } catch {
      setFeedback({ type: "error", text: "تعذر تحميل بيانات الإهداء." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const presetAmounts = useMemo(
    () => (Array.isArray(data?.settings?.gift_preset_amounts) ? data!.settings.gift_preset_amounts! : []).filter((value) => Number(value) > 0),
    [data?.settings?.gift_preset_amounts],
  );

  useEffect(() => {
    if (amount || !presetAmounts.length || accountCurrency.loading) return;
    const firstBaseAmount = Number(presetAmounts[0] || 0);
    if (firstBaseAmount > 0) {
      setAmount(String(accountCurrency.toDisplay(firstBaseAmount, accountCurrency.base.code)));
    }
  }, [amount, presetAmounts, accountCurrency]);

  const numericAmount = amountNumber(amount);
  const baseAmount = accountCurrency.toBase(numericAmount);
  const canSubmit = Boolean(
    data?.settings?.gifting_enabled &&
      data?.wallet?.status === "active" &&
      recipient.trim() &&
      numericAmount > 0 &&
      numericAmount <= accountCurrency.toDisplay(Number(data?.wallet?.available_balance || 0), data?.wallet?.currency) &&
      !submitting,
  );

  const balanceAfter = useMemo(
    () => Math.max(0, accountCurrency.toDisplay(Number(data?.wallet?.available_balance || 0), data?.wallet?.currency) - numericAmount),
    [data?.wallet?.available_balance, data?.wallet?.currency, numericAmount, accountCurrency],
  );

  async function submitGift() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/account/wallet/gifts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: recipient.trim(),
          amount: baseAmount,
          currency: accountCurrency.base.code,
          display_amount: numericAmount,
          display_currency: accountCurrency.active.code,
          exchange_rate_snapshot: accountCurrency.active.rate,
          message: message.trim(),
          idempotency_key: `gift:${crypto.randomUUID()}`,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error(body?.error || "GIFT_SEND_FAILED");

      setFeedback({
        type: "success",
        text: `تم إرسال ${accountCurrency.format(baseAmount, accountCurrency.base.code)} إلى ${body?.recipient?.name || "المستلم"}.`,
      });
      setRecipient("");
      setMessage("");
      await load();
    } catch (error: any) {
      setFeedback({ type: "error", text: errorMessage(String(error?.message || "")) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountLayout active="gift_balance" title="إهداء رصيد">
      <section className="mk-gift-balance" aria-label="إهداء رصيد">
        <div className="mk-gift-balance__header">
          <div>
            <h2>إهداء رصيد من محفظتك</h2>
            <p>أدخل جوال العميل أو بريده، وسيضاف الرصيد مباشرة إلى محفظته داخل المتجر.</p>
          </div>
          <div className="mk-gift-balance__safe">
            <ShieldCheck size={18} />
            <span>تحويل فوري وآمن</span>
          </div>
        </div>

        {feedback ? (
          <div
            style={{
              borderRadius: 16,
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              gap: 9,
              border: `1px solid ${feedback.type === "success" ? "#b7e4cf" : "#fecaca"}`,
              background: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: feedback.type === "success" ? "#047857" : "#b91c1c",
              fontWeight: 800,
            }}
          >
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.text}
          </div>
        ) : null}

        <div className="mk-gift-balance__layout">
          <div className="mk-gb-formCard">
            <div className="mk-gb-block">
              <div className="mk-gb-block__head"><span>1</span><strong>اختر مبلغ الهدية</strong></div>
              <div className="mk-gb-amounts">
                {presetAmounts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={Math.abs(numericAmount - accountCurrency.toDisplay(item, accountCurrency.base.code)) < 0.0001 ? "is-active" : ""}
                    onClick={() => setAmount(String(accountCurrency.toDisplay(item, accountCurrency.base.code)))}
                  >
                    {accountCurrency.format(item, accountCurrency.base.code)}
                  </button>
                ))}
              </div>
              <label className="mk-gb-field" style={{ marginTop: 12 }}>
                <span>مبلغ مخصص</span>
                <div><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="أدخل المبلغ" /><Wallet size={17} /></div>
              </label>
            </div>

            <div className="mk-gb-block">
              <div className="mk-gb-block__head"><span>2</span><strong>بيانات المستلم</strong></div>
              <label className="mk-gb-field">
                <span>رقم الجوال أو البريد الإلكتروني</span>
                <div><input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="05XXXXXXXX أو name@example.com" dir="ltr" /><User size={17} /></div>
              </label>
              <p style={{ margin: "9px 0 0", color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                يجب أن يكون المستلم عميلًا مسجلًا في هذا المتجر.
              </p>
            </div>

            <div className="mk-gb-block">
              <div className="mk-gb-block__head"><span>3</span><strong>رسالة اختيارية</strong></div>
              <label className="mk-gb-message">
                <textarea value={message} maxLength={300} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالة تظهر للمستلم في حركة المحفظة" />
                <small>{message.length}/300</small>
              </label>
            </div>

            <div className="mk-gb-actions">
              <button type="button" className="mk-gb-submit" disabled={!canSubmit} onClick={submitGift}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Gift size={18} />}
                <span>{submitting ? "جارٍ إرسال الهدية..." : "إرسال الهدية الآن"}</span>
              </button>
            </div>
          </div>

          <aside className="mk-gb-side">
            <div className="mk-gb-previewCard">
              <div className="mk-gb-previewCard__top"><Gift size={26} /><span>رصيد هدية</span></div>
              <div className="mk-gb-previewCard__amount"><strong>{new Intl.NumberFormat("ar-SA",{maximumFractionDigits:accountCurrency.active.decimals}).format(numericAmount || 0)}</strong><span>{accountCurrency.active.symbol || accountCurrency.active.code}</span></div>
              <div className="mk-gb-previewCard__to"><small>إلى</small><b>{recipient.trim() || "المستلم"}</b></div>
            </div>

            <div className="mk-gb-summary">
              <h3>ملخص العملية</h3>
              {loading ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={16} className="animate-spin" /> جارٍ التحميل...</div>
              ) : (
                <dl>
                  <div><dt>رصيدك المتاح</dt><dd>{accountCurrency.format(Number(data?.wallet.available_balance || 0), data?.wallet.currency || accountCurrency.base.code)}</dd></div>
                  <div><dt>قيمة الهدية</dt><dd>{accountCurrency.format(accountCurrency.toBase(numericAmount), data?.wallet.currency || accountCurrency.base.code)}</dd></div>
                  <div><dt>الرصيد بعد الإهداء</dt><dd>{`${new Intl.NumberFormat("ar-SA",{maximumFractionDigits:accountCurrency.active.decimals}).format(balanceAfter)} ${accountCurrency.active.symbol || accountCurrency.active.code}`}</dd></div>
                </dl>
              )}
              {!data?.settings?.gifting_enabled && !loading ? (
                <div className="mk-gb-note" style={{ color: "#b45309" }}><AlertCircle size={17} /><span>الإهداء غير مفعّل من المتجر.</span></div>
              ) : (
                <div className="mk-gb-note"><CheckCircle2 size={17} /><span>يُخصم الرصيد من محفظتك ويُضاف للمستلم في عملية واحدة.</span></div>
              )}
            </div>
          </aside>
        </div>

        <div className="mk-gb-recent">
          <div className="mk-gb-recent__head">
            <h3>سجل هدايا الرصيد</h3>
            <button type="button" onClick={load} disabled={loading} style={{ border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 800 }}>
              <RefreshCcw size={15} /> تحديث
            </button>
          </div>
          <div className="mk-gb-recent__list">
            {!loading && (data?.gifts?.length || 0) === 0 ? (
              <div style={{ padding: 18, color: "#64748b", fontWeight: 700 }}>لا توجد هدايا رصيد حتى الآن.</div>
            ) : null}
            {(data?.gifts || []).map((item) => (
              <div key={item.id} className="mk-gb-recent__row">
                <div><User size={16} /><strong>{item.customer.name}</strong></div>
                <span dir="ltr">{accountCurrency.format(item.amount, item.currency, item.direction === "sent" ? "debit" : "credit")}</span>
                <span>{item.direction === "sent" ? "مرسلة" : "مستلمة"}</span>
                <b>{item.status === "completed" ? "مكتملة" : item.status}</b>
                <small style={{ color: "#94a3b8" }}>{date(item.created_at)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AccountLayout>
  );
}
