// FILE: apps/storefront/src/themes/malak/screens-mobile/account/WalletMobileScreen.tsx
"use client";

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Gift,
  Info,
  LockKeyhole,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AccountMobileLayout from "./AccountMobileLayout";
import RequireMobileCustomer from "./_components/RequireMobileCustomer";
import WalletWithdrawalPanel from "../../components/WalletWithdrawalPanel";
import WalletTopupPanel from "../../components/WalletTopupPanel";
import { useAccountCurrency } from "../../screens/account/account-currency";

type WalletFilter = "all" | "credit" | "debit";
type WalletStatus = "active" | "frozen" | "closed" | string;
type TransactionDirection = "credit" | "debit" | string;

type WalletSummary = {
  id: string | null;
  currency: string;
  available_balance: number;
  pending_balance: number;
  lifetime_credit: number;
  lifetime_debit: number;
  status: WalletStatus;
  updated_at: string | null;
};

type WalletTransaction = {
  id: string;
  direction: TransactionDirection;
  transaction_type: string;
  amount: number;
  currency: string;
  reason: string | null;
  customer_message: string | null;
  status: string;
  expires_at: string | null;
  created_at: string | null;
  order: { id: string; display_no: number } | null;
  metadata: {
    source?: string;
    phase?: string;
    sender_customer_id?: string;
    recipient_customer_id?: string;
  };
  counterparty?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type WalletApiSuccess = {
  ok: true;
  wallet: WalletSummary;
  transactions: WalletTransaction[];
  settings?: { withdrawal_enabled?: boolean; minimum_withdrawal_amount?: number; withdrawal_processing_days?: number; topup_enabled?: boolean; gifting_enabled?: boolean; minimum_topup_amount?: number; maximum_topup_amount?: number | null; moyasar_ready?: boolean };
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: WalletApiSuccess };

const STATUS_LABELS: Record<string, string> = {
  posted: "مكتمل",
  pending: "قيد المعالجة",
  cancelled: "ملغي",
  reversed: "تم العكس",
  failed: "فشل",
};

const WALLET_STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  frozen: "مجمّدة",
  closed: "مغلقة",
};

const TRANSACTION_LABELS: Record<string, string> = {
  manual_credit: "إضافة رصيد",
  manual_debit: "خصم رصيد",
  adjustment_credit: "تسوية رصيد بالإضافة",
  adjustment_debit: "تسوية رصيد بالخصم",
  refund_credit: "استرجاع مبلغ",
  cashback_credit: "مكافأة نقدية",
  gift_credit: "هدية رصيد",
  gift_debit: "إهداء رصيد",
  order_payment_debit: "استخدام الرصيد في طلب",
  order_payment_reversal: "إعادة رصيد طلب",
  expiry_debit: "انتهاء صلاحية رصيد",
  hold_created: "حجز مبلغ",
  hold_released: "إلغاء حجز مبلغ",
  hold_captured: "تثبيت مبلغ محجوز",
  hold_cancelled: "إلغاء عملية حجز",
};

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function currencyLabel(currency: unknown) {
  const code = String(currency ?? "SAR").trim().toUpperCase() || "SAR";
  const labels: Record<string, string> = {
    SAR: "ر.س",
    AED: "د.إ",
    KWD: "د.ك",
    BHD: "د.ب",
    OMR: "ر.ع",
    QAR: "ر.ق",
    YER: "ر.ي",
    USD: "$",
    EUR: "€",
  };
  return labels[code] || code;
}

function money(value: unknown, currency: unknown, options?: { signed?: boolean; direction?: TransactionDirection }) {
  const amount = Math.abs(safeNumber(value));
  const formatted = new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount);
  const sign = options?.signed
    ? options.direction === "debit"
      ? "−"
      : "+"
    : "";
  return `${sign}${formatted} ${currencyLabel(currency)}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const datePart = new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("ar-SA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${datePart} - ${timePart}`;
}

function orderSuffix(transaction: WalletTransaction) {
  const displayNo = Number(transaction.order?.display_no ?? 0);
  return Number.isSafeInteger(displayNo) && displayNo > 0 ? ` #${displayNo}` : "";
}

function transactionTitle(transaction: WalletTransaction) {
  const source = String(transaction.metadata?.source ?? "").trim();
  const phase = String(transaction.metadata?.phase ?? "").trim();
  const suffix = orderSuffix(transaction);
  const otherName = String(transaction.counterparty?.name ?? "").trim();

  if (transaction.transaction_type === "gift_credit") {
    return otherName ? `هدية رصيد من ${otherName}` : "هدية رصيد";
  }

  if (transaction.transaction_type === "gift_debit") {
    return otherName ? `إهداء رصيد إلى ${otherName}` : "إهداء رصيد";
  }

  if (
    source === "merchant_order_edit_wallet_refund" ||
    phase === "order_edit_wallet_refund_phase_1"
  ) {
    return `استرجاع من الطلب${suffix}`;
  }

  if (
    source === "merchant_order_edit_wallet_deduct" ||
    phase === "order_edit_wallet_deduct_phase_1"
  ) {
    return `استخدام الرصيد في الطلب${suffix}`;
  }

  if (transaction.transaction_type === "refund_credit" && suffix) {
    return `استرجاع الطلب${suffix}`;
  }

  if (transaction.transaction_type === "order_payment_debit" && suffix) {
    return `استخدام الرصيد في الطلب${suffix}`;
  }

  if (transaction.transaction_type === "order_payment_reversal" && suffix) {
    return `إعادة رصيد الطلب${suffix}`;
  }

  return TRANSACTION_LABELS[transaction.transaction_type] ||
    (transaction.direction === "debit" ? "خصم رصيد" : "إضافة رصيد");
}

function transactionDescription(transaction: WalletTransaction) {
  const direct = String(transaction.customer_message ?? "").trim();
  if (direct) return direct;

  const reason = String(transaction.reason ?? "").trim();
  if (reason) return reason;

  const fallbacks: Record<string, string> = {
    manual_credit: "تمت إضافة رصيد إلى محفظتك",
    manual_debit: "تم خصم مبلغ من محفظتك",
    adjustment_credit: "تمت تسوية الرصيد بالإضافة",
    adjustment_debit: "تمت تسوية الرصيد بالخصم",
    refund_credit: "تمت إعادة المبلغ إلى محفظتك",
    cashback_credit: "تمت إضافة مكافأة نقدية إلى محفظتك",
    order_payment_debit: "تم استخدام الرصيد كخصم على الطلب",
    order_payment_reversal: "تمت إعادة رصيد الطلب إلى محفظتك",
    expiry_debit: "انتهت صلاحية جزء من الرصيد",
    hold_created: "تم حجز المبلغ مؤقتًا",
    hold_released: "تمت إعادة المبلغ المحجوز إلى الرصيد المتاح",
    hold_captured: "تم تثبيت خصم المبلغ المحجوز",
    hold_cancelled: "تم إلغاء حجز المبلغ",
  };

  return fallbacks[transaction.transaction_type] ||
    (transaction.direction === "debit" ? "تم خصم مبلغ من المحفظة" : "تمت إضافة مبلغ إلى المحفظة");
}

function transactionIcon(transaction: WalletTransaction) {
  const type = transaction.transaction_type;
  const source = String(transaction.metadata?.source ?? "");

  if (type === "cashback_credit") return <Gift size={18} aria-hidden />;
  if (type.includes("refund") || type.includes("reversal") || source.includes("refund")) {
    return <RotateCcw size={18} aria-hidden />;
  }
  if (type.includes("order_payment") || source.includes("order_edit_wallet_deduct")) {
    return <ShoppingBag size={18} aria-hidden />;
  }
  if (type.startsWith("hold_")) return <LockKeyhole size={18} aria-hidden />;
  return transaction.direction === "debit"
    ? <ArrowUpRight size={18} aria-hidden />
    : <ArrowDownLeft size={18} aria-hidden />;
}

function WalletSkeleton() {
  return (
    <div className="mk-mwallet" aria-busy="true" aria-label="جارٍ تحميل المحفظة">
      <section className="mk-mwallet__hero mk-mwallet__hero--skeleton">
        <div className="mk-mwallet-skeleton mk-mwallet-skeleton--icon" />
        <div className="mk-mwallet-skeleton mk-mwallet-skeleton--label" />
        <div className="mk-mwallet-skeleton mk-mwallet-skeleton--amount" />
        <div className="mk-mwallet-skeleton mk-mwallet-skeleton--line" />
      </section>
      <section className="mk-mwallet__stats">
        <div className="mk-mwallet-stat mk-mwallet-stat--skeleton" />
        <div className="mk-mwallet-stat mk-mwallet-stat--skeleton" />
      </section>
      <section className="mk-mwallet__history">
        <div className="mk-mwallet-skeleton mk-mwallet-skeleton--heading" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="mk-mwallet-row mk-mwallet-row--skeleton">
            <div className="mk-mwallet-skeleton mk-mwallet-skeleton--rowIcon" />
            <div className="mk-mwallet-row__body">
              <div className="mk-mwallet-skeleton mk-mwallet-skeleton--rowTitle" />
              <div className="mk-mwallet-skeleton mk-mwallet-skeleton--rowText" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function WalletContent() {
  const accountCurrency = useAccountCurrency();
  const router = useRouter();
  const [filter, setFilter] = useState<WalletFilter>("all");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const loadWallet = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const response = await fetch("/api/account/wallet", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent("/account/wallet")}`);
        return;
      }

      if (!response.ok || !payload?.ok || !payload?.wallet) {
        throw new Error("WALLET_LOAD_FAILED");
      }

      const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
      setState({
        kind: "ready",
        data: {
          ok: true,
          wallet: {
            ...payload.wallet,
            available_balance: safeNumber(payload.wallet.available_balance),
            pending_balance: safeNumber(payload.wallet.pending_balance),
            lifetime_credit: safeNumber(payload.wallet.lifetime_credit),
            lifetime_debit: safeNumber(payload.wallet.lifetime_debit),
          },
          settings: payload.settings && typeof payload.settings === "object" ? payload.settings : {},
          transactions: transactions.map((transaction: WalletTransaction) => ({
            ...transaction,
            amount: safeNumber(transaction.amount),
            metadata: transaction.metadata && typeof transaction.metadata === "object"
              ? transaction.metadata
              : {},
          })),
        },
      });
    } catch {
      setState({ kind: "error", message: "تعذر تحميل بيانات المحفظة" });
    }
  }, [router]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const visibleTransactions = useMemo(() => {
    if (state.kind !== "ready") return [];
    if (filter === "all") return state.data.transactions;
    return state.data.transactions.filter((transaction) => transaction.direction === filter);
  }, [filter, state]);

  if (state.kind === "loading") return <WalletSkeleton />;

  if (state.kind === "error") {
    return (
      <div className="mk-mwallet mk-mwallet--error">
        <section className="mk-mwallet-stateCard" role="alert">
          <div className="mk-mwallet-stateCard__icon"><AlertCircle size={24} /></div>
          <strong>{state.message}</strong>
          <span>تحقق من اتصالك ثم حاول مرة أخرى.</span>
          <button type="button" onClick={() => void loadWallet()}>
            <RefreshCcw size={17} /> إعادة المحاولة
          </button>
        </section>
      </div>
    );
  }

  const { wallet, transactions, settings } = state.data;
  const walletStatus = String(wallet.status || "active").toLowerCase();
  const isRestricted = walletStatus === "frozen" || walletStatus === "closed";

  return (
    <div className="mk-mwallet">
      {isRestricted ? (
        <div className="mk-mwallet__notice" role="status">
          <LockKeyhole size={18} />
          <div>
            <strong>المحفظة {WALLET_STATUS_LABELS[walletStatus] || walletStatus}</strong>
            <span>يمكنك مشاهدة الرصيد والحركات، لكن العمليات الجديدة غير متاحة حاليًا.</span>
          </div>
        </div>
      ) : null}

      <section className="mk-mwallet__hero">
        <div className="mk-mwallet__heroTop">
          <div className="mk-mwallet__heroIcon"><Wallet size={31} aria-hidden /></div>
          <span className={`mk-mwallet__status mk-mwallet__status--${walletStatus}`}>
            {WALLET_STATUS_LABELS[walletStatus] || walletStatus}
          </span>
        </div>
        <div className="mk-mwallet__label">رصيد محفظتك</div>
        <div dir="ltr" className="mk-mwallet__amount">{accountCurrency.format(wallet.available_balance, wallet.currency)}</div>
        <div className="mk-mwallet__hint"><Info size={14} /> الرصيد المتاح للاستخدام</div>

        {wallet.pending_balance > 0 ? (
          <div className="mk-mwallet__pending">
            <Clock3 size={15} />
            <span>قيد المعالجة</span>
            <strong dir="ltr">{accountCurrency.format(wallet.pending_balance, wallet.currency)}</strong>
          </div>
        ) : null}

        <div className="mk-mwallet__actions">
          <WalletWithdrawalPanel
            compact
            enabled={!!settings?.withdrawal_enabled}
            availableBalance={wallet.available_balance}
            currency={wallet.currency}
            minimumAmount={Number(settings?.minimum_withdrawal_amount || 50)}
            processingDays={Number(settings?.withdrawal_processing_days || 3)}
            disabled={isRestricted}
          />
          <WalletTopupPanel compact enabled={!!settings?.topup_enabled} providerReady={!!settings?.moyasar_ready} disabled={isRestricted} currency={wallet.currency} minimumAmount={Number(settings?.minimum_topup_amount || 10)} maximumAmount={settings?.maximum_topup_amount == null ? null : Number(settings.maximum_topup_amount)} />
        </div>

        <button
          type="button"
          className="mk-mwallet__giftLink"
          onClick={() => router.push("/account/gift-balance")}
        >
          <Gift size={15} /> إهداء رصيد
        </button>
      </section>

      <section className="mk-mwallet__stats" aria-label="ملخص المحفظة">
        <div className="mk-mwallet-stat">
          <span className="mk-mwallet-stat__icon is-credit"><ArrowDownLeft size={18} /></span>
          <div>
            <span>إجمالي الإضافات</span>
            <strong dir="ltr">{accountCurrency.format(wallet.lifetime_credit, wallet.currency)}</strong>
          </div>
        </div>
        <div className="mk-mwallet-stat">
          <span className="mk-mwallet-stat__icon is-debit"><ArrowUpRight size={18} /></span>
          <div>
            <span>إجمالي الخصومات</span>
            <strong dir="ltr">{accountCurrency.format(wallet.lifetime_debit, wallet.currency)}</strong>
          </div>
        </div>
      </section>

      <section className="mk-mwallet__history">
        <div className="mk-mwallet__head">
          <div>
            <h2>حركات الرصيد</h2>
            <p>الأحدث أولًا</p>
          </div>
          <span className="mk-mwallet__count">{transactions.length}</span>
        </div>

        <div className="mk-mwallet__filters" role="tablist" aria-label="تصفية حركات الرصيد">
          {(["all", "credit", "debit"] as WalletFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? "is-active" : ""}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "الكل" : key === "credit" ? "إضافة" : "خصم"}
            </button>
          ))}
        </div>

        {visibleTransactions.length ? (
          <div className="mk-mwallet__list">
            {visibleTransactions.map((transaction) => {
              const isDebit = transaction.direction === "debit";
              const statusKey = String(transaction.status || "").toLowerCase();
              const dateText = formatDate(transaction.created_at);
              const expiryText = formatDate(transaction.expires_at);

              return (
                <article key={transaction.id} className={`mk-mwallet-row ${isDebit ? "is-debit" : "is-credit"}`}>
                  <div className="mk-mwallet-row__top">
                    <div className="mk-mwallet-row__identity">
                      <div className="mk-mwallet-row__icon">{transactionIcon(transaction)}</div>
                      <div className="mk-mwallet-row__body">
                        <strong>{transactionTitle(transaction)}</strong>
                        <span>{transactionDescription(transaction)}</span>
                      </div>
                    </div>
                    <div dir="ltr" className={`mk-mwallet-row__amount ${isDebit ? "is-negative" : "is-positive"}`}>
                      {accountCurrency.format(transaction.amount, transaction.currency || wallet.currency, isDebit ? "debit" : "credit")}
                    </div>
                  </div>

                  <div className="mk-mwallet-row__meta">
                    <span className={`mk-mwallet-row__status is-${statusKey}`}>
                      {STATUS_LABELS[statusKey] || "غير معروف"}
                    </span>
                    {dateText ? <time dateTime={transaction.created_at || undefined}>{dateText}</time> : null}
                  </div>

                  {expiryText ? (
                    <div className="mk-mwallet-row__expiry">
                      <Clock3 size={13} /> صالح حتى {expiryText}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mk-mwallet-stateCard mk-mwallet-stateCard--empty">
            <div className="mk-mwallet-stateCard__icon"><Wallet size={23} /></div>
            <strong>{transactions.length ? "لا توجد حركات ضمن هذا التصنيف" : "لا توجد حركات رصيد حتى الآن"}</strong>
            <span>{transactions.length ? "اختر تصنيفًا آخر لعرض الحركات." : "ستظهر هنا جميع الإضافات والخصومات عند حدوثها."}</span>
          </div>
        )}
      </section>
    </div>
  );
}

export default function WalletMobileScreen() {
  return (
    <RequireMobileCustomer>
      <AccountMobileLayout active="wallet" title="الرصيد والمحفظة">
        <WalletContent />
      </AccountMobileLayout>
    </RequireMobileCustomer>
  );
}