"use client";

import { CheckCircle2, Copy, Gift, Loader2, Wallet, X } from "lucide-react";
import { useState } from "react";

import { formatPoints, type LoyaltyRedemptionResult, type LoyaltyReward } from "./rewards-data";
import { useAccountCurrency } from "./account-currency";

export default function RewardRedeemDialog({
  reward,
  open,
  loading,
  result,
  error,
  onClose,
  onConfirm,
}: {
  reward: LoyaltyReward | null;
  open: boolean;
  loading: boolean;
  result: LoyaltyRedemptionResult | null;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const accountCurrency = useAccountCurrency();
  const rewardValueLabel = (item: LoyaltyReward) => {
    if (item.reward_type === "coupon_percentage") return `كوبون خصم ${item.reward_value}%`;
    const value = accountCurrency.format(item.reward_value, item.currency);
    return item.reward_type === "wallet_credit" ? `${value} في المحفظة` : `كوبون خصم ${value}`;
  };

  if (!open || !reward) return null;

  async function copyCode() {
    const code = result?.coupon_code;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-[26px] border border-[var(--mk-border-soft)] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--mk-border-soft)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mk-bg-soft)] text-[var(--mk-color-primary)]">
              {reward.reward_type === "wallet_credit" ? <Wallet size={21} /> : <Gift size={21} />}
            </span>
            <div>
              <h3 className="text-lg font-black text-[var(--mk-text-main)]">{result ? "تم الاستبدال" : "تأكيد الاستبدال"}</h3>
              <p className="mt-1 text-xs font-bold text-[var(--mk-text-muted)]">{reward.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--mk-border-soft)] disabled:opacity-50" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {result ? (
            <div className="grid gap-4 text-center">
              <CheckCircle2 size={54} className="mx-auto text-emerald-600" />
              <div>
                <strong className="text-xl font-black text-[var(--mk-text-main)]">تمت العملية بنجاح</strong>
                <p className="mt-2 text-sm font-bold leading-7 text-[var(--mk-text-muted)]">
                  تم خصم {formatPoints(result.points_cost)} نقطة ومنحك {rewardValueLabel(reward)}.
                </p>
              </div>

              {result.coupon_code ? (
                <div className="rounded-2xl border border-dashed border-[var(--mk-primary-border)] bg-[var(--mk-bg-soft)] p-4">
                  <div className="text-xs font-bold text-[var(--mk-text-muted)]">رمز الكوبون</div>
                  <div className="mt-2 text-2xl font-black tracking-wider text-[var(--mk-color-primary)]" dir="ltr">{result.coupon_code}</div>
                  <button type="button" onClick={() => void copyCode()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--mk-border-soft)] bg-white px-4 text-sm font-black">
                    <Copy size={16} /> {copied ? "تم النسخ" : "نسخ الرمز"}
                  </button>
                </div>
              ) : null}

              <button type="button" onClick={onClose} className="min-h-11 rounded-2xl bg-[var(--mk-color-primary)] px-5 text-sm font-black text-white">إغلاق</button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[var(--mk-bg-soft)] p-4">
                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                  <span className="text-[var(--mk-text-muted)]">ستحصل على</span>
                  <strong className="text-[var(--mk-text-main)]">{rewardValueLabel(reward)}</strong>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--mk-border-soft)] pt-3 text-sm font-bold">
                  <span className="text-[var(--mk-text-muted)]">سيتم خصم</span>
                  <strong className="text-[var(--mk-color-primary)]">{formatPoints(reward.points_cost)} نقطة</strong>
                </div>
              </div>

              {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onClose} disabled={loading} className="min-h-11 rounded-2xl border border-[var(--mk-border-soft)] text-sm font-black disabled:opacity-50">إلغاء</button>
                <button type="button" onClick={onConfirm} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--mk-color-primary)] px-5 text-sm font-black text-white disabled:opacity-60">
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <Gift size={17} />}
                  {loading ? "جارٍ الاستبدال" : "تأكيد الاستبدال"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
