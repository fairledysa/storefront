// FILE: apps/storefront/src/themes/malak/screens-mobile/account/TicketsMobileScreen.tsx
"use client";

import { ChevronLeft, Filter, Hash, Headphones, Plus, SlidersHorizontal } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";

const FILTERS = [
  { label: "الكل", count: 12, active: true, tone: "all" },
  { label: "مفتوحة", count: 3, tone: "open" },
  { label: "قيد المعالجة", count: 5, tone: "progress" },
  { label: "بانتظار الرد", count: 2, tone: "waiting" },
  { label: "مغلقة", count: 2, tone: "closed" },
];

const TICKETS = [
  { id: "#TK-10012", title: "استفسار عن حالة الطلب", status: "قيد المعالجة", statusTone: "progress", note: "آخر رد من الدعم", updated: "تم التحديث منذ ساعة", date: "08 مايو 2025", time: "10:30 ص" },
  { id: "#TK-10011", title: "طلب تعديل في العنوان", status: "بانتظار الرد", statusTone: "waiting", note: "في انتظار ردك", updated: "تم التحديث منذ 6 ساعات", date: "06 مايو 2025", time: "04:15 م" },
  { id: "#TK-10010", title: "استفسار عن منتج", status: "مفتوحة", statusTone: "open", note: "تم استلام طلبك", updated: "تم التحديث منذ يوم", date: "05 مايو 2025", time: "02:45 م" },
  { id: "#TK-10009", title: "مشكلة في الدفع", status: "مغلقة", statusTone: "closed", note: "تم الحل", updated: "تم التحديث منذ 3 أيام", date: "02 مايو 2025", time: "11:20 ص" },
];

export default function TicketsMobileScreen() {
  return (
    <AccountMobileLayout active="tickets" title="تذاكري">
      <section className="mk-mtickets">
        <p className="mk-mtickets__lead">يمكنك متابعة جميع طلبات الدعم والاستفسارات التي قمت بإنشائها.</p>
        <div className="mk-mtickets__filters">
          {FILTERS.map((item) => (
            <button key={item.label} type="button" className={item.active ? "is-active" : ""}>
              <span>{item.label}</span><b data-tone={item.tone}>{item.count}</b>
            </button>
          ))}
        </div>
        <div className="mk-mtickets__toolbar">
          <button type="button"><SlidersHorizontal size={15} /> الأحدث أولًا</button>
          <button type="button"><Filter size={15} /> تصفية</button>
        </div>
        <div className="mk-mtickets__list">
          {TICKETS.map((ticket) => (
            <article key={ticket.id} className="mk-mticket-card">
              <div className="mk-mticket-card__top">
                <span><Hash size={13} /> {ticket.id}</span>
                <b data-tone={ticket.statusTone}>{ticket.status}</b>
              </div>
              <h3>{ticket.title}</h3>
              <p>{ticket.updated}</p>
              <div className="mk-mticket-card__meta">
                <span>{ticket.note}</span><span>{ticket.date}</span><span>{ticket.time}</span>
              </div>
              <button type="button" aria-label={`فتح التذكرة ${ticket.id}`}>
                فتح التذكرة <ChevronLeft size={16} />
              </button>
            </article>
          ))}
        </div>
        <div className="mk-mtickets__help">
          <Headphones size={26} />
          <div><strong>لا تجد ما تبحث عنه؟</strong><span>فريق الدعم لدينا جاهز لمساعدتك في أي وقت.</span></div>
          <button type="button"><Plus size={16} /> إنشاء تذكرة جديدة</button>
        </div>
      </section>
    </AccountMobileLayout>
  );
}
