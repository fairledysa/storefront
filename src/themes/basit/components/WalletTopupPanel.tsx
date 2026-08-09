"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, Plus, Wallet, X } from "lucide-react";
import { useAccountCurrency } from "../screens/account/account-currency";

declare global {
  interface Window { Moyasar?: { init: (options: Record<string, unknown>) => void }; }
}

type Props = {
  enabled: boolean;
  providerReady: boolean;
  disabled?: boolean;
  currency: string;
  minimumAmount?: number;
  maximumAmount?: number | null;
  onCompleted?: () => void;
  compact?: boolean;
};

const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.0.6/dist/moyasar.umd.js";
const STYLE_URL = "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.0.6/dist/moyasar.css";

function ensureAssets() {
  return new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${STYLE_URL}"]`)) {
      const link = document.createElement("link"); link.rel = "stylesheet"; link.href = STYLE_URL; document.head.appendChild(link);
    }
    if (window.Moyasar) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("MOYASAR_ASSET_LOAD_FAILED")), { once: true }); return; }
    const script = document.createElement("script"); script.src = SCRIPT_URL; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("MOYASAR_ASSET_LOAD_FAILED")); document.head.appendChild(script);
  });
}

export default function WalletTopupPanel(props: Props) {
  const accountCurrency = useAccountCurrency();
  const displayMinimum = accountCurrency.toDisplay(Number(props.minimumAmount || 10), props.currency);
  const displayMaximum = props.maximumAmount == null ? null : accountCurrency.toDisplay(Number(props.maximumAmount), props.currency);
  const id = useId().replace(/:/g, "");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(displayMinimum, 10)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentReady, setPaymentReady] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => { if (!open) setAmount(String(Math.max(displayMinimum, 1))); }, [displayMinimum, accountCurrency.active.code, open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open]);

  async function start() {
    setBusy(true); setError(""); setPaymentReady(false);
    try {
      const displayValue = Number(amount);
      const value = accountCurrency.toBase(displayValue);
      const response = await fetch("/api/account/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ amount: value, idempotency_key: `wallet-topup:${crypto.randomUUID()}` }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message_ar || payload?.error || "TOPUP_CREATE_FAILED");
      await ensureAssets();
      const selector = `#mysr-wallet-topup-${id}`;
      const host = document.querySelector(selector); if (host) host.innerHTML = "";
      window.Moyasar?.init({
        element: selector,
        amount: payload.moyasar.amount_minor,
        currency: payload.moyasar.currency,
        description: payload.moyasar.description,
        publishable_api_key: payload.moyasar.publishable_key,
        callback_url: payload.moyasar.callback_url,
        methods: ["creditcard"],
        supported_networks: ["mada", "visa", "mastercard", "amex", "unionpay"],
        metadata: payload.moyasar.metadata,
        on_completed: async (payment: any) => {
          await fetch("/api/account/wallet/topup", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ session_id: payload.session.id, payment_id: payment?.id }) });
        },
      });
      setPaymentReady(true);
    } catch (e: any) { setError(String(e?.message || "تعذر بدء عملية إضافة الرصيد")); }
    finally { setBusy(false); }
  }

  const unavailable = props.disabled || !props.enabled || !props.providerReady;
  const label = props.disabled ? "المحفظة غير متاحة" : !props.enabled ? "إضافة الرصيد غير مفعلة" : !props.providerReady ? "إضافة الرصيد غير متاحة حاليًا" : "إضافة رصيد";

  return <>
    <button type="button" disabled={unavailable} onClick={() => setOpen(true)} className={props.compact ? "mk-mwallet__btn" : "mk-wallet-action mk-wallet-action--primary"} title={label}>
      <Plus size={17}/><span>{label}</span>
    </button>
    {mounted && open ? createPortal(<div className="mk-topup-overlay" onMouseDown={(e)=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section className="mk-topup-modal" role="dialog" aria-modal="true" aria-label="إضافة رصيد">
        <header className="mk-topup-modal__head"><div><span className="mk-topup-modal__icon"><Wallet size={21}/></span><div><h2>إضافة رصيد</h2><p>أضف رصيدًا إلى محفظتك عبر ميسر.</p></div></div><button type="button" onClick={()=>setOpen(false)}><X size={20}/></button></header>
        <div className="mk-topup-modal__body">
          {!paymentReady ? <>
            <label className="mk-topup-field"><span>المبلغ ({accountCurrency.active.symbol || accountCurrency.active.code})</span><input type="number" min={displayMinimum || 1} max={displayMaximum ?? undefined} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/><small>الحد الأدنى {accountCurrency.format(Number(props.minimumAmount || 10), props.currency)}{props.maximumAmount ? ` · الحد الأعلى ${accountCurrency.format(Number(props.maximumAmount), props.currency)}` : ""}</small></label>
            <div className="mk-topup-presets">{[50,100,200,500].filter(v=>v>=displayMinimum&&(!displayMaximum||v<=displayMaximum)).map(v=><button type="button" key={v} onClick={()=>setAmount(String(v))}>{v} {accountCurrency.active.symbol || accountCurrency.active.code}</button>)}</div>
            {error ? <div className="mk-topup-error"><AlertCircle size={17}/>{error}</div> : null}
            <button className="mk-topup-submit" disabled={busy} onClick={()=>void start()}>{busy?<Loader2 className="animate-spin" size={18}/>:<Plus size={18}/>} {busy?"جارٍ التجهيز...":"متابعة إلى الدفع"}</button>
          </> : <div><div className="mk-topup-secure">سيتم التحقق من نجاح الدفع من السيرفر قبل إضافة الرصيد.</div><div id={`mysr-wallet-topup-${id}`} className="mysr-form"/></div>}
        </div>
      </section>
    </div>, document.body) : null}
  </>;
}
