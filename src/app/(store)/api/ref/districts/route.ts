// FILE: apps/storefront/src/app/(store)/api/ref/districts/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/data/store/supabase.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sb: any = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const city_id = String(searchParams.get("city_id") ?? "").trim();

  if (!city_id) {
    return NextResponse.json({ ok: true, districts: [] });
  }

  const r = await sb
    .from("ref_districts")
    .select("id,city_id,name_ar,name_en")
    .eq("city_id", city_id)
    .eq("status", "active")
    .order("name_ar", { ascending: true })
    .limit(1000);

  if (r.error) {
    return NextResponse.json(
      { ok: false, error: r.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, districts: r.data ?? [] });
}
