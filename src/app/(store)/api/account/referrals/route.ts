import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const REFERRAL_COOKIE = "elyaia_referral";
const REFERRAL_SESSION_COOKIE = "elyaia_referral_session";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rewardLabel(type: string, value: number, currency: string) {
  if (type === "points") return `${value.toLocaleString("ar-SA")} نقطة`;
  if (type === "coupon_percentage") return `${value.toLocaleString("ar-SA")}%`;
  if (type === "wallet" || type === "coupon_fixed") {
    return `${value.toLocaleString("ar-SA")} ${currency}`;
  }
  return "لا توجد مكافأة";
}

export async function GET() {
  try {
    const storeContext = await resolveStoreContext();
    const storeId = String(storeContext?.store?.id ?? "").trim();
    if (!storeId) return json({ ok: false, error: "STORE_NOT_FOUND" }, 404);

    const cookieStore = await cookies();
    const token = cookieStore.get("elyaia_session")?.value;
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
    const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value?.trim();
    const referralSession = cookieStore.get(REFERRAL_SESSION_COOKIE)?.value?.trim();

    if (referralCode) {
      const attachKey = `referral:attach:${storeId}:${customerId}`;
      const { error: attachError } = await db.rpc("referral_attach_customer", {
        p_store_id: storeId,
        p_code: referralCode,
        p_invited_customer_id: customerId,
        p_session_key: referralSession || null,
        p_idempotency_key: attachKey,
      });
      if (attachError) {
        console.warn("[referrals] attach skipped", attachError.message);
      }
    }

    const [{ data: settings, error: settingsError }, { data: codeRow, error: codeError }] =
      await Promise.all([
        db
          .from("store_referral_settings")
          .select(
            "enabled,attribution_window_days,require_first_paid_order,minimum_order_amount,reward_delay_days,inviter_reward_type,inviter_reward_value,invited_reward_type,invited_reward_value,coupon_validity_days,currency,terms_text",
          )
          .eq("store_id", storeId)
          .maybeSingle(),
        db.rpc("referral_get_or_create_code", {
          p_store_id: storeId,
          p_customer_id: customerId,
        }),
      ]);

    if (settingsError) throw settingsError;
    if (codeError) throw codeError;

    const normalizedCodeRow = Array.isArray(codeRow) ? codeRow[0] : codeRow;
    const code = String(normalizedCodeRow?.code ?? "").trim();
    const requestHeaders = await headers();
    const forwardedHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
    const protocol = requestHeaders.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
    const origin = forwardedHost ? `${protocol}://${forwardedHost}` : "";
    const referralLink = origin && code ? `${origin}/r/${encodeURIComponent(code)}` : "";

    const [visitsResult, referralsResult, rewardsResult] = await Promise.all([
      db
        .from("referral_visits")
        .select("id,visit_count,converted_at")
        .eq("store_id", storeId)
        .eq("inviter_customer_id", customerId),
      db
        .from("customer_referrals")
        .select(
          "id,invited_customer_id,status,registered_at,qualified_at,rewarded_at,qualifying_order_id,rejection_reason",
        )
        .eq("store_id", storeId)
        .eq("inviter_customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("referral_rewards")
        .select(
          "id,referral_id,beneficiary_side,reward_type,reward_value,currency,status,available_at,completed_at,coupon_id,created_at",
        )
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (visitsResult.error) throw visitsResult.error;
    if (referralsResult.error) throw referralsResult.error;
    if (rewardsResult.error) throw rewardsResult.error;

    const referrals = Array.isArray(referralsResult.data) ? referralsResult.data : [];
    const invitedIds = referrals
      .map((row: any) => String(row.invited_customer_id ?? "").trim())
      .filter(Boolean);

    const customerResult = invitedIds.length
      ? await db.from("customers").select("id,full_name,email,phone_e164").in("id", invitedIds)
      : { data: [], error: null };
    if (customerResult.error) throw customerResult.error;

    const customerById = new Map(
      (Array.isArray(customerResult.data) ? customerResult.data : []).map((row: any) => [
        String(row.id),
        row,
      ]),
    );

    const rewardRows = Array.isArray(rewardsResult.data) ? rewardsResult.data : [];
    const rewardsByReferral = new Map<string, any[]>();
    for (const reward of rewardRows) {
      const key = String(reward.referral_id ?? "");
      const current = rewardsByReferral.get(key) ?? [];
      current.push(reward);
      rewardsByReferral.set(key, current);
    }

    const totalVisits = (Array.isArray(visitsResult.data) ? visitsResult.data : []).reduce(
      (sum: number, row: any) => sum + numberValue(row.visit_count),
      0,
    );
    const completedRewards = rewardRows.filter((row: any) => row.status === "completed");

    return json({
      ok: true,
      settings: {
        enabled: Boolean(settings?.enabled),
        attribution_window_days: numberValue(settings?.attribution_window_days || 30),
        require_first_paid_order: settings?.require_first_paid_order !== false,
        minimum_order_amount: numberValue(settings?.minimum_order_amount),
        reward_delay_days: numberValue(settings?.reward_delay_days),
        inviter_reward_type: String(settings?.inviter_reward_type ?? "none"),
        inviter_reward_value: numberValue(settings?.inviter_reward_value),
        invited_reward_type: String(settings?.invited_reward_type ?? "none"),
        invited_reward_value: numberValue(settings?.invited_reward_value),
        coupon_validity_days:
          settings?.coupon_validity_days == null ? null : numberValue(settings.coupon_validity_days),
        currency: String(settings?.currency ?? storeContext.store?.default_currency ?? "SAR"),
        terms_text: settings?.terms_text ? String(settings.terms_text) : null,
      },
      code,
      referral_link: referralLink,
      stats: {
        visits: totalVisits,
        joined: referrals.length,
        qualified: referrals.filter((row: any) => ["qualified", "reward_pending", "rewarded"].includes(String(row.status))).length,
        completed_rewards: completedRewards.length,
      },
      reward_summary: {
        inviter: rewardLabel(
          String(settings?.inviter_reward_type ?? "none"),
          numberValue(settings?.inviter_reward_value),
          String(settings?.currency ?? "SAR"),
        ),
        invited: rewardLabel(
          String(settings?.invited_reward_type ?? "none"),
          numberValue(settings?.invited_reward_value),
          String(settings?.currency ?? "SAR"),
        ),
      },
      invitations: referrals.map((row: any) => {
        const invited = customerById.get(String(row.invited_customer_id)) as any;
        const rowRewards = rewardsByReferral.get(String(row.id)) ?? [];
        return {
          id: String(row.id),
          customer_name:
            String(invited?.full_name ?? "").trim() ||
            String(invited?.email ?? "").trim() ||
            String(invited?.phone_e164 ?? "").trim() ||
            "عميل",
          status: String(row.status ?? "registered"),
          registered_at: row.registered_at ?? null,
          qualified_at: row.qualified_at ?? null,
          rewarded_at: row.rewarded_at ?? null,
          rewards: rowRewards.map((reward: any) => ({
            id: String(reward.id),
            side: String(reward.beneficiary_side ?? ""),
            type: String(reward.reward_type ?? ""),
            value: numberValue(reward.reward_value),
            currency: String(reward.currency ?? settings?.currency ?? "SAR"),
            status: String(reward.status ?? "pending"),
            available_at: reward.available_at ?? null,
            completed_at: reward.completed_at ?? null,
          })),
        };
      }),
      rewards: rewardRows.map((reward: any) => ({
        id: String(reward.id),
        referral_id: String(reward.referral_id ?? ""),
        side: String(reward.beneficiary_side ?? ""),
        type: String(reward.reward_type ?? ""),
        value: numberValue(reward.reward_value),
        currency: String(reward.currency ?? settings?.currency ?? "SAR"),
        status: String(reward.status ?? "pending"),
        available_at: reward.available_at ?? null,
        completed_at: reward.completed_at ?? null,
        created_at: reward.created_at ?? null,
      })),
    });
  } catch (error) {
    console.error("[referrals] account API failed", error);
    return json({ ok: false, error: "REFERRALS_LOAD_FAILED" }, 500);
  }
}
