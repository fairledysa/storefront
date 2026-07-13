import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function safeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  try {
    const context = await resolveStoreContext();
    const storeId = String(context?.store?.id ?? "").trim();
    if (!storeId) return json({ ok: false, error: "STORE_NOT_FOUND" }, 404);

    const token = (await cookies()).get("elyaia_session")?.value;
    if (!token) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    let session: Awaited<ReturnType<typeof verifySession>> | null = null;
    try {
      session = await verifySession(token);
    } catch {
      session = null;
    }

    const customerId = String(session?.customer_id ?? "").trim();
    if (!customerId) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const db: any = await getStoreDb(storeId);
    const nowIso = new Date().toISOString();

    const [settingsResult, accountResult, rewardsResult] = await Promise.all([
      db
        .from("store_loyalty_settings")
        .select(
          "enabled,earning_enabled,redemption_enabled,minimum_redeem_points,points_expire_after_days,pending_days,updated_at",
        )
        .eq("store_id", storeId)
        .maybeSingle(),
      db
        .from("customer_loyalty_accounts")
        .select(
          "id,available_points,pending_points,lifetime_earned_points,lifetime_redeemed_points,lifetime_expired_points,status,updated_at",
        )
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .maybeSingle(),
      db
        .from("store_loyalty_rewards")
        .select(
          "id,code,name,description,reward_type,points_cost,reward_value,currency,coupon_validity_days,coupon_maximum_discount,total_redemption_limit,redemption_limit_per_customer,redemption_count,starts_at,ends_at,sort_order",
        )
        .eq("store_id", storeId)
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("sort_order", { ascending: true })
        .order("points_cost", { ascending: true }),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (accountResult.error) throw accountResult.error;
    if (rewardsResult.error) throw rewardsResult.error;

    const account = accountResult.data;
    const accountId = String(account?.id ?? "").trim();

    const [transactionsResult, redemptionsResult] = accountId
      ? await Promise.all([
          db
            .from("customer_loyalty_transactions")
            .select(
              "id,order_id,reward_id,transaction_type,points_delta,status,source_type,reason,customer_message,available_at,expires_at,created_at",
            )
            .eq("store_id", storeId)
            .eq("customer_id", customerId)
            .eq("account_id", accountId)
            .order("created_at", { ascending: false })
            .limit(100),
          db
            .from("customer_loyalty_redemptions")
            .select(
              "id,reward_id,points_cost,reward_type,reward_value,currency,status,coupon_id,reward_snapshot,completed_at,created_at",
            )
            .eq("store_id", storeId)
            .eq("customer_id", customerId)
            .eq("account_id", accountId)
            .order("created_at", { ascending: false })
            .limit(100),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (transactionsResult.error) throw transactionsResult.error;
    if (redemptionsResult.error) throw redemptionsResult.error;

    const redemptionRows = Array.isArray(redemptionsResult.data)
      ? redemptionsResult.data
      : [];
    const couponIds = redemptionRows
      .map((row: any) => String(row.coupon_id ?? "").trim())
      .filter(Boolean);

    const [couponsResult, couponUsageResult] = couponIds.length
      ? await Promise.all([
          db
            .from("coupons")
            .select("id,code,discount_type,amount,maximum_amount,end_at,status")
            .eq("store_id", storeId)
            .in("id", couponIds),
          db
            .from("coupon_redemptions")
            .select("coupon_id,used_at")
            .eq("store_id", storeId)
            .eq("customer_id", customerId)
            .in("coupon_id", couponIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (couponsResult.error) throw couponsResult.error;
    if (couponUsageResult.error) throw couponUsageResult.error;

    const couponById = new Map(
      (Array.isArray(couponsResult.data) ? couponsResult.data : []).map((coupon: any) => [
        String(coupon.id),
        coupon,
      ]),
    );
    const usageByCouponId = new Map(
      (Array.isArray(couponUsageResult.data) ? couponUsageResult.data : []).map((usage: any) => [
        String(usage.coupon_id),
        usage,
      ]),
    );

    const settings = settingsResult.data;
    const enabled = Boolean(settings?.enabled);

    return json({
      ok: true,
      settings: {
        enabled,
        earning_enabled: enabled && Boolean(settings?.earning_enabled),
        redemption_enabled: enabled && Boolean(settings?.redemption_enabled),
        minimum_redeem_points: safeNumber(settings?.minimum_redeem_points),
        points_expire_after_days:
          settings?.points_expire_after_days == null
            ? null
            : safeNumber(settings.points_expire_after_days),
        pending_days: safeNumber(settings?.pending_days),
        updated_at: settings?.updated_at ?? null,
      },
      account: {
        id: accountId || null,
        available_points: safeNumber(account?.available_points),
        pending_points: safeNumber(account?.pending_points),
        lifetime_earned_points: safeNumber(account?.lifetime_earned_points),
        lifetime_redeemed_points: safeNumber(account?.lifetime_redeemed_points),
        lifetime_expired_points: safeNumber(account?.lifetime_expired_points),
        status: String(account?.status ?? "active"),
        updated_at: account?.updated_at ?? null,
      },
      rewards: (Array.isArray(rewardsResult.data) ? rewardsResult.data : []).map(
        (reward: any) => ({
          id: String(reward.id),
          code: String(reward.code ?? ""),
          name: String(reward.name ?? ""),
          description: reward.description ? String(reward.description) : null,
          reward_type: String(reward.reward_type ?? ""),
          points_cost: safeNumber(reward.points_cost),
          reward_value: safeNumber(reward.reward_value),
          currency: String(reward.currency ?? context.store?.default_currency ?? "SAR"),
          coupon_validity_days:
            reward.coupon_validity_days == null
              ? null
              : safeNumber(reward.coupon_validity_days),
          coupon_maximum_discount:
            reward.coupon_maximum_discount == null
              ? null
              : safeNumber(reward.coupon_maximum_discount),
          total_redemption_limit:
            reward.total_redemption_limit == null
              ? null
              : safeNumber(reward.total_redemption_limit),
          redemption_limit_per_customer:
            reward.redemption_limit_per_customer == null
              ? null
              : safeNumber(reward.redemption_limit_per_customer),
          redemption_count: safeNumber(reward.redemption_count),
        }),
      ),
      transactions: (
        Array.isArray(transactionsResult.data) ? transactionsResult.data : []
      ).map((transaction: any) => ({
        id: String(transaction.id),
        order_id: transaction.order_id ? String(transaction.order_id) : null,
        reward_id: transaction.reward_id ? String(transaction.reward_id) : null,
        transaction_type: String(transaction.transaction_type ?? ""),
        points_delta: safeNumber(transaction.points_delta),
        status: String(transaction.status ?? ""),
        source_type: String(transaction.source_type ?? ""),
        reason: transaction.reason ? String(transaction.reason) : null,
        customer_message: transaction.customer_message
          ? String(transaction.customer_message)
          : null,
        available_at: transaction.available_at ?? null,
        expires_at: transaction.expires_at ?? null,
        created_at: transaction.created_at ?? null,
      })),
      redemptions: redemptionRows.map((redemption: any) => {
        const couponId = redemption.coupon_id
          ? String(redemption.coupon_id)
          : null;
        const coupon: any = couponId ? couponById.get(couponId) : null;
        const usage: any = couponId ? usageByCouponId.get(couponId) : null;
        const couponExpired = Boolean(
          coupon?.end_at && new Date(coupon.end_at).getTime() <= Date.now(),
        );
        const couponStatus = usage
          ? "used"
          : couponExpired
            ? "expired"
            : coupon?.status === "inactive"
              ? "inactive"
              : couponId
                ? "available"
                : null;

        return {
          id: String(redemption.id),
          reward_id: String(redemption.reward_id ?? ""),
          reward_name: String(
            redemption.reward_snapshot?.name ?? "مكافأة الولاء",
          ),
          reward_description: redemption.reward_snapshot?.description
            ? String(redemption.reward_snapshot.description)
            : null,
          points_cost: safeNumber(redemption.points_cost),
          reward_type: String(redemption.reward_type ?? ""),
          reward_value: safeNumber(redemption.reward_value),
          currency: String(redemption.currency ?? "SAR"),
          status: String(redemption.status ?? ""),
          coupon_id: couponId,
          coupon_code: coupon?.code ? String(coupon.code) : null,
          coupon_discount_type: coupon?.discount_type
            ? String(coupon.discount_type)
            : null,
          coupon_amount: safeNumber(coupon?.amount),
          coupon_maximum_amount:
            coupon?.maximum_amount == null
              ? null
              : safeNumber(coupon.maximum_amount),
          coupon_expires_at: coupon?.end_at ?? null,
          coupon_status: couponStatus,
          coupon_used_at: usage?.used_at ?? null,
          completed_at: redemption.completed_at ?? null,
          created_at: redemption.created_at ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("[account/rewards] Failed to load loyalty account", error);
    return json({ ok: false, error: "REWARDS_LOAD_FAILED" }, 500);
  }
}
