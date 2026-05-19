// FILE: apps/storefront/src/themes/malak/screens/account/GiftBalanceScreen.tsx
"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Gift,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

const AMOUNTS = [50, 100, 200, 500];

const METHODS = [
  { key: "whatsapp", label: "واتساب", icon: MessageCircle },
  { key: "sms", label: "رسالة نصية", icon: Phone },
  { key: "email", label: "البريد الإلكتروني", icon: Mail },
];

const RECENT_GIFTS = [
  {
    name: "سارة أحمد",
    amount: "100 ر.س",
    method: "واتساب",
    status: "تم الإرسال",
  },
  {
    name: "أحمد العتيبي",
    amount: "200 ر.س",
    method: "رسالة نصية",
    status: "مجدولة",
  },
  {
    name: "نورة خالد",
    amount: "50 ر.س",
    method: "البريد الإلكتروني",
    status: "قيد المعالجة",
  },
];

function cleanAmount(value: string) {
  const n = Number(String(value).replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "100";
  return String(n);
}

export default function GiftBalanceScreen() {
  const [amount, setAmount] = useState("100");
  const [name, setName] = useState("سارة أحمد");
  const [phone, setPhone] = useState("05XXXXXXXX");
  const [email, setEmail] = useState("example@email.com");
  const [method, setMethod] = useState("whatsapp");
  const [message, setMessage] = useState(
    "كل عام وأنت بخير، أتمنى لك يومًا مليئًا بالسعادة."
  );

  const selectedMethod = useMemo(() => {
    return METHODS.find((item) => item.key === method)?.label ?? "واتساب";
  }, [method]);

  const displayAmount = cleanAmount(amount);
  const displayName = name.trim() || "اسم المستلم";

  return (
    <AccountLayout active="gift_balance" title="إهداء رصيد">
      <section className="mk-gift-balance" aria-label="إهداء رصيد">
        <div className="mk-gift-balance__header">
          <div>
            <h2>أرسل هدية رصيد</h2>
            <p>اختر المبلغ، أضف بيانات المستلم، ثم أرسل الهدية بسهولة.</p>
          </div>

          <div className="mk-gift-balance__safe">
            <ShieldCheck size={18} />
            <span>إرسال آمن بعد تأكيد الطلب</span>
          </div>
        </div>

        <div className="mk-gift-balance__layout">
          <div className="mk-gb-formCard">
            <div className="mk-gb-block">
              <div className="mk-gb-block__head">
                <span>1</span>
                <strong>اختر مبلغ الهدية</strong>
              </div>

              <div className="mk-gb-amounts">
                {AMOUNTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={amount === String(item) ? "is-active" : ""}
                    onClick={() => setAmount(String(item))}
                  >
                    {item} ر.س
                  </button>
                ))}
              </div>

              <label className="mk-gb-field">
                <span>مبلغ مخصص</span>
                <div>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="numeric"
                    placeholder="أدخل المبلغ"
                  />
                  <Wallet size={17} />
                </div>
              </label>
            </div>

            <div className="mk-gb-block">
              <div className="mk-gb-block__head">
                <span>2</span>
                <strong>بيانات المستلم</strong>
              </div>

              <div className="mk-gb-fieldsGrid">
                <label className="mk-gb-field">
                  <span>اسم المستلم</span>
                  <div>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="اكتب اسم المستلم"
                    />
                    <User size={17} />
                  </div>
                </label>

                <label className="mk-gb-field">
                  <span>رقم الجوال</span>
                  <div>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                    />
                    <Phone size={17} />
                  </div>
                </label>

                <label className="mk-gb-field mk-gb-field--full">
                  <span>البريد الإلكتروني اختياري</span>
                  <div>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                    <Mail size={17} />
                  </div>
                </label>
              </div>
            </div>

            <div className="mk-gb-block">
              <div className="mk-gb-block__head">
                <span>3</span>
                <strong>طريقة الإرسال</strong>
              </div>

              <div className="mk-gb-methods">
                {METHODS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={method === item.key ? "is-active" : ""}
                      onClick={() => setMethod(item.key)}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mk-gb-block">
              <div className="mk-gb-block__head">
                <span>4</span>
                <strong>رسالة الإهداء</strong>
              </div>

              <label className="mk-gb-message">
                <textarea
                  value={message}
                  maxLength={160}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="اكتب رسالة قصيرة للمستلم"
                />
                <small>{message.length}/160</small>
              </label>
            </div>

            <div className="mk-gb-actions">
              <button type="button" className="mk-gb-submit">
                <Gift size={18} />
                <span>إرسال الهدية</span>
              </button>

              <button type="button" className="mk-gb-previewBtn">
                <CalendarDays size={18} />
                <span>إرسال لاحقًا</span>
              </button>
            </div>
          </div>

          <aside className="mk-gb-side">
            <div className="mk-gb-previewCard">
              <div className="mk-gb-previewCard__top">
                <Gift size={26} />
                <span>بطاقة رصيد</span>
              </div>

              <div className="mk-gb-previewCard__amount">
                <strong>{displayAmount}</strong>
                <span>ر.س</span>
              </div>

              <div className="mk-gb-previewCard__to">
                <small>إلى</small>
                <b>{displayName}</b>
              </div>
            </div>

            <div className="mk-gb-summary">
              <h3>ملخص الهدية</h3>

              <dl>
                <div>
                  <dt>المبلغ</dt>
                  <dd>{displayAmount} ر.س</dd>
                </div>
                <div>
                  <dt>المستلم</dt>
                  <dd>{displayName}</dd>
                </div>
                <div>
                  <dt>طريقة الإرسال</dt>
                  <dd>{selectedMethod}</dd>
                </div>
              </dl>

              <div className="mk-gb-note">
                <CheckCircle2 size={17} />
                <span>سيتم إرسال الهدية بعد تأكيد الطلب مباشرة.</span>
              </div>
            </div>

            <div className="mk-gb-how">
              <h3>كيف تعمل؟</h3>

              <div className="mk-gb-how__item">
                <span>1</span>
                <p>اختر مبلغ الهدية المناسب.</p>
              </div>

              <div className="mk-gb-how__item">
                <span>2</span>
                <p>أضف بيانات المستلم وطريقة الإرسال.</p>
              </div>

              <div className="mk-gb-how__item">
                <span>3</span>
                <p>راجع التفاصيل ثم أرسل الهدية.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mk-gb-recent">
          <div className="mk-gb-recent__head">
            <h3>آخر الهدايا المرسلة</h3>
          </div>

          <div className="mk-gb-recent__list">
            {RECENT_GIFTS.map((item) => (
              <div key={`${item.name}-${item.amount}`} className="mk-gb-recent__row">
                <div>
                  <User size={16} />
                  <strong>{item.name}</strong>
                </div>

                <span>{item.amount}</span>
                <span>{item.method}</span>

                <b>{item.status}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AccountLayout>
  );
}