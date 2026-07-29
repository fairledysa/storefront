import { randomUUID } from "node:crypto";

import { errorResponse } from "@/data/mobile/bootstrap/bootstrap.errors";
import { getMobileBootstrap } from "@/data/mobile/bootstrap/bootstrap.server";
import { validateBootstrapHeaders } from "@/data/mobile/bootstrap/bootstrap.validation";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": [
    "Accept",
    "Content-Type",
    "Authorization",
    "X-Store-App-Id",
    "X-App-Version",
    "X-App-Environment",
    "X-Platform",
    "Accept-Language",
    "X-Timezone",
    "X-Currency-Code",
    "X-Request-Id",
    "Idempotency-Key",
  ].join(", "),
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") || randomUUID();

  try {
    const input = validateBootstrapHeaders(request.headers, requestId);
    const payload = await getMobileBootstrap(input);

    return Response.json(payload, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        Vary: "X-Store-App-Id, X-Platform, X-App-Version, X-App-Environment, X-Currency-Code",
        "X-Config-Version": String(payload.config_version),
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    const response = errorResponse(error, requestId);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
}
