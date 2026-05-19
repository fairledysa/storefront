// FILE: apps/storefront/src/themes/malak/screens/account/ReferScreen.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Link2,
  Mail,
  Share2,
  Sparkles,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

const REFERRAL_CODE = "ABCD1234";
const REFERRAL_LINK = "https://darb.localhost:3003/r/ABCD1234";

const STATS = [
  {
    label: "إجمالي الدعوات",
    value: "12",
    icon: Mail,
  },
  {
    label: "الأصدقاء المنضمون",
    value: "5",
    icon: Users,
  },
  {
    label: "المكافآت المكتسبة",
    value: "250 ر.س",
    icon: Gift,
  },
];

const STEPS = [
  {
    title: "شارك الرابط",
    text: "انسخ رابط الدعوة أو شاركه مع أصدقائك.",
    icon: Link2,
  },
  {
    title: "يسجل صديقك",
    text: "يدخل صديقك المتجر ويكمل أول طلب له.",
    icon: Users,
  },
  {
    title: "تحصل على المكافأة",
    text: "تضاف مكافأتك بعد اكتمال أول طلب.",
    icon: Gift,
  },
];

const REWARDS = [
  {
    label: "رصيد محفظة",
    value: "150 ر.س",
    action: "عرض الرصيد",
    icon: Wallet,
  },
  {
    label: "كوبون خصم",
    value: "15%",
    action: "عرض الكوبون",
    icon: TicketPercent,
  },
];

const INVITES = [
  {
    name: "نورة العتيبي",
    status: "اكتمل",
    reward: "+ 25 ر.س",
    date: "08 مايو 2026",
  },
  {
    name: "سارة الشهري",
    status: "بانتظار أول طلب",
    reward: "-",
    date: "06 مايو 2026",
  },
  {
    name: "هدى الدوسري",
    status: "اكتمل",
    reward: "+ 25 ر.س",
    date: "04 مايو 2026",
  },
];

export default function ReferScreen() {
  const [copied, setCopied] = useState(false);

  const copyLabel = useMemo(() => {
    return copied ? "تم النسخ" : "نسخ";
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AccountLayout active="refer" title="أدع صديقًا">
      <section className="mk-refer" aria-label="أدع صديقًا">
        <div className="mk-refer__lead">
          شارك رابط الدعوة مع أصدقائك واحصل على مكافآت عند أول طلب لهم.
        </div>

        <section className="mk-refer-hero">
          <div className="mk-refer-hero__art" aria-hidden="true">
            <div className="mk-refer-hero__circle">
              <Link2 size={42} />
            </div>

            <div className="mk-refer-hero__person mk-refer-hero__person--right">
              <Users size={26} />
            </div>

            <div className="mk-refer-hero__person mk-refer-hero__person--left">
              <Gift size={25} />
            </div>

            <Sparkles className="mk-refer-hero__spark mk-refer-hero__spark--one" size={18} />
            <Sparkles className="mk-refer-hero__spark mk-refer-hero__spark--two" size={16} />
          </div>

          <div className="mk-refer-hero__content">
            <div>
              <h2>شارك رابطك واربح</h2>
              <p>ادعُ أصدقاءك للحصول على مكافأة بعد إتمام أول طلب لهم.</p>
            </div>

            <div className="mk-refer-linkBox">
              <button type="button" className="mk-refer-share">
                <Share2 size={17} />
                <span>مشاركة</span>
              </button>

              <input readOnly value={REFERRAL_LINK} dir="ltr" />

              <button type="button" className="mk-refer-copy" onClick={handleCopy}>
                {copied ? <Check size={17} /> : <Copy size={17} />}
                <span>{copyLabel}</span>
              </button>
            </div>

            <div className="mk-refer-codeLine">
              <span>رمز الدعوة:</span>
              <b>{REFERRAL_CODE}</b>
            </div>
          </div>
        </section>

        <div className="mk-refer-stats">
          {STATS.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="mk-refer-stat">
                <div className="mk-refer-stat__icon">
                  <Icon size={24} />
                </div>

                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mk-refer__grid">
          <section className="mk-refer-card mk-refer-card--steps">
            <div className="mk-refer-card__head">
              <h3>كيف تعمل الدعوة؟</h3>
            </div>

            <div className="mk-refer-steps">
              {STEPS.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article key={item.title} className="mk-refer-step">
                    <div className="mk-refer-step__no">{index + 1}</div>

                    <div className="mk-refer-step__icon">
                      <Icon size={22} />
                    </div>

                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mk-refer-card mk-refer-card--rewards">
            <div className="mk-refer-card__head">
              <h3>مكافآتك</h3>
            </div>

            <div className="mk-refer-rewards">
              {REWARDS.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.label} className="mk-refer-reward">
                    <div className="mk-refer-reward__icon">
                      <Icon size={24} />
                    </div>

                    <span>{item.label}</span>
                    <strong>{item.value}</strong>

                    <button type="button">{item.action}</button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mk-refer-card mk-refer-card--invites">
          <div className="mk-refer-card__head mk-refer-card__head--split">
            <h3>الدعوات الأخيرة</h3>
            <button type="button">عرض الكل</button>
          </div>

          <div className="mk-refer-table">
            <div className="mk-refer-table__row mk-refer-table__row--head">
              <span>الصديق</span>
              <span>الحالة</span>
              <span>المكافأة</span>
              <span>تاريخ الدعوة</span>
            </div>

            {INVITES.map((item) => (
              <div key={`${item.name}-${item.date}`} className="mk-refer-table__row">
                <span>{item.name}</span>
                <span>
                  <b data-status={item.status}>{item.status}</b>
                </span>
                <span className="mk-refer-table__reward">{item.reward}</span>
                <span>{item.date}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mk-refer-banner">
          <div>
            <h3>كلما دعوت أكثر، زادت مكافآتك</h3>
            <p>شارك رابطك مع المزيد من الأصدقاء واستمتع بمكافآت أكثر.</p>
          </div>

          <div className="mk-refer-banner__icon">
            <Users size={38} />
          </div>
        </section>
      </section>
    </AccountLayout>
  );
}