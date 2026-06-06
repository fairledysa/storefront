// FILE: apps/storefront/src/app/(store)/api/ref/cities/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreIdOrThrow } from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(storeId);

    const url = new URL(req.url);
    const countryId = s(url.searchParams.get("country_id"));
    const iso2 = s(url.searchParams.get("country")).toUpperCase();
    const q = s(url.searchParams.get("q"));

    let resolvedCountryId = countryId;

    if (!resolvedCountryId && iso2) {
      const countryResult = await sb
        .from("ref_countries")
        .select("id")
        .eq("iso2", iso2)
        .eq("status", "active")
        .maybeSingle();

      if (countryResult.error) {
        return NextResponse.json(
          { ok: false, error: countryResult.error.message, cities: [] },
          { status: 500 },
        );
      }

      resolvedCountryId = s(countryResult.data?.id);
    }

    let query = sb
      .from("ref_cities")
      .select("id,country_id,name_ar,name_en,status")
      .eq("status", "active")
      .order("name_ar", { ascending: true })
      .limit(1000);

    if (resolvedCountryId) {
      query = query.eq("country_id", resolvedCountryId);
    }

    if (q) {
      query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, cities: [] },
        { status: 500 },
      );
    }

    const cities = (Array.isArray(data) ? data : []).map((row: any) => ({
      id: s(row.id),
      country_id: s(row.country_id) || null,
      name_ar: s(row.name_ar),
      name_en: s(row.name_en) || null,
    }));

    return NextResponse.json(
      { ok: true, cities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "CITIES_GET_FAILED",
        cities: [],
      },
      { status: 500 },
    );
  }
}