// FILE: apps/storefront/src/themes/malak/screens-mobile/account/RewardsMobileScreen.tsx
"use client";

import Link from "next/link";
import { Award, ChevronDown, Gift, Medal, PackageCheck, Sparkles, TicketPercent, Trophy } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";

const STATS = [
  { label: "إجمالي النقاط", value: "0", hint: "كل النقاط المكتسبة", icon: Medal },
  { label: "المكافآت المتاحة", value: "0", hint: "جاهزة للاستخدام", icon: Gift },
  { label: "القسائم المستبدلة", value: "0", hint: "لم يتم الاستبدال بعد", icon: TicketPercent },
];

const EMPTY_ROWS = [
  { title: "لا توجد مكافآت حاليًا", text: "بعد توفر مكافآت أو نقاط جديدة ستظهر تفاصيلها في هذا القسم.", icon: Gift },
  { title: "لا توجد قسائم مستبدلة", text: "عند استبدال نقاطك بقسائم خصم سيتم عرض القسائم هنا.", icon: TicketPercent },
  { title: "لا توجد حركات نقاط", text: "عمليات الإضافة والخصم من الرصيد ستظهر بشكل مرتب هنا.", icon: Award },
];

export default function RewardsMobileScreen() {
  return (
    <AccountMobileLayout active="rewards" title="مكافآتي">
      <div className="mk-mrewards">
        <section className="mk-mrewards-hero">
          <div className="mk-mrewards-hero__badge"><Sparkles size={15} /> برنامج المكافآت</div>
          <Trophy size={54} className="mk-mrewards-hero__icon" />
          <h2>نقاطك الحالية</h2>
          <div className="mk-mrewards-hero__points">0 <span>نقطة</span></div>
          <p>لا توجد نقاط أو مكافآت متاحة حاليًا. عند الشراء أو تفعيل عروض المكافآت ستظهر تفاصيل النقاط والاستبدال هنا.</p>
          <div className="mk-mrewards-hero__actions">
            <Link href="/"><PackageCheck size={16} /> تسوق الآن</Link>
            <button type="button" disabled><Gift size={16} /> استبدال المكافآت</button>
          </div>
        </section>

        <section className="mk-mrewards-stats">
          {STATS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label}>
                <Icon size={20} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </article>
            );
          })}
        </section>

        <section className="mk-mrewards-history">
          <div className="mk-mrewards-history__head">
            <div>
              <h3>سجل المكافآت</h3>
              <p>ستظهر هنا كل عمليات اكتساب واستبدال النقاط.</p>
            </div>
            <button type="button">الأحدث أولًا <ChevronDown size={14} /></button>
          </div>
          <div className="mk-mrewards-history__list">
            {EMPTY_ROWS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title}>
                  <Icon size={19} />
                  <div><strong>{item.title}</strong><span>{item.text}</span></div>
                  <b>قريبًا</b>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AccountMobileLayout>
  );
}
