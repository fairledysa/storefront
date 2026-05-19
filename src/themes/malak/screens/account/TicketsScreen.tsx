// FILE: apps/storefront/src/themes/malak/screens/account/TicketsScreen.tsx
"use client";

import {
  ChevronLeft,
  Filter,
  Headphones,
  Hash,
  MessageCircle,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

const FILTERS = [
  { label: "الكل", count: 12, active: true },
  { label: "مفتوحة", count: 3, tone: "open" },
  { label: "قيد المعالجة", count: 5, tone: "progress" },
  { label: "بانتظار الرد", count: 2, tone: "waiting" },
  { label: "مغلقة", count: 2, tone: "closed" },
];

const TICKETS = [
  {
    id: "#TK-10012",
    title: "استفسار عن حالة الطلب",
    status: "قيد المعالجة",
    statusTone: "progress",
    note: "آخر رد من الدعم",
    updated: "تم التحديث منذ ساعة",
    date: "08 مايو 2025",
    time: "10:30 ص",
  },
  {
    id: "#TK-10011",
    title: "طلب تعديل في العنوان",
    status: "بانتظار الرد",
    statusTone: "waiting",
    note: "في انتظار ردك",
    updated: "تم التحديث منذ 6 ساعات",
    date: "06 مايو 2025",
    time: "04:15 م",
  },
  {
    id: "#TK-10010",
    title: "استفسار عن منتج",
    status: "مفتوحة",
    statusTone: "open",
    note: "تم استلام طلبك",
    updated: "تم التحديث منذ يوم",
    date: "05 مايو 2025",
    time: "02:45 م",
  },
  {
    id: "#TK-10009",
    title: "مشكلة في الدفع",
    status: "مغلقة",
    statusTone: "closed",
    note: "تم الحل",
    updated: "تم التحديث منذ 3 أيام",
    date: "02 مايو 2025",
    time: "11:20 ص",
  },
];

export default function TicketsScreen() {
  return (
    <AccountLayout active="tickets" title="تذاكري">
      <section className="mk-tickets" aria-label="تذاكري">
        <div className="mk-tickets__lead">
          يمكنك متابعة جميع طلبات الدعم والاستفسارات التي قمت بإنشائها
        </div>

        <div className="mk-tickets__panel">
          <div className="mk-tickets__filters" aria-label="حالات التذاكر">
            {FILTERS.map((item) => (
              <button
                key={item.label}
                type="button"
                className={[
                  "mk-tickets-filter",
                  item.active ? "is-active" : "",
                ].join(" ")}
              >
                <span>{item.label}</span>
                <b data-tone={item.tone || "all"}>{item.count}</b>
              </button>
            ))}
          </div>

          <div className="mk-tickets__toolbar">
            <button type="button" className="mk-tickets-tool">
              <SlidersHorizontal size={16} />
              <span>الأحدث أولًا</span>
            </button>

            <button type="button" className="mk-tickets-tool">
              <Filter size={16} />
              <span>تصفية</span>
            </button>
          </div>

          <div className="mk-tickets__list">
            {TICKETS.map((ticket) => (
              <article key={ticket.id} className="mk-ticket-row">
                <div className="mk-ticket-row__icon" aria-hidden="true">
                  <Headphones size={25} />
                </div>

                <div className="mk-ticket-row__main">
                  <div className="mk-ticket-row__number">
                    <Hash size={14} />
                    <span>{ticket.id}</span>
                  </div>

                  <h3>{ticket.title}</h3>
                  <p>{ticket.updated}</p>
                </div>

                <div className="mk-ticket-row__status">
                  <span data-tone={ticket.statusTone}>{ticket.status}</span>
                  <small>{ticket.note}</small>
                </div>

                <div className="mk-ticket-row__date">
                  <strong>{ticket.date}</strong>
                  <small>{ticket.time}</small>
                </div>

                <button
                  type="button"
                  className="mk-ticket-row__open"
                  aria-label={`فتح التذكرة ${ticket.id}`}
                >
                  <ChevronLeft size={18} />
                </button>
              </article>
            ))}
          </div>

          <div className="mk-tickets__pagination">
            <button type="button" disabled>
              التالي
            </button>

            <div className="mk-tickets__pages" aria-label="الصفحات">
              <button type="button" className="is-active">
                1
              </button>
              <button type="button">2</button>
              <button type="button">3</button>
            </div>

            <button type="button">السابق</button>
          </div>
        </div>

        <div className="mk-tickets__help">
          <div className="mk-tickets__helpIcon">
            <Headphones size={28} />
          </div>

          <div>
            <h3>لا تجد ما تبحث عنه؟</h3>
            <p>فريق الدعم لدينا جاهز لمساعدتك في أي وقت.</p>
          </div>

          <button type="button" className="mk-tickets__new">
            <Plus size={18} />
            <span>إنشاء تذكرة جديدة</span>
          </button>
        </div>
      </section>
    </AccountLayout>
  );
}