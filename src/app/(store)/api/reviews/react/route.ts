// FILE: apps/storefront/src/app/(store)/api/reviews/react/route.ts
import { NextRequest, NextResponse } from "next/server";

import { addHelpfulReaction } from "@/data/reviews/reviews";
import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function normalizeHost(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/:\d+$/, "");
}

async function resolveStoreId(req: NextRequest) {
  const sb = (await controlDb()) as any;

  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.NEXT_PUBLIC_DEV_HOST ||
    "";

  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return null;

  const candidates = Array.from(
    new Set(
      [
        normalizedHost,
        normalizedHost.replace(/^www\./, ""),
        `www.${normalizedHost.replace(/^www\./, "")}`,
      ].filter(Boolean),
    ),
  );

  const domainR = await sb
    .from("store_domains")
    .select("store_id, domain, verified_at, is_primary")
    .in("domain", candidates)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (domainR.data?.store_id) {
    return String(domainR.data.store_id);
  }

  const slugGuess = normalizedHost.split(".")[0];
  if (!slugGuess) return null;

  const storeR = await sb
    .from("stores")
    .select("id, slug")
    .eq("slug", slugGuess)
    .limit(1)
    .maybeSingle();

  return storeR.data?.id ? String(storeR.data.id) : null;
}

async function resolveCustomerIdFromRequest(args: {
  req: NextRequest;
  storeId: string;
}) {
  const storeId = s(args.storeId);
  if (!storeId) return null;

  const sb = (await getStoreDb(storeId)) as any;
  const req = args.req;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await sb.auth.getUser(token);

  if (error || !user?.id) return null;

  const { data: customer } = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return customer?.id ? String(customer.id) : null;
}

export async function POST(req: NextRequest) {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const body = await req.json();
    const reviewId = s(body?.review_id);
    const sessionId = s(body?.session_id) || null;

    if (!reviewId) return bad("REVIEW_ID_REQUIRED");

    const customerId = await resolveCustomerIdFromRequest({
      req,
      storeId,
    });

    const result = await addHelpfulReaction({
      reviewId,
      storeId,
      customerId,
      sessionId: customerId ? null : sessionId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: any) {
    return bad(error?.message || "FAILED_TO_REACT", 500);
  }
}