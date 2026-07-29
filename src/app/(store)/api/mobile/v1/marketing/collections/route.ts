import { NextResponse } from "next/server";

import { BootstrapError } from "@/data/mobile/bootstrap/bootstrap.errors";
import { mobileMarketingTypeFromScreen } from "@/data/mobile/marketing/marketing.config";
import { loadMobileMarketingCollections } from "@/data/mobile/marketing/marketing.server";
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

export async function GET(request: Request) {
  let requestId = request.headers.get("x-request-id") || "unknown";
  try {
    const context = readMobileRequestContext(request);
    requestId = context.requestId;
    const url = new URL(request.url);
    const type = mobileMarketingTypeFromScreen(url.searchParams.get("type") || "");
    if (!type) return NextResponse.json({ error: { code: "INVALID_MARKETING_TYPE", message: "Invalid marketing type.", requestId } }, { status: 400, headers: { ...corsHeaders, "X-Request-Id": requestId } });
    const payload = await loadMobileMarketingCollections(context, type);
    return NextResponse.json(payload, { headers: { ...corsHeaders, "Cache-Control": "private, no-store", "X-Config-Version": String(payload.config_version), "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof BootstrapError || (error && typeof error === "object" && "status" in error)) {
      const value = error as BootstrapError & { status: number; code: string; publicMessage?: string };
      return NextResponse.json({ error: { code: value.code, message: value.publicMessage ?? "Invalid mobile request.", requestId } }, { status: value.status, headers: { ...corsHeaders, "X-Request-Id": requestId } });
    }
    console.error("mobile marketing collections failed", error);
    return NextResponse.json({ error: { code: "MOBILE_MARKETING_COLLECTIONS_FAILED", message: "Unable to load mobile marketing collections.", requestId } }, { status: 500, headers: { ...corsHeaders, "X-Request-Id": requestId } });
  }
}
