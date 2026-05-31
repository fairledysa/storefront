// FILE: apps/storefront/src/app/(store)/api/checkout/profile/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/session";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreIdOrThrow } from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

function s(x: any) {
  return String(x ?? "").trim();
}

async function getSession() {
  const jar = await cookies();
  const token = jar.get("elyaia_session")?.value || "";

  if (!token) return null;

  try {
    const session: any = await verifySession(token);
    return session ?? null;
  } catch {
    return null;
  }
}

function normalizePhoneRaw(x: any) {
  // نخزن كما هو لكن نشيل مسافات
  const v = s(x).replace(/\s+/g, "");
  return v || null;
}

export async function GET() {
  const store_id = await getStoreIdOrThrow();
  const sb: any = await getOrdersDb(store_id);

  const session = await getSession();
  const customer_id = session?.customer_id ? String(session.customer_id) : null;

  if (!customer_id) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED" },
      { status: 401 },
    );
  }

  const cR = await sb
    .from("customers")
    .select("id,full_name,email,auth_user_id")
    .eq("id", customer_id)
    .limit(1)
    .maybeSingle();

  if (cR.error) {
    return NextResponse.json(
      { ok: false, error: cR.error.message },
      { status: 500 },
    );
  }

  const customer = cR.data;

  if (!customer?.id) {
    return NextResponse.json(
      { ok: false, error: "CUSTOMER_NOT_FOUND" },
      { status: 404 },
    );
  }

  const auth_user_id = customer.auth_user_id
    ? String(customer.auth_user_id)
    : null;

  let phone_e164: string | null = null;
  let phone_verified: boolean | null = null;

  if (auth_user_id) {
    const uR = await sb
      .from("user_identities")
      .select("phone_e164,phone_verified")
      .eq("user_id", auth_user_id)
      .limit(1)
      .maybeSingle();

    if (!uR.error && uR.data) {
      phone_e164 = uR.data.phone_e164 ? String(uR.data.phone_e164) : null;
      phone_verified =
        typeof uR.data.phone_verified === "boolean"
          ? uR.data.phone_verified
          : null;
    }
  }

  return NextResponse.json({
    ok: true,
    profile: {
      full_name: customer.full_name ?? null,
      email: customer.email ?? null,
      phone_e164,
      phone_verified,
    },
  });
}

export async function PATCH(req: Request) {
  const store_id = await getStoreIdOrThrow();
  const sb: any = await getOrdersDb(store_id);

  const session = await getSession();
  const customer_id = session?.customer_id ? String(session.customer_id) : null;

  if (!customer_id) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const full_name = s(body?.full_name) || null;
  const phone_e164 = normalizePhoneRaw(body?.phone_e164);

  if (!full_name || !phone_e164) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_PROFILE",
        message_ar: "الاسم الكامل ورقم الجوال مطلوبين.",
      },
      { status: 400 },
    );
  }

  // نجيب auth_user_id من customers عشان نربط user_identities
  const cR = await sb
    .from("customers")
    .select("id,auth_user_id,email")
    .eq("id", customer_id)
    .limit(1)
    .maybeSingle();

  if (cR.error) {
    return NextResponse.json(
      { ok: false, error: cR.error.message },
      { status: 500 },
    );
  }

  const auth_user_id = cR.data?.auth_user_id
    ? String(cR.data.auth_user_id)
    : null;

  if (!auth_user_id) {
    return NextResponse.json(
      { ok: false, error: "AUTH_USER_ID_MISSING" },
      { status: 500 },
    );
  }

  // update customers.full_name
  const updC = await sb
    .from("customers")
    .update({ full_name, updated_at: new Date().toISOString() })
    .eq("id", customer_id)
    .select("full_name,email,auth_user_id")
    .single();

  if (updC.error) {
    return NextResponse.json(
      { ok: false, error: updC.error.message },
      { status: 500 },
    );
  }

  // upsert user_identities لو ما كان موجود ننشئه
  const exist = await sb
    .from("user_identities")
    .select("user_id,phone_verified")
    .eq("user_id", auth_user_id)
    .limit(1)
    .maybeSingle();

  if (exist.error) {
    return NextResponse.json(
      { ok: false, error: exist.error.message },
      { status: 500 },
    );
  }

  if (!exist.data?.user_id) {
    const ins = await sb.from("user_identities").insert({
      user_id: auth_user_id,
      phone_e164,
      phone_verified: false,
    });

    if (ins.error) {
      return NextResponse.json(
        { ok: false, error: ins.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      profile: {
        full_name: updC.data.full_name ?? null,
        email: updC.data.email ?? null,
        phone_e164,
        phone_verified: false,
      },
    });
  }

  const updU = await sb
    .from("user_identities")
    .update({
      phone_e164,
      // ما نغيّر verified هنا، لأن التحقق له flow مستقل
    })
    .eq("user_id", auth_user_id)
    .select("phone_e164,phone_verified")
    .single();

  if (updU.error) {
    return NextResponse.json(
      { ok: false, error: updU.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      full_name: updC.data.full_name ?? null,
      email: updC.data.email ?? null,
      phone_e164: updU.data.phone_e164 ?? null,
      phone_verified:
        typeof updU.data.phone_verified === "boolean"
          ? updU.data.phone_verified
          : null,
    },
  });
}