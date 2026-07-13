import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

const REFERRAL_COOKIE = "elyaia_referral";
const REFERRAL_SESSION_COOKIE = "elyaia_referral_session";

function hashIp(value: string) {
  const normalized = value.trim();
  return normalized ? createHash("sha256").update(normalized).digest("hex") : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const storeContext = await resolveStoreContext();
  const storeId = String(storeContext?.store?.id ?? "").trim();
  const { code: rawCode } = await context.params;
  const code = String(rawCode ?? "").trim().toUpperCase();

  const redirectUrl = new URL("/", request.url);
  if (!storeId || !code) return NextResponse.redirect(redirectUrl);

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const existingSession = cookieStore.get(REFERRAL_SESSION_COOKIE)?.value?.trim();
  const sessionKey = existingSession || randomUUID();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0] ?? "";
  const ipHash = hashIp(forwardedFor);
  const userAgent = requestHeaders.get("user-agent");
  const referrer = requestHeaders.get("referer");

  try {
    const db: any = await getStoreDb(storeId);
    const { data, error } = await db.rpc("referral_track_visit", {
      p_store_id: storeId,
      p_code: code,
      p_session_key: sessionKey,
      p_ip_hash: ipHash,
      p_user_agent: userAgent,
      p_landing_url: request.url,
      p_referrer_url: referrer,
    });

    if (!error && data?.ok) {
      const response = NextResponse.redirect(redirectUrl);
      const maxAge = Math.max(
        60,
        Math.floor((new Date(String(data.expires_at)).getTime() - Date.now()) / 1000),
      );

      response.cookies.set(REFERRAL_SESSION_COOKIE, sessionKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge,
      });
      response.cookies.set(REFERRAL_COOKIE, code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge,
      });
      return response;
    }
  } catch (error) {
    console.error("[referrals] failed to track visit", error);
  }

  return NextResponse.redirect(redirectUrl);
}
