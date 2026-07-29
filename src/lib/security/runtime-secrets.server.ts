import "server-only";

import crypto from "crypto";

const LOCAL_ONLY_FALLBACKS: Record<string, string> = {
  AUTH_OTP_SECRET:
    "local-only-auth-otp-secret-change-before-any-production-deployment",
  AUTH_SESSION_SECRET:
    "local-only-auth-session-secret-change-before-any-production-deployment",
  AUTH_OAUTH_TRANSFER_SECRET:
    "local-only-oauth-transfer-secret-change-before-any-production-deployment",
  UPLOAD_PROOF_SIGNING_SECRET:
    "local-only-upload-proof-secret-change-before-any-production-deployment",
};

export function requireRuntimeSecret(name: string, minimumLength = 32) {
  const value = String(process.env[name] ?? "").trim();

  if (value.length >= minimumLength) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    const fallback = LOCAL_ONLY_FALLBACKS[name];
    if (fallback && fallback.length >= minimumLength) return fallback;
  }

  if (!value) {
    throw new Error(`${name}_MISSING`);
  }

  throw new Error(`${name}_TOO_SHORT`);
}

export function timingSafeTextEqual(left: unknown, right: unknown) {
  const a = Buffer.from(String(left ?? ""), "utf8");
  const b = Buffer.from(String(right ?? ""), "utf8");

  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
