// FILE: apps/storefront/src/app/(store)/api/auth/me/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { resolveActiveMobileStoreApp } from "@/data/mobile/store-app.server";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: Request) {
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
    return NextResponse.json(
      { authed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const authorization = String(
    req.headers.get("authorization") ?? "",
  ).trim();
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  const cookieStore = await cookies();
  const token =
    bearer || cookieStore.get("elyaia_session")?.value || "";

  if (!token) {
    return NextResponse.json(
      { authed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: any = null;

  try {
    payload = await verifySession(token);
  } catch {
    payload = null;
  }

  if (!payload?.customer_id) {
    return NextResponse.json(
      { authed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const sb: any = await getStoreDb(storeId);

  const customerR = await sb
    .from("customers")
    .select("id,email,full_name,birth_date,gender,city_id,auth_user_id")
    .eq("id", payload.customer_id)
    .maybeSingle();

  if (customerR.error || !customerR.data) {
    return NextResponse.json(
      { authed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let phone_e164: string | null = null;

  if (customerR.data.auth_user_id) {
    const identityR = await sb
      .from("user_identities")
      .select("phone_e164")
      .eq("user_id", customerR.data.auth_user_id)
      .maybeSingle();

    if (!identityR.error && identityR.data?.phone_e164) {
      phone_e164 = String(identityR.data.phone_e164);
    }
  }

  return NextResponse.json(
    {
      authed: true,
      store_id: storeId,
      customer: {
        id: customerR.data.id,
        email: customerR.data.email ?? null,
        full_name: customerR.data.full_name ?? null,
        birth_date: customerR.data.birth_date ?? null,
        gender: customerR.data.gender ?? null,
        city_id: customerR.data.city_id ?? null,
        phone_e164,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}