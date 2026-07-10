// FILE: apps/storefront/src/themes/malak/screens-mobile/account/WalletMobileScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Gift, Info, Plus, RotateCcw, ShoppingBag, Wallet } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";

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
  { id: "t1", kind: "add", title: "إضافة رصيد", subtitle: "تمت إضافة رصيد عن طريق فيزا", amount: 100, dateText: "20 مايو 2025 - 10:35 ص" },
  { id: "t2", kind: "gift", title: "إهداء من صديقة", subtitle: "هدية من سارة", amount: 50, dateText: "18 مايو 2025 - 6:20 م" },
  { id: "t3", kind: "use", title: "استخدام في طلب #1301", subtitle: "تم استخدام الرصيد كخصم على الطلب", amount: -24, dateText: "15 مايو 2025 - 2:15 م" },
  { id: "t4", kind: "refund", title: "استرجاع طلب #1288", subtitle: "تمت إعادة الرصيد إلى محفظتك", amount: 24, dateText: "12 مايو 2025 - 9:40 ص" },
  { id: "t5", kind: "use", title: "استخدام في طلب #1250", subtitle: "تم استخدام الرصيد كخصم على الطلب", amount: -30, dateText: "8 مايو 2025 - 1:05 م" },
];

function money(value: number) {
  return `${Math.abs(Number(value ?? 0)).toLocaleString("en-US")} ر.س`;
}

function iconFor(kind: WalletTransaction["kind"]) {
  if (kind === "gift") return <Gift size={17} />;
  if (kind === "refund") return <RotateCcw size={17} />;
  if (kind === "use") return <ShoppingBag size={17} />;
  return <Plus size={17} />;
}

export default function WalletMobileScreen() {
  const [filter, setFilter] = useState<WalletFilter>("all");
  const visible = useMemo(() => {
    if (filter === "credit") return TEMP_TRANSACTIONS.filter((item) => item.amount > 0);
    if (filter === "debit") return TEMP_TRANSACTIONS.filter((item) => item.amount < 0);
    return TEMP_TRANSACTIONS;
  }, [filter]);

  return (
    <AccountMobileLayout active="wallet" title="الرصيد">
      <div className="mk-mwallet">
        <section className="mk-mwallet__hero">
          <div className="mk-mwallet__heroIcon"><Wallet size={34} /></div>
          <div className="mk-mwallet__label">رصيد محفظتك</div>
          <div dir="ltr" className="mk-mwallet__amount">{money(TEMP_BALANCE)}</div>
          <div className="mk-mwallet__hint"><Info size={14} /> الرصيد المتاح</div>
          <div className="mk-mwallet__actions">
            <button type="button" className="mk-mwallet__btn mk-mwallet__btn--soft"><Gift size={16} /> إهداء رصيد</button>
            <button type="button" className="mk-mwallet__btn"><Plus size={16} /> إضافة رصيد</button>
          </div>
        </section>

        <section className="mk-mwallet__stats">
          <div><strong>{money(TEMP_GIFTED)}</strong><span>الرصيد المهدى لك</span></div>
          <div><strong>{money(TEMP_EARNED)}</strong><span>إجمالي المكتسب</span></div>
        </section>

        <section className="mk-mwallet__history">
          <div className="mk-mwallet__head">
            <h2>حركات الرصيد</h2>
            <button type="button"><ChevronDown size={15} /> الأحدث أولًا</button>
          </div>
          <div className="mk-mwallet__filters">
            {(["all", "credit", "debit"] as WalletFilter[]).map((key) => (
              <button key={key} type="button" className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)}>
                {key === "all" ? "الكل" : key === "credit" ? "إضافة" : "خصم"}
              </button>
            ))}
          </div>
          {visible.length ? (
            <div className="mk-mwallet__list">
              {visible.map((item) => {
                const negative = item.amount < 0;
                return (
                  <article key={item.id} className="mk-mwallet-row">
                    <div className="mk-mwallet-row__icon">{iconFor(item.kind)}</div>
                    <div className="mk-mwallet-row__body">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                      <small>{item.dateText}</small>
                    </div>
                    <div dir="ltr" className={negative ? "is-negative" : "is-positive"}>
                      {negative ? "-" : "+"}{money(item.amount)}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mk-maccount-simpleCard">لا توجد حركات رصيد بعد</div>
          )}
        </section>
      </div>
    </AccountMobileLayout>
  );
}
