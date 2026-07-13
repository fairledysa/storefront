import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}


function escapeHtml(value: unknown) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendRewardEmail(args: {
  to: string;
  storeName: string;
  rewardName: string;
  rewardType: string;
  rewardValue: number;
  currency: string;
  pointsCost: number;
  couponCode?: string | null;
  couponExpiresAt?: string | null;
  rewardsUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!apiKey || !from || !args.to) return false;

  const isCoupon = Boolean(args.couponCode);
  const expiry = args.couponExpiresAt
    ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(
        new Date(args.couponExpiresAt),
      )
    : null;

  const valueLabel =
    args.rewardType === "coupon_percentage"
      ? `${args.rewardValue}%`
      : `${args.rewardValue} ${args.currency}`;

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#17212b;max-width:620px;margin:auto">
      <h2 style="margin:0 0 12px">تم استبدال مكافأتك بنجاح 🎁</h2>
      <p>مرحبًا، تم خصم <strong>${escapeHtml(args.pointsCost)}</strong> نقطة واستبدالها بمكافأة <strong>${escapeHtml(args.rewardName)}</strong> من متجر ${escapeHtml(args.storeName)}.</p>
      <div style="border:1px solid #eadfd8;border-radius:16px;padding:18px;background:#fffaf7">
        <div><strong>قيمة المكافأة:</strong> ${escapeHtml(valueLabel)}</div>
        ${isCoupon ? `<div style="margin-top:10px"><strong>رمز الكوبون:</strong> <span style="font-size:20px;letter-spacing:1px">${escapeHtml(args.couponCode)}</span></div>` : ""}
        ${expiry ? `<div style="margin-top:8px"><strong>صالح حتى:</strong> ${escapeHtml(expiry)}</div>` : ""}
      </div>
      <p style="margin-top:18px">يمكنك الرجوع إلى مكافآتك في أي وقت من خلال حسابك.</p>
      <a href="${escapeHtml(args.rewardsUrl)}" style="display:inline-block;background:#0d3b45;color:white;text-decoration:none;padding:11px 18px;border-radius:12px;font-weight:bold">عرض مكافآتي</a>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: `مكافأتك من ${args.storeName}`,
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "REWARD_EMAIL_SEND_FAILED");
  }

  return true;
}

function mapError(message: string) {
  const code = message.toUpperCase();
  const errors: Record<string, { status: number; message: string }> = {
    LOYALTY_REDEMPTION_DISABLED: { status: 409, message: "استبدال النقاط غير متاح حاليًا." },
    REWARD_NOT_FOUND: { status: 404, message: "المكافأة غير موجودة." },
    REWARD_INACTIVE: { status: 409, message: "هذه المكافأة غير مفعلة." },
    REWARD_NOT_STARTED: { status: 409, message: "هذه المكافأة لم تبدأ بعد." },
    REWARD_EXPIRED: { status: 409, message: "انتهت صلاحية هذه المكافأة." },
    REWARD_LIMIT_REACHED: { status: 409, message: "تم الوصول إلى الحد الأقصى لهذه المكافأة." },
    CUSTOMER_REWARD_LIMIT_REACHED: { status: 409, message: "لقد استخدمت الحد المسموح لهذه المكافأة." },
    LOYALTY_ACCOUNT_NOT_FOUND: { status: 404, message: "حساب النقاط غير موجود." },
    LOYALTY_ACCOUNT_NOT_ACTIVE: { status: 409, message: "حساب النقاط غير نشط." },
    INSUFFICIENT_POINTS: { status: 409, message: "رصيد نقاطك غير كافٍ لهذه المكافأة." },
    WALLET_NOT_ACTIVE: { status: 409, message: "المحفظة غير نشطة ولا يمكن إضافة المكافأة إليها." },
  };

  for (const [key, value] of Object.entries(errors)) {
    if (code.includes(key)) return value;
  }

  return { status: 500, message: "تعذر استبدال المكافأة. حاول مرة أخرى." };
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveStoreContext();
    const storeId = text(context?.store?.id);
    if (!storeId) return json({ ok: false, error: "STORE_NOT_FOUND" }, 404);

    const cookieStore = await cookies();
    const token =
      cookieStore.get("elyaia_session")?.value ||
      cookieStore.get("elyaiaSession")?.value ||
      "";

    if (!token) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    let session: Awaited<ReturnType<typeof verifySession>> | null = null;
    try {
      session = await verifySession(token);
    } catch {
      session = null;
    }

    const customerId = text(session?.customer_id);
    if (!customerId) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const payload = await request.json().catch(() => ({}));
    const rewardId = text(payload?.reward_id);
    const idempotencyKey = text(payload?.idempotency_key);

    if (!rewardId || !idempotencyKey) {
      return json({ ok: false, error: "INVALID_REQUEST", message: "بيانات الاستبدال غير مكتملة." }, 400);
    }

    if (idempotencyKey.length > 180) {
      return json({ ok: false, error: "INVALID_IDEMPOTENCY_KEY" }, 400);
    }

    const db: any = await getStoreDb(storeId);
    const result = await db.rpc("loyalty_redeem_reward", {
      p_store_id: storeId,
      p_customer_id: customerId,
      p_reward_id: rewardId,
      p_idempotency_key: idempotencyKey,
    });

    if (result.error) {
      const mapped = mapError(String(result.error?.message ?? result.error));
      return json({ ok: false, error: "REDEMPTION_FAILED", message: mapped.message }, mapped.status);
    }

    const redemption = result.data ?? {};
    let emailSent = false;

    if (!redemption?.duplicate) {
      try {
        const [customerResult, rewardResult] = await Promise.all([
          db
            .from("customers")
            .select("email,full_name")
            .eq("id", customerId)
            .maybeSingle(),
          db
            .from("store_loyalty_rewards")
            .select("name")
            .eq("store_id", storeId)
            .eq("id", rewardId)
            .maybeSingle(),
        ]);

        const customerEmail = text(customerResult.data?.email);
        if (customerEmail) {
          emailSent = await sendRewardEmail({
            to: customerEmail,
            storeName: text(context?.store?.name) || "المتجر",
            rewardName: text(rewardResult.data?.name) || "مكافأة الولاء",
            rewardType: text(redemption.reward_type),
            rewardValue: Number(redemption.reward_value ?? 0),
            currency: text(redemption.currency) || "SAR",
            pointsCost: Number(redemption.points_cost ?? 0),
            couponCode: text(redemption.coupon_code) || null,
            couponExpiresAt: text(redemption.coupon_expires_at) || null,
            rewardsUrl: new URL("/account/rewards", request.nextUrl.origin).toString(),
          });
        }
      } catch (emailError) {
        console.error("[account/rewards/redeem] Reward email failed", emailError);
      }
    }

    return json({ ok: true, redemption, email_sent: emailSent });
  } catch (error) {
    console.error("[account/rewards/redeem] Failed to redeem reward", error);
    const mapped = mapError(String((error as Error)?.message ?? error));
    return json({ ok: false, error: "REDEMPTION_FAILED", message: mapped.message }, mapped.status);
  }
}
