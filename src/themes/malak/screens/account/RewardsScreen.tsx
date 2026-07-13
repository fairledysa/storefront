"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  Check,
  Copy,
  Gift,
  Loader2,
  Medal,
  PackageCheck,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  TicketPercent,
  Trophy,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import {
  formatPoints,
  redeemLoyaltyReward,
  transactionLabel,
  type LoyaltyRedemptionResult,
  type LoyaltyReward,
  useRewardsData,
} from "./rewards-data";
import RewardRedeemDialog from "./RewardRedeemDialog";
import { useAccountCurrency } from "./account-currency";

function rewardValueLabel(redemption: { reward_type: string; reward_value: number; currency: string }, formatMoney: (amount:number,currency:string)=>string) {
  if (redemption.reward_type === "coupon_percentage") {
    return `${redemption.reward_value}% خصم`;
  }
  if (redemption.reward_type === "wallet_credit") {
    return `${formatMoney(redemption.reward_value, redemption.currency)} رصيد محفظة`;
  }
  return `${formatMoney(redemption.reward_value, redemption.currency)} خصم`;
}

function couponStatusLabel(status: string | null) {
  const labels: Record<string, string> = {
    available: "متاح",
    used: "مستخدم",
    expired: "منتهي",
    inactive: "غير مفعّل",
  };
  return status ? labels[status] ?? status : "مكتمل";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

function RewardStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-5 shadow-[0_12px_34px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--mk-text-muted)]">{label}</div>
          <div className="mt-2 text-3xl font-black text-[var(--mk-text-main)]">{value}</div>
          {hint ? <div className="mt-1 text-xs font-bold text-[var(--mk-text-muted)]">{hint}</div> : null}
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)] text-[var(--mk-color-primary)]">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default function RewardsScreen() {
  const accountCurrency = useAccountCurrency();
  const { data, loading, error, reload } = useRewardsData();
  const account = data.account;
  const rewardsSectionRef = useRef<HTMLElement | null>(null);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<LoyaltyRedemptionResult | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const enabled = data.settings.enabled;
  const canRedeem =
    enabled &&
    data.settings.redemption_enabled &&
    account.status === "active" &&
    account.available_points >= data.settings.minimum_redeem_points &&
    data.rewards.length > 0;

  async function confirmRedeem() {
    if (!selectedReward || redeeming) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const operationId = crypto.randomUUID();
      const result = await redeemLoyaltyReward(
        selectedReward.id,
        `loyalty:redeem:${selectedReward.id}:${operationId}`,
      );
      setRedeemResult(result);
      await reload();
    } catch (caught) {
      setRedeemError(
        caught instanceof Error ? caught.message : "تعذر استبدال المكافأة.",
      );
    } finally {
      setRedeeming(false);
    }
  }

  function closeRedeemDialog() {
    if (redeeming) return;
    setSelectedReward(null);
    setRedeemError(null);
    setRedeemResult(null);
  }

  return (
    <AccountLayout
      active="rewards"
      title="مكافآتي"
      subtitle="تابع نقاطك ومكافآتك المتاحة واستبدلها عند توفر العروض."
    >
      <div className="grid gap-5">
        {error ? (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <span className="flex items-center gap-2"><AlertCircle size={18} />{error}</span>
            <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2"><RefreshCw size={15} />إعادة المحاولة</button>
          </div>
        ) : null}

        <section className="relative overflow-hidden rounded-[28px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-7 shadow-[0_18px_60px_rgba(15,23,42,0.055)]">
          <div className="pointer-events-none absolute -start-20 -top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--mk-color-primary)_10%,transparent)] blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)] px-4 py-2 text-xs font-black text-[var(--mk-color-primary)]">
                <Sparkles size={15} /> برنامج المكافآت
              </div>
              <h2 className="text-4xl font-black text-[var(--mk-text-main)]">رصيد نقاطك المتاح</h2>
              <div className="mt-3 flex items-end gap-3">
                <div className="text-6xl font-black leading-none text-[var(--mk-color-primary)]">
                  {loading ? <Loader2 className="animate-spin" size={48} /> : formatPoints(account.available_points)}
                </div>
                {!loading ? <div className="pb-2 text-lg font-black text-[var(--mk-text-main)]">نقطة</div> : null}
              </div>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-[var(--mk-text-muted)]">
                {loading
                  ? "جارٍ تحميل رصيد النقاط والمكافآت..."
                  : !enabled
                    ? "برنامج المكافآت غير مفعّل حاليًا في هذا المتجر."
                    : account.pending_points > 0
                      ? `لديك ${formatPoints(account.pending_points)} نقطة معلقة ستظهر في رصيدك بعد اعتمادها.`
                      : "اكسب النقاط من الطلبات المؤهلة واستبدلها بالمكافآت المتاحة."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--mk-color-primary)] px-5 text-sm font-black text-white">
                  <PackageCheck size={17} /> تسوق الآن
                </Link>
                <button type="button" disabled={!canRedeem} onClick={() => rewardsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--mk-border-soft)] px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50">
                  <Gift size={17} /> استبدال المكافآت
                </button>
              </div>
            </div>
            <div className="relative hidden min-h-[230px] items-center justify-center lg:flex">
              <div className="grid h-44 w-44 place-items-center rounded-[42px] border border-[var(--mk-primary-border)] bg-[linear-gradient(145deg,white,color-mix(in_srgb,var(--mk-color-primary)_9%,white))] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <Trophy size={74} className="text-[var(--mk-color-primary)]" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <RewardStat icon={<Medal size={21} />} label="الرصيد المتبقي" value={loading ? "—" : formatPoints(account.available_points)} hint="النقاط المتاحة للاستخدام" />
          <RewardStat icon={<Award size={21} />} label="النقاط المعلقة" value={loading ? "—" : formatPoints(account.pending_points)} hint="بانتظار الاعتماد" />
          <RewardStat icon={<Gift size={21} />} label="المكافآت المتاحة" value={loading ? "—" : formatPoints(data.rewards.length)} hint="جاهزة للاستبدال" />
          <RewardStat icon={<TicketPercent size={21} />} label="عمليات الاستبدال" value={loading ? "—" : formatPoints(data.redemptions.length)} hint="كل عمليات الاستبدال" />
        </div>

        <section ref={rewardsSectionRef} className="scroll-mt-24 rounded-[28px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-5 shadow-[0_14px_42px_rgba(15,23,42,0.045)]">
          <h3 className="text-xl font-black text-[var(--mk-text-main)]">المكافآت المتاحة</h3>
          <p className="mt-1 text-sm font-bold text-[var(--mk-text-muted)]">تظهر هنا المكافآت المفعّلة من المتجر.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {!loading && data.rewards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--mk-border-soft)] p-6 text-sm font-bold text-[var(--mk-text-muted)]">لا توجد مكافآت متاحة حاليًا.</div>
            ) : null}
            {data.rewards.map((reward) => (
              <article key={reward.id} className="rounded-2xl border border-[var(--mk-border-soft)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><strong className="text-sm font-black text-[var(--mk-text-main)]">{reward.name}</strong><p className="mt-1 text-xs font-bold leading-6 text-[var(--mk-text-muted)]">{reward.description || "مكافأة متاحة للاستبدال بالنقاط."}</p></div>
                  <span className="rounded-full bg-[var(--mk-bg-soft)] px-3 py-1 text-xs font-black text-[var(--mk-color-primary)]">{formatPoints(reward.points_cost)} نقطة</span>
                </div>
                <button
                  type="button"
                  disabled={!enabled || !data.settings.redemption_enabled || account.status !== "active" || account.available_points < reward.points_cost}
                  onClick={() => { setSelectedReward(reward); setRedeemError(null); setRedeemResult(null); }}
                  className="mt-4 min-h-10 w-full rounded-xl bg-[var(--mk-color-primary)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {account.available_points >= reward.points_cost ? "استبدال الآن" : `تحتاج ${formatPoints(reward.points_cost - account.available_points)} نقطة إضافية`}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-5 shadow-[0_14px_42px_rgba(15,23,42,0.045)]">
          <h3 className="text-xl font-black text-[var(--mk-text-main)]">مكافآتك المستبدلة</h3>
          <p className="mt-1 text-sm font-bold text-[var(--mk-text-muted)]">يمكنك الرجوع إلى الكوبونات والمكافآت التي حصلت عليها في أي وقت.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {!loading && data.redemptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--mk-border-soft)] p-6 text-sm font-bold text-[var(--mk-text-muted)]">لم تستبدل أي مكافأة حتى الآن.</div>
            ) : null}
            {data.redemptions.map((redemption) => (
              <article key={redemption.id} className="rounded-2xl border border-[var(--mk-border-soft)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm font-black text-[var(--mk-text-main)]">{redemption.reward_name}</strong>
                    <p className="mt-1 text-xs font-bold text-[var(--mk-text-muted)]">{rewardValueLabel(redemption, accountCurrency.format)}</p>
                  </div>
                  <span className="rounded-full bg-[var(--mk-bg-soft)] px-3 py-1 text-xs font-black">{couponStatusLabel(redemption.coupon_status)}</span>
                </div>
                {redemption.coupon_code ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[var(--mk-primary-border)] bg-[var(--mk-bg-soft)] p-3">
                    <div className="text-xs font-bold text-[var(--mk-text-muted)]">رمز الكوبون</div>
                    <div className="mt-1 break-all text-lg font-black tracking-wide text-[var(--mk-color-primary)]">{redemption.coupon_code}</div>
                  </div>
                ) : null}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="font-bold text-[var(--mk-text-muted)]">تاريخ الإنشاء</dt><dd className="mt-1 font-black">{formatDate(redemption.completed_at || redemption.created_at)}</dd></div>
                  <div><dt className="font-bold text-[var(--mk-text-muted)]">تاريخ الانتهاء</dt><dd className="mt-1 font-black">{formatDate(redemption.coupon_expires_at)}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {redemption.coupon_code ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(redemption.coupon_code || "");
                        setCopiedCoupon(redemption.id);
                        window.setTimeout(() => setCopiedCoupon(null), 1800);
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--mk-border-soft)] px-4 text-xs font-black"
                    >
                      {copiedCoupon === redemption.id ? <Check size={15} /> : <Copy size={15} />}
                      {copiedCoupon === redemption.id ? "تم النسخ" : "نسخ الرمز"}
                    </button>
                  ) : null}
                  <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--mk-color-primary)] px-4 text-xs font-black text-white">
                    <ShoppingBag size={15} /> تسوق الآن
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-5 shadow-[0_14px_42px_rgba(15,23,42,0.045)]">
          <h3 className="text-xl font-black text-[var(--mk-text-main)]">سجل المكافآت</h3>
          <p className="mt-1 text-sm font-bold text-[var(--mk-text-muted)]">كل عمليات اكتساب واستبدال وانتهاء النقاط.</p>
          <div className="mt-4 grid gap-3">
            {!loading && data.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--mk-border-soft)] p-6 text-sm font-bold text-[var(--mk-text-muted)]">لا توجد حركات نقاط حتى الآن.</div>
            ) : null}
            {data.transactions.map((transaction) => (
              <article key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--mk-border-soft)] p-4">
                <div><strong className="text-sm font-black text-[var(--mk-text-main)]">{transactionLabel(transaction.transaction_type)}</strong><p className="mt-1 text-xs font-bold text-[var(--mk-text-muted)]">{transaction.customer_message || transaction.reason || "حركة نقاط"}</p></div>
                <div className={`text-sm font-black ${transaction.points_delta > 0 ? "text-emerald-600" : "text-red-600"}`}>{transaction.points_delta > 0 ? "+" : ""}{formatPoints(transaction.points_delta)}</div>
              </article>
            ))}
          </div>
        </section>
        <RewardRedeemDialog
          reward={selectedReward}
          open={Boolean(selectedReward)}
          loading={redeeming}
          result={redeemResult}
          error={redeemError}
          onClose={closeRedeemDialog}
          onConfirm={() => void confirmRedeem()}
        />
      </div>
    </AccountLayout>
  );
}