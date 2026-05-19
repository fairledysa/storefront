// FILE: apps/storefront/src/themes/malak/screens/account/WalletScreen.tsx
"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Gift,
  Info,
  Plus,
  RotateCcw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

type WalletFilter = "all" | "credit" | "debit";

type WalletTransaction = {
  id: string;
  kind: "add" | "gift" | "use" | "refund";
  title: string;
  subtitle: string;
  amount: number;
  dateText: string;
};

const TEMP_BALANCE = 245;
const TEMP_GIFTED = 0;
const TEMP_EARNED = 245;

const TEMP_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "t1",
    kind: "add",
    title: "إضافة رصيد",
    subtitle: "تمت إضافة رصيد عن طريق فيزا",
    amount: 100,
    dateText: "20 مايو 2025 - 10:35 ص",
  },
  {
    id: "t2",
    kind: "gift",
    title: "إهداء من صديقة",
    subtitle: "هدية من سارة",
    amount: 50,
    dateText: "18 مايو 2025 - 6:20 م",
  },
  {
    id: "t3",
    kind: "use",
    title: "استخدام في طلب #1301",
    subtitle: "تم استخدام الرصيد كخصم على الطلب",
    amount: -24,
    dateText: "15 مايو 2025 - 2:15 م",
  },
  {
    id: "t4",
    kind: "refund",
    title: "استرجاع طلب #1288",
    subtitle: "تمت إعادة الرصيد إلى محفظتك",
    amount: 24,
    dateText: "12 مايو 2025 - 9:40 ص",
  },
  {
    id: "t5",
    kind: "use",
    title: "استخدام في طلب #1250",
    subtitle: "تم استخدام الرصيد كخصم على الطلب",
    amount: -30,
    dateText: "8 مايو 2025 - 1:05 م",
  },
];

function money(value: number) {
  return `${Math.abs(Number(value ?? 0)).toLocaleString("en-US")} ر.س`;
}

function kindIcon(kind: WalletTransaction["kind"]) {
  if (kind === "gift") return <Gift size={18} strokeWidth={2.1} />;
  if (kind === "refund") return <RotateCcw size={18} strokeWidth={2.1} />;
  if (kind === "use") return <ShoppingBag size={18} strokeWidth={2.1} />;
  return <Plus size={18} strokeWidth={2.1} />;
}

function typeLabel(kind: WalletTransaction["kind"]) {
  if (kind === "gift") return "هدية";
  if (kind === "refund") return "استرجاع";
  if (kind === "use") return "خصم";
  return "إضافة";
}

function WalletStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="mk-wallet-stat">
      <span className="mk-wallet-stat__icon">{icon}</span>

      <div className="mk-wallet-stat__body">
        <div dir="ltr" className="mk-wallet-stat__value">
          {value}
        </div>
        <div className="mk-wallet-stat__label">{label}</div>
      </div>
    </div>
  );
}

function WalletRow({
  item,
  index,
}: {
  item: WalletTransaction;
  index: number;
}) {
  const isNegative = item.amount < 0;

  return (
    <div
      className="mk-wallet-row"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div
        dir="ltr"
        className={`mk-wallet-row__amount ${
          isNegative ? "is-negative" : "is-positive"
        }`}
      >
        {isNegative ? "-" : ""}
        {money(item.amount)}
      </div>

      <div
        className={`mk-wallet-row__badge ${
          isNegative ? "is-debit" : "is-credit"
        }`}
      >
        {isNegative ? "خصم" : "مكتمل"}
      </div>

      <div className="mk-wallet-row__date">{item.dateText}</div>

      <div className="mk-wallet-row__content">
        <div className="mk-wallet-row__title">{item.title}</div>
        <div className="mk-wallet-row__subtitle">{item.subtitle}</div>
      </div>

      <div className="mk-wallet-row__icon" title={typeLabel(item.kind)}>
        {kindIcon(item.kind)}
      </div>
    </div>
  );
}

export default function WalletScreen() {
  const [filter, setFilter] = useState<WalletFilter>("all");

  const visibleTransactions = useMemo(() => {
    if (filter === "credit") {
      return TEMP_TRANSACTIONS.filter((item) => item.amount > 0);
    }

    if (filter === "debit") {
      return TEMP_TRANSACTIONS.filter((item) => item.amount < 0);
    }

    return TEMP_TRANSACTIONS;
  }, [filter]);

  return (
    <AccountLayout
      active="wallet"
      title="الرصيد"
      subtitle="تابع رصيدك وحركات المحفظة واستخدمه في طلباتك القادمة."
    >
      <div className="mk-wallet">
        <aside className="mk-wallet__aside">
          <div className="mk-wallet-tipCard">
            <div className="mk-wallet-tipCard__icon">
              <Wallet size={22} strokeWidth={2} />
            </div>

            <div className="mk-wallet-tipCard__title">
              يمكنك إضافة رصيد الآن
            </div>

            <div className="mk-wallet-tipCard__text">
              استخدم رصيد المحفظة لتسريع عملية الدفع في طلباتك القادمة.
            </div>

            <button type="button" className="mk-wallet-tipCard__btn">
              إضافة رصيد
            </button>
          </div>
        </aside>

        <div className="mk-wallet__main">
          <section className="mk-wallet-hero">
            <div className="mk-wallet-hero__art">
              <span className="mk-wallet-hero__spark mk-wallet-hero__spark--1" />
              <span className="mk-wallet-hero__spark mk-wallet-hero__spark--2" />
              <span className="mk-wallet-hero__spark mk-wallet-hero__spark--3" />

              <div className="mk-wallet-hero__wallet">
                <Wallet size={92} strokeWidth={1.55} />
              </div>
            </div>

            <div className="mk-wallet-hero__content">
              <div className="mk-wallet-hero__summary">
                <div className="mk-wallet-hero__label">رصيد محفظتك</div>

                <div dir="ltr" className="mk-wallet-hero__amount">
                  {money(TEMP_BALANCE)}
                </div>

                <div className="mk-wallet-hero__hint">
                  <Info size={15} strokeWidth={2.1} />
                  الرصيد المتاح
                </div>
              </div>

              <div className="mk-wallet-hero__bottom">
                <div className="mk-wallet-hero__stats">
                  <WalletStat
                    icon={<Gift size={18} strokeWidth={2.1} />}
                    value={money(TEMP_GIFTED)}
                    label="الرصيد المهدي لك"
                  />

                  <WalletStat
                    icon={<RotateCcw size={18} strokeWidth={2.1} />}
                    value={money(TEMP_EARNED)}
                    label="إجمالي المكتسب"
                  />
                </div>

                <div className="mk-wallet-hero__actions">
                  <button
                    type="button"
                    className="mk-wallet-action mk-wallet-action--soft"
                  >
                    <Gift size={17} strokeWidth={2.1} />
                    إهداء رصيد
                  </button>

                  <button
                    type="button"
                    className="mk-wallet-action mk-wallet-action--primary"
                  >
                    <Plus size={17} strokeWidth={2.4} />
                    إضافة رصيد
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mk-wallet-history">
            <div className="mk-wallet-history__head">
              <h2 className="mk-wallet-history__title">حركات الرصيد</h2>

              <div className="mk-wallet-history__controls">
                <button
                  type="button"
                  className="mk-wallet-history__sort"
                >
                  الأحدث أولاً
                  <ChevronDown size={16} strokeWidth={2.2} />
                </button>

                <button
                  type="button"
                  className={`mk-wallet-filter ${
                    filter === "all" ? "is-active" : ""
                  }`}
                  onClick={() => setFilter("all")}
                >
                  الكل
                </button>

                <button
                  type="button"
                  className={`mk-wallet-filter ${
                    filter === "credit" ? "is-active" : ""
                  }`}
                  onClick={() => setFilter("credit")}
                >
                  إضافة
                </button>

                <button
                  type="button"
                  className={`mk-wallet-filter ${
                    filter === "debit" ? "is-active" : ""
                  }`}
                  onClick={() => setFilter("debit")}
                >
                  خصم
                </button>
              </div>
            </div>

            {visibleTransactions.length ? (
              <>
                <div className="mk-wallet-history__list">
                  {visibleTransactions.map((item, index) => (
                    <WalletRow key={item.id} item={item} index={index} />
                  ))}
                </div>

                <div className="mk-wallet-history__moreWrap">
                  <button type="button" className="mk-wallet-history__more">
                    <ChevronDown size={16} strokeWidth={2.4} />
                    عرض المزيد
                  </button>
                </div>
              </>
            ) : (
              <div className="mk-wallet-empty">
                <div className="mk-wallet-empty__icon">
                  <RotateCcw size={28} strokeWidth={1.9} />
                </div>

                <div className="mk-wallet-empty__title">
                  لا توجد حركات رصيد بعد
                </div>

                <div className="mk-wallet-empty__text">
                  عند إضافة رصيد أو استخدامه في الطلبات ستظهر جميع العمليات هنا.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AccountLayout>
  );
}