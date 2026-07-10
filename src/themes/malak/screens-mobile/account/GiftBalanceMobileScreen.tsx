// FILE: apps/storefront/src/themes/malak/screens-mobile/account/GiftBalanceMobileScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Gift, Mail, MessageCircle, Phone, ShieldCheck, User, Wallet } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";

const AMOUNTS = [50, 100, 200, 500];
const METHODS = [
  { key: "whatsapp", label: "واتساب", icon: MessageCircle },
  { key: "sms", label: "رسالة نصية", icon: Phone },
  { key: "email", label: "البريد الإلكتروني", icon: Mail },
];
const RECENT_GIFTS = [
  { name: "سارة أحمد", amount: "100 ر.س", method: "واتساب", status: "تم الإرسال" },
  { name: "أحمد العتيبي", amount: "200 ر.س", method: "رسالة نصية", status: "مجدولة" },
  { name: "نورة خالد", amount: "50 ر.س", method: "البريد الإلكتروني", status: "قيد المعالجة" },
];

function cleanAmount(value: string) {
  const n = Number(String(value).replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "100";
  return String(n);
}

export default function GiftBalanceMobileScreen() {
  const [amount, setAmount] = useState("100");
  const [name, setName] = useState("سارة أحمد");
  const [phone, setPhone] = useState("05XXXXXXXX");
  const [email, setEmail] = useState("example@email.com");
  const [method, setMethod] = useState("whatsapp");
  const [message, setMessage] = useState("كل عام وأنت بخير، أتمنى لك يومًا مليئًا بالسعادة.");

  const selectedMethod = useMemo(() => METHODS.find((item) => item.key === method)?.label ?? "واتساب", [method]);
  const displayAmount = cleanAmount(amount);
  const displayName = name.trim() || "اسم المستلم";

  return (
    <AccountMobileLayout active="gift_balance" title="إهداء رصيد">
      <section className="mk-mgift2">
        <header className="mk-mgift2__hero">
          <div><Gift size={28} /></div>
          <h2>أرسل هدية رصيد</h2>
          <p>اختر المبلغ، أضف بيانات المستلم، ثم راجع الهدية قبل الإرسال.</p>
          <span><ShieldCheck size={15} /> إرسال آمن بعد تأكيد الطلب</span>
        </header>

        <div className="mk-mgift2__steps">
          <section className="mk-mgift2-card">
            <div className="mk-mgift2-card__head"><b>1</b><strong>اختر مبلغ الهدية</strong></div>
            <div className="mk-mgift2-amounts">
              {AMOUNTS.map((item) => (
                <button key={item} type="button" className={amount === String(item) ? "is-active" : ""} onClick={() => setAmount(String(item))}>
                  {item} ر.س
                </button>
              ))}
            </div>
            <label className="mk-mgift2-field">
              <span>مبلغ مخصص</span>
              <div><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" /><Wallet size={17} /></div>
            </label>
          </section>

          <section className="mk-mgift2-card">
            <div className="mk-mgift2-card__head"><b>2</b><strong>بيانات المستلم</strong></div>
            <label className="mk-mgift2-field"><span>اسم المستلم</span><div><input value={name} onChange={(e) => setName(e.target.value)} /><User size={17} /></div></label>
            <label className="mk-mgift2-field"><span>رقم الجوال</span><div><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /><Phone size={17} /></div></label>
            <label className="mk-mgift2-field"><span>البريد الإلكتروني اختياري</span><div><input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /><Mail size={17} /></div></label>
          </section>

          <section className="mk-mgift2-card">
            <div className="mk-mgift2-card__head"><b>3</b><strong>المراجعة والإرسال</strong></div>
            <div className="mk-mgift2-methods">
              {METHODS.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.key} type="button" className={method === item.key ? "is-active" : ""} onClick={() => setMethod(item.key)}>
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </div>
            <label className="mk-mgift2-message">
              <span>رسالة الإهداء</span>
              <textarea value={message} maxLength={160} onChange={(e) => setMessage(e.target.value)} />
              <small>{message.length}/160</small>
            </label>
            <div className="mk-mgift2-preview">
              <Gift size={22} />
              <strong>{displayAmount} ر.س</strong>
              <span>إلى {displayName} عبر {selectedMethod}</span>
            </div>
            <div className="mk-mgift2-note"><CheckCircle2 size={16} /> سيتم إرسال الهدية بعد تأكيد الطلب مباشرة.</div>
            <button type="button" className="mk-mgift2-submit"><Gift size={18} /> إرسال الهدية</button>
            <button type="button" className="mk-mgift2-later"><CalendarDays size={17} /> إرسال لاحقًا</button>
          </section>
        </div>

        <section className="mk-mgift2-recent">
          <h3>آخر الهدايا المرسلة</h3>
          {RECENT_GIFTS.map((item) => (
            <article key={`${item.name}-${item.amount}`}>
              <strong>{item.name}</strong><span>{item.amount}</span><span>{item.method}</span><b>{item.status}</b>
            </article>
          ))}
        </section>
      </section>
    </AccountMobileLayout>
  );
}
