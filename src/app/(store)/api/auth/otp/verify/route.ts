// FILE: apps/storefront/src/app/(store)/api/auth/otp/verify/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { hashOtp, signSession } from "@/lib/auth/session";

const CART_COOKIE = "darb_cart_session";
const SESSION_COOKIE = "elyaia_session";

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  /**
   * مهم للـ multi-store:
   * لا نضع domain هنا حتى تكون الجلسة خاصة بالدومين/المتجر الحالي.
   * وجود SESSION_COOKIE_DOMAIN قد يشارك الجلسة بين أكثر من متجر.
   */
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function ensureAuthUserId(sb: any, email: string): Promise<string> {
  const created = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (created?.data?.user?.id) return created.data.user.id;

  const listed = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = listed?.data?.users?.find(
    (u: any) => String(u.email || "").toLowerCase() === email.toLowerCase(),
  );

  if (user?.id) return user.id;

  throw new Error(
    created?.error?.message || "AUTH_USER_CREATE_OR_LOOKUP_FAILED",
  );
}

async function mergeCartAfterLogin(args: {
  sb: any;
  store_id: string;
  customer_id: string;
  session_id: string;
}) {
  const { sb, store_id, customer_id, session_id } = args;

  if (!session_id) return null;

  const sessionCartR = await sb
    .from("carts")
    .select("id,store_id,session_id,user_id,status")
    .eq("store_id", store_id)
    .eq("session_id", session_id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (sessionCartR.error) throw new Error(sessionCartR.error.message);

  const sessionCart = sessionCartR.data ?? null;
  if (!sessionCart?.id) return null;

  const customerCartR = await sb
    .from("carts")
    .select("id,store_id,session_id,user_id,status")
    .eq("store_id", store_id)
    .eq("user_id", customer_id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (customerCartR.error) throw new Error(customerCartR.error.message);

  const customerCart = customerCartR.data ?? null;

  if (!customerCart?.id) {
    const up = await sb
      .from("carts")
      .update({
        user_id: customer_id,
        session_id: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionCart.id)
      .eq("store_id", store_id)
      .select("id,status")
      .single();

    if (up.error) throw new Error(up.error.message);

    return { merged_cart_id: sessionCart.id };
  }

  if (String(customerCart.id) === String(sessionCart.id)) {
    await sb
      .from("carts")
      .update({
        session_id: null,
        user_id: customer_id,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", customerCart.id)
      .eq("store_id", store_id);

    return { merged_cart_id: customerCart.id };
  }

  const sessionItemsR = await sb
    .from("cart_items")
    .select("id,line_key,qty")
    .eq("cart_id", sessionCart.id);

  if (sessionItemsR.error) throw new Error(sessionItemsR.error.message);

  const sessionItems = Array.isArray(sessionItemsR.data)
    ? sessionItemsR.data
    : [];

  const customerItemsR = await sb
    .from("cart_items")
    .select("id,line_key,qty")
    .eq("cart_id", customerCart.id);

  if (customerItemsR.error) throw new Error(customerItemsR.error.message);

  const customerItems = Array.isArray(customerItemsR.data)
    ? customerItemsR.data
    : [];

  const customerByLine = new Map<string, { id: string; qty: number }>();

  for (const it of customerItems) {
    const lineKey = String(it?.line_key ?? "").trim();
    if (!lineKey) continue;

    customerByLine.set(lineKey, {
      id: String(it.id),
      qty: Number(it.qty ?? 0),
    });
  }

  for (const it of sessionItems) {
    const lineKey = String(it?.line_key ?? "").trim();
    const qty = Math.max(1, Number(it?.qty ?? 1));

    if (!lineKey) {
      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", it.id)
        .eq("cart_id", sessionCart.id);

      if (del.error) throw new Error(del.error.message);
      continue;
    }

    const hit = customerByLine.get(lineKey);

    if (hit?.id) {
      const newQty = Math.max(1, hit.qty + qty);

      const up = await sb
        .from("cart_items")
        .update({ qty: newQty })
        .eq("id", hit.id)
        .eq("cart_id", customerCart.id);

      if (up.error) throw new Error(up.error.message);

      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", it.id)
        .eq("cart_id", sessionCart.id);

      if (del.error) throw new Error(del.error.message);

      customerByLine.set(lineKey, { id: hit.id, qty: newQty });
    } else {
      const mv = await sb
        .from("cart_items")
        .update({ cart_id: customerCart.id })
        .eq("id", it.id)
        .eq("cart_id", sessionCart.id);

      if (mv.error) throw new Error(mv.error.message);

      customerByLine.set(lineKey, { id: String(it.id), qty });
    }
  }

  await sb
    .from("carts")
    .update({
      status: "abandoned",
      session_id: null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionCart.id)
    .eq("store_id", store_id);

  await sb
    .from("carts")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", customerCart.id)
    .eq("store_id", store_id);

  return { merged_cart_id: customerCart.id };
}

export async function POST(req: Request) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 404 });
  }

  const storeId = String(ctx.store.id);

  const body = await req.json().catch(() => ({}));

  const rawTarget = String(body?.target || "").trim();
  const target = rawTarget.toLowerCase();
  const token = String(body?.token || "").trim();

  if (!target || !/^\d{4}$/.test(token)) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "أدخل رمز مكون من 4 أرقام" },
      { status: 400 },
    );
  }

  const sb: any = supabaseAdmin();

  const otpTable: any = "auth_email_otps";
  const customersTable: any = "customers";
  const storeCustomersTable: any = "store_customers";

  /**
   * مهم:
   * صار البحث عن الرمز حسب store_id + email
   * عشان رمز متجر لا يعمل في متجر آخر.
   */
  const row: any = await sb
    .from(otpTable)
    .select(
      "id,store_id,email,code_hash,expires_at,attempts,max_attempts,consumed_at,created_at",
    )
    .eq("store_id", storeId)
    .eq("email", target)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (row?.error) {
    return NextResponse.json(
      { error: "OTP_LOOKUP_FAILED", message: row.error.message },
      { status: 500 },
    );
  }

  const otp: any = row?.data;

  if (!otp) {
    return NextResponse.json(
      { error: "OTP_NOT_FOUND", message: "لا يوجد رمز صالح، أعد الإرسال" },
      { status: 400 },
    );
  }

  const expired = new Date(otp.expires_at).getTime() < Date.now();

  if (expired) {
    return NextResponse.json(
      { error: "OTP_EXPIRED", message: "انتهت صلاحية الرمز، أعد الإرسال" },
      { status: 400 },
    );
  }

  if ((otp.attempts ?? 0) >= (otp.max_attempts ?? 5)) {
    return NextResponse.json(
      { error: "OTP_LOCKED", message: "تم تجاوز عدد المحاولات" },
      { status: 429 },
    );
  }

  const expected: string = otp.code_hash;
  const actual: string = hashOtp(target, token);

  if (expected !== actual) {
    await sb
      .from(otpTable)
      .update({ attempts: (otp.attempts ?? 0) + 1 })
      .eq("id", otp.id)
      .eq("store_id", storeId);

    return NextResponse.json(
      { error: "OTP_INVALID", message: "رمز التحقق غير صحيح" },
      { status: 400 },
    );
  }

  await sb
    .from(otpTable)
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id)
    .eq("store_id", storeId);

  let auth_user_id: string;

  try {
    auth_user_id = await ensureAuthUserId(sb, target);
  } catch (e: any) {
    return NextResponse.json(
      { error: "AUTH_USER_FAILED", message: e?.message || "AUTH_USER_FAILED" },
      { status: 500 },
    );
  }

  const existing: any = await sb
    .from(customersTable)
    .select("id,email,auth_user_id,birth_date,gender,city_id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle();

  if (existing?.error) {
    return NextResponse.json(
      { error: "CUSTOMER_LOOKUP_FAILED", message: existing.error.message },
      { status: 500 },
    );
  }

  let customer_id: string;

  if (!existing?.data) {
    const created: any = await sb
      .from(customersTable)
      .upsert({ auth_user_id, email: target } as any, {
        onConflict: "auth_user_id",
      })
      .select("id,auth_user_id,email")
      .single();

    if (created?.error || !created?.data?.id) {
      return NextResponse.json(
        {
          error: "CUSTOMER_CREATE_FAILED",
          message: created?.error?.message || "create failed",
        },
        { status: 500 },
      );
    }

    customer_id = String(created.data.id);
  } else {
    customer_id = String(existing.data.id);

    await sb
      .from(customersTable)
      .update({ email: target } as any)
      .eq("id", customer_id);
  }

  const link: any = await sb.from(storeCustomersTable).upsert(
    {
      store_id: storeId,
      customer_id,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "store_id,customer_id" },
  );

  if (link?.error) {
    return NextResponse.json(
      { error: "STORE_LINK_FAILED", message: link.error.message },
      { status: 500 },
    );
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const session = signSession({ customer_id, exp });

  await setSessionCookie(session);

  const jar = await cookies();
  const sid = jar.get(CART_COOKIE)?.value || "";

  let merged_cart_id: string | null = null;

  try {
    const merged = await mergeCartAfterLogin({
      sb,
      store_id: storeId,
      customer_id,
      session_id: sid,
    });

    merged_cart_id = merged?.merged_cart_id ?? null;
  } catch {
    // لا نكسر تسجيل الدخول لو دمج السلة فشل
  }

  return NextResponse.json({
    ok: true,
    store_id: storeId,
    customer_id,
    merged_cart_id,
  });
}