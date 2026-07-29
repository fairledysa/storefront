// FILE: apps/storefront/src/app/(store)/api/auth/otp/send/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { resolveActiveMobileStoreApp } from "@/data/mobile/store-app.server";
import { hashOtp } from "@/lib/auth/session";

const emailOtpsTable = "auth_email_otps" as any;

function isEmail(v: string) {
  return v.includes("@");
}

function gen4(): string {
  const n = crypto.randomInt(1000, 10000);
  return String(n);
}

async function sendEmailOtp(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) throw new Error("RESEND_NOT_CONFIGURED");

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "رمز التحقق",
      html: `
        <div style="font-family:Arial, sans-serif; line-height:1.7; direction:rtl">
          <h2 style="margin:0 0 12px">رمز التحقق</h2>
          <p style="margin:0 0 14px">استخدم هذا الرمز لإكمال تسجيل الدخول:</p>
          <div style="font-size:30px; letter-spacing:10px; font-weight:700; padding:14px 16px; border:1px solid #e5e7eb; border-radius:12px; width:max-content; background:#f8fafc">
            ${code}
          </div>
          <p style="margin:14px 0 0; color:#64748b; font-size:13px">
            ينتهي الرمز خلال 5 دقائق. لا تشارك الرمز مع أي شخص.
          </p>
        </div>
      `,
    }),
  });

  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.message || "RESEND_SEND_FAILED");
  }
}

export async function POST(req: Request) {
  const publicAppId = String(
    req.headers.get("x-store-app-id") ?? "",
  ).trim();

  let storeId = "";

  if (publicAppId) {
    const app = await resolveActiveMobileStoreApp(publicAppId);
    storeId = app.storeId;
  } else {
    const ctx = await resolveStoreContext();
    storeId = String(ctx.store?.id ?? "");
  }

  if (!storeId) {
    return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const rawTarget = String(body?.target || "").trim();

  if (!rawTarget) {
    return NextResponse.json({ error: "MISSING_TARGET" }, { status: 400 });
  }

  if (!isEmail(rawTarget)) {
    return NextResponse.json(
      {
        error: "PHONE_NOT_SUPPORTED",
        message:
          "تسجيل الدخول بالجوال غير مفعّل حالياً. استخدم البريد الإلكتروني.",
      },
      { status: 400 },
    );
  }

  const email = rawTarget.trim().toLowerCase();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  const ua = req.headers.get("user-agent") || "";

  const sb: any = await getStoreDb(storeId);

  const recent: any = await sb
    .from(emailOtpsTable)
    .select("id,created_at")
    .eq("store_id", storeId)
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.error) {
    return NextResponse.json(
      { error: "OTP_LOOKUP_FAILED", message: recent.error.message },
      { status: 500 },
    );
  }

  const recentRow = recent?.data as any;

  if (recentRow?.created_at) {
    const last = new Date(recentRow.created_at).getTime();

    if (Date.now() - last < 30_000) {
      return NextResponse.json(
        { error: "TOO_FAST", message: "انتظر قليلًا قبل إعادة الإرسال" },
        { status: 429 },
      );
    }
  }

  const code = gen4();
  const code_hash = hashOtp(email, code);
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const ins: any = await sb.from(emailOtpsTable).insert({
    store_id: storeId,
    email,
    code_hash,
    expires_at,
    ip,
    user_agent: ua,
  });

  if (ins?.error) {
    return NextResponse.json(
      { error: "DB_INSERT_FAILED", message: ins.error.message },
      { status: 500 },
    );
  }

  try {
    await sendEmailOtp(email, code);
  } catch (e: any) {
    return NextResponse.json(
      { error: "EMAIL_SEND_FAILED", message: e?.message || "SEND_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    channel: "email",
    target: email,
    store_id: storeId,
  });
}