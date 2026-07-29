import { NextResponse } from "next/server";
import { BootstrapError } from "@/data/mobile/bootstrap/bootstrap.errors";
import { getMobileCategories } from "@/data/mobile/categories/categories.server";
import { readMobileRequestContext } from "@/data/mobile/request-context";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers":
    "Accept, Content-Type, Authorization, X-Store-App-Id, X-App-Version, X-App-Environment, X-Platform, Accept-Language, X-Timezone, X-Currency-Code, X-Request-Id",
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
    const payload = await getMobileCategories(context, {
      categoryId: url.searchParams.get("category_id"),
      sort: url.searchParams.get("sort"),
      offset: url.searchParams.get("offset"),
      limit: url.searchParams.get("limit"),
    });

    return NextResponse.json(payload, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "private, no-store",
        "X-Config-Version": String(payload.config_version),
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    if (error instanceof BootstrapError || (error && typeof error === "object" && "status" in error)) {
      const value = error as BootstrapError & { status: number; code: string; publicMessage?: string };
      return NextResponse.json(
        { error: { code: value.code, message: value.publicMessage ?? "Invalid mobile request.", requestId } },
        { status: value.status, headers: { ...corsHeaders, "X-Request-Id": requestId } },
      );
    }

    console.error("mobile categories failed", error);
    return NextResponse.json(
      { error: { code: "MOBILE_CATEGORIES_FAILED", message: "Unable to load mobile categories.", requestId } },
      { status: 500, headers: { ...corsHeaders, "X-Request-Id": requestId } },
    );
  }
}
