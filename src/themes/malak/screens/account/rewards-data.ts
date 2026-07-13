"use client";

import { useCallback, useEffect, useState } from "react";

export type LoyaltyReward = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  reward_value: number;
  currency: string;
};

export type LoyaltyTransaction = {
  id: string;
  transaction_type: string;
  points_delta: number;
  status: string;
  reason: string | null;
  customer_message: string | null;
  available_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

export type LoyaltyRedemptionResult = {
  redemption_id: string;
  status: string;
  duplicate: boolean;
  reward_type: string;
  points_cost: number;
  reward_value: number;
  currency: string;
  available_points?: number;
  coupon_id?: string | null;
  coupon_code?: string | null;
  coupon_expires_at?: string | null;
  wallet_transaction_id?: string | null;
  wallet_balance?: number | null;
};

export type LoyaltyData = {
  settings: {
    enabled: boolean;
    earning_enabled: boolean;
    redemption_enabled: boolean;
    minimum_redeem_points: number;
  };
  account: {
    available_points: number;
    pending_points: number;
    lifetime_earned_points: number;
    lifetime_redeemed_points: number;
    lifetime_expired_points: number;
    status: string;
  };
  rewards: LoyaltyReward[];
  transactions: LoyaltyTransaction[];
  redemptions: Array<{
    id: string;
    reward_id: string;
    reward_name: string;
    reward_description: string | null;
    points_cost: number;
    reward_type: string;
    reward_value: number;
    currency: string;
    status: string;
    coupon_id: string | null;
    coupon_code: string | null;
    coupon_discount_type: string | null;
    coupon_amount: number;
    coupon_maximum_amount: number | null;
    coupon_expires_at: string | null;
    coupon_status: string | null;
    coupon_used_at: string | null;
    completed_at: string | null;
    created_at: string | null;
  }>;
};

const EMPTY: LoyaltyData = {
  settings: {
    enabled: false,
    earning_enabled: false,
    redemption_enabled: false,
    minimum_redeem_points: 1,
  },
  account: {
    available_points: 0,
    pending_points: 0,
    lifetime_earned_points: 0,
    lifetime_redeemed_points: 0,
    lifetime_expired_points: 0,
    status: "active",
  },
  rewards: [],
  transactions: [],
  redemptions: [],
};

export function useRewardsData() {
  const [data, setData] = useState<LoyaltyData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/account/rewards", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(String(payload?.error ?? "REWARDS_LOAD_FAILED"));
      }
      setData({
        settings: { ...EMPTY.settings, ...(payload.settings ?? {}) },
        account: { ...EMPTY.account, ...(payload.account ?? {}) },
        rewards: Array.isArray(payload.rewards) ? payload.rewards : [],
        transactions: Array.isArray(payload.transactions)
          ? payload.transactions
          : [],
        redemptions: Array.isArray(payload.redemptions)
          ? payload.redemptions
          : [],
      });
    } catch (caught) {
      console.error("[rewards] Failed to load", caught);
      setError("تعذر تحميل بيانات المكافآت. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function redeemLoyaltyReward(
  rewardId: string,
  idempotencyKey: string,
): Promise<LoyaltyRedemptionResult> {
  const response = await fetch("/api/account/rewards/redeem", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reward_id: rewardId,
      idempotency_key: idempotencyKey,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || !payload?.redemption) {
    throw new Error(
      String(payload?.message ?? "تعذر استبدال المكافأة. حاول مرة أخرى."),
    );
  }

  return payload.redemption as LoyaltyRedemptionResult;
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    earn_pending: "نقاط معلقة",
    earn_posted: "اكتساب نقاط",
    earn_release: "اعتماد نقاط",
    redeem_debit: "استبدال نقاط",
    redeem_reversal: "إعادة نقاط",
    expire_debit: "انتهاء نقاط",
    refund_reversal: "عكس نقاط بعد الاسترجاع",
    manual_credit: "إضافة نقاط",
    manual_debit: "خصم نقاط",
    referral_credit: "مكافأة إحالة",
    adjustment_credit: "تسوية إضافة",
    adjustment_debit: "تسوية خصم",
  };
  return labels[type] ?? "حركة نقاط";
}
