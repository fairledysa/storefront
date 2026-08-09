"use client";

import { useCallback, useEffect, useState } from "react";

export type ReferralReward = {
  id: string;
  referral_id: string;
  side: string;
  type: string;
  value: number;
  currency: string;
  status: string;
  available_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export type ReferralInvitation = {
  id: string;
  customer_name: string;
  status: string;
  registered_at: string | null;
  qualified_at: string | null;
  rewarded_at: string | null;
  rewards: ReferralReward[];
};

export type ReferralsData = {
  settings: {
    enabled: boolean;
    attribution_window_days: number;
    require_first_paid_order: boolean;
    minimum_order_amount: number;
    reward_delay_days: number;
    inviter_reward_type: string;
    inviter_reward_value: number;
    invited_reward_type: string;
    invited_reward_value: number;
    coupon_validity_days: number | null;
    currency: string;
    terms_text: string | null;
  };
  code: string;
  referral_link: string;
  stats: { visits: number; joined: number; qualified: number; completed_rewards: number };
  reward_summary: { inviter: string; invited: string };
  invitations: ReferralInvitation[];
  rewards: ReferralReward[];
};

export function useReferralsData() {
  const [data, setData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/account/referrals", {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error(String(body?.error ?? "LOAD_FAILED"));
      setData(body as ReferralsData);
    } catch {
      setError("تعذر تحميل بيانات الدعوات. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function referralStatusLabel(status: string) {
  const labels: Record<string, string> = {
    registered: "تم التسجيل",
    waiting_first_order: "بانتظار أول طلب",
    qualified: "طلب مؤهل",
    reward_pending: "المكافأة قيد الانتظار",
    rewarded: "اكتملت المكافأة",
    rejected: "غير مؤهلة",
    cancelled: "ملغاة",
  };
  return labels[status] ?? status;
}

export function rewardTypeLabel(type: string) {
  const labels: Record<string, string> = {
    points: "نقاط",
    wallet: "رصيد محفظة",
    coupon_fixed: "كوبون مبلغ ثابت",
    coupon_percentage: "كوبون نسبة خصم",
  };
  return labels[type] ?? type;
}

export function formatReferralReward(reward: Pick<ReferralReward, "type" | "value" | "currency">) {
  if (reward.type === "points") return `${reward.value.toLocaleString("ar-SA-u-nu-arab")} نقطة`;
  if (reward.type === "coupon_percentage") return `${reward.value.toLocaleString("ar-SA-u-nu-arab")}%`;
  return `${reward.value.toLocaleString("ar-SA-u-nu-arab")} ${reward.currency}`;
}

export function formatReferralDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-nu-arab", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}
