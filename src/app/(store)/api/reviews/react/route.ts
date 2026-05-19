//app/(store)/api/reviews/react/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addHelpfulReaction } from "@/data/reviews/reviews";
import { supabaseAdmin } from "@/data/store/supabase.server";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
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
    const body = await req.json();
    const reviewId = s(body?.review_id);
    const sessionId = s(body?.session_id) || null;

    if (!reviewId) return bad("REVIEW_ID_REQUIRED");

    const customerId = await resolveCustomerIdFromRequest(req);

    const result = await addHelpfulReaction({
      reviewId,
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