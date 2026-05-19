//app/(store)/api/reviews/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getReviewSummary, type ReviewTargetType } from "@/data/reviews/reviews";
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

export async function GET(req: NextRequest) {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const { searchParams } = new URL(req.url);
    const targetType = s(searchParams.get("target_type")) as ReviewTargetType;
    const targetId = s(searchParams.get("target_id"));

    if (!["product", "store", "category", "page"].includes(targetType)) {
      return bad("INVALID_TARGET_TYPE");
    }

    if (!targetId) {
      return bad("TARGET_ID_REQUIRED");
    }

    const summary = await getReviewSummary({
      storeId,
      targetType,
      targetId,
    });

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error: any) {
    return bad(error?.message || "FAILED_TO_FETCH_REVIEW_SUMMARY", 500);
  }
}