import { NextResponse } from "next/server";

import { BootstrapError } from "@/data/mobile/bootstrap/bootstrap.errors";
import { loadMobileMarketingCollection } from "@/data/mobile/marketing/marketing.server";
import { readMobileRequestContext } from "@/data/mobile/request-context";

export const dynamic = "force-dynamic";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization, X-Store-App-Id, X-App-Version, X-App-Environment, X-Platform, Accept-Language, X-Timezone, X-Currency-Code, X-Request-Id",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  let requestId = request.headers.get("x-request-id") || "unknown";
  try {
    const context = readMobileRequestContext(request);
    requestId = context.requestId;
    const { slug } = await params;
    const payload = await loadMobileMarketingCollection(context, slug);
    if (!payload) return NextResponse.json({ error: { code: "MARKETING_COLLECTION_NOT_FOUND", message: "Marketing collection not found.", requestId } }, { status: 404, headers: { ...corsHeaders, "X-Request-Id": requestId } });
    return NextResponse.json(payload, { headers: { ...corsHeaders, "Cache-Control": "private, no-store", "X-Config-Version": String(payload.config_version), "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof BootstrapError || (error && typeof error === "object" && "status" in error)) {
      const value = error as BootstrapError & { status: number; code: string; publicMessage?: string };
      return NextResponse.json({ error: { code: value.code, message: value.publicMessage ?? "Invalid mobile request.", requestId } }, { status: value.status, headers: { ...corsHeaders, "X-Request-Id": requestId } });
    }
    console.error("mobile marketing collection failed", error);
    return NextResponse.json({ error: { code: "MOBILE_MARKETING_COLLECTION_FAILED", message: "Unable to load mobile marketing collection.", requestId } }, { status: 500, headers: { ...corsHeaders, "X-Request-Id": requestId } });
  }
}
