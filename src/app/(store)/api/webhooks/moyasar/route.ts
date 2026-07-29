import { NextRequest, NextResponse } from "next/server";
import { verifyAndCompleteMoyasarTopup } from "@/lib/wallet/moyasar-topup.server";
import {
  requireRuntimeSecret,
  timingSafeTextEqual,
} from "@/lib/security/runtime-secrets.server";

export const dynamic = "force-dynamic";
function text(v: unknown) { return String(v ?? "").trim(); }
const HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    let expectedSecret = "";

    try {
      expectedSecret = requireRuntimeSecret("MOYASAR_WEBHOOK_SECRET", 24);
    } catch {
      return NextResponse.json(
        { ok: false, error: "WEBHOOK_NOT_CONFIGURED" },
        { status: 503, headers: HEADERS },
      );
    }

    const suppliedSecret =
      text(req.headers.get("x-webhook-secret")) ||
      text(req.nextUrl.searchParams.get("token")) ||
      text(body?.secret_token);

    if (!body || !timingSafeTextEqual(suppliedSecret, expectedSecret)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_WEBHOOK_SECRET" },
        { status: 401, headers: HEADERS },
      );
    }

    const type = text(body.type);
    const payment = body.data || {};
    const metadata = payment?.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
    const storeId = text(metadata.store_id);
    const sessionId = text(metadata.topup_session_id);
    const paymentId = text(payment.id);
    if (!storeId || !sessionId || !paymentId) {
      return NextResponse.json(
        { ok: true, ignored: true },
        { headers: HEADERS },
      );
    }

    if (type === "payment_paid") {
      await verifyAndCompleteMoyasarTopup({ storeId, sessionId, paymentId, source: "webhook" });
    }

    return NextResponse.json({ ok: true }, { headers: HEADERS });
  } catch (error) {
    console.error("[moyasar/webhook]", error);
    return NextResponse.json(
      { ok: false, error: "WEBHOOK_PROCESSING_FAILED" },
      { status: 500, headers: HEADERS },
    );
  }
}
