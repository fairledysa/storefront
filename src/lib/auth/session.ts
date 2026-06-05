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

function fromB64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function signJwtLike(payload: any, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();

  return `${data}.${b64url(sig)}`;
}

function verifyJwtLike(token: string, secret: string) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const expected = b64url(sig);

  if (!timingSafeEqual(s, expected)) return null;

  try {
    const payload = JSON.parse(fromB64Url(p));
    if (!payload?.exp) return null;
    if (Date.now() / 1000 > Number(payload.exp)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function hashOtp(email: string, code: string) {
  const secret = process.env.AUTH_OTP_SECRET || "dev-secret";

  return crypto
    .createHmac("sha256", secret)
    .update(`${email}|${code}`)
    .digest("hex");
}

export function signSession(payload: { customer_id: string; exp: number }) {
  const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";

  return signJwtLike(payload, secret);
}

export function verifySession(
  token: string,
): { customer_id: string; exp: number } | null {
  const secret = process.env.AUTH_SESSION_SECRET || "dev-secret";
  const payload = verifyJwtLike(token, secret);

  if (!payload?.customer_id || !payload?.exp) return null;

  return {
    customer_id: String(payload.customer_id),
    exp: Number(payload.exp),
  };
}

export type OAuthTransferPayload = {
  store_id: string;
  customer_id: string;
  next: string;
  exp: number;
};

function getOAuthTransferSecret() {
  return (
    process.env.AUTH_OAUTH_TRANSFER_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    "dev-secret"
  );
}

export function signOAuthTransfer(payload: OAuthTransferPayload) {
  return signJwtLike(payload, getOAuthTransferSecret());
}

export function verifyOAuthTransfer(
  token: string,
): OAuthTransferPayload | null {
  const payload = verifyJwtLike(token, getOAuthTransferSecret());

  if (!payload?.store_id || !payload?.customer_id || !payload?.exp) {
    return null;
  }

  return {
    store_id: String(payload.store_id),
    customer_id: String(payload.customer_id),
    next: String(payload.next || "/"),
    exp: Number(payload.exp),
  };
}