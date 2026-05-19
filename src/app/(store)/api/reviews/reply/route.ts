//app/(store)/api/reviews/reply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createReviewReply } from "@/data/reviews/reviews";
import { getStoreOptions } from "@/data/store/options";
import { supabaseAdmin } from "@/data/store/supabase.server";

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
  const sb = supabaseAdmin();

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
    .select("store_id, domain, is_primary")
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
    .select("id")
    .eq("slug", slugGuess)
    .limit(1)
    .maybeSingle();

  return storeR.data?.id ? String(storeR.data.id) : null;
}

async function resolveCustomerIdFromRequest(req: NextRequest) {
  const sb = supabaseAdmin();

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

    const storeOptions = await getStoreOptions(storeId);
    const reviewOptions = storeOptions.reviews;

    if (!reviewOptions.allowAdminReply) {
      return bad("ADMIN_REPLY_DISABLED", 403);
    }

    const body = await req.json();

    const reviewId = s(body?.review_id);
    const text = s(body?.body);
    const authorType = s(body?.author_type) as "admin" | "customer";

    if (!reviewId) return bad("REVIEW_ID_REQUIRED");
    if (!text) return bad("BODY_REQUIRED");
    if (!["admin", "customer"].includes(authorType)) {
      return bad("INVALID_AUTHOR_TYPE");
    }

    // =========================
    // رد العميل
    // =========================
    if (authorType === "customer") {
      const customerId = await resolveCustomerIdFromRequest(req);
      if (!customerId) return bad("LOGIN_REQUIRED", 401);

      const reply = await createReviewReply({
        reviewId,
        storeId,
        authorType: "customer",
        customerId,
        body: text,
        status: "published",
      });

      return NextResponse.json({ ok: true, item: reply });
    }

    // =========================
    // رد الادمن
    // =========================
    const adminUserId = s(body?.admin_user_id) || null;

    const reply = await createReviewReply({
      reviewId,
      storeId,
      authorType: "admin",
      adminUserId,
      body: text,
      status: "published",
    });

    return NextResponse.json({ ok: true, item: reply });
  } catch (error: any) {
    return bad(error?.message || "FAILED_TO_CREATE_REPLY", 500);
  }
}