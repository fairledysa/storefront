// FILE: apps/storefront/src/lib/auth/session.ts

import crypto from "crypto";

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(obj: any) {
  return b64url(JSON.stringify(obj));
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function hashOtp(email: string, code: string) {
  const secret = process.env.AUTH_OTP_SECRET || "dev-secret";
  // HMAC(email|code)
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}|${code}`)
    .digest("hex");
}

export function signSession(payload: { customer_id: string; exp: number }) {
  const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";

  const header = { alg: "HS256", typ: "JWT" };
  const body = payload;

  const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifySession(
  token: string,
): { customer_id: string; exp: number } | null {
  const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const expected = b64url(sig);

  if (!timingSafeEqual(s, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    );
    if (!payload?.customer_id || !payload?.exp) return null;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
