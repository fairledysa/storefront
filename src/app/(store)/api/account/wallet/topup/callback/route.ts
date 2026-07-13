import { NextRequest, NextResponse } from "next/server";
import { verifyAndCompleteMoyasarTopup } from "@/lib/wallet/moyasar-topup.server";

export const dynamic = "force-dynamic";
function text(v: unknown) { return String(v ?? "").trim(); }

export async function GET(req: NextRequest) {
  const paymentId = text(req.nextUrl.searchParams.get("id"));
  const storeId = text(req.nextUrl.searchParams.get("store"));
  const sessionId = text(req.nextUrl.searchParams.get("session"));
  const target = new URL("/account/wallet", req.nextUrl.origin);
  try {
    if (!paymentId || !storeId || !sessionId) throw new Error("MISSING_CALLBACK_PARAMETERS");
    const result = await verifyAndCompleteMoyasarTopup({ storeId, sessionId, paymentId, source: "callback" });
    target.searchParams.set("topup", result.ok ? "success" : "failed");
    if (!result.ok) target.searchParams.set("reason", String(result.status || "failed"));
  } catch (error: any) {
    console.error("[moyasar/topup/callback]", error);
    target.searchParams.set("topup", "failed");
    target.searchParams.set("reason", text(error?.message) || "verification_failed");
  }
  return NextResponse.redirect(target);
}
