"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertCircle, Award, Check, Copy, Gift, Loader2, Medal, PackageCheck, ShoppingBag, Sparkles, TicketPercent, Trophy } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";
import { formatPoints, redeemLoyaltyReward, transactionLabel, type LoyaltyRedemptionResult, type LoyaltyReward, useRewardsData } from "../../screens/account/rewards-data";
import RewardRedeemDialog from "../../screens/account/RewardRedeemDialog";
import { useAccountCurrency } from "../../screens/account/account-currency";

export default function RewardsMobileScreen() {
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
  const canRedeem = enabled && data.settings.redemption_enabled && account.status === "active" && account.available_points >= data.settings.minimum_redeem_points && data.rewards.length > 0;

  async function confirmRedeem() {
    if (!selectedReward || redeeming) return;
    setRedeeming(true); setRedeemError(null);
    try {
      const result = await redeemLoyaltyReward(selectedReward.id, `loyalty:redeem:${selectedReward.id}:${crypto.randomUUID()}`);
      setRedeemResult(result);
      await reload();
    } catch (caught) {
      setRedeemError(caught instanceof Error ? caught.message : "تعذر استبدال المكافأة.");
    } finally { setRedeeming(false); }
  }

  function closeRedeemDialog() {
    if (redeeming) return;
    setSelectedReward(null); setRedeemError(null); setRedeemResult(null);
  }

  const stats = [
    { label: "الرصيد المتبقي", value: account.available_points, hint: "النقاط المتاحة للاستخدام", icon: Medal },
    { label: "النقاط المعلقة", value: account.pending_points, hint: "بانتظار الاعتماد", icon: Award },
    { label: "المكافآت المتاحة", value: data.rewards.length, hint: "جاهزة للاستبدال", icon: Gift },
    { label: "عمليات الاستبدال", value: data.redemptions.length, hint: "كل عمليات الاستبدال", icon: TicketPercent },
  ];

  return (
    <AccountMobileLayout active="rewards" title="مكافآتي">
      <div className="mk-mrewards">
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            <span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span>
            <button type="button" onClick={() => void reload()}>إعادة</button>
          </div>
        ) : null}

        <section className="mk-mrewards-hero">
          <div className="mk-mrewards-hero__badge"><Sparkles size={15} /> برنامج المكافآت</div>
          <Trophy size={54} className="mk-mrewards-hero__icon" />
          <h2>رصيد نقاطك المتاح</h2>
          <div className="mk-mrewards-hero__points">{loading ? <Loader2 className="animate-spin" size={34} /> : formatPoints(account.available_points)} {!loading ? <span>نقطة</span> : null}</div>
          <p>{loading ? "جارٍ تحميل بيانات المكافآت..." : !enabled ? "برنامج المكافآت غير مفعّل حاليًا في هذا المتجر." : account.pending_points > 0 ? `لديك ${formatPoints(account.pending_points)} نقطة معلقة بانتظار الاعتماد.` : "اكسب النقاط من الطلبات المؤهلة واستبدلها بالمكافآت المتاحة."}</p>
          <div className="mk-mrewards-hero__actions">
            <Link href="/"><PackageCheck size={16} /> تسوق الآن</Link>
            <button type="button" disabled={!canRedeem} onClick={() => rewardsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><Gift size={16} /> استبدال المكافآت</button>
          </div>
        </section>

        <section className="mk-mrewards-stats">
          {stats.map((item) => {
            const Icon = item.icon;
            return <article key={item.label}><Icon size={20} /><span>{item.label}</span><strong>{loading ? "—" : formatPoints(item.value)}</strong><small>{item.hint}</small></article>;
          })}
        </section>

        <section ref={rewardsSectionRef} className="mk-mrewards-history">
          <div className="mk-mrewards-history__head"><div><h3>المكافآت المتاحة</h3><p>المكافآت المفعّلة من المتجر.</p></div></div>
          <div className="mk-mrewards-history__list">
            {!loading && data.rewards.length === 0 ? <article><Gift size={19} /><div><strong>لا توجد مكافآت متاحة</strong><span>ستظهر المكافآت هنا بعد تفعيلها من المتجر.</span></div></article> : null}
            {data.rewards.map((reward) => <article key={reward.id}><Gift size={19} /><div><strong>{reward.name}</strong><span>{reward.description || `${formatPoints(reward.points_cost)} نقطة`}</span><button type="button" disabled={!enabled || !data.settings.redemption_enabled || account.status !== "active" || account.available_points < reward.points_cost} onClick={() => { setSelectedReward(reward); setRedeemError(null); setRedeemResult(null); }} className="mt-2 rounded-xl bg-[var(--mk-color-primary)] px-3 py-2 text-xs font-black text-white disabled:opacity-45">{account.available_points >= reward.points_cost ? "استبدال الآن" : "نقاط غير كافية"}</button></div><b>{formatPoints(reward.points_cost)}</b></article>)}
          </div>
        </section>


        <section className="mk-mrewards-history">
          <div className="mk-mrewards-history__head"><div><h3>مكافآتك المستبدلة</h3><p>الكوبونات والمكافآت التي حصلت عليها.</p></div></div>
          <div className="mk-mrewards-history__list">
            {!loading && data.redemptions.length === 0 ? <article><Gift size={19} /><div><strong>لا توجد مكافآت مستبدلة</strong><span>ستظهر مكافآتك هنا بعد الاستبدال.</span></div></article> : null}
            {data.redemptions.map((redemption) => (
              <article key={redemption.id}>
                <Gift size={19} />
                <div className="min-w-0 flex-1">
                  <strong>{redemption.reward_name}</strong>
                  <span>{redemption.reward_type === "coupon_percentage" ? `${redemption.reward_value}% خصم` : accountCurrency.format(redemption.reward_value, redemption.currency)}</span>
                  {redemption.coupon_code ? <b className="mt-2 block break-all text-sm text-[var(--mk-color-primary)]">{redemption.coupon_code}</b> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {redemption.coupon_code ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(redemption.coupon_code || "");
                          setCopiedCoupon(redemption.id);
                          window.setTimeout(() => setCopiedCoupon(null), 1800);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-black"
                      >
                        {copiedCoupon === redemption.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedCoupon === redemption.id ? "تم النسخ" : "نسخ الرمز"}
                      </button>
                    ) : null}
                    <Link href="/" className="inline-flex items-center gap-1 rounded-lg bg-[var(--mk-color-primary)] px-3 py-2 text-xs font-black text-white"><ShoppingBag size={14} />تسوق الآن</Link>
                  </div>
                </div>
                <b>{redemption.coupon_status === "used" ? "مستخدم" : redemption.coupon_status === "expired" ? "منتهي" : "متاح"}</b>
              </article>
            ))}
          </div>
        </section>

        <section className="mk-mrewards-history">
          <div className="mk-mrewards-history__head"><div><h3>سجل المكافآت</h3><p>عمليات اكتساب واستبدال وانتهاء النقاط.</p></div></div>
          <div className="mk-mrewards-history__list">
            {!loading && data.transactions.length === 0 ? <article><Award size={19} /><div><strong>لا توجد حركات نقاط</strong><span>ستظهر أول حركة نقاط هنا بعد تنفيذها فعليًا.</span></div></article> : null}
            {data.transactions.map((transaction) => <article key={transaction.id}><Award size={19} /><div><strong>{transactionLabel(transaction.transaction_type)}</strong><span>{transaction.customer_message || transaction.reason || "حركة نقاط"}</span></div><b>{transaction.points_delta > 0 ? "+" : ""}{formatPoints(transaction.points_delta)}</b></article>)}
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
    </AccountMobileLayout>
  );
}