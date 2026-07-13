import { NextRequest, NextResponse } from "next/server";
import { verifyAndCompleteMoyasarTopup } from "@/lib/wallet/moyasar-topup.server";

export const dynamic = "force-dynamic";
function text(v: unknown) { return String(v ?? "").trim(); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || text(body.secret_token) !== text(process.env.MOYASAR_WEBHOOK_SECRET)) {
      return NextResponse.json({ ok: false, error: "INVALID_WEBHOOK_SECRET" }, { status: 401 });
    }
    const type = text(body.type);
    const payment = body.data || {};
    const metadata = payment?.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
    const storeId = text(metadata.store_id);
    const sessionId = text(metadata.topup_session_id);
    const paymentId = text(payment.id);
    if (!storeId || !sessionId || !paymentId) return NextResponse.json({ ok: true, ignored: true });

    if (["payment_paid", "payment_captured", "payment_verified"].includes(type)) {
      await verifyAndCompleteMoyasarTopup({ storeId, sessionId, paymentId, source: "webhook" });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[moyasar/webhook]", error);
    return NextResponse.json({ ok: false, error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
