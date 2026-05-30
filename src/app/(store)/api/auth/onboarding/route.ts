// FILE: apps/storefront/src/app/(store)/api/auth/onboarding/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Gender = "male" | "female";

export async function POST(req: Request) {
  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return NextResponse.json(
      { error: "NO_STORE" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const storeId = ctx.store.id;
  const body = await req.json().catch(() => ({}));

  const full_name_raw =
    typeof body.full_name === "string" ? body.full_name.trim() : "";
  const full_name = full_name_raw.length ? full_name_raw : null;

  const birth_date =
    typeof body.birth_date === "string" ? body.birth_date : null;

  const gender =
    body.gender === "male" || body.gender === "female"
      ? (body.gender as Gender)
      : null;

  const city_id = typeof body.city_id === "string" ? body.city_id : null;

  if (!full_name && !birth_date && !gender && !city_id) {
    return NextResponse.json(
      { error: "NO_FIELDS" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("elyaia_session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
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
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const customer_id = String(payload.customer_id);
  const admin: any = await getStoreDb(storeId);

  const existing = await admin
    .from("customers")
    .select("id")
    .eq("id", customer_id)
    .maybeSingle();

  if (existing.error || !existing.data?.id) {
    return NextResponse.json(
      { error: "CUSTOMER_NOT_FOUND" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const patch: any = {};
  if (full_name) patch.full_name = full_name;
  if (birth_date) patch.birth_date = birth_date;
  if (gender) patch.gender = gender;
  if (city_id) patch.city_id = city_id;

  const updated = await admin.from("customers").update(patch).eq("id", customer_id);

  if (updated.error) {
    return NextResponse.json(
      { error: "CUSTOMER_UPDATE_FAILED", message: updated.error.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const link = await admin.from("store_customers").upsert(
    { store_id: storeId, customer_id },
    { onConflict: "store_id,customer_id" },
  );

  if (link.error) {
    return NextResponse.json(
      { error: "STORE_CUSTOMER_LINK_FAILED", message: link.error.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}