// FILE: apps/storefront/src/app/(store)/api/ref/countries/route.ts

import { NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreIdOrThrow } from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET() {
  try {
    const storeId = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(storeId);

    const { data, error } = await sb
      .from("ref_countries")
      .select("id,iso2,name_ar,name_en,status")
      .eq("status", "active")
      .order("name_ar", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, countries: [] },
        { status: 500 },
      );
    }

    const countries = (Array.isArray(data) ? data : []).map((row: any) => ({
      id: s(row.id),
      iso2: s(row.iso2) || null,
      name_ar: s(row.name_ar),
      name_en: s(row.name_en) || null,
    }));

    return NextResponse.json(
      { ok: true, countries },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "COUNTRIES_GET_FAILED",
        countries: [],
      },
      { status: 500 },
    );
  }
}