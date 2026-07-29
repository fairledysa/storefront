function configuredOrigins() {
  return new Set(
    String(process.env.MOBILE_CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function originAllowed(request: Request, origin: string) {
  if (!origin) return true;

  try {
    if (origin === new URL(request.url).origin) return true;
  } catch {
    return false;
  }

  return configuredOrigins().has(origin);
}

export function mobileCorsHeaders(request: Request) {
  const origin = String(request.headers.get("origin") ?? "").trim();
  const allowed = originAllowed(request, origin);

  return {
    ...(allowed
      ? { "Access-Control-Allow-Origin": origin || "*" }
      : {}),
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
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
      "X-Request-Id",
      "X-Currency-Code",
      "X-Cart-Session-Id",
      "Idempotency-Key",
    ].join(", "),
    ...(origin && allowed
      ? {
          "Access-Control-Allow-Credentials": "true",
          Vary: "Origin",
        }
      : origin
        ? { Vary: "Origin" }
      : {}),
    "Cache-Control": "no-store",
  };
}

export function withMobileCors(
  request: Request,
  response: Response,
) {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(
    mobileCorsHeaders(request),
  )) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function mobileOptions(request: Request) {
  const origin = String(request.headers.get("origin") ?? "").trim();
  if (!originAllowed(request, origin)) {
    return new Response(null, {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        Vary: "Origin",
      },
    });
  }

  return new Response(null, {
    status: 204,
    headers: mobileCorsHeaders(request),
  });
}
