// FILE: apps/storefront/src/app/(store)/api/currency/route.ts

import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeCurrencyCode(value: unknown) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function makeCurrencyCookieName(storeId: string) {
  return `mk_currency_${s(storeId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function getCookieStore() {
  const cookieStoreMaybe = cookies();

  return typeof (cookieStoreMaybe as any)?.then === "function"
    ? await cookieStoreMaybe
    : cookieStoreMaybe;
}

export async function POST(request: Request) {
  let body: any = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const storeId = s(body.store_id || body.storeId);
  const currencyCode = normalizeCurrencyCode(
    body.currency_code || body.currencyCode || body.code,
  );

  if (!storeId || !currencyCode) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_currency_payload",
      },
      { status: 400 },
    );
  }

  const sb: any = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_currencies")
    .select("currency_code")
    .eq("store_id", storeId)
    .eq("currency_code", currencyCode)
    .eq("is_enabled", true)
    .limit(1)
    .maybeSingle();

  if (error || !data?.currency_code) {
    return NextResponse.json(
      {
        ok: false,
        error: "currency_not_available",
      },
      { status: 400 },
    );
  }

  const requestedCookieName = s(body.cookie_name || body.cookieName);
  const cookieName = requestedCookieName || makeCurrencyCookieName(storeId);

  const cookieStore = await getCookieStore();

  cookieStore.set(cookieName, currencyCode, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({
    ok: true,
    currency_code: currencyCode,
  });
}