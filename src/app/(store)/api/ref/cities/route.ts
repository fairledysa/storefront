// FILE: apps/storefront/src/app/(store)/api/ref/cities/route.ts

import { NextResponse } from "next/server";

import { controlDb } from "@/data/db/control-db.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb: any = await controlDb();

  const r = await sb
    .from("ref_cities")
    .select("id,name_ar,name_en")
    .eq("status", "active")
    .order("name_ar", { ascending: true })
    .limit(500);

  if (r.error) {
    return NextResponse.json(
      { ok: false, error: r.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, cities: r.data ?? [] });
}