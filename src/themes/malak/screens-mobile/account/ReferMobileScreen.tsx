// FILE: apps/storefront/src/themes/malak/screens-mobile/account/ReferMobileScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Gift, Link2, Mail, Share2, Sparkles, TicketPercent, Users, Wallet } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";

const REFERRAL_CODE = "ABCD1234";
const REFERRAL_LINK = "https://darb.localhost:3003/r/ABCD1234";
const STATS = [
  { label: "إجمالي الدعوات", value: "12", icon: Mail },
  { label: "الأصدقاء المنضمون", value: "5", icon: Users },
  { label: "المكافآت المكتسبة", value: "250 ر.س", icon: Gift },
];
const STEPS = [
  { title: "شارك الرابط", text: "انسخ رابط الدعوة أو شاركه مع أصدقائك.", icon: Link2 },
  { title: "يسجل صديقك", text: "يدخل صديقك المتجر ويكمل أول طلب له.", icon: Users },
  { title: "تحصل على المكافأة", text: "تضاف مكافأتك بعد اكتمال أول طلب.", icon: Gift },
];
const REWARDS = [
  { label: "رصيد محفظة", value: "150 ر.س", action: "عرض الرصيد", icon: Wallet },
  { label: "كوبون خصم", value: "15%", action: "عرض الكوبون", icon: TicketPercent },
];
const INVITES = [
  { name: "نورة العتيبي", status: "اكتمل", reward: "+ 25 ر.س", date: "08 مايو 2026" },
  { name: "سارة الشهري", status: "بانتظار أول طلب", reward: "-", date: "06 مايو 2026" },
  { name: "هدى الدوسري", status: "اكتمل", reward: "+ 25 ر.س", date: "04 مايو 2026" },
];

export default function ReferMobileScreen() {
  const [copied, setCopied] = useState(false);
  const copyLabel = useMemo(() => (copied ? "تم النسخ" : "نسخ"), [copied]);

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
    <AccountMobileLayout active="refer" title="أدع صديقًا">
      <section className="mk-mrefer2">
        <header className="mk-mrefer2-hero">
          <Sparkles size={18} />
          <h2>شارك رابطك واربح</h2>
          <p>شارك رابط الدعوة مع أصدقائك واحصل على مكافآت عند أول طلب لهم.</p>
          <div className="mk-mrefer2-link">
            <input readOnly value={REFERRAL_LINK} dir="ltr" />
            <button type="button" onClick={handleCopy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copyLabel}</button>
          </div>
          <div className="mk-mrefer2-code"><span>رمز الدعوة:</span><b>{REFERRAL_CODE}</b><button type="button"><Share2 size={15} /> مشاركة</button></div>
        </header>

        <section className="mk-mrefer2-stats">
          {STATS.map((item) => {
            const Icon = item.icon;
            return <article key={item.label}><Icon size={20} /><span>{item.label}</span><strong>{item.value}</strong></article>;
          })}
        </section>

        <section className="mk-mrefer2-card">
          <h3>كيف تعمل الدعوة؟</h3>
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return <article key={item.title}><b>{index + 1}</b><Icon size={20} /><div><strong>{item.title}</strong><span>{item.text}</span></div></article>;
          })}
        </section>

        <section className="mk-mrefer2-rewards">
          {REWARDS.map((item) => {
            const Icon = item.icon;
            return <article key={item.label}><Icon size={22} /><span>{item.label}</span><strong>{item.value}</strong><button type="button">{item.action}</button></article>;
          })}
        </section>

        <section className="mk-mrefer2-invites">
          <div><h3>الدعوات الأخيرة</h3><button type="button">عرض الكل</button></div>
          {INVITES.map((item) => (
            <article key={`${item.name}-${item.date}`}><strong>{item.name}</strong><span>{item.status}</span><b>{item.reward}</b><small>{item.date}</small></article>
          ))}
        </section>
      </section>
    </AccountMobileLayout>
  );
}
