// FILE: apps/storefront/src/app/(store)/api/favorites/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";

const FAVORITES_SESSION_COOKIE = "elyaia_favorites_session";

function s(value: any) {
  return String(value ?? "").trim();
}

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function getCustomerId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("elyaia_session")?.value;

  if (!token) return null;

  try {
    const payload: any = await verifySession(token);
    return s(payload?.customer_id) || null;
  } catch {
    return null;
  }
}

async function readOwner(createGuestSession: boolean) {
  const cookieStore = await cookies();

  const customerId = await getCustomerId();
  let sessionId = s(cookieStore.get(FAVORITES_SESSION_COOKIE)?.value) || null;
  let shouldSetSessionCookie = false;

  if (!customerId && !sessionId && createGuestSession) {
    sessionId = crypto.randomUUID();
    shouldSetSessionCookie = true;
  }

  return {
    customerId,
    sessionId,
    shouldSetSessionCookie,
  };
}

function attachSessionCookie(response: NextResponse, sessionId: string | null) {
  if (!sessionId) return response;

  response.cookies.set(FAVORITES_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

async function ensureProductBelongsToStore(storeId: string, productId: string) {
  const sb: any = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();

  if (error || !data?.id) return false;
  return true;
}

export async function GET() {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return json(
      {
        ok: false,
        product_ids: [],
        error: "store_not_found",
      },
      404,
    );
  }

  const storeId = ctx.store.id;
  const sb: any = await getStoreDb(storeId);
  const owner = await readOwner(false);
  const productIds = new Set<string>();

  if (!owner.customerId && !owner.sessionId) {
    return json({
      ok: true,
      product_ids: [],
    });
  }

  if (owner.customerId) {
    const { data, error } = await sb
      .from("customer_favorites")
      .select("product_id")
      .eq("store_id", storeId)
      .eq("customer_id", owner.customerId);

    if (error) {
      return json(
        {
          ok: false,
          product_ids: [],
          error: "failed_to_load_customer_favorites",
        },
        500,
      );
    }

    for (const row of data || []) {
      const id = s(row?.product_id);
      if (id) productIds.add(id);
    }
  }

  if (owner.sessionId) {
    const { data, error } = await sb
      .from("customer_favorites")
      .select("product_id")
      .eq("store_id", storeId)
      .is("customer_id", null)
      .eq("session_id", owner.sessionId);

    if (error) {
      return json(
        {
          ok: false,
          product_ids: [],
          error: "failed_to_load_session_favorites",
        },
        500,
      );
    }

    for (const row of data || []) {
      const id = s(row?.product_id);
      if (id) productIds.add(id);
    }
  }

  return json({
    ok: true,
    product_ids: Array.from(productIds),
  });
}

export async function POST(request: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return json(
      {
        ok: false,
        error: "store_not_found",
      },
      404,
    );
  }

  const storeId = ctx.store.id;
  const body = await request.json().catch(() => ({}));
  const productId = s(body?.product_id || body?.productId || body?.id);

  if (!productId) {
    return json(
      {
        ok: false,
        error: "missing_product_id",
      },
      400,
    );
  }

  const validProduct = await ensureProductBelongsToStore(storeId, productId);

  if (!validProduct) {
    return json(
      {
        ok: false,
        error: "product_not_found",
      },
      404,
    );
  }

  const owner = await readOwner(true);

  if (!owner.customerId && !owner.sessionId) {
    return json(
      {
        ok: false,
        error: "missing_favorites_owner",
      },
      401,
    );
  }

  const sb: any = await getStoreDb(storeId);

  const payload = owner.customerId
    ? {
        store_id: storeId,
        customer_id: owner.customerId,
        session_id: null,
        product_id: productId,
      }
    : {
        store_id: storeId,
        customer_id: null,
        session_id: owner.sessionId,
        product_id: productId,
      };

  const { error } = await sb.from("customer_favorites").insert(payload);

  if (error && error.code !== "23505") {
    return json(
      {
        ok: false,
        error: "failed_to_add_favorite",
      },
      500,
    );
  }

  const response = json({
    ok: true,
    product_id: productId,
    is_favorite: true,
  });

  if (owner.shouldSetSessionCookie) {
    attachSessionCookie(response, owner.sessionId);
  }

  return response;
}

export async function DELETE(request: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return json(
      {
        ok: false,
        error: "store_not_found",
      },
      404,
    );
  }

  const storeId = ctx.store.id;
  const body = await request.json().catch(() => ({}));
  const productId = s(body?.product_id || body?.productId || body?.id);

  if (!productId) {
    return json(
      {
        ok: false,
        error: "missing_product_id",
      },
      400,
    );
  }

  const owner = await readOwner(false);

  if (!owner.customerId && !owner.sessionId) {
    return json({
      ok: true,
      product_id: productId,
      is_favorite: false,
    });
  }

  const sb: any = await getStoreDb(storeId);

  if (owner.customerId) {
    const { error } = await sb
      .from("customer_favorites")
      .delete()
      .eq("store_id", storeId)
      .eq("customer_id", owner.customerId)
      .eq("product_id", productId);

    if (error) {
      return json(
        {
          ok: false,
          error: "failed_to_remove_customer_favorite",
        },
        500,
      );
    }
  }

  if (owner.sessionId) {
    const { error } = await sb
      .from("customer_favorites")
      .delete()
      .eq("store_id", storeId)
      .is("customer_id", null)
      .eq("session_id", owner.sessionId)
      .eq("product_id", productId);

    if (error) {
      return json(
        {
          ok: false,
          error: "failed_to_remove_session_favorite",
        },
        500,
      );
    }
  }

  return json({
    ok: true,
    product_id: productId,
    is_favorite: false,
  });
}