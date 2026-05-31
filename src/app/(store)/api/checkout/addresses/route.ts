// FILE: apps/storefront/src/app/(store)/api/checkout/addresses/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { verifySession } from "@/lib/auth/session";
import { getStoreIdOrThrow } from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

export type AddressOut = {
  id: string;
  label: string;
  full: string;
  national?: string | null;

  recipient_name: string | null;
  phone_e164: string | null;

  country_id: string | null;
  city_id: string | null;
  district_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
};

function s(x: any) {
  return String(x ?? "").trim();
}

async function getCustomerIdFromCookie() {
  const jar = await cookies();
  const token = jar.get("elyaia_session")?.value || "";
  if (!token) return null;

  try {
    const session: any = await verifySession(token);
    return session?.customer_id ? String(session.customer_id) : null;
  } catch {
    return null;
  }
}

function normalizePhone(x: any) {
  const v = s(x);
  if (!v) return null;
  const cleaned = v.replace(/\s+/g, "");
  return cleaned || null;
}

async function getProfileDefaults(sb: any, customer_id: string) {
  const cR = await sb
    .from("customers")
    .select("id,full_name,auth_user_id")
    .eq("id", customer_id)
    .maybeSingle();

  if (cR.error) throw new Error(cR.error.message);

  const full_name = cR.data?.full_name ? String(cR.data.full_name) : null;
  const auth_user_id = cR.data?.auth_user_id
    ? String(cR.data.auth_user_id)
    : null;

  let phone_e164: string | null = null;

  if (auth_user_id) {
    const pR = await sb
      .from("user_identities")
      .select("phone_e164")
      .eq("user_id", auth_user_id)
      .maybeSingle();

    if (pR.error) throw new Error(pR.error.message);
    phone_e164 = pR.data?.phone_e164 ? String(pR.data.phone_e164) : null;
  }

  return { full_name, phone_e164 };
}

function mapRowToOut(row: any): AddressOut {
  const cityName = s(row?.city?.name_ar || row?.city?.name_en);
  const districtName = s(row?.district?.name_ar || row?.district?.name_en);
  const countryName = s(row?.country?.name_ar || row?.country?.name_en);

  const label =
    s(row?.label) ||
    [cityName, districtName].filter(Boolean).join(" - ") ||
    "عنوان";

  const parts: string[] = [];
  const line1 = s(row?.address_line1);
  const line2 = s(row?.address_line2);
  const postal = s(row?.postal_code);

  if (line1) parts.push(line1);
  if (line2) parts.push(line2);
  if (postal) parts.push(postal);

  const full = parts.join(" - ") || "—";

  const national =
    [countryName, cityName, districtName].filter(Boolean).join(" - ") || null;

  return {
    id: String(row?.id),
    label,
    full,
    national,

    recipient_name: row?.recipient_name ? String(row.recipient_name) : null,
    phone_e164: row?.phone_e164 ? String(row.phone_e164) : null,

    country_id: row?.country_id ? String(row.country_id) : null,
    city_id: row?.city_id ? String(row.city_id) : null,
    district_id: row?.district_id ? String(row.district_id) : null,
    address_line1: row?.address_line1 ? String(row.address_line1) : null,
    address_line2: row?.address_line2 ? String(row.address_line2) : null,
    postal_code: row?.postal_code ? String(row.postal_code) : null,
  };
}

async function validateCityAndDistrict(
  sb: any,
  city_id: string,
  district_id: string | null,
) {
  const cityR = await sb
    .from("ref_cities")
    .select("id")
    .eq("id", city_id)
    .limit(1)
    .maybeSingle();

  if (cityR.error) {
    return { ok: false as const, status: 500, error: cityR.error.message };
  }

  if (!cityR.data?.id) {
    return { ok: false as const, status: 400, error: "CITY_NOT_FOUND" };
  }

  if (district_id) {
    const dR = await sb
      .from("ref_districts")
      .select("id,city_id")
      .eq("id", district_id)
      .limit(1)
      .maybeSingle();

    if (dR.error) {
      return { ok: false as const, status: 500, error: dR.error.message };
    }

    if (!dR.data?.id) {
      return { ok: false as const, status: 400, error: "DISTRICT_NOT_FOUND" };
    }

    if (String(dR.data.city_id) !== String(city_id)) {
      return {
        ok: false as const,
        status: 400,
        error: "DISTRICT_CITY_MISMATCH",
      };
    }
  }

  return { ok: true as const };
}

async function validateCountry(sb: any, country_id: string) {
  const r = await sb
    .from("ref_countries")
    .select("id")
    .eq("id", country_id)
    .limit(1)
    .maybeSingle();

  if (r.error) {
    return { ok: false as const, status: 500, error: r.error.message };
  }

  if (!r.data?.id) {
    return { ok: false as const, status: 400, error: "COUNTRY_NOT_FOUND" };
  }

  return { ok: true as const };
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(store_id);

    const customer_id = await getCustomerIdFromCookie();

    if (!customer_id) {
      return NextResponse.json({ ok: true, addresses: [] as AddressOut[] });
    }

    const r = await sb
      .from("customer_addresses")
      .select(
        `
        id,
        label,
        country_id,
        city_id,
        district_id,
        recipient_name,
        phone_e164,
        address_line1,
        address_line2,
        postal_code,
        country:ref_countries(id,name_ar,name_en,iso2),
        city:ref_cities(id,name_ar,name_en),
        district:ref_districts(id,name_ar,name_en)
      `,
      )
      .eq("customer_id", customer_id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (r.error) {
      return NextResponse.json(
        { ok: false, error: r.error.message },
        { status: 500 },
      );
    }

    const addresses: AddressOut[] = (Array.isArray(r.data) ? r.data : []).map(
      mapRowToOut,
    );

    return NextResponse.json({ ok: true, addresses });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ADDRESSES_GET_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(store_id);

    const customer_id = await getCustomerIdFromCookie();

    if (!customer_id) {
      return NextResponse.json(
        { ok: false, error: "LOGIN_REQUIRED" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const country_id = s(body?.country_id) || null;
    const city_id = s(body?.city_id);
    const district_id = s(body?.district_id) || null;

    const address_line1 = s(body?.address_line1);
    const address_line2 = s(body?.address_line2) || null;
    const postal_code = s(body?.postal_code) || null;
    const label = s(body?.label) || null;

    let recipient_name = s(body?.recipient_name) || null;
    let phone_e164 = normalizePhone(body?.phone_e164);

    if (!city_id || !address_line1) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ADDRESS" },
        { status: 400 },
      );
    }

    if (country_id) {
      const vc = await validateCountry(sb, country_id);
      if (!vc.ok) {
        return NextResponse.json(
          { ok: false, error: vc.error },
          { status: vc.status },
        );
      }
    }

    const v = await validateCityAndDistrict(sb, city_id, district_id);

    if (!v.ok) {
      return NextResponse.json(
        { ok: false, error: v.error },
        { status: v.status },
      );
    }

    if (!recipient_name || !phone_e164) {
      const defaults = await getProfileDefaults(sb, customer_id);
      if (!recipient_name) recipient_name = defaults.full_name;
      if (!phone_e164) phone_e164 = defaults.phone_e164;
    }

    const ins = await sb
      .from("customer_addresses")
      .insert({
        customer_id,
        country_id,
        city_id,
        district_id,
        address_line1,
        address_line2,
        postal_code,
        label,
        recipient_name,
        phone_e164,
        notes: null,
        lat: null,
        lng: null,
        is_default: false,
      })
      .select(
        `
        id,
        label,
        country_id,
        city_id,
        district_id,
        recipient_name,
        phone_e164,
        address_line1,
        address_line2,
        postal_code,
        country:ref_countries(id,name_ar,name_en,iso2),
        city:ref_cities(id,name_ar,name_en),
        district:ref_districts(id,name_ar,name_en)
      `,
      )
      .single();

    if (ins.error) {
      return NextResponse.json(
        { ok: false, error: ins.error.message },
        { status: 500 },
      );
    }

    const address: AddressOut = mapRowToOut(ins.data);
    return NextResponse.json({ ok: true, address });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ADDRESSES_POST_FAILED" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(store_id);

    const customer_id = await getCustomerIdFromCookie();

    if (!customer_id) {
      return NextResponse.json(
        { ok: false, error: "LOGIN_REQUIRED" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const id = s(body?.id);
    const country_id = s(body?.country_id) || null;
    const city_id = s(body?.city_id);
    const district_id = s(body?.district_id) || null;

    const address_line1 = s(body?.address_line1);
    const address_line2 = s(body?.address_line2) || null;
    const postal_code = s(body?.postal_code) || null;
    const label = s(body?.label) || null;

    let recipient_name = s(body?.recipient_name) || null;
    let phone_e164 = normalizePhone(body?.phone_e164);

    if (!id || !city_id || !address_line1) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ADDRESS" },
        { status: 400 },
      );
    }

    const own = await sb
      .from("customer_addresses")
      .select("id")
      .eq("id", id)
      .eq("customer_id", customer_id)
      .limit(1)
      .maybeSingle();

    if (own.error) {
      return NextResponse.json(
        { ok: false, error: own.error.message },
        { status: 500 },
      );
    }

    if (!own.data?.id) {
      return NextResponse.json(
        { ok: false, error: "ADDRESS_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (country_id) {
      const vc = await validateCountry(sb, country_id);
      if (!vc.ok) {
        return NextResponse.json(
          { ok: false, error: vc.error },
          { status: vc.status },
        );
      }
    }

    const v = await validateCityAndDistrict(sb, city_id, district_id);

    if (!v.ok) {
      return NextResponse.json(
        { ok: false, error: v.error },
        { status: v.status },
      );
    }

    if (!recipient_name || !phone_e164) {
      const defaults = await getProfileDefaults(sb, customer_id);
      if (!recipient_name) recipient_name = defaults.full_name;
      if (!phone_e164) phone_e164 = defaults.phone_e164;
    }

    const upd = await sb
      .from("customer_addresses")
      .update({
        country_id,
        city_id,
        district_id,
        address_line1,
        address_line2,
        postal_code,
        label,
        recipient_name,
        phone_e164,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("customer_id", customer_id)
      .select(
        `
        id,
        label,
        country_id,
        city_id,
        district_id,
        recipient_name,
        phone_e164,
        address_line1,
        address_line2,
        postal_code,
        country:ref_countries(id,name_ar,name_en,iso2),
        city:ref_cities(id,name_ar,name_en),
        district:ref_districts(id,name_ar,name_en)
      `,
      )
      .single();

    if (upd.error) {
      return NextResponse.json(
        { ok: false, error: upd.error.message },
        { status: 500 },
      );
    }

    const address: AddressOut = mapRowToOut(upd.data);
    return NextResponse.json({ ok: true, address });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ADDRESSES_PATCH_FAILED" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(store_id);

    const customer_id = await getCustomerIdFromCookie();

    if (!customer_id) {
      return NextResponse.json(
        { ok: false, error: "LOGIN_REQUIRED" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = s(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID" },
        { status: 400 },
      );
    }

    const own = await sb
      .from("customer_addresses")
      .select("id")
      .eq("id", id)
      .eq("customer_id", customer_id)
      .limit(1)
      .maybeSingle();

    if (own.error) {
      return NextResponse.json(
        { ok: false, error: own.error.message },
        { status: 500 },
      );
    }

    if (!own.data?.id) {
      return NextResponse.json(
        { ok: false, error: "ADDRESS_NOT_FOUND" },
        { status: 404 },
      );
    }

    const del = await sb
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("customer_id", customer_id);

    if (del.error) {
      return NextResponse.json(
        { ok: false, error: del.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ADDRESSES_DELETE_FAILED" },
      { status: 500 },
    );
  }
}